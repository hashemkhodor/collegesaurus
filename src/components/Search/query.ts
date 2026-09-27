/**
 * Which words and phrases of a query have vectors in the term table, shared
 * by the build (which decides what the table holds) and the browser (which
 * looks the query up). A known phrase such as "computer science" wins over
 * its words, since its own vector means more than their average.
 */
import {isStopword, tokenize, variants} from './text.ts';

export const MAX_PHRASE = 3;

/** The query's words. "IT" in capitals is the major; "it" stays a stopword. */
export function queryTokens(query: string): string[] {
  return tokenize(query.replace(/\bIT\b/g, 'information technology'));
}

/** Every key worth fetching for `tokens`: phrases (not starting or ending on a stopword) and words. */
export function candidateKeys(tokens: string[], maxN = MAX_PHRASE): string[] {
  const keys: string[] = [];
  tokens.forEach((token, i) => {
    if (isStopword(token)) {
      return;
    }
    for (let n = Math.min(maxN, tokens.length - i); n >= 1; n -= 1) {
      if (n > 1 && isStopword(tokens[i + n - 1])) {
        continue;
      }
      const key = tokens.slice(i, i + n).join(' ');
      if (!keys.includes(key)) {
        keys.push(key);
      }
    }
  });
  return keys;
}

/** Reads the query left to right, taking the longest known phrase at each word. */
export function coverQuery(
  tokens: string[],
  has: (key: string) => boolean,
  maxN = MAX_PHRASE,
): {keys: string[]; unknown: string[]} {
  const keys: string[] = [];
  const unknown: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (isStopword(token)) {
      i += 1;
      continue;
    }
    let taken = 0;
    for (let n = Math.min(maxN, tokens.length - i); n >= 2 && !taken; n -= 1) {
      const key = tokens.slice(i, i + n).join(' ');
      if (!isStopword(tokens[i + n - 1]) && has(key)) {
        keys.push(key);
        taken = n;
      }
    }
    if (!taken) {
      const key = [token, ...variants(token)].find(has);
      if (key) {
        keys.push(key);
      } else {
        unknown.push(token);
      }
      taken = 1;
    }
    i += taken;
  }
  return {keys, unknown};
}
