(function () {
  'use strict';

  const DATA = window.UNIVERSITY_MOCKUP;
  const MOCK_UNIS = ['aub', 'aust', 'usj'];
  const FORM =
    'https://docs.google.com/forms/d/e/1FAIpQLScUnf_qsTZXRX5CKP1KkK_Yy5VuhkUBjo988FNbqSzzYz301w/viewform?usp=dialog';
  const PROGRAMS_SHOWN = 8;
  const ROWS_LIMIT = 8;
  const ROWS_SHOWN = 6;
  const SECTION_ROWS_LIMIT = 14;
  const SECTION_HEADINGS_SHOWN = 3;
  const CLOSING_SOON_DAYS = 30;

  const PATHS = {
    arrowUpRight: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="8,7 17,7 17,16"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    cap: '<polygon points="12,5 22,9.5 12,14 2,9.5"/><path d="M6 11.3v4.4c0 1.6 2.7 2.8 6 2.8s6-1.2 6-2.8v-4.4"/><line x1="21" y1="10" x2="21" y2="15"/>',
    calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8.5" y1="3" x2="8.5" y2="7"/><line x1="15.5" y1="3" x2="15.5" y2="7"/>',
    star: '<polygon points="12,3.5 14.6,9 20.5,9.8 16.2,13.9 17.3,19.8 12,17 6.7,19.8 7.8,13.9 3.5,9.8 9.4,9"/>',
    shieldCheck: '<path d="M12 3l7.5 2.8v5.9c0 4.2-3 7.5-7.5 9.3-4.5-1.8-7.5-5.1-7.5-9.3V5.8z"/><polyline points="8.6,12 11,14.4 15.6,9.8"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><polyline points="4.5,7.5 12,13 19.5,7.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3.2" y1="9.5" x2="20.8" y2="9.5"/><line x1="3.2" y1="14.5" x2="20.8" y2="14.5"/>',
    layers: '<polygon points="12,3 21,7.5 12,12 3,7.5"/><polyline points="3,12.5 12,17 21,12.5"/><polyline points="3,16.5 12,21 21,16.5"/>',
    wallet: '<rect x="3.5" y="6.5" width="17" height="13" rx="2.5"/><path d="M20.5 11h-4a1.5 1.5 0 0 0 0 3h4"/><path d="M6 6.5l9.5-3 1 3"/>',
    receipt: '<path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z"/><line x1="9" y1="8.5" x2="15" y2="8.5"/><line x1="9" y1="12" x2="15" y2="12"/>',
    chevronDown: '<polyline points="6,9 12,15 18,9"/>',
    menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="0.5" fill="currentColor"/>',
    alert: '<path d="M12 4 21.5 20h-19z"/><line x1="12" y1="10" x2="12" y2="14.5"/><circle cx="12" cy="17.3" r="0.5" fill="currentColor"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  };

  const SECTION_LOOK = {
    faculty: ['cap', 'green'],
    application: ['calendar', 'blue'],
    tuition: ['wallet', 'orange'],
    scholarships: ['star', 'purple'],
    requirements: ['shieldCheck', 'green'],
    contacts: ['mail', 'blue'],
  };

  // Arabic number agreement: one, two, 3–10, 11–99, other.
  function ar(n, forms) {
    const m = n % 100;
    if (n === 1) return forms[0];
    if (n === 2) return forms[1];
    if (m >= 3 && m <= 10) return forms[2];
    if (m >= 11 && m <= 99) return forms[3];
    return forms[4];
  }

  const STRINGS = {
    en: {
      nav: ['Universities', 'Scholarships', 'Stories', 'Contribute'],
      search: 'Search',
      menu: 'Menu',
      theme: 'Switch between dark and light mode',
      notInMockup: 'Not part of this mockup',
      year: (y) => `${y} information`,
      apply: (host) => `Apply on ${host}`,
      applyShort: 'Apply',
      applyNow: 'Apply now',
      programsIn: (n, units) =>
        units > 1 && units <= 12 ? `programs in ${units} faculties` : n === 1 ? 'program listed' : 'programs listed',
      applications: (host) => `Applications: ${host}`,
      programsCount: (n) => `${n} ${n === 1 ? 'program' : 'programs'}`,
      scholarshipsCount: (n) => `${n} listed`,
      perCredit: 'per credit',
      perCreditNotes: 'per credit, see the notes',
      chips: {
        faculty: 'Programs',
        application: 'Apply',
        tuition: 'Tuition',
        scholarships: 'Scholarships',
        requirements: 'Requirements',
        contacts: 'Contact',
      },
      searchPrograms: (n) => `Search ${n} programs`,
      facultyFilter: 'Filter by faculty',
      allFaculties: (n) => `All faculties (${n})`,
      shown: (a, n) => `${a} of ${n} programs`,
      showAllPrograms: (n) => `Show all ${n} programs`,
      showFewerPrograms: 'Show fewer programs',
      noMatch: (q) => `No program matches “${q}”.`,
      clear: 'Clear the search',
      years: (n) => `${n} ${Number(n) === 1 ? 'year' : 'years'}`,
      credits: (n) => `${n} credits`,
      programPage: 'Program page',
      sourceNamed: (label) => `Source: ${label}`,
      showMore: (n) => `Show ${n} more`,
      showFewer: 'Show fewer',
      showMoreSections: (n) => `Show ${n} more ${n === 1 ? 'section' : 'sections'}`,
      showFewerSections: 'Show fewer sections',
      source: 'Source',
      sources: 'Sources',
      glance: 'At a glance',
      onPage: 'On this page',
      correction: 'Suggest a correction',
      open: 'Open now',
      closing: (n) => (n === 1 ? '1 day left' : `${n} days left`),
      opening: (n) => (n === 1 ? 'Opens in 1 day' : `Opens in ${n} days`),
      closed: 'Closed',
      closes: (d) => `Closes ${d}`,
      opensOn: (d) => `Opens ${d}`,
      ai: 'Ask AI',
      aiTitle: 'Opens the Collegesaurus chat on the live site',
      footerTag: 'A free, student-built guide to universities and scholarships in Lebanon.',
      footerDisclaimer:
        'An independent student project, not affiliated with any university or scholarship provider.',
    },
    ar: {
      nav: ['الجامعات', 'المنح الدراسية', 'قصص', 'ساهم'],
      search: 'ابحث',
      menu: 'القائمة',
      theme: 'التبديل بين الوضعين الداكن والفاتح',
      notInMockup: 'ليست ضمن هذا النموذج',
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
      scholarshipsCount: (n) => `${n} ${ar(n, ['منحة', 'منحتان', 'منح', 'منحة', 'منحة'])}`,
      perCredit: 'للساعة المعتمدة',
      perCreditNotes: 'للساعة المعتمدة، راجع الملاحظات',
      chips: {
        faculty: 'البرامج',
        application: 'التقديم',
        tuition: 'الأقساط',
        scholarships: 'المنح',
        requirements: 'المتطلبات',
        contacts: 'التواصل',
      },
      searchPrograms: (n) => `ابحث في ${n} ${ar(n, ['برنامج', 'برنامجين', 'برامج', 'برنامجًا', 'برنامج'])}`,
      facultyFilter: 'تصفية حسب الكلية',
      allFaculties: (n) => `كل الكليات (${n})`,
      shown: (a, n) => `${a} من ${n}`,
      showAllPrograms: (n) => `اعرض كل البرامج (${n})`,
      showFewerPrograms: 'اعرض برامج أقل',
      noMatch: (q) => `لا يوجد برنامج يطابق «${q}».`,
      clear: 'امسح البحث',
      years: (n) => {
        const v = Number(n);
        if (v === 1) return 'سنة واحدة';
        if (v === 2) return 'سنتان';
        return `${n} ${ar(v, ['سنة', 'سنتان', 'سنوات', 'سنة', 'سنة'])}`;
      },
      credits: (n) => `${n} ${ar(Number(n), ['ساعة معتمدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة', 'ساعة معتمدة'])}`,
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
      ai: 'اسأل الآن',
      aiTitle: 'يفتح محادثة Collegesaurus على الموقع الفعلي',
      footerTag: 'دليل مجاني إلى الجامعات والمنح الدراسية في لبنان، أعدّه طلاب.',
      footerDisclaimer: 'مشروع طلابي مستقل، غير تابع لأي جامعة أو جهة مانحة.',
    },
  };

  let state = readState();
  let seq = 0;
  let explorers = {};

  const $ = (sel) => document.querySelector(sel);
  const S = () => STRINGS[state.lang];
  const current = () => DATA.docs[state.u][state.lang];

  function readState() {
    const q = new URLSearchParams(location.search);
    const stored = (key) => {
      try {
        return localStorage.getItem(`mockup.${key}`);
      } catch (e) {
        return null;
      }
    };
    const pick = (key, allowed, fallback) => {
      const value = q.get(key) || stored(key);
      return allowed.includes(value) ? value : fallback;
    };
    return {
      u: pick('u', MOCK_UNIS, 'aub'),
      lang: pick('lang', ['en', 'ar'], 'en'),
      theme: pick('theme', ['auto', 'light', 'dark'], 'auto'),
    };
  }

  function saveState() {
    try {
      ['u', 'lang', 'theme'].forEach((key) => localStorage.setItem(`mockup.${key}`, state[key]));
    } catch (e) {
      // Storage can be unavailable (private windows, file:// in some browsers).
    }
    const q = new URLSearchParams(location.search);
    ['u', 'lang', 'theme'].forEach((key) => q.set(key, state[key]));
    history.replaceState(null, '', `?${q.toString()}${location.hash}`);
  }

  const esc = (value) =>
    String(value).replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

  function icon(name, size = 20, cls = '') {
    return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
  }

  const ext = (size = 16) => icon('arrowUpRight', size, 'flip');
  const chip = (name, tint, round = false) =>
    `<span class="chip tint-${tint}${round ? ' round' : ''}">${icon(name, 18)}</span>`;
  const uid = () => `m${++seq}`;
  const norm = (text) => String(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const shortYear = (y) => String(y).replace(/^(\d{4})-\d{2}(\d{2})$/, '$1–$2');
  const isDark = () =>
    state.theme === 'dark' || (state.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);

  function fmtDate(iso) {
    const locale = state.lang === 'ar' ? 'ar-LB' : 'en';
    return new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'short', numberingSystem: 'latn', timeZone: 'UTC'}).format(
      new Date(`${iso}T00:00:00Z`),
    );
  }

  function daysUntil(from, iso) {
    const target = Date.parse(`${iso}T00:00:00Z`);
    const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    return Math.round((target - start) / 86400000);
  }

  // Same rules as the homepage's UpcomingDeadlines/status.ts.
  function deadlineStatus(deadline, now) {
    const toClose = daysUntil(now, deadline.closes);
    if (toClose < 0) return {kind: 'closed'};
    if (deadline.opens) {
      const toOpen = daysUntil(now, deadline.opens);
      if (toOpen > 0) return {kind: 'opening', days: toOpen};
    }
    if (toClose <= CLOSING_SOON_DAYS) return {kind: 'closing', days: toClose};
    return deadline.opens ? {kind: 'open'} : {kind: 'date'};
  }

  function money(t) {
    const one = (v) => (t.currency.length > 1 ? `${t.currency} ${v.toLocaleString('en')}` : `${t.currency}${v.toLocaleString('en')}`);
    return t.min === t.max ? one(t.min) : `${one(t.min)}–${one(t.max)}`;
  }

  function extLink(url, html, cls = '') {
    return `<a${cls ? ` class="${cls}"` : ''} href="${esc(url)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
  }

  function refIcon(ref, s) {
    return `<a class="ref" href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer" title="${esc(ref.label)}" aria-label="${esc(s.sourceNamed(ref.label))}">${ext(16)}</a>`;
  }

  function sectionLabel(sec, s) {
    return s.chips[sec.key] || sec.heading;
  }

  function sectionId(d, key) {
    const sec = d.sections.find((x) => x.key === key);
    return sec ? `#${sec.id}` : '#';
  }

  // ------------------------------------------------------------------
  // Facts: every one is derived at build time, and omitted when it isn't
  // ------------------------------------------------------------------

  function buildFacts(d, s, now) {
    const f = d.facts;
    const list = [];
    if (f.deadline) {
      const status = deadlineStatus(f.deadline, now);
      const pills = {
        open: ['pill-open', s.open],
        closing: ['pill-soon', s.closing(status.days)],
        opening: ['pill-neutral', s.opening(status.days)],
        closed: ['pill-neutral', s.closed],
        date: ['pill-neutral', s.closes(fmtDate(f.deadline.closes))],
      };
      const [cls, text] = pills[status.kind];
      const label =
        status.kind === 'open' || status.kind === 'closing'
          ? s.closes(fmtDate(f.deadline.closes))
          : status.kind === 'opening'
            ? s.opensOn(fmtDate(f.deadline.opens))
            : '';
      list.push({
        icon: 'calendar',
        tint: 'blue',
        pill: `<span class="pill ${cls}">${esc(text)}</span>`,
        label: f.deadline.title[state.lang],
        label2: label,
        href: sectionId(d, 'application'),
      });
    }
    list.push({
      icon: 'cap',
      tint: 'green',
      value: String(f.programs.count),
      label: s.programsIn(f.programs.count, f.programs.units),
      href: sectionId(d, 'faculty'),
    });
    if (f.fee) {
      list.push({icon: 'receipt', tint: 'blue', value: f.fee.value, label: f.fee.label, href: sectionId(d, 'application')});
    }
    if (f.tuition) {
      list.push({
        icon: 'wallet',
        tint: 'orange',
        value: money(f.tuition),
        label: f.tuition.notes ? s.perCreditNotes : s.perCredit,
        href: sectionId(d, 'tuition'),
      });
    }
    if (list.length < 4 && f.contact) {
      list.push({
        icon: 'mail',
        tint: 'blue',
        value: f.contact.email || f.contact.phone,
        label: f.contact.office,
        href: sectionId(d, 'contacts'),
        small: true,
      });
    }
    return list;
  }

  function factInner(fact) {
    const value = fact.value
      ? `<span class="fact-value${fact.small ? ' small' : ''}"><bdi dir="ltr">${esc(fact.value)}</bdi></span>`
      : '';
    const labels = [fact.label, fact.label2].filter(Boolean).map((l) => `<span class="fact-label">${esc(l)}</span>`).join('');
    return `${chip(fact.icon, fact.tint)}<span class="fact-text">${fact.pill || ''}${value}${labels}</span>`;
  }

  // ------------------------------------------------------------------
  // Page regions
  // ------------------------------------------------------------------

  function mockbarHtml() {
    const seg = (name, label, options) =>
      `<span class="group">${label}<span class="seg" role="group" aria-label="${label}">${options
        .map(
          ([value, text]) =>
            `<button type="button" data-set="${name}" data-value="${value}" aria-pressed="${state[name] === value}">${text}</button>`,
        )
        .join('')}</span></span>`;
    return `<span class="mock-note"><strong>Mockup of option A, the Guidebook.</strong> Built from the ${esc(DATA.snapshot.version)} Drive sync of ${esc(DATA.snapshot.synced)}; nothing here is live. <a href="README.md">Read the proposal</a></span>${seg('u', 'University', [
      ['aub', 'AUB'],
      ['aust', 'AUST'],
      ['usj', 'USJ'],
    ])}${seg('lang', 'Language', [
      ['en', 'English'],
      ['ar', 'العربية'],
    ])}${seg('theme', 'Theme', [
      ['auto', 'Auto'],
      ['light', 'Light'],
      ['dark', 'Dark'],
    ])}`;
  }

  function navbarHtml(s) {
    return `<button class="icon-btn plain nav-menu" type="button" aria-label="${esc(s.menu)}" aria-expanded="false" data-drawer>${icon('menu', 24)}</button>
      <a class="brand" href="#top" data-inert><img src="../../static/img/logo.svg" alt="" width="32" height="32"><span>Collegesaurus</span></a>
      <ul class="nav-links">${s.nav
        .map((label, i) => `<li><a href="#" data-inert${i === 0 ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`)
        .join('')}</ul>
      <span class="nav-spacer"></span>
      <span class="nav-item">${esc(DATA.snapshot.version)} ${icon('chevronDown', 16)}</span>
      <button class="nav-item" type="button" data-set="lang" data-value="${state.lang === 'en' ? 'ar' : 'en'}">${icon('globe', 18)} ${state.lang === 'en' ? 'English' : 'العربية'} ${icon('chevronDown', 16)}</button>
      <button class="nav-item nav-theme" type="button" data-set="theme" data-value="${isDark() ? 'light' : 'dark'}" aria-label="${esc(s.theme)}">${icon(isDark() ? 'sun' : 'moon', 20)}</button>
      <span class="nav-search">${icon('search', 16)} ${esc(s.search)}</span>
      <button class="icon-btn nav-search-btn" type="button" aria-label="${esc(s.search)}" data-inert>${icon('search', 20)}</button>`;
  }

  function universityListHtml(s) {
    return `<ul class="uni-list">${DATA.sidebar[state.lang]
      .map((item) =>
        MOCK_UNIS.includes(item.slug)
          ? `<li><a href="?u=${item.slug}&amp;lang=${state.lang}&amp;theme=${state.theme}" data-set="u" data-value="${item.slug}"${
              item.slug === state.u ? ' aria-current="page"' : ''
            }>${esc(item.label)}</a></li>`
          : `<li><span title="${esc(s.notInMockup)}">${esc(item.label)}</span></li>`,
      )
      .join('')}</ul>`;
  }

  function applyButton(d, s) {
    if (!d.applyUrl) return '';
    return extLink(d.applyUrl, `<span>${s.apply(`<bdi>${esc(d.applyHost)}</bdi>`)}</span>${ext(18)}`, 'apply-btn');
  }

  function headerHtml(d, logo, s) {
    const match = (d.h1 || '').match(/^(.*?)\s*\((.+)\)\s*$/);
    let alt = '';
    if (match) {
      const inner = match[2].replace(/\s*[—–]\s*[^—–]*$/, '').trim();
      if (inner && inner !== d.shortName && norm(inner) !== norm(d.fullName)) alt = inner;
    }
    const mark = logo
      ? `<div class="mark${logo.tone === 'dark' ? ' tone-dark' : ''}"><img src="../../static/img/universities/${esc(logo.file)}" alt="" decoding="async"></div>`
      : `<div class="mark"><strong>${esc(d.shortName)}</strong></div>`;
    const meta = d.stale
      ? `<p class="stale" role="note">${icon('alert', 18)}<span><strong>${esc(d.stale.title)}.</strong> ${d.stale.html}</span></p>`
      : `<div class="uni-meta"><span class="year-chip">${icon('calendar', 16)} ${s.year(`<bdi dir="ltr">${esc(shortYear(d.contentYear))}</bdi>`)}</span>${
          d.applyHost ? `<span class="uni-host">${s.applications(`<bdi>${esc(d.applyHost)}</bdi>`)}</span>` : ''
        }</div>`;
    return `<header class="uni-head">
      ${mark}
      <div class="uni-id">
        <p class="uni-short">${esc(d.shortName)}</p>
        <h1 class="uni-name" id="top">${esc(d.fullName)}</h1>
        ${alt ? `<p class="uni-alt" dir="auto"><bdi>${esc(alt)}</bdi></p>` : ''}
      </div>
      ${meta}
      ${applyButton(d, s)}
    </header>`;
  }

  function tilesHtml(facts) {
    return `<ul class="facts">${facts.map((f) => `<li class="fact"><a href="${esc(f.href)}">${factInner(f)}</a></li>`).join('')}</ul>`;
  }

  function chipsHtml(d, s) {
    const links = d.sections
      .map((sec) => `<a href="#${esc(sec.id)}" data-sec="${esc(sec.id)}">${esc(sectionLabel(sec, s))}</a>`)
      .join('');
    const apply = d.applyUrl ? extLink(d.applyUrl, `<span>${esc(s.applyShort)}</span>${ext(15)}`, 'chip-apply') : '';
    return `<nav class="chips" aria-label="${esc(s.onPage)}">${links}${apply}</nav>`;
  }

  function railHtml(d, s, facts) {
    const nav = d.sections
      .map((sec) => {
        const [name, tint] = SECTION_LOOK[sec.key] || ['layers', 'neutral'];
        return `<a href="#${esc(sec.id)}" data-sec="${esc(sec.id)}">${chip(name, tint)}<span>${esc(sectionLabel(sec, s))}</span></a>`;
      })
      .join('');
    const apply = d.applyUrl
      ? `${extLink(d.applyUrl, `<span>${esc(s.applyNow)}</span>${ext(18)}`, 'apply-btn')}<p class="rail-host"><bdi>${esc(d.applyHost)}</bdi></p>`
      : '';
    return `<div class="rail-card">
      ${apply}
      ${d.stale ? `<p class="rail-stale">${icon('alert', 16)}<span>${esc(d.stale.title)}</span></p>` : ''}
      <h2>${esc(s.glance)}</h2>
      <ul class="rail-facts">${facts.map((f) => `<li><a href="${esc(f.href)}">${factInner(f)}</a></li>`).join('')}</ul>
      <h2>${esc(s.onPage)}</h2>
      <nav class="rail-nav" aria-label="${esc(s.onPage)}">${nav}</nav>
      ${extLink(FORM, `${esc(s.correction)} ${ext(14)}`, 'correction')}
    </div>`;
  }

  // ------------------------------------------------------------------
  // Sections and blocks
  // ------------------------------------------------------------------

  function sectionHtml(d, sec, s) {
    const [name, tint] = SECTION_LOOK[sec.key] || ['layers', 'neutral'];
    let count = '';
    if (sec.key === 'faculty') count = String(d.facts.programs.count);
    if (sec.key === 'scholarships' && d.facts.scholarships) count = String(d.facts.scholarships);
    const hasPrograms = sec.blocks.some((b) => b.t === 'faculty');
    const title = sec.key === 'faculty' ? s.chips.faculty : sec.heading;
    return `<section class="sec" data-sec="${esc(sec.id)}" aria-labelledby="${esc(sec.id)}">
      <div class="sec-head">${chip(name, tint, true)}<h2 id="${esc(sec.id)}">${esc(title)}</h2>${
        count ? `<span class="sec-count">${esc(count)}</span>` : ''
      }</div>
      <div class="sec-body">${hasPrograms ? programsHtml(sec, s) : blocksHtml(sec.blocks, s)}</div>
    </section>`;
  }

  function moreButton(target, more, fewer) {
    return `<button class="more-btn" type="button" aria-expanded="false" aria-controls="${target}" data-more="${target}" data-more-label="${esc(more)}" data-fewer-label="${esc(fewer)}"><span>${esc(more)}</span>${icon('chevronDown', 18)}</button>`;
  }

  function blocksHtml(blocks, s) {
    const headings = blocks.map((b, i) => (b.t === 'h' ? i : -1)).filter((i) => i >= 0);
    const rows = blocks.reduce((n, b) => n + (b.rows ? b.rows.length : 0) + (b.items ? b.items.length : 0), 0);
    const render = (list) => list.map((b) => blockHtml(b, s)).join('');
    if (headings.length <= SECTION_HEADINGS_SHOWN || rows <= SECTION_ROWS_LIMIT) return render(blocks);
    const cut = headings[SECTION_HEADINGS_SHOWN];
    const id = uid();
    const hidden = headings.length - SECTION_HEADINGS_SHOWN;
    return `${render(blocks.slice(0, cut))}<div class="overflow" id="${id}" hidden="until-found">${render(
      blocks.slice(cut),
    )}</div>${moreButton(id, s.showMoreSections(hidden), s.showFewerSections)}`;
  }

  function blockHtml(b, s) {
    switch (b.t) {
      case 'p':
        return `<p>${b.html}</p>`;
      case 'lead':
        return `<p class="lead-in">${b.html}</p>`;
      case 'h': {
        const tag = b.level <= 3 ? 'h3' : b.level === 4 ? 'h4' : 'h5';
        return `<${tag} id="${esc(b.id)}">${b.html}</${tag}>`;
      }
      case 'ul':
      case 'ol':
        return `<${b.t} class="prose">${b.items.map((item) => `<li>${item}</li>`).join('')}</${b.t}>`;
      case 'note':
        return `<aside class="note">${icon('info', 18)}<div>${b.paras.map((p) => `<p>${p}</p>`).join('')}</div></aside>`;
      case 'sources':
        return sourcesHtml(b.links, s);
      case 'table':
        return tableHtml(b, s);
      case 'faculty':
        return `<h3 id="${esc(b.id)}">${b.html}</h3><ul class="px-list">${b.rows.map((r) => programHtml(r, s)).join('')}</ul>`;
      default:
        return '';
    }
  }

  function sourcesHtml(links, s) {
    const label = links.length > 1 ? s.sources : s.source;
    return `<p class="src"><span>${esc(label)}:</span>${links
      .map((link) => extLink(link.url, `${esc(link.label)}${ext(14)}`))
      .join('')}</p>`;
  }

  function tableHtml(b, s) {
    const n = b.rows.length;
    const split = n > ROWS_LIMIT ? ROWS_SHOWN : n;
    const id = uid();
    const render = b.shape === 'wide' ? wideHtml : b.shape === 'kv' ? kvHtml : listHtml;
    let out = render(b, split, id, s);
    if (split < n) out += moreButton(id, s.showMore(n - split), s.showFewer);
    if (b.sharedRef) out += sourcesHtml([b.sharedRef], s);
    return out;
  }

  function refExtra(b, i, s) {
    const ref = b.refs[i];
    if (!ref) return '';
    return ref.url ? refIcon(ref, s) : `<span class="kv-note">${ref.html}</span>`;
  }

  // Both halves of a split table share one colgroup so their columns line up.
  function colgroup(b) {
    const weights = b.head.map((head, j) => {
      const lengths = b.cells.map((row) => (row[j] || '').length);
      const avg = lengths.reduce((a, v) => a + v, 0) / Math.max(1, lengths.length);
      return Math.min(42, Math.max(8, avg, head.length * 0.8));
    });
    const total = weights.reduce((a, v) => a + v, 0);
    return `<colgroup>${weights.map((w) => `<col style="width:${((w / total) * 100).toFixed(1)}%">`).join('')}</colgroup>`;
  }

  function wideHtml(b, split, id, s) {
    const cols = colgroup(b);
    const head = `<thead><tr>${b.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>`;
    const row = (r, i) =>
      `<tr>${r
        .map((cell, j) => {
          const text = b.cells[i][j] || '';
          const cls = [/^[—–-]?$/.test(text) ? 'empty' : '', text.length > 42 ? 'wide-cell' : ''].filter(Boolean).join(' ');
          return `<td${cls ? ` class="${cls}"` : ''} data-label="${esc(b.head[j])}">${cell}${j === 0 ? refExtra(b, i, s) : ''}</td>`;
        })
        .join('')}</tr>`;
    const rows = b.rows.map(row);
    const table = (body, withHead) =>
      `<table style="table-layout:fixed">${cols}${withHead ? head : ''}<tbody>${body}</tbody></table>`;
    const first = `<div class="t-wide">${table(rows.slice(0, split).join(''), true)}</div>`;
    if (split >= rows.length) return first;
    return `${first}<div class="t-wide overflow" id="${id}" hidden="until-found">${table(rows.slice(split).join(''), false)}</div>`;
  }

  function kvHead(b) {
    if (b.head.length < 2) return '';
    return `<p class="kv-head"><span>${esc(b.head[0])}</span><span>${esc(b.head[1])}</span></p>`;
  }

  function kvHtml(b, split, id, s) {
    const plainNote = /^(notes?|ملاحظات)$/i;
    const row = (r, i) => {
      const third =
        r.length > 2 && b.cells[i][2]
          ? `<span class="kv-note">${plainNote.test(b.head[2]) ? '' : `${esc(b.head[2])}: `}${r[2]}</span>`
          : '';
      const ref = b.refs[i];
      const refText = ref && ref.html ? `<span class="kv-note">${ref.html}</span>` : '';
      const refLink = ref && ref.url ? refIcon(ref, s) : '';
      return `<div class="kv-row"><dt>${r[0]}${third}${refText}</dt><dd>${r[1] !== undefined ? r[1] : ''}${refLink}</dd></div>`;
    };
    const rows = b.rows.map(row);
    const first = `${kvHead(b)}<dl class="t-kv">${rows.slice(0, split).join('')}</dl>`;
    if (split >= rows.length) return first;
    return `${first}<dl class="t-kv overflow" id="${id}" hidden="until-found">${rows.slice(split).join('')}</dl>`;
  }

  function listHtml(b, split, id, s) {
    const row = (r, i) => {
      const ref = b.refs[i];
      const aside = ref ? (ref.url ? extLink(ref.url, `${esc(ref.label)}${ext(14)}`) : ref.html) : '';
      return `<li><span>${r[0]}</span>${aside ? `<span class="aside">${aside}</span>` : ''}</li>`;
    };
    const rows = b.rows.map(row);
    const head = `<p class="kv-head"><span>${esc(b.head[0])}</span></p>`;
    const first = `${head}<ul class="t-list">${rows.slice(0, split).join('')}</ul>`;
    if (split >= rows.length) return first;
    return `${first}<ul class="t-list overflow" id="${id}" hidden="until-found">${rows.slice(split).join('')}</ul>`;
  }

  // ------------------------------------------------------------------
  // Programs explorer: filters rows inside the faculty groups
  // ------------------------------------------------------------------

  function programHtml(r, s) {
    const name = state.lang === 'ar' ? `<bdi>${esc(r.program)}</bdi>` : esc(r.program);
    const dept =
      r.department && !norm(r.program).includes(norm(r.department)) ? `<span>${esc(r.department)}</span>` : '';
    const meta = [
      r.degree ? `<span class="deg">${esc(r.degree)}</span>` : '',
      r.years ? `<span>${esc(s.years(r.years))}</span>` : '',
      r.credits ? `<span>${esc(s.credits(r.credits))}</span>` : '',
      r.language ? `<span>${esc(r.language)}</span>` : '',
    ].join('');
    const link = r.source
      ? `<a class="ref" href="${esc(r.source)}" target="_blank" rel="noopener noreferrer" title="${esc(s.programPage)}" aria-label="${esc(`${s.programPage}: ${r.program}`)}">${ext(16)}</a>`
      : '';
    return `<li class="prog"><span class="prog-name">${name}${dept ? `<span class="prog-dept">${dept}</span>` : ''}</span><span class="prog-meta">${meta}</span>${link}</li>`;
  }

  function programsHtml(sec, s) {
    const intro = [];
    const after = [];
    const groups = [];
    sec.blocks.forEach((b) => {
      if (b.t === 'faculty') groups.push(b);
      else (groups.length ? after : intro).push(b);
    });
    const total = groups.reduce((n, g) => n + g.rows.length, 0);
    const id = uid();
    explorers[id] = {groups, total, query: '', group: '', expanded: false};
    const options = groups
      .map((g, i) => `<option value="${i}">${esc(g.abbr ? `${g.name} (${g.abbr})` : g.name)}: ${g.rows.length}</option>`)
      .join('');
    return `${intro.length ? `<div class="about">${blocksHtml(intro, s)}</div>` : ''}
      <div class="px" data-px="${id}">
        <div class="px-tools">
          <label class="px-search">${icon('search', 18)}<input type="search" data-px-q placeholder="${esc(
            s.searchPrograms(total),
          )}" aria-label="${esc(s.searchPrograms(total))}" autocomplete="off"></label>
          ${
            groups.length > 1
              ? `<select class="px-select" data-px-g aria-label="${esc(s.facultyFilter)}"><option value="">${esc(
                  s.allFaculties(groups.length),
                )}</option>${options}</select>`
              : ''
          }
        </div>
        <p class="px-count" aria-live="polite" data-px-count></p>
        <div data-px-groups>${groupsHtml(explorers[id], s)}</div>
        <p class="px-empty" data-px-empty hidden></p>
        <button class="more-btn" type="button" aria-expanded="false" data-px-toggle><span></span>${icon('chevronDown', 18)}</button>
      </div>
      ${blocksHtml(after, s)}`;
  }

  function groupsHtml(px, s) {
    const q = norm(px.query.trim());
    const filtering = q !== '' || px.group !== '';
    let budget = filtering || px.expanded ? Infinity : PROGRAMS_SHOWN;
    let matches = 0;
    const html = px.groups
      .map((g, gi) => {
        if (px.group !== '' && String(gi) !== px.group) return '';
        const rows = g.rows.filter(
          (r) => !q || norm([r.program, r.degree, r.department, r.language].filter(Boolean).join(' ')).includes(q),
        );
        if (!rows.length) return '';
        matches += rows.length;
        const visible = Math.max(0, Math.min(rows.length, budget));
        budget -= visible;
        const items = rows.map((r) => programHtml(r, s));
        const head = `<h3 id="${esc(g.id)}"><span>${g.html}</span><span class="fac-count">${esc(s.programsCount(g.rows.length))}</span></h3>`;
        if (visible === 0) {
          return `<div class="px-group overflow" hidden="until-found" data-px-more>${head}<ul class="px-list">${items.join('')}</ul></div>`;
        }
        const rest = items.slice(visible).join('');
        return `<div class="px-group">${head}<ul class="px-list">${items.slice(0, visible).join('')}</ul>${
          rest ? `<ul class="px-list overflow" hidden="until-found" data-px-more>${rest}</ul>` : ''
        }</div>`;
      })
      .join('');
    px.matches = matches;
    return html;
  }

  function syncExplorer(el, px) {
    const s = S();
    const filtering = px.query.trim() !== '' || px.group !== '';
    const count = el.querySelector('[data-px-count]');
    const empty = el.querySelector('[data-px-empty]');
    const toggle = el.querySelector('[data-px-toggle]');
    count.textContent = filtering ? s.shown(px.matches, px.total) : '';
    count.hidden = !filtering;
    empty.hidden = !(filtering && px.matches === 0);
    empty.innerHTML = empty.hidden ? '' : `${esc(s.noMatch(px.query.trim()))}<button type="button" data-px-clear>${esc(s.clear)}</button>`;
    toggle.hidden = filtering || px.total <= PROGRAMS_SHOWN;
    toggle.setAttribute('aria-expanded', String(px.expanded));
    toggle.querySelector('span').textContent = px.expanded ? s.showFewerPrograms : s.showAllPrograms(px.total);
  }

  function bindExplorers(root) {
    root.querySelectorAll('[data-px]').forEach((el) => {
      const px = explorers[el.dataset.px];
      const input = el.querySelector('[data-px-q]');
      const select = el.querySelector('[data-px-g]');
      const redraw = () => {
        el.querySelector('[data-px-groups]').innerHTML = groupsHtml(px, S());
        syncExplorer(el, px);
      };
      input.addEventListener('input', () => {
        px.query = input.value;
        redraw();
      });
      if (select) {
        select.addEventListener('change', () => {
          px.group = select.value;
          redraw();
        });
      }
      el.addEventListener('click', (event) => {
        if (event.target.closest('[data-px-toggle]')) {
          px.expanded = !px.expanded;
          redraw();
          if (!px.expanded) el.scrollIntoView({block: 'start'});
        }
        if (event.target.closest('[data-px-clear]')) {
          px.query = '';
          px.group = '';
          input.value = '';
          if (select) select.value = '';
          redraw();
          input.focus();
        }
      });
      // Find-in-page or a link is about to reveal a hidden program: open the rest with it.
      el.addEventListener('beforematch', () => {
        px.expanded = true;
        el.querySelectorAll('[data-px-more]').forEach((node) => node.removeAttribute('hidden'));
        syncExplorer(el, px);
      });
      syncExplorer(el, px);
    });
  }

  // ------------------------------------------------------------------
  // Show more, deep links, scrollspy
  // ------------------------------------------------------------------

  function setMore(button, open) {
    button.setAttribute('aria-expanded', String(open));
    button.querySelector('span').textContent = open ? button.dataset.fewerLabel : button.dataset.moreLabel;
  }

  function reveal(node) {
    const explorer = node.closest('[data-px]');
    if (explorer) {
      const px = explorers[explorer.dataset.px];
      px.expanded = true;
      explorer.querySelectorAll('[data-px-more]').forEach((x) => x.removeAttribute('hidden'));
      syncExplorer(explorer, px);
      return;
    }
    node.removeAttribute('hidden');
    const button = node.id && document.querySelector(`[data-more="${node.id}"]`);
    if (button) setMore(button, true);
  }

  function openTarget(id, scroll) {
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    let hidden = target.closest('[hidden]');
    while (hidden) {
      reveal(hidden);
      hidden = target.closest('[hidden]');
    }
    if (scroll) target.scrollIntoView({block: 'start'});
  }

  function sectionsInView() {
    const sections = [...document.querySelectorAll('.sec[data-sec]')];
    if (!sections.length) return;
    const line = (innerWidth >= 1280 ? 60 : 60 + 56) + 32;
    let active = sections[0].dataset.sec;
    sections.forEach((sec) => {
      if (sec.getBoundingClientRect().top - line <= 0) active = sec.dataset.sec;
    });
    document.querySelectorAll('.chips a[data-sec], .rail-nav a[data-sec]').forEach((a) => {
      const on = a.dataset.sec === active;
      a.setAttribute('aria-current', on ? 'true' : 'false');
      if (!on || !a.closest('.chips')) return;
      const bar = a.closest('.chips');
      const barBox = bar.getBoundingClientRect();
      const box = a.getBoundingClientRect();
      if (barBox.width && (box.left < barBox.left + 16 || box.right > barBox.right - 16)) {
        bar.scrollBy({left: box.left - barBox.left - (barBox.width - box.width) / 2, behavior: 'auto'});
      }
    });
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark() ? 'dark' : 'light');
  }

  function render() {
    seq = 0;
    explorers = {};
    const d = current();
    const s = S();
    const logo = DATA.docs[state.u].logo;
    applyTheme();
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = `${d.shortName}: ${d.fullName} | Guidebook mockup`;

    const bar = $('#mockbar');
    bar.innerHTML = mockbarHtml();
    bar.setAttribute('dir', 'ltr');
    bar.setAttribute('lang', 'en');
    $('#navbar').innerHTML = navbarHtml(s);
    $('#sidebar').innerHTML = universityListHtml(s);
    $('#sidebar').setAttribute('aria-label', s.nav[0]);
    $('#drawer').innerHTML = universityListHtml(s);

    const facts = buildFacts(d, s, new Date());
    const main = $('#main');
    main.innerHTML =
      headerHtml(d, logo, s) + tilesHtml(facts) + chipsHtml(d, s) + d.sections.map((sec) => sectionHtml(d, sec, s)).join('');
    $('#rail').innerHTML = railHtml(d, s, facts);
    $('#footer').innerHTML = `<p>${esc(s.footerTag)}</p><p>${esc(s.footerDisclaimer)}</p>`;
    const ai = $('#ai');
    ai.innerHTML = `<span aria-hidden="true">💬</span> ${esc(s.ai)}`;
    ai.title = s.aiTitle;

    bindExplorers(main);
    sectionsInView();
  }

  function set(key, value) {
    if (state[key] === value) return;
    state = {...state, [key]: value};
    saveState();
    const keepScroll = key === 'theme';
    const y = scrollY;
    render();
    if (keepScroll) scrollTo(0, y);
    else scrollTo(0, 0);
    $('#drawer').hidden = true;
  }

  document.addEventListener('click', (event) => {
    const setter = event.target.closest('[data-set]');
    if (setter) {
      event.preventDefault();
      set(setter.dataset.set, setter.dataset.value);
      return;
    }
    if (event.target.closest('[data-inert]')) {
      event.preventDefault();
      return;
    }
    const drawerButton = event.target.closest('[data-drawer]');
    if (drawerButton) {
      const drawer = $('#drawer');
      drawer.hidden = !drawer.hidden;
      drawerButton.setAttribute('aria-expanded', String(!drawer.hidden));
      return;
    }
    const more = event.target.closest('[data-more]');
    if (more) {
      const target = document.getElementById(more.dataset.more);
      const open = more.getAttribute('aria-expanded') !== 'true';
      if (open) target.removeAttribute('hidden');
      else target.setAttribute('hidden', 'until-found');
      setMore(more, open);
    }
  });

  document.addEventListener(
    'beforematch',
    (event) => {
      const overflow = event.target.closest('.overflow[id]');
      const button = overflow && document.querySelector(`[data-more="${overflow.id}"]`);
      if (button) setMore(button, true);
    },
    true,
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('#drawer').hidden) {
      $('#drawer').hidden = true;
      const button = document.querySelector('[data-drawer]');
      button.setAttribute('aria-expanded', 'false');
      button.focus();
    }
  });

  addEventListener('scroll', sectionsInView, {passive: true});
  addEventListener('resize', sectionsInView, {passive: true});
  addEventListener('hashchange', () => openTarget(decodeURIComponent(location.hash.slice(1)), true));
  addEventListener('beforeprint', () => {
    document.querySelectorAll('[hidden="until-found"]').forEach((node) => reveal(node));
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'auto') render();
  });

  render();
  if (location.hash) openTarget(decodeURIComponent(location.hash.slice(1)), true);
})();
