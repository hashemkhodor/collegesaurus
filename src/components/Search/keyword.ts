/**
 * The keyword search the site had before (the local search plugin's lunr
 * index, re-ranked by ../../theme/SearchPage/ranking.ts), shaped like
 * semantic results, so the search box can fall back to it and show it the
 * same way.
 */
import {RecordType, type RankedResult} from '../../theme/SearchPage/ranking.ts';
import type {Result} from './engine';
import {pickSnippet} from './snippet.ts';

const KINDS: Record<string, string> = {universities: 'university', scholarships: 'scholarship', stories: 'story'};

export function pageType(path: string): string {
  const match = /^(?:\/[a-z]{2})?\/(universities|scholarships|stories)\//.exec(path);
  return match ? KINDS[match[1]] : 'page';
}

export function fromKeywordResults(results: RankedResult[], terms: string[] = []): Result[] {
  const pages = new Map<string, Result>();
  for (const result of results) {
    const {document, type, page} = result;
    let entry = pages.get(document.u);
    if (!entry) {
      const title = page && page.t ? page.t : type === RecordType.title ? document.t : result.sectionTitle;
      entry = {path: document.u, title, type: pageType(document.u), score: result.rank, sections: []};
      pages.set(document.u, entry);
    }
    if (type !== RecordType.title && !entry.sections.some((section) => section.href === result.url)) {
      entry.sections.push({
        title: result.sectionTitle,
        href: result.url,
        snippet: type === RecordType.content ? pickSnippet(document.t, terms) : '',
        score: result.rank,
      });
    }
  }
  return [...pages.values()];
}
