// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/homepage-data/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import type {CalendarEntry} from '../../src/components/Homepage/UpcomingDeadlines/entries.ts';
import type {Translate} from '../../src/data/homepage/deadlines.ts';
import {deadlineEvent, feedFiles, feedText, type FeedText} from './feed.ts';

const SITE = 'https://collegesaurus.org';
const TEXT: FeedText = {
  calendar: 'Collegesaurus deadlines',
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

test("the feed's words come from the site's translations, or stay in English", () => {
  const arabic: Translate = ({id, message}) =>
    ({'homepage.deadlines.feedEvent': 'آخر موعد: {name}'})[id] ?? message;
  const text = feedText(arabic, 'ar');

  assert.equal(text.title('AUB'), 'آخر موعد: AUB');
  assert.equal(text.opens('1 تموز 2026'), 'Opens 1 تموز 2026');
  assert.equal(text.calendar, 'Collegesaurus deadlines');
  assert.equal(text.scholarship, 'Scholarships and aid');
});

test("days are written out in the feed's language", () => {
  const same: Translate = ({message}) => message;

  assert.equal(feedText(same, 'en').date('2026-07-01'), 'July 1, 2026');
  assert.equal(feedText(same, 'ar').date('2026-07-01'), '1 تموز 2026');
});

test('the build writes the feed, and each deadline whose page exists on its own', () => {
  const mepi = entry({
    ref: {plugin: 'scholarships', id: 'mepi-tl'},
    closes: '2026-11-25',
    opens: null,
    kinds: ['scholarship'],
    rounds: ["Tomorrow's Leaders"],
  });
  const gone = entry({ref: {plugin: 'universities', id: 'closed-down'}});
  const pages = new Map([
    ['universities/aub', AUB_PAGE],
    ['scholarships/mepi-tl', {shortName: 'MEPI', url: `${SITE}/scholarships/mepi-tl`}],
  ]);
  const files = feedFiles({
    entries: [entry(), mepi, gone],
    page: (ref) => pages.get(`${ref.plugin}/${ref.id}`),
    text: TEXT,
    site: SITE,
    stamp: new Date('2026-09-26T08:30:00Z'),
  });

  assert.deepEqual(
    files.map((file) => file.path),
    [
      'deadlines.ics',
      'deadlines/universities-aub-2026-10-31.ics',
      'deadlines/scholarships-mepi-tl-2026-11-25.ics',
    ],
  );
  assert.equal(files[0]!.content.match(/BEGIN:VEVENT/g)?.length, 2);
  assert.match(files[0]!.content, /\r\nX-WR-CALNAME:Collegesaurus deadlines\r\n/);
  assert.match(files[2]!.content, /\r\nSUMMARY:MEPI deadline\r\n/);
  assert.match(files[2]!.content, /\r\nBEGIN:VALARM\r\n/);
});
