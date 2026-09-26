// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import type {Outcome, Result} from './engine';
import {findResults} from './find.ts';

const LU: Result = {path: '/universities/lu', title: 'LU — Lebanese University', type: 'university', score: 0.71, sections: []};
const AUB: Result = {path: '/universities/aub', title: 'AUB - American University of Beirut', type: 'university', score: 3.2, sections: []};

const understood = (results: Result[]): Outcome => ({results, terms: ['cheapest', 'university'], understood: true});
const keyword = async () => [AUB];

test('shows what search by meaning found', async () => {
  const found = await findResults('cheapest university', {semantic: async () => understood([LU]), keyword});

  assert.deepEqual(found, {source: 'semantic', results: [LU], terms: ['cheapest', 'university']});
});

test('matches exact words when no word of the query has a vector', async () => {
  const found = await findResults('xyzzy', {
    semantic: async () => ({results: [], terms: ['xyzzy'], understood: false}),
    keyword,
  });

  assert.deepEqual(found, {source: 'keyword', results: [AUB], terms: ['xyzzy']});
});

test('matches exact words when meaning finds nothing above the floor', async () => {
  const found = await findResults('Haigazian', {semantic: async () => understood([]), keyword});

  assert.equal(found.source, 'keyword');
});

test('matches exact words, and says so, when search by meaning fails', async () => {
  let failed = false;

  const found = await findResults('AUB tuition', {
    semantic: async () => {
      throw new Error('/semantic-search/index.json: HTTP 404');
    },
    keyword,
    onSemanticFailure: () => {
      failed = true;
    },
  });

  assert.equal(found.source, 'keyword');
  assert.ok(failed);
});

test('goes straight to exact words while search by meaning is known to be down', async () => {
  const found = await findResults('AUB tuition', {keyword});

  assert.deepEqual(found, {source: 'keyword', results: [AUB], terms: ['aub', 'tuition']});
});

test('fails when exact-word search fails too, so the box can say search is unavailable', async () => {
  await assert.rejects(
    findResults('AUB tuition', {
      keyword: async () => {
        throw new Error('search index failed to load');
      },
    }),
    /failed to load/,
  );
});
