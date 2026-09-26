import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import {usePluralForm} from '@docusaurus/theme-common';
import Heading from '@theme/Heading';
import ui from '../ui/ui.module.css';
import {AddButton, CalendarOptions, useDisclosure} from './AddToCalendar';
import DatePage from './DatePage';
import MonthGrid, {type DayMark} from './MonthGrid';
import Pill from './Pill';
import {clampMonth, monthOf} from './dates';
import {entrySlug, type Kind} from './entries';
import {useDateFormats, type DateFormats} from './formats';
import {useCalendarLinks, type CalendarLinks} from './useCalendarLinks';
import {useDeadlines, type DeadlineRow} from './useDeadlines';
import styles from './Calendar.module.css';

const KINDS: Kind[] = ['application', 'scholarship'];
const ANCHOR = 'deadlines';

function Card({
  row,
  now,
  formats,
  links,
  onPoint,
}: {
  row: DeadlineRow;
  now: Date | null;
  formats: DateFormats;
  links: CalendarLinks;
  onPoint: (day: string | null) => void;
}) {
  const {selectMessage} = usePluralForm();
  const add = useDisclosure();
  const {entry, doc} = row;
  const shown = entry.rounds.slice(0, 2);
  const more = entry.rounds.length - shown.length;
  return (
    <li
      className={styles.card}
      onPointerEnter={() => onPoint(entry.closes)}
      onPointerLeave={() => onPoint(null)}
      onFocus={() => onPoint(entry.closes)}
      onBlur={() => onPoint(null)}>
      <DatePage iso={entry.closes} kinds={entry.kinds} month={formats.band(entry.closes)} />
      <div className={styles.text}>
        <Link to={doc.permalink} className={styles.name}>
          {doc.shortName}
        </Link>
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
                    'Under the first rounds that close on the same day, by plural form',
                },
                {count: more},
              ),
            )}
          </span>
        ) : null}
      </div>
      <div className={styles.when}>
        <Pill entry={entry} now={now} formats={formats} />
        <AddButton
          {...add.button}
          compact
          className={styles.above}
          label={translate({
            id: 'homepage.deadlines.addOne',
            message: 'Add',
            description: "On a deadline's card: opens the ways to add it to a calendar",
          })}
          aria-label={translate(
            {
              id: 'homepage.deadlines.addOneLabel',
              message: 'Add {name} to my calendar',
              description: "The card's Add button, for screen readers",
            },
            {name: doc.shortName},
          )}
        />
      </div>
      {add.open ? (
        <CalendarOptions
          {...add.panel}
          compact
          className={clsx(styles.above, styles.cardOptions)}
          options={links.event(row)}
          note={translate({
            id: 'homepage.deadlines.addOneNote',
            message: "A one-time copy: it won't change if the date does.",
            description: 'Under the ways to add one deadline to a calendar',
          })}
        />
      ) : null}
    </li>
  );
}

/**
 * The deadlines as a month to browse, under the top row. Deadline days are
 * small tear-off pages, and the month on display is listed beside the grid,
 * below it on a phone. Picking a day narrows that list to the day.
 */
export default function DeadlinesCalendar(): ReactNode {
  const brokenLinks = useBrokenLinks();
  const {now, today, anchor, upcoming, anythingAtBuild} = useDeadlines();
  const formats = useDateFormats();
  const links = useCalendarLinks();
  const subscribe = useDisclosure();
  const {selectMessage} = usePluralForm();
  const [picked, setPicked] = useState<string | null>(null);
  const [slide, setSlide] = useState<1 | -1 | 0>(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const pane = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const id = useId();
  const listId = `${id}list`;
  const dayId = useCallback((day: string) => `${id}${day}`, [id]);

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
  const inMonth = upcoming.filter((row) => monthOf(row.entry.closes) === month);
  const listed = day ? inMonth.filter((row) => row.entry.closes === day) : inMonth;
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

  // On a phone the list sits under the grid, so a picked day's deadlines can
  // land below the fold.
  useEffect(() => {
    if (!day || !pane.current) {
      return;
    }
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pane.current.scrollIntoView({block: 'nearest', behavior: still ? 'auto' : 'smooth'});
  }, [day]);

  // After "Next: …" turns the month, focus follows to that day.
  useEffect(() => {
    if (focusNext.current) {
      document.getElementById(dayId(focusNext.current))?.focus();
      focusNext.current = null;
    }
  });

  // Nothing upcoming when the site was built: no calendar, rather than an
  // empty one.
  if (!anythingAtBuild) {
    return null;
  }
  // The top row's card links here. A plain id, unlike a heading's, has to be
  // named to the build's link checker.
  brokenLinks.collectAnchor(ANCHOR);

  const showMonth = (returnFocus: boolean) => {
    setSelected(null);
    if (returnFocus && day) {
      document.getElementById(dayId(day))?.focus();
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && day) {
      showMonth(pane.current?.contains(document.activeElement) ?? false);
    }
  };
  const monthName = formats.monthName(`${month}-01`);
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
    <section id={ANCHOR} className={clsx(ui.card, styles.section)} onKeyDown={onKeyDown}>
      <div className={styles.head}>
        <Heading as="h2" className={ui.cardTitle}>
          <Translate id="homepage.deadlines.calendarTitle">Deadlines calendar</Translate>
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
            panelId={listId}
            dayId={dayId}
            formats={formats}
          />
          <div className={styles.subscribe}>
            <AddButton
              {...subscribe.button}
              className={styles.subscribeButton}
              label={translate({
                id: 'homepage.deadlines.addAll',
                message: 'Add all to my calendar',
                description: 'Under the calendar: opens the ways to subscribe to every deadline',
              })}
            />
            {subscribe.open ? (
              <CalendarOptions
                {...subscribe.panel}
                options={links.feed()}
                intro={translate({
                  id: 'homepage.deadlines.addAllIntro',
                  message: 'New and changed deadlines show up on their own.',
                  description: 'Over the ways to subscribe to every deadline',
                })}
              />
            ) : null}
          </div>
        </div>

        <div ref={pane} className={styles.listPane}>
          <div className={styles.paneHead}>
            <h3 className={styles.paneTitle} suppressHydrationWarning>
              {day
                ? translate(
                    {
                      id: 'homepage.deadlines.closingOn',
                      message: 'Closing on {date}',
                      description: 'Over the deadlines of the day picked in the calendar',
                    },
                    {date: formats.day(day)},
                  )
                : translate(
                    {
                      id: 'homepage.deadlines.inMonth',
                      message: 'In {month}',
                      description: 'Over the deadlines of the month shown in the calendar',
                    },
                    {month: monthName},
                  )}
            </h3>
            {day ? (
              <button type="button" className={styles.reset} onClick={() => showMonth(true)}>
                {translate(
                  {
                    id: 'homepage.deadlines.showMonth',
                    message: 'Show all of {month}',
                    description: 'Widens the list from the picked day back to its whole month',
                  },
                  {month: monthName},
                )}
              </button>
            ) : null}
          </div>

          {listed.length > 0 ? (
            <ul id={listId} className={styles.cards}>
              {listed.map((row) => (
                <Card
                  key={entrySlug(row.entry)}
                  row={row}
                  now={now}
                  formats={formats}
                  links={links}
                  onPoint={setHighlighted}
                />
              ))}
            </ul>
          ) : (
            <p id={listId} className={styles.quiet} suppressHydrationWarning>
              {translate(
                {
                  id: 'homepage.deadlines.emptyMonth',
                  message: 'Nothing closes in {month}.',
                  description: 'Beside the calendar when the month shown has no deadlines',
                },
                {month: monthName},
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
          )}
        </div>
      </div>

      <p className={ui.visuallyHidden} aria-live="polite">
        {day ? dayLabel(day, listed.length) : ''}
      </p>
    </section>
  );
}
