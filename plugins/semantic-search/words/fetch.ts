/**
 * Regenerates en.txt, fr.txt and ar.txt: the whole words of three open
 * tokenizer vocabularies, one per line, so a word the pages never use (a
 * synonym, a paraphrase) still gets a vector. Run it by hand; the lists are
 * committed so builds need no network for them.
 *
 *   node plugins/semantic-search/words/fetch.ts
 */
import fs from 'node:fs';
import path from 'node:path';

const HF = 'https://huggingface.co';
const OUT = path.dirname(new URL(import.meta.url).pathname);

type Source = {file: string; url: string; pick: (text: string) => string[]};

function wordPiece(text: string, word: RegExp): string[] {
  return text.split('\n').filter((line) => word.test(line));
}

function sentencePiece(text: string, word: RegExp): string[] {
  const {model} = JSON.parse(text) as {model: {vocab: [string, number][]}};
  return model.vocab.map(([piece]) => piece).filter((piece) => word.test(piece)).map((piece) => piece.slice(1));
}

const SOURCES: Source[] = [
  {
    file: 'en.txt',
    url: `${HF}/google-bert/bert-base-uncased/resolve/main/vocab.txt`,
    pick: (text) => wordPiece(text, /^[a-z]{3,}$/),
  },
  {
    file: 'fr.txt',
    url: `${HF}/almanach/camembert-base/resolve/main/tokenizer.json`,
    pick: (text) => sentencePiece(text, /^▁[a-zàâäçéèêëîïôöùûüÿœæ]{3,}$/),
  },
  {
    file: 'ar.txt',
    url: `${HF}/CAMeL-Lab/bert-base-arabic-camelbert-mix/resolve/main/vocab.txt`,
    pick: (text) => wordPiece(text, /^[ء-ي]{2,}$/),
  },
];

for (const {file, url, pick} of SOURCES) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  const words = [...new Set(pick(await response.text()))];
  fs.writeFileSync(path.join(OUT, file), `${words.join('\n')}\n`);
  console.log(`${file}: ${words.length} words`);
}
