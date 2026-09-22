import type {Deadline} from '@site/src/data/homepage/types';

export type DeadlineStatus =
  | {kind: 'open'}
  | {kind: 'closing'; days: number}
  | {kind: 'opening'; days: number}
  | {kind: 'closed'}
  | {kind: 'date'};

/** Days from one date to another, counted in whole UTC days. */
export function daysUntil(from: Date, iso: string): number {
  const target = Date.parse(`${iso}T00:00:00Z`);
  const start = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
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
