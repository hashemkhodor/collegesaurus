// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {after, test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {LoadContext} from '@docusaurus/types';

import {decodeIndex} from '../../src/components/Search/format.ts';
import type {Model} from './embedder.ts';
import semanticSearch, {type Options} from './index.ts';

const SITE = 'https://collegesaurus.org';
const STORY = '---\ntitle: Hungary\n---\n\nI first heard about Stipendium Hungaricum from a friend.\n\n## Applying\n\nThe portal opens in November.\n';
const CONTENT = {
  'docusaurus-plugin-content-blog': {
    default: {
      blogPosts: [
        {
          id: 'hungary',
          metadata: {
            title: 'Stipendium Hungaricum, From Lebanon',
            permalink: '/stories/hungary',
            source: '@site/stories/hungary.md',
            date: new Date('2026-05-17T00:00:00.000Z'),
            authors: [{name: 'Abdelhamid Khaled'}],
          },
        },
      ],
    },
  },
};

const made: string[] = [];
after(() => made.forEach((dir) => fs.rmSync(dir, {recursive: true, force: true})));

function temporary(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  made.push(dir);
  return dir;
}

/** A site holding one story and the plugin's own word lists. */
function site(): LoadContext {
  const siteDir = temporary('semantic-search-site-');
  const files: Record<string, string> = {
    'stories/hungary.md': STORY,
    'plugins/semantic-search/words/en.txt': 'coding\n',
    'plugins/semantic-search/words/fr.txt': 'bourse\n',
    'plugins/semantic-search/words/ar.txt': 'منحة\n',
    'plugins/semantic-search/phrases.txt': '# Things students search for\nstudy abroad\n',
  };
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(siteDir, name)), {recursive: true});
    fs.writeFileSync(path.join(siteDir, name), text);
  }
  return {siteDir, siteConfig: {url: SITE}, i18n: {currentLocale: 'en', defaultLocale: 'en'}} as unknown as LoadContext;
}

/** Stands in for the embedding model, so no test downloads one: a token's state is [its word's length % 3, % 5, 1]. */
function standIn() {
  let runs = 0;
  const model: Model = {
    name: 'stand-in',
    dims: 3,
    padId: 0,
    tokenize: (text) => {
      const ids = text.split(/\s+/).map((word) => word.length);
      return {ids, attention_mask: ids.map(() => 1)};
    },
    run: async ({ids}) => {
      runs += 1;
      const data = Float32Array.from(ids.flatMap((row) => row.flatMap((id) => [id % 3, id % 5, 1])));
      return {data, dims: [ids.length, ids[0].length, 3]};
    },
  };
  return {load: async () => model, runs: () => runs};
}

async function build(context: LoadContext, load: Options['load']): Promise<string> {
  const plugin = semanticSearch(context, {load});
  await plugin.allContentLoaded!({allContent: CONTENT} as never);
  const outDir = temporary('semantic-search-out-');
  await plugin.postBuild!({outDir} as never);
  return outDir;
}

test("writes the locale's index and every term shard", async () => {
  const outDir = await build(site(), standIn().load);

  const dir = path.join(outDir, 'semantic-search');
  const index = decodeIndex(JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')));
  assert.deepEqual([index.model, index.dims], ['stand-in', 3]);
  assert.deepEqual(index.pages, [{path: '/stories/hungary', title: 'Stipendium Hungaricum, From Lebanon', type: 'story'}]);
  assert.deepEqual(
    index.chunks.map((chunk) => [chunk.section, chunk.anchor]),
    [
      ['', null],
      ['Applying', 'applying'],
    ],
  );
  assert.equal(fs.readdirSync(path.join(dir, 'terms')).length, 1024);
});

test('embeds nothing again when a rebuild finds nothing changed', async () => {
  const context = site();
  const model = standIn();
  await build(context, model.load);
  const runs = model.runs();

  await build(context, model.load);

  assert.ok(runs > 0);
  assert.equal(model.runs(), runs);
});

test('when the model cannot be loaded, the site still builds, without an index', async () => {
  const outDir = await build(site(), async () => {
    throw new Error('huggingface.co: HTTP 503');
  });

  assert.ok(!fs.existsSync(path.join(outDir, 'semantic-search')));
});

test('when the embedding cache cannot be read, the site still builds, without an index', async () => {
  const context = site();
  fs.mkdirSync(path.join(context.siteDir, '.cache'));
  fs.writeFileSync(path.join(context.siteDir, '.cache', 'semantic-search'), 'not a directory');

  const outDir = await build(context, standIn().load);

  assert.ok(!fs.existsSync(path.join(outDir, 'semantic-search')));
});
