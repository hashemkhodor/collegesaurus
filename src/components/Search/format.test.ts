// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {decodeIndex, decodeShard, encodeIndex, encodeShards} from './format.ts';
import {shardOf} from './text.ts';
import {quantize} from './vectors.ts';

const PAGES = [
  {path: '/universities/aub', title: 'AUB - American University of Beirut', type: 'university'},
  {path: '/scholarships/fulbright', title: 'Fulbright Program', type: 'scholarship'},
];
const CHUNKS = [
  {page: 0, section: 'Tuition (AY 2026-2027)', anchor: 'tuition-ay-2026-2027', text: 'Undergraduate tuition is $1,000 per credit.'},
  {page: 1, section: '', anchor: null, text: 'Fulbright funds graduate study in the United States.'},
];

test('writes the index and reads back its pages, sections and vectors', () => {
  const vectors = [quantize([0.6, 0.8, 0]), quantize([0, -1, 0])];
  const file = JSON.parse(
    JSON.stringify(encodeIndex({model: 'gemini-embedding-001', dims: 3, shards: 4, pages: PAGES, chunks: CHUNKS, vectors})),
  );

  const index = decodeIndex(file);

  assert.deepEqual([index.model, index.dims, index.shards], ['gemini-embedding-001', 3, 4]);
  assert.deepEqual(index.pages, PAGES);
  assert.deepEqual(index.chunks, CHUNKS);
  assert.deepEqual([...index.matrix], [95, 127, 0, 0, -127, 0]);
  assert.ok(Math.abs(index.scales[0] - 0.8 / 127) < 1e-8);
});

test('refuses an index whose vectors do not match its sections', () => {
  const file = encodeIndex({
    model: 'gemini-embedding-001',
    dims: 3,
    shards: 4,
    pages: PAGES,
    chunks: CHUNKS,
    vectors: [quantize([1, 0, 0])],
  });

  assert.throws(() => decodeIndex(file), /2 sections but 1 vectors/);
  assert.throws(() => decodeIndex({...file, format: 99} as unknown as typeof file), /format 99/);
});

test('files each term in the shard its key hashes to, with its weight and vector', () => {
  const terms = [
    {key: 'aub', weight: 0.465, vector: quantize([1, 0])},
    {key: 'computer science', weight: 1, vector: quantize([0.6, 0.8])},
    {key: 'طب', weight: 1, vector: quantize([0, 1])},
  ];

  const shards = JSON.parse(JSON.stringify(encodeShards(terms, 4)));

  assert.equal(shards.length, 4);
  for (const {key, weight, vector} of terms) {
    const found = decodeShard(shards[shardOf(key, 4)]).get(key)!;
    assert.equal(found.weight, weight);
    assert.deepEqual([...found.vector.q], [...vector.q]);
  }
});
