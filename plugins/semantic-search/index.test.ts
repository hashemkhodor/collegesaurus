// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/semantic-search/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {LoadContext} from '@docusaurus/types';

import {decodeIndex} from '../../src/components/Search/format.ts';
import semanticSearch from './index.ts';

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

/** A site holding one story and the plugin's own word lists. */
function site(): LoadContext {
  const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-site-'));
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

/** Stands in for the Gemini API over the network: one 256-dimension vector per text. */
function gemini(status = 200) {
  let calls = 0;
  const fetch = (async (_url: string, init?: RequestInit) => {
    calls += 1;
    if (status !== 200) {
      return new Response(JSON.stringify({error: {message: 'API key not valid'}}), {status});
    }
    const {requests} = JSON.parse(String(init?.body));
    const embeddings = requests.map((request: {content: {parts: {text: string}[]}}) => ({
      values: Array.from({length: 256}, (_, d) => ((request.content.parts[0].text.length + d) % 5) - 2),
    }));
    return new Response(JSON.stringify({embeddings}), {status: 200});
  }) as typeof globalThis.fetch;
  return {fetch, calls: () => calls};
}

async function build(context: LoadContext, key?: string, fetch?: typeof globalThis.fetch): Promise<string> {
  const plugin = semanticSearch(context);
  await plugin.allContentLoaded!({allContent: CONTENT} as never);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'semantic-search-out-'));
  const saved = {key: process.env.GEMINI_API_KEY, fetch: globalThis.fetch};
  if (key) {
    process.env.GEMINI_API_KEY = key;
  } else {
    delete process.env.GEMINI_API_KEY;
  }
  globalThis.fetch = fetch ?? saved.fetch;
  try {
    await plugin.postBuild!({outDir} as never);
  } finally {
    process.env.GEMINI_API_KEY = saved.key;
    globalThis.fetch = saved.fetch;
  }
  return outDir;
}

test("writes the locale's index and every term shard", async () => {
  const outDir = await build(site(), 'test-key', gemini().fetch);

  const dir = path.join(outDir, 'semantic-search');
  const index = decodeIndex(JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8')));
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
  const fake = gemini();
  await build(context, 'test-key', fake.fetch);
  const calls = fake.calls();

  await build(context, 'test-key', fake.fetch);

  assert.ok(calls > 0);
  assert.equal(fake.calls(), calls);
});

test('without a Gemini key, writes no index, so search keeps to keywords', async () => {
  const outDir = await build(site());

  assert.ok(!fs.existsSync(path.join(outDir, 'semantic-search')));
});

test('when Gemini refuses, the site still builds, without an index', async () => {
  const outDir = await build(site(), 'bad-key', gemini(400).fetch);

  assert.ok(!fs.existsSync(path.join(outDir, 'semantic-search')));
});
