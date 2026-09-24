/**
 * Turns the MDX that drive_sync generates into plain markdown for the
 * Collegesaurus AI chatbot.
 *
 * It knows the few MDX forms drive_sync emits (scripts/drive_sync/emit/
 * format.py): <MajorsTable> blocks, alert <div>s, admonitions and the
 * backslash escapes of <, { and }. Anything else that looks like a component
 * is passed to `onUnknown`, so a new component is noticed at build time
 * rather than reaching the chatbot as raw JSX.
 */

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
const MAJORS_TABLE = /<MajorsTable\b[\s\S]*?\/>/g;
// One `key: value` of a MajorsTable row: single-quoted JSON-escaped string, number or boolean.
const ROW_PROP = /(\w+):\s*('(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?|true|false)/g;
const ALERT_WRAPPER = /^(?:<div className="alert-[a-z]+">|<\/div>)[ \t]*\n?/gm;
const ADMONITION = /^:::(\w+)(?:\[([^\]\n]*)\])?[ \t]*\n([\s\S]*?)\n:::[ \t]*$/gm;
const COMPONENT = /(?<!\\)<([A-Z][A-Za-z0-9]*)/g;
const MDX_ESCAPE = /\\([<{}])/g;

const COLUMNS: [key: string, header: string][] = [
  ['program', 'Program'],
  ['degree', 'Degree'],
  ['department', 'Department'],
  ['credits', 'Credits'],
  ['years', 'Years'],
  ['language', 'Language'],
];

export function mdxToMarkdown(mdx: string, onUnknown?: (component: string) => void): string {
  let text = mdx.replace(/\r\n/g, '\n').replace(FRONTMATTER, '');
  text = text.replace(MAJORS_TABLE, majorsTable);
  text = text.replace(ALERT_WRAPPER, '');
  text = text.replace(ADMONITION, (_match, type: string, title: string | undefined, body: string) => {
    const heading = (title || type).trim().replace(/[.!?:]$/, '');
    return `**${heading}.** ${body.trim().replace(/\s*\n\s*/g, ' ')}`;
  });
  for (const match of text.matchAll(COMPONENT)) {
    onUnknown?.(match[1]);
  }
  return text.replace(MDX_ESCAPE, '$1').replace(/\n{3,}/g, '\n\n').trim();
}

function majorsTable(block: string): string {
  const rows: Record<string, string>[] = [];
  for (const line of block.split('\n')) {
    const row: Record<string, string> = {};
    for (const [, key, raw] of line.matchAll(ROW_PROP)) {
      row[key] = decode(raw);
    }
    if (Object.keys(row).length > 0) {
      rows.push(row);
    }
  }
  if (rows.length === 0) {
    return '';
  }
  const columns = COLUMNS.filter(([key]) => rows.some((row) => row[key]));
  const cell = (value = '') => value.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
  const body = rows.map((row) => {
    const cells = columns.map(([key]) =>
      key === 'program' && row.source ? `[${cell(row.program)}](${row.source})` : cell(row[key]),
    );
    return `| ${cells.join(' | ')} |`;
  });
  return [
    `| ${columns.map(([, header]) => header).join(' | ')} |`,
    `|${columns.map(() => '---').join('|')}|`,
    ...body,
  ].join('\n');
}

/** A value as format.py wrote it: JSON-escaped, single-quoted, with \' for '. */
function decode(raw: string): string {
  if (!raw.startsWith("'")) {
    return raw;
  }
  const inner = raw.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"');
  return JSON.parse(`"${inner}"`) as string;
}
