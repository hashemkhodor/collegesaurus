/**
 * Measures search on real queries (eval-queries.json) before it ships:
 *
 *   composed  the query as the weighted average of its words' vectors, which
 *             is what the browser does
 *   exact     Gemini's own embedding of the whole query, the upper bound
 *   keyword   every query word must appear in the section, as the old search
 *             required (an approximation of lunr, not lunr itself)
 *
 * Vectors are embedded at 768 dimensions and compared there and cut to 256.
 * Prints a summary and writes every ranking to --report.
 *
 *   GEMINI_API_KEY=… node plugins/semantic-search/eval.ts [--site URL] [--report FILE]
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {encodeIndex, encodeShards} from '../../src/components/Search/format.ts';
import {candidateKeys, coverQuery} from '../../src/components/Search/query.ts';
import {rankPages, type RankedPage} from '../../src/components/Search/rank.ts';
import {contentTokens, shardOf, tokenize, variants} from '../../src/components/Search/text.ts';
import {composeQuery, quantize, scoreAll, truncate, type Quantized} from '../../src/components/Search/vectors.ts';
import {buildIndex, prepare, readList, type BuiltIndex} from './build.ts';
import {VectorCache, embedWithCache} from './cache.ts';
import {embedTexts, type TaskType} from './gemini.ts';

type Query = {q: string; locale: string; group: string; expect: string[] | string};
type Row = {method: string; dims: number; query: Query; expected: string[]; rank: number; top: [string, number][]; note?: string};

const MODEL = 'gemini-embedding-001';
const FULL = 768;
const SIZES = [256, 768];
const SHARDS = 1024;
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../..');
const OPEN = {limit: 100, perPage: 3, floor: -1, margin: 2, sectionMargin: 2};

const args = parseArgs({
  options: {
    site: {type: 'string', default: 'https://collegesaurus.org'},
    report: {type: 'string', default: path.join(ROOT, '.cache', 'semantic-search', 'eval-report.json')},
  },
}).values;
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set.');
  process.exit(1);
}

const dequantize = ({scale, q}: Quantized) => Float32Array.from(q, (value) => value * scale);
const shrink = (vector: Quantized, dims: number) => (dims === FULL ? vector : quantize(truncate(dequantize(vector), dims)));
const round = (value: number) => Number(value.toFixed(3));

function matrixOf(vectors: Quantized[], dims: number) {
  const matrix = new Int8Array(vectors.length * dims);
  vectors.forEach(({q}, i) => matrix.set(q, i * dims));
  return {matrix, scales: vectors.map(({scale}) => scale)};
}

function wordMatches(word: string, term: string): boolean {
  return word === term || (term.length >= 3 && word.startsWith(term)) || (word.length >= 4 && term.startsWith(word));
}

/** TF-IDF over sections that contain every query word; the rest score 0. */
function keywordScores(query: string, sections: string[][]): Float32Array {
  const terms = contentTokens(tokenize(query));
  const df = terms.map((term) => sections.filter((words) => words.some((word) => wordMatches(word, term))).length);
  return Float32Array.from(sections, (words) => {
    if (terms.length === 0 || !terms.every((term) => words.some((word) => wordMatches(word, term)))) {
      return 0;
    }
    return terms.reduce((sum, term, i) => {
      const tf = words.filter((word) => wordMatches(word, term)).length;
      return sum + (tf / Math.sqrt(words.length)) * Math.log(1 + sections.length / df[i]);
    }, 0);
  });
}

const cache = await VectorCache.open(path.join(ROOT, '.cache', 'semantic-search'), MODEL, FULL);
const embed = (texts: string[], taskType: TaskType) =>
  embedWithCache(texts, taskType, cache, (missing, task) => {
    console.log(`  embedding ${missing.length} texts as ${task}`);
    return embedTexts(missing, {apiKey, model: MODEL, dims: FULL, taskType: task});
  });
const words = ['en', 'fr', 'ar'].flatMap((lang) => readList(path.join(HERE, 'words', `${lang}.txt`)));
const phrases = readList(path.join(HERE, 'phrases.txt'));
const {sets, queries} = JSON.parse(fs.readFileSync(path.join(HERE, 'eval-queries.json'), 'utf8')) as {
  sets: Record<string, string[]>;
  queries: Query[];
};

const locales = new Map<string, {built: BuiltIndex; ids: string[]; sections: string[][]}>();
for (const locale of new Set(queries.map((query) => query.locale))) {
  const corpus = await (await fetch(`${args.site}${locale === 'en' ? '' : `/${locale}`}/chatbot/corpus.json`)).json();
  const started = performance.now();
  let built: BuiltIndex;
  try {
    built = await buildIndex(corpus.docs, {embed, words, phrases});
  } finally {
    await cache.save();
  }
  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  console.log(`${locale}: ${corpus.docs.length} pages, ${built.chunks.length} sections, ${built.terms.length} terms (${seconds} s)`);
  locales.set(locale, {
    built,
    ids: corpus.docs.map((doc: {type: string; slug: string}) => `${doc.type}/${doc.slug}`),
    sections: prepare(corpus.docs).chunks.map((chunk) => tokenize(chunk.words)),
  });
}
const exact = await embed(
  queries.map((query) => query.q),
  'RETRIEVAL_QUERY',
);
await cache.save();

// Is a 256-dimension embedding the first 256 dimensions of the 768 one? If so,
// the build can ask for 256 directly.
const samples = ['AUB tuition', 'منحة دراسية', 'bourse d’études en Hongrie'];
const direct = await embedTexts(samples, {apiKey, model: MODEL, dims: 256, taskType: 'RETRIEVAL_QUERY'});
const cut = (await embedTexts(samples, {apiKey, model: MODEL, dims: FULL, taskType: 'RETRIEVAL_QUERY'})).map((v) => truncate(v, 256));
const matryoshka = samples.map((text, i) => [text, round(direct[i].reduce((sum, value, d) => sum + value * cut[i][d], 0))]);

const rows: Row[] = [];
const timings: number[] = [];
const record = (method: string, dims: number, query: Query, ranked: RankedPage[], ids: string[], note?: string) => {
  const expected = typeof query.expect === 'string' ? sets[query.expect] : query.expect;
  const at = ranked.findIndex((page) => expected.includes(ids[page.page]));
  const top = ranked.slice(0, 3).map((page): [string, number] => [ids[page.page], round(page.score)]);
  rows.push({method, dims, query, expected, rank: at < 0 ? 0 : at + 1, top, note});
};

const sizes: Record<string, unknown> = {};
for (const dims of SIZES) {
  const prepared = new Map(
    [...locales].map(([locale, {built}]) => {
      const vectors = built.vectors.map((vector) => shrink(vector, dims));
      const terms = built.terms.map((term) => ({...term, vector: shrink(term.vector, dims)}));
      if (dims === 256) {
        const shards = encodeShards(terms, SHARDS).map((shard) => JSON.stringify(shard).length);
        const index = encodeIndex({model: MODEL, dims, shards: SHARDS, pages: built.pages, chunks: built.chunks, vectors});
        sizes[locale] = {
          indexBytes: JSON.stringify(index).length,
          shardBytesTotal: shards.reduce((a, b) => a + b, 0),
          shardBytesAverage: Math.round(shards.reduce((a, b) => a + b, 0) / SHARDS),
          terms: terms.length,
        };
      }
      return [locale, {...matrixOf(vectors, dims), terms: new Map(terms.map((term) => [term.key, term])), chunks: built.chunks}];
    }),
  );
  queries.forEach((query, i) => {
    const {matrix, scales, terms, chunks} = prepared.get(query.locale)!;
    const {ids} = locales.get(query.locale)!;
    record('exact', dims, query, rankPages(scoreAll(truncate(dequantize(exact[i]), dims), matrix, scales), chunks, OPEN), ids);
    const started = performance.now();
    const {keys, unknown} = coverQuery(tokenize(query.q), (key) => terms.has(key));
    const vector = composeQuery(keys.map((key) => terms.get(key)!));
    const ranked = vector ? rankPages(scoreAll(vector, matrix, scales), chunks, OPEN) : [];
    if (dims === 256) {
      timings.push(performance.now() - started);
    }
    record('composed', dims, query, ranked, ids, `${keys.join(' + ')}${unknown.length ? ` (unknown: ${unknown.join(', ')})` : ''}`);
  });
}
for (const query of queries) {
  const {built, ids, sections} = locales.get(query.locale)!;
  record('keyword', 0, query, rankPages(keywordScores(query.q, sections), built.chunks, {...OPEN, floor: 1e-9}), ids);
}

const shardsPerQuery = queries.map((query) => {
  const tokens = tokenize(query.q);
  const keys = [...candidateKeys(tokens), ...contentTokens(tokens).flatMap(variants)];
  return new Set(keys.map((key) => shardOf(key, SHARDS))).size;
});

const methods = [...new Set(rows.map((row) => `${row.method}@${row.dims}`))];
const groups = [...new Set(queries.filter((query) => query.group !== 'off-topic').map((query) => query.group)), 'all'];
const metric = (selected: Row[]) => {
  const n = selected.length || 1;
  const hit1 = selected.filter((row) => row.rank === 1).length / n;
  const hit3 = selected.filter((row) => row.rank >= 1 && row.rank <= 3).length / n;
  const mrr = selected.reduce((sum, row) => sum + (row.rank >= 1 && row.rank <= 10 ? 1 / row.rank : 0), 0) / n;
  return {hit1: round(hit1), hit3: round(hit3), mrr: round(mrr), n: selected.length};
};
const summary = Object.fromEntries(
  methods.map((name) => [
    name,
    Object.fromEntries(
      groups.map((group) => [
        group,
        metric(
          rows.filter(
            (row) =>
              `${row.method}@${row.dims}` === name &&
              row.query.group !== 'off-topic' &&
              (group === 'all' || row.query.group === group),
          ),
        ),
      ]),
    ),
  ]),
);

console.log('\nMRR@10 (hit@1 / hit@3), on-topic queries by group:');
console.log(['method', ...groups].join('\t'));
for (const name of methods) {
  console.log(
    [name, ...groups.map((group) => {
      const {mrr, hit1, hit3} = summary[name][group];
      return `${mrr} (${hit1}/${hit3})`;
    })].join('\t'),
  );
}

const calibration = Object.fromEntries(
  methods
    .filter((name) => !name.startsWith('keyword'))
    .map((name) => {
      const mine = rows.filter((row) => `${row.method}@${row.dims}` === name);
      const onTopic = mine.filter((row) => row.expected.length).map((row) => row.top[0]?.[1] ?? 0).sort((a, b) => a - b);
      const offTopic = mine.filter((row) => !row.expected.length).map((row) => row.top[0]?.[1] ?? 0);
      return [name, {onTopicTopScores: {min: onTopic[0], median: onTopic[Math.floor(onTopic.length / 2)], max: onTopic.at(-1)}, offTopicTopScores: offTopic}];
    }),
);
console.log('\nTop scores, on-topic vs off-topic:');
console.log(JSON.stringify(calibration, null, 1));
console.log('\nMatryoshka check, cos(256 direct, 768 cut to 256):', JSON.stringify(matryoshka));
console.log('Sizes at 256 dims:', JSON.stringify(sizes));
console.log(
  `Composing and ranking one query in Node: median ${round(timings.sort((a, b) => a - b)[Math.floor(timings.length / 2)])} ms; shards per query: median ${shardsPerQuery.sort((a, b) => a - b)[Math.floor(shardsPerQuery.length / 2)]}`,
);

console.log('\nPer query (rank of the first expected page; 0 = not in the list):');
for (const query of queries) {
  const mine = rows.filter((row) => row.query === query);
  const rank = (method: string, dims: number) => mine.find((row) => row.method === method && row.dims === dims)!;
  const composed = rank('composed', 256);
  console.log(
    `${query.group.padEnd(13)} ${query.q.padEnd(44)} keyword ${rank('keyword', 0).rank}  exact ${rank('exact', 256).rank}  composed ${composed.rank}  top: ${composed.top.map(([id, score]) => `${id} ${score}`).join(', ')}  [${composed.note}]`,
  );
}

fs.mkdirSync(path.dirname(args.report), {recursive: true});
fs.writeFileSync(args.report, JSON.stringify({summary, calibration, matryoshka, sizes, rows}, null, 1));
console.log(`\nReport: ${args.report}`);
