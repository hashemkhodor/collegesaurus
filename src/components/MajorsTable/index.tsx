/**
 * Interactive table for university major listings. Renders data as a
 * sortable, text-filterable, CSV-downloadable grid that replaces the
 * plain markdown tables that used to live inline in each university MDX.
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
  /** Used in the downloaded CSV filename and the search placeholder. */
  faculty: string;
};

type SortKey = keyof MajorRow | null;
type SortDir = 'asc' | 'desc';

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

const UI_LABELS: Record<string, {search: string; download: string; noResults: string; of: string}> = {
  en: {
    search: 'Filter…',
    download: 'Download CSV',
    noResults: 'No programs match your filter.',
    of: 'of',
  },
  ar: {
    search: 'بحث…',
    download: 'تنزيل CSV',
    noResults: 'لا توجد برامج مطابقة للبحث.',
    of: 'من',
  },
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function toCsv(rows: MajorRow[], headers: Record<keyof MajorRow, string>): string {
  const cols: (keyof MajorRow)[] = [
    'program',
    'degree',
    'department',
    'credits',
    'years',
    'source',
  ];
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => escape(headers[c])).join(',');
  const body = rows
    .map((r) => cols.map((c) => escape(r[c])).join(','))
    .join('\n');
  return `${head}\n${body}`;
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function MajorsTable({rows, faculty}: Props): ReactNode {
  const {i18n} = useDocusaurusContext();
  const locale = i18n.currentLocale in COL_HEADERS_BY_LOCALE ? i18n.currentLocale : 'en';
  const headers = COL_HEADERS_BY_LOCALE[locale];
  const ui = UI_LABELS[locale];

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.program, r.degree, r.department, r.credits, r.years]
        .map((v) => (v == null ? '' : String(v).toLowerCase()))
        .some((s) => s.includes(q)),
    );
  }, [rows, query]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      // Numeric compare when both sides parse as numbers.
      const an = typeof av === 'number' ? av : Number(av);
      const bn = typeof bv === 'number' ? bv : Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return (an - bn) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: keyof MajorRow) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleDownload = () => {
    const filename = `${slugify(faculty)}-majors.csv`;
    downloadCsv(filename, toCsv(sorted, headers));
  };

  const sortableCols: (keyof MajorRow)[] = ['program', 'degree', 'department', 'credits', 'years'];

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder={ui.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={ui.search}
        />
        <span className={styles.count}>
          {sorted.length} {ui.of} {rows.length}
        </span>
        <button
          type="button"
          className={styles.downloadBtn}
          onClick={handleDownload}>
          <span aria-hidden="true">⬇</span> {ui.download}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className={styles.empty}>{ui.noResults}</p>
      ) : (
        <div className={styles.scroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {sortableCols.map((col) => (
                  <th key={col}>
                    <button
                      type="button"
                      className={styles.thButton}
                      onClick={() => handleSort(col)}
                      aria-label={`Sort by ${headers[col]}`}>
                      <span>{headers[col]}</span>
                      <span className={styles.sortIndicator} aria-hidden="true">
                        {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
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
                  <td>{r.program}</td>
                  <td>{r.degree ?? ''}</td>
                  <td>{r.department ?? ''}</td>
                  <td>{r.credits ?? ''}</td>
                  <td>{r.years ?? ''}</td>
                  <td>
                    {r.source ? (
                      <a
                        href={r.source}
                        target="_blank"
                        rel="noopener noreferrer">
                        {locale === 'ar' ? 'الرابط' : 'Link'} ↗
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
      )}
    </div>
  );
}
