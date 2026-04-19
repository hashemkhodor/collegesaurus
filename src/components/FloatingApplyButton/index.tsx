/**
 * Floating "Apply Now" button pinned bottom-left on any page that sets
 * `apply_url` in its frontmatter. Mirrors the ChatBubble's bottom-right
 * position so the two don't overlap.
 *
 * Wiring: src/theme/DocItem/Layout.tsx reads the current doc's frontmatter
 * via useDoc() and mounts <FloatingApplyButton href={apply_url} /> when
 * present. Pages without `apply_url` render nothing.
 */
import type {ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

type Props = {
  href: string;
  label?: string;
};

const LABELS: Record<string, string> = {
  en: 'Apply Now',
  ar: 'قدّم الآن',
};

function Button({href, label}: Props): ReactNode {
  const {i18n} = useDocusaurusContext();
  const text = label ?? LABELS[i18n.currentLocale] ?? LABELS.en;
  return (
    <a
      className={styles.button}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text}>
      <span className={styles.icon} aria-hidden="true">
        🎓
      </span>
      <span className={styles.label}>{text}</span>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </a>
  );
}

export default function FloatingApplyButton(props: Props): ReactNode {
  return <BrowserOnly>{() => <Button {...props} />}</BrowserOnly>;
}
