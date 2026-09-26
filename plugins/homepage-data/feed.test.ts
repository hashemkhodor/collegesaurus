// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/homepage-data/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import type {CalendarEntry} from '../../src/components/Homepage/UpcomingDeadlines/entries.ts';
import {deadlineEvent, type FeedText} from './feed.ts';

const SITE = 'https://collegesaurus.org';
const TEXT: FeedText = {
  title: (name) => `${name} deadline`,
  opens: (date) => `Opens ${date}`,
  application: 'Applications',
  scholarship: 'Scholarships and aid',
  date: (iso) => ({'2026-07-01': '1 July 2026'})[iso] ?? iso,
};
const AUB_PAGE = {shortName: 'AUB', url: `${SITE}/universities/aub`};

const entry = (overrides: Partial<CalendarEntry> = {}): CalendarEntry => ({
  ref: {plugin: 'universities', id: 'aub'},
  closes: '2026-10-31',
  opens: '2026-07-01',
  kinds: ['application'],
  rounds: ['Freshman - Early Merit (Fall 2027-28)', 'Freshman - Spring 2026-27'],
  ...overrides,
});

test('an entry becomes an all-day event named after its page, with its rounds and link', () => {
  assert.deepEqual(deadlineEvent(entry(), AUB_PAGE, TEXT, SITE), {
    // uuid5(URL namespace, 'https://collegesaurus.org/deadlines/universities-aub-2026-10-31'), from Python.
    uid: 'f7bf9c60-1420-5246-926a-faedfd0e46fc',
    date: '2026-10-31',
    title: 'AUB deadline',
    description: [
      'Freshman - Early Merit (Fall 2027-28)',
      'Freshman - Spring 2026-27',
      'Opens 1 July 2026',
      '',
      'https://collegesaurus.org/universities/aub',
    ].join('\n'),
    url: 'https://collegesaurus.org/universities/aub',
    categories: ['Applications'],
  });
});

test('an entry with no opening date says nothing about opening', () => {
  const event = deadlineEvent(entry({opens: null, rounds: ['Transfer']}), AUB_PAGE, TEXT, SITE);

  assert.equal(event.description, 'Transfer\n\nhttps://collegesaurus.org/universities/aub');
});

test('a day with an admission round and an aid round carries both categories', () => {
  const event = deadlineEvent(entry({kinds: ['application', 'scholarship']}), AUB_PAGE, TEXT, SITE);

  assert.deepEqual(event.categories, ['Applications', 'Scholarships and aid']);
});

test('the same deadline keeps its UID whatever the language of the page', () => {
  const arabic = deadlineEvent(entry(), {shortName: 'AUB', url: `${SITE}/ar/universities/aub`}, TEXT, SITE);

  assert.equal(arabic.uid, 'f7bf9c60-1420-5246-926a-faedfd0e46fc');
});
