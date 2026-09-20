/**
 * Re-export the default theme MDX components and register our site-wide
 * custom components so MDX files can use them without an explicit import.
 * Docs: https://docusaurus.io/docs/markdown-features/react#mdx-component-scope
 *
 * Everything listed in scripts/drive_sync/components.toml must be registered
 * here — that registry is what an editor may name with `@component:` in a
 * .docx, and an unregistered name would reach the page as raw JSX.
 */
import MDXComponents from '@theme-original/MDXComponents';
import ApplyButton from '@site/src/components/ApplyButton';
import MajorsTable from '@site/src/components/MajorsTable';
import DataTable from '@site/src/components/DataTable';
import {
  ApplicationWindows,
  Callout,
  ContactsTable,
  FeeTable,
  ScholarshipOffers,
  TuitionTable,
} from '@site/src/components/ContentTables';

export default {
  ...MDXComponents,
  ApplyButton,
  MajorsTable,
  DataTable,
  TuitionTable,
  ApplicationWindows,
  FeeTable,
  ContactsTable,
  ScholarshipOffers,
  Callout,
};
