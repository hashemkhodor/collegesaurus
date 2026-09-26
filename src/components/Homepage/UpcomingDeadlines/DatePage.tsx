import type {ReactNode} from 'react';
import clsx from 'clsx';
import type {Kind} from './entries';
import styles from './DatePage.module.css';

/** The band's colour says what closes: an application, a scholarship, or both. */
export function kindClass(kinds: Kind[], classes: {[name: string]: string}): string | undefined {
  if (kinds.length > 1) {
    return classes.mixed;
  }
  return kinds[0] === 'scholarship' ? classes.scholarship : undefined;
}

/** A desk calendar's tear-off page: the month on a coloured band, the day below. */
export default function DatePage({
  iso,
  kinds,
  month,
}: {
  iso: string;
  kinds: Kind[];
  /** The short month name, already in the page's locale. */
  month: string;
}): ReactNode {
  return (
    <time dateTime={iso} className={clsx(styles.page, kindClass(kinds, styles))}>
      <span className={styles.band} suppressHydrationWarning>
        {month}
      </span>
      <span className={styles.day}>{Number(iso.slice(8))}</span>
    </time>
  );
}
