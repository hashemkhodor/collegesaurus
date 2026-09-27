/**
 * The corpus is clean markdown (plugins/chatbot-corpus). Search needs it three
 * other ways: a heading's plain text, which Docusaurus slugs into its id;
 * link-free markdown to embed; and plain lines to show as snippets.
 */

const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const HTML_TAG = /<\/?[A-Za-z][^>]*>/g;
const CODE = /`([^`]*)`/g;
const STRONG = /(\*\*|__)(.+?)\1/g;
const EMPHASIS = /(^|[^\p{L}\p{N}])[*_](?=\S)(.+?)(?<=\S)[*_](?![\p{L}\p{N}])/gu;
const ESCAPE = /\\([\\`*_{}[\]()#+\-.!|<>])/g;
const ENTITY = /&(amp|lt|gt|quot|apos|#39|nbsp);/g;
const ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' '};
const TABLE_SEPARATOR = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;
const CELL_BORDER = /(?<!\\)\|/;

function inline(text: string): string {
  return text
    .replace(IMAGE, '$1')
    .replace(LINK, '$1')
    .replace(HTML_TAG, ' ')
    .replace(CODE, '$1')
    .replace(STRONG, '$2')
    .replace(EMPHASIS, '$1$2')
    .replace(ESCAPE, '$1')
    .replace(ENTITY, (_match, name: string) => ENTITIES[name]);
}

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function headingText(heading: string): string {
  return squash(inline(heading));
}

export function withoutLinks(markdown: string): string {
  return markdown.replace(IMAGE, '').replace(LINK, '$1');
}

export function plainText(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim());
  const out: string[] = [];
  lines.forEach((line, i) => {
    if (!line) {
      return;
    }
    if (line.startsWith('|')) {
      const isHeader = TABLE_SEPARATOR.test(lines[i + 1] ?? '');
      if (TABLE_SEPARATOR.test(line) || isHeader) {
        return;
      }
      const cells = line
        .replace(/^\|/, '')
        .replace(/(?<!\\)\|$/, '')
        .split(CELL_BORDER)
        .map((cell) => squash(inline(cell)))
        .filter(Boolean);
      if (cells.length > 0) {
        out.push(cells.join(' · '));
      }
      return;
    }
    const text = squash(
      inline(
        line
          .replace(/^#{1,6}\s+/, '')
          .replace(/^>\s?/, '')
          .replace(/^(?:[-*+]|\d+[.)])\s+/, ''),
      ),
    );
    if (text) {
      out.push(text);
    }
  });
  return out.join('\n');
}
