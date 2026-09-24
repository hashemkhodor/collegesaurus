import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import {mdxToMarkdown} from './clean.ts';

/**
 * Publishes the newest university and scholarship pages, and the Stories
 * posts, for the Collegesaurus AI chatbot (the collegesaurus-ai repo), which
 * indexes them for search:
 *
 *   /chatbot/corpus.json, /ar/chatbot/corpus.json   one per locale
 *   /chatbot/version.json                            polled every minute
 *
 * corpus.json: {schema: 1, locale, content_sha, docs: [{type, slug, title,
 * url, content_locale, content_year, apply_url, body}]}, where type is
 * university, scholarship or story and body is the page as clean markdown (a
 * story's starts with its author and date). version.json changes whenever the Drive content or
 * the site code changes, which is the chatbot's cue to fetch the corpora.
 * The contract is documented in collegesaurus-ai's chatbot/README.md.
 */

const DOCS_PLUGIN = 'docusaurus-plugin-content-docs';
const BLOG_PLUGIN = 'docusaurus-plugin-content-blog';
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

type BlogPost = {
  id: string;
  metadata: {
    title: string;
    permalink: string;
    source: string;
    date: Date | string;
    authors: {name?: string}[];
    unlisted?: boolean;
  };
};

type BlogContent = {blogPosts: BlogPost[]};

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

/** The page's source file as clean markdown. */
function markdown(context: LoadContext, source: string): string {
  const file = path.resolve(context.siteDir, source.replace(/^@site\//, ''));
  return mdxToMarkdown(fs.readFileSync(file, 'utf8'), (component) => {
    console.warn(`[chatbot-corpus] <${component}> in ${source} was not converted`);
  });
}

/** Which language `source` is written in: a missing translation is built from the default locale's file. */
function sourceLocale(context: LoadContext, source: string): string {
  const {currentLocale, defaultLocale} = context.i18n;
  return source.startsWith(`@site/i18n/${currentLocale}/`) ? currentLocale : defaultLocale;
}

/** "*By Abdelhamid Khaled, 17 May 2026.*": who wrote a story, and when. */
function byline(post: BlogPost): string {
  const date = new Date(post.metadata.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const names = post.metadata.authors.map((author) => author.name).filter(Boolean);
  return names.length ? `*By ${names.join(' and ')}, ${date}.*` : `*${date}.*`;
}

export function collect(context: LoadContext, allContent: AllContent): CorpusDoc[] {
  const docs: CorpusDoc[] = [];
  for (const [pluginId, type] of TYPES) {
    const content = allContent[DOCS_PLUGIN]?.[pluginId] as LoadedDocs | undefined;
    for (const doc of content?.loadedVersions[0]?.docs ?? []) {
      if (doc.unlisted) {
        continue;
      }
      docs.push({
        type,
        slug: doc.id,
        title: doc.title || doc.id,
        url: `${context.siteConfig.url}${doc.permalink}`,
        content_locale: frontMatterString(doc, 'content_locale') ?? sourceLocale(context, doc.source),
        content_year: frontMatterString(doc, 'content_year'),
        apply_url: frontMatterString(doc, 'apply_url'),
        body: markdown(context, doc.source),
      });
    }
  }
  const blog = allContent[BLOG_PLUGIN]?.default as BlogContent | undefined;
  for (const post of blog?.blogPosts ?? []) {
    if (post.metadata.unlisted) {
      continue;
    }
    docs.push({
      type: 'story',
      slug: post.id,
      title: post.metadata.title,
      url: `${context.siteConfig.url}${post.metadata.permalink}`,
      content_locale: sourceLocale(context, post.metadata.source),
      content_year: null,
      apply_url: null,
      body: `${byline(post)}\n\n${markdown(context, post.metadata.source)}`,
    });
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
