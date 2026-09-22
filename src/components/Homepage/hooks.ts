import {useEffect, useState} from 'react';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';
import type {PluginId} from '@site/src/data/homepage/types';

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
