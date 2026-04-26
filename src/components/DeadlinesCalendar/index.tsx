/**
 * Homepage section that surfaces upcoming application + scholarship deadlines.
 *
 * Uses Toast-UI Calendar (`@toast-ui/react-calendar`) for the month view.
 * Toast-UI doesn't ship its own toolbar, so we render a custom one above
 * the calendar with prev / today / next + a "Download for Google Calendar"
 * CTA that exports the .ics file. Per-event "+ Google" deep links live in
 * a companion agenda below the grid for one-click adding to Google Calendar.
 *
 * The calendar is mounted inside <BrowserOnly> because Toast-UI touches
 * DOM APIs at import time (mirrors the FloatingApplyButton pattern).
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useHistory} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate, {translate} from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import {
  deadlines,
  upcomingDeadlines,
  buildICS,
  googleCalendarUrl,
  KIND_COLOR,
  KIND_ICON,
  TUI_CALENDARS,
  type CalendarEvent,
  type Deadline,
  type DeadlineKind,
} from '@site/src/data/deadlines';
import styles from './styles.module.css';

// Top-level CSS import — Webpack collects this at build time. No SSR issue
// because CSS imports don't execute any JS at runtime.
import '@toast-ui/calendar/dist/toastui-calendar.min.css';

const LEGEND: Array<{kind: DeadlineKind; en: string; ar: string}> = [
  {kind: 'application',   en: 'Application',     ar: 'تقديم'},
  {kind: 'exam',          en: 'Entrance exam',   ar: 'امتحان قبول'},
  {kind: 'interview',     en: 'Interview',       ar: 'مقابلة'},
  {kind: 'decision',      en: 'Decision',        ar: 'قرار'},
  {kind: 'financial-aid', en: 'Financial aid',   ar: 'مساعدات مالية'},
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_AR = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
];

function formatMonthLabel(d: Date, locale: 'en' | 'ar'): string {
  const names = locale === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  return `${names[d.getMonth()]} ${d.getFullYear()}`;
}

function downloadICS(items: Deadline[]): void {
  const ics = buildICS(items);
  const blob = new Blob([ics], {type: 'text/calendar;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'collegesaurus-deadlines.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function CalendarInner(): ReactNode {
  const {i18n, siteConfig} = useDocusaurusContext();
  const isAr = i18n.currentLocale === 'ar';
  const history = useHistory();
  // Docusaurus's react-router history doesn't prepend baseUrl on push().
  // Build absolute paths ourselves with the configured baseUrl
  // (e.g. '/collegesaurus/'). Trim trailing slash so we don't double up.
  const baseUrl = siteConfig.baseUrl.replace(/\/$/, '');
  const navigateToDeadline = (
    source: 'university' | 'scholarship',
    slug: string,
  ) => {
    const seg = source === 'university' ? 'universities' : 'scholarships';
    history.push(`${baseUrl}/${seg}/${slug}`);
  };

  // Toast-UI Calendar references `window` at module load, so we can't
  // import it statically (would crash during Docusaurus SSR). Defer the
  // JS import to client-side via dynamic import in useEffect — the
  // well-tested pattern for window-touching ESM libraries inside
  // Docusaurus. (CSS is imported statically at the top of this file —
  // Webpack handles that at build time without touching window.)
  const [Calendar, setCalendar] = useState<any>(null);
  useEffect(() => {
    let mounted = true;
    // @ts-ignore — TUI's package.json `exports` hides its bundled types
    import('@toast-ui/react-calendar')
      .then((mod) => {
        if (!mounted) return;
        // ESM default export, with double-wrap fallback for some bundlers.
        const m = mod as any;
        const Cmp = m?.default?.default ?? m?.default ?? m;
        if (typeof Cmp === 'function' || typeof Cmp === 'object') {
          setCalendar(() => Cmp);
        } else {
          // eslint-disable-next-line no-console
          console.warn('Toast-UI Calendar load: unexpected module shape', mod);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Toast-UI Calendar dynamic import failed:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const events = useMemo(
    () => upcomingDeadlines(new Date(), isAr ? 'ar' : 'en'),
    [isAr],
  );
  const upcomingRecords = useMemo(
    () => deadlines.filter((d) => events.some((e) => e.id === d.id)),
    [events],
  );

  const calRef = useRef<any>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Anchor the calendar on the next month that has events when the data set
  // is mostly future-dated — feels nicer than landing on an empty April.
  useEffect(() => {
    if (events.length === 0) return;
    const firstEventDate = new Date(`${events[0].start}T00:00:00`);
    const inst = calRef.current?.getInstance?.();
    if (!inst) return;
    const today = new Date();
    if (firstEventDate.getTime() > today.getTime() + 14 * 24 * 3600 * 1000) {
      // First event is more than two weeks out — jump to it.
      inst.setDate(firstEventDate);
      setCurrentDate(firstEventDate);
    }
  }, [events]);

  const goPrev = () => {
    const inst = calRef.current?.getInstance?.();
    if (!inst) return;
    inst.prev();
    setCurrentDate(inst.getDate().toDate());
  };
  const goNext = () => {
    const inst = calRef.current?.getInstance?.();
    if (!inst) return;
    inst.next();
    setCurrentDate(inst.getDate().toDate());
  };
  const goToday = () => {
    const inst = calRef.current?.getInstance?.();
    if (!inst) return;
    inst.today();
    setCurrentDate(new Date());
  };

  return (
    <>
      <div className={styles.calendarToolbar}>
        <div className={styles.navGroup}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goToday}
            aria-label={isAr ? 'اليوم' : 'Today'}>
            {isAr ? 'اليوم' : 'Today'}
          </button>
          <button
            type="button"
            className={styles.navIconBtn}
            onClick={goPrev}
            aria-label={isAr ? 'الشهر السابق' : 'Previous month'}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            className={styles.navIconBtn}
            onClick={goNext}
            aria-label={isAr ? 'الشهر التالي' : 'Next month'}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className={styles.monthLabel}>
          {formatMonthLabel(currentDate, isAr ? 'ar' : 'en')}
        </div>
        <div className={styles.exportGroup}>
          <button
            type="button"
            className={styles.gcalSubscribe}
            onClick={() => downloadICS(upcomingRecords)}
            title={
              isAr
                ? 'تنزيل ملف .ics لاستيراده إلى Google Calendar أو Outlook أو Apple Calendar'
                : 'Download an .ics file you can import into Google Calendar, Outlook, or Apple Calendar'
            }>
            <svg className={styles.gcalIcon} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <rect x="3" y="4" width="18" height="17" rx="3" fill="currentColor" opacity="0.16"/>
              <rect x="3" y="4" width="18" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6"/>
              <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.6"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              <text x="12" y="17" fontSize="6" fontWeight="700" textAnchor="middle" fill="currentColor">G</text>
            </svg>
            <span>
              {isAr ? 'تنزيل لإضافته إلى Google Calendar' : 'Download for Google Calendar'}
            </span>
          </button>
          <a
            className={styles.icsHelp}
            href="https://support.google.com/calendar/answer/37118"
            target="_blank"
            rel="noopener noreferrer"
            title={isAr ? 'كيفية استيراد ملف .ics إلى Google Calendar' : 'How to import an .ics file into Google Calendar'}>
            {isAr ? 'كيف أستورده' : 'How to import'}
          </a>
        </div>
      </div>

      <div className={styles.calendarMount}>
        {Calendar ? (
        <Calendar
          ref={calRef}
          height="640px"
          view="month"
          calendars={TUI_CALENDARS}
          events={events as any}
          isReadOnly
          usageStatistics={false}
          month={{
            startDayOfWeek: 1,
            isAlways6Weeks: false,
            visibleEventCount: 5,
            dayNames: isAr
              ? ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
              : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
          }}
          theme={{
            common: {
              backgroundColor: 'transparent',
              border: '1px solid var(--ifm-color-emphasis-200)',
              today: {color: 'var(--ifm-color-primary)'},
              saturday: {color: 'var(--ifm-color-emphasis-600)'},
              holiday: {color: 'var(--ifm-color-emphasis-600)'},
              dayName: {color: 'var(--ifm-color-emphasis-700)'},
            },
            month: {
              dayName: {borderLeft: 'none', backgroundColor: 'transparent'},
              moreView: {boxShadow: '0 8px 24px rgba(0,0,0,0.16)'},
              moreViewTitle: {backgroundColor: 'var(--ifm-color-emphasis-100)'},
            },
          }}
          onClickEvent={({event}: any) => {
            const raw = event.raw as CalendarEvent['raw'] | undefined;
            if (!raw) return;
            navigateToDeadline(raw.source, raw.slug);
          }}
        />
        ) : (
          <div className={styles.fallback}>
            {isAr ? 'جارٍ تحميل التقويم…' : 'Loading calendar…'}
          </div>
        )}
      </div>

      <div className={styles.agenda}>
        <h3 className={styles.agendaHeading}>
          {isAr ? 'القادمون' : 'Coming up'}
        </h3>
        <ul className={styles.agendaList}>
          {events.slice(0, 8).map((e) => {
            const dl = upcomingRecords.find((r) => r.id === e.id);
            if (!dl) return null;
            const dateLabel = new Date(`${e.start}T00:00:00`).toLocaleDateString(
              isAr ? 'ar' : 'en',
              {day: 'numeric', month: 'short'},
            );
            const sameDay = e.start === e.end;
            const range = !sameDay
              ? ` – ${new Date(`${e.end}T00:00:00`).toLocaleDateString(
                  isAr ? 'ar' : 'en',
                  {day: 'numeric', month: 'short'},
                )}`
              : '';
            return (
              <li key={e.id} className={styles.agendaItem}>
                <button
                  type="button"
                  className={styles.agendaCard}
                  onClick={() => navigateToDeadline(dl.source, dl.slug)}>
                  <span
                    className={styles.agendaDateBadge}
                    style={{backgroundColor: KIND_COLOR[dl.kind]}}>
                    {dateLabel}
                    {range}
                  </span>
                  <span className={styles.agendaIcon}>{KIND_ICON[dl.kind]}</span>
                  <span className={styles.agendaShortName}>{dl.shortName}</span>
                  <span className={styles.agendaTitle}>
                    {dl.title[isAr ? 'ar' : 'en']}
                    {dl.approximate ? <span className={styles.agendaApprox}>~</span> : null}
                  </span>
                </button>
                <a
                  className={styles.gcalChip}
                  href={googleCalendarUrl(dl, isAr ? 'ar' : 'en')}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(ev) => ev.stopPropagation()}
                  title={isAr ? 'إضافة إلى Google Calendar' : 'Add to Google Calendar'}>
                  <span aria-hidden>+ </span>Google
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

export default function DeadlinesCalendar(): ReactNode {
  const {i18n} = useDocusaurusContext();
  const isAr = i18n.currentLocale === 'ar';
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <Heading as="h2" className={styles.heading}>
          <Translate id="homepage.deadlines.heading">
            Upcoming application deadlines
          </Translate>
        </Heading>
        <p className={styles.subheading}>
          <Translate id="homepage.deadlines.subheading">
            Across every university and scholarship on this site. Click any
            entry to jump to its source page, or add the whole calendar to
            Google.
          </Translate>
        </p>
        <ul className={styles.legend} aria-hidden>
          {LEGEND.map(({kind, en, ar}) => (
            <li key={kind} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{backgroundColor: KIND_COLOR[kind]}}
              />
              {isAr ? ar : en}
            </li>
          ))}
        </ul>
        <div className={styles.calendarFrame}>
          <BrowserOnly
            fallback={
              <div className={styles.fallback}>
                <Translate id="homepage.deadlines.loading">
                  Loading calendar…
                </Translate>
              </div>
            }>
            {() => <CalendarInner />}
          </BrowserOnly>
        </div>
      </div>
    </section>
  );
}
