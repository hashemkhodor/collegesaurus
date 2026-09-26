/**
 * Semantic search in the browser, over the files plugins/semantic-search
 * writes. The index (every section's vector) is fetched once; for each query
 * only the term shards holding its words are fetched, and cached. No API is
 * called: the query's vector is the weighted average of its words' vectors.
 */
import {decodeIndex, decodeShard, shardPath, type Index, type IndexFile, type ShardFile, type TermEntry} from './format.ts';
import {candidateKeys, coverQuery, queryTokens} from './query.ts';
import {rankPages, type RankOptions} from './rank.ts';
import {pickSnippet} from './snippet.ts';
import {contentTokens, shardOf, variants} from './text.ts';
import {composeQuery, scoreAll} from './vectors.ts';

export type ResultSection = {title: string; href: string; snippet: string; score: number};

export type Result = {path: string; title: string; type: string; score: number; sections: ResultSection[]};

export type Outcome = {
  results: Result[];
  /** The query's words, for marking them in snippets. */
  terms: string[];
  /** False when no word of the query has a vector: nothing was searched. */
  understood: boolean;
};

export const RANKING: RankOptions = {limit: 20, perPage: 3, floor: 0, margin: 1, sectionMargin: 1};

type Load = (url: string) => Promise<unknown>;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  return response.json();
}

/** `base` is the locale's /semantic-search/ directory, ending in a slash. */
export function createEngine(base: string, load: Load = fetchJson) {
  let index: Promise<Index> | undefined;
  const shards = new Map<number, Promise<Map<string, TermEntry>>>();

  // A failed fetch is forgotten, so a later search tries again.
  const getIndex = () => {
    if (!index) {
      index = load(`${base}index.json`).then((file) => decodeIndex(file as IndexFile));
      index.catch(() => {
        index = undefined;
      });
    }
    return index;
  };
  const getShard = (n: number) => {
    let shard = shards.get(n);
    if (!shard) {
      shard = load(`${base}${shardPath(n)}`).then((file) => decodeShard(file as ShardFile));
      shards.set(n, shard);
      shard.catch(() => shards.delete(n));
    }
    return shard;
  };
  const lookup = async (keys: string[], {shards: count, dims}: Index, known: Map<string, TermEntry>) => {
    const byShard = new Map<number, string[]>();
    for (const key of keys) {
      const n = shardOf(key, count);
      byShard.set(n, [...(byShard.get(n) ?? []), key]);
    }
    await Promise.all(
      [...byShard].map(async ([n, inShard]) => {
        const terms = await getShard(n);
        for (const key of inShard) {
          const entry = terms.get(key);
          // An index.json still cached from before a deploy that changed the size.
          if (entry && entry.vector.q.length !== dims) {
            throw new Error(`search index has ${dims} dimensions but its terms ${entry.vector.q.length}`);
          }
          if (entry) {
            known.set(key, entry);
          }
        }
      }),
    );
  };

  return {
    /** Fetches the index ahead of the first query (when the box is focused). */
    async warm(): Promise<void> {
      await getIndex().catch(() => undefined);
    },

    async search(query: string, options: Partial<RankOptions> = {}): Promise<Outcome> {
      const tokens = queryTokens(query);
      const terms = contentTokens(tokens);
      if (terms.length === 0) {
        return {results: [], terms, understood: false};
      }
      const index = await getIndex();
      const {pages, chunks, matrix, scales} = index;
      const known = new Map<string, TermEntry>();
      await lookup(candidateKeys(tokens), index, known);
      let cover = coverQuery(tokens, (key) => known.has(key));
      if (cover.unknown.length > 0) {
        await lookup(cover.unknown.flatMap(variants), index, known);
        cover = coverQuery(tokens, (key) => known.has(key));
      }
      const vector = composeQuery(cover.keys.map((key) => known.get(key)!));
      if (!vector) {
        return {results: [], terms, understood: false};
      }
      const ranked = rankPages(scoreAll(vector, matrix, scales), chunks, {...RANKING, ...options});
      return {
        understood: true,
        terms,
        results: ranked.map(({page, score, sections}) => ({
          ...pages[page],
          score,
          sections: sections.map((section) => ({
            title: section.section,
            href: section.anchor ? `${pages[page].path}#${section.anchor}` : pages[page].path,
            snippet: pickSnippet(chunks[section.chunk].text, terms),
            score: section.score,
          })),
        })),
      };
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
