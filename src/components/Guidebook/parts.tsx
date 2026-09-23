import {useLayoutEffect, useEffect, useState, type ReactNode, type RefObject} from 'react';
import Icon, {type IconName} from '@site/src/components/Homepage/ui/Icon';
import type {DeadlineStatus} from '@site/src/components/Homepage/UpcomingDeadlines/status';
import {formatDate, type GuideStrings} from './strings';

export const SECTION_LOOK: Record<string, [IconName, string]> = {
  faculty: ['cap', 'green'],
  application: ['calendar', 'blue'],
  tuition: ['wallet', 'orange'],
  scholarships: ['star', 'purple'],
  requirements: ['shieldCheck', 'green'],
  contacts: ['mail', 'blue'],
  overview: ['info', 'blue'],
  grades: ['shieldCheck', 'green'],
  window: ['calendar', 'blue'],
  universities: ['university', 'purple'],
  benefits: ['star', 'orange'],
  recipients: ['mail', 'blue'],
};

export const REVEAL = 'guidebook:reveal';

/** Opens collapsed content when find-in-page or a link needs what it hides. */
export function useRevealListener(ref: RefObject<HTMLElement | null>, open: () => void): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    el.addEventListener('beforematch', open);
    el.addEventListener(REVEAL, open);
    return () => {
      el.removeEventListener('beforematch', open);
      el.removeEventListener(REVEAL, open);
    };
  }, [ref, open]);
}

export function Chip({name, tint, round}: {name: IconName; tint: string; round?: boolean}): ReactNode {
  return (
    <span className={`chip tint-${tint}${round ? ' round' : ''}`}>
      <Icon name={name} size={18} className="icon" />
    </span>
  );
}

export function Ext({size = 16}: {size?: number}): ReactNode {
  return <Icon name="arrowUpRight" size={size} className="icon flip" />;
}

export function ExtLink({href, className, children}: {href: string; className?: string; children: ReactNode}): ReactNode {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** Fills a string template's `{}` slot with a node, e.g. an isolated host name. */
export function fill(make: (slot: string) => string, node: ReactNode): ReactNode {
  const [before, after] = make('\u0000').split('\u0000');
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}

// An English aside in an Arabic heading otherwise loses its brackets when the line wraps.
export function isolateLatin(value: string, locale: string): ReactNode {
  if (locale !== 'ar') return value;
  const parts = value.split(/(\([A-Za-z][^()]*\))/);
  return parts.map((part, i) =>
    i % 2 ? (
      <bdi key={i} dir="ltr">
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

export function StatusPill({status, closes, s, locale}: {status: DeadlineStatus; closes: string; s: GuideStrings; locale: string}): ReactNode {
  const [cls, label] =
    status.kind === 'open'
      ? ['pill-open', s.open]
      : status.kind === 'closing'
        ? ['pill-soon', s.closing(status.days)]
        : status.kind === 'opening'
          ? ['pill-neutral', s.opening(status.days)]
          : status.kind === 'closed'
            ? ['pill-neutral', s.closed]
            : ['pill-neutral', s.closes(formatDate(closes, locale))];
  return <span className={`pill ${cls}`}>{label}</span>;
}

/** The current date, only after mount: statuses must not differ between build and visit. */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now;
}

/**
 * Collapsed content ships with plain `hidden`; on the client it becomes
 * `hidden="until-found"` so find-in-page can still reach it. React 19 only
 * knows `hidden` as a boolean, hence the attribute is set by hand.
 */
export function useCollapsible(ref: RefObject<HTMLElement | null>, collapsed: boolean, open: () => void): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (collapsed) el.setAttribute('hidden', 'until-found');
    else el.removeAttribute('hidden');
  }, [ref, collapsed]);
  useRevealListener(ref, open);
}

export function MoreButton({
  expanded,
  onClick,
  more,
  fewer,
  controls,
}: {
  expanded: boolean;
  onClick: () => void;
  more: string;
  fewer: string;
  controls?: string;
}): ReactNode {
  return (
    <button className="more-btn" type="button" aria-expanded={expanded} aria-controls={controls} onClick={onClick}>
      <span>{expanded ? fewer : more}</span>
      <Icon name="chevronDown" size={18} className="icon" />
    </button>
  );
}
