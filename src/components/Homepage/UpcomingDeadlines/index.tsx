import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {usePluralForm} from '@docusaurus/theme-common';
import Heading from '@theme/Heading';
import type {HomeDoc} from '@site/plugins/homepage-data/types';
import {deadlines} from '@site/src/data/homepage/deadlines';
import {Icon} from '../ui';
import ui from '../ui/ui.module.css';
import {findDoc, useDocsEntry, useHomepageData, useNow} from '../hooks';
import DatePage from './DatePage';
import MonthGrid, {type DayMark} from './MonthGrid';
import {clampMonth, monthOf} from './dates';
import {calendarEntries, type CalendarEntry, type Kind} from './entries';
import {useDateFormats, type DateFormats} from './formats';
import {beirutDay, deadlineStatus} from './status';
import styles from './styles.module.css';

type Row = {entry: CalendarEntry; doc: HomeDoc};

const KINDS: Kind[] = ['application', 'scholarship'];

function Pill({
  entry,
  now,
  formats,
}: {
  entry: CalendarEntry;
  now: Date | null;
  formats: DateFormats;
}) {
  const {selectMessage} = usePluralForm();

  // Before hydration there is no clock, so every row shows its closing date;
  // the relative wording arrives with the first client render after mount.
  const status = now
    ? deadlineStatus({opens: entry.opens ?? undefined, closes: entry.closes}, now)
    : {kind: 'date' as const};

  if (status.kind === 'open') {
    return (
      <span className={clsx(styles.pill, styles.pillOpen)}>
        <Translate id="homepage.deadlines.open">Open now</Translate>
      </span>
    );
  }
  if (status.kind === 'closing' && status.days === 0) {
    return (
      <span className={clsx(styles.pill, styles.pillSoon)}>
        <Translate id="homepage.deadlines.closesToday">Closes today</Translate>
      </span>
    );
  }
  if (status.kind === 'closing') {
    return (
      <span className={clsx(styles.pill, styles.pillSoon)}>
        {selectMessage(
          status.days,
          translate(
            {
              id: 'homepage.deadlines.closing',
              message: '{count} day left|{count} days left',
              description: 'Days until a deadline closes, by plural form',
            },
            {count: status.days},
          ),
        )}
      </span>
    );
  }
  if (status.kind === 'opening') {
    return (
      <span className={clsx(styles.pill, styles.pillNeutral)}>
        {selectMessage(
          status.days,
          translate(
            {
              id: 'homepage.deadlines.opening',
              message: 'Opens in {count} day|Opens in {count} days',
              description: 'Days until a deadline opens, by plural form',
            },
            {count: status.days},
          ),
        )}
      </span>
    );
  }
  if (status.kind === 'closed') {
    return (
      <span className={clsx(styles.pill, styles.pillNeutral)}>
        <Translate id="homepage.deadlines.closed">Closed</Translate>
      </span>
    );
  }
  return (
    <span className={clsx(styles.pill, styles.pillNeutral)} suppressHydrationWarning>
      <Translate
        id="homepage.deadlines.closes"
        values={{date: formats.short(entry.closes)}}>
        {'Closes {date}'}
      </Translate>
    </span>
  );
}

function Card({
  row,
  now,
  formats,
  onPoint,
}: {
  row: Row;
  now: Date | null;
  formats: DateFormats;
  onPoint: (day: string | null) => void;
}) {
  const {selectMessage} = usePluralForm();
  const {entry, doc} = row;
  const shown = entry.rounds.slice(0, 2);
  const more = entry.rounds.length - shown.length;
  return (
    <li>
      <Link
        to={doc.permalink}
        className={styles.card}
        onPointerEnter={() => onPoint(entry.closes)}
        onPointerLeave={() => onPoint(null)}
        onFocus={() => onPoint(entry.closes)}
        onBlur={() => onPoint(null)}>
        <DatePage iso={entry.closes} kinds={entry.kinds} month={formats.band(entry.closes)} />
        <span className={styles.text}>
          <span className={styles.name}>{doc.shortName}</span>
          {shown.map((round, index) => (
            <span key={index} className={styles.round}>
              {round}
            </span>
          ))}
          {more > 0 ? (
            <span className={styles.round}>
              {selectMessage(
                more,
                translate(
                  {
                    id: 'homepage.deadlines.moreRounds',
                    message: 'and {count} more|and {count} more',
                    description:
                      'Under the first two rounds that close on the same day, by plural form',
                  },
                  {count: more},
                ),
              )}
            </span>
          ) : null}
        </span>
        <span className={styles.when}>
          <Pill entry={entry} now={now} formats={formats} />
        </span>
      </Link>
    </li>
  );
}

export default function UpcomingDeadlines(): ReactNode {
  const data = useHomepageData();
  const now = useNow();
  const universities = useDocsEntry('universities');
  const formats = useDateFormats();
  const {selectMessage} = usePluralForm();
  const [picked, setPicked] = useState<string | null>(null);
  const [slide, setSlide] = useState<1 | -1 | 0>(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const id = useId();
  const panelId = `${id}panel`;
  const listId = `${id}list`;
  const dayId = useCallback((day: string) => `${id}${day}`, [id]);

  // Until mount there is no clock, so the build's day stands in and the server
  // and the first client render agree. Then the reader's day takes over.
  const built = beirutDay(new Date(data.generatedAt));
  const today = now ? beirutDay(now) : null;
  const anchor = today ?? built;

  const rows = useMemo(
    () =>
      calendarEntries(data.deadlines, deadlines()).flatMap((entry): Row[] => {
        const doc = findDoc(data, entry.ref);
        return doc ? [{entry, doc}] : [];
      }),
    [data],
  );
  const upcoming = rows.filter((row) => row.entry.closes >= anchor);

  // It opens on the month of the next deadline, and goes no further back than
  // this month or further on than the last deadline.
  const first = monthOf(anchor);
  const lastRow = upcoming[upcoming.length - 1];
  const last = lastRow && monthOf(lastRow.entry.closes) > first ? monthOf(lastRow.entry.closes) : first;
  const month = clampMonth(
    picked ?? (upcoming[0] ? monthOf(upcoming[0].entry.closes) : first),
    first,
    last,
  );

  const marks = new Map<string, DayMark>();
  for (const {entry} of upcoming) {
    const mark = marks.get(entry.closes) ?? {count: 0, kinds: []};
    marks.set(entry.closes, {
      count: mark.count + 1,
      kinds: KINDS.filter((kind) => mark.kinds.includes(kind) || entry.kinds.includes(kind)),
    });
  }
  const day = selected && monthOf(selected) === month && marks.has(selected) ? selected : null;
  const onDay = upcoming.filter((row) => row.entry.closes === day);
  const inMonth = upcoming.some((row) => monthOf(row.entry.closes) === month);
  const next = upcoming.find((row) => monthOf(row.entry.closes) > month);
  const kinds = KINDS.filter((kind) => upcoming.some((row) => row.entry.kinds.includes(kind)));

  const changeMonth = useCallback((target: string, direction: 1 | -1) => {
    setPicked(target);
    setSlide(direction);
    setSelected(null);
  }, []);
  const pick = useCallback(
    (target: string) => setSelected((current) => (current === target ? null : target)),
    [],
  );

  // The picked day's deadlines open under the grid, which on a phone can be
  // below the fold.
  useEffect(() => {
    if (!day || !panel.current) {
      return;
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.current.scrollIntoView({block: 'nearest', behavior: still ? 'auto' : 'smooth'});
  }, [day]);

  // After "Next: …" turns the month, focus follows to that day.
  useEffect(() => {
    if (focusNext.current) {
      document.getElementById(dayId(focusNext.current))?.focus();
      focusNext.current = null;
    }
  });

  // Nothing upcoming when the site was built: no section, rather than an
  // empty calendar. Checked against the build's day so both renders agree.
  if (!rows.some((row) => row.entry.closes >= built)) {
    return null;
  }

  const close = (returnFocus: boolean) => {
    setSelected(null);
    if (returnFocus && day) {
      document.getElementById(dayId(day))?.focus();
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && day) {
      close(panel.current?.contains(document.activeElement) ?? false);
    }
  };
  const dayLabel = (target: string, count: number) =>
    selectMessage(
      count,
      translate(
        {
          id: 'homepage.deadlines.dayLabel',
          message: '{date}: {count} deadline|{date}: {count} deadlines',
          description: 'A calendar day with deadlines, for screen readers, by plural form',
        },
        {date: formats.full(target), count},
      ),
    );

  return (
    <section id="deadlines" className={clsx(ui.card, styles.section)} onKeyDown={onKeyDown}>
      <div className={styles.head}>
        <Heading as="h2" className={ui.cardTitle}>
          <Translate id="homepage.deadlines.title">Upcoming deadlines</Translate>
        </Heading>
        <ul className={styles.legend}>
          {kinds.map((kind) => (
            <li key={kind}>
              <span
                className={clsx(styles.swatch, kind === 'scholarship' && styles.swatchScholarship)}
                aria-hidden="true"
              />
              {kind === 'application' ? (
                <Translate id="homepage.deadlines.legendApplications">Applications</Translate>
              ) : (
                <Translate id="homepage.deadlines.legendScholarships">
                  Scholarships and aid
                </Translate>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.body}>
        <div className={styles.calendarPane}>
          <MonthGrid
            month={month}
            first={first}
            last={last}
            onMonth={changeMonth}
            marks={marks}
            anchor={anchor}
            today={today}
            selected={day}
            onSelect={pick}
            highlighted={highlighted}
            slide={slide}
            panelId={panelId}
            dayId={dayId}
            formats={formats}
          />
          <div ref={panel} id={panelId} className={styles.panel}>
            {day ? (
              <>
                <div className={styles.panelHead}>
                  <h3 className={styles.panelTitle} suppressHydrationWarning>
                    {translate(
                      {
                        id: 'homepage.deadlines.closingOn',
                        message: 'Closing on {date}',
                        description: 'Over the deadlines of the day picked in the calendar',
                      },
                      {date: formats.day(day)},
                    )}
                  </h3>
                  <button
                    type="button"
                    className={styles.close}
                    aria-label={translate({
                      id: 'homepage.deadlines.closeDay',
                      message: 'Close',
                      description: 'Closes the deadlines of the day picked in the calendar',
                    })}
                    onClick={() => close(true)}>
                    <Icon name="close" size={18} />
                  </button>
                </div>
                <ul className={styles.cards}>
                  {onDay.map((row) => (
                    <Card
                      key={`${row.entry.ref.plugin}-${row.entry.ref.id}`}
                      row={row}
                      now={now}
                      formats={formats}
                      onPoint={setHighlighted}
                    />
                  ))}
                </ul>
              </>
            ) : !inMonth ? (
              <p className={styles.quiet} suppressHydrationWarning>
                {translate(
                  {
                    id: 'homepage.deadlines.emptyMonth',
                    message: 'Nothing closes in {month}.',
                    description: 'Under the calendar when the month shown has no deadlines',
                  },
                  {month: formats.monthName(`${month}-01`)},
                )}
                {next ? (
                  <button
                    type="button"
                    className={styles.jump}
                    onClick={() => {
                      focusNext.current = next.entry.closes;
                      changeMonth(monthOf(next.entry.closes), 1);
                    }}>
                    {translate(
                      {
                        id: 'homepage.deadlines.nextDeadline',
                        message: 'Next: {date}',
                        description: 'Jumps the calendar to the next deadline',
                      },
                      {date: formats.short(next.entry.closes)},
                    )}
                  </button>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.listPane}>
          <h3 className={styles.listTitle}>
            <Translate id="homepage.deadlines.comingUp">Coming up</Translate>
          </h3>
          {upcoming.length > 0 ? (
            <ul id={listId} className={clsx(styles.cards, !expanded && styles.collapsed)}>
              {upcoming.map((row) => (
                <Card
                  key={`${row.entry.ref.plugin}-${row.entry.ref.id}-${row.entry.closes}`}
                  row={row}
                  now={now}
                  formats={formats}
                  onPoint={setHighlighted}
                />
              ))}
            </ul>
          ) : (
            <p className={styles.quiet}>
              <Translate id="homepage.deadlines.empty">No deadlines in the coming weeks.</Translate>{' '}
              <Link to={universities}>
                <Translate id="homepage.deadlines.emptyLink">
                  Each university page lists its application windows.
                </Translate>
              </Link>
            </p>
          )}
          {upcoming.length > 3 ? (
            <button
              type="button"
              className={styles.more}
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => setExpanded((open) => !open)}>
              {expanded
                ? translate({id: 'homepage.deadlines.showFewer', message: 'Show fewer'})
                : selectMessage(
                    upcoming.length,
                    translate(
                      {
                        id: 'homepage.deadlines.showAll',
                        message: 'Show all {count} deadline|Show all {count} deadlines',
                        description: 'Opens the whole list of upcoming deadlines, by plural form',
                      },
                      {count: upcoming.length},
                    ),
                  )}
            </button>
          ) : null}
        </div>
      </div>

      <p className={ui.visuallyHidden} aria-live="polite">
        {day ? dayLabel(day, onDay.length) : ''}
      </p>
    </section>
  );
}
