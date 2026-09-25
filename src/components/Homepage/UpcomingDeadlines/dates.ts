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
