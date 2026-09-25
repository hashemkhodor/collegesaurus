/**
 * Floating chat bubble pinned bottom-right on every page. Click toggles a
 * panel that iframes the Collegesaurus AI chat page in embed mode.
 *
 * The iframe URL is read from `siteConfig.customFields.chatUrl` so a local
 * chat server and the production one can be swapped without touching this
 * component. The chat is told the site language, the page it was opened on
 * (so "what's the tuition?" means this university) and the colour theme.
 */
import {useEffect, useRef, useState, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import clsx from 'clsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

type CustomFields = {
  chatUrl?: string;
};

const LABELS: Record<string, string> = {
  ar: 'اسأل الآن',
};
const DEFAULT_LABEL = 'Ask AI';
// Matches the full-screen breakpoint in styles.module.css: phones, held
// either way up.
const PHONE = '(max-width: 640px), (max-height: 500px)';

function Panel(): ReactNode {
  const {siteConfig, i18n} = useDocusaurusContext();
  const chatUrl =
    (siteConfig.customFields as CustomFields)?.chatUrl || 'https://collegesaurus-ai.fly.dev';
  const [open, setOpen] = useState(false);
  const [attention, setAttention] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const logo = useBaseUrl('/img/logo.svg');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Phones: the panel is full screen. Lock the page behind it so scrolling
  // the chat never scrolls the site, and keep the panel exactly the size of
  // the visible area so the keyboard can't slide the page around beneath it.
  useEffect(() => {
    if (!open || !window.matchMedia(PHONE).matches) return;
    const root = document.documentElement;
    const saved = [root.style.overflow, root.style.overscrollBehavior, document.body.style.overflow];
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    const viewport = window.visualViewport;
    const fit = () => {
      const panel = panelRef.current;
      if (!panel || !viewport) return;
      panel.style.top = `${viewport.offsetTop}px`;
      panel.style.height = `${viewport.height}px`;
    };
    fit();
    viewport?.addEventListener('resize', fit);
    viewport?.addEventListener('scroll', fit);
    return () => {
      [root.style.overflow, root.style.overscrollBehavior, document.body.style.overflow] = saved;
      viewport?.removeEventListener('resize', fit);
      viewport?.removeEventListener('scroll', fit);
    };
  }, [open]);

  // Pulse for the first 8 seconds so visitors notice the button exists,
  // then settle down. Stop immediately on first click either way.
  useEffect(() => {
    const id = window.setTimeout(() => setAttention(false), 8000);
    return () => window.clearTimeout(id);
  }, []);

  const label = LABELS[i18n.currentLocale] || DEFAULT_LABEL;

  // Captured once per opening: the bubble stays mounted while the visitor
  // moves between pages, and a changing iframe URL would reload the chat.
  const [opened, setOpened] = useState({page: '', theme: 'light'});
  const embedUrl = chatEmbedUrl(chatUrl, {lang: i18n.currentLocale, ...opened});

  const handleToggle = () => {
    setAttention(false);
    if (!open) {
      setOpened({
        page: window.location.pathname,
        theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label="Collegesaurus AI chat">
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              <img className={styles.panelLogo} src={logo} alt="" width={28} height={28} />
              Collegesaurus AI
            </span>
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

function chatEmbedUrl(
  chatUrl: string,
  params: {lang: string; page: string; theme: string},
): string {
  let url: URL;
  try {
    url = new URL(chatUrl);
  } catch {
    return chatUrl;
  }
  if (!url.searchParams.has('embed')) {
    url.searchParams.set('embed', 'true');
  }
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export default function ChatBubble(): ReactNode {
  // BrowserOnly because the iframe + window.addEventListener aren't safe
  // under SSR (Docusaurus renders every page statically at build time).
  return <BrowserOnly>{() => <Panel />}</BrowserOnly>;
}
