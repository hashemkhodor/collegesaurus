/**
 * Floating "Apply Now" button pinned bottom-left on any page that sets
 * `apply_url` in its frontmatter. Mirrors the ChatBubble's bottom-right
 * position so the two don't overlap.
 *
 * Wiring: src/theme/DocItem/Layout.tsx reads the current doc's frontmatter
 * via useDoc() and mounts <FloatingApplyButton href={apply_url} /> when
 * present. Pages without `apply_url` render nothing.
 */
import {useEffect, useState, type ReactNode} from 'react';
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

/**
 * Docusaurus toggles the sidebar between ~300px and ~30px by animating the
 * container element's width directly; the `--doc-sidebar-width` CSS var stays
 * put. Track the real width with ResizeObserver so this button follows the
 * sidebar in/out without overlapping or leaving empty space.
 */
function useSidebarOffset(): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>(
      '.theme-doc-sidebar-container',
    );
    if (!sidebar) return;
    const measure = () => setOffset(sidebar.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sidebar);
    return () => ro.disconnect();
  }, []);
  return offset;
}

function Button({href, label}: Props): ReactNode {
  const {i18n} = useDocusaurusContext();
  const text = label ?? LABELS[i18n.currentLocale] ?? LABELS.en;
  const sidebarWidth = useSidebarOffset();
  return (
    <a
      className={styles.button}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text}
      style={{insetInlineStart: `calc(${sidebarWidth}px + 1.25rem)`}}>
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
