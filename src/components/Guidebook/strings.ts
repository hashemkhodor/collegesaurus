import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {maskProfanity} from '@site/src/components/Search/profanity';

// Arabic number agreement: one, two, 3–10, 11–99, other.
function ar(n: number, forms: [string, string, string, string, string]): string {
  const m = n % 100;
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  if (m >= 3 && m <= 10) return forms[2];
  if (m >= 11 && m <= 99) return forms[3];
  return forms[4];
}

const en = {
  year: (y: string) => `${y} information`,
  apply: (host: string) => `Apply on ${host}`,
  applyShort: 'Apply',
  applyNow: 'Apply now',
  programsIn: (n: number, units: number) =>
    units > 1 && units <= 12 ? `programs in ${units} faculties` : n === 1 ? 'program listed' : 'programs listed',
  applications: (host: string) => `Applications: ${host}`,
  programsCount: (n: number) => `${n} ${n === 1 ? 'program' : 'programs'}`,
  perCredit: 'per credit',
  perCreditNotes: 'per credit, see the notes',
  chips: {
    faculty: 'Programs',
    application: 'Apply',
    tuition: 'Tuition',
    scholarships: 'Scholarships',
    requirements: 'Requirements',
    contacts: 'Contact',
    overview: 'Overview',
    grades: 'Requirements',
    window: 'Apply',
    universities: 'Universities',
    benefits: 'Benefits',
    recipients: 'Recipients',
  } as Record<string, string>,
  provider: 'Provider',
  type: 'Type',
  universitiesCount: (n: number): string => (n === 1 ? 'university listed' : 'universities listed'),
  passed: 'Passed',
  inDays: (n: number): string => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`),
  searchPrograms: (n: number) => `Search ${n} programs`,
  facultyFilter: 'Filter by faculty',
  allFaculties: (n: number) => `All faculties (${n})`,
  shown: (a: number, n: number) => `${a} of ${n} programs`,
  showAllPrograms: (n: number) => `Show all ${n} programs`,
  showFewerPrograms: 'Show fewer programs',
  noMatch: (q: string) => `No program matches “${maskProfanity(q)}”.`,
  clear: 'Clear the search',
  years: (n: string | number) => `${n} ${Number(n) === 1 ? 'year' : 'years'}`,
  credits: (n: string | number) => `${n} credits`,
  programPage: 'Program page',
  sourceNamed: (label: string) => `Source: ${label}`,
  showMore: (n: number) => `Show ${n} more`,
  showFewer: 'Show fewer',
  showMoreSections: (n: number) => `Show ${n} more ${n === 1 ? 'section' : 'sections'}`,
  showFewerSections: 'Show fewer sections',
  source: 'Source',
  sources: 'Sources',
  glance: 'At a glance',
  onPage: 'On this page',
  correction: 'Suggest a correction',
  open: 'Open now',
  closing: (n: number) => (n === 1 ? '1 day left' : `${n} days left`),
  opening: (n: number) => (n === 1 ? 'Opens in 1 day' : `Opens in ${n} days`),
  closed: 'Closed',
  closes: (d: string) => `Closes ${d}`,
  opensOn: (d: string) => `Opens ${d}`,
  applyBy: 'Apply by',
  closesTba: 'Closing date to be announced',
  showClosed: (n: number) => `Show ${n} closed ${n === 1 ? 'window' : 'windows'}`,
  hideClosed: 'Hide closed windows',
};

export type GuideStrings = typeof en;

const arStrings: GuideStrings = {
  year: (y) => `معلومات ${y}`,
  apply: (host) => `قدّم عبر ${host}`,
  applyShort: 'قدّم',
  applyNow: 'قدّم الآن',
  programsIn: (n, units) =>
    units > 1 && units <= 12
      ? `${ar(n, ['برنامج', 'برنامجان', 'برامج', 'برنامجًا', 'برنامج'])} في ${units} ${ar(units, ['كلية', 'كليتين', 'كليات', 'كلية', 'كلية'])}`
      : ar(n, ['برنامج مُدرج', 'برنامجان مُدرجان', 'برامج مُدرجة', 'برنامجًا مُدرجًا', 'برنامج مُدرج']),
  applications: (host) => `بوابة التقديم: ${host}`,
  programsCount: (n) => `${n} ${ar(n, ['برنامج', 'برنامجان', 'برامج', 'برنامجًا', 'برنامج'])}`,
  perCredit: 'للساعة المعتمدة',
  perCreditNotes: 'للساعة المعتمدة، راجع الملاحظات',
  chips: {
    faculty: 'البرامج',
    application: 'التقديم',
    tuition: 'الأقساط',
    scholarships: 'المنح',
    requirements: 'المتطلبات',
    contacts: 'التواصل',
    overview: 'نظرة عامة',
    grades: 'الشروط',
    window: 'التقديم',
    universities: 'الجامعات',
    benefits: 'الفوائد',
    recipients: 'المستفيدون',
  },
  provider: 'الجهة المانحة',
  type: 'النوع',
  universitiesCount: (n) => ar(n, ['جامعة مُدرجة', 'جامعتان مُدرجتان', 'جامعات مُدرجة', 'جامعة مُدرجة', 'جامعة مُدرجة']),
  passed: 'انقضى',
  inDays: (n) =>
    n === 0 ? 'اليوم' : n === 1 ? 'غدًا' : `بعد ${n} ${ar(n, ['يوم', 'يومين', 'أيام', 'يومًا', 'يوم'])}`,
  searchPrograms: (n) => `ابحث في ${n} ${ar(n, ['برنامج', 'برنامجين', 'برامج', 'برنامجًا', 'برنامج'])}`,
  facultyFilter: 'تصفية حسب الكلية',
  allFaculties: (n) => `كل الكليات (${n})`,
  shown: (a, n) => `${a} من ${n}`,
  showAllPrograms: (n) => `اعرض كل البرامج (${n})`,
  showFewerPrograms: 'اعرض برامج أقل',
  noMatch: (q) => `لا يوجد برنامج يطابق «${maskProfanity(q)}».`,
  clear: 'امسح البحث',
  years: (n) => {
    const v = Number(n);
    if (v === 1) return 'سنة واحدة';
    if (v === 2) return 'سنتان';
    return `${n} ${ar(v, ['سنة', 'سنتان', 'سنوات', 'سنة', 'سنة'])}`;
  },
  credits: (n) =>
    `${n} ${ar(Number(n), ['ساعة معتمدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة', 'ساعة معتمدة'])}`,
  programPage: 'صفحة البرنامج',
  sourceNamed: (label) => `المصدر: ${label}`,
  showMore: (n) => `اعرض ${n} إضافية`,
  showFewer: 'اعرض أقل',
  showMoreSections: (n) => `اعرض المزيد (${n})`,
  showFewerSections: 'اعرض أقل',
  source: 'المصدر',
  sources: 'المصادر',
  glance: 'لمحة سريعة',
  onPage: 'في هذه الصفحة',
  correction: 'اقترح تصحيحًا',
  open: 'التقديم مفتوح',
  closing: (n) => ar(n, ['بقي يوم واحد', 'بقي يومان', `بقيت ${n} أيام`, `بقي ${n} يومًا`, `بقي ${n} يوم`]),
  opening: (n) =>
    ar(n, ['يفتح غدًا', 'يفتح خلال يومين', `يفتح خلال ${n} أيام`, `يفتح خلال ${n} يومًا`, `يفتح خلال ${n} يوم`]),
  closed: 'أُغلق',
  closes: (d) => `يُغلق في ${d}`,
  opensOn: (d) => `يفتح في ${d}`,
  applyBy: 'آخر موعد للتقديم',
  closesTba: 'موعد الإغلاق لم يُعلَن بعد',
  showClosed: (n) => `اعرض المواعيد المنتهية (${n})`,
  hideClosed: 'أخفِ المواعيد المنتهية',
};

const frStrings: GuideStrings = {
  year: (y) => `Informations ${y}`,
  apply: (host) => `Postuler sur ${host}`,
  applyShort: 'Postuler',
  applyNow: 'Postuler maintenant',
  programsIn: (n, units) =>
    units > 1 && units <= 12
      ? `${n > 1 ? 'programmes' : 'programme'} dans ${units} facultés`
      : n > 1
        ? 'programmes répertoriés'
        : 'programme répertorié',
  applications: (host) => `Candidatures : ${host}`,
  programsCount: (n) => `${n} ${n > 1 ? 'programmes' : 'programme'}`,
  perCredit: 'par crédit',
  perCreditNotes: 'par crédit, voir les notes',
  chips: {
    faculty: 'Programmes',
    application: 'Candidature',
    tuition: 'Frais de scolarité',
    scholarships: 'Bourses',
    requirements: 'Conditions',
    contacts: 'Contact',
    overview: 'Présentation',
    grades: 'Conditions',
    window: 'Candidature',
    universities: 'Universités',
    benefits: 'Avantages',
    recipients: 'Bénéficiaires',
  },
  provider: 'Organisme',
  type: 'Type',
  universitiesCount: (n) => (n > 1 ? 'universités répertoriées' : 'université répertoriée'),
  passed: 'Terminé',
  inDays: (n) => (n === 0 ? 'Aujourd’hui' : n === 1 ? 'Demain' : `Dans ${n} jours`),
  searchPrograms: (n) => `Rechercher parmi ${n} programmes`,
  facultyFilter: 'Filtrer par faculté',
  allFaculties: (n) => `Toutes les facultés (${n})`,
  shown: (a, n) => `${a} sur ${n} programmes`,
  showAllPrograms: (n) => `Afficher les ${n} programmes`,
  showFewerPrograms: 'Afficher moins de programmes',
  noMatch: (q) => `Aucun programme ne correspond à « ${maskProfanity(q)} ».`,
  clear: 'Effacer la recherche',
  years: (n) => `${n} ${Number(n) > 1 ? 'ans' : 'an'}`,
  credits: (n) => `${n} ${Number(n) > 1 ? 'crédits' : 'crédit'}`,
  programPage: 'Page du programme',
  sourceNamed: (label) => `Source : ${label}`,
  showMore: (n) => `Afficher ${n} de plus`,
  showFewer: 'Afficher moins',
  showMoreSections: (n) => `Afficher ${n} ${n > 1 ? 'sections' : 'section'} de plus`,
  showFewerSections: 'Afficher moins de sections',
  source: 'Source',
  sources: 'Sources',
  glance: 'En un coup d’œil',
  onPage: 'Sur cette page',
  correction: 'Proposer une correction',
  open: 'Ouvert maintenant',
  closing: (n) => (n === 1 ? '1 jour restant' : `${n} jours restants`),
  opening: (n) => (n === 1 ? 'Ouvre dans 1 jour' : `Ouvre dans ${n} jours`),
  closed: 'Clôturé',
  closes: (d) => `Clôture le ${d}`,
  opensOn: (d) => `Ouvre le ${d}`,
  applyBy: 'Postuler avant le',
  closesTba: 'Date de clôture à annoncer',
  showClosed: (n) => `Afficher ${n} ${n > 1 ? 'périodes closes' : 'période close'}`,
  hideClosed: 'Masquer les périodes closes',
};

const STRINGS: Record<string, GuideStrings> = {en, ar: arStrings, fr: frStrings};

export function useGuide(): {s: GuideStrings; locale: string} {
  const {i18n} = useDocusaurusContext();
  const locale = i18n.currentLocale;
  return {s: STRINGS[locale] ?? en, locale};
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : locale, {
    day: 'numeric',
    month: 'short',
    numberingSystem: 'latn',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatDateFull(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    numberingSystem: 'latn',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}
