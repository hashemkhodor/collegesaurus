// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {decodeIndex, decodeShard} from '../../src/components/Search/format.ts';
import {shardOf} from '../../src/components/Search/text.ts';
import {dequantize, quantize} from '../../src/components/Search/vectors.ts';
import {buildIndex, prepare, readList, writeIndex, type SourceDoc} from './build.ts';

const AUB: SourceDoc = {
  type: 'university',
  title: 'AUB',
  url: 'https://collegesaurus.org/ar/universities/aub',
  content_year: '2026-2027',
  body: '## Tuition\n\n| Program | Cost |\n|---|---|\n| [Nursing](https://aub.edu.lb/nursing) | $1,000 |',
};

test('lists each page by its path, and each section with text to show and text to embed', () => {
  const {pages, chunks} = prepare([AUB]);

  assert.deepEqual(pages, [{path: '/ar/universities/aub', title: 'AUB', type: 'university'}]);
  assert.deepEqual(chunks, [
    {
      page: 0,
      section: 'Tuition',
      anchor: 'tuition',
      text: 'Nursing · $1,000',
      embed: 'AUB › Tuition [2026-2027]\n\n| Program | Cost |\n|---|---|\n| Nursing | $1,000 |',
      words: 'AUB › Tuition [2026-2027]\nNursing · $1,000',
    },
  ]);
});

test('embeds sections as documents and vocabulary terms as queries', async () => {
  const asked: [string, string[]][] = [];
  const embed = async (texts: string[], taskType: string) => {
    asked.push([taskType, texts]);
    return texts.map((_, i) => quantize([1, i]));
  };

  const index = await buildIndex([AUB], {embed, words: ['coding'], phrases: []});

  assert.deepEqual(asked[0], ['RETRIEVAL_DOCUMENT', [prepare([AUB]).chunks[0].embed]]);
  assert.equal(asked[1][0], 'RETRIEVAL_QUERY');
  assert.ok(asked[1][1].includes('coding') && asked[1][1].includes('Nursing'));
  assert.deepEqual(index.chunks, [{page: 0, section: 'Tuition', anchor: 'tuition', text: 'Nursing · $1,000'}]);
});

const TWO_SECTIONS: SourceDoc = {...AUB, body: '## Tuition\n\n$1,000 a credit.\n\n## Nursing\n\nA four-year program.'};
const close = (actual: ArrayLike<number>, expected: number[]) =>
  assert.ok(expected.every((value, d) => Math.abs(actual[d] - value) < 0.01), `${Array.from(actual)} is not ${expected}`);

test('stores each section less the direction all sections share, at unit length', async () => {
  // Neither vector is unit length, and both lean the same way along the first dimension.
  const embed = async (texts: string[], taskType: string) =>
    texts.map((text) => quantize(taskType === 'RETRIEVAL_DOCUMENT' && text.includes('Nursing') ? [3, -4] : [3, 4]));

  const index = await buildIndex([TWO_SECTIONS], {embed, words: [], phrases: []});

  assert.deepEqual(index.chunks.map((chunk) => chunk.section), ['Tuition', 'Nursing']);
  close(dequantize(index.vectors[0]), [0, 1]);
  close(dequantize(index.vectors[1]), [0, -1]);
});

test('stores each term less the direction all terms share', async () => {
  const embed = async (texts: string[]) =>
    texts.map((text) => quantize(text.toLowerCase() === 'nursing' ? [0.8, 0.6] : [0.8, -0.6]));

  const index = await buildIndex([AUB], {embed, words: ['nursing', 'coding', 'tuition'], phrases: []});

  const vectors = new Map(index.terms.map((term) => [term.key, dequantize(term.vector)]));
  assert.ok(index.terms.length > 2);
  for (const [key, vector] of vectors) {
    assert.ok(Math.abs(vector[0]) < 0.01, `${key} keeps the shared direction: ${[...vector]}`);
    assert.ok(key === 'nursing' ? vector[1] > 0 : vector[1] < 0, `${key}: ${[...vector]}`);
  }
  close(Float32Array.from(vectors.get('nursing')!, (value, d) => value + index.queryMean[d]), [0.8, 0.6]);
});

test('writes index.json and every term shard', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-build-'));
  const index = await buildIndex([AUB], {
    embed: async (texts) => texts.map(() => quantize([0.6, 0.8])),
    words: [],
    phrases: [],
  });

  writeIndex(dir, index, {model: 'Xenova/multilingual-e5-small', dims: 2, shards: 8});

  const written = decodeIndex(JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')));
  assert.deepEqual([written.pages.length, written.chunks.length, written.shards], [1, 1, 8]);
  assert.equal(fs.readdirSync(path.join(dir, 'terms')).length, 8);
  const shard = JSON.parse(fs.readFileSync(path.join(dir, 'terms', `${shardOf('nursing', 8)}.json`), 'utf8'));
  assert.ok(decodeShard(shard).has('nursing'));
});

test('reads a list file without its blank lines and comments', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-list-')), 'phrases.txt');
  fs.writeFileSync(file, '# Things students search for\n\ncomputer science\n  study abroad  \n');

  assert.deepEqual(readList(file), ['computer science', 'study abroad']);
});
