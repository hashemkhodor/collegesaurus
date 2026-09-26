import {dayFormatter} from '../../src/components/Homepage/UpcomingDeadlines/dates.ts';
import {
  entrySlug,
  eventPath,
  FEED_PATH,
  type CalendarEntry,
} from '../../src/components/Homepage/UpcomingDeadlines/entries.ts';
import type {Translate} from '../../src/data/homepage/deadlines.ts';
import {calendarFeed, eventFile, URL_NAMESPACE, uuid5, type CalendarEvent} from './ical.ts';

/** The feed's words, already in its language. */
export type FeedText = {
  /** "Collegesaurus deadlines", the calendar's name in the reader's app */
  calendar: string;
  /** "AUB deadline" */
  title: (name: string) => string;
  /** "Opens July 1, 2026" */
  opens: (date: string) => string;
  application: string;
  scholarship: string;
  /** A day written out for reading. */
  date: (iso: string) => string;
};

/** The page a deadline belongs to, with its full address. */
export type FeedPage = {shortName: string; url: string};

export type CalendarFile = {path: string; content: string};

/** Fills in {placeholders} the way Docusaurus' translate does. */
const fill = (message: string, values: {[key: string]: string}) =>
  message.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] ?? placeholder);

/** The feed's words from the site's translations, and its days in `locale`. */
export function feedText(translate: Translate, locale: string): FeedText {
  const title = translate({id: 'homepage.deadlines.feedEvent', message: '{name} deadline'});
  const opens = translate({id: 'homepage.deadlines.feedOpens', message: 'Opens {date}'});
  return {
    calendar: translate({id: 'homepage.deadlines.feedName', message: 'Collegesaurus deadlines'}),
    title: (name) => fill(title, {name}),
    opens: (date) => fill(opens, {date}),
    application: translate({id: 'homepage.deadlines.legendApplications', message: 'Applications'}),
    scholarship: translate({
      id: 'homepage.deadlines.legendScholarships',
      message: 'Scholarships and aid',
    }),
    date: dayFormatter(locale, {day: 'numeric', month: 'long', year: 'numeric'}),
  };
}

/**
 * One card of the calendar, a page's deadlines on one day, as a calendar
 * event. Its UID is named after the site's address for the deadline rather
 * than the page's, so it is the same in every language.
 */
export function deadlineEvent(
  entry: CalendarEntry,
  page: FeedPage,
  text: FeedText,
  site: string,
): CalendarEvent {
  return {
    uid: uuid5(URL_NAMESPACE, `${site}/deadlines/${entrySlug(entry)}`),
    date: entry.closes,
    title: text.title(page.shortName),
    description: [
      ...entry.rounds,
      ...(entry.opens ? [text.opens(text.date(entry.opens))] : []),
      '',
      page.url,
    ].join('\n'),
    url: page.url,
    categories: entry.kinds.map((kind) =>
      kind === 'application' ? text.application : text.scholarship,
    ),
  };
}

/**
 * What the build publishes for one language: the feed to subscribe to, and
 * each deadline on its own to add once. A deadline whose page is gone is
 * left out, as it is on the landing page.
 */
export function feedFiles({
  entries,
  page,
  text,
  site,
  stamp,
}: {
  entries: CalendarEntry[];
  page: (ref: CalendarEntry['ref']) => FeedPage | undefined;
  text: FeedText;
  site: string;
  stamp: Date;
}): CalendarFile[] {
  const events = entries.flatMap((entry) => {
    const found = page(entry.ref);
    return found ? [{entry, event: deadlineEvent(entry, found, text, site)}] : [];
  });
  return [
    {
      path: FEED_PATH,
      content: calendarFeed({name: text.calendar, events: events.map(({event}) => event)}, stamp),
    },
    ...events.map(({entry, event}) => ({path: eventPath(entry), content: eventFile(event, stamp)})),
  ];
}
