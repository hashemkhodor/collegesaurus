import type {HomeDeadline} from '@site/plugins/homepage-data/types';
import type {Deadline, DocRef} from '@site/src/data/homepage/types';

export type Kind = HomeDeadline['kind'];

/** One university's or scholarship's deadlines on one day: a card in the list. */
export type CalendarEntry = {
  ref: DocRef;
  closes: string;
  /** The earliest opening date, or null unless every round has one. */
  opens: string | null;
  kinds: Kind[];
  rounds: string[];
};

const KINDS: Kind[] = ['application', 'scholarship'];
const key = (ref: DocRef, closes: string) => `${ref.plugin}/${ref.id}/${closes}`;

/**
 * Merges the rows read from the pages with the hand-kept list, and groups them
 * by page and day, soonest first. The pages are the source of truth: a
 * hand-kept deadline they already list is dropped, and the rest fill the
 * gaps, such as scholarships whose pages give dates without a year.
 */
export function calendarEntries(
  rows: HomeDeadline[],
  kept: Deadline[],
): CalendarEntry[] {
  const listed = new Set(rows.map((row) => key(row.ref, row.closes)));
  const all: HomeDeadline[] = [
    ...rows,
    ...kept
      .filter((deadline) => !listed.has(key(deadline.ref, deadline.closes)))
      .map((deadline) => ({
        ref: deadline.ref,
        title: deadline.title,
        opens: deadline.opens ?? null,
        closes: deadline.closes,
        kind:
          deadline.ref.plugin === 'scholarships'
            ? ('scholarship' as const)
            : ('application' as const),
      })),
  ];

  const groups = new Map<string, HomeDeadline[]>();
  for (const row of all) {
    const group = groups.get(key(row.ref, row.closes));
    if (group) {
      group.push(row);
    } else {
      groups.set(key(row.ref, row.closes), [row]);
    }
  }

  const order = (entry: CalendarEntry) =>
    `${entry.closes}/${entry.ref.plugin === 'universities' ? 0 : 1}/${entry.ref.id}`;
  return [...groups.values()]
    .map((group) => {
      const opens = group.map((row) => row.opens);
      return {
        ref: group[0]!.ref,
        closes: group[0]!.closes,
        opens: opens.every(Boolean) ? (opens as string[]).sort()[0]! : null,
        kinds: KINDS.filter((kind) => group.some((row) => row.kind === kind)),
        rounds: group.map((row) => row.title),
      };
    })
    .sort((a, b) => order(a).localeCompare(order(b)));
}

/** Names a deadline's own calendar file and its UID: section, page and day. */
export function entrySlug(entry: CalendarEntry): string {
  return `${entry.ref.plugin}-${entry.ref.id}-${entry.closes}`;
}

/** The calendar files the build publishes under each language's base URL. */
export const FEED_PATH = 'deadlines.ics';
export const eventPath = (entry: CalendarEntry) => `deadlines/${entrySlug(entry)}.ics`;
