import {useMemo} from 'react';
import {translate} from '@docusaurus/Translate';
import type {HomeDoc} from '@site/plugins/homepage-data/types';
import {deadlines} from '@site/src/data/homepage/deadlines';
import {findDoc, useHomepageData, useNow} from '../hooks';
import {calendarEntries, type CalendarEntry} from './entries';
import {beirutDay} from './status';

export type DeadlineRow = {entry: CalendarEntry; doc: HomeDoc};

/**
 * The landing page's deadlines, shared by the card in the top row and the
 * calendar below it so the two always agree: the pages' own rows merged with
 * the hand-kept list, resolved to their pages, soonest first.
 */
export function useDeadlines() {
  const data = useHomepageData();
  const now = useNow();
  const rows = useMemo(
    () =>
      calendarEntries(data.deadlines, deadlines(translate)).flatMap((entry): DeadlineRow[] => {
        const doc = findDoc(data, entry.ref);
        return doc ? [{entry, doc}] : [];
      }),
    [data],
  );

  // Until mount there is no clock, so the build's day stands in and the server
  // and the first client render agree. Then the reader's day takes over.
  const built = beirutDay(new Date(data.generatedAt));
  const today = now ? beirutDay(now) : null;
  const anchor = today ?? built;

  return {
    now,
    today,
    anchor,
    upcoming: rows.filter((row) => row.entry.closes >= anchor),
    /** Checked against the build's day, so both renders make the same call. */
    anythingAtBuild: rows.some((row) => row.entry.closes >= built),
  };
}
