import fs from 'node:fs';
import path from 'node:path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import type {HomeDoc, HomeUniversity, HomepageData} from './types';

/**
 * Publishes a small index of the newest academic year for the landing page.
 *
 * The client-side docs data carries only {id, path}, so titles, academic years
 * and program counts are collected here, at build time. allContentLoaded runs
 * once per locale with that locale's docs, so the names come out translated.
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

function countPrograms(siteDir: string, source: string): number {
  const file = path.resolve(siteDir, source.replace(/^@site\//, ''));
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return 0;
  }
  return (text.match(MAJORS_TABLE) ?? []).reduce(
    (total, block) => total + (block.match(PROGRAM_KEY) ?? []).length,
    0,
  );
}

export default function homepageData(context: LoadContext): Plugin<void> {
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

      const data: HomepageData = {
        generatedAt: new Date().toISOString(),
        universities: drifted
          ? universities.map((university) => ({
              ...university,
              programCount: null,
            }))
          : universities,
        scholarships,
        totals: {
          universities: universities.length,
          scholarships: scholarships.length,
          programs: drifted ? null : programs,
        },
      };
      actions.setGlobalData(data);
    },
  };
}
