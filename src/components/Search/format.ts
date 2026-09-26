/**
 * The files the build writes and the browser reads, under /semantic-search/
 * of each locale:
 *
 *   index.json        pages, their sections (heading id, plain text) and one
 *                     vector per section
 *   terms/<n>.json    term vectors, spread over `shards` files by a hash of
 *                     the term, so a query fetches only the few it needs
 */
import {shardOf} from './text.ts';
import {fromBase64, toBase64, type Quantized} from './vectors.ts';

export const FORMAT = 1;

export type PageMeta = {path: string; title: string; type: string};

export type ChunkMeta = {page: number; section: string; anchor: string | null; text: string};

export type IndexFile = {
  format: number;
  model: string;
  dims: number;
  shards: number;
  pages: PageMeta[];
  chunks: {p: number; s: string; a: string | null; t: string}[];
  scales: number[];
  /** Every section's vector, one byte per dimension, in section order. */
  vectors: string;
};

/** term key → [weight, scale, vector bytes] */
export type ShardFile = Record<string, [number, number, string]>;

export type TermEntry = {weight: number; vector: Quantized};

export type Index = {
  model: string;
  dims: number;
  shards: number;
  pages: PageMeta[];
  chunks: ChunkMeta[];
  matrix: Int8Array;
  scales: Float32Array;
};

const round = (value: number) => Number(value.toPrecision(6));

export function shardPath(shard: number): string {
  return `terms/${shard}.json`;
}

export function encodeIndex(input: {
  model: string;
  dims: number;
  shards: number;
  pages: PageMeta[];
  chunks: ChunkMeta[];
  vectors: Quantized[];
}): IndexFile {
  const matrix = new Int8Array(input.vectors.length * input.dims);
  input.vectors.forEach(({q}, i) => matrix.set(q, i * input.dims));
  return {
    format: FORMAT,
    model: input.model,
    dims: input.dims,
    shards: input.shards,
    pages: input.pages,
    chunks: input.chunks.map(({page, section, anchor, text}) => ({p: page, s: section, a: anchor, t: text})),
    scales: input.vectors.map(({scale}) => round(scale)),
    vectors: toBase64(matrix),
  };
}

export function decodeIndex(file: IndexFile): Index {
  if (file.format !== FORMAT) {
    throw new Error(`search index format ${file.format}, expected ${FORMAT}`);
  }
  const matrix = fromBase64(file.vectors);
  const count = matrix.length / file.dims;
  if (count !== file.chunks.length || file.scales.length !== file.chunks.length) {
    throw new Error(`search index has ${file.chunks.length} sections but ${count} vectors`);
  }
  return {
    model: file.model,
    dims: file.dims,
    shards: file.shards,
    pages: file.pages,
    chunks: file.chunks.map(({p, s, a, t}) => ({page: p, section: s, anchor: a, text: t})),
    matrix,
    scales: Float32Array.from(file.scales),
  };
}

export function encodeShards(terms: {key: string; weight: number; vector: Quantized}[], shards: number): ShardFile[] {
  const files: ShardFile[] = Array.from({length: shards}, () => ({}));
  for (const {key, weight, vector} of terms) {
    files[shardOf(key, shards)][key] = [Number(weight.toFixed(3)), round(vector.scale), toBase64(vector.q)];
  }
  return files;
}

export function decodeShard(file: ShardFile): Map<string, TermEntry> {
  return new Map(
    Object.entries(file).map(([key, [weight, scale, bytes]]) => [key, {weight, vector: {scale, q: fromBase64(bytes)}}]),
  );
}
