import type {IconName, Tint} from '@site/src/components/Homepage/ui';

export type PluginId = 'universities' | 'scholarships';

/** Points at a doc without hardcoding its URL, which fixture builds lack. */
export type DocRef = {plugin: PluginId; id: string};

export type PopularSearch = {
  label: string;
  /** Kept in English: program names are English or French in every locale. */
  query: string;
  doc?: DocRef;
};

export type Deadline = {
  ref: DocRef;
  title: string;
  /** YYYY-MM-DD. Without `opens`, the row never claims to be open. */
  opens?: string;
  closes: string;
  sourceUrl: string;
  verifiedOn: string;
};

export type MajorTile = {
  icon: IconName;
  tint: Tint;
  label: string;
  query: string;
};
