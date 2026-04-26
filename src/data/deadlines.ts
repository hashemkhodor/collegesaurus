/**
 * Centralised, typed application-deadline data for the homepage calendar.
 *
 * Each entry mirrors a date or window already documented in the relevant
 * .mdx page. The mdx tables remain the canonical human source; this file is
 * the structured copy the calendar feeds on.
 *
 * Maintenance: when an academic-year cycle rolls over, add the new entries
 * here and bump `ay`. Past absolute entries are auto-filtered by
 * `upcomingDeadlines()` at runtime, so leaving them is safe but tidy
 * removal is preferred.
 */

export type DeadlineKind =
  | 'application'
  | 'exam'
  | 'interview'
  | 'decision'
  | 'financial-aid';

export type SourceKind = 'university' | 'scholarship';

export interface Deadline {
  /** Stable id, e.g. 'lau-2026-fall-deadline'. */
  id: string;
  source: SourceKind;
  /** Slug of the corresponding mdx file. */
  slug: string;
  /** Short label shown in the event title, e.g. 'LAU', 'Fulbright'. */
  shortName: string;
  kind: DeadlineKind;
  /** ISO 'YYYY-MM-DD'. Start day if a range. */
  date: string;
  /**
   * ISO 'YYYY-MM-DD' for ranges. Note: FullCalendar treats `end` as
   * EXCLUSIVE. We add +1 day at conversion time so the user-meaningful
   * "Jul 22-30" lands on the calendar exactly as expected.
   */
  endDate?: string;
  /** Annual recurrence — resolves to the next future occurrence at runtime. */
  recurring?: 'annual';
  /** True when the source uses fuzzy wording (e.g. 'Mid-January'). */
  approximate?: boolean;
  /** Academic year, '2025-26' | '2026-27' | '2027-28' | '—' for evergreen. */
  ay: string;
  /** Canonical URL on the host institution's site. */
  reference: string;
  /** Short i18n title, shown as the event label. */
  title: {en: string; ar: string};
}

export const KIND_ICON: Record<DeadlineKind, string> = {
  application: '🎓',
  exam: '📝',
  interview: '🤝',
  decision: '✉️',
  'financial-aid': '💰',
};

/**
 * Tailwind-ish palette mapped to deadline kind so visually similar items
 * cluster on the month grid. Resolved against CSS vars in the component.
 */
export const KIND_COLOR: Record<DeadlineKind, string> = {
  application: '#2563eb', // blue
  exam: '#dc2626', // red
  interview: '#7c3aed', // purple
  decision: '#16a34a', // green
  'financial-aid': '#ea580c', // orange
};

// ---------------------------------------------------------------------------
// Seed data — sourced from the audit of universities/*.mdx + scholarships/*.mdx
// ---------------------------------------------------------------------------

export const deadlines: Deadline[] = [
  // === LAU =================================================================
  {
    id: 'lau-2026-spring-deadline',
    source: 'university', slug: 'lau', shortName: 'LAU', kind: 'application',
    date: '2026-04-30', ay: '2025-26',
    reference: 'https://www.lau.edu.lb/apply/deadlines.php',
    title: {en: 'LAU — Spring 2026 application deadline', ar: 'LAU — آخر موعد للتقديم لربيع 2026'},
  },
  {
    id: 'lau-2026-fall-deadline',
    source: 'university', slug: 'lau', shortName: 'LAU', kind: 'application',
    date: '2026-07-15', ay: '2026-27',
    reference: 'https://www.lau.edu.lb/apply/deadlines.php',
    title: {en: 'LAU — Fall 2026 application deadline', ar: 'LAU — آخر موعد للتقديم لخريف 2026'},
  },
  {
    id: 'lau-2026-faid-jan',
    source: 'university', slug: 'lau', shortName: 'LAU', kind: 'financial-aid',
    date: '2026-01-31', ay: '2025-26',
    reference: 'https://www.lau.edu.lb/apply/deadlines.php',
    title: {en: 'LAU — Financial-aid priority deadline', ar: 'LAU — آخر موعد لأولوية المساعدات المالية'},
  },
  {
    id: 'lau-2026-faid-apr',
    source: 'university', slug: 'lau', shortName: 'LAU', kind: 'financial-aid',
    date: '2026-04-30', ay: '2025-26',
    reference: 'https://www.lau.edu.lb/apply/deadlines.php',
    title: {en: 'LAU — Financial-aid final deadline', ar: 'LAU — آخر موعد نهائي للمساعدات المالية'},
  },

  // === Université Antonine (UA) ===========================================
  {
    id: 'ua-2025-r1-deadline',
    source: 'university', slug: 'antonine', shortName: 'UA', kind: 'application',
    date: '2025-12-04', ay: '2025-26',
    reference: 'https://ua.edu.lb/Library/Assets//Gallery/Documents/admissions/ua-admissions-guide.pdf',
    title: {en: 'UA — Round 1 application deadline (AY 2025-26)', ar: 'UA — آخر موعد للجولة الأولى (2025-26)'},
  },
  {
    id: 'ua-2025-r1-exam',
    source: 'university', slug: 'antonine', shortName: 'UA', kind: 'exam',
    date: '2025-12-08', ay: '2025-26',
    reference: 'https://ua.edu.lb/Library/Assets//Gallery/Documents/admissions/ua-admissions-guide.pdf',
    title: {en: 'UA — Round 1 entrance exam', ar: 'UA — امتحان قبول الجولة الأولى'},
  },
  {
    id: 'ua-2025-r1-decision',
    source: 'university', slug: 'antonine', shortName: 'UA', kind: 'decision',
    date: '2025-12-19', ay: '2025-26',
    reference: 'https://ua.edu.lb/Library/Assets//Gallery/Documents/admissions/ua-admissions-guide.pdf',
    title: {en: 'UA — Round 1 decisions', ar: 'UA — قرارات الجولة الأولى'},
  },
  {
    id: 'ua-2026-r1-deadline',
    source: 'university', slug: 'antonine', shortName: 'UA', kind: 'application',
    date: '2025-12-01', ay: '2026-27',
    reference: 'https://ua.edu.lb/Library/Assets//Gallery/Documents/admissions/ua-admissions-guide.pdf',
    title: {en: 'UA — AY 2026-27 Round 1 deadline', ar: 'UA — آخر موعد للجولة الأولى (2026-27)'},
  },
  {
    id: 'ua-2026-r2-deadline',
    source: 'university', slug: 'antonine', shortName: 'UA', kind: 'application',
    date: '2026-02-23', ay: '2026-27',
    reference: 'https://ua.edu.lb/Library/Assets//Gallery/Documents/admissions/ua-admissions-guide.pdf',
    title: {en: 'UA — AY 2026-27 Round 2 deadline', ar: 'UA — آخر موعد للجولة الثانية (2026-27)'},
  },
  {
    id: 'ua-2026-r2-exam',
    source: 'university', slug: 'antonine', shortName: 'UA', kind: 'exam',
    date: '2026-02-28', ay: '2026-27',
    reference: 'https://ua.edu.lb/Library/Assets//Gallery/Documents/admissions/ua-admissions-guide.pdf',
    title: {en: 'UA — Round 2 entrance exam (AY 2026-27)', ar: 'UA — امتحان قبول الجولة الثانية (2026-27)'},
  },
  {
    id: 'ua-2026-r2-decision',
    source: 'university', slug: 'antonine', shortName: 'UA', kind: 'decision',
    date: '2026-03-16', ay: '2026-27',
    reference: 'https://ua.edu.lb/Library/Assets//Gallery/Documents/admissions/ua-admissions-guide.pdf',
    title: {en: 'UA — Round 2 decisions (AY 2026-27)', ar: 'UA — قرارات الجولة الثانية (2026-27)'},
  },

  // === LU (Lebanese University) ===========================================
  {
    id: 'lu-2025-fe-cee-window',
    source: 'university', slug: 'lu', shortName: 'LU', kind: 'application',
    date: '2025-06-02', endDate: '2025-07-11', ay: '2025-26',
    reference: 'https://www.ul.edu.lb/en/dates-2025-2026-first-year-cee-faculty-engineering',
    title: {en: 'LU — Faculty of Engineering CEE applications', ar: 'LU — تقديم طلبات CEE لكلية الهندسة'},
  },
  {
    id: 'lu-2025-fe-cee-exam',
    source: 'university', slug: 'lu', shortName: 'LU', kind: 'exam',
    date: '2025-07-17', ay: '2025-26',
    reference: 'https://www.ul.edu.lb/en/dates-2025-2026-first-year-cee-faculty-engineering',
    title: {en: 'LU — Faculty of Engineering CEE exam', ar: 'LU — امتحان CEE لكلية الهندسة'},
  },
  {
    id: 'lu-2025-fph-cee-window',
    source: 'university', slug: 'lu', shortName: 'LU', kind: 'application',
    date: '2025-06-02', endDate: '2025-07-21', ay: '2025-26',
    reference: 'https://ul.edu.lb/en/date-cee-fph-academic-year-2025-2026',
    title: {en: 'LU — Faculty of Public Health CEE applications', ar: 'LU — تقديم طلبات CEE لكلية الصحة العامة'},
  },
  {
    id: 'lu-2025-fph-cee-exam',
    source: 'university', slug: 'lu', shortName: 'LU', kind: 'exam',
    date: '2025-07-24', ay: '2025-26',
    reference: 'https://ul.edu.lb/en/date-cee-fph-academic-year-2025-2026',
    title: {en: 'LU — Faculty of Public Health CEE exam', ar: 'LU — امتحان CEE لكلية الصحة العامة'},
  },
  {
    id: 'lu-2025-fdm-cee-exam',
    source: 'university', slug: 'lu', shortName: 'LU', kind: 'exam',
    date: '2025-09-08', endDate: '2025-09-10', ay: '2025-26',
    reference: 'https://ul.edu.lb/en/conditions-and-dates-admission-2nd-academic-year-fdm-academic-year-2025%E2%80%932026',
    title: {en: 'LU — Faculty of Dental Medicine CEE exam', ar: 'LU — امتحان CEE لكلية طب الأسنان'},
  },

  // === University of Balamand (UoB) =======================================
  {
    id: 'uob-2025-spring-deadline',
    source: 'university', slug: 'uob', shortName: 'UoB', kind: 'application',
    date: '2025-12-19', ay: '2025-26',
    reference: 'https://www.balamand.edu.lb/AboutUOB/Pages/AdmissionsRegistration.aspx',
    title: {en: 'UoB — Spring 2026 application deadline', ar: 'UoB — آخر موعد لربيع 2026'},
  },
  {
    id: 'uob-2026-early-deadline',
    source: 'university', slug: 'uob', shortName: 'UoB', kind: 'application',
    date: '2026-01-15', approximate: true, ay: '2026-27',
    reference: 'https://www.balamand.edu.lb/AboutUOB/Pages/AdmissionsRegistration.aspx',
    title: {en: 'UoB — Early-decision deadline (mid-Jan, approx)', ar: 'UoB — موعد القرار المبكر (منتصف كانون الثاني)'},
  },
  {
    id: 'uob-2026-early-decision',
    source: 'university', slug: 'uob', shortName: 'UoB', kind: 'decision',
    date: '2026-02-15', approximate: true, ay: '2026-27',
    reference: 'https://www.balamand.edu.lb/AboutUOB/Pages/AdmissionsRegistration.aspx',
    title: {en: 'UoB — Early decisions (mid-Feb, approx)', ar: 'UoB — قرارات القبول المبكر (منتصف شباط)'},
  },
  {
    id: 'uob-2026-regular-deadline',
    source: 'university', slug: 'uob', shortName: 'UoB', kind: 'application',
    date: '2026-05-31', approximate: true, ay: '2026-27',
    reference: 'https://www.balamand.edu.lb/AboutUOB/Pages/AdmissionsRegistration.aspx',
    title: {en: 'UoB — Regular deadline (end-May, approx)', ar: 'UoB — آخر موعد عادي (أواخر أيار)'},
  },

  // === AUB ================================================================
  {
    id: 'aub-2026-early-deadline',
    source: 'university', slug: 'aub', shortName: 'AUB', kind: 'application',
    date: '2025-10-31', ay: '2026-27',
    reference: 'https://www.aub.edu.lb/admissions/Pages/Deadlines.aspx',
    title: {en: 'AUB — Early Application deadline', ar: 'AUB — آخر موعد للتقديم المبكر'},
  },
  {
    id: 'aub-2026-early-decision',
    source: 'university', slug: 'aub', shortName: 'AUB', kind: 'decision',
    date: '2025-12-31', approximate: true, ay: '2026-27',
    reference: 'https://www.aub.edu.lb/admissions/Pages/Deadlines.aspx',
    title: {en: 'AUB — Early decisions (by end-Dec)', ar: 'AUB — قرارات القبول المبكر (نهاية كانون الأول)'},
  },
  {
    id: 'aub-2026-regular-deadline',
    source: 'university', slug: 'aub', shortName: 'AUB', kind: 'application',
    date: '2025-12-20', ay: '2026-27',
    reference: 'https://www.aub.edu.lb/admissions/Pages/Deadlines.aspx',
    title: {en: 'AUB — Regular Application deadline', ar: 'AUB — آخر موعد للتقديم العادي'},
  },
  {
    id: 'aub-2026-regular-decision',
    source: 'university', slug: 'aub', shortName: 'AUB', kind: 'decision',
    date: '2026-03-31', approximate: true, ay: '2026-27',
    reference: 'https://www.aub.edu.lb/admissions/Pages/Deadlines.aspx',
    title: {en: 'AUB — Regular decisions (by end-Mar)', ar: 'AUB — قرارات القبول العادي (نهاية آذار)'},
  },

  // === BAU ================================================================
  {
    id: 'bau-2025-r1-deadline',
    source: 'university', slug: 'bau', shortName: 'BAU', kind: 'application',
    date: '2025-02-26', ay: '2025-26',
    reference: 'https://www.bau.edu.lb/Admissions/ProspectiveStudents',
    title: {en: 'BAU — Round 1 application deadline', ar: 'BAU — آخر موعد للجولة الأولى'},
  },
  {
    id: 'bau-2025-r1-exam',
    source: 'university', slug: 'bau', shortName: 'BAU', kind: 'exam',
    date: '2025-03-01', ay: '2025-26',
    reference: 'https://www.bau.edu.lb/Admissions/ProspectiveStudents',
    title: {en: 'BAU — Round 1 entrance exam', ar: 'BAU — امتحان قبول الجولة الأولى'},
  },
  {
    id: 'bau-2025-r2-deadline',
    source: 'university', slug: 'bau', shortName: 'BAU', kind: 'application',
    date: '2025-07-17', ay: '2025-26',
    reference: 'https://www.bau.edu.lb/Admissions/ProspectiveStudents',
    title: {en: 'BAU — Round 2 application deadline', ar: 'BAU — آخر موعد للجولة الثانية'},
  },
  {
    id: 'bau-2025-r2-exam',
    source: 'university', slug: 'bau', shortName: 'BAU', kind: 'exam',
    date: '2025-07-22', ay: '2025-26',
    reference: 'https://www.bau.edu.lb/Admissions/ProspectiveStudents',
    title: {en: 'BAU — Round 2 entrance exam', ar: 'BAU — امتحان قبول الجولة الثانية'},
  },

  // === NDU ================================================================
  {
    id: 'ndu-2026-faid',
    source: 'university', slug: 'ndu', shortName: 'NDU', kind: 'financial-aid',
    date: '2026-03-31', ay: '2026-27',
    reference: 'https://www.ndu.edu.lb/scholarship-and-financial-aid/new-student',
    title: {en: 'NDU — Financial-aid deadline', ar: 'NDU — آخر موعد للمساعدات المالية'},
  },
  {
    id: 'ndu-2026-deadline',
    source: 'university', slug: 'ndu', shortName: 'NDU', kind: 'application',
    date: '2026-06-02', ay: '2026-27',
    reference: 'https://www.ndu.edu.lb/admissions/overview',
    title: {en: 'NDU — Application deadline', ar: 'NDU — آخر موعد للتقديم'},
  },
  {
    id: 'ndu-2026-exam',
    source: 'university', slug: 'ndu', shortName: 'NDU', kind: 'exam',
    date: '2026-06-05', ay: '2026-27',
    reference: 'https://www.ndu.edu.lb/admissions/overview',
    title: {en: 'NDU — Entrance exam', ar: 'NDU — امتحان القبول'},
  },
  {
    id: 'ndu-2026-decision',
    source: 'university', slug: 'ndu', shortName: 'NDU', kind: 'decision',
    date: '2026-06-29', ay: '2026-27',
    reference: 'https://www.ndu.edu.lb/admissions/overview',
    title: {en: 'NDU — Decisions', ar: 'NDU — قرارات القبول'},
  },

  // === USJ ================================================================
  {
    id: 'usj-2026-r1-deadline',
    source: 'university', slug: 'usj', shortName: 'USJ', kind: 'application',
    date: '2025-12-17', ay: '2026-27',
    reference: 'https://www.usj.edu.lb/admission/',
    title: {en: 'USJ — Round 1 deadline', ar: 'USJ — آخر موعد للجولة الأولى'},
  },
  {
    id: 'usj-2026-r2-deadline',
    source: 'university', slug: 'usj', shortName: 'USJ', kind: 'application',
    date: '2026-06-19', ay: '2026-27',
    reference: 'https://www.usj.edu.lb/admission/',
    title: {en: 'USJ — Round 2 deadline', ar: 'USJ — آخر موعد للجولة الثانية'},
  },
  {
    id: 'usj-2026-r3-deadline',
    source: 'university', slug: 'usj', shortName: 'USJ', kind: 'application',
    date: '2026-08-21', ay: '2026-27',
    reference: 'https://www.usj.edu.lb/admission/',
    title: {en: 'USJ — Round 3 deadline', ar: 'USJ — آخر موعد للجولة الثالثة'},
  },

  // === SCHOLARSHIPS =======================================================
  {
    id: 'fulbright-2027-deadline',
    source: 'scholarship', slug: 'fulbright', shortName: 'Fulbright', kind: 'application',
    date: '2026-05-04', ay: '2027-28',
    reference: 'https://apply.iie.org/ffsp2027',
    title: {en: 'Fulbright FFSP — Application deadline (Beirut 23:59)', ar: 'Fulbright FFSP — آخر موعد للتقديم (بيروت 23:59)'},
  },
  {
    id: 'fulbright-2027-interview',
    source: 'scholarship', slug: 'fulbright', shortName: 'Fulbright', kind: 'interview',
    date: '2026-06-15', approximate: true, ay: '2027-28',
    reference: 'https://www.amideast.org/our-work/find-a-scholarship/graduate-study/fulbright/how-to-apply/fulbright-foreign-student-program-for-lebanon',
    title: {en: 'Fulbright FFSP — Interviews in Beirut (mid-June)', ar: 'Fulbright FFSP — مقابلات بيروت (منتصف حزيران)'},
  },
  {
    id: 'mepi-tl-deadline',
    source: 'scholarship', slug: 'mepi-tl', shortName: 'MEPI-TL', kind: 'application',
    date: '2025-11-25', recurring: 'annual', ay: '2026-27',
    reference: 'https://www.tomorrowsleadersprogram.org/timeline/',
    title: {en: 'MEPI Tomorrow’s Leaders — Application deadline', ar: 'MEPI قادة الغد — آخر موعد للتقديم'},
  },
  {
    id: 'mepi-tl-interview',
    source: 'scholarship', slug: 'mepi-tl', shortName: 'MEPI-TL', kind: 'interview',
    date: '2026-01-15', recurring: 'annual', approximate: true, ay: '2026-27',
    reference: 'https://www.tomorrowsleadersprogram.org/timeline/',
    title: {en: 'MEPI Tomorrow’s Leaders — Interviews', ar: 'MEPI قادة الغد — المقابلات'},
  },
  {
    id: 'stipendium-2027-deadline',
    source: 'scholarship', slug: 'stipendium-hungaricum', shortName: 'Stipendium', kind: 'application',
    date: '2027-01-15', ay: '2027-28',
    reference: 'https://apply.stipendiumhungaricum.hu/',
    title: {en: 'Stipendium Hungaricum — Application deadline (14:00 CET)', ar: 'Stipendium Hungaricum — آخر موعد للتقديم (14:00 CET)'},
  },
  {
    id: 'usaid-usp-2026-deadline',
    source: 'scholarship', slug: 'usaid-usp', shortName: 'USAID USP', kind: 'application',
    date: '2026-02-16', ay: '2025-26',
    reference: 'https://www.aub.edu.lb/HES/Pages/usp-req-benefits.aspx',
    title: {en: 'USAID USP — AUB application deadline (status: suspended)', ar: 'USAID USP — آخر موعد للتقديم في AUB (الحالة: مُعلَّق)'},
  },
  {
    id: 'tomooh-deadline',
    source: 'scholarship', slug: 'tomooh', shortName: 'Tomooh', kind: 'application',
    date: '2026-06-30', recurring: 'annual', ay: '—',
    reference: 'https://ajialouna.org/tomooh/',
    title: {en: 'Tomooh — Application deadline (annual)', ar: 'Tomooh — آخر موعد للتقديم (سنوي)'},
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  url?: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    source: SourceKind;
    slug: string;
    kind: DeadlineKind;
    reference: string;
    approximate: boolean;
    ay: string;
  };
}

// ---------------------------------------------------------------------------
// Google Calendar / .ics export helpers
// ---------------------------------------------------------------------------

/**
 * Build a Google Calendar "TEMPLATE" deep link that pre-fills the event
 * editor with the deadline details. One click takes the user from the
 * homepage straight to a save-able event in their calendar.
 *
 * https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=YYYYMMDD/YYYYMMDD
 */
export function googleCalendarUrl(d: Deadline, locale: 'en' | 'ar' = 'en'): string {
  const start = d.date.replace(/-/g, '');
  const endIso = d.endDate ?? d.date;
  // Google Calendar treats `dates` end as exclusive too — add a day.
  const endDate = new Date(`${endIso}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = endDate.toISOString().slice(0, 10).replace(/-/g, '');
  const text = `${KIND_ICON[d.kind]} ${d.shortName} — ${d.title[locale]}`;
  const details = [
    `${d.title[locale]}.`,
    d.approximate ? '(Approximate date — verify with the source.)' : '',
    `Source: ${d.reference}`,
  ].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    dates: `${start}/${end}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Pad single-digit ints to two digits (for ICS DTSTAMP). */
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** UTC ISO timestamp in iCalendar format: 20260504T000000Z. */
function icsStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  );
}

/**
 * Serialise a list of deadlines into a valid iCalendar (.ics) string.
 * Use as a Blob download or a subscribable URL.
 */
export function buildICS(items: Deadline[], now: Date = new Date()): string {
  const dtstamp = icsStamp(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Collegesaurus//Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Collegesaurus — Lebanese University & Scholarship Deadlines',
    'X-WR-TIMEZONE:Asia/Beirut',
  ];
  for (const d of items) {
    let start = d.date;
    let endIso = d.endDate ?? d.date;
    if (d.recurring === 'annual') {
      // Anchor the recurring entry at the next future occurrence so calendar
      // apps don't show last year's date as the headline. The RRULE below
      // handles future years.
      const [, mm, dd] = d.date.split('-').map(Number);
      const yr = now.getUTCFullYear();
      const candidate = new Date(Date.UTC(yr, mm - 1, dd));
      const useThisYear = candidate.getTime() >= now.getTime();
      const baseYear = useThisYear ? yr : yr + 1;
      start = `${baseYear}-${pad2(mm)}-${pad2(dd)}`;
      if (d.endDate) {
        const [, em, ed] = d.endDate.split('-').map(Number);
        endIso = `${baseYear}-${pad2(em)}-${pad2(ed)}`;
      } else {
        endIso = start;
      }
    }
    const dtstart = start.replace(/-/g, '');
    const endDate = new Date(`${endIso}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const dtend = endDate.toISOString().slice(0, 10).replace(/-/g, '');
    const summary = `${KIND_ICON[d.kind]} ${d.shortName} — ${d.title.en}`;
    const description = [
      d.title.en,
      d.approximate ? '(Approximate date — verify with the source.)' : '',
      `Source: ${d.reference}`,
    ].filter(Boolean).join('\\n\\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${d.id}@collegesaurus`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary.replace(/[,;\\]/g, (c) => '\\' + c)}`,
      `DESCRIPTION:${description.replace(/[,;\\]/g, (c) => '\\' + c)}`,
      `URL:${d.reference}`,
    );
    if (d.recurring === 'annual') lines.push('RRULE:FREQ=YEARLY');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/** Add one day to an ISO 'YYYY-MM-DD' (FullCalendar end is exclusive). */
function addOneDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Resolve a recurring 'annual' entry to the next occurrence ≥ now. */
function resolveAnnual(iso: string, now: Date): string {
  const [, month, day] = iso.split('-').map(Number);
  const year = now.getUTCFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getTime() >= now.getTime()) return candidate.toISOString().slice(0, 10);
  return new Date(Date.UTC(year + 1, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * Convert deadlines to FullCalendar events, dropping past absolute entries
 * and resolving recurring ones to the next future occurrence.
 *
 * `locale` selects which `title` translation to render.
 */
export function upcomingDeadlines(
  now: Date,
  locale: 'en' | 'ar' = 'en',
): CalendarEvent[] {
  return deadlines
    .map((d): CalendarEvent | null => {
      let start = d.date;
      let end = d.endDate ? addOneDay(d.endDate) : addOneDay(d.date);
      if (d.recurring === 'annual') {
        const resolved = resolveAnnual(d.date, now);
        const drift = (new Date(`${resolved}T00:00:00Z`).getTime() -
                       new Date(`${d.date}T00:00:00Z`).getTime());
        start = resolved;
        if (d.endDate) {
          end = addOneDay(new Date(new Date(`${d.endDate}T00:00:00Z`).getTime() + drift)
            .toISOString().slice(0, 10));
        } else {
          end = addOneDay(resolved);
        }
      }
      if (new Date(`${end}T00:00:00Z`).getTime() < now.getTime()) return null;
      const baseTitle = d.title[locale];
      const title = `${KIND_ICON[d.kind]} ${d.shortName} — ${baseTitle}${d.approximate ? ' ~' : ''}`;
      return {
        id: d.id,
        title,
        start,
        end,
        backgroundColor: KIND_COLOR[d.kind],
        borderColor: KIND_COLOR[d.kind],
        textColor: '#ffffff',
        extendedProps: {
          source: d.source,
          slug: d.slug,
          kind: d.kind,
          reference: d.reference,
          approximate: !!d.approximate,
          ay: d.ay,
        },
      };
    })
    .filter((e): e is CalendarEvent => e !== null)
    .sort((a, b) => a.start.localeCompare(b.start));
}
