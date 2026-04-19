import type {ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

type ApplyButtonProps = {
  href: string;
  label?: string;
};

const DEFAULT_LABELS: Record<string, string> = {
  en: 'Apply Now',
  ar: 'قدّم الآن',
};

export default function ApplyButton({href, label}: ApplyButtonProps): ReactNode {
  const {i18n} = useDocusaurusContext();
  const text = label ?? DEFAULT_LABELS[i18n.currentLocale] ?? DEFAULT_LABELS.en;
  return (
    <a
      className={`button button--primary button--lg ${styles.applyButton}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer">
      <span>{text}</span>
      <span className={styles.applyArrow} aria-hidden="true">
        →
      </span>
    </a>
  );
}
