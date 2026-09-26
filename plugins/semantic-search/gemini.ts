/**
 * Gemini embeddings over REST, shaped as the google-genai SDK sends them (the
 * chatbot's model: gemini-embedding-001). Only the build calls this; the key
 * never reaches the browser.
 */
import {unit} from '../../src/components/Search/vectors.ts';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export type TaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export type EmbedOptions = {
  apiKey: string;
  model: string;
  dims: number;
  taskType: TaskType;
  batchSize?: number;
  concurrency?: number;
  attempts?: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

export class GeminiError extends Error {}

export async function embedTexts(texts: string[], options: EmbedOptions): Promise<Float32Array[]> {
  const {batchSize = 100, concurrency = 4} = options;
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }
  const results: Float32Array[][] = [];
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (next < batches.length && !failed) {
      const index = next;
      next += 1;
      try {
        results[index] = await embedBatch(batches[index], options);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({length: Math.min(concurrency, batches.length)}, worker));
  return results.flat();
}

async function embedBatch(texts: string[], options: EmbedOptions): Promise<Float32Array[]> {
  const {apiKey, model, dims, taskType, attempts = 6, fetch: send = fetch, sleep = wait} = options;
  const body = JSON.stringify({
    requests: texts.map((text) => ({
      model: `models/${model}`,
      content: {parts: [{text}]},
      taskType,
      outputDimensionality: dims,
    })),
  });
  for (let attempt = 1; ; attempt += 1) {
    let response: Response | undefined;
    let failure: string;
    let asked = 0;
    try {
      response = await send(`${ENDPOINT}/${model}:batchEmbedContents`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': apiKey},
        body,
      });
      if (response.ok) {
        return vectors(await response.json(), texts.length, dims);
      }
      const {message, delay} = await reason(response);
      failure = `HTTP ${response.status}: ${message}`;
      asked = delay;
    } catch (error) {
      if (error instanceof GeminiError) {
        throw error;
      }
      failure = `network error: ${(error as Error).message}`;
    }
    const retry = !response || RETRY_STATUSES.has(response.status);
    if (!retry || attempt >= attempts) {
      throw new GeminiError(`Gemini embeddings failed after ${attempt} attempt(s): ${failure}`);
    }
    await sleep(Math.max(1000 * 2 ** (attempt - 1), asked));
  }
}

function vectors(data: {embeddings?: {values?: number[]}[]}, count: number, dims: number): Float32Array[] {
  const embeddings = data.embeddings ?? [];
  if (embeddings.length !== count) {
    throw new GeminiError(`Gemini returned ${embeddings.length} embeddings for ${count} texts`);
  }
  return embeddings.map(({values = []}) => {
    if (values.length !== dims) {
      throw new GeminiError(`Gemini returned ${values.length} dimensions, expected ${dims}`);
    }
    return unit(values) ?? new Float32Array(dims);
  });
}

type ApiError = {message?: string; details?: {'@type'?: string; retryDelay?: string}[]};

/** The API's own message, and how long a rate-limit answer asks us to wait (RetryInfo), in ms. */
async function reason(response: Response): Promise<{message: string; delay: number}> {
  const text = await response.text();
  try {
    const error: ApiError = JSON.parse(text).error ?? {};
    const retry = error.details?.find((detail) => detail['@type']?.endsWith('RetryInfo'));
    const seconds = parseFloat(retry?.retryDelay ?? '');
    return {message: error.message ?? text.slice(0, 200), delay: Number.isFinite(seconds) ? seconds * 1000 : 0};
  } catch {
    return {message: text.slice(0, 200), delay: 0};
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
