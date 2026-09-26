import {useMemo} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {dayFormatter} from './dates';

// A week that starts on a Monday, to name the weekdays in calendar order.
const WEEK = [
  '2026-09-28',
  '2026-09-29',
  '2026-09-30',
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
];

export type DateFormats = ReturnType<typeof useDateFormats>;

/** The date formats of the deadlines section, in the page's locale. */
export function useDateFormats() {
  const {i18n} = useDocusaurusContext();
  const locale = i18n.currentLocale;
  return useMemo(() => {
    // Arabic has no short weekday names, and full ones don't fit a column.
    const weekday = dayFormatter(locale, {
      weekday: locale === 'ar' ? 'narrow' : 'short',
    });
    const weekdayName = dayFormatter(locale, {weekday: 'long'});
    return {
      /** "Oct 31" */
      short: dayFormatter(locale, {day: 'numeric', month: 'short'}),
      /** "Saturday, October 31" */
      day: dayFormatter(locale, {weekday: 'long', day: 'numeric', month: 'long'}),
      /** "Saturday, October 31, 2026" */
      full: dayFormatter(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      /** "October 2026" */
      month: dayFormatter(locale, {month: 'long', year: 'numeric'}),
      /** "October" */
      monthName: dayFormatter(locale, {month: 'long'}),
      /** "Oct", the band of a tear-off page */
      band: dayFormatter(locale, {month: 'short'}),
      weekdays: WEEK.map((iso) => ({short: weekday(iso), long: weekdayName(iso)})),
    };
  }, [locale]);
}
