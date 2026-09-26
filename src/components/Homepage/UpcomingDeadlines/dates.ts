/**
 * Formats YYYY-MM-DD dates for the current locale. The date names a calendar
 * day, not an instant, so it is formatted in UTC: in the reader's own zone,
 * midnight UTC is the day before anywhere west of Greenwich.
 */
export function dayFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): (iso: string) => string {
  // Arabic pages use Levantine month names, which ar-LB gives; Latin digits
  // keep the dates consistent with the tables on the content pages.
  const format = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : locale, {
    ...options,
    numberingSystem: 'latn',
    timeZone: 'UTC',
  });
  return (iso) => format.format(new Date(`${iso}T00:00:00Z`));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The YYYY-MM month of a YYYY-MM-DD date. */
export const monthOf = (iso: string): string => iso.slice(0, 7);

/** The day after a YYYY-MM-DD date. */
export function nextDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** The month `count` months after `month`, or before it when negative. */
export function addMonths(month: string, count: number): string {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const total = year * 12 + index - 1 + count;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

export function clampMonth(month: string, first: string, last: string): string {
  if (month < first) {
    return first;
  }
  return month > last ? last : month;
}

/**
 * The weeks of a month, Monday first as Lebanese calendars are, with null
 * for the days that belong to the months either side.
 */
export function weeksOf(month: string): (string | null)[][] {
  const [year, index] = month.split('-').map(Number) as [number, number];
  const lead = (new Date(Date.UTC(year, index - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const days: (string | null)[] = [
    ...Array.from({length: lead}, () => null),
    ...Array.from({length}, (_, day) => `${month}-${pad(day + 1)}`),
  ];
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return Array.from({length: days.length / 7}, (_, week) =>
    days.slice(week * 7, week * 7 + 7),
  );
}
