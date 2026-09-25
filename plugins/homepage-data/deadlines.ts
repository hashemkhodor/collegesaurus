import {
  CLOSES,
  DATE_HEADER,
  OPENS,
  REF_HEADERS,
  normalize,
  parseDate,
  sectionKey,
} from '../../src/remark/remarkGuidebook.mjs';

/**
 * Deadlines read from the application section of a university or scholarship
 * page, by the rules the Guidebook uses to draw that section's window cards
 * (src/remark/remarkGuidebook.mjs), so the landing page and the page itself
 * always agree on what closes when. That plugin runs while the page's MDX
 * compiles, after this one has published its data, so the source is read
 * again here, in the few shapes drive_sync emits.
 *
 * Only full dates count. "TBA", "Rolling" or a day without a year stays on
 * the page and out of the calendar.
 */

export type PageDeadline = {
  title: string;
  opens: string | null;
  closes: string;
  kind: 'application' | 'scholarship';
};

type PageKind = 'university' | 'scholarship';

const SECTION: Record<PageKind, string> = {
  university: 'application',
  scholarship: 'window',
};

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
const HEADING = /^##(?!#)\s+(.*)$/;
const SEPARATOR = /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/;
// Of a scholarship's stages, the one that is the deadline.
const CLOSING_STAGE =
  /clos|deadline|last day|إقفال|إغلاق|يغلق|يُغلق|يقفل|تقفل|الموعد النهائي|آخر يوم/i;
// A university's own scholarship or aid round, rather than an admission round.
const AID = /scholarship|financial aid|منح|مساعد/i;
const REFS = new Set(REF_HEADERS.map(normalize));

/** Cell text as the page shows it: no links, tags, emphasis or escapes. */
function plain(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(?<!\\)<[^>]*>/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\\(.)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map(plain);
}

function tableDeadlines(
  head: string[],
  rows: string[][],
  kind: PageKind,
): PageDeadline[] {
  const refs = head.flatMap((h, i) => (REFS.has(normalize(h)) ? [i] : []));
  const refColumn = refs.length && head.length > 1 ? refs[refs.length - 1] : -1;
  const keep = head.map((_, i) => i).filter((i) => i !== refColumn);
  if (keep.length < 2) {
    return [];
  }
  const kindOf = (title: string) =>
    kind === 'scholarship' || AID.test(title) ? 'scholarship' : 'application';

  const closes = keep.find((i) => CLOSES.test(head[i]!));
  if (closes !== undefined) {
    const opens = keep.find((i) => OPENS.test(head[i]!));
    const title = keep.find((i) => i !== opens && i !== closes)!;
    return rows.flatMap((row) => {
      const closing = parseDate(row[closes] ?? '');
      if (!closing) {
        return [];
      }
      const name = row[title] ?? '';
      return [
        {
          title: name,
          opens: opens === undefined ? null : parseDate(row[opens] ?? ''),
          closes: closing,
          kind: kindOf(name),
        },
      ];
    });
  }

  // A scholarship's "Stage | Date" timeline, which the Guidebook reads the same way.
  const date = keep.find((i) => DATE_HEADER.test(head[i]!));
  if (kind !== 'scholarship' || keep.length > 3 || date === undefined) {
    return [];
  }
  const stage = keep.find((i) => i !== date)!;
  return rows.flatMap((row) => {
    const name = row[stage] ?? '';
    const closing = CLOSING_STAGE.test(name) ? parseDate(row[date] ?? '') : null;
    return closing ? [{title: name, opens: null, closes: closing, kind: kindOf(name)}] : [];
  });
}

export function pageDeadlines(mdx: string, kind: PageKind): PageDeadline[] {
  const lines = mdx.replace(/\r\n/g, '\n').replace(FRONTMATTER, '').split('\n');
  const found: PageDeadline[] = [];
  let inSection = false;
  let fenced = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    const heading = fenced ? null : HEADING.exec(line);
    if (heading) {
      const title = plain(heading[1]!.replace(/\s*\{#[^}]*\}\s*$/, ''));
      inSection = sectionKey(title, kind) === SECTION[kind];
      continue;
    }
    if (fenced || !inSection || !line.trim().startsWith('|') || !SEPARATOR.test(lines[i + 1] ?? '')) {
      continue;
    }
    const head = cells(line);
    const rows: string[][] = [];
    let next = i + 2;
    for (; next < lines.length && lines[next]!.trim().startsWith('|'); next += 1) {
      rows.push(cells(lines[next]!));
    }
    i = next - 1;
    found.push(...tableDeadlines(head, rows, kind));
  }
  return found;
}
