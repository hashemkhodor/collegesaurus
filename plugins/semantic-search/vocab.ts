/**
 * The term table's contents: every word of the pages, the phrases several
 * sections share ("computer science", "financial aid"), and general words
 * and student phrases the pages lack, so a synonym typed into the box still
 * has a vector. Each term is weighed by how specific it is: a word in most
 * sections ("university") says little about which one is meant.
 */
import {MAX_PHRASE} from '../../src/components/Search/query.ts';
import {isStopword, tokenize} from '../../src/components/Search/text.ts';

export type Term = {key: string; text: string; weight: number};

export type VocabularyInput = {
  /** Plain text of each section; a term counts once per section. */
  documents: string[];
  words?: string[];
  phrases?: string[];
  maxN?: number;
  /** A phrase has to appear in at least this many sections. */
  minCount?: number;
  /** A term in at most this many sections keeps its full weight. */
  common?: number;
  minWeight?: number;
};

// Phrases never run across these: table cells, sentences, brackets, lines.
const SEGMENT = /[\n·|.,;:!?()[\]{}"“”«»—–/،؛؟]+/;
const WORD = /[\p{L}\p{M}\p{N}]+/gu;

type Token = {key: string; surface: string};
type Seen = {sections: number; spellings: Map<string, number>};

function words(segment: string): Token[] {
  const out: Token[] = [];
  for (const [surface] of segment.matchAll(WORD)) {
    const keys = tokenize(surface);
    if (keys.length === 1) {
      out.push({key: keys[0], surface});
    } else {
      out.push(...keys.map((key) => ({key, surface: key})));
    }
  }
  return out;
}

function mostCommon(spellings: Map<string, number>): string {
  let best = '';
  let count = 0;
  for (const [spelling, n] of spellings) {
    if (n > count) {
      best = spelling;
      count = n;
    }
  }
  return best;
}

export function buildVocabulary(input: VocabularyInput): Term[] {
  const {documents, maxN = MAX_PHRASE, minCount = 2, common = 30, minWeight = 0.05} = input;
  const seen = new Map<string, Seen>();
  for (const document of documents) {
    const inSection = new Set<string>();
    const note = (key: string, surface: string) => {
      let entry = seen.get(key);
      if (!entry) {
        entry = {sections: 0, spellings: new Map()};
        seen.set(key, entry);
      }
      entry.spellings.set(surface, (entry.spellings.get(surface) ?? 0) + 1);
      if (!inSection.has(key)) {
        inSection.add(key);
        entry.sections += 1;
      }
    };
    for (const segment of document.split(SEGMENT)) {
      const tokens = words(segment);
      tokens.forEach((token, i) => {
        if (isStopword(token.key)) {
          return;
        }
        note(token.key, token.surface);
        for (let n = 2; n <= maxN && i + n <= tokens.length; n += 1) {
          if (!isStopword(tokens[i + n - 1].key)) {
            const span = tokens.slice(i, i + n);
            note(span.map((t) => t.key).join(' '), span.map((t) => t.surface).join(' '));
          }
        }
      });
    }
  }

  const idf = (sections: number) => Math.log((documents.length + 1) / (sections + 1));
  const full = idf(common);
  const terms = new Map<string, Term>();
  for (const [key, {sections, spellings}] of seen) {
    if (key.includes(' ') && sections < minCount) {
      continue;
    }
    const weight = full > 0 ? Math.min(1, Math.max(minWeight, idf(sections) / full)) : 1;
    terms.set(key, {key, text: mostCommon(spellings), weight});
  }
  for (const entry of [...(input.words ?? []), ...(input.phrases ?? [])]) {
    const tokens = tokenize(entry);
    const key = tokens.join(' ');
    const usable =
      tokens.length > 0 && tokens.length <= maxN && !isStopword(tokens[0]) && !isStopword(tokens[tokens.length - 1]);
    if (usable && !terms.has(key)) {
      terms.set(key, {key, text: entry.trim(), weight: 1});
    }
  }
  return [...terms.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
