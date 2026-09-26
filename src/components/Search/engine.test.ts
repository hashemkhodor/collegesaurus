// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {buildIndex, writeIndex} from '../../../plugins/semantic-search/build.ts';
import {createEngine} from './engine.ts';
import {quantize} from './vectors.ts';

const DOCS = [
  {
    type: 'university',
    title: 'AUB - American University of Beirut',
    url: 'https://collegesaurus.org/universities/aub',
    content_year: '2026-2027',
    body: '## Tuition (AY 2026-2027)\n\nUndergraduate tuition is $1,000 per credit.\n\n## Contacts\n\nCall the admissions office.',
  },
  {
    type: 'scholarship',
    title: 'Fulbright Program',
    url: 'https://collegesaurus.org/scholarships/fulbright',
    content_year: null,
    body: 'Fulbright funds graduate study in the United States.\n\n## Benefits\n\nFull tuition and a monthly stipend.',
  },
];

/** Stands in for Gemini: texts sharing words get similar vectors. */
async function hashEmbed(texts: string[]) {
  return texts.map((text) => {
    const vector = new Float32Array(256);
    for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
      vector[parseInt(createHash('md5').update(word).digest('hex').slice(0, 8), 16) % 256] += 1;
    }
    return quantize(vector);
  });
}

/** The engine over files the build wrote, counting what it fetches. */
async function site() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-engine-'));
  const index = await buildIndex(DOCS, {embed: hashEmbed, words: ['university'], phrases: []});
  writeIndex(dir, index, {model: 'hash', dims: 256, shards: 16});
  const fetched: string[] = [];
  const load = async (url: string) => {
    fetched.push(url);
    return JSON.parse(fs.readFileSync(path.join(dir, url.replace('/semantic-search/', '')), 'utf8'));
  };
  return {engine: createEngine('/semantic-search/', load), fetched};
}

test('finds the page and section a query is about, linking to its heading', async () => {
  const {engine} = await site();

  const {results} = await engine.search('AUB tuition');

  assert.equal(results[0].path, '/universities/aub');
  assert.deepEqual(results[0].sections[0], {
    title: 'Tuition (AY 2026-2027)',
    href: '/universities/aub#tuition-ay-2026-2027',
    snippet: 'Undergraduate tuition is $1,000 per credit.',
    score: results[0].sections[0].score,
  });
});

test('lists pages best first', async () => {
  const {engine} = await site();

  const {results} = await engine.search('tuition', {floor: 0, margin: 1});

  assert.deepEqual(results.map((result) => result.path).sort(), ['/scholarships/fulbright', '/universities/aub']);
  assert.ok(results[0].score >= results[1].score);
});

test('fetches the index once and, for each query, only the shards its words need', async () => {
  const {engine, fetched} = await site();

  await engine.search('AUB tuition');
  const first = fetched.length;
  await engine.search('AUB tuition');

  assert.equal(fetched.filter((url) => url.endsWith('index.json')).length, 1);
  assert.ok(first < 16, `fetched ${first} files`);
  assert.equal(fetched.length, first);
});

test('says so when no word of the query has a vector', async () => {
  const {engine} = await site();

  assert.deepEqual(await engine.search('xyzzy'), {results: [], terms: ['xyzzy'], understood: false});
});

test('fetches nothing for a query of small words only', async () => {
  const {engine, fetched} = await site();

  assert.equal((await engine.search('what is the')).understood, false);
  assert.deepEqual(fetched, []);
});

test('can load the index before the first query, and never throws doing so', async () => {
  const {engine, fetched} = await site();

  await engine.warm();
  await engine.search('AUB tuition');

  assert.equal(fetched.filter((url) => url.endsWith('index.json')).length, 1);
  await createEngine('/semantic-search/', async () => {
    throw new Error('HTTP 404');
  }).warm();
});

test('fails when the site has no index, so the caller can fall back to keywords', async () => {
  const engine = createEngine('/semantic-search/', async (url) => {
    throw new Error(`${url}: HTTP 404`);
  });

  await assert.rejects(engine.search('AUB tuition'), /404/);
});
