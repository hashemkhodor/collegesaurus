/**
 * Text rules shared by the index build and the browser. Both sides must turn
 * "Médecine", "médecine" and "MEDECINE" (or "الجامعة" and "الجامعه") into the
 * same key, or a query never finds the vector built for it.
 */

const ARABIC = /[؀-ۿ]/;
const MARKS = /\p{M}/gu;
const NON_WORD = /[^\p{L}\p{N}]+/u;
const ARABIC_EXTRAS = /[٠-٩۰-۹ىةیکـ]/g;

function arabicExtra(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0x0660 && code <= 0x0669) {
    return String(code - 0x0660);
  }
  if (code >= 0x06f0 && code <= 0x06f9) {
    return String(code - 0x06f0);
  }
  return {ى: 'ي', ة: 'ه', ی: 'ي', ک: 'ك', ـ: ''}[char] ?? char;
}

/** Decomposing then dropping marks removes Latin accents, Arabic diacritics and the hamza on alef alike. */
export function normalize(text: string): string {
  return text.normalize('NFKD').replace(MARKS, '').toLowerCase().replace(ARABIC_EXTRAS, arabicExtra);
}

export function tokenize(text: string): string[] {
  return normalize(text).split(NON_WORD).filter(Boolean);
}

const STOPWORDS = new Set(
  [
    // English, plus the words a search adds without narrowing it.
    'about above after again against all also am an and any are as at be because been before being below',
    'between both but by can could did do does doing down during each few for from further had has have',
    'having he her here hers herself him himself his how if in into is it its itself just me more most my',
    'myself no nor not now of off on once only or other our ours ourselves out over own same she should so',
    'some such than that the their theirs them themselves then there these they this those through to too',
    'under until up very was we were what when where which while who whom whose why will with would you',
    'your yours yourself yourselves best top good great list find want looking look info information',
    'please tell show like get know give vs etc per',
    // French, accents folded.
    'au aux avec ce ces cet cette dans de des du elle elles en et eux il ils je la le les leur leurs lui',
    'ma mais me mes moi mon ne nos notre nous ou par pas pour qu que qui sa se ses son sur ta te tes toi ton',
    'tu un une vos votre vous est sont etre ete comment quel quelle quels quelles combien meilleur',
    'meilleure meilleurs meilleures',
    // Arabic, normalized as above.
    'في من الي علي عن مع هذا هذه ذلك تلك التي الذي الذين او ام ثم ان انا انت انتم هو هي هم هن نحن كان',
    'كانت يكون تكون ما ماذا متي اين كيف كم هل لا لم لن قد كل بعض غير بين عند عندي حتي اذا لماذا اي ايه',
    'شو وين ايش كيفيه افضل احسن اريد بدي ممكن لو يا مثل حول لدي',
  ]
    .join(' ')
    .split(' '),
);

/** Single letters are elisions and conjunctions ("d'", "l'", "و"), never a subject; nor are numbers. */
export function isStopword(token: string): boolean {
  return token.length < 2 || STOPWORDS.has(token) || /^\d+$/.test(token);
}

export function contentTokens(tokens: string[]): string[] {
  return tokens.filter((token) => !isStopword(token));
}

const PLURALS: [RegExp, string][] = [
  [/ies$/, 'y'],
  [/s$/, ''],
  [/es$/, ''],
];
const ARABIC_PREFIXES = ['وال', 'فال', 'بال', 'كال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل'];
const ARABIC_SUFFIXES: [string, string][] = [
  ['ات', 'ه'],
  ['ات', ''],
  ['ون', ''],
  ['ين', ''],
];

/**
 * Other spellings to look up when a word itself has no vector: a singular for
 * a plural, or an Arabic word without the conjunctions, prepositions and
 * article written onto it. Least changed first.
 */
export function variants(word: string): string[] {
  const out: string[] = [];
  const add = (form: string, minLength: number) => {
    if (form.length >= minLength && form !== word && !out.includes(form)) {
      out.push(form);
    }
  };
  if (ARABIC.test(word)) {
    const stems = ARABIC_PREFIXES.filter((prefix) => word.startsWith(prefix))
      .map((prefix) => word.slice(prefix.length))
      .sort((a, b) => b.length - a.length);
    for (const form of [word, ...stems]) {
      add(form, 2);
      for (const [suffix, replacement] of ARABIC_SUFFIXES) {
        if (form.endsWith(suffix)) {
          add(form.slice(0, -suffix.length) + replacement, 2);
        }
      }
    }
    return out;
  }
  for (const [pattern, replacement] of PLURALS) {
    if (pattern.test(word)) {
      add(word.replace(pattern, replacement), 3);
    }
  }
  return out;
}

/** FNV-1a: which of `count` files holds a term's vector. */
export function shardOf(key: string, count: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}
