/**
 * Homepage section that surfaces upcoming application + scholarship deadlines.
 *
 * UX:
 *  - Top toolbar: "Subscribe in Google Calendar" primary CTA, ".ics" download,
 *    plus the FullCalendar view-toggle/nav.
 *  - Each event row uses a custom render (eventContent) so the list view
 *    looks like a polished agenda card with date pill, kind icon, source
 *    chip, title, and a per-event "+ Add to Google" deep link.
 *  - Month view keeps FullCalendar defaults but with theme-token CSS overrides.
 *
 * FullCalendar is mounted inside <BrowserOnly> because it touches DOM APIs
 * at import time (mirrors the FloatingApplyButton pattern).
 */
import {useMemo, type ReactNode} from 'react';
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
  type Deadline,
  type DeadlineKind,
} from '@site/src/data/deadlines';
import styles from './styles.module.css';

const LEGEND: Array<{kind: DeadlineKind; en: string; ar: string}> = [
  {kind: 'application',   en: 'Application',     ar: 'تقديم'},
  {kind: 'exam',          en: 'Entrance exam',   ar: 'امتحان قبول'},
  {kind: 'interview',     en: 'Interview',       ar: 'مقابلة'},
  {kind: 'decision',      en: 'Decision',        ar: 'قرار'},
  {kind: 'financial-aid', en: 'Financial aid',   ar: 'مساعدات مالية'},
];

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
  // Required inside the BrowserOnly child so these don't resolve during SSR.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FullCalendar = require('@fullcalendar/react').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dayGridPlugin = require('@fullcalendar/daygrid').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const listPlugin = require('@fullcalendar/list').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const interactionPlugin = require('@fullcalendar/interaction').default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const arLocale = require('@fullcalendar/core/locales/ar').default;

  const {i18n} = useDocusaurusContext();
  const isAr = i18n.currentLocale === 'ar';
  const history = useHistory();

  const events = useMemo(
    () => upcomingDeadlines(new Date(), isAr ? 'ar' : 'en'),
    [isAr],
  );
  const upcomingDeadlineRecords = useMemo(
    () => deadlines.filter((d) =>
      events.some((e) => e.id === d.id),
    ),
    [events],
  );

  const renderEventContent = ({event, view}: any) => {
    const ext = event.extendedProps as {
      source: 'university' | 'scholarship';
      slug: string;
      kind: DeadlineKind;
      reference: string;
      approximate: boolean;
      ay: string;
    };
    // Strip the leading icon + shortName off the title (already in chip).
    const baseTitle = String(event.title).replace(
      new RegExp(`^${KIND_ICON[ext.kind]} \\S+ — `),
      '',
    );
    const isList = view.type.startsWith('list');
    const dl = upcomingDeadlineRecords.find((r) => r.id === event.id);
    const shortName = dl?.shortName ?? '';

    if (isList) {
      return (
        <div className={styles.eventCard}>
          <span
            className={styles.kindDot}
            style={{backgroundColor: KIND_COLOR[ext.kind]}}
            aria-hidden
          />
          <span className={styles.kindIcon} aria-hidden>{KIND_ICON[ext.kind]}</span>
          <span className={styles.sourceChip}>{shortName}</span>
          <span className={styles.eventTitle}>
            {baseTitle}
            {ext.approximate ? <span className={styles.approxBadge}>~</span> : null}
            {ext.ay && ext.ay !== '—' ? (
              <span className={styles.ayBadge}>{ext.ay}</span>
            ) : null}
          </span>
          {dl ? (
            <a
              className={styles.gcalChip}
              href={googleCalendarUrl(dl, isAr ? 'ar' : 'en')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={isAr ? 'إضافة إلى Google Calendar' : 'Add to Google Calendar'}>
              <span aria-hidden>+ </span>Google
            </a>
          ) : null}
        </div>
      );
    }
    // Month-grid view: compact single line.
    return (
      <div className={styles.gridEvent}>
        <span aria-hidden>{KIND_ICON[ext.kind]}</span>
        <span className={styles.gridEventTitle}>{shortName}</span>
      </div>
    );
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
      initialView="listMonth"
      headerToolbar={{
        start: 'title',
        center: '',
        end: 'listMonth,dayGridMonth prev,next today',
      }}
      buttonText={{
        listMonth: isAr ? 'قائمة' : 'List',
        dayGridMonth: isAr ? 'شهر' : 'Month',
        today: isAr ? 'اليوم' : 'Today',
      }}
      events={events}
      eventContent={renderEventContent}
      eventClick={({event, jsEvent}: {event: any; jsEvent: MouseEvent}) => {
        // Bypass internal navigation when the user clicked the +Google chip.
        const target = jsEvent.target as HTMLElement;
        if (target.closest(`.${styles.gcalChip}`)) return;
        jsEvent.preventDefault();
        const {source, slug} = event.extendedProps as {
          source: 'university' | 'scholarship';
          slug: string;
        };
        history.push(
          `/${source === 'university' ? 'universities' : 'scholarships'}/${slug}`,
        );
      }}
      locale={isAr ? arLocale : 'en'}
      direction={isAr ? 'rtl' : 'ltr'}
      firstDay={1}
      height="auto"
      noEventsText={translate({
        id: 'homepage.deadlines.noEvents',
        message: 'No upcoming deadlines in this window.',
      })}
    />
  );
}

function ToolbarInner(): ReactNode {
  const {i18n} = useDocusaurusContext();
  const isAr = i18n.currentLocale === 'ar';
  const events = upcomingDeadlines(new Date(), isAr ? 'ar' : 'en');
  const upcomingRecords = deadlines.filter((d) =>
    events.some((e) => e.id === d.id),
  );
  return (
    <div className={styles.toolbar}>
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
          <rect x="3" y="4" width="18" height="17" rx="3" fill="currentColor" opacity="0.16" />
          <rect x="3" y="4" width="18" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.6" />
          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <text x="12" y="17" fontSize="6" fontWeight="700" textAnchor="middle" fill="currentColor">G</text>
        </svg>
        <span>
          {isAr ? 'تنزيل لإضافته إلى Google Calendar' : 'Download for Google Calendar'}
        </span>
      </button>
      <a
        className={styles.icsDownload}
        href="https://support.google.com/calendar/answer/37118"
        target="_blank"
        rel="noopener noreferrer"
        title={isAr ? 'كيفية استيراد ملف .ics إلى Google Calendar' : 'How to import an .ics file into Google Calendar'}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M12 17.01l.01-.011" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span>{isAr ? 'كيف أستورده' : 'How to import'}</span>
      </a>
    </div>
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
        <BrowserOnly fallback={null}>{() => <ToolbarInner />}</BrowserOnly>
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
