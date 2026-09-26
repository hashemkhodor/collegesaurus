// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {buildVocabulary, type Term} from './vocab.ts';

const view = (terms: Term[]) => terms.map(({key, text, weight}) => [key, text, Number(weight.toFixed(3))]);

test("takes the pages' words, keyed as the browser looks them up, in their most common spelling", () => {
  const terms = buildVocabulary({documents: ['AUB offers Médecine.', 'AUB and médecine at AUB', 'médecine']});

  assert.deepEqual(view(terms), [
    ['aub', 'AUB', 1],
    ['medecine', 'médecine', 1],
    ['offers', 'offers', 1],
  ]);
});

test('adds phrases that several sections share, never across punctuation', () => {
  // Without the cell borders, "science bs" would also be in two sections.
  const terms = buildVocabulary({documents: ['Computer Science · BS', 'Computer Science · BA', 'Science · BS']});

  assert.deepEqual(
    terms.filter((term) => term.key.includes(' ')).map((term) => [term.key, term.text]),
    [['computer science', 'Computer Science']],
  );
});

test('adds the general words and student phrases the pages lack, at full weight', () => {
  const terms = buildVocabulary({
    documents: ['Nursing at LAU'],
    words: ['coding', 'Nursing', 'the'],
    phrases: ["bourse d'études", 'study abroad'],
  });

  assert.deepEqual(view(terms), [
    ['bourse d etudes', "bourse d'études", 1],
    ['coding', 'coding', 1],
    ['lau', 'LAU', 1],
    ['nursing', 'Nursing', 1],
    ['study abroad', 'study abroad', 1],
  ]);
});

test('weighs words down as they spread across sections', () => {
  const documents = Array.from({length: 40}, (_, i) => {
    const words = ['university'];
    if (i < 35) {
      words.push('AUB');
    }
    if (i < 2) {
      words.push('nursing');
    }
    return words.join(' ');
  });

  const weight = new Map(buildVocabulary({documents, common: 30}).map((term) => [term.key, term.weight]));

  assert.equal(weight.get('nursing'), 1);
  // log(41 / 36) / log(41 / 31)
  assert.ok(Math.abs(weight.get('aub')! - 0.4652) < 1e-3);
  assert.equal(weight.get('university'), 0.05);
});
