/**
 * Floating chat bubble pinned bottom-right on every page. Click toggles a
 * panel that iframes the Collegesaurus AI Streamlit app in embed mode.
 *
 * The iframe URL is read from `siteConfig.customFields.chatUrl` so the dev
 * value (localhost:8501) and the eventual Streamlit Cloud URL can be swapped
 * without touching this component.
 */
import {useEffect, useState, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

type CustomFields = {
  chatUrl?: string;
};

const LABELS: Record<string, string> = {
  ar: 'اسأل الآن',
};
const DEFAULT_LABEL = 'Ask AI';

function Panel(): ReactNode {
  const {siteConfig, i18n} = useDocusaurusContext();
  const chatUrl =
    (siteConfig.customFields as CustomFields)?.chatUrl ||
    'https://collegesaurus-ai.streamlit.app';
  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Pulse for the first 8 seconds so visitors notice the button exists,
  // then settle down. Stop immediately on first click either way.
  useEffect(() => {
    const id = window.setTimeout(() => setAttention(false), 8000);
    return () => window.clearTimeout(id);
  }, []);

  const label = LABELS[i18n.currentLocale] || DEFAULT_LABEL;

  const embedUrl = chatUrl.includes('embed=')
    ? chatUrl
    : `${chatUrl}${chatUrl.includes('?') ? '&' : '?'}embed=true`;

  const handleToggle = () => {
    setAttention(false);
    setOpen((v) => !v);
  };

  return (
    <>
      {open && (
        <div
          className={styles.panel}
          role="dialog"
          aria-label="Collegesaurus AI chat">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Collegesaurus AI</span>
            <button
              className={styles.closeButton}
              onClick={() => setOpen(false)}
              aria-label="Close chat">
              ×
            </button>
          </div>
          <iframe
            src={embedUrl}
            title="Collegesaurus AI"
            className={styles.iframe}
            allow="clipboard-write"
          />
        </div>
      )}
      <button
        className={clsx(
          styles.bubble,
          open ? styles.bubbleOpen : styles.bubbleClosed,
          attention && !open && styles.bubbleAttention,
        )}
        onClick={handleToggle}
        aria-label={open ? 'Close chat' : label}
        aria-expanded={open}>
        {open ? (
          <span aria-hidden="true">×</span>
        ) : (
          <>
            <span className={styles.bubbleIcon} aria-hidden="true">
              💬
            </span>
            <span className={styles.bubbleLabel}>{label}</span>
          </>
        )}
      </button>
    </>
  );
}

export default function ChatBubble(): ReactNode {
  // BrowserOnly because the iframe + window.addEventListener aren't safe
  // under SSR (Docusaurus renders every page statically at build time).
  return <BrowserOnly>{() => <Panel />}</BrowserOnly>;
}
