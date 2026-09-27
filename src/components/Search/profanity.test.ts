// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {maskProfanity} from './profanity.ts';

test('masks a bad word, keeping its first letter and case', () => {
  assert.equal(maskProfanity('fuck'), 'f***');
  assert.equal(maskProfanity('FUCK'), 'F***');
});

test('leaves the rest of the query exactly as typed', () => {
  assert.equal(maskProfanity('fuck tuition at AUB'), 'f*** tuition at AUB');
  assert.equal(maskProfanity('fuck!'), 'f***!');
});

test('masks more than one bad word in a query', () => {
  assert.equal(maskProfanity('fuck this shit'), 'f*** this s***');
});

test('never masks a word that only contains a shorter bad word', () => {
  assert.equal(maskProfanity('class assignment'), 'class assignment');
  assert.equal(maskProfanity('associate degree'), 'associate degree');
  assert.equal(maskProfanity('شروط الدخول'), 'شروط الدخول');
});

test('masks an English plural through variants(), with no separate list entry', () => {
  assert.equal(maskProfanity('bitches'), 'b******');
});

test('matches Arabic regardless of spelling variant', () => {
  assert.equal(maskProfanity('شرموطة'), 'ش*****');
  assert.equal(maskProfanity('شرموطه'), 'ش*****');
});

test('still catches a word with a diacritic inserted mid-word', () => {
  assert.equal(maskProfanity('طَيز'), 'ط***');
});

test('leaves an ordinary Arabic phrase untouched', () => {
  assert.equal(maskProfanity('الجامعة الأميركية'), 'الجامعة الأميركية');
});

test('returns an empty query unchanged', () => {
  assert.equal(maskProfanity(''), '');
});

test('keeps no bad word as readable text in its own source', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(here, 'profanity.ts'), 'utf8').toLowerCase();
  for (const word of ['fuck', 'shit', 'bitch', 'nigger', 'faggot']) {
    assert.ok(!source.includes(word), `"${word}" appears as plain text in profanity.ts`);
  }
});
