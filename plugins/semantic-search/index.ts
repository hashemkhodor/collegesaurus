import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import {collect} from '../chatbot-corpus/index.ts';
import {buildIndex, readList, writeIndex, type SourceDoc} from './build.ts';
import {VectorCache, embedWithCache} from './cache.ts';
import {embedWith, loadModel, type Model} from './embedder.ts';

/**
 * Builds the site's semantic search: each locale's pages (the chatbot corpus:
 * universities, scholarships and Stories) and a large vocabulary, embedded
 * with an open multilingual model (./embedder.ts), written to
 * <locale>/semantic-search/. The browser composes a query from the
 * vocabulary's vectors, so it needs no API (see README.md).
 *
 * If the model can't be downloaded or run, the build carries on without an
 * index and the search box keeps to keyword search.
 */

export const SHARDS = 1024;

export type Options = {
  /** Loads the embedding model from a cache directory; tests pass a stand-in. */
  load?: (dir: string) => Promise<Model>;
};

type AllContent = Parameters<typeof collect>[1];

export default function semanticSearch(context: LoadContext, options: Options = {}): Plugin<void> {
  let docs: SourceDoc[] = [];

  return {
    name: 'semantic-search',

    allContentLoaded({allContent}) {
      docs = collect(context, allContent as AllContent);
    },

    async postBuild({outDir}) {
      const {currentLocale} = context.i18n;
      const here = path.join(context.siteDir, 'plugins', 'semantic-search');
      const cacheDir = path.join(context.siteDir, '.cache', 'semantic-search');
      const started = Date.now();
      let cache: VectorCache | undefined;
      try {
        const model = await (options.load ?? loadModel)(path.join(cacheDir, 'models'));
        cache = await VectorCache.open(path.join(cacheDir, 'vectors'), model.name, model.dims);
        const vectors = cache;
        const index = await buildIndex(docs, {
          embed: (texts, taskType) =>
            embedWithCache(texts, taskType, vectors, (missing, task) => {
              console.log(`[semantic-search] ${currentLocale}: embedding ${missing.length} new texts`);
              return embedWith(missing, task, model);
            }),
          words: ['en', 'fr', 'ar'].flatMap((lang) => readList(path.join(here, 'words', `${lang}.txt`))),
          phrases: readList(path.join(here, 'phrases.txt')),
        });
        writeIndex(path.join(outDir, 'semantic-search'), index, {model: model.name, dims: model.dims, shards: SHARDS});
        const seconds = Math.round((Date.now() - started) / 1000);
        console.log(
          `[semantic-search] ${currentLocale}: ${index.chunks.length} sections, ${index.terms.length} terms (${seconds} s)`,
        );
      } catch (error) {
        console.error(`[semantic-search] ${currentLocale}: no index, search keeps to keywords. ${(error as Error).message}`);
      } finally {
        await cache?.save().catch((error: Error) => {
          console.error(`[semantic-search] could not save the embedding cache: ${error.message}`);
        });
      }
    },
  };
}
