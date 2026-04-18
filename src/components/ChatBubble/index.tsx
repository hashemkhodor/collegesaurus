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
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

type CustomFields = {
  chatUrl?: string;
};

function Panel(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const chatUrl =
    (siteConfig.customFields as CustomFields)?.chatUrl ||
    'https://collegesaurus-ai.streamlit.app';
  const [open, setOpen] = useState(false);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Streamlit hides its chrome when `?embed=true` is appended.
  const embedUrl = chatUrl.includes('embed=')
    ? chatUrl
    : `${chatUrl}${chatUrl.includes('?') ? '&' : '?'}embed=true`;

  return (
    <>
      {open && (
        <div
          className={styles.panel}
          role="dialog"
          aria-label="Collegesaurus AI chat">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>🦕 Collegesaurus AI</span>
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
        className={styles.bubble}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}>
        {open ? '×' : '🦕'}
      </button>
    </>
  );
}

export default function ChatBubble(): ReactNode {
  // BrowserOnly because the iframe + window.addEventListener aren't safe
  // under SSR (Docusaurus renders every page statically at build time).
  return <BrowserOnly>{() => <Panel />}</BrowserOnly>;
}
