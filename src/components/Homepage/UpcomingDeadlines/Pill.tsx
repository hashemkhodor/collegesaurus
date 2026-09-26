import type {ReactNode} from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import {usePluralForm} from '@docusaurus/theme-common';
import type {CalendarEntry} from './entries';
import type {DateFormats} from './formats';
import {deadlineStatus} from './status';
import styles from './Pill.module.css';

/** Where a deadline stands: open, closing in N days, opening in N days, or its date. */
export default function Pill({
  entry,
  now,
  formats,
}: {
  entry: CalendarEntry;
  now: Date | null;
  formats: DateFormats;
}): ReactNode {
  const {selectMessage} = usePluralForm();

  // Before hydration there is no clock, so every row shows its closing date;
  // the relative wording arrives with the first client render after mount.
  const status = now
    ? deadlineStatus({opens: entry.opens ?? undefined, closes: entry.closes}, now)
    : {kind: 'date' as const};

  if (status.kind === 'open') {
    return (
      <span className={clsx(styles.pill, styles.open)}>
        <Translate id="homepage.deadlines.open">Open now</Translate>
      </span>
    );
  }
  if (status.kind === 'closing' && status.days === 0) {
    return (
      <span className={clsx(styles.pill, styles.soon)}>
        <Translate id="homepage.deadlines.closesToday">Closes today</Translate>
      </span>
    );
  }
  if (status.kind === 'closing') {
    return (
      <span className={clsx(styles.pill, styles.soon)}>
        {selectMessage(
          status.days,
          translate(
            {
              id: 'homepage.deadlines.closing',
              message: '{count} day left|{count} days left',
              description: 'Days until a deadline closes, by plural form',
            },
            {count: status.days},
          ),
        )}
      </span>
    );
  }
  if (status.kind === 'opening') {
    return (
      <span className={clsx(styles.pill, styles.neutral)}>
        {selectMessage(
          status.days,
          translate(
            {
              id: 'homepage.deadlines.opening',
              message: 'Opens in {count} day|Opens in {count} days',
              description: 'Days until a deadline opens, by plural form',
            },
            {count: status.days},
          ),
        )}
      </span>
    );
  }
  if (status.kind === 'closed') {
    return (
      <span className={clsx(styles.pill, styles.neutral)}>
        <Translate id="homepage.deadlines.closed">Closed</Translate>
      </span>
    );
  }
  return (
    <span className={clsx(styles.pill, styles.neutral)} suppressHydrationWarning>
      <Translate id="homepage.deadlines.closes" values={{date: formats.short(entry.closes)}}>
        {'Closes {date}'}
      </Translate>
    </span>
  );
}
