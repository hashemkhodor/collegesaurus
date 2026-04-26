/**
 * Homepage section: upcoming application + scholarship deadlines.
 *
 * Custom agenda — no calendar library. Events are grouped by month, each
 * rendered as a card (date pill, kind icon, university chip, title,
 * "+ Google" deep link). Two top CTAs export the whole list to Google
 * Calendar via .ics download.
 */
import {useMemo, useState, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useHistory} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate from '@docusaurus/Translate';
import Heading from '@theme/Heading';
import {
  upcomingDeadlines,
  buildICS,
  googleCalendarUrl,
  KIND_COLOR,
  KIND_ICON,
  type Deadline,
  type DeadlineKind,
  type ResolvedDeadline,
} from '@site/src/data/deadlines';
import styles from './styles.module.css';

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

function monthBucket(d: ResolvedDeadline): string {
  return d.date.slice(0, 7); // 'YYYY-MM'
}

function formatMonth(bucket: string, locale: 'en' | 'ar'): string {
  const [yr, mo] = bucket.split('-').map(Number);
  const names = locale === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_EN;
  return `${names[mo - 1]} ${yr}`;
}

function formatDate(iso: string, locale: 'en' | 'ar'): {day: string; month: string} {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.toLocaleDateString(locale === 'ar' ? 'ar' : 'en', {day: 'numeric'});
  const month = d.toLocaleDateString(locale === 'ar' ? 'ar' : 'en', {month: 'short'});
  return {day, month};
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

const INITIAL_VISIBLE = 8;

function AgendaInner(): ReactNode {
  const {i18n, siteConfig} = useDocusaurusContext();
  const isAr = i18n.currentLocale === 'ar';
  const history = useHistory();
  const baseUrl = siteConfig.baseUrl.replace(/\/$/, '');
  const [showAll, setShowAll] = useState(false);

  const events = useMemo(() => upcomingDeadlines(new Date()), []);
  const visible = showAll ? events : events.slice(0, INITIAL_VISIBLE);

  const navigateToDeadline = (
    source: 'university' | 'scholarship',
    slug: string,
  ): void => {
    const seg = source === 'university' ? 'universities' : 'scholarships';
    history.push(`${baseUrl}/${seg}/${slug}`);
  };

  // Group visible events by month bucket while preserving sort order.
  const byMonth: Array<{bucket: string; items: ResolvedDeadline[]}> = [];
  for (const ev of visible) {
    const b = monthBucket(ev);
    const tail = byMonth[byMonth.length - 1];
    if (tail && tail.bucket === b) tail.items.push(ev);
    else byMonth.push({bucket: b, items: [ev]});
  }

  if (events.length === 0) {
    return (
      <div className={styles.fallback}>
        <Translate id="homepage.deadlines.noEvents">
          No upcoming deadlines in this window.
        </Translate>
      </div>
    );
  }

  return (
    <>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.gcalCta}
          onClick={() => downloadICS(events)}
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
          rel="noopener noreferrer">
          {isAr ? 'كيف أستورده؟' : 'How to import?'}
        </a>
      </div>

      <div className={styles.agenda}>
        {byMonth.map(({bucket, items}) => (
          <section key={bucket} className={styles.monthGroup}>
            <h3 className={styles.monthHeader}>
              <span className={styles.monthHeaderText}>
                {formatMonth(bucket, isAr ? 'ar' : 'en')}
              </span>
              <span className={styles.monthHeaderRule} aria-hidden />
              <span className={styles.monthHeaderCount}>
                {items.length} {isAr ? 'بنود' : items.length === 1 ? 'item' : 'items'}
              </span>
            </h3>
            <ul className={styles.monthItems}>
              {items.map((d) => {
                const startD = formatDate(d.date, isAr ? 'ar' : 'en');
                const endD = d.endDate
                  ? formatDate(d.endDate, isAr ? 'ar' : 'en')
                  : null;
                return (
                  <li key={d.id} className={styles.itemRow}>
                    <button
                      type="button"
                      className={styles.itemCard}
                      onClick={() => navigateToDeadline(d.source, d.slug)}
                      aria-label={`${d.shortName} — ${d.title[isAr ? 'ar' : 'en']}`}>
                      <span
                        className={styles.datePill}
                        style={{
                          backgroundColor: KIND_COLOR[d.kind],
                        }}>
                        <span className={styles.datePillDay}>{startD.day}</span>
                        <span className={styles.datePillMonth}>{startD.month}</span>
                        {endD ? (
                          <span className={styles.datePillEnd}>
                            {' → '}
                            <span className={styles.datePillEndDay}>{endD.day}</span>
                            <span className={styles.datePillEndMonth}>{endD.month}</span>
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.kindIcon} aria-hidden>{KIND_ICON[d.kind]}</span>
                      <span className={styles.sourceChip}>{d.shortName}</span>
                      <span className={styles.itemTitle}>
                        {d.title[isAr ? 'ar' : 'en']}
                        {d.approximate ? (
                          <span className={styles.approxBadge}>
                            ~ {isAr ? 'تقريبي' : 'approx'}
                          </span>
                        ) : null}
                        {d.ay && d.ay !== '—' ? (
                          <span className={styles.ayBadge}>{d.ay}</span>
                        ) : null}
                      </span>
                    </button>
                    <a
                      className={styles.gcalChip}
                      href={googleCalendarUrl(d, isAr ? 'ar' : 'en')}
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
          </section>
        ))}
      </div>

      {events.length > INITIAL_VISIBLE ? (
        <div className={styles.showMoreWrap}>
          <button
            type="button"
            className={styles.showMore}
            onClick={() => setShowAll((s) => !s)}>
            {showAll
              ? isAr ? 'عرض أقل' : 'Show fewer'
              : isAr
                ? `عرض كلّ المواعيد (${events.length})`
                : `Show all deadlines (${events.length})`}
          </button>
        </div>
      ) : null}
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
        <BrowserOnly
          fallback={
            <div className={styles.fallback}>
              <Translate id="homepage.deadlines.loading">
                Loading calendar…
              </Translate>
            </div>
          }>
          {() => <AgendaInner />}
        </BrowserOnly>
      </div>
    </section>
  );
}
