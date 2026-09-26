import type {CalendarEvent} from '@site/plugins/homepage-data/ical';
import type {Translate} from '@site/src/data/homepage/deadlines';
import {dayFormatter} from './dates.ts';
import type {CalendarEntry} from './entries';

/**
 * How a card of the calendar reads once it is in someone's calendar app. The
 * build writes it into the .ics files and the page into its links to Google
 * Calendar and Outlook, so a deadline reads the same wherever it is added.
 */

/** An event's words, already in the page's language. */
export type EventText = {
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
export type EventPage = {shortName: string; url: string};

/** Fills in {placeholders} the way Docusaurus' translate does. */
const fill = (message: string, values: {[key: string]: string}) =>
  message.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] ?? placeholder);

/** The words from the site's translations, and the days in `locale`. */
export function eventText(translate: Translate, locale: string): EventText {
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

/** A page's deadlines on one day, as an all-day event on the day they close. */
export function deadlineEvent(
  entry: CalendarEntry,
  page: EventPage,
  text: EventText,
): Omit<CalendarEvent, 'uid'> {
  return {
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
