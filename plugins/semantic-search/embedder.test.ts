// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {after, test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {MODEL, REVISION, downloadModel, embedWith, loadModel, type Model} from './embedder.ts';

const BOS = 0;
const EOS = 2;
const PAD = 1;

/** A tokenizer that makes one token per word, wrapped in the begin and end tokens. */
function words(asked: string[] = []): Model['tokenize'] {
  return (text) => {
    asked.push(text);
    const ids = [BOS, ...text.split(' ').map((word) => 10 + word.length), EOS];
    return {ids, attention_mask: ids.map(() => 1)};
  };
}

/** A model whose hidden state for a token is [its id, 1]; padding gets huge values to show if it leaks in. */
function model(runs: {ids: number[][]; mask: number[][]}[] = []): Model['run'] {
  return async (batch) => {
    runs.push(batch);
    const length = batch.ids[0].length;
    const data = new Float32Array(batch.ids.length * length * 2);
    batch.ids.forEach((row, b) =>
      row.forEach((id, t) => {
        const padded = batch.mask[b][t] === 0;
        data.set(padded ? [1000, -1000] : [id, 1], (b * length + t) * 2);
      }),
    );
    return {data, dims: [batch.ids.length, length, 2]};
  };
}

const unitRatio = (vector: Float32Array) => Number((vector[0] / vector[1]).toFixed(4));

test('prefixes queries and passages as e5 expects', async () => {
  const asked: string[] = [];
  const e5: Model = {name: 'fake', dims: 2, tokenize: words(asked), run: model(), padId: PAD};

  await embedWith(['coding'], 'RETRIEVAL_QUERY', e5);
  await embedWith(['Computer Science BS'], 'RETRIEVAL_DOCUMENT', e5);

  assert.deepEqual(asked, ['query: coding', 'passage: Computer Science BS']);
});

test('averages each text over its own tokens, never the padding', async () => {
  const e5: Model = {name: 'fake', dims: 2, tokenize: words(), run: model(), padId: PAD};

  // "query: ab" is [0, 16, 12, 2]: mean id 7.5. "query: abcd efg" is [0, 16, 14, 13, 2]: mean 9.
  const [short, long] = await embedWith(['ab', 'abcd efg'], 'RETRIEVAL_QUERY', e5);

  assert.equal(unitRatio(short), 7.5);
  assert.equal(unitRatio(long), 9);
});

test('returns one unit vector per text in the order given, batching texts of similar length', async () => {
  const runs: {ids: number[][]; mask: number[][]}[] = [];
  const e5: Model = {name: 'fake', dims: 2, tokenize: words(), run: model(runs), padId: PAD};
  const texts = ['a b c d e f', 'a', 'a b c d e f', 'a'];

  const vectors = await embedWith(texts, 'RETRIEVAL_QUERY', e5, {batchSize: 2});

  assert.deepEqual(runs.map((run) => run.ids[0].length), [4, 9]);
  // "query: a b c d e f" pools to 84 / 9, "query: a" to 29 / 4.
  assert.deepEqual(vectors.map(unitRatio), [9.3333, 7.25, 9.3333, 7.25]);
  assert.ok(vectors.every((vector) => Math.abs(Math.hypot(...vector) - 1) < 1e-6));
});

test("cuts a long text to the model's limit, keeping its end token", async () => {
  const runs: {ids: number[][]; mask: number[][]}[] = [];
  const e5: Model = {name: 'fake', dims: 2, tokenize: words(), run: model(runs), padId: PAD};

  await embedWith([Array.from({length: 20}, () => 'x').join(' ')], 'RETRIEVAL_DOCUMENT', e5, {maxTokens: 8});

  assert.equal(runs[0].ids[0].length, 8);
  assert.deepEqual([runs[0].ids[0][0], runs[0].ids[0][7]], [BOS, EOS]);
});

const made: string[] = [];
after(() => made.forEach((dir) => fs.rmSync(dir, {recursive: true, force: true})));

test('downloads the model files once, into the cache', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-model-'));
  made.push(dir);
  const fetched: string[] = [];
  const fetch = (async (url: string) => {
    fetched.push(String(url));
    return new Response(`contents of ${url}`, {status: 200});
  }) as typeof globalThis.fetch;

  await downloadModel(dir, MODEL, fetch);
  await downloadModel(dir, MODEL, fetch);

  assert.deepEqual(fetched, [
    `https://huggingface.co/${MODEL}/resolve/${REVISION}/tokenizer.json`,
    `https://huggingface.co/${MODEL}/resolve/${REVISION}/tokenizer_config.json`,
    `https://huggingface.co/${MODEL}/resolve/${REVISION}/onnx/model_quantized.onnx`,
  ]);
  assert.ok(fs.existsSync(path.join(dir, MODEL, 'onnx', 'model_quantized.onnx')));
});

test('downloads an unpinned model from its default branch', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-model-'));
  made.push(dir);
  const fetched: string[] = [];
  const fetch = (async (url: string) => {
    fetched.push(String(url));
    return new Response('contents', {status: 200});
  }) as typeof globalThis.fetch;

  await downloadModel(dir, 'someone/unlisted-model', fetch);

  assert.equal(fetched[0], 'https://huggingface.co/someone/unlisted-model/resolve/main/tokenizer.json');
});

test('fails when a model file cannot be downloaded, leaving nothing half-written', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-model-'));
  made.push(dir);
  const fetch = (async () => new Response('gone', {status: 404})) as typeof globalThis.fetch;

  await assert.rejects(downloadModel(dir, MODEL, fetch), /HTTP 404/);
  assert.ok(!fs.existsSync(path.join(dir, MODEL, 'tokenizer.json')));
});

// The real model: run with SEMANTIC_SEARCH_MODEL_TEST=1 once the files are in .cache/semantic-search/models.
test('the real model puts a paraphrase nearer its topic than another topic', {skip: !process.env.SEMANTIC_SEARCH_MODEL_TEST}, async () => {
  const e5 = await loadModel(path.resolve('.cache/semantic-search/models'));
  const [query, program, tuition] = [
    ...(await embedWith(['coding degree'], 'RETRIEVAL_QUERY', e5)),
    ...(await embedWith(['Computer Science · BS · Faculty of Arts and Sciences', 'Tuition is $1,000 per credit'], 'RETRIEVAL_DOCUMENT', e5)),
  ];
  const cosine = (a: Float32Array, b: Float32Array) => a.reduce((sum, value, i) => sum + value * b[i], 0);

  assert.ok(cosine(query, program) > cosine(query, tuition), `${cosine(query, program)} vs ${cosine(query, tuition)}`);
});
