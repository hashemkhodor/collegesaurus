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
  const nursing = index.terms.find((term) => term.key === 'nursing')!;
  assert.deepEqual([...nursing.vector.q], [...quantize([1, asked[1][1].indexOf('Nursing')]).q]);
});

test('stores unit-length vectors, whatever the embedder returns', async () => {
  const index = await buildIndex([AUB], {embed: async (texts) => texts.map(() => quantize([3, 4])), words: [], phrases: []});

  for (const vector of [...index.vectors, ...index.terms.map((term) => term.vector)]) {
    assert.ok(Math.abs(Math.hypot(...dequantize(vector)) - 1) < 0.01);
  }
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
