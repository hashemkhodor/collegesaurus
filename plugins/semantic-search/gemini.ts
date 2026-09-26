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
  const worker = async () => {
    while (next < batches.length) {
      const index = next;
      next += 1;
      results[index] = await embedBatch(batches[index], options);
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
    try {
      response = await send(`${ENDPOINT}/${model}:batchEmbedContents`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': apiKey},
        body,
      });
      if (response.ok) {
        return vectors(await response.json(), texts.length, dims);
      }
      failure = `HTTP ${response.status}: ${await reason(response)}`;
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
    await sleep(1000 * 2 ** (attempt - 1));
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

async function reason(response: Response): Promise<string> {
  const text = await response.text();
  try {
    return JSON.parse(text).error?.message ?? text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
