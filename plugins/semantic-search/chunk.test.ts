// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {chunkDocument} from './chunk.ts';

const AUB = 'AUB — American University of Beirut';
const TABLE_HEADER = '| Program | Degree | Department | Credits | Years |\n|---|---|---|---|---|';
const AUB_BODY = [
  '# American University of Beirut (AUB)',
  '',
  '## Faculty',
  '',
  'AUB offers ~46 undergraduate programs.',
  '',
  TABLE_HEADER,
  '| Civil Engineering | BE | Civil and Environmental Engineering | 150 | 5 |',
  '',
  '## Tuition (AY 2026-2027)',
  '',
  'Undergraduate tuition is **$1,000 per credit**.',
  '',
  '## Contacts',
  '',
  'Call 01-350000.',
].join('\n');

function aub(body: string, year: string | null = '2026-2027') {
  return {title: AUB, body, year};
}

test('makes one chunk per small section, starting with its breadcrumb and pointing at its heading', () => {
  const chunks = chunkDocument(aub(AUB_BODY));

  assert.deepEqual(
    chunks.map((chunk) => [chunk.text.split('\n')[0], chunk.anchor]),
    [
      [`${AUB} › Faculty [2026-2027]`, 'faculty'],
      [`${AUB} › Tuition (AY 2026-2027) [2026-2027]`, 'tuition-ay-2026-2027'],
      [`${AUB} › Contacts [2026-2027]`, 'contacts'],
    ],
  );
  assert.ok(chunks[0].body.includes('| Civil Engineering | BE |'));
  assert.equal(chunks[1].section, 'Tuition (AY 2026-2027)');
});

test('never makes a chunk of the page title', () => {
  assert.ok(!chunkDocument(aub(AUB_BODY)).some((chunk) => chunk.text.includes('# American University')));
});

test('keeps text before the first section under the page breadcrumb, pointing at the top', () => {
  const lau = {
    title: 'LAU — Lebanese American University',
    body: 'Not yet updated for 2026-2027.\n\n## Contacts\n\nCall 01-786456.',
    year: '2025-2026',
  };

  const [first] = chunkDocument(lau);

  assert.equal(first.text.split('\n')[0], 'LAU — Lebanese American University [2025-2026]');
  assert.equal(first.anchor, null);
  assert.equal(first.section, '');
  assert.ok(first.body.includes('Not yet updated'));
});

test('splits an oversized section by subsection, with link-free breadcrumbs and anchors', () => {
  const rows = Array.from(
    {length: 30},
    (_, i) => `| Program ${String(i).padStart(2, '0')} | BE | Department of Engineering | 150 | 4 |`,
  ).join('\n');
  const body = [
    '## Faculty',
    'AUB offers ~46 undergraduate programs.',
    '### Maroun Semaan Faculty of Engineering & Architecture ([MSFEA](https://aub.edu.lb/msfea))',
    `${TABLE_HEADER}\n${rows}`,
    '### Faculty of Arts and Sciences ([FAS](https://aub.edu.lb/fas))',
    `${TABLE_HEADER}\n${rows}`,
  ].join('\n\n');

  const firstLines = new Map(chunkDocument(aub(body)).map((chunk) => [chunk.text.split('\n')[0], chunk.anchor]));

  const msfea = 'Maroun Semaan Faculty of Engineering & Architecture (MSFEA)';
  assert.deepEqual(
    [...firstLines],
    [
      [`${AUB} › Faculty [2026-2027]`, 'faculty'],
      [`${AUB} › Faculty › ${msfea} [2026-2027]`, 'maroun-semaan-faculty-of-engineering--architecture-msfea'],
      [`${AUB} › Faculty › Faculty of Arts and Sciences (FAS) [2026-2027]`, 'faculty-of-arts-and-sciences-fas'],
    ],
  );
});

test('splits a long table by rows, repeating its header, without losing a row', () => {
  const rows = Array.from(
    {length: 60},
    (_, i) => `| Program ${String(i).padStart(2, '0')} | BE | Department of Engineering | 150 | 4 |`,
  );
  const body = `## Faculty\n\n### Engineering\n\n${TABLE_HEADER}\n${rows.join('\n')}\n`;

  const chunks = chunkDocument(aub(body));

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.body.includes(TABLE_HEADER)));
  const found = chunks.flatMap((chunk) =>
    chunk.body.split('\n').filter((line) => line.startsWith('| Program ') && !line.includes('Degree')),
  );
  assert.deepEqual(found, rows);
});

test('caps every chunk body and loses no sentence', () => {
  const sentences = Array.from({length: 150}, (_, i) => `Sentence ${i} explains one admission rule in detail.`);

  const chunks = chunkDocument(aub(`## Requirements\n\n${sentences.join(' ')}\n`), 1200);

  assert.ok(chunks.every((chunk) => chunk.body.length <= 1200));
  assert.equal(chunks.map((chunk) => chunk.body).join(' '), sentences.join(' '));
});

test('keeps a heading with the table it introduces', () => {
  const rows = Array.from(
    {length: 40},
    (_, i) => `| Grant ${String(i).padStart(2, '0')} | Part of tuition for students in need | 25% |`,
  ).join('\n');
  const intro = 'Intro paragraph about aid. '.repeat(44);
  const body = `## Scholarships\n\n${intro}\n\n#### Need-based aid\n\n| Grant | Details | Share |\n|---|---|---|\n${rows}\n`;

  const chunks = chunkDocument(aub(body));

  assert.ok(!chunks.some((chunk) => chunk.body.trim() === '#### Need-based aid'));
  const firstTable = chunks.find((chunk) => chunk.body.includes('| Grant 00 |'));
  assert.ok(firstTable?.body.startsWith('#### Need-based aid\n\n| Grant | Details |'));
});

test('still splits a long paragraph after lead-ins too long to carry with it', () => {
  const leadIns = Array.from({length: 7}, (_, i) => `${`Requirement ${i} applies to every applicant `.repeat(4)}and:`);
  const paragraph = 'Applicants must submit transcripts. '.repeat(45);

  const chunks = chunkDocument(aub(`## Requirements\n\n${leadIns.join('\n\n')}\n\n${paragraph}`));

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.body.length <= 1200), chunks.map((chunk) => chunk.body.length).join());
  assert.equal(chunks.map((chunk) => chunk.body).join(' ').split(/\s+/).length, `${leadIns.join(' ')} ${paragraph}`.trim().split(/\s+/).length);
});

test('splits a table whose header is longer than a chunk, keeping every row', () => {
  const header = `| ${Array.from({length: 60}, (_, i) => `Column ${i} heading`).join(' | ')} |\n|${'---|'.repeat(60)}`;
  const rows = Array.from({length: 20}, (_, i) => `| Program ${i} |${' x |'.repeat(59)}`);

  const chunks = chunkDocument(aub(`## Faculty\n\n${header}\n${rows.join('\n')}`));

  const found = chunks.flatMap((chunk) => chunk.body.split('\n').filter((line) => line.startsWith('| Program ')));
  assert.deepEqual(found, rows);
});

test('drops sections without content', () => {
  const chunks = chunkDocument(aub('## Empty\n\n## Contacts\n\nCall 01-350000.\n'));

  assert.deepEqual(chunks.map((chunk) => chunk.section), ['Contacts']);
});

test('leaves the year out of the breadcrumb when the page has none', () => {
  const [chunk] = chunkDocument(aub('## Contacts\n\nCall 01-350000.\n', null));

  assert.equal(chunk.text.split('\n')[0], `${AUB} › Contacts`);
});

test('numbers repeated headings the way Docusaurus does, counting every level', () => {
  const body = [
    '# Overview',
    'Intro.',
    '## Overview',
    'Text A.',
    '## Hungary',
    '### Overview',
    'Text B.',
    '#### Merit',
    'Text C.',
    '## Merit',
    'Text D.',
  ].join('\n\n');

  assert.deepEqual(chunkDocument(aub(body)).map((chunk) => chunk.anchor), [null, 'overview-1', 'hungary', 'merit-1']);
  assert.deepEqual(
    chunkDocument(aub(body), 20).map((chunk) => chunk.anchor),
    [null, 'overview-1', 'overview-2', 'overview-2', 'merit-1'],
  );
});

test('slugs Arabic headings as the Arabic pages do', () => {
  // Ids read from collegesaurus.org/ar/universities/aub on 2026-09-26.
  const body = [
    '## الأقساط (للعام 2026-2027)',
    'نص.',
    '## المنح',
    '### المنح التي تقدّمها الجامعة (University-offered scholarships)',
    'نص.',
    '### أنواع التقديم ومواعيده (Application Types + Windows)',
    'نص.',
  ].join('\n\n');

  assert.deepEqual(chunkDocument(aub(body), 10).map((chunk) => chunk.anchor), [
    'الأقساط-للعام-2026-2027',
    'المنح-التي-تقدّمها-الجامعة-university-offered-scholarships',
    'أنواع-التقديم-ومواعيده-application-types--windows',
  ]);
});

test('uses an explicit {#id} as the anchor', () => {
  const [chunk] = chunkDocument(aub('## Tuition {#fees}\n\nAbout $1,000 per credit.'));

  assert.deepEqual([chunk.section, chunk.anchor], ['Tuition', 'fees']);
});
