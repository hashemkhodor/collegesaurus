/**
 * The components a `.docx` may name with `@component:`.
 *
 * Each one is a thin column configuration over `DataTable` — the localized
 * labels live here, the behaviour lives there. Adding a new one is a block in
 * this file plus a row in `scripts/drive_sync/components.toml`; nothing in the
 * Python pipeline needs to change.
 *
 * Column keys are the slugified header cells of the table the editor wrote, so
 * they must match what the Drive document actually says. A column that is not
 * configured here still renders — `DataTable` falls back to a humanized key.
 */
import type {ReactNode} from 'react';
import DataTable, {type ColumnSpec, type Row} from '@site/src/components/DataTable';

type TableProps = {rows: Row[]; [key: string]: unknown};

const col = (key: string, en: string, ar: string, extra: Partial<ColumnSpec> = {}): ColumnSpec => ({
  key,
  labels: {en, ar},
  ...extra,
});

const REFERENCE = col('reference', 'Reference', 'المرجع', {link: true, sortable: false});
const SOURCE = col('source', 'Source', 'المصدر', {link: true, sortable: false});

export function TuitionTable({rows}: TableProps): ReactNode {
  return (
    <DataTable
      rows={rows}
      columns={[
        col('faculty', 'Faculty / School', 'الكلية'),
        col('faculty_school', 'Faculty / School', 'الكلية'),
        col('program', 'Program', 'البرنامج'),
        col('usd_per_credit', 'USD per credit', 'دولار لكل ساعة'),
        col('usd_per_year', 'USD per year', 'دولار سنويًا'),
        col('notes', 'Notes', 'ملاحظات'),
        REFERENCE,
        SOURCE,
      ]}
    />
  );
}

export function ApplicationWindows({rows}: TableProps): ReactNode {
  return (
    <DataTable
      rows={rows}
      columns={[
        col('term', 'Term', 'الفصل'),
        col('opens', 'Opens', 'يفتح'),
        col('closes', 'Closes', 'يقفل'),
        col('decisions', 'Decisions', 'القرارات'),
        col('latest_sat', 'Latest SAT', 'آخر موعد SAT'),
        REFERENCE,
      ]}
    />
  );
}

export function FeeTable({rows}: TableProps): ReactNode {
  return (
    <DataTable
      rows={rows}
      columns={[
        col('fee', 'Fee', 'الرسم'),
        col('amount', 'Amount (USD)', 'المبلغ (دولار)'),
        col('amount_usd', 'Amount (USD)', 'المبلغ (دولار)'),
        col('notes', 'Notes', 'ملاحظات'),
        REFERENCE,
      ]}
    />
  );
}

export function ContactsTable({rows}: TableProps): ReactNode {
  return (
    <DataTable
      rows={rows}
      columns={[
        col('department', 'Department', 'القسم'),
        col('office', 'Office', 'المكتب'),
        col('campus', 'Campus', 'الحرم'),
        col('phone', 'Phone', 'الهاتف'),
        col('email', 'Email', 'البريد الإلكتروني'),
        col('notes', 'Notes', 'ملاحظات'),
      ]}
    />
  );
}

export function ScholarshipOffers({rows}: TableProps): ReactNode {
  return (
    <DataTable
      rows={rows}
      columns={[
        col('scholarship', 'Scholarship', 'المنحة'),
        col('coverage', 'Coverage', 'التغطية'),
        col('eligibility', 'Eligibility', 'شروط الأهلية'),
        col('conditions', 'Conditions', 'الشروط'),
        REFERENCE,
      ]}
    />
  );
}

/**
 * `@component: Callout variant=warning` wraps the block below it. Maps onto
 * Docusaurus' admonition styling rather than inventing a second look.
 */
export function Callout({
  variant = 'info',
  children,
}: {
  variant?: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className={`theme-admonition alert alert--${variant === 'warning' ? 'warning' : 'info'}`}>
      {children}
    </div>
  );
}
