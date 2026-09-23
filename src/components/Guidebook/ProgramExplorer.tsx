import {useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import Heading from '@theme/Heading';
import Icon from '@site/src/components/Homepage/ui/Icon';
import type {MajorRow} from '@site/src/components/MajorsTable';
import {useGuide, type GuideStrings} from './strings';
import {Ext, MoreButton, useRevealListener} from './parts';

const PROGRAMS_SHOWN = 8;

type Group = {id: string | null; name: string; abbr: string | null; url: string | null; rows: MajorRow[]};

const norm = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function Program({row, s, locale}: {row: MajorRow; s: GuideStrings; locale: string}): ReactNode {
  const dept = row.department && !norm(row.program).includes(norm(row.department)) ? row.department : null;
  return (
    <li className="prog">
      <span className="prog-name">
        {locale === 'ar' ? <bdi>{row.program}</bdi> : row.program}
        {dept ? (
          <span className="prog-dept">
            <span>{dept}</span>
          </span>
        ) : null}
      </span>
      <span className="prog-meta">
        {row.degree ? <span className="deg">{row.degree}</span> : null}
        {row.years ? <span>{s.years(row.years)}</span> : null}
        {row.credits ? <span>{s.credits(row.credits)}</span> : null}
        {row.language ? <span>{row.language}</span> : null}
      </span>
      {row.source ? (
        <a
          className="ref"
          href={row.source}
          target="_blank"
          rel="noopener noreferrer"
          title={s.programPage}
          aria-label={`${s.programPage}: ${row.program}`}>
          <Ext />
        </a>
      ) : null}
    </li>
  );
}

function GroupHeading({group, s}: {group: Group; s: GuideStrings}): ReactNode {
  const title = (
    <>
      <span>
        {group.name}
        {group.abbr ? (
          <>
            {' ('}
            {group.url ? (
              <a href={group.url} target="_blank" rel="noopener noreferrer">
                {group.abbr}
              </a>
            ) : (
              group.abbr
            )}
            {')'}
          </>
        ) : null}
      </span>
      <span className="fac-count">{s.programsCount(group.rows.length)}</span>
    </>
  );
  return group.id ? (
    <Heading as="h3" id={group.id}>
      {title}
    </Heading>
  ) : (
    <h3>{title}</h3>
  );
}

export default function ProgramExplorer({groups: raw}: {groups: string}): ReactNode {
  const {s, locale} = useGuide();
  const groups: Group[] = useMemo(() => JSON.parse(raw), [raw]);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const countId = useId();

  const q = norm(query.trim());
  const filtering = q !== '' || group !== '';
  let budget = filtering || expanded ? Infinity : PROGRAMS_SHOWN;
  let matches = 0;
  const rendered = groups.map((g, gi) => {
    if (group !== '' && String(gi) !== group) return null;
    const rows = g.rows.filter(
      (r) => !q || norm([r.program, r.degree, r.department, r.language].filter(Boolean).join(' ')).includes(q),
    );
    if (!rows.length) return null;
    matches += rows.length;
    const visible = Math.max(0, Math.min(rows.length, budget));
    budget -= visible;
    const items = rows.map((r, i) => <Program key={i} row={r} s={s} locale={locale} />);
    if (visible === 0) {
      return (
        <div key={gi} className="px-group overflow" hidden data-px-more="">
          <GroupHeading group={g} s={s} />
          <ul className="px-list">{items}</ul>
        </div>
      );
    }
    return (
      <div key={gi} className="px-group">
        <GroupHeading group={g} s={s} />
        <ul className="px-list">{items.slice(0, visible)}</ul>
        {visible < items.length ? (
          <ul className="px-list overflow" hidden data-px-more="">
            {items.slice(visible)}
          </ul>
        ) : null}
      </div>
    );
  });

  // Rows past the first few ship hidden; find-in-page can still reach them.
  useLayoutEffect(() => {
    root.current?.querySelectorAll('[data-px-more]').forEach((node) => node.setAttribute('hidden', 'until-found'));
  });

  const open = useCallback(() => setExpanded(true), []);
  useRevealListener(root, open);

  const clear = () => {
    setQuery('');
    setGroup('');
    input.current?.focus();
  };

  return (
    <div className="px" ref={root}>
      <div className="px-tools">
        <label className="px-search">
          <Icon name="search" size={18} className="icon" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={s.searchPrograms(total)}
            aria-label={s.searchPrograms(total)}
            aria-describedby={countId}
            autoComplete="off"
          />
        </label>
        {groups.length > 1 ? (
          <select className="px-select" value={group} onChange={(e) => setGroup(e.target.value)} aria-label={s.facultyFilter}>
            <option value="">{s.allFaculties(groups.length)}</option>
            {groups.map((g, i) => (
              <option key={i} value={String(i)}>
                {g.abbr ? `${g.name} (${g.abbr})` : g.name}: {g.rows.length}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <p className="px-count" aria-live="polite" id={countId} hidden={!filtering}>
        {filtering ? s.shown(matches, total) : ''}
      </p>
      <div>{rendered}</div>
      {filtering && matches === 0 ? (
        <p className="px-empty">
          {s.noMatch(query.trim())}
          <button type="button" onClick={clear}>
            {s.clear}
          </button>
        </p>
      ) : null}
      {!filtering && total > PROGRAMS_SHOWN ? (
        <MoreButton
          expanded={expanded}
          onClick={() => {
            setExpanded(!expanded);
            if (expanded) root.current?.scrollIntoView({block: 'start'});
          }}
          more={s.showAllPrograms(total)}
          fewer={s.showFewerPrograms}
        />
      ) : null}
    </div>
  );
}
