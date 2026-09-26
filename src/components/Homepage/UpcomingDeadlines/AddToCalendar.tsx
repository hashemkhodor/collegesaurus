import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import Icon from '../ui/Icon';
import ui from '../ui/ui.module.css';
import styles from './AddToCalendar.module.css';

/** One way into a calendar app: a link, or an address to copy. */
export type CalendarOption = {
  key: string;
  label: string;
  hint?: string;
} & ({href: string; newTab?: boolean; download?: boolean} | {copy: string});

function copyText(text: string): Promise<void> {
  // Missing outside secure contexts, and in some in-app browsers.
  return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject();
}

/**
 * A button with a menu of calendar apps. A mouse opens it by hovering, a tap
 * or a key by pressing it; Escape, a tap elsewhere or moving on closes it.
 * The menu opens upwards when there is more room there than below.
 */
export default function AddToCalendar({
  label,
  accessibleLabel,
  options,
  intro,
  note,
  compact = false,
  className,
}: {
  label: string;
  accessibleLabel?: string;
  options: CalendarOption[];
  intro?: string;
  note?: string;
  compact?: boolean;
  className?: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [copy, setCopy] = useState<'copied' | 'failed' | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const place = () => {
    if (!button.current || !menu.current) {
      return;
    }
    const box = button.current.getBoundingClientRect();
    const below = window.innerHeight - box.bottom;
    setUp(below < menu.current.offsetHeight + 16 && box.top > below);
  };

  const copied = translate({
    id: 'homepage.deadlines.copied',
    message: 'Copied',
    description: "In place of \"Copy the link\" once the calendar's address is copied",
  });

  return (
    <div
      ref={root}
      className={clsx(
        styles.dropdown,
        open && styles.open,
        up && styles.up,
        compact && styles.compact,
        className,
      )}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') {
          place();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          // The calendar lets go of a picked day on Escape; this one is ours.
          event.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}>
      <button
        ref={button}
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={id}
        aria-label={accessibleLabel}
        onClick={() => {
          if (!open) {
            place();
          }
          setOpen(!open);
        }}>
        <Icon name="calendarPlus" size={compact ? 16 : 18} />
        {label}
        <Icon name="chevronDown" size={14} className={styles.chevron} />
      </button>
      {/* Focusable, so a tap on its text keeps it open. */}
      <div ref={menu} id={id} className={styles.menu} tabIndex={-1}>
        {intro ? <p className={styles.intro}>{intro}</p> : null}
        <ul className={styles.options}>
          {options.map((option) => (
            <li key={option.key}>
              {'copy' in option ? (
                <button
                  type="button"
                  className={styles.option}
                  onClick={() =>
                    copyText(option.copy).then(
                      () => setCopy('copied'),
                      () => setCopy('failed'),
                    )
                  }>
                  <span className={styles.label}>{copy === 'copied' ? copied : option.label}</span>
                  <span className={clsx(styles.hint, copy === 'failed' && styles.address)}>
                    {copy === 'failed' ? option.copy : option.hint}
                  </span>
                </button>
              ) : (
                <a
                  className={styles.option}
                  href={option.href}
                  target={option.newTab ? '_blank' : undefined}
                  rel={option.newTab ? 'noopener noreferrer' : undefined}
                  download={option.download}
                  onClick={() => setOpen(false)}>
                  <span className={styles.label}>{option.label}</span>
                  {option.hint ? <span className={styles.hint}>{option.hint}</span> : null}
                </a>
              )}
            </li>
          ))}
        </ul>
        {note ? <p className={styles.note}>{note}</p> : null}
        <p className={ui.visuallyHidden} aria-live="polite">
          {copy === 'copied' ? copied : ''}
        </p>
      </div>
    </div>
  );
}
