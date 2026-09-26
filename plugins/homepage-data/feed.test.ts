// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/homepage-data/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';

import type {CalendarEntry} from '../../src/components/Homepage/UpcomingDeadlines/entries.ts';
import {eventText} from '../../src/components/Homepage/UpcomingDeadlines/event.ts';
import {feedFiles} from './feed.ts';

const SITE = 'https://collegesaurus.org';
const TEXT = eventText(({message}) => message, 'en');
const STAMP = new Date('2026-09-26T08:30:00Z');
const AUB_PAGE = {shortName: 'AUB', url: `${SITE}/universities/aub`};

const entry = (overrides: Partial<CalendarEntry> = {}): CalendarEntry => ({
  ref: {plugin: 'universities', id: 'aub'},
  closes: '2026-10-31',
  opens: '2026-07-01',
  kinds: ['application'],
  rounds: ['Freshman - Early Merit (Fall 2027-28)'],
  ...overrides,
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
    stamp: STAMP,
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

test('a deadline keeps its UID in every language, named after the site and not the page', () => {
  const uids = (url: string) =>
    feedFiles({
      entries: [entry()],
      page: () => ({shortName: 'AUB', url}),
      text: TEXT,
      site: SITE,
      stamp: STAMP,
    }).map((file) => file.content.match(/^UID:(.*)$/m)?.[1]);
  // uuid5(URL namespace, 'https://collegesaurus.org/deadlines/universities-aub-2026-10-31'), from Python.
  const uid = 'f7bf9c60-1420-5246-926a-faedfd0e46fc';

  assert.deepEqual(uids(`${SITE}/universities/aub`), [uid, uid]);
  assert.deepEqual(uids(`${SITE}/ar/universities/aub`), [uid, uid]);
});
