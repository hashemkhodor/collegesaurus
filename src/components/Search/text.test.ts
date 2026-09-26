// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {contentTokens, normalize, shardOf, tokenize, variants} from './text.ts';

test('folds case and Latin accents', () => {
  assert.equal(normalize('Médecine à l’AUB'), 'medecine a l’aub');
});

test('writes Arabic letters one way, whatever form was typed', () => {
  // Hamza on alef, taa marbuta, alef maqsura and diacritics all vary in how
  // people type the same word.
  assert.equal(normalize('الجامعة الأميركية'), 'الجامعه الاميركيه');
  assert.equal(normalize('إدارة'), 'اداره');
  assert.equal(normalize('مُسْتَشْفَى'), 'مستشفي');
  assert.equal(normalize('طـــب'), 'طب');
});

test('reads Arabic-Indic digits and presentation forms as plain ones', () => {
  assert.equal(normalize('٢٠٢٦'), '2026');
  assert.equal(normalize('ﻻ'), 'لا');
});

test('splits on anything that is not a letter or a digit', () => {
  assert.deepEqual(tokenize('Computer Science?'), ['computer', 'science']);
  assert.deepEqual(tokenize('AUB—LAU, USJ'), ['aub', 'lau', 'usj']);
  assert.deepEqual(tokenize("bourse d'études"), ['bourse', 'd', 'etudes']);
  assert.deepEqual(tokenize('منحة دراسية'), ['منحه', 'دراسيه']);
});

test('drops the words every question has, in all three languages', () => {
  assert.deepEqual(contentTokens(tokenize('What is the tuition at AUB?')), ['tuition', 'aub']);
  assert.deepEqual(contentTokens(tokenize('منحة دراسية في الخارج')), ['منحه', 'دراسيه', 'الخارج']);
  assert.deepEqual(contentTokens(tokenize("Une bourse d'études en France")), ['bourse', 'etudes', 'france']);
});

test('keeps short words that carry the meaning', () => {
  assert.deepEqual(contentTokens(tokenize('طب')), ['طب']);
  assert.deepEqual(contentTokens(tokenize('LU')), ['lu']);
});

test('offers the singular of an unknown English or French plural', () => {
  assert.deepEqual(variants('universities'), ['university', 'universitie', 'universiti']);
  assert.deepEqual(variants('programs'), ['program']);
  assert.deepEqual(variants('bourses'), ['bourse', 'bours']);
});

test('offers an unknown Arabic word without its attached prefixes', () => {
  assert.deepEqual(variants('والجامعه'), ['الجامعه', 'جامعه']);
  assert.deepEqual(variants('بالطب'), ['الطب', 'طب']);
  assert.ok(variants('للطلاب').includes('طلاب'));
});

test('offers the singular of an Arabic sound plural', () => {
  assert.deepEqual(variants('جامعات'), ['جامعه', 'جامع']);
  assert.deepEqual(variants('مهندسون'), ['مهندس']);
});

test('never offers a variant too short to mean anything', () => {
  assert.deepEqual(variants('bus'), []);
  assert.deepEqual(variants('بط'), []);
});

test('puts every key in a shard within range, the same one every time', () => {
  const keys = ['aub', 'computer science', 'طب', 'bourse d etudes'];
  const shards = keys.map((key) => shardOf(key, 64));

  assert.ok(shards.every((shard) => Number.isInteger(shard) && shard >= 0 && shard < 64));
  assert.deepEqual(keys.map((key) => shardOf(key, 64)), shards);
  assert.ok(new Set(shards).size > 1);
});
