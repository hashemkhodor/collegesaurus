// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {VectorCache, embedWithCache} from './cache.ts';

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-cache-'));
}

test('remembers a vector across builds, separately for each task type', async () => {
  const dir = tempDir();
  const cache = await VectorCache.open(dir, 'gemini-embedding-001', 2);
  cache.set('RETRIEVAL_DOCUMENT', 'AUB tuition', new Float32Array([0.6, 0.8]));
  await cache.save();

  const reopened = await VectorCache.open(dir, 'gemini-embedding-001', 2);

  assert.deepEqual([...reopened.get('RETRIEVAL_DOCUMENT', 'AUB tuition')!.q], [95, 127]);
  assert.equal(reopened.get('RETRIEVAL_QUERY', 'AUB tuition'), undefined);
});

test('keeps vectors of another model or size apart', async () => {
  const dir = tempDir();
  const cache = await VectorCache.open(dir, 'gemini-embedding-001', 2);
  cache.set('RETRIEVAL_QUERY', 'AUB', new Float32Array([1, 0]));
  await cache.save();

  assert.equal((await VectorCache.open(dir, 'gemini-embedding-001', 3)).get('RETRIEVAL_QUERY', 'AUB'), undefined);
  assert.equal((await VectorCache.open(dir, 'gemini-embedding-002', 2)).get('RETRIEVAL_QUERY', 'AUB'), undefined);
});

test('adds only new vectors on each save', async () => {
  const dir = tempDir();
  const first = await VectorCache.open(dir, 'gemini-embedding-001', 2);
  first.set('RETRIEVAL_QUERY', 'AUB', new Float32Array([1, 0]));
  await first.save();
  const second = await VectorCache.open(dir, 'gemini-embedding-001', 2);
  second.set('RETRIEVAL_QUERY', 'LAU', new Float32Array([0, 1]));
  await second.save();
  await second.save();

  const third = await VectorCache.open(dir, 'gemini-embedding-001', 2);

  assert.equal(third.size, 2);
  assert.ok(third.get('RETRIEVAL_QUERY', 'AUB') && third.get('RETRIEVAL_QUERY', 'LAU'));
});

test('ignores a record cut short by an interrupted build', async () => {
  const dir = tempDir();
  const cache = await VectorCache.open(dir, 'gemini-embedding-001', 2);
  cache.set('RETRIEVAL_QUERY', 'AUB', new Float32Array([1, 0]));
  await cache.save();
  const [file] = fs.readdirSync(dir);
  fs.appendFileSync(path.join(dir, file), Buffer.from([1, 2, 3]));

  const reopened = await VectorCache.open(dir, 'gemini-embedding-001', 2);
  reopened.set('RETRIEVAL_QUERY', 'LAU', new Float32Array([0, 1]));
  await reopened.save();

  const later = await VectorCache.open(dir, 'gemini-embedding-001', 2);
  assert.equal(later.size, 2);
  assert.deepEqual([...later.get('RETRIEVAL_QUERY', 'LAU')!.q], [0, 127]);
});

test('embeds each missing text once and reuses cached ones', async () => {
  const cache = await VectorCache.open(tempDir(), 'gemini-embedding-001', 2);
  const asked: string[][] = [];
  const embed = async (texts: string[]) => {
    asked.push(texts);
    return texts.map(() => new Float32Array([0, 1]));
  };

  await embedWithCache(['AUB', 'LAU', 'AUB'], 'RETRIEVAL_QUERY', cache, embed);
  const vectors = await embedWithCache(['LAU', 'USJ'], 'RETRIEVAL_QUERY', cache, embed);

  assert.deepEqual(asked, [['AUB', 'LAU'], ['USJ']]);
  assert.deepEqual(vectors.map((vector) => [...vector.q]), [[0, 127], [0, 127]]);
});

test('keeps the groups embedded before a failure, so a retry only redoes the rest', async () => {
  const cache = await VectorCache.open(tempDir(), 'gemini-embedding-001', 2);
  const embed = async (texts: string[]) => {
    if (texts.includes('USJ')) {
      throw new Error('Gemini is down');
    }
    return texts.map(() => new Float32Array([1, 0]));
  };

  await assert.rejects(embedWithCache(['AUB', 'LAU', 'USJ'], 'RETRIEVAL_QUERY', cache, embed, 2), /down/);

  assert.ok(cache.get('RETRIEVAL_QUERY', 'AUB') && cache.get('RETRIEVAL_QUERY', 'LAU'));
  assert.equal(cache.get('RETRIEVAL_QUERY', 'USJ'), undefined);
});
