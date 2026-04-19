/**
 * Sortable table for university major listings.
 *
 * Expected row shape (every column optional except program):
 *   {
 *     program: string,
 *     degree?: string,
 *     department?: string,
 *     credits?: number | string,
 *     years?: number | string,
 *     source?: string      // URL
 *   }
 */
import {useMemo, useState, type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export type MajorRow = {
  program: string;
  degree?: string;
  department?: string;
  credits?: number | string;
  years?: number | string;
  source?: string;
};

type Props = {
  rows: MajorRow[];
  /** Optional, currently unused. Kept so existing MDX call sites don't need
   * editing if we later reintroduce per-faculty features. */
  faculty?: string;
};

type SortableKey = Exclude<keyof MajorRow, 'source'>;
type SortDir = 'asc' | 'desc';

const SORTABLE_COLS: SortableKey[] = [
  'program',
  'degree',
  'department',
  'credits',
  'years',
];

const COL_HEADERS_BY_LOCALE: Record<string, Record<keyof MajorRow, string>> = {
  en: {
    program: 'Program',
    degree: 'Degree',
    department: 'Department',
    credits: 'Credits',
    years: 'Duration (years)',
    source: 'Source',
  },
  ar: {
    program: 'البرنامج',
    degree: 'الشهادة',
    department: 'القسم',
    credits: 'الساعات',
    years: 'المدة (سنوات)',
    source: 'المصدر',
  },
};

const LINK_LABEL: Record<string, string> = {
  en: 'Link',
  ar: 'الرابط',
};

function sortNatural(a: string | number, b: string | number): number {
  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
  return String(a).localeCompare(String(b));
}

export default function MajorsTable({rows}: Props): ReactNode {
  const {i18n} = useDocusaurusContext();
  const locale =
    i18n.currentLocale in COL_HEADERS_BY_LOCALE ? i18n.currentLocale : 'en';
  const headers = COL_HEADERS_BY_LOCALE[locale];
  const linkLabel = LINK_LABEL[locale] ?? LINK_LABEL.en;

  const [sortKey, setSortKey] = useState<SortableKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortNatural(av as string | number, bv as string | number) * dir;
    });
  }, [rows, sortKey, sortDir]);

  const handleSort = (key: SortableKey) => {
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
              {SORTABLE_COLS.map((col) => (
                <th key={col}>
                  <button
                    type="button"
                    className={styles.thButton}
                    onClick={() => handleSort(col)}
                    aria-label={`Sort by ${headers[col]}`}>
                    <span>{headers[col]}</span>
                    <span
                      className={styles.sortIndicator}
                      aria-hidden="true">
                      {sortKey === col
                        ? sortDir === 'asc'
                          ? '▲'
                          : '▼'
                        : '⇅'}
                    </span>
                  </button>
                </th>
              ))}
              <th>{headers.source}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={`${r.program}-${r.degree ?? ''}-${i}`}>
                <td data-label={headers.program}>{r.program}</td>
                <td data-label={headers.degree}>{r.degree ?? ''}</td>
                <td data-label={headers.department}>{r.department ?? ''}</td>
                <td data-label={headers.credits}>{r.credits ?? ''}</td>
                <td data-label={headers.years}>{r.years ?? ''}</td>
                <td data-label={headers.source}>
                  {r.source ? (
                    <a
                      href={r.source}
                      target="_blank"
                      rel="noopener noreferrer">
                      {linkLabel} ↗
                    </a>
                  ) : (
                    ''
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
