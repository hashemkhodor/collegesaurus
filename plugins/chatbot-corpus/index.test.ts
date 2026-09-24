// Run: node --test --disable-warning=MODULE_TYPELESS_PACKAGE_JSON plugins/chatbot-corpus/*.test.ts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {LoadContext} from '@docusaurus/types';

import {collect} from './index.ts';

const SITE = 'https://collegesaurus.org';
const STORY = `---
slug: scholarship-awardees/abdelhamid-stipendium
title: Stipendium Hungaricum, From Lebanon
authors: [abdelhamid]
---

I first heard about Stipendium Hungaricum from a friend.

{/* truncate */}

It covers full tuition and a monthly stipend.
`;

/** A site directory holding `files`, as one locale's build sees it. */
function build(files: Record<string, string>, currentLocale = 'en'): LoadContext {
  const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatbot-corpus-'));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(siteDir, name)), {recursive: true});
    fs.writeFileSync(path.join(siteDir, name), text);
  }
  return {
    siteDir,
    siteConfig: {url: SITE},
    i18n: {currentLocale, defaultLocale: 'en'},
  } as unknown as LoadContext;
}

/** A post as the blog plugin loads it (only the fields the corpus reads). */
function post(id: string, metadata: Record<string, unknown> = {}) {
  return {
    id,
    metadata: {
      title: 'Stipendium Hungaricum, From Lebanon',
      permalink: `/stories/${id}`,
      source: `@site/stories/${id}.md`,
      date: new Date('2026-05-17T00:00:00.000Z'),
      authors: [{key: 'abdelhamid', name: 'Abdelhamid Khaled'}],
      unlisted: false,
      ...metadata,
    },
  };
}

function blog(...blogPosts: unknown[]) {
  return {'docusaurus-plugin-content-blog': {default: {blogPosts}}};
}

test('publishes each Stories post, with its author and date first', () => {
  const context = build({'stories/scholarship-awardees/abdelhamid-stipendium.md': STORY});

  const docs = collect(context, blog(post('scholarship-awardees/abdelhamid-stipendium')));

  assert.deepEqual(docs, [
    {
      type: 'story',
      slug: 'scholarship-awardees/abdelhamid-stipendium',
      title: 'Stipendium Hungaricum, From Lebanon',
      url: `${SITE}/stories/scholarship-awardees/abdelhamid-stipendium`,
      content_locale: 'en',
      content_year: null,
      apply_url: null,
      body:
        '*By Abdelhamid Khaled, 17 May 2026.*\n\n' +
        'I first heard about Stipendium Hungaricum from a friend.\n\n' +
        'It covers full tuition and a monthly stipend.',
    },
  ]);
});

test('skips unlisted posts', () => {
  const context = build({'stories/hidden.md': STORY});

  assert.deepEqual(collect(context, blog(post('hidden', {unlisted: true}))), []);
});

test('the Arabic build marks a post copied from English as English', () => {
  const context = build({'stories/intro.md': STORY}, 'ar');

  const [doc] = collect(context, blog(post('intro', {permalink: '/ar/stories/intro'})));

  assert.equal(doc.content_locale, 'en');
  assert.equal(doc.url, `${SITE}/ar/stories/intro`);
});
