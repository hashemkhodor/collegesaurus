// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Homepage/UpcomingDeadlines/entries.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import type {HomeDeadline} from '@site/plugins/homepage-data/types';
import type {Deadline} from '@site/src/data/homepage/types';
import {calendarEntries, entrySlug} from './entries.ts';

const AUB = {plugin: 'universities' as const, id: 'aub'};
const LAU = {plugin: 'universities' as const, id: 'lau'};
const MEPI = {plugin: 'scholarships' as const, id: 'mepi-tl'};

const row = (ref: HomeDeadline['ref'], title: string, opens: string | null, closes: string, kind: HomeDeadline['kind'] = 'application'): HomeDeadline => ({ref, title, opens, closes, kind});

const kept = (ref: Deadline['ref'], title: string, closes: string, opens?: string): Deadline => ({
  ref,
  title,
  closes,
  ...(opens ? {opens} : {}),
  sourceUrl: 'https://example.org',
  verifiedOn: '2026-09-22',
});

test("rounds closing the same day at the same university are one entry", () => {
  const entries = calendarEntries(
    [
      row(AUB, 'Freshman - Early Merit (Fall 2027-28)', '2026-07-01', '2026-10-31'),
      row(AUB, 'Freshman - Spring 2026-27', '2026-09-01', '2026-10-31'),
      row(AUB, 'Freshman - Regular (Fall 2027-28)', '2026-11-01', '2026-12-20'),
    ],
    [],
  );

  assert.deepEqual(entries, [
    {ref: AUB, closes: '2026-10-31', opens: '2026-07-01', kinds: ['application'], rounds: ['Freshman - Early Merit (Fall 2027-28)', 'Freshman - Spring 2026-27']},
    {ref: AUB, closes: '2026-12-20', opens: '2026-11-01', kinds: ['application'], rounds: ['Freshman - Regular (Fall 2027-28)']},
  ]);
});

test('a hand-kept deadline that a page already lists is dropped', () => {
  const entries = calendarEntries(
    [row(AUB, 'Transfer <54 credits (Spring 2026-27)', '2026-09-01', '2026-10-31')],
    [kept(AUB, 'Transfer applications, Spring 2026-27', '2026-10-31', '2026-09-01')],
  );

  assert.deepEqual(entries.map((entry) => entry.rounds), [['Transfer <54 credits (Spring 2026-27)']]);
});

test('hand-kept deadlines the pages lack are kept, typed by their section', () => {
  const entries = calendarEntries([], [kept(MEPI, "Tomorrow's Leaders, expected window", '2026-11-25', '2026-09-15')]);

  assert.deepEqual(entries, [
    {ref: MEPI, closes: '2026-11-25', opens: '2026-09-15', kinds: ['scholarship'], rounds: ["Tomorrow's Leaders, expected window"]},
  ]);
});

test('an entry claims no opening date unless every round has one', () => {
  const [entry] = calendarEntries(
    [row(LAU, 'Phase I', '2026-09-15', '2026-11-01'), row(LAU, 'Late phase', null, '2026-11-01')],
    [],
  );

  assert.equal(entry?.opens, null);
});

test('a day mixing admission and aid rounds carries both kinds', () => {
  const [entry] = calendarEntries(
    [row(LAU, 'Undergraduate - Fall 2027', '2026-10-01', '2027-04-30'), row(LAU, 'Financial Aid - Fall 2027', '2026-10-01', '2027-04-30', 'scholarship')],
    [],
  );

  assert.deepEqual(entry?.kinds, ['application', 'scholarship']);
});

test('entries come soonest first, universities before scholarships on the same day', () => {
  const entries = calendarEntries(
    [row(LAU, 'Merit Scholarship', '2026-10-01', '2027-01-31', 'scholarship'), row(LAU, 'Phase II', '2026-09-15', '2027-01-15')],
    [kept(MEPI, 'Next call', '2027-01-15'), kept(AUB, 'Transfer', '2026-10-31')],
  );

  assert.deepEqual(entries.map((entry) => `${entry.closes} ${entry.ref.id}`), [
    '2026-10-31 aub',
    '2027-01-15 lau',
    '2027-01-15 mepi-tl',
    '2027-01-31 lau',
  ]);
});

test("an entry's slug names its calendar file: section, page and day", () => {
  const [entry] = calendarEntries([row(AUB, 'Transfer', '2026-09-01', '2026-10-31')], []);

  assert.equal(entrySlug(entry!), 'universities-aub-2026-10-31');
});
