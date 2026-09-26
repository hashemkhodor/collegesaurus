import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import {collect} from '../chatbot-corpus/index.ts';
import {buildIndex, readList, writeIndex, type SourceDoc} from './build.ts';
import {VectorCache, embedWithCache} from './cache.ts';
import {embedTexts} from './gemini.ts';

/**
 * Builds the site's semantic search: each locale's pages (the chatbot corpus:
 * universities, scholarships and Stories) and a large vocabulary, embedded
 * with Gemini, written to <locale>/semantic-search/. The browser composes a
 * query from the vocabulary's vectors, so it needs no API (see README.md).
 *
 * Without GEMINI_API_KEY, or if Gemini fails, the build carries on without an
 * index and the search box keeps to keyword search.
 */

export const MODEL = 'gemini-embedding-001';
export const DIMS = 256;
export const SHARDS = 1024;

type AllContent = Parameters<typeof collect>[1];

export default function semanticSearch(context: LoadContext): Plugin<void> {
  let docs: SourceDoc[] = [];

  return {
    name: 'semantic-search',

    allContentLoaded({allContent}) {
      docs = collect(context, allContent as AllContent);
    },

    async postBuild({outDir}) {
      const {currentLocale} = context.i18n;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn(`[semantic-search] ${currentLocale}: GEMINI_API_KEY is not set, so search keeps to keywords.`);
        return;
      }
      const here = path.join(context.siteDir, 'plugins', 'semantic-search');
      const cache = await VectorCache.open(path.join(context.siteDir, '.cache', 'semantic-search'), MODEL, DIMS);
      const started = Date.now();
      try {
        const index = await buildIndex(docs, {
          embed: (texts, taskType) =>
            embedWithCache(texts, taskType, cache, (missing, task) =>
              embedTexts(missing, {apiKey, model: MODEL, dims: DIMS, taskType: task}),
            ),
          words: ['en', 'fr', 'ar'].flatMap((lang) => readList(path.join(here, 'words', `${lang}.txt`))),
          phrases: readList(path.join(here, 'phrases.txt')),
        });
        writeIndex(path.join(outDir, 'semantic-search'), index, {model: MODEL, dims: DIMS, shards: SHARDS});
        const seconds = Math.round((Date.now() - started) / 1000);
        console.log(
          `[semantic-search] ${currentLocale}: ${index.chunks.length} sections, ${index.terms.length} terms (${seconds} s)`,
        );
      } catch (error) {
        console.error(`[semantic-search] ${currentLocale}: no index, search keeps to keywords. ${(error as Error).message}`);
      } finally {
        await cache.save();
      }
    },
  };
}
