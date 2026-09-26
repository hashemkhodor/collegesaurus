// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON src/components/Homepage/UpcomingDeadlines/event.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import type {Translate} from '@site/src/data/homepage/deadlines';
import type {CalendarEntry} from './entries';
import {deadlineEvent, eventText, type EventText} from './event.ts';

const TEXT: EventText = {
  calendar: 'Collegesaurus deadlines',
  title: (name) => `${name} deadline`,
  opens: (date) => `Opens ${date}`,
  application: 'Applications',
  scholarship: 'Scholarships and aid',
  date: (iso) => ({'2026-07-01': '1 July 2026'})[iso] ?? iso,
};
const AUB = {shortName: 'AUB', url: 'https://collegesaurus.org/universities/aub'};

const entry = (overrides: Partial<CalendarEntry> = {}): CalendarEntry => ({
  ref: {plugin: 'universities', id: 'aub'},
  closes: '2026-10-31',
  opens: '2026-07-01',
  kinds: ['application'],
  rounds: ['Freshman - Early Merit (Fall 2027-28)', 'Freshman - Spring 2026-27'],
  ...overrides,
});

test('a card becomes an all-day event named after its page, with its rounds and link', () => {
  assert.deepEqual(deadlineEvent(entry(), AUB, TEXT), {
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

test('a card with no opening date says nothing about opening', () => {
  const event = deadlineEvent(entry({opens: null, rounds: ['Transfer']}), AUB, TEXT);

  assert.equal(event.description, 'Transfer\n\nhttps://collegesaurus.org/universities/aub');
});

test('a day with an admission round and an aid round carries both categories', () => {
  const event = deadlineEvent(entry({kinds: ['application', 'scholarship']}), AUB, TEXT);

  assert.deepEqual(event.categories, ['Applications', 'Scholarships and aid']);
});

test("an event's words come from the site's translations, or stay in English", () => {
  const arabic: Translate = ({id, message}) =>
    ({'homepage.deadlines.feedEvent': 'آخر موعد: {name}'})[id] ?? message;
  const text = eventText(arabic, 'ar');

  assert.equal(text.title('AUB'), 'آخر موعد: AUB');
  assert.equal(text.opens('1 تموز 2026'), 'Opens 1 تموز 2026');
  assert.equal(text.calendar, 'Collegesaurus deadlines');
  assert.equal(text.scholarship, 'Scholarships and aid');
});

test("days are written out in the page's language", () => {
  const same: Translate = ({message}) => message;

  assert.equal(eventText(same, 'en').date('2026-07-01'), 'July 1, 2026');
  assert.equal(eventText(same, 'ar').date('2026-07-01'), '1 تموز 2026');
});
