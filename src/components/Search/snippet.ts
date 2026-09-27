/**
 * What a result shows of its section: the line that shares most words with
 * the query (a program's table row rather than the section's first line), and
 * those words marked. A result found by meaning alone may share no word, and
 * then shows the section's first line.
 */
import {tokenize, variants} from './text.ts';

export type Segment = {text: string; match: boolean};

const WORD = /[\p{L}\p{M}\p{N}]+/gu;

function sameWord(word: string, term: string): boolean {
  return word === term || (term.length >= 3 && word.startsWith(term)) || (word.length >= 4 && term.startsWith(word));
}

/** "والتمريض" stands for "تمريض", and "Médecine" for "medecine". */
function stands(written: string, terms: string[]): boolean {
  const [word] = tokenize(written);
  if (!word) {
    return false;
  }
  const forms = [word, ...variants(word)];
  return terms.some((term) => forms.some((form) => sameWord(form, term)));
}

export function pickSnippet(text: string, terms: string[], maxLength = 180): string {
  const lines = text.split('\n').filter((line) => line.trim());
  let best = lines[0] ?? '';
  let most = 0;
  for (const line of lines) {
    const found = new Set<string>();
    for (const [word] of line.matchAll(WORD)) {
      terms.filter((term) => stands(word, [term])).forEach((term) => found.add(term));
    }
    if (found.size > most) {
      best = line;
      most = found.size;
    }
  }
  return cut(best, terms, maxLength);
}

function cut(line: string, terms: string[], maxLength: number): string {
  if (line.length <= maxLength) {
    return line;
  }
  const first = [...line.matchAll(WORD)].find(([word]) => stands(word, terms))?.index ?? 0;
  let start = Math.max(0, first - Math.floor(maxLength / 4));
  if (start > 0) {
    const space = line.indexOf(' ', start);
    start = space >= 0 && space < first ? space + 1 : start;
  }
  let end = Math.min(line.length, start + maxLength);
  if (end < line.length) {
    const space = line.lastIndexOf(' ', end);
    end = space > start ? space : end;
  }
  return `${start > 0 ? '…' : ''}${line.slice(start, end).trim()}${end < line.length ? '…' : ''}`;
}

export function highlight(text: string, terms: string[]): Segment[] {
  const segments: Segment[] = [];
  let plain = '';
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    plain += text.slice(last, match.index);
    if (stands(match[0], terms)) {
      if (plain) {
        segments.push({text: plain, match: false});
        plain = '';
      }
      segments.push({text: match[0], match: true});
    } else {
      plain += match[0];
    }
    last = match.index! + match[0].length;
  }
  plain += text.slice(last);
  if (plain) {
    segments.push({text: plain, match: false});
  }
  return segments;
}
