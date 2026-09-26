// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {candidateKeys, coverQuery} from './query.ts';
import {tokenize} from './text.ts';

const knows = (...keys: string[]) => (key: string) => keys.includes(key);

test('looks up every phrase of up to three words and every word, longest first', () => {
  assert.deepEqual(candidateKeys(tokenize('study medicine abroad')), [
    'study medicine abroad',
    'study medicine',
    'study',
    'medicine abroad',
    'medicine',
    'abroad',
  ]);
});

test('looks up no phrase that starts or ends with a stopword, but allows one inside', () => {
  assert.deepEqual(candidateKeys(tokenize('American University of Beirut')), [
    'american university',
    'american',
    'university of beirut',
    'university',
    'beirut',
  ]);
});

test('covers a query with the longest phrases the index knows', () => {
  const tokens = tokenize('cheap computer science');

  assert.deepEqual(coverQuery(tokens, knows('cheap', 'computer', 'science', 'computer science')), {
    keys: ['cheap', 'computer science'],
    unknown: [],
  });
  assert.deepEqual(coverQuery(tokens, knows('cheap', 'computer', 'science')).keys, ['cheap', 'computer', 'science']);
});

test('skips stopwords and uses a known spelling of an unknown word', () => {
  const tokens = tokenize('The universities at AUB');

  assert.deepEqual(coverQuery(tokens, knows('university', 'aub')), {keys: ['university', 'aub'], unknown: []});
});

test('reports the words it could not place', () => {
  assert.deepEqual(coverQuery(tokenize('AUB xyzzy'), knows('aub')), {keys: ['aub'], unknown: ['xyzzy']});
});
