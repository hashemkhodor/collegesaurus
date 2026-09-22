import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Icon, {type IconName} from './Icon';
import styles from './ui.module.css';

export {default as Icon} from './Icon';
export type {IconName} from './Icon';

export type Tint = 'green' | 'purple' | 'orange' | 'blue';

export function IconChip({
  icon,
  tint,
  size = 44,
  shape = 'circle',
}: {
  icon: IconName;
  tint: Tint;
  size?: number;
  shape?: 'circle' | 'square';
}): ReactNode {
  return (
    <span
      className={clsx(
        styles.chip,
        styles[tint],
        shape === 'square' && styles.chipSquare,
      )}
      style={{width: size, height: size}}>
      <Icon name={icon} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function ArrowLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}): ReactNode {
  return (
    <Link to={to} className={styles.arrowLink}>
      {children}
      <Icon name="arrowRight" size={16} className={styles.arrow} />
    </Link>
  );
}

export function Accent({
  children,
  underline = false,
}: {
  children: ReactNode;
  underline?: boolean;
}): ReactNode {
  return (
    <span className={clsx(styles.accent, underline && styles.underline)}>
      {children}
    </span>
  );
}
