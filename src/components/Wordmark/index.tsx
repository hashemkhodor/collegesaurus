import type {ReactNode} from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

// The logo's two-tone name as live text, in the closest web font to the artwork.
export default function Wordmark({className}: {className?: string}): ReactNode {
  return (
    <b className={clsx(styles.wordmark, className)} dir="ltr">
      College<span className={styles.saurus}>saurus</span>
    </b>
  );
}
