import type {Deadline} from '@site/src/data/homepage/types';

export type DeadlineStatus =
  | {kind: 'open'}
  | {kind: 'closing'; days: number}
  | {kind: 'opening'; days: number}
  | {kind: 'closed'}
  | {kind: 'date'};

const BEIRUT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Beirut',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * The date in Beirut as YYYY-MM-DD. Deadlines are Lebanese days, so this is
 * what "today" means wherever the reader is; it also gives the build and the
 * browser the same answer for the same moment.
 */
export function beirutDay(date: Date): string {
  const part = (type: string) =>
    BEIRUT.formatToParts(date).find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Days from one moment to a date, counted in whole Beirut days. */
export function daysUntil(from: Date, iso: string): number {
  const target = Date.parse(`${iso}T00:00:00Z`);
  const start = Date.parse(`${beirutDay(from)}T00:00:00Z`);
  return Math.round((target - start) / 86_400_000);
}

/** A row counts as closing soon inside this many days. */
export const CLOSING_SOON_DAYS = 30;

export function deadlineStatus(
  deadline: Deadline,
  now: Date,
): DeadlineStatus {
  const toClose = daysUntil(now, deadline.closes);
  if (toClose < 0) {
    return {kind: 'closed'};
  }
  if (deadline.opens) {
    const toOpen = daysUntil(now, deadline.opens);
    if (toOpen > 0) {
      return {kind: 'opening', days: toOpen};
    }
  }
  if (toClose <= CLOSING_SOON_DAYS) {
    return {kind: 'closing', days: toClose};
  }
  // Without an opening date, saying "open now" would be a guess.
  return deadline.opens ? {kind: 'open'} : {kind: 'date'};
}
