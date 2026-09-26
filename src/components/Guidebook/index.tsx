/**
 * The Guidebook layout of a university or scholarship page: header, key facts,
 * section chips (tabs on phones), the section cards from the MDX, and the "At
 * a glance" rail from 1280px. src/remark/remarkGuidebook.mjs builds the data.
 */
import {useEffect, useMemo, useRef, type ReactNode, type RefObject} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {translate} from '@docusaurus/Translate';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {deadlines} from '@site/src/data/homepage/deadlines';
import {UNIVERSITY_LOGOS} from '@site/src/data/homepage/logos';
import {deadlineStatus} from '@site/src/components/Homepage/UpcomingDeadlines/status';
import type {Deadline} from '@site/src/data/homepage/types';
import Icon, {type IconName} from '@site/src/components/Homepage/ui/Icon';
import {formatDate, useGuide, type GuideStrings} from './strings';
import {ApplyUrlContext, Chip, Ext, ExtLink, REVEAL, SECTION_LOOK, StatusPill, fill, useNow} from './parts';
import './guidebook.css';

const FORM =
  'https://docs.google.com/forms/d/e/1FAIpQLScUnf_qsTZXRX5CKP1KkK_Yy5VuhkUBjo988FNbqSzzYz301w/viewform?usp=dialog';

type UniversityFacts = {
  programs: {count: number; units: number};
  fee: {value: string; label: string} | null;
  tuition: {min: number; max: number; currency: string; notes: boolean} | null;
  contact: {office: string; phone: string | null; email: string | null} | null;
  scholarships: number | null;
};

type ScholarshipFacts = {
  provider: string | null;
  type: string | null;
  universities: number | null;
};

type GuideData = {
  kind: 'university' | 'scholarship';
  shortName: string;
  fullName: string;
  alt: string | null;
  applyUrl: string | null;
  applyHost: string | null;
  contentYear: string | null;
  notice: {type: string; title: string; text: string; href?: string} | null;
  sections: {id: string; key: string | null; title: string}[];
  facts: UniversityFacts | ScholarshipFacts;
};

type Fact = {
  icon: IconName;
  tint: string;
  pill?: ReactNode;
  value?: string;
  label?: string;
  label2?: string;
  href: string;
  small?: boolean;
};

const shortYear = (y: string) => y.replace(/^(\d{4})-\d{2}(\d{2})$/, '$1–$2');

function money(t: NonNullable<UniversityFacts['tuition']>): string {
  const one = (v: number) => (t.currency.length > 1 ? `${t.currency} ${v.toLocaleString('en')}` : `${t.currency}${v.toLocaleString('en')}`);
  return t.min === t.max ? one(t.min) : `${one(t.min)}–${one(t.max)}`;
}

function buildFacts(d: GuideData, s: GuideStrings, deadline: Deadline | null, now: Date | null, locale: string): Fact[] {
  const href = (key: string) => {
    const sec = d.sections.find((x) => x.key === key);
    return sec ? `#${sec.id}` : '#';
  };
  const list: Fact[] = [];
  const status = deadline && now ? deadlineStatus(deadline, now) : null;
  if (deadline && status?.kind !== 'closed') {
    list.push({
      icon: 'calendar',
      tint: 'blue',
      pill: status ? <StatusPill status={status} closes={deadline.closes} s={s} locale={locale} /> : null,
      label: deadline.title,
      label2:
        status?.kind === 'opening' && deadline.opens ? s.opensOn(formatDate(deadline.opens, locale)) : s.closes(formatDate(deadline.closes, locale)),
      href: href(d.kind === 'scholarship' ? 'window' : 'application'),
    });
  }
  if (d.kind === 'scholarship') {
    const f = d.facts as ScholarshipFacts;
    if (f.provider) list.push({icon: 'briefcase', tint: 'blue', value: f.provider, label: s.provider, href: href('overview'), small: true});
    if (f.type) list.push({icon: 'star', tint: 'orange', value: f.type, label: s.type, href: href('overview'), small: true});
    if (f.universities) {
      list.push({icon: 'university', tint: 'purple', value: String(f.universities), label: s.universitiesCount(f.universities), href: href('universities')});
    }
    return list;
  }
  const f = d.facts as UniversityFacts;
  list.push({
    icon: 'cap',
    tint: 'green',
    value: String(f.programs.count),
    label: s.programsIn(f.programs.count, f.programs.units),
    href: href('faculty'),
  });
  if (f.fee) list.push({icon: 'receipt', tint: 'blue', value: f.fee.value, label: f.fee.label, href: href('application')});
  if (f.tuition) {
    list.push({
      icon: 'wallet',
      tint: 'orange',
      value: money(f.tuition),
      label: f.tuition.notes ? s.perCreditNotes : s.perCredit,
      href: href('tuition'),
    });
  }
  if (list.length < 4 && f.contact && (f.contact.email || f.contact.phone)) {
    list.push({
      icon: 'mail',
      tint: 'blue',
      value: (f.contact.email || f.contact.phone) ?? undefined,
      label: f.contact.office,
      href: href('contacts'),
      small: true,
    });
  }
  return list;
}

function FactInner({fact}: {fact: Fact}): ReactNode {
  const [local, domain] = fact.value?.includes('@') ? fact.value.split('@') : [fact.value, null];
  return (
    <>
      <Chip name={fact.icon} tint={fact.tint} />
      <span className="fact-text">
        {fact.pill}
        {fact.value ? (
          <span className={`fact-value${fact.small ? ' small' : ''}`}>
            {/* Values in Arabic script ("500,000 ل.ل") keep their own direction; the rest read left to right. */}
            <bdi dir={/[\u0600-\u06FF]/.test(fact.value) ? undefined : 'ltr'}>
              {domain !== null ? (
                <>
                  {local}@<wbr />
                  {domain}
                </>
              ) : (
                fact.value
              )}
            </bdi>
          </span>
        ) : null}
        {[fact.label, fact.label2].filter(Boolean).map((label) => (
          <span key={label} className="fact-label">
            {label}
          </span>
        ))}
      </span>
    </>
  );
}

const same = (a: string, b: string) => a.toLowerCase().replace(/\W+/g, '') === b.toLowerCase().replace(/\W+/g, '');

function Notice({notice, className}: {notice: NonNullable<GuideData['notice']>; className: string}): ReactNode {
  const title = notice.href ? <a href={notice.href}>{notice.title}</a> : notice.title;
  return (
    <p className={`${className}${notice.type === 'danger' ? ' danger' : ''}`} role="note">
      <Icon name="alert" size={className === 'stale' ? 18 : 16} className="icon" />
      <span>
        {notice.title ? <strong>{title}{notice.text ? '. ' : ''}</strong> : null}
        {notice.text}
      </span>
    </p>
  );
}

function Header({d, s, docId}: {d: GuideData; s: GuideStrings; docId: string}): ReactNode {
  // Scholarships have no marks of their own, so their name leads.
  const logo = d.kind === 'university' ? UNIVERSITY_LOGOS[docId] : undefined;
  const src = useBaseUrl(logo ? `/img/universities/${logo.file}` : '/');
  return (
    <header className={`uni-head${d.kind === 'scholarship' ? ' no-mark' : ''}`}>
      {logo ? (
        <div className={`mark${logo.tone === 'dark' ? ' tone-dark' : ''}`}>
          <img src={src} alt="" decoding="async" />
        </div>
      ) : d.kind === 'university' ? (
        <div className="mark">
          <strong>{d.shortName}</strong>
        </div>
      ) : null}
      <div className="uni-id">
        {d.shortName && !same(d.shortName, d.fullName) ? <p className="uni-short">{d.shortName}</p> : null}
        <h1 className="uni-name">{d.fullName}</h1>
        {d.alt ? (
          <p className="uni-alt" dir="auto">
            <bdi>{d.alt}</bdi>
          </p>
        ) : null}
      </div>
      {d.notice ? (
        <Notice notice={d.notice} className="stale" />
      ) : d.contentYear ? (
        <div className="uni-meta">
          <span className="year-chip">
            <Icon name="calendar" size={16} className="icon" /> {fill(s.year, <bdi dir="ltr">{shortYear(d.contentYear)}</bdi>)}
          </span>
          {d.applyHost ? <span className="uni-host">{fill(s.applications, <bdi>{d.applyHost}</bdi>)}</span> : null}
        </div>
      ) : null}
      {d.applyUrl ? (
        <ExtLink href={d.applyUrl} className="apply-btn">
          <span>{fill(s.apply, <bdi>{d.applyHost}</bdi>)}</span>
          <Ext size={18} />
        </ExtLink>
      ) : null}
    </header>
  );
}

function Rail({d, s, facts, label}: {d: GuideData; s: GuideStrings; facts: Fact[]; label: (sec: GuideData['sections'][number]) => string}): ReactNode {
  return (
    <div className="rail-card">
      {d.applyUrl ? (
        <>
          <ExtLink href={d.applyUrl} className="apply-btn">
            <span>{s.applyNow}</span>
            <Ext size={18} />
          </ExtLink>
          <p className="rail-host">
            <bdi>{d.applyHost}</bdi>
          </p>
        </>
      ) : null}
      {d.notice?.title ? <Notice notice={{...d.notice, text: ''}} className="rail-stale" /> : null}
      <h2>{s.glance}</h2>
      <ul className="rail-facts">
        {facts.map((fact) => (
          <li key={fact.icon + fact.href}>
            <a href={fact.href}>
              <FactInner fact={fact} />
            </a>
          </li>
        ))}
      </ul>
      <h2>{s.onPage}</h2>
      <nav className="rail-nav" aria-label={s.onPage}>
        {d.sections.map((sec) => {
          const [name, tint] = (sec.key && SECTION_LOOK[sec.key]) || ['layers', 'neutral'];
          return (
            <a key={sec.id} href={`#${sec.id}`} data-sec={sec.id}>
              <Chip name={name} tint={tint} />
              <span>{label(sec)}</span>
            </a>
          );
        })}
      </nav>
      <ExtLink href={FORM} className="correction">
        {s.correction} <Ext size={14} />
      </ExtLink>
    </div>
  );
}

const TABS = '(max-width: 760px)';

// Phones get one section at a time, with the chips as tabs; wider screens scroll
// the whole page and mark the section in view.
function useSections(root: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const tabs = window.matchMedia(TABS);
    let active: string | null = null;
    let tabbed: boolean | null = null;
    const bar = () => el.querySelector<HTMLElement>('.chips');
    const slots = () => [...el.querySelectorAll<HTMLElement>('.sec-slot')];

    const centre = (chip: HTMLElement | null) => {
      const chips = bar();
      if (!chip || !chips) return;
      const barBox = chips.getBoundingClientRect();
      const box = chip.getBoundingClientRect();
      if (barBox.width && (box.left < barBox.left + 16 || box.right > barBox.right - 16)) {
        chips.scrollBy({left: box.left - barBox.left - (barBox.width - box.width) / 2, behavior: 'auto'});
      }
    };

    const inView = () => {
      if (tabs.matches) return;
      const sections = [...el.querySelectorAll<HTMLElement>('.sec[data-sec]')];
      if (!sections.length) return;
      const nav = document.querySelector('.navbar')?.getBoundingClientRect().height ?? 60;
      const chips = bar();
      const line = nav + (window.innerWidth >= 1280 || !chips ? 0 : chips.getBoundingClientRect().height) + 32;
      let current = sections[0].dataset.sec;
      for (const sec of sections) if (sec.getBoundingClientRect().top - line <= 0) current = sec.dataset.sec;
      el.querySelectorAll<HTMLElement>('.chips a[data-sec], .rail-nav a[data-sec]').forEach((a) => {
        const on = a.dataset.sec === current;
        a.setAttribute('aria-current', on ? 'true' : 'false');
        if (on && a.closest('.chips')) centre(a);
      });
    };

    const applyTabs = () => {
      const all = slots();
      if (!all.length) return;
      if (!tabs.matches) {
        all.forEach((slot) => slot.removeAttribute('hidden'));
        inView();
        return;
      }
      if (!all.some((slot) => slot.dataset.slot === active)) active = all[0].dataset.slot ?? null;
      all.forEach((slot) => {
        if (slot.dataset.slot === active) slot.removeAttribute('hidden');
        else slot.setAttribute('hidden', 'until-found');
      });
      el.querySelectorAll<HTMLElement>('.chips a[data-sec]').forEach((a) =>
        a.setAttribute('aria-current', a.dataset.sec === active ? 'true' : 'false'),
      );
      centre(el.querySelector<HTMLElement>('.chips a[aria-current="true"]'));
    };

    // Scrolls only when the chips are already pinned; near the top the content just swaps.
    const selectTab = (id: string, toSection: boolean) => {
      const chips = bar();
      const pinned = chips ? chips.getBoundingClientRect().top <= parseFloat(getComputedStyle(chips).top) + 1 : false;
      active = id;
      applyTabs();
      const slot = el.querySelector<HTMLElement>(`.sec-slot[data-slot="${CSS.escape(id)}"]`);
      if (toSection && pinned && chips && slot) {
        window.scrollTo(0, window.scrollY + slot.getBoundingClientRect().top - chips.getBoundingClientRect().bottom - 12);
      }
    };

    const reveal = (node: HTMLElement) => {
      if (node.classList.contains('sec-slot')) {
        selectTab(node.dataset.slot ?? '', false);
        return;
      }
      node.removeAttribute('hidden');
      node.dispatchEvent(new Event(REVEAL, {bubbles: true}));
    };

    const openTarget = (id: string, scroll: boolean) => {
      const target = id ? document.getElementById(id) : null;
      if (!target || !el.contains(target)) return;
      let revealed = false;
      for (let hidden = target.closest<HTMLElement>('[hidden]'), n = 0; hidden && n < 12; n += 1) {
        reveal(hidden);
        revealed = true;
        hidden = target.closest<HTMLElement>('[hidden]');
      }
      if (!scroll) return;
      // Revealing re-renders what held the target, which can push it further down.
      if (revealed) window.setTimeout(() => target.scrollIntoView({block: 'start'}), 50);
      else target.scrollIntoView({block: 'start'});
    };

    const syncMode = () => {
      if (tabs.matches !== tabbed) {
        tabbed = tabs.matches;
        applyTabs();
      } else {
        inView();
      }
    };

    const onClick = (event: MouseEvent) => {
      if (!tabs.matches) return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = anchor ? decodeURIComponent(anchor.getAttribute('href')?.slice(1) ?? '') : '';
      const target = hash ? document.getElementById(hash) : null;
      const slot = target?.closest<HTMLElement>('.sec-slot');
      if (!anchor || !target || !slot) return;
      event.preventDefault();
      window.history.replaceState(window.history.state, '', `#${hash}`);
      if (anchor.closest('.chips')) {
        selectTab(slot.dataset.slot ?? '', true);
      } else {
        selectTab(slot.dataset.slot ?? '', false);
        openTarget(target.id, true);
      }
    };

    const onBeforeMatch = (event: Event) => {
      const slot = (event.target as Element).closest<HTMLElement>('.sec-slot');
      if (slot && tabs.matches && slot.dataset.slot !== active) {
        active = slot.dataset.slot ?? null;
        applyTabs();
      }
    };

    const onHash = () => openTarget(decodeURIComponent(window.location.hash.slice(1)), true);
    const onBeforePrint = () => {
      slots().forEach((slot) => slot.removeAttribute('hidden'));
      el.querySelectorAll<HTMLElement>('[hidden]').forEach(reveal);
    };

    tabbed = tabs.matches;
    applyTabs();
    el.setAttribute('data-ready', '');
    if (window.location.hash) onHash();

    el.addEventListener('click', onClick);
    el.addEventListener('beforematch', onBeforeMatch, true);
    window.addEventListener('scroll', inView, {passive: true});
    window.addEventListener('resize', syncMode, {passive: true});
    window.addEventListener('hashchange', onHash);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', applyTabs);
    tabs.addEventListener('change', syncMode);
    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('beforematch', onBeforeMatch, true);
      window.removeEventListener('scroll', inView);
      window.removeEventListener('resize', syncMode);
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', applyTabs);
      tabs.removeEventListener('change', syncMode);
    };
  }, [root]);
}

export default function Guidebook({data, children}: {data: string; children: ReactNode}): ReactNode {
  const d: GuideData = useMemo(() => JSON.parse(data), [data]);
  const {s, locale} = useGuide();
  const {metadata} = useDoc();
  const docId = metadata.id.split('/').pop() ?? metadata.id;
  const now = useNow();
  const plugin = d.kind === 'scholarship' ? 'scholarships' : 'universities';
  const deadline = useMemo(
    () => deadlines(translate).find((x) => x.ref.plugin === plugin && x.ref.id === docId) ?? null,
    [plugin, docId],
  );
  const facts = buildFacts(d, s, deadline, now, locale);
  const root = useRef<HTMLDivElement>(null);
  useSections(root);
  const label = (sec: GuideData['sections'][number]) => (sec.key && s.chips[sec.key]) || sec.title;

  return (
    <div className="guidebook" ref={root}>
      <div className="gb-main">
        <Header d={d} s={s} docId={docId} />
        <ul className="facts">
          {facts.map((fact) => (
            <li key={fact.icon + fact.href} className="fact">
              <a href={fact.href}>
                <FactInner fact={fact} />
              </a>
            </li>
          ))}
        </ul>
        <nav className="chips" aria-label={s.onPage}>
          {d.sections.map((sec) => (
            <a key={sec.id} href={`#${sec.id}`} data-sec={sec.id}>
              {label(sec)}
            </a>
          ))}
          {d.applyUrl ? (
            <ExtLink href={d.applyUrl} className="chip-apply">
              <span>{s.applyShort}</span>
              <Ext size={15} />
            </ExtLink>
          ) : null}
        </nav>
        <ApplyUrlContext.Provider value={d.applyUrl}>{children}</ApplyUrlContext.Provider>
      </div>
      <aside className="gb-rail">
        <Rail d={d} s={s} facts={facts} label={label} />
      </aside>
    </div>
  );
}
