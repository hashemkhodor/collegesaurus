import {useEffect, useState} from 'react';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';
import {usePluginData} from '@docusaurus/useGlobalData';
import type {DocRef, PluginId} from '@site/src/data/homepage/types';
import type {HomeDoc, HomepageData} from '@site/plugins/homepage-data/types';

const NO_DATA: HomepageData = {
  generatedAt: '1970-01-01T00:00:00.000Z',
  universities: [],
  scholarships: [],
  totals: {universities: 0, scholarships: 0, programs: null},
};

/** Index of the newest academic year, published by the homepage-data plugin. */
export function useHomepageData(): HomepageData {
  return (usePluginData('homepage-data') as HomepageData | undefined) ?? NO_DATA;
}

/**
 * A curated entry names a doc rather than a URL. Unresolved ones are dropped by
 * the caller, so a build with only fixture content emits no broken links.
 */
export function findDoc(data: HomepageData, ref: DocRef): HomeDoc | undefined {
  const docs =
    ref.plugin === 'universities' ? data.universities : data.scholarships;
  return docs.find((doc) => doc.id === ref.id);
}

export function useResolveDoc(ref: DocRef): HomeDoc | undefined {
  return findDoc(useHomepageData(), ref);
}

/** Entry URL of a docs section: its main doc in the newest academic year. */
export function useDocsEntry(plugin: PluginId): string {
  const data = useAllDocsData()[plugin];
  const version = data?.versions[0];
  const main = version?.docs.find((doc) => doc.id === version.mainDocId);
  return main?.path ?? version?.path ?? `/${plugin}`;
}

/**
 * Null while rendering on the server and on the first client render, so both
 * produce the same markup; a real clock once mounted.
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now;
}
