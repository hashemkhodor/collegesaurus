/**
 * Ranking for the search page.
 *
 * The search plugin already requires every token, but a record is a whole
 * heading-section including its program table, so every university matches a
 * query like "computer science" and lunr then ranks by field length, which
 * hands the top spot to whichever table is shortest. Nothing rewards the words
 * appearing together, and nothing prefers a hit in a title over one buried in a
 * table. This module re-ranks the candidates the worker returns.
 */

export const RecordType = {
  title: 0,
  heading: 1,
  description: 2,
  keywords: 3,
  content: 4,
} as const;

export type SearchDocument = {
  i: number;
  t: string;
  u: string;
  h?: string;
  p?: number;
  b?: string[];
  s?: string;
};

export type Candidate = {
  document: SearchDocument;
  type: number;
  page?: SearchDocument | false;
  score: number;
};

export type RankedResult = Candidate & {
  rank: number;
  sectionTitle: string;
  breadcrumb: string[];
  url: string;
};

/** Title beats heading beats body, which the plugin's own ordering loses. */
const TYPE_WEIGHT: Record<number, number> = {
  [RecordType.title]: 4,
  [RecordType.heading]: 2.6,
  [RecordType.content]: 1,
};

/** One page cannot take over the whole first screen. */
const MAX_PER_PAGE = 3;

const WORD_SPLIT = /[^\p{L}\p{N}]+/u;

export function words(text: string): string[] {
  return text.toLowerCase().split(WORD_SPLIT).filter(Boolean);
}

/** Query terms, with punctuation dropped: "computer science?" must still work. */
export function queryTerms(input: string): string[] {
  return words(input);
}

/**
 * Stemming means the indexed word and the typed word rarely match exactly, so
 * either may be the prefix of the other.
 */
function wordMatches(word: string, term: string): boolean {
  if (word === term) {
    return true;
  }
  if (term.length >= 3 && word.startsWith(term)) {
    return true;
  }
  return word.length >= 4 && term.startsWith(word);
}

export function containsAllTerms(haystack: string[], terms: string[]): boolean {
  return terms.every((term) => haystack.some((word) => wordMatches(word, term)));
}

export function countMatching(haystack: string[], terms: string[]): number {
  return terms.filter((term) => haystack.some((word) => wordMatches(word, term)))
    .length;
}

/** Where the terms appear next to each other, or -1. */
export function phraseIndex(text: string, terms: string[]): number {
  if (terms.length < 2) {
    return -1;
  }
  const pattern = terms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^\\p{L}\\p{N}]+');
  return text.toLowerCase().search(new RegExp(pattern, 'u'));
}

export function rankResults(
  candidates: Candidate[],
  input: string,
): RankedResult[] {
  const terms = queryTerms(input);
  if (terms.length === 0) {
    return [];
  }

  const ranked: RankedResult[] = [];
  for (const candidate of candidates) {
    const {document, type, page} = candidate;
    // The page's own description and keywords are noise here: every university
    // page's meta description is the single word "Faculty".
    if (type === RecordType.description || type === RecordType.keywords) {
      continue;
    }

    const pageTitle = (page && page.t) || (type === RecordType.title ? document.t : '');
    const sectionTitle = type === RecordType.content ? document.s ?? '' : document.t;
    const headingWords = words(`${sectionTitle} ${pageTitle}`);
    const bodyWords = words(document.t);

    // Every term has to appear somewhere on this result, counting its page
    // title, so "AUB tuition" keeps AUB's own tuition section.
    if (!containsAllTerms([...bodyWords, ...headingWords], terms)) {
      continue;
    }

    let rank = candidate.score * (TYPE_WEIGHT[type] ?? 1);
    if (phraseIndex(document.t, terms) >= 0) {
      rank *= 3.2;
    }
    if (phraseIndex(`${sectionTitle} ${pageTitle}`, terms) >= 0) {
      rank *= 1.8;
    }
    rank *= 1 + (0.6 * countMatching(headingWords, terms)) / terms.length;

    ranked.push({
      ...candidate,
      rank,
      sectionTitle: sectionTitle || document.t,
      breadcrumb: [...((page && page.b) || document.b || [])].concat(
        page && page.t && type !== RecordType.title ? [page.t] : [],
      ),
      url: document.u + (document.h ?? ''),
    });
  }

  ranked.sort((a, b) => b.rank - a.rank);

  const perPage = new Map<string, number>();
  return ranked.filter((result) => {
    const seen = perPage.get(result.document.u) ?? 0;
    perPage.set(result.document.u, seen + 1);
    return seen < MAX_PER_PAGE;
  });
}

export type Segment = {text: string; match: boolean};

/**
 * A window around the best match rather than the start of the record, so a
 * program search shows the program row instead of the table's header.
 */
export function buildSnippet(
  text: string,
  terms: string[],
  maxLength = 200,
): Segment[] {
  if (!text) {
    return [];
  }
  let start = phraseIndex(text, terms);
  if (start < 0) {
    const lower = text.toLowerCase();
    start = terms
      .map((term) => lower.indexOf(term))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0] ?? 0;
  }

  let from = Math.max(0, start - Math.floor(maxLength / 3));
  if (from > 0) {
    const space = text.indexOf(' ', from);
    from = space >= 0 && space - from < 20 ? space + 1 : from;
  }
  const slice = text.slice(from, from + maxLength);
  const prefix = from > 0 ? '…' : '';
  const suffix = from + maxLength < text.length ? '…' : '';

  const segments: Segment[] = [];
  let buffer = '';
  for (const part of slice.split(/(\s+)/)) {
    const bare = part.toLowerCase().replace(new RegExp(WORD_SPLIT, 'gu'), '');
    if (bare && terms.some((term) => wordMatches(bare, term))) {
      if (buffer) {
        segments.push({text: buffer, match: false});
        buffer = '';
      }
      segments.push({text: part, match: true});
    } else {
      buffer += part;
    }
  }
  if (buffer) {
    segments.push({text: buffer, match: false});
  }

  if (prefix) {
    segments.unshift({text: prefix, match: false});
  }
  if (suffix) {
    segments.push({text: suffix, match: false});
  }
  return segments;
}
