import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import {mdxToMarkdown} from './clean.ts';

/**
 * Publishes the newest university and scholarship pages for the Collegesaurus
 * AI chatbot (the collegesaurus-ai repo), which indexes them for search:
 *
 *   /chatbot/corpus.json, /ar/chatbot/corpus.json   one per locale
 *   /chatbot/version.json                            polled every minute
 *
 * corpus.json: {schema: 1, locale, content_sha, docs: [{type, slug, title,
 * url, content_locale, content_year, apply_url, body}]}, where body is the
 * page as clean markdown. version.json changes whenever the Drive content or
 * the site code changes, which is the chatbot's cue to fetch the corpora.
 * The contract is documented in collegesaurus-ai's chatbot/README.md.
 */

const DOCS_PLUGIN = 'docusaurus-plugin-content-docs';
const TYPES: [pluginId: string, type: string][] = [
  ['universities', 'university'],
  ['scholarships', 'scholarship'],
];

type LoadedDoc = {
  id: string;
  title: string;
  permalink: string;
  source: string;
  unlisted?: boolean;
  frontMatter: {[key: string]: unknown};
};

type LoadedDocs = {loadedVersions: {docs: LoadedDoc[]}[]};

type AllContent = {[pluginName: string]: {[pluginId: string]: unknown}};

type CorpusDoc = {
  type: string;
  slug: string;
  title: string;
  url: string;
  /** Language the body is written in: an untranslated page falls back to English. */
  content_locale: string;
  content_year: string | null;
  apply_url: string | null;
  body: string;
};

function frontMatterString(doc: LoadedDoc, key: string): string | null {
  const value = doc.frontMatter[key];
  return typeof value === 'string' && value ? value : null;
}

function collect(context: LoadContext, allContent: AllContent): CorpusDoc[] {
  const {currentLocale, defaultLocale} = context.i18n;
  const docs: CorpusDoc[] = [];
  for (const [pluginId, type] of TYPES) {
    const content = allContent[DOCS_PLUGIN]?.[pluginId] as LoadedDocs | undefined;
    for (const doc of content?.loadedVersions[0]?.docs ?? []) {
      if (doc.unlisted) {
        continue;
      }
      const file = path.resolve(context.siteDir, doc.source.replace(/^@site\//, ''));
      const body = mdxToMarkdown(fs.readFileSync(file, 'utf8'), (component) => {
        console.warn(`[chatbot-corpus] <${component}> in ${doc.source} was not converted`);
      });
      docs.push({
        type,
        slug: doc.id,
        title: doc.title || doc.id,
        url: `${context.siteConfig.url}${doc.permalink}`,
        content_locale:
          frontMatterString(doc, 'content_locale') ??
          (doc.source.startsWith(`@site/i18n/${currentLocale}/`) ? currentLocale : defaultLocale),
        content_year: frontMatterString(doc, 'content_year'),
        apply_url: frontMatterString(doc, 'apply_url'),
        body,
      });
    }
  }
  return docs.sort((a, b) => `${a.type}/${a.slug}`.localeCompare(`${b.type}/${b.slug}`));
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify(data));
}

export default function chatbotCorpus(context: LoadContext): Plugin<void> {
  // Docusaurus builds one locale at a time with a fresh plugin instance, so
  // this holds the current locale's docs until postBuild writes them out.
  let docs: CorpusDoc[] = [];

  return {
    name: 'chatbot-corpus',

    allContentLoaded({allContent}) {
      docs = collect(context, allContent as AllContent);
    },

    async postBuild({outDir}) {
      const {currentLocale, defaultLocale} = context.i18n;
      const contentSha = crypto
        .createHash('sha256')
        .update(JSON.stringify(docs))
        .digest('hex')
        .slice(0, 16);
      writeJson(path.join(outDir, 'chatbot', 'corpus.json'), {
        schema: 1,
        locale: currentLocale,
        content_sha: contentSha,
        docs,
      });
      if (currentLocale === defaultLocale) {
        const builtAt = new Date().toISOString();
        // CI sets both; a local build gets a fresh fingerprint every time.
        writeJson(path.join(outDir, 'chatbot', 'version.json'), {
          drive_fingerprint: process.env.DRIVE_FINGERPRINT || `local-${builtAt}`,
          site_commit: process.env.GITHUB_SHA || null,
          built_at: builtAt,
        });
      }
    },
  };
}
