// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {embedTexts, type EmbedOptions} from './gemini.ts';

type Call = {url: string; headers: Record<string, string>; body: {requests: {model: string; content: {parts: {text: string}[]}; taskType: string; outputDimensionality: number}[]}};

/** Stands in for the Gemini API: answers each call with the next status, echoing one vector per text. */
function gemini(statuses: number[] = [], vectorFor = (text: string) => [text.length, 0]) {
  const calls: Call[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    calls.push({url: String(url), headers: init?.headers as Record<string, string>, body});
    const status = statuses.shift() ?? 200;
    if (status !== 200) {
      return new Response(JSON.stringify({error: {code: status, message: 'API key not valid' + (status === 400 ? '' : ' or busy')}}), {status});
    }
    const embeddings = body.requests.map((request: Call['body']['requests'][number]) => ({values: vectorFor(request.content.parts[0].text)}));
    return new Response(JSON.stringify({embeddings}), {status: 200});
  };
  return {fetch: fetch as typeof globalThis.fetch, calls};
}

function options(fake: ReturnType<typeof gemini>, extra: Partial<EmbedOptions> = {}): EmbedOptions {
  return {
    apiKey: 'test-key',
    model: 'gemini-embedding-001',
    dims: 2,
    taskType: 'RETRIEVAL_DOCUMENT',
    fetch: fake.fetch,
    sleep: async () => {},
    ...extra,
  };
}

test('sends batches of at most 100 texts, shaped as the Gemini SDK sends them', async () => {
  const fake = gemini();
  const texts = Array.from({length: 250}, (_, i) => `text ${i}`);

  await embedTexts(texts, options(fake, {concurrency: 1}));

  assert.deepEqual(fake.calls.map((call) => call.body.requests.length), [100, 100, 50]);
  const [first] = fake.calls;
  assert.equal(first.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents');
  assert.equal(first.headers['x-goog-api-key'], 'test-key');
  assert.deepEqual(first.body.requests[0], {
    model: 'models/gemini-embedding-001',
    content: {parts: [{text: 'text 0'}]},
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: 2,
  });
});

test('returns one unit vector per text, in the order given, across parallel batches', async () => {
  const fake = gemini([], (text) => [Number(text), 1]);
  const texts = Array.from({length: 7}, (_, i) => String(i));

  const vectors = await embedTexts(texts, options(fake, {batchSize: 2, concurrency: 3}));

  assert.deepEqual(
    vectors.map((vector) => Number((vector[0] / vector[1]).toFixed(6))),
    [0, 1, 2, 3, 4, 5, 6],
  );
  assert.ok(vectors.every((vector) => Math.abs(Math.hypot(...vector) - 1) < 1e-6));
});

test('waits and retries when the API is busy or rate limited', async () => {
  const fake = gemini([503, 429]);
  const waits: number[] = [];

  const vectors = await embedTexts(['AUB'], options(fake, {sleep: async (ms) => void waits.push(ms)}));

  assert.equal(vectors.length, 1);
  assert.equal(fake.calls.length, 3);
  assert.deepEqual(waits, [1000, 2000]);
});

test('waits as long as a rate-limit answer asks before retrying', async () => {
  let calls = 0;
  const fetch = (async (_url: string, init?: RequestInit) => {
    calls += 1;
    if (calls === 1) {
      const details = [{'@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '38s'}];
      return new Response(JSON.stringify({error: {code: 429, message: 'Quota exceeded', details}}), {status: 429});
    }
    const {requests} = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({embeddings: requests.map(() => ({values: [1, 0]}))}), {status: 200});
  }) as typeof globalThis.fetch;
  const waits: number[] = [];

  await embedTexts(['AUB'], options({fetch, calls: []}, {sleep: async (ms) => void waits.push(ms)}));

  assert.deepEqual(waits, [38000]);
});

test('gives up after the last attempt, saying what the API answered', async () => {
  const fake = gemini([503, 503, 503]);

  await assert.rejects(embedTexts(['AUB'], options(fake, {attempts: 3})), /HTTP 503: API key not valid or busy/);
  assert.equal(fake.calls.length, 3);
});

test('fails at once on a request the API refuses, without echoing the key', async () => {
  const fake = gemini([400]);

  await assert.rejects(embedTexts(['AUB'], options(fake)), (error: Error) => {
    assert.match(error.message, /HTTP 400: API key not valid/);
    assert.ok(!error.message.includes('test-key'));
    return true;
  });
  assert.equal(fake.calls.length, 1);
});

test('starts no more batches once one has failed', async () => {
  const fake = gemini([400]);
  const texts = Array.from({length: 10}, (_, i) => `text ${i}`);

  await assert.rejects(embedTexts(texts, options(fake, {batchSize: 1, concurrency: 2})), /HTTP 400/);

  assert.ok(fake.calls.length <= 2, `${fake.calls.length} calls`);
});

test('rejects an answer with the wrong number of vectors or dimensions', async () => {
  await assert.rejects(embedTexts(['AUB'], options(gemini([], () => [1, 2, 3]))), /dimensions/);
});
