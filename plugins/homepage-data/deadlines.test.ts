// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/homepage-data/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {pageDeadlines} from './deadlines.ts';
import {collectDeadlines} from './index.ts';

const FIXTURES = new URL('../../scripts/drive_sync/tests/fixtures/expected/', import.meta.url);
const fixture = (name: string) => fs.readFileSync(new URL(name, FIXTURES), 'utf8');

/** A page holding one H2 section, as drive_sync emits it. */
const page = (heading: string, table: string) => `---\ntitle: X\n---\n\n# X\n\n## ${heading}\n\n${table}\n`;

test('reads every window row with a full closing date from a university page', () => {
  assert.deepEqual(pageDeadlines(fixture('aub.mdx'), 'university'), [
    {title: 'Freshman — Early Merit (Fall 2026-27)', opens: '2025-08-01', closes: '2025-10-31', kind: 'application'},
    {title: 'Freshman — Regular (Fall 2026-27)', opens: '2025-11-01', closes: '2025-12-20', kind: 'application'},
    {title: 'Freshman — Spring 2025-26', opens: '2025-09-08', closes: '2025-10-31', kind: 'application'},
    {title: 'Sophomore — Early Merit (Fall 2026-27)', opens: '2025-08-01', closes: '2025-10-31', kind: 'application'},
    {title: 'Sophomore — Regular (Fall 2026-27)', opens: '2025-11-01', closes: '2025-12-20', kind: 'application'},
    {title: 'Sophomore — Spring 2025-26', opens: '2025-09-08', closes: '2025-10-31', kind: 'application'},
    {title: 'Transfer <54 credits (Fall 2026-27)', opens: '2026-01-26', closes: '2026-04-30', kind: 'application'},
    {title: 'Transfer <54 credits (Spring 2026-27)', opens: '2026-09-01', closes: '2026-10-31', kind: 'application'},
  ]);
});

test('reads the Arabic page, whose dates use Levantine month names', () => {
  const rows = pageDeadlines(fixture('aub.ar.mdx'), 'university');

  assert.equal(rows.length, 8);
  assert.deepEqual(rows[7], {
    title: 'Transfer <54 credits (Spring 2026-27)',
    opens: '2026-09-01',
    closes: '2026-10-31',
    kind: 'application',
  });
});

test('takes only the closing stage of a scholarship timeline', () => {
  assert.deepEqual(pageDeadlines(fixture('fulbright.mdx'), 'scholarship'), [
    {title: 'Applications close', opens: null, closes: '2026-05-04', kind: 'scholarship'},
  ]);
  assert.deepEqual(pageDeadlines(fixture('fulbright.ar.mdx'), 'scholarship'), [
    {title: 'إقفال التقديم', opens: null, closes: '2026-05-04', kind: 'scholarship'},
  ]);
});

test('skips closing dates that are not full dates', () => {
  const mdx = page(
    'Application',
    [
      '| Term | Opens | Closes |',
      '| --- | --- | --- |',
      '| Spring 2026-27 | Oct 19, 2026 | TBA |',
      '| Fall | — | Rolling — still accepting |',
      '| Spring | Sep 1, 2026 | November 30 |',
      '| Early Admission | — | Mid-Jan 2027 |',
    ].join('\n'),
  );

  assert.deepEqual(pageDeadlines(mdx, 'university'), []);
});

test('ignores deadline tables outside the application section', () => {
  const mdx = page('Scholarships', '| Name | Deadline |\n| --- | --- |\n| Merit | Oct 1, 2026 |');

  assert.deepEqual(pageDeadlines(mdx, 'university'), []);
});

test('reads cells the way the page renders them', () => {
  const mdx = page(
    'Application',
    [
      '| **Term / Type** | **Opens** | **Closes** | **Reference** |',
      '| --- | --- | --- | --- |',
      '| Early \\| Merit | [Sep 1, 2026](https://example.edu/open) | <strong>Nov 1, 2026</strong> | [Deadlines](https://example.edu) |',
    ].join('\n'),
  );

  assert.deepEqual(pageDeadlines(mdx, 'university'), [
    {title: 'Early | Merit', opens: '2026-09-01', closes: '2026-11-01', kind: 'application'},
  ]);
});

test("a university's aid and scholarship rows count as scholarships", () => {
  const mdx = page(
    'Application',
    [
      '| Term | Closes |',
      '| --- | --- |',
      '| Undergraduate - Fall 2027, Phase I | Nov 1, 2026 |',
      '| Financial Aid (new students) - Spring 2027 | Nov 15, 2026 |',
      '| Merit Scholarship - Fall 2027 | Jan 31, 2027 |',
      '| منحة الجدارة | 31 كانون الثاني 2027 |',
    ].join('\n'),
  );

  assert.deepEqual(
    pageDeadlines(mdx, 'university').map((row) => row.kind),
    ['application', 'scholarship', 'scholarship', 'scholarship'],
  );
});

/** A site directory holding `files`, and the docs content that points at them. */
function site(files: Record<string, string>) {
  const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'homepage-data-'));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(siteDir, name)), {recursive: true});
    fs.writeFileSync(path.join(siteDir, name), text);
  }
  return siteDir;
}

const doc = (id: string, source: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: id,
  permalink: `/x/${id}`,
  source: `@site/${source}`,
  frontMatter: {},
  ...extra,
});

test('publishes upcoming deadlines from the newest year of both sections, soonest first', () => {
  const windows = [
    '| Term | Opens | Closes |',
    '| --- | --- | --- |',
    '| Early Merit (Fall 2027-28) | Jul 1, 2026 | Oct 31, 2026 |',
    '| Regular (Fall 2026-27) | Nov 1, 2025 | Dec 20, 2025 |',
  ].join('\n');
  const siteDir = site({
    'u/new/aub.mdx': page('Application', windows),
    'u/new/draft.mdx': page('Application', windows),
    'u/old/lau.mdx': page('Application', windows),
    's/new/mepi-tl.mdx': page(
      'Application window',
      '| Stage | Date |\n| --- | --- |\n| Applications close | November 25, 2026 |',
    ),
  });
  const content = {
    'docusaurus-plugin-content-docs': {
      universities: {
        loadedVersions: [
          {docs: [doc('aub', 'u/new/aub.mdx'), doc('draft', 'u/new/draft.mdx', {unlisted: true})]},
          {docs: [doc('lau', 'u/old/lau.mdx')]},
        ],
      },
      scholarships: {loadedVersions: [{docs: [doc('mepi-tl', 's/new/mepi-tl.mdx')]}]},
    },
  };

  assert.deepEqual(collectDeadlines(siteDir, content, '2026-09-26'), [
    {
      ref: {plugin: 'universities', id: 'aub'},
      title: 'Early Merit (Fall 2027-28)',
      opens: '2026-07-01',
      closes: '2026-10-31',
      kind: 'application',
    },
    {
      ref: {plugin: 'scholarships', id: 'mepi-tl'},
      title: 'Applications close',
      opens: null,
      closes: '2026-11-25',
      kind: 'scholarship',
    },
  ]);
  // A deadline is still upcoming on its own day.
  assert.equal(collectDeadlines(siteDir, content, '2026-10-31').length, 2);
  assert.equal(collectDeadlines(siteDir, content, '2026-11-01').length, 1);
});
