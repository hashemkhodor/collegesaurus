import fs from 'node:fs';
import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import {calendarEntries} from '../../src/components/Homepage/UpcomingDeadlines/entries.ts';
import {eventText} from '../../src/components/Homepage/UpcomingDeadlines/event.ts';
import {deadlines, type Translate} from '../../src/data/homepage/deadlines.ts';
import type {HomeDeadline, HomeDoc, HomeUniversity, HomepageData} from './types';
import {pageDeadlines} from './deadlines.ts';
import {feedFiles, type CalendarFile} from './feed.ts';

/**
 * Publishes a small index of the newest academic year for the landing page.
 *
 * The client-side docs data carries only {id, path}, so titles, academic years,
 * program counts and application deadlines are collected here, at build time.
 * allContentLoaded runs once per locale with that locale's docs, so the names
 * and deadline titles come out translated.
 *
 * The deadlines also go out as calendar files, one set per locale: a feed to
 * subscribe to at /deadlines.ics, and each deadline on its own under
 * /deadlines/.
 */

const DOCS_PLUGIN = 'docusaurus-plugin-content-docs';
const MAJORS_TABLE = /<MajorsTable\b[\s\S]*?\/>/g;
const PROGRAM_KEY = /\bprogram\s*:/g;

type LoadedDoc = {
  id: string;
  title: string;
  permalink: string;
  source: string;
  unlisted?: boolean;
  sidebarPosition?: number;
  frontMatter: {[key: string]: unknown};
};

type LoadedDocs = {loadedVersions: {docs: LoadedDoc[]}[]};

type AllContent = {[pluginName: string]: {[pluginId: string]: unknown}};

function newestDocs(allContent: AllContent, pluginId: string): LoadedDoc[] {
  const content = allContent[DOCS_PLUGIN]?.[pluginId] as LoadedDocs | undefined;
  const docs = content?.loadedVersions[0]?.docs ?? [];
  return docs
    .filter((doc) => !doc.unlisted)
    .sort(
      (a, b) =>
        (a.sidebarPosition ?? Number.MAX_SAFE_INTEGER) -
          (b.sidebarPosition ?? Number.MAX_SAFE_INTEGER) ||
        a.id.localeCompare(b.id),
    );
}

function frontMatterString(doc: LoadedDoc, key: string): string | null {
  const value = doc.frontMatter[key];
  return typeof value === 'string' && value ? value : null;
}

function toHomeDoc(doc: LoadedDoc): HomeDoc {
  const title = doc.title || doc.id;
  const dash = title.indexOf('—');
  const short = dash > 0 ? title.slice(0, dash).trim() : '';
  const full = dash > 0 ? title.slice(dash + 1).trim() : '';
  return {
    id: doc.id,
    permalink: doc.permalink,
    shortName:
      short || frontMatterString(doc, 'sidebar_label') || doc.id.toUpperCase(),
    fullName: full || title,
    contentYear: frontMatterString(doc, 'content_year'),
  };
}

function readSource(siteDir: string, source: string): string | null {
  try {
    return fs.readFileSync(path.resolve(siteDir, source.replace(/^@site\//, '')), 'utf8');
  } catch {
    return null;
  }
}

function countPrograms(siteDir: string, source: string): number {
  const text = readSource(siteDir, source) ?? '';
  return (text.match(MAJORS_TABLE) ?? []).reduce(
    (total, block) => total + (block.match(PROGRAM_KEY) ?? []).length,
    0,
  );
}

const PAGE_KINDS = [
  ['universities', 'university'],
  ['scholarships', 'scholarship'],
] as const;

// Past deadlines stay in the feed for a year, so they don't vanish from
// subscribers' calendars the day after they close.
const yearBefore = (day: string) => `${Number(day.slice(0, 4)) - 1}${day.slice(4)}`;

/** Deadlines from the newest year's pages that close on or after `since`, soonest first. */
export function collectDeadlines(
  siteDir: string,
  allContent: AllContent,
  since: string,
): HomeDeadline[] {
  const deadlines: HomeDeadline[] = [];
  for (const [plugin, kind] of PAGE_KINDS) {
    for (const doc of newestDocs(allContent, plugin)) {
      const source = readSource(siteDir, doc.source);
      for (const row of source === null ? [] : pageDeadlines(source, kind)) {
        if (row.closes >= since) {
          deadlines.push({ref: {plugin, id: doc.id}, ...row});
        }
      }
    }
  }
  return deadlines.sort((a, b) => a.closes.localeCompare(b.closes));
}

export default function homepageData(context: LoadContext): Plugin<void> {
  // Docusaurus builds one locale at a time with a fresh plugin instance, so
  // this holds the current locale's calendar until postBuild writes it out.
  let calendarFiles: CalendarFile[] = [];

  return {
    name: 'homepage-data',

    allContentLoaded({allContent, actions}) {
      const content = allContent as AllContent;
      const universities: HomeUniversity[] = newestDocs(
        content,
        'universities',
      ).map((doc) => ({
        ...toHomeDoc(doc),
        programCount: countPrograms(context.siteDir, doc.source),
      }));
      const scholarships = newestDocs(content, 'scholarships').map(toHomeDoc);

      const programs = universities.reduce(
        (total, university) => total + (university.programCount ?? 0),
        0,
      );
      // One university without rows is a content gap; none of them having any
      // means the emitted MajorsTable format moved on. Then the count is hidden
      // rather than reported as zero.
      const drifted = universities.length > 0 && programs === 0;
      if (drifted) {
        console.warn(
          '[homepage-data] no MajorsTable rows found in any university page; hiding the programs count',
        );
      }

      const generatedAt = new Date().toISOString();
      const today = generatedAt.slice(0, 10);
      const since = yearBefore(today);
      const rows = collectDeadlines(context.siteDir, content, since);
      const data: HomepageData = {
        generatedAt,
        universities: drifted
          ? universities.map((university) => ({
              ...university,
              programCount: null,
            }))
          : universities,
        scholarships,
        // Dropping what closed before today (UTC) only keeps the data small;
        // the landing page filters against the reader's own day.
        deadlines: rows.filter((row) => row.closes >= today),
        totals: {
          universities: universities.length,
          scholarships: scholarships.length,
          programs: drifted ? null : programs,
        },
      };
      actions.setGlobalData(data);

      const {siteConfig, i18n, codeTranslations} = context;
      const translate: Translate = ({id, message}) => codeTranslations[id] ?? message;
      const docs: {[plugin in HomeDeadline['ref']['plugin']]: HomeDoc[]} = {
        universities,
        scholarships,
      };
      calendarFiles = feedFiles({
        entries: calendarEntries(rows, deadlines(translate)).filter(
          (entry) => entry.closes >= since,
        ),
        page: (ref) => {
          const doc = docs[ref.plugin].find((candidate) => candidate.id === ref.id);
          return doc && {shortName: doc.shortName, url: `${siteConfig.url}${doc.permalink}`};
        },
        text: eventText(translate, i18n.currentLocale),
        site: siteConfig.url,
        stamp: new Date(generatedAt),
      });
    },

    async postBuild({outDir}) {
      for (const file of calendarFiles) {
        const target = path.join(outDir, file.path);
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.writeFileSync(target, file.content);
      }
    },
  };
}
