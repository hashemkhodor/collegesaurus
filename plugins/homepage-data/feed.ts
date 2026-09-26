import {
  entrySlug,
  eventPath,
  FEED_PATH,
  type CalendarEntry,
} from '../../src/components/Homepage/UpcomingDeadlines/entries.ts';
import {
  deadlineEvent,
  type EventPage,
  type EventText,
} from '../../src/components/Homepage/UpcomingDeadlines/event.ts';
import {calendarFeed, eventFile, URL_NAMESPACE, uuid5} from './ical.ts';

export type CalendarFile = {path: string; content: string};

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
  page: (ref: CalendarEntry['ref']) => EventPage | undefined;
  text: EventText;
  site: string;
  stamp: Date;
}): CalendarFile[] {
  const events = entries.flatMap((entry) => {
    const found = page(entry.ref);
    if (!found) {
      return [];
    }
    // Named after the site's address for the deadline rather than the page's,
    // so the UID is the same in every language.
    const uid = uuid5(URL_NAMESPACE, `${site}/deadlines/${entrySlug(entry)}`);
    return [{entry, event: {uid, ...deadlineEvent(entry, found, text)}}];
  });
  return [
    {
      path: FEED_PATH,
      content: calendarFeed({name: text.calendar, events: events.map(({event}) => event)}, stamp),
    },
    ...events.map(({entry, event}) => ({path: eventPath(entry), content: eventFile(event, stamp)})),
  ];
}
