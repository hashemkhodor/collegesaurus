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

const col = (key: string, en: string, ar: string, fr: string, extra: Partial<ColumnSpec> = {}): ColumnSpec => ({
  key,
  labels: {en, ar, fr},
  ...extra,
});

const REFERENCE = col('reference', 'Reference', 'المرجع', "Référence", {link: true, sortable: false});
const SOURCE = col('source', 'Source', 'المصدر', "Source", {link: true, sortable: false});

export function TuitionTable({rows}: TableProps): ReactNode {
  return (
    <DataTable
      rows={rows}
      columns={[
        col('faculty', 'Faculty / School', 'الكلية', "Faculté / École"),
        col('faculty_school', 'Faculty / School', 'الكلية', "Faculté / École"),
        col('program', 'Program', 'البرنامج', "Programme"),
        col('usd_per_credit', 'USD per credit', 'دولار لكل ساعة', "USD par crédit"),
        col('usd_per_year', 'USD per year', 'دولار سنويًا', "USD par an"),
        col('notes', 'Notes', 'ملاحظات', "Notes"),
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
        col('term', 'Term', 'الفصل', "Semestre"),
        col('opens', 'Opens', 'يفتح', "Ouverture"),
        col('closes', 'Closes', 'يقفل', "Clôture"),
        col('decisions', 'Decisions', 'القرارات', "Décisions"),
        col('latest_sat', 'Latest SAT', 'آخر موعد SAT', "Dernier SAT"),
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
        col('fee', 'Fee', 'الرسم', "Frais"),
        col('amount', 'Amount (USD)', 'المبلغ (دولار)', "Montant (USD)"),
        col('amount_usd', 'Amount (USD)', 'المبلغ (دولار)', "Montant (USD)"),
        col('notes', 'Notes', 'ملاحظات', "Notes"),
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
        col('department', 'Department', 'القسم', "Département"),
        col('office', 'Office', 'المكتب', "Bureau"),
        col('campus', 'Campus', 'الحرم', "Campus"),
        col('phone', 'Phone', 'الهاتف', "Téléphone"),
        col('email', 'Email', 'البريد الإلكتروني', "E-mail"),
        col('notes', 'Notes', 'ملاحظات', "Notes"),
      ]}
    />
  );
}

export function ScholarshipOffers({rows}: TableProps): ReactNode {
  return (
    <DataTable
      rows={rows}
      columns={[
        col('scholarship', 'Scholarship', 'المنحة', "Bourse"),
        col('coverage', 'Coverage', 'التغطية', "Couverture"),
        col('eligibility', 'Eligibility', 'شروط الأهلية', "Conditions d’éligibilité"),
        col('conditions', 'Conditions', 'الشروط', "Conditions"),
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
