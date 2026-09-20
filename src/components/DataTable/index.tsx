/**
 * The generic table behind every `@component:` directive.
 *
 * Rows arrive from the pipeline keyed by the slugified header cells of the
 * table an editor wrote in Drive, so this component cannot assume a fixed
 * shape. When no column config is supplied it infers the columns from the
 * first row — which is what lets a brand-new table type render without any
 * code here knowing about it.
 *
 * Column labels are localized where the caller supplies them; anything else
 * falls back to a humanized form of the key (`usd_per_credit` → `USD per
 * credit`), so an unconfigured column still reads correctly.
 */
import {useMemo, useState, type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export type Row = Record<string, string | number | null | undefined>;

export type ColumnSpec = {
  /** Row key. */
  key: string;
  /** Localized header text, per locale code. */
  labels?: Record<string, string>;
  /** Render as an external link with a localized label. */
  link?: boolean;
  sortable?: boolean;
};

export type DataTableProps = {
  rows: Row[];
  columns?: ColumnSpec[];
  /** Columns rendered as links when inferring (defaults to source/reference). */
  linkKeys?: string[];
};

const LINK_LABEL: Record<string, string> = {en: 'Link', ar: 'الرابط'};

/** Keys that hold a URL in practice across the corpus. */
const DEFAULT_LINK_KEYS = ['source', 'reference', 'link', 'url', 'المرجع'];

/** `usd_per_credit` → `USD per credit`. Only used when nothing better exists. */
function humanize(key: string): string {
  const words = key.split('_').filter(Boolean);
  if (words.length === 0) return key;
  const [first, ...rest] = words;
  const head =
    first.length <= 3 && first === first.toLowerCase() && /^[a-z]+$/.test(first)
      ? first.toUpperCase()
      : first.charAt(0).toUpperCase() + first.slice(1);
  return [head, ...rest].join(' ');
}

function sortNatural(a: string | number, b: string | number): number {
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return String(a).localeCompare(String(b));
}

function isUrl(v: unknown): boolean {
  return typeof v === 'string' && /^https?:\/\//.test(v);
}

export default function DataTable({
  rows,
  columns,
  linkKeys = DEFAULT_LINK_KEYS,
}: DataTableProps): ReactNode {
  const {i18n} = useDocusaurusContext();
  const locale = i18n.currentLocale;

  // Configured columns come first, then any key present in the data that the
  // caller did not list. A column config must never be able to hide content:
  // the corpus has 66 distinct table shapes, so no spec is exhaustive.
  const specs: ColumnSpec[] = useMemo(() => {
    const present: string[] = [];
    for (const r of rows) {
      for (const k of Object.keys(r)) if (!present.includes(k)) present.push(k);
    }
    const configured = columns ?? [];
    const known = new Set(configured.map((c) => c.key));
    const extra = present
      .filter((k) => !known.has(k))
      .map((key) => ({key, link: linkKeys.includes(key), sortable: true}));
    return [...configured, ...extra];
  }, [columns, rows, linkKeys]);

  // Hide a column no row actually fills, the way MajorsTable hides Language.
  const visible = useMemo(
    () =>
      specs.filter((c) =>
        rows.some((r) => r[c.key] != null && r[c.key] !== ''),
      ),
    [specs, rows],
  );

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortNatural(av, bv) * dir;
    });
  }, [rows, sortKey, sortDir]);

  if (rows.length === 0) return null;

  const label = (c: ColumnSpec) => c.labels?.[locale] ?? c.labels?.en ?? humanize(c.key);
  const linkLabel = LINK_LABEL[locale] ?? LINK_LABEL.en;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              {visible.map((c) => (
                <th key={c.key}>
                  {c.sortable !== false && !c.link ? (
                    <button
                      type="button"
                      className={styles.thButton}
                      onClick={() => handleSort(c.key)}
                      aria-label={`Sort by ${label(c)}`}>
                      <span>{label(c)}</span>
                      <span className={styles.sortIndicator} aria-hidden="true">
                        {sortKey === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  ) : (
                    label(c)
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i}>
                {visible.map((c) => {
                  const v = r[c.key];
                  return (
                    <td key={c.key} data-label={label(c)}>
                      {(c.link || isUrl(v)) && isUrl(v) ? (
                        <a
                          href={String(v)}
                          target="_blank"
                          rel="noopener noreferrer">
                          {linkLabel} ↗
                        </a>
                      ) : (
                        (v ?? '')
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
