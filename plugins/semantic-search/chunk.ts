/**
 * Splits a page's markdown into search chunks, the way collegesaurus-ai's
 * chatbot/chunking.py does: one chunk per section (H2), a too-long section by
 * its subsections (H3), and anything still too long into runs of paragraphs,
 * list items or table rows, repeating the table header. Each chunk starts with
 * a breadcrumb such as "AUB — American University of Beirut › Tuition [2026-2027]".
 *
 * Each chunk also carries the id of its heading on the rendered page. Docusaurus
 * slugs every heading of a file with one counter, so a repeated "Overview"
 * becomes overview-1, overview-2: all headings are slugged, in order, to match.
 */
import {createSlugger, parseMarkdownHeadingId} from '@docusaurus/utils';
import {headingText} from './markdown.ts';

export const MAX_CHARS = 1200;

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const SENTENCE_END = /(?<=[.!?؟])\s+/;
const BLANK_LINES = /\n\s*\n/;

export type ChunkInput = {title: string; body: string; year?: string | null};

export type Chunk = {
  /** "Faculty › MSFEA"; empty for text before the first section. */
  section: string;
  /** Id of the section's heading on the page; null for text before the first section. */
  anchor: string | null;
  /** The breadcrumb line, a blank line, then the body. */
  text: string;
  body: string;
};

type Part = {title: string; anchor: string; lines: string[]};
type Section = Part & {lead: string[]; subs: Part[]};
type Piece = {path: string[]; anchor: string | null; body: string};

export function chunkDocument(doc: ChunkInput, maxChars = MAX_CHARS): Chunk[] {
  const chunks: Chunk[] = [];
  for (const {path, anchor, body} of pieces(doc.body, maxChars)) {
    for (const part of body.length <= maxChars ? [body] : pack(body, maxChars)) {
      chunks.push({section: path.join(' › '), anchor, text: `${breadcrumb(doc, path)}\n\n${part}`, body: part});
    }
  }
  return chunks;
}

function pieces(markdown: string, maxChars: number): Piece[] {
  const slugger = createSlugger();
  const intro: string[] = [];
  const sections: Section[] = [];
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const heading = HEADING.exec(line);
    const level = heading ? heading[1].length : 0;
    if (heading) {
      const {text, id} = parseMarkdownHeadingId(heading[2]);
      const title = headingText(text);
      const anchor = id ?? slugger.slug(title);
      if (level === 1) {
        continue;
      }
      if (level === 2 || (level === 3 && sections.length === 0)) {
        sections.push({title, anchor, lines: [], lead: [], subs: []});
        continue;
      }
      if (level === 3) {
        const section = sections[sections.length - 1];
        section.lines.push(line);
        section.subs.push({title, anchor, lines: []});
        continue;
      }
    }
    const section = sections[sections.length - 1];
    if (!section) {
      intro.push(line);
      continue;
    }
    section.lines.push(line);
    (section.subs[section.subs.length - 1]?.lines ?? section.lead).push(line);
  }

  const out: Piece[] = [{path: [], anchor: null, body: text(intro)}];
  for (const section of sections) {
    const whole = text(section.lines);
    if (whole.length <= maxChars || section.subs.length === 0) {
      out.push({path: [section.title], anchor: section.anchor, body: whole});
      continue;
    }
    out.push({path: [section.title], anchor: section.anchor, body: text(section.lead)});
    for (const sub of section.subs) {
      out.push({path: [section.title, sub.title], anchor: sub.anchor, body: text(sub.lines)});
    }
  }
  return out.filter((piece) => piece.body);
}

/**
 * Groups blocks (paragraphs, tables, lists) into bodies of about maxChars. A
 * lead-in (a heading, or a line ending in ":") never ends a chunk: it moves on
 * with the block it introduces.
 */
function pack(body: string, maxChars: number): string[] {
  const out: string[] = [];
  let current: string[] = [];

  const flush = (): string[] => {
    const lead: string[] = [];
    while (current.length > 0 && isLeadIn(current[current.length - 1])) {
      lead.unshift(current.pop()!);
    }
    if (current.length > 0) {
      out.push(current.join('\n\n'));
    }
    return lead;
  };

  const blocks = body
    .split(BLANK_LINES)
    .filter((block) => block.trim())
    .map((block) => block.replace(/^\n+|\n+$/g, ''));
  for (const block of blocks) {
    if (block.length > maxChars) {
      const lead = flush().join('\n\n');
      const parts = splitBlock(block, lead ? maxChars - lead.length - 2 : maxChars);
      if (lead) {
        parts[0] = `${lead}\n\n${parts[0]}`;
      }
      out.push(...parts);
      current = [];
      continue;
    }
    if (current.length > 0 && [...current, block].join('\n\n').length > maxChars) {
      current = flush();
    }
    current.push(block);
  }
  if (current.length > 0) {
    out.push(current.join('\n\n'));
  }
  return out;
}

function isLeadIn(block: string): boolean {
  const oneLine = !block.includes('\n') && block.length <= 200;
  return oneLine && (block.startsWith('#') || block.trimEnd().endsWith(':'));
}

function splitBlock(block: string, maxChars: number): string[] {
  const lines = block.split('\n');
  if (lines[0].trimStart().startsWith('|')) {
    const headerSize = lines.length > 1 && /^[|\-:]+$/.test(lines[1].replace(/ /g, '')) ? 2 : 1;
    return group(lines.slice(headerSize), maxChars, lines.slice(0, headerSize));
  }
  if (lines.length > 1) {
    return group(lines, maxChars);
  }
  return splitText(block, maxChars);
}

/** Packs lines into groups of at most maxChars, each starting with `prefix`. */
function group(lines: string[], maxChars: number, prefix: string[] = []): string[] {
  const budget = maxChars - (prefix.length > 0 ? prefix.join('\n').length + 1 : 0);
  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    for (const part of line.length > budget ? splitText(line, budget) : [line]) {
      if (current.length > 0 && [...current, part].join('\n').length > budget) {
        groups.push(current);
        current = [];
      }
      current.push(part);
    }
  }
  if (current.length > 0) {
    groups.push(current);
  }
  return groups.map((lines) => [...prefix, ...lines].join('\n'));
}

/** Splits running text at sentence ends, or at spaces for a huge sentence. */
function splitText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let current = '';
  for (const sentence of text.split(SENTENCE_END)) {
    for (const piece of hardWrap(sentence, maxChars)) {
      if (current && current.length + 1 + piece.length > maxChars) {
        out.push(current);
        current = '';
      }
      current = current ? `${current} ${piece}` : piece;
    }
  }
  if (current) {
    out.push(current);
  }
  return out;
}

function hardWrap(text: string, maxChars: number): string[] {
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    const space = rest.lastIndexOf(' ', maxChars);
    const cut = space > 0 ? space : maxChars;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  return rest ? [...parts, rest] : parts;
}

function breadcrumb(doc: ChunkInput, path: string[]): string {
  const crumb = [doc.title, ...path].join(' › ');
  return doc.year ? `${crumb} [${doc.year}]` : crumb;
}

function text(lines: string[]): string {
  return lines
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}
