/**
 * Masks profanity in a search query before it's echoed back onto the page
 * ("No pages match ..."). The query is never stored or sent anywhere, but a
 * slur one visitor types shouldn't sit rendered in the page for the next.
 * Reuses text.ts's normalize() so the same case, diacritic and Arabic
 * letter-variant folding search already does can't be used to slip a word
 * past this filter either, and matches whole words only — a legitimate word
 * that happens to contain a shorter bad word (e.g. "class", "دخول") is never
 * flagged.
 *
 * The list is stored as FNV-1a hashes of each normalized word and its
 * inflected forms, not the words themselves, so this file has none of them
 * as readable text. That's obscurity, not secrecy: the hash is unsalted and
 * public (it runs in the browser), so it only deters a casual grep or
 * browse, not someone willing to hash their own guesses against it.
 */
import {fnv1a, normalize, variants} from './text.ts';

// To add or remove a word: for each normalized form (the word and, for
// English/Arabic, variants(word)), take fnv1a(form) and add/remove that
// literal here. The reviewed plaintext list this set was generated from is
// kept out-of-band (task plan/PR description, not this file) so it can be
// reviewed by reading it — a hash can't be.
const BAD_WORD_HASHES = new Set<number>([
  0x00f58332, 0x0240fa51, 0x06d6111e, 0x0c74d2de, 0x0f7d909e, 0x1b7da382, 0x1cfa2eb3, 0x2507795b, 0x258a7caf,
  0x2988fc55, 0x3272efda, 0x37806886, 0x37c91463, 0x3a029c15, 0x3aaf1cc4, 0x542539af, 0x5cbc4498, 0x635b1b38,
  0x6537d094, 0x69f7b67e, 0x6c3242d6, 0x6cd5e87b, 0x73d889a4, 0x7c9ae63f, 0x80e87ed3, 0x81602170, 0x844534b1,
  0x86587e1e, 0x8814611d, 0x893dcdb6, 0x8c18b6fb, 0x8cbaf11a, 0x8daabf1c, 0x907d7c92, 0x91b887d3, 0x921470db,
  0x92a4ff90, 0x948002a1, 0x955b3ec5, 0x9b5fac47, 0xa0fac747, 0xa4705559, 0xa5333d2e, 0xa615602a, 0xa81bc85c,
  0xa856eb33, 0xad53f7b9, 0xb63193bc, 0xb907c625, 0xb99bf986, 0xbb7973ea, 0xbc5c81b2, 0xbcbed259, 0xc5602537,
  0xc89958b2, 0xcbea02ed, 0xcda2b38b, 0xcf5447f4, 0xd4a3b882, 0xd550b6de, 0xd7337605, 0xd8a26d36, 0xd95c3b1f,
  0xd9eb56dd, 0xddf39677, 0xe571c3ec, 0xe6774d4a, 0xe8e7a15a, 0xe95c544f, 0xea31855f, 0xea4f0597, 0xede61093,
]);

function isBadWord(normalizedWord: string): boolean {
  return [normalizedWord, ...variants(normalizedWord)].some((form) => BAD_WORD_HASHES.has(fnv1a(form)));
}

function mask(word: string): string {
  return word.length <= 1 ? '*' : word[0] + '*'.repeat(word.length - 1);
}

// Marks (\p{M}) stay part of a word here, unlike text.ts's tokenize(): the
// query is still raw, so splitting on a diacritic first would fragment a
// word before normalize() gets to fold it back — letting a diacritic dodge
// the filter instead of being stripped by it.
const WORD = /[\p{L}\p{N}\p{M}]+/gu;

/** `query`, with any listed word replaced by its first letter and asterisks; everything else (spacing, punctuation, casing, other words) is left exactly as typed. */
export function maskProfanity(query: string): string {
  return query.replace(WORD, (word) => (isBadWord(normalize(word)) ? mask(word) : word));
}
