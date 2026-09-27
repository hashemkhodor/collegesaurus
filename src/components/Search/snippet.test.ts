// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {highlight, pickSnippet} from './snippet.ts';

const SECTION = [
  'Undergraduate tuition is $1,000 per credit.',
  'Computer Science · BS · FAS · 90',
  'Nursing · BSN · HSON · 120',
].join('\n');

test('shows the line that shares the most words with the query', () => {
  assert.equal(pickSnippet(SECTION, ['nursing']), 'Nursing · BSN · HSON · 120');
  assert.equal(pickSnippet(SECTION, ['computer', 'science']), 'Computer Science · BS · FAS · 90');
});

test('shows the first line when the match is by meaning alone', () => {
  assert.equal(pickSnippet(SECTION, ['cheap']), 'Undergraduate tuition is $1,000 per credit.');
});

test('cuts a long line around its first match', () => {
  const line = `${'Applicants send transcripts and letters. '.repeat(8)}Nursing students also need a health certificate. ${'More rules follow. '.repeat(6)}`;

  const snippet = pickSnippet(line, ['nursing'], 120);

  assert.ok(snippet.startsWith('…') && snippet.endsWith('…'), snippet);
  assert.ok(snippet.includes('Nursing students'), snippet);
  assert.ok(snippet.length <= 122, `${snippet.length}`);
});

test('marks the words the query shares, in any spelling the text uses', () => {
  assert.deepEqual(highlight('Médecine and nursing programs', ['medecine', 'nursing']), [
    {text: 'Médecine', match: true},
    {text: ' and ', match: false},
    {text: 'nursing', match: true},
    {text: ' programs', match: false},
  ]);
});

test('marks an Arabic word written with the article or a conjunction', () => {
  assert.deepEqual(highlight('كلية الطب والتمريض', ['طب', 'تمريض']), [
    {text: 'كلية ', match: false},
    {text: 'الطب', match: true},
    {text: ' ', match: false},
    {text: 'والتمريض', match: true},
  ]);
});
