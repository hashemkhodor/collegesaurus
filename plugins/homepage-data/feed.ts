import {
  entrySlug,
  type CalendarEntry,
} from '../../src/components/Homepage/UpcomingDeadlines/entries.ts';
import {URL_NAMESPACE, uuid5, type CalendarEvent} from './ical.ts';

/** The feed's words, already in its language. */
export type FeedText = {
  /** "AUB deadline" */
  title: (name: string) => string;
  /** "Opens 1 July 2026" */
  opens: (date: string) => string;
  application: string;
  scholarship: string;
  /** A day written out for reading. */
  date: (iso: string) => string;
};

/**
 * One card of the calendar, a page's deadlines on one day, as a calendar
 * event. Its UID is named after the site's address for the deadline rather
 * than the page's, so it is the same in every language.
 */
export function deadlineEvent(
  entry: CalendarEntry,
  page: {shortName: string; url: string},
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
