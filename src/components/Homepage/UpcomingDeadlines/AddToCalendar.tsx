import {useId, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode} from 'react';
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

/**
 * A button and the panel it opens under it, as part of the page rather than a
 * menu over it. Escape closes the panel and returns to the button.
 */
export function useDisclosure() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      // The calendar lets go of a picked day on Escape; this one is ours.
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
    }
  };
  return {
    open,
    button: {
      ref: button,
      'aria-expanded': open,
      'aria-controls': open ? id : undefined,
      onClick: () => setOpen((value) => !value),
      onKeyDown,
    },
    panel: {id, onKeyDown},
  };
}

export function AddButton({
  label,
  compact = false,
  className,
  ...props
}: {label: string; compact?: boolean} & ComponentProps<'button'>): ReactNode {
  return (
    <button
      type="button"
      className={clsx(styles.button, compact && styles.compactButton, className)}
      {...props}>
      <Icon name="calendarPlus" size={compact ? 16 : 18} />
      {label}
      <Icon name="chevronDown" size={14} className={styles.chevron} />
    </button>
  );
}

function copyText(text: string): Promise<void> {
  // Missing outside secure contexts, and in some in-app browsers.
  return navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject();
}

export function CalendarOptions({
  id,
  onKeyDown,
  options,
  intro,
  note,
  compact = false,
  className,
}: {
  id: string;
  onKeyDown: (event: KeyboardEvent) => void;
  options: CalendarOption[];
  intro?: string;
  note?: string;
  compact?: boolean;
  className?: string;
}): ReactNode {
  const [copy, setCopy] = useState<'copied' | 'failed' | null>(null);
  const copied = translate({
    id: 'homepage.deadlines.copied',
    message: 'Copied',
    description: "In place of \"Copy the link\" once the calendar's address is copied",
  });
  return (
    <div
      id={id}
      className={clsx(styles.panel, compact && styles.compactPanel, className)}
      onKeyDown={onKeyDown}>
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
                download={option.download}>
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
  );
}
