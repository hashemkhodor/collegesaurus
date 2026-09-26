import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import Icon, {type IconName} from '../../Homepage/ui/Icon';
import styles from './styles.module.css';

/** A link styled as a button: `primary` is the solid green pill, `soft` the tinted one. */
export default function Button({
  to,
  variant = 'primary',
  icon,
  children,
}: {
  to: string;
  variant?: 'primary' | 'soft';
  icon?: IconName;
  children: ReactNode;
}): ReactNode {
  const external = /^https?:/.test(to);
  return (
    <Link to={to} className={clsx(styles.button, styles[variant])}>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {external && (
        <>
          <Icon name="arrowUpRight" size={16} className={styles.external} />
          <span className={styles.visuallyHidden}>
            {' '}
            <Translate id="button.newTab">(opens in a new tab)</Translate>
          </span>
        </>
      )}
    </Link>
  );
}
