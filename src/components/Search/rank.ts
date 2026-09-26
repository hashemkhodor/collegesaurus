/**
 * Turns per-chunk similarity scores into the result list: pages ordered by
 * their best-matching section, each with its best few sections. The order is
 * the vector score and nothing else.
 */

export type ChunkRef = {page: number; section: string; anchor: string | null};

export type RankedSection = {chunk: number; section: string; anchor: string | null; score: number};

export type RankedPage = {page: number; score: number; sections: RankedSection[]};

export type RankOptions = {
  limit: number;
  perPage: number;
  /** Below this nothing is shown, however few results that leaves. */
  floor: number;
  /** Pages scoring more than this under the best page are dropped. */
  margin: number;
  /** Sections scoring more than this under their page's best are dropped. */
  sectionMargin: number;
};

export function rankPages(scores: ArrayLike<number>, chunks: ChunkRef[], options: RankOptions): RankedPage[] {
  const {limit, perPage, floor, margin, sectionMargin} = options;
  const order = Array.from(chunks.keys()).sort((a, b) => scores[b] - scores[a] || a - b);
  const pages = new Map<number, RankedPage>();
  for (const i of order) {
    const score = scores[i];
    if (score < floor) {
      break;
    }
    const {page, section, anchor} = chunks[i];
    let entry = pages.get(page);
    if (!entry) {
      entry = {page, score, sections: []};
      pages.set(page, entry);
    }
    const key = anchor ?? section;
    const shown = entry.sections.some((kept) => (kept.anchor ?? kept.section) === key);
    if (!shown && entry.sections.length < perPage && score >= entry.score - sectionMargin) {
      entry.sections.push({chunk: i, section, anchor, score});
    }
  }
  const ranked = [...pages.values()];
  const top = ranked[0]?.score ?? 0;
  return ranked.filter((page) => page.score >= top - margin).slice(0, limit);
}
