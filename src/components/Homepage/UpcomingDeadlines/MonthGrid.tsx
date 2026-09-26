import {useCallback, useId, useRef, type ReactNode} from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import {usePluralForm} from '@docusaurus/theme-common';
import {Icon} from '../ui';
import ui from '../ui/ui.module.css';
import {kindClass} from './DatePage';
import {addMonths, weeksOf} from './dates';
import type {Kind} from './entries';
import type {DateFormats} from './formats';
import {useSwipe} from './useSwipe';
import styles from './MonthGrid.module.css';

export type DayMark = {count: number; kinds: Kind[]};

type Props = {
  month: string;
  first: string;
  last: string;
  onMonth: (month: string, direction: 1 | -1) => void;
  marks: Map<string, DayMark>;
  /** Days before this one have passed. */
  anchor: string;
  /** The reader's day, known only once mounted. */
  today: string | null;
  selected: string | null;
  onSelect: (day: string) => void;
  /** The day of the card under the pointer, lit up to match. */
  highlighted: string | null;
  /** Which way the last month change went, for the slide; 0 for none. */
  slide: 1 | -1 | 0;
  panelId: string;
  dayId: (day: string) => string;
  formats: DateFormats;
};

/**
 * A month of days as a table. Only deadline days are buttons, drawn as small
 * tear-off pages: this is a calendar to read, not a date picker, so there is
 * no arrow-key grid, just a short tab order through the days that matter.
 */
export default function MonthGrid({
  month,
  first,
  last,
  onMonth,
  marks,
  anchor,
  today,
  selected,
  onSelect,
  highlighted,
  slide,
  panelId,
  dayId,
  formats,
}: Props): ReactNode {
  const {selectMessage} = usePluralForm();
  const labelId = useId();
  const frame = useRef<HTMLDivElement>(null);

  const step = useCallback(
    (direction: 1 | -1) => {
      const target = addMonths(month, direction);
      if (target >= first && target <= last) {
        onMonth(target, direction);
      }
    },
    [month, first, last, onMonth],
  );
  useSwipe(frame, step);

  const dayLabel = (day: string, count: number) =>
    selectMessage(
      count,
      translate(
        {
          id: 'homepage.deadlines.dayLabel',
          message: '{date}: {count} deadline|{date}: {count} deadlines',
          description: 'A calendar day with deadlines, for screen readers, by plural form',
        },
        {date: formats.full(day), count},
      ),
    );

  const cell = (day: string) => {
    const mark = marks.get(day);
    const number = Number(day.slice(8));
    if (!mark) {
      return (
        <td key={day} aria-current={day === today ? 'date' : undefined}>
          <span
            className={clsx(
              styles.plain,
              day < anchor && styles.past,
              day === today && styles.today,
            )}>
            {number}
          </span>
        </td>
      );
    }
    return (
      <td key={day}>
        <button
          id={dayId(day)}
          type="button"
          className={clsx(
            styles.mark,
            kindClass(mark.kinds, styles),
            day === today && styles.today,
            day === highlighted && styles.highlighted,
          )}
          aria-pressed={day === selected}
          aria-controls={panelId}
          aria-current={day === today ? 'date' : undefined}
          aria-label={dayLabel(day, mark.count)}
          onClick={() => onSelect(day)}>
          <span className={styles.sheet} aria-hidden="true">
            <span className={styles.band} />
            <span className={styles.number}>{number}</span>
            {mark.count > 1 ? <span className={styles.count}>{mark.count}</span> : null}
          </span>
        </button>
      </td>
    );
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.nav}>
        <button
          type="button"
          className={clsx(styles.navButton, styles.previous)}
          aria-label={translate({
            id: 'homepage.deadlines.previousMonth',
            message: 'Previous month',
          })}
          aria-disabled={month <= first ? true : undefined}
          onClick={() => step(-1)}>
          <Icon name="chevronDown" size={20} />
        </button>
        <p id={labelId} className={styles.month} aria-live="polite" suppressHydrationWarning>
          {formats.month(`${month}-01`)}
        </p>
        <button
          type="button"
          className={clsx(styles.navButton, styles.next)}
          aria-label={translate({
            id: 'homepage.deadlines.nextMonth',
            message: 'Next month',
          })}
          aria-disabled={month >= last ? true : undefined}
          onClick={() => step(1)}>
          <Icon name="chevronDown" size={20} />
        </button>
      </div>

      <div ref={frame} className={styles.frame}>
        <table className={styles.table} aria-labelledby={labelId}>
          <thead>
            <tr>
              {formats.weekdays.map((weekday) => (
                <th key={weekday.long} scope="col">
                  <span aria-hidden="true" suppressHydrationWarning>
                    {weekday.short}
                  </span>
                  <span className={ui.visuallyHidden} suppressHydrationWarning>
                    {weekday.long}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            key={month}
            className={clsx(slide === 1 && styles.fromNext, slide === -1 && styles.fromPrevious)}>
            {weeksOf(month).map((week) => (
              <tr key={week.find(Boolean)}>
                {week.map((day, index) => (day ? cell(day) : <td key={`blank-${index}`} />))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
