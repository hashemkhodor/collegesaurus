// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import {rankPages, type ChunkRef} from './rank.ts';

// Page 0 is AUB, 1 is LAU, 2 is a story. LAU's Faculty section was long
// enough to be split into two chunks.
const CHUNKS: ChunkRef[] = [
  {page: 0, section: 'Tuition', anchor: 'tuition'},
  {page: 1, section: 'Faculty', anchor: 'faculty'},
  {page: 0, section: 'Contacts', anchor: 'contacts'},
  {page: 1, section: 'Faculty', anchor: 'faculty'},
  {page: 2, section: '', anchor: null},
];
const SCORES = [0.62, 0.8, 0.75, 0.79, 0.3];
const OPEN = {limit: 10, perPage: 3, floor: 0.5, margin: 1, sectionMargin: 1};

test('orders pages by their best section, and each page its sections, by score', () => {
  assert.deepEqual(rankPages(SCORES, CHUNKS, OPEN), [
    {page: 1, score: 0.8, sections: [{chunk: 1, section: 'Faculty', anchor: 'faculty', score: 0.8}]},
    {
      page: 0,
      score: 0.75,
      sections: [
        {chunk: 2, section: 'Contacts', anchor: 'contacts', score: 0.75},
        {chunk: 0, section: 'Tuition', anchor: 'tuition', score: 0.62},
      ],
    },
  ]);
});

test('shows a section split into several chunks once, at its best chunk', () => {
  const [lau] = rankPages(SCORES, CHUNKS, OPEN);

  assert.deepEqual(lau.sections.map((section) => section.chunk), [1]);
});

test('drops everything scored under the floor', () => {
  assert.deepEqual(rankPages(SCORES, CHUNKS, {...OPEN, floor: 0.7}).map((page) => page.sections.length), [1, 1]);
  assert.deepEqual(rankPages(SCORES, CHUNKS, {...OPEN, floor: 0.9}), []);
});

test('drops pages that trail the best page by more than the margin', () => {
  assert.deepEqual(rankPages(SCORES, CHUNKS, {...OPEN, margin: 0.04}).map((page) => page.page), [1]);
  assert.deepEqual(rankPages(SCORES, CHUNKS, {...OPEN, margin: 0.06}).map((page) => page.page), [1, 0]);
});

test("drops a page's weaker sections that trail its best by more than the section margin", () => {
  const aub = rankPages(SCORES, CHUNKS, {...OPEN, sectionMargin: 0.1})[1];

  assert.deepEqual(aub.sections.map((section) => section.section), ['Contacts']);
});

test('keeps at most perPage sections per page and limit pages', () => {
  assert.deepEqual(rankPages(SCORES, CHUNKS, {...OPEN, perPage: 1})[1].sections.length, 1);
  assert.deepEqual(rankPages(SCORES, CHUNKS, {...OPEN, limit: 1}).map((page) => page.page), [1]);
});

test('breaks ties by index order, so the same query always lists the same way', () => {
  const tied = rankPages([0.7, 0.7], CHUNKS.slice(0, 2), OPEN);

  assert.deepEqual(tied.map((page) => page.page), [0, 1]);
});
