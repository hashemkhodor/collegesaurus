import {useCallback, useEffect, useRef, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {fetchIndexesByWorker, searchByWorker} from '@theme/searchByWorker';
import {queryTerms, rankResults} from '@site/src/theme/SearchPage/ranking';
import {createEngine, type Engine, type Result} from './engine';
import {findResults, type Found} from './find';
import {fromKeywordResults} from './keyword';
import {containsBadWord} from './profanity';
import {contentTokens, tokenize} from './text';

export const MIN_QUERY = 2;
const DEBOUNCE_MS = 120;
// After search by meaning fails, exact words answer for this long before it is tried again.
const RETRY_MS = 60_000;

export type SearchState = Found & {status: 'idle' | 'loading' | 'done' | 'error'; query: string};

const IDLE: SearchState = {status: 'idle', query: '', source: 'semantic', results: [], terms: []};

// One engine per locale, shared by the navbar box and the search page, so
// their caches are too.
const engines = new Map<string, Engine>();
let semanticDownUntil = 0;

function engineAt(base: string): Engine {
  let engine = engines.get(base);
  if (!engine) {
    engine = createEngine(base);
    engines.set(base, engine);
  }
  return engine;
}

async function keywordSearch(baseUrl: string, query: string, limit: number): Promise<Result[]> {
  const cleaned = queryTerms(query).join(' ');
  if (!cleaned) {
    return [];
  }
  await fetchIndexesByWorker(baseUrl, '');
  const candidates = await searchByWorker(baseUrl, '', cleaned, 100);
  return fromKeywordResults(rankResults(candidates, query), contentTokens(tokenize(query))).slice(0, limit);
}

/** Results for `query`, by meaning or else by exact words; the previous results stay while a new query runs. */
export function useSearch(query: string, {limit, enabled = true}: {limit: number; enabled?: boolean}): SearchState {
  const engine = engineAt(useBaseUrl('/semantic-search/'));
  const {baseUrl} = useDocusaurusContext().siteConfig;
  const [state, setState] = useState<SearchState>(IDLE);
  const latest = useRef(0);

  useEffect(() => {
    const text = query.trim();
    latest.current += 1;
    const id = latest.current;
    if (!enabled || text.length < MIN_QUERY) {
      setState({...IDLE, query: text});
      return undefined;
    }
    // Neither engine guarantees zero results for a query with no good match —
    // they return their nearest candidates. A masked query must show none, or
    // the masked text ends up captioned over real, unrelated pages.
    if (containsBadWord(text)) {
      setState({...IDLE, status: 'done', query: text});
      return undefined;
    }
    setState((previous) => ({...previous, status: 'loading', query: text}));
    const timer = window.setTimeout(() => {
      findResults(text, {
        semantic: Date.now() < semanticDownUntil ? undefined : (q) => engine.search(q, {limit}),
        keyword: (q) => keywordSearch(baseUrl, q, limit),
        onSemanticFailure: () => {
          semanticDownUntil = Date.now() + RETRY_MS;
        },
      }).then(
        (found) => id === latest.current && setState({...found, status: 'done', query: text}),
        () => id === latest.current && setState({...IDLE, status: 'error', query: text}),
      );
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, enabled, engine, baseUrl, limit]);

  return state;
}

/** Starts fetching the index, for when the box gets focus or the pointer. */
export function useSearchWarmUp(): () => void {
  const engine = engineAt(useBaseUrl('/semantic-search/'));
  return useCallback(() => void engine.warm(), [engine]);
}
