import {Children, isValidElement, useCallback, useId, useRef, useState, type ReactElement, type ReactNode, type RefObject} from 'react';
import {deadlineStatus, type DeadlineStatus} from '@site/src/components/Homepage/UpcomingDeadlines/status';
import type {Deadline} from '@site/src/data/homepage/types';
import {useGuide, type GuideStrings} from './strings';
import {Ext, ExtLink, MoreButton, StatusPill, useCollapsible, useNow, useRevealListener} from './parts';

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

type Props = {
  shape: 'list' | 'kv' | 'wide';
  head: string;
  texts: string;
  refs: string;
  sharedRef?: string;
  windows?: string;
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
  const rows = readRows(props.children);
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

  const date = (i: number, j: number, cell: ReactNode) =>
    (texts[i]?.[j] ?? '').length <= 20 ? <span className="nowrap">{cell}</span> : cell;

  const item = ({row, i, status}: (typeof items)[number]) => {
    const extras = row.cells
      .map((cell, j) => ({cell, j}))
      .filter(({j}) => j !== w.title && j !== w.opens && j !== w.closes && !EMPTY.test(texts[i]?.[j] ?? ''));
    return (
      <li key={i} className={`win win-${status ? status.kind : 'unknown'}`}>
        <span className="win-term">
          {row.cells[w.title]}
          <RefExtra value={refs[i]} note={row.note} s={s} />
        </span>
        {status ? <StatusPill status={status} closes={w.dates[i].closes ?? ''} s={s} locale={locale} /> : null}
        <span className="win-dates">
          {w.opens !== null ? (
            <>
              {date(i, w.opens, row.cells[w.opens])}
              <span className="win-to" aria-hidden="true">
                {' – '}
              </span>
              {date(i, w.closes, row.cells[w.closes])}
            </>
          ) : (
            <>
              <span className="win-lbl">{head[w.closes]}:</span> {date(i, w.closes, row.cells[w.closes])}
            </>
          )}
        </span>
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

  return (
    <>
      <ul className="wins">{[...live, ...unknown, ...(fold ? [] : closed)].map(item)}</ul>
      {fold ? (
        <>
          <ul className="wins overflow" id={id} ref={overflow} hidden={!expanded}>
            {closed.map(item)}
          </ul>
          <MoreButton expanded={expanded} onClick={() => setExpanded(!expanded)} more={s.showClosed(closed.length)} fewer={s.hideClosed} controls={id} />
        </>
      ) : null}
      {sharedRef ? <Sources links={[sharedRef]} s={s} /> : null}
    </>
  );
}
