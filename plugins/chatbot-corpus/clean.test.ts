// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/chatbot-corpus/clean.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {mdxToMarkdown} from './clean.ts';

const MAJORS = `<MajorsTable
  rows={[
    {program: 'Agriculture (+ Diploma of Ing\\u00e9nieur Agricole)', degree: 'BS', department: 'Agriculture', credits: 150, years: 5, source: 'https://aub.edu.lb/agri'},
    {program: 'Children\\'s Literature | Media', degree: 'BA', credits: 120, years: 4},
  ]}
/>`;

test('drops the frontmatter', () => {
  const out = mdxToMarkdown('---\ntitle: AUB\ncontent_year: 2026-2027\n---\n# AUB\n\nText.\n');

  assert.equal(out, '# AUB\n\nText.');
});

test('turns a MajorsTable into a markdown table with decoded values', () => {
  const out = mdxToMarkdown(`### Faculty\n\n${MAJORS}\n`);

  assert.equal(
    out,
    [
      '### Faculty',
      '',
      '| Program | Degree | Department | Credits | Years |',
      '|---|---|---|---|---|',
      '| [Agriculture (+ Diploma of Ingénieur Agricole)](https://aub.edu.lb/agri) | BS | Agriculture | 150 | 5 |',
      "| Children's Literature \\| Media | BA |  | 120 | 4 |",
    ].join('\n'),
  );
});

test('adds the language column only when a row has one', () => {
  const out = mdxToMarkdown(
    "<MajorsTable\n  rows={[\n    {program: 'Law', degree: 'LLB', language: 'French'},\n  ]}\n/>",
  );

  assert.equal(out, '| Program | Degree | Language |\n|---|---|---|\n| Law | LLB | French |');
});

test('keeps the text of alert boxes without their wrapper', () => {
  const out = mdxToMarkdown(
    '<div className="alert-danger">\n\n**Funding paused**\n\nCheck back later.\n\n</div>\n\nAfter.',
  );

  assert.equal(out, '**Funding paused**\n\nCheck back later.\n\nAfter.');
});

test('turns an admonition into a one-line note', () => {
  const out = mdxToMarkdown(
    ':::warning[Not yet updated for 2026-2027]\n\nThis page still shows 2025-2026 information.\nFigures may have changed.\n\n:::\n\n## Faculty',
  );

  assert.equal(
    out,
    '**Not yet updated for 2026-2027.** This page still shows 2025-2026 information. Figures may have changed.\n\n## Faculty',
  );
});

test('undoes the MDX escapes of <, { and }', () => {
  assert.equal(mdxToMarkdown('Transfer \\<54 credits \\{approx\\}'), 'Transfer <54 credits {approx}');
});

test('keeps blockquotes, which hold real caveats', () => {
  const text = '> Minimum TOEFL scores are not published. Contact admissions.';

  assert.equal(mdxToMarkdown(text), text);
});

test('reports components it does not know how to convert', () => {
  const unknown: string[] = [];

  const out = mdxToMarkdown('Before\n\n<TuitionTable rows={[]} />\n', (tag) => unknown.push(tag));

  assert.deepEqual(unknown, ['TuitionTable']);
  assert.match(out, /<TuitionTable/);
});

test('drops MDX and HTML comments, such as the Stories truncate marker', () => {
  const out = mdxToMarkdown('Intro.\n\n{/* truncate */}\n\nMore. <!-- a note -->\n<!-- truncate -->\nEnd.');

  assert.equal(out, 'Intro.\n\nMore.\n\nEnd.');
  assert.equal(mdxToMarkdown('Type \\{/* this */} as is'), 'Type {/* this */} as is');
});
