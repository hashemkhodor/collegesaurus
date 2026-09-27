// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {headingText, plainText, withoutLinks} from './markdown.ts';

test('reads a heading as the text Docusaurus builds its id from', () => {
  assert.equal(
    headingText('Faculty of Arts and Sciences ([FAS](https://www.aub.edu.lb/fas/Pages/default.aspx))'),
    'Faculty of Arts and Sciences (FAS)',
  );
  assert.equal(headingText('**Tuition** (AY 2026-2027)'), 'Tuition (AY 2026-2027)');
  assert.equal(headingText('_Need-based_ aid for `SAT` takers'), 'Need-based aid for SAT takers');
  assert.equal(headingText('Fees &amp; aid'), 'Fees & aid');
});

test('flattens a table to one line per row, without its header', () => {
  const table = [
    '| Program | Degree | Department | Credits |',
    '|---|---|---|---|',
    '| [Computer Science](https://www.aub.edu.lb/cs) | BS | FAS | 90 |',
    "| Children's Literature \\| Media | BA |  | 120 |",
  ].join('\n');

  assert.equal(
    plainText(table),
    "Computer Science · BS · FAS · 90\nChildren's Literature | Media · BA · 120",
  );
});

test('keeps prose, list items and headings as plain lines', () => {
  const markdown = [
    '#### Need-based aid',
    '',
    'AUB covers **up to 100%** of [tuition](https://www.aub.edu.lb/aid) for students in need.',
    '',
    '- Apply by *March 1*',
    '- Include tax records<br/>and bank statements',
    '> Awards are renewed yearly.',
  ].join('\n');

  assert.equal(
    plainText(markdown),
    [
      'Need-based aid',
      'AUB covers up to 100% of tuition for students in need.',
      'Apply by March 1',
      'Include tax records and bank statements',
      'Awards are renewed yearly.',
    ].join('\n'),
  );
});

test('drops link targets but keeps their text and the markdown around them', () => {
  assert.equal(
    withoutLinks('| [Nursing](https://aub.edu.lb/nursing) | BSN |\n![logo](/img/aub.png) See [the catalog](https://aub.edu.lb).'),
    '| Nursing | BSN |\n See the catalog.',
  );
});
