import {Children, isValidElement, useCallback, useContext, useId, useRef, useState, type ReactElement, type ReactNode, type RefObject} from 'react';
import {CLOSING_SOON_DAYS, daysUntil, deadlineStatus, type DeadlineStatus} from '@site/src/components/Homepage/UpcomingDeadlines/status';
import type {Deadline} from '@site/src/data/homepage/types';
import {formatDateFull, useGuide, type GuideStrings} from './strings';
import {ApplyUrlContext, Ext, ExtLink, MoreButton, StatusPill, useCollapsible, useNow, useRevealListener} from './parts';

const ROWS_LIMIT = 8;
const ROWS_SHOWN = 6;
const EMPTY = /^[—–-]?$/;

type Ref = {url: string; label: string} | null;
type Windows = {
  title: number;
  opens: number | null;
  closes: number;
  dates: {opens: string | null; closes: string | null}[];
};

type Timeline = {col: number; dates: (string | null)[]};

type Props = {
  shape: 'list' | 'kv' | 'wide';
  head: string;
  texts: string;
  refs: string;
  sharedRef?: string;
  windows?: string;
  timeline?: string;
  children: ReactNode;
};

type Row = {cells: ReactNode[]; note: ReactNode | null};

// Cells and reference notes arrive as MDX children; these only mark them.
export function GuideRow({children}: {children: ReactNode}): ReactNode {
  return <>{children}</>;
}
export function GuideCell({children}: {children: ReactNode}): ReactNode {
  return <>{children}</>;
}
export function GuideRef({children}: {children: ReactNode}): ReactNode {
  return <span className="kv-note">{children}</span>;
}

type WithChildren = ReactElement<{children?: ReactNode}>;

function readRows(children: ReactNode): Row[] {
  return Children.toArray(children)
    .filter((row): row is WithChildren => isValidElement(row))
    .map((row) => {
      const parts = Children.toArray(row.props.children).filter((part): part is WithChildren => isValidElement(part));
      const note = parts.find((part) => part.type === GuideRef);
      return {
        cells: parts.filter((part) => part.type === GuideCell).map((cell) => cell.props.children),
        note: note ? note.props.children : null,
      };
    });
}

function RefIcon({value, s}: {value: {url: string; label: string}; s: GuideStrings}): ReactNode {
  return (
    <a className="ref" href={value.url} target="_blank" rel="noopener noreferrer" title={value.label} aria-label={s.sourceNamed(value.label)}>
      <Ext />
    </a>
  );
}

function Sources({links, s}: {links: {url: string; label: string}[]; s: GuideStrings}): ReactNode {
  return (
    <p className="src">
      <span>{links.length > 1 ? s.sources : s.source}:</span>
      {links.map((link) => (
        <ExtLink key={link.url} href={link.url}>
          {link.label}
          <Ext size={14} />
        </ExtLink>
      ))}
    </p>
  );
}

function RefExtra({value, note, s}: {value: Ref; note: ReactNode | null; s: GuideStrings}): ReactNode {
  if (value) return <RefIcon value={value} s={s} />;
  return note ? <span className="kv-note">{note}</span> : null;
}

export function GuideTable(props: Props): ReactNode {
  const {s, locale} = useGuide();
  const head: string[] = JSON.parse(props.head);
  const texts: string[][] = JSON.parse(props.texts);
  const refs: Ref[] = JSON.parse(props.refs);
  const sharedRef: Ref = props.sharedRef ? JSON.parse(props.sharedRef) : null;
  const windows: Windows | null = props.windows ? JSON.parse(props.windows) : null;
  const timeline: Timeline | null = props.timeline ? JSON.parse(props.timeline) : null;
  const rows = readRows(props.children);
  const now = useNow();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const open = useCallback(() => setExpanded(true), []);
  const overflow = useRef<HTMLElement>(null);
  const table = useRef<HTMLTableElement>(null);

  const n = rows.length;
  const folds = n > ROWS_LIMIT;
  useCollapsible(overflow, folds && !expanded, open);
  useRevealListener(table, open);

  if (windows) {
    return <WindowList rows={rows} head={head} texts={texts} refs={refs} windows={windows} sharedRef={sharedRef} s={s} locale={locale} />;
  }

  const more = folds ? (
    <MoreButton expanded={expanded} onClick={() => setExpanded(!expanded)} more={s.showMore(n - ROWS_SHOWN)} fewer={s.showFewer} controls={id} />
  ) : null;
  const sources = sharedRef ? <Sources links={[sharedRef]} s={s} /> : null;

  if (props.shape === 'wide') {
    return (
      <>
        <div className="t-wide">
          <div className="t-frame">
            <table id={id} ref={table}>
              <thead>
                <tr>
                  {head.map((h, j) => (
                    <th key={j} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} data-overflow={folds && i >= ROWS_SHOWN ? '' : undefined} hidden={folds && i >= ROWS_SHOWN && !expanded}>
                    {row.cells.map((cell, j) => {
                      const value = texts[i]?.[j] ?? '';
                      const cls = [
                        EMPTY.test(value) ? 'empty' : '',
                        value.length > 42 ? 'wide-cell' : '',
                        value.length <= 16 && /\d/.test(value) ? 'nowrap' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <td key={j} className={cls || undefined} data-label={head[j]}>
                          {cell}
                          {j === 0 ? <RefExtra value={refs[i]} note={row.note} s={s} /> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {more}
        {sources}
      </>
    );
  }

  if (props.shape === 'kv' && timeline) {
    // A stage per row: the date on the right, marked once it has passed or when it is close.
    const stageRow = (row: Row, i: number) => {
      const iso = timeline.dates[i];
      const days = now && iso ? daysUntil(now, iso) : null;
      const others = row.cells.map((cell, j) => ({cell, j})).filter(({j}) => j !== timeline.col);
      return (
        <div className={`kv-row${days !== null && days < 0 ? ' past' : ''}`} key={i}>
          <dt>
            {others[0]?.cell}
            {others.slice(1).map(({cell, j}) => (
              <span className="kv-note" key={j}>
                {cell}
              </span>
            ))}
            {row.note ? <span className="kv-note">{row.note}</span> : null}
          </dt>
          <dd>
            {row.cells[timeline.col]}
            {days !== null ? (
              <span className={`pill ${days >= 0 && days <= CLOSING_SOON_DAYS ? 'pill-soon' : 'pill-neutral'}`}>
                {days < 0 ? s.passed : s.inDays(days)}
              </span>
            ) : null}
            {refs[i] ? <RefIcon value={refs[i]} s={s} /> : null}
          </dd>
        </div>
      );
    };
    return (
      <>
        <p className="kv-head">
          <span>{head.filter((_, j) => j !== timeline.col)[0]}</span>
          <span>{head[timeline.col]}</span>
        </p>
        <dl className="t-kv">{rows.slice(0, folds ? ROWS_SHOWN : n).map(stageRow)}</dl>
        {folds ? (
          <dl className="t-kv overflow" id={id} ref={overflow as RefObject<HTMLDListElement>} hidden={!expanded}>
            {rows.slice(ROWS_SHOWN).map((row, i) => stageRow(row, i + ROWS_SHOWN))}
          </dl>
        ) : null}
        {more}
        {sources}
      </>
    );
  }

  if (props.shape === 'kv') {
    const plainNote = /^(notes?|ملاحظات)$/i;
    const kvRow = (row: Row, i: number) => (
      <div className="kv-row" key={i}>
        <dt>
          {row.cells[0]}
          {row.cells.length > 2 && texts[i]?.[2] ? (
            <span className="kv-note">
              {plainNote.test(head[2]) ? '' : `${head[2]}: `}
              {row.cells[2]}
            </span>
          ) : null}
          {row.note ? <span className="kv-note">{row.note}</span> : null}
        </dt>
        <dd>
          {row.cells[1]}
          {refs[i] ? <RefIcon value={refs[i]} s={s} /> : null}
        </dd>
      </div>
    );
    return (
      <>
        {head.length >= 2 ? (
          <p className="kv-head">
            <span>{head[0]}</span>
            <span>{head[1]}</span>
          </p>
        ) : null}
        <dl className="t-kv">{rows.slice(0, folds ? ROWS_SHOWN : n).map(kvRow)}</dl>
        {folds ? (
          <dl className="t-kv overflow" id={id} ref={overflow as RefObject<HTMLDListElement>} hidden={!expanded}>
            {rows.slice(ROWS_SHOWN).map((row, i) => kvRow(row, i + ROWS_SHOWN))}
          </dl>
        ) : null}
        {more}
        {sources}
      </>
    );
  }

  const listRow = (row: Row, i: number) => {
    const value = refs[i];
    const aside = value ? (
      <ExtLink href={value.url}>
        {value.label}
        <Ext size={14} />
      </ExtLink>
    ) : (
      row.note
    );
    return (
      <li key={i}>
        <span>{row.cells[0]}</span>
        {aside ? <span className="aside">{aside}</span> : null}
      </li>
    );
  };
  return (
    <>
      <p className="kv-head">
        <span>{head[0]}</span>
      </p>
      <ul className="t-list">{rows.slice(0, folds ? ROWS_SHOWN : n).map(listRow)}</ul>
      {folds ? (
        <ul className="t-list overflow" id={id} ref={overflow as RefObject<HTMLUListElement>} hidden={!expanded}>
          {rows.slice(ROWS_SHOWN).map((row, i) => listRow(row, i + ROWS_SHOWN))}
        </ul>
      ) : null}
      {more}
      {sources}
    </>
  );
}

type WindowProps = {
  rows: Row[];
  head: string[];
  texts: string[][];
  refs: Ref[];
  windows: Windows;
  sharedRef: Ref;
  s: GuideStrings;
  locale: string;
};

// Status comes from the row's own dates, and only when they parse as full dates.
function WindowList({rows, head, texts, refs, windows: w, sharedRef, s, locale}: WindowProps): ReactNode {
  const now = useNow();
  const applyUrl = useContext(ApplyUrlContext);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const open = useCallback(() => setExpanded(true), []);
  const overflow = useRef<HTMLUListElement>(null);

  const items = rows.map((row, i) => {
    const d = w.dates[i];
    const status: DeadlineStatus | null =
      now && d?.closes ? deadlineStatus({closes: d.closes, opens: d.opens ?? undefined} as Deadline, now) : null;
    return {row, i, status};
  });
  const live = items
    .filter((x) => x.status && x.status.kind !== 'closed')
    .sort((a, b) => (w.dates[a.i].closes ?? '').localeCompare(w.dates[b.i].closes ?? ''));
  const unknown = items.filter((x) => !x.status);
  const closed = items.filter((x) => x.status?.kind === 'closed');
  const fold = live.length + unknown.length > 0 && closed.length > 1;
  useCollapsible(overflow, fold && !expanded, open);

  const TERM = /(Fall|Spring|Summer|Winter)\s+\d{4}(?:-\d{2,4})?/i;
  const NOTE = /^(notes?|ملاحظات)$/i;

  // "Freshman - Early Merit (Fall 2027-28)" becomes a title plus a term, so cards can be grouped by term.
  const split = (i: number): {main: string | null; term: string | null} => {
    const text = texts[i]?.[w.title] ?? '';
    const m = TERM.exec(text);
    if (!m) return {main: null, term: null};
    const rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length))
      .replace(/\(\s*\)/g, '')
      .replace(/^[\s\-–,:]+|[\s\-–,:]+$/g, '')
      .replace(/^,\s*/, '');
    return {main: rest || null, term: m[0]};
  };
  const visible = [...live, ...unknown];
  const terms = visible.map((x) => split(x.i).term);
  const grouped = visible.length > 4 && terms.every(Boolean) && new Set(terms).size > 1;

  const dateText = (i: number, j: number | null, iso: string | null | undefined): string | null => {
    if (iso) return formatDateFull(iso, locale);
    const raw = j === null ? '' : (texts[i]?.[j] ?? '').trim();
    return EMPTY.test(raw) || /^(tba|tbd|to be announced)/i.test(raw) ? null : raw;
  };

  const item = ({row, i, status}: (typeof items)[number], hideTerm: boolean) => {
    const {main, term} = split(i);
    const title = main ?? (term && hideTerm ? term : row.cells[w.title]);
    const closesText = dateText(i, w.closes, w.dates[i]?.closes);
    const opensText = w.opens !== null ? dateText(i, w.opens, w.dates[i]?.opens) : null;
    const showOpens = opensText && (!status || status.kind === 'opening');
    const noteCols = row.cells
      .map((cell, j) => ({cell, j}))
      .filter(({j}) => j !== w.title && j !== w.opens && j !== w.closes && !EMPTY.test(texts[i]?.[j] ?? ''));
    const notes = noteCols.filter(({j}) => NOTE.test(head[j]));
    const extras = noteCols.filter(({j}) => !NOTE.test(head[j]));
    return (
      <li key={i} className={`win win-${status ? status.kind : 'unknown'}${applyUrl && status?.kind !== 'closed' ? ' win-linked' : ''}`}>
        <div className="win-main">
          <span className="win-term">
            {applyUrl && status?.kind !== 'closed' ? (
              <ExtLink href={applyUrl} className="win-link">
                {title}
                <span className="win-go" aria-hidden="true">
                  {s.applyShort}
                  <Ext size={14} />
                </span>
              </ExtLink>
            ) : (
              title
            )}
            <RefExtra value={refs[i]} note={row.note} s={s} />
          </span>
          {term && main && !hideTerm ? <span className="win-sub">{term}</span> : null}
        </div>
        <div className="win-when">
          {status ? <StatusPill status={status} closes={w.dates[i].closes ?? ''} s={s} locale={locale} /> : null}
          {closesText ? (
            <span className="win-by">
              <span className="win-lbl">{s.applyBy}</span>
              <strong>{closesText}</strong>
            </span>
          ) : (
            <span className="win-by win-tba">{s.closesTba}</span>
          )}
          {showOpens ? <span className="win-opens">{s.opensOn(opensText)}</span> : null}
        </div>
        {notes.map(({cell, j}) => (
          <p className="win-note" key={j}>
            {cell}
          </p>
        ))}
        {extras.length ? (
          <dl className="win-extra">
            {extras.map(({cell, j}) => (
              <div key={j}>
                <dt>{head[j]}</dt>
                <dd>{cell}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </li>
    );
  };

  const groups: {term: string; entries: typeof visible}[] = [];
  if (grouped) {
    for (const x of visible) {
      const term = split(x.i).term as string;
      const g = groups.find((y) => y.term === term);
      if (g) g.entries.push(x);
      else groups.push({term, entries: [x]});
    }
  }

  return (
    <>
      {grouped ? (
        groups.map((g) => (
          <section className="wins-group" key={g.term}>
            <h4>{g.term}</h4>
            <ul className="wins">{g.entries.map((x) => item(x, true))}</ul>
          </section>
        ))
      ) : (
        <ul className="wins">{visible.map((x) => item(x, false))}</ul>
      )}
      {!fold && closed.length ? <ul className="wins">{closed.map((x) => item(x, false))}</ul> : null}
      {fold ? (
        <>
          <ul className="wins overflow" id={id} ref={overflow} hidden={!expanded}>
            {closed.map((x) => item(x, false))}
          </ul>
          <MoreButton expanded={expanded} onClick={() => setExpanded(!expanded)} more={s.showClosed(closed.length)} fewer={s.hideClosed} controls={id} />
        </>
      ) : null}
      {sharedRef ? <Sources links={[sharedRef]} s={s} /> : null}
    </>
  );
}
