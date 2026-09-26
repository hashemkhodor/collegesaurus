/**
 * From the pages to the search files: sections with their heading ids and
 * text, the vocabulary, and an embedding for each (see ./index.ts, which
 * runs this at build time, and ./eval.ts, which measures it).
 */
import fs from 'node:fs';
import path from 'node:path';
import {encodeIndex, encodeShards, shardPath, type ChunkMeta, type PageMeta} from '../../src/components/Search/format.ts';
import {dequantize, quantize, unit, type Quantized} from '../../src/components/Search/vectors.ts';
import {chunkDocument} from './chunk.ts';
import type {TaskType} from './embedder.ts';
import {plainText, withoutLinks} from './markdown.ts';
import {buildVocabulary} from './vocab.ts';

/** A page as plugins/chatbot-corpus collects it. */
export type SourceDoc = {type: string; title: string; url: string; content_year: string | null; body: string};

export type SectionChunk = ChunkMeta & {
  /** Breadcrumb and markdown without link targets: what gets embedded. */
  embed: string;
  /** Breadcrumb and plain text: where the vocabulary comes from. */
  words: string;
};

export type TermVector = {key: string; weight: number; vector: Quantized};

export type BuiltIndex = {pages: PageMeta[]; chunks: ChunkMeta[]; vectors: Quantized[]; terms: TermVector[]};

export type EmbedQuantized = (texts: string[], taskType: TaskType) => Promise<Quantized[]>;

export function prepare(docs: SourceDoc[]): {pages: PageMeta[]; chunks: SectionChunk[]} {
  const pages: PageMeta[] = [];
  const chunks: SectionChunk[] = [];
  docs.forEach((doc, page) => {
    pages.push({path: new URL(doc.url).pathname, title: doc.title, type: doc.type});
    for (const chunk of chunkDocument({title: doc.title, body: doc.body, year: doc.content_year})) {
      chunks.push({
        page,
        section: chunk.section,
        anchor: chunk.anchor,
        text: plainText(chunk.body),
        embed: withoutLinks(chunk.text),
        words: plainText(chunk.text),
      });
    }
  });
  return {pages, chunks};
}

/** The browser scores by dot product, which is cosine only for unit vectors. */
function unitLength(vector: Quantized): Quantized {
  return quantize(unit(dequantize(vector)) ?? new Float32Array(vector.q.length));
}

export async function buildIndex(
  docs: SourceDoc[],
  options: {embed: EmbedQuantized; words: string[]; phrases: string[]},
): Promise<BuiltIndex> {
  const {pages, chunks} = prepare(docs);
  const terms = buildVocabulary({
    documents: chunks.map((chunk) => chunk.words),
    words: options.words,
    phrases: options.phrases,
  });
  const vectors = (
    await options.embed(
      chunks.map((chunk) => chunk.embed),
      'RETRIEVAL_DOCUMENT',
    )
  ).map(unitLength);
  const termVectors = (
    await options.embed(
      terms.map((term) => term.text),
      'RETRIEVAL_QUERY',
    )
  ).map(unitLength);
  return {
    pages,
    chunks: chunks.map(({page, section, anchor, text}) => ({page, section, anchor, text})),
    vectors,
    terms: terms.map(({key, weight}, i) => ({key, weight, vector: termVectors[i]})),
  };
}

export function writeIndex(dir: string, index: BuiltIndex, options: {model: string; dims: number; shards: number}): void {
  fs.mkdirSync(path.join(dir, 'terms'), {recursive: true});
  const file = encodeIndex({...options, pages: index.pages, chunks: index.chunks, vectors: index.vectors});
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(file));
  encodeShards(index.terms, options.shards).forEach((shard, n) => {
    fs.writeFileSync(path.join(dir, shardPath(n)), JSON.stringify(shard));
  });
}

/** One entry per line; blank lines and # comments are skipped. */
export function readList(file: string): string[] {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}
