/**
 * Which search answers a query. Search by meaning goes first; exact words
 * (the old keyword search) answer when it fails, when it cannot read any word
 * of the query (a typo, a name it has no vector for), or when nothing it found
 * cleared the floor. If exact words fail too, the caller says search is down.
 */
import type {Outcome, Result} from './engine';
import {queryTokens} from './query.ts';
import {contentTokens} from './text.ts';

export type Found = {source: 'semantic' | 'keyword'; results: Result[]; terms: string[]};

export type Sources = {
  /** Absent while search by meaning is known to be down. */
  semantic?: (query: string) => Promise<Outcome>;
  keyword: (query: string) => Promise<Result[]>;
  onSemanticFailure?: (error: unknown) => void;
};

export async function findResults(query: string, sources: Sources): Promise<Found> {
  const terms = contentTokens(queryTokens(query));
  let understood = false;
  if (sources.semantic) {
    try {
      const outcome = await sources.semantic(query);
      if (outcome.understood && outcome.results.length > 0) {
        return {source: 'semantic', results: outcome.results, terms: outcome.terms};
      }
      understood = outcome.understood;
    } catch (error) {
      sources.onSemanticFailure?.(error);
    }
  }
  const results = await sources.keyword(query);
  return understood && results.length === 0 ? {source: 'semantic', results, terms} : {source: 'keyword', results, terms};
}
