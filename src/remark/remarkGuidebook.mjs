/**
 * Remark plugin for university and scholarship pages: turns the MDX that
 * drive_sync emits into the Guidebook layout without changing what editors
 * write in Word.
 *
 * - Each H2 section becomes <GuideSection>, keyed through the labels and
 *   aliases in scripts/drive_sync/mapping.toml.
 * - Faculty H3 + <MajorsTable> pairs merge into one <ProgramExplorer>.
 * - Markdown tables become <GuideTable>: the reference column turns into
 *   source links, and tables with a Closes/Deadline column into window cards.
 * - The H1 and the staleness admonition move into the header, and the key
 *   facts are derived here; a fact the tables don't support is left out.
 *
 * Runs after Docusaurus' own remark plugins, so heading ids and the TOC are
 * already set. Registered on the universities and scholarships docs plugins,
 * with `kind` naming which mapping.toml sections to read.
 */
import fs from 'node:fs';

const MAPPING = new URL('../../scripts/drive_sync/mapping.toml', import.meta.url);

export const REF_HEADERS = ['reference', 'source', 'link', 'references', 'المرجع', 'المصدر', 'الرابط'];
const SOURCES_LINE = /^(?:Reference|References|Source|Sources|المرجع|المراجع|المصدر)\s*:\s*/;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /\+\d{1,3}(?:[ -]?\d){6,14}/g;
const MONEY =
  /(?<cur>\$|€|USD|EUR|LBP)\s?(?<num>\d[\d,]*(?:\.\d+)?)|(?<num2>\d[\d,]*(?:\.\d+)?)\s?(?<cur2>\$|€|ل\.ل)/;
const PER_CREDIT = /per credit|credit hour|لكل ساعة|بالساعة|للساعة|سعر الساعة/i;
export const OPENS = /^(opens?|يفتح|تفتح|يُفتح|تُفتح)$/i;
export const CLOSES = /^(closes?|يغلق|يُغلق|تقفل|تُقفل|يقفل)$|deadline|last day|الموعد النهائي|آخر يوم/i;
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const AR_MONTHS = {
  'كانون الثاني': 1,
  شباط: 2,
  آذار: 3,
  نيسان: 4,
  أيار: 5,
  حزيران: 6,
  تموز: 7,
  آب: 8,
  أيلول: 9,
  'تشرين الأول': 10,
  'تشرين الثاني': 11,
  'كانون الأول': 12,
};
export const DATE_HEADER = /\bdate\b|تاريخ|التاريخ|الموعد/i;
const SECTION_HEADINGS_SHOWN = 3;
const SECTION_ROWS_LIMIT = 14;
const EMPTY = /^[—–-]?$/;

const sectionRules = {};

// Just enough TOML for the [[sections.<kind>]] blocks of mapping.toml.
function loadSectionRules(kind) {
  if (sectionRules[kind]) return sectionRules[kind];
  const rules = [];
  let current = null;
  let inLabels = false;
  for (const raw of fs.readFileSync(MAPPING, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[')) {
      if (line === `[[sections.${kind}]]`) {
        current = {key: null, aliases: [], labels: {}};
        rules.push(current);
        inLabels = false;
      } else if (line === `[sections.${kind}.labels]` && current) {
        inLabels = true;
      } else {
        current = null;
      }
      continue;
    }
    if (!current) continue;
    const m = line.match(/^(\w+)\s*=\s*("(?:[^"\\]|\\.)*"|\[.*\])/);
    if (!m) continue;
    const value = JSON.parse(m[2]);
    if (inLabels) current.labels[m[1]] = value;
    else if (m[1] === 'key') current.key = value;
    else if (m[1] === 'aliases') current.aliases = value;
  }
  sectionRules[kind] = rules;
  return rules;
}

export const normalize = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const REF_NORMALIZED = new Set(REF_HEADERS.map(normalize));

export function sectionKey(title, kind) {
  const text = title.replace(/\s*\((?:AY|للعام)\s[^)]*\)\s*$/, '').trim();
  const rules = loadSectionRules(kind);
  const exact = rules.find((rule) => Object.values(rule.labels).includes(text));
  if (exact) return exact.key;
  const norm = normalize(text);
  let best = null;
  let bestLength = 0;
  for (const rule of rules) {
    for (const alias of rule.aliases) {
      const a = normalize(alias);
      if (a && norm.includes(a) && a.length > bestLength) {
        best = rule.key;
        bestLength = a.length;
      }
    }
  }
  return best;
}

function toText(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (node.type === 'break') return ' ';
  return (node.children ?? []).map(toText).join('');
}

const plain = (node) => toText(node).replace(/\s+/g, ' ').trim();

const text = (value) => ({type: 'text', value});

function jsx(name, props = {}, children = [], kind = 'mdxJsxFlowElement') {
  const attributes = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({
      type: 'mdxJsxAttribute',
      name: key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }));
  return {type: kind, name, attributes, children};
}

const isBlank = (node) => node.type === 'text' && !node.value.trim();
const headingId = (node) => node.data?.id ?? node.data?.hProperties?.id;

export function parseDate(value) {
  const t = value.trim().replace(/\s*\([^)]*\)\s*$/, '');
  const pad = (n) => String(n).padStart(2, '0');
  const m =
    t.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/) ??
    t.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/);
  if (m) {
    const [, a, b, year] = m;
    const [month, day] = /^[A-Za-z]/.test(a) ? [a, b] : [b, a];
    const num = EN_MONTHS.indexOf(month.slice(0, 3).toLowerCase()) + 1;
    const d = Number(day);
    return num && d >= 1 && d <= 31 ? `${year}-${pad(num)}-${pad(d)}` : null;
  }
  const ar = t.match(/^(\d{1,2})\s+(.+?)(?:\/\S+)?\s+(\d{4})$/);
  if (ar && AR_MONTHS[ar[2]]) return `${ar[3]}-${pad(AR_MONTHS[ar[2]])}-${pad(Number(ar[1]))}`;
  return null;
}

function windowsOf(head, rows, keep) {
  const closes = keep.find((i) => CLOSES.test(head[i].trim()));
  if (closes === undefined) return null;
  const opens = keep.find((i) => OPENS.test(head[i].trim()));
  return {
    title: keep.indexOf(keep.find((i) => i !== opens && i !== closes)),
    opens: opens !== undefined ? keep.indexOf(opens) : null,
    closes: keep.indexOf(closes),
    dates: rows.map((r) => ({
      opens: opens !== undefined ? parseDate(r[opens]) : null,
      closes: parseDate(r[closes]),
    })),
  };
}

function refOf(cell) {
  const value = plain(cell);
  if (EMPTY.test(value)) return null;
  const content = cell.children.filter((node) => !isBlank(node));
  if (content.length === 1 && content[0].type === 'link') {
    return {url: content[0].url, label: plain(content[0]) || content[0].url};
  }
  if (/^https?:\/\/\S+$/.test(value)) {
    return {url: value, label: value.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]};
  }
  return {note: true};
}

// "Stage | Date" tables on scholarship pages: each row gets a status when its date is exact.
function timelineOf(head, rows, keep) {
  const col = keep.find((i) => DATE_HEADER.test(head[i]));
  if (col === undefined) return null;
  return {col: keep.indexOf(col), dates: rows.map((r) => parseDate(r[col]))};
}

function convertTable(table, kind) {
  const [headRow, ...bodyRows] = table.children;
  const width = headRow.children.length;
  const head = headRow.children.map(plain);
  const body = bodyRows.map((row) =>
    Array.from({length: width}, (_, i) => row.children[i] ?? {type: 'tableCell', children: []}),
  );
  const texts = body.map((row) => row.map(plain));
  const refsAt = head.map((h, i) => (REF_NORMALIZED.has(normalize(h)) ? i : -1)).filter((i) => i >= 0);
  const refCol = refsAt.length && width > 1 ? refsAt[refsAt.length - 1] : null;
  let refs = body.map((row) => (refCol === null ? null : refOf(row[refCol])));
  let sharedRef = null;
  const urls = new Set(refs.filter(Boolean).map((r) => r.url));
  if (refCol !== null && refs.length && refs.every((r) => r?.url) && urls.size === 1) {
    sharedRef = refs[0];
    refs = refs.map(() => null);
  }
  const keep = head.map((_, i) => i).filter((i) => i !== refCol);
  const shape = keep.length === 1 ? 'list' : keep.length <= 3 ? 'kv' : 'wide';
  const windows = keep.length > 1 ? windowsOf(head, texts, keep) : null;
  const timeline = kind === 'scholarship' && !windows && shape === 'kv' ? timelineOf(head, texts, keep) : null;
  const rows = body.map((row, r) =>
    jsx('GuideRow', {}, [
      ...keep.map((i) => jsx('GuideCell', {}, row[i].children)),
      ...(refs[r]?.note ? [jsx('GuideRef', {}, row[refCol].children)] : []),
    ]),
  );
  const node = jsx(
    'GuideTable',
    {
      shape,
      head: keep.map((i) => head[i]),
      texts: texts.map((row) => keep.map((i) => row[i])),
      refs: refs.map((r) => (r && !r.note ? r : null)),
      sharedRef,
      windows,
      timeline,
    },
    rows,
  );
  return {node, raw: {head, rows: texts, refs, sharedRef}};
}

function rowsFromEstree(attribute) {
  const program = attribute?.value?.data?.estree;
  const array = program?.body?.[0]?.expression;
  if (array?.type !== 'ArrayExpression') return null;
  return array.elements
    .filter((el) => el?.type === 'ObjectExpression')
    .map((obj) => {
      const row = {};
      for (const prop of obj.properties) {
        const key = prop.key?.name ?? prop.key?.value;
        if (key && prop.value?.type === 'Literal') row[key] = prop.value.value;
      }
      return row;
    });
}

function rowsFromSource(attribute) {
  const source = typeof attribute?.value === 'string' ? attribute.value : attribute?.value?.value;
  if (!source) return [];
  const field = /(\w+):\s*('(?:[^'\\]|\\.)*'|-?\d+(?:\.\d+)?)/g;
  return (source.match(/\{[^{}]*\}/g) ?? []).map((chunk) => {
    const row = {};
    for (const [, key, value] of chunk.matchAll(field)) {
      row[key] = value.startsWith("'") ? value.slice(1, -1).replace(/\\'/g, "'") : Number(value);
    }
    return row;
  });
}

function majorsRows(node) {
  const attribute = node.attributes?.find((a) => a.name === 'rows');
  return rowsFromEstree(attribute) ?? rowsFromSource(attribute);
}

const isMajors = (node) => node.type === 'mdxJsxFlowElement' && node.name === 'MajorsTable';

function facultyGroup(heading, rows) {
  const link = heading.children.find((node) => node.type === 'link');
  const before = [];
  for (const node of heading.children) {
    if (node === link) break;
    before.push(node);
  }
  const name = link ? before.map(toText).join('').replace(/\s*\(\s*$/, '').trim() : plain(heading);
  return {
    id: headingId(heading),
    name: name || plain(heading),
    abbr: link ? plain(link) : null,
    url: link ? link.url : null,
    rows,
  };
}

function breakEmail(link) {
  const [only] = link.children;
  if (link.children.length !== 1 || only.type !== 'text') return;
  const m = only.value.match(/^([\w.+-]+@)([\w-]+(?:\.[\w-]+)+)$/);
  if (m) link.children = [text(m[1]), jsx('wbr', {}, [], 'mdxJsxTextElement'), text(m[2])];
}

function autolink(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type === 'text') {
      out.push(...splitContacts(node.value));
      continue;
    }
    if (node.type === 'link') breakEmail(node);
    if (node.children && !['link', 'inlineCode', 'code'].includes(node.type) && !node.type.startsWith('mdxJsx')) {
      node.children = autolink(node.children);
    }
    out.push(node);
  }
  return out;
}

function splitContacts(value) {
  const hits = [];
  for (const m of value.matchAll(EMAIL)) hits.push({index: m.index, match: m[0], kind: 'email'});
  for (const m of value.matchAll(PHONE)) {
    if (!hits.some((h) => m.index < h.index + h.match.length && h.index < m.index + m[0].length)) {
      hits.push({index: m.index, match: m[0], kind: 'phone'});
    }
  }
  if (!hits.length) return [text(value)];
  hits.sort((a, b) => a.index - b.index);
  const out = [];
  let at = 0;
  for (const hit of hits) {
    if (hit.index > at) out.push(text(value.slice(at, hit.index)));
    if (hit.kind === 'email') {
      const [local, domain] = hit.match.split('@');
      out.push({
        type: 'link',
        url: `mailto:${hit.match}`,
        children: [text(`${local}@`), jsx('wbr', {}, [], 'mdxJsxTextElement'), text(domain)],
      });
    } else {
      out.push({
        type: 'link',
        url: `tel:${hit.match.replace(/[^\d+]/g, '')}`,
        data: {hProperties: {className: ['tel'], dir: 'ltr'}},
        children: [text(hit.match)],
      });
    }
    at = hit.index + hit.match.length;
  }
  if (at < value.length) out.push(text(value.slice(at)));
  return out;
}

function sourcesOf(paragraph) {
  const first = paragraph.children[0];
  if (first?.type !== 'text' || !SOURCES_LINE.test(first.value)) return null;
  const links = paragraph.children.filter((node) => node.type === 'link');
  if (!links.length) return null;
  for (const link of links) link.children.push(jsx('GuideExt', {}, [], 'mdxJsxTextElement'));
  return jsx('GuideSources', {count: String(links.length)}, links);
}

function markLead(paragraph) {
  const content = paragraph.children.filter((node) => !isBlank(node));
  const [strong, colon] = content;
  if (strong?.type !== 'strong') return;
  if (content.length > 2 || (colon && !(colon.type === 'text' && colon.value.trim() === ':'))) return;
  const children = strong.children;
  const last = children[children.length - 1];
  if (last?.type === 'text') last.value = last.value.replace(/:\s*$/, '');
  paragraph.children = children;
  paragraph.data = {...paragraph.data, hProperties: {...paragraph.data?.hProperties, className: ['lead-in']}};
}

// "**Term** — description" items read better as a definition list, and so do
// scholarship pages' "**Provider:** description" ones.
function definitionList(list, kind) {
  if (list.children.length < 2) return null;
  const pairs = [];
  for (const item of list.children) {
    const [para, ...rest] = item.children;
    if (rest.length || para?.type !== 'paragraph') return null;
    const [strong, after, ...more] = para.children;
    if (strong?.type !== 'strong') return null;
    if (kind === 'scholarship' && /:\s*$/.test(toText(strong))) {
      const desc = [after, ...more].filter(Boolean);
      if (!plain({children: desc})) return null;
      const term = strong.children.map((node, i, all) =>
        i === all.length - 1 && node.type === 'text' ? text(node.value.replace(/:\s*$/, '')) : node,
      );
      if (desc[0].type === 'text') desc[0] = text(desc[0].value.replace(/^\s+/, ''));
      pairs.push({term, desc});
      continue;
    }
    if (after?.type !== 'text') return null;
    const m = after.value.match(/^\s*[—–:-]\s*/);
    const desc = m ? after.value.slice(m[0].length) : '';
    if (!m || (!desc && !more.length)) return null;
    pairs.push({term: strong.children, desc: [...(desc ? [text(desc)] : []), ...more]});
  }
  return jsx(
    'dl',
    {className: 'defs'},
    pairs.map(({term, desc}) => jsx('div', {}, [jsx('dt', {}, term), jsx('dd', {}, desc)])),
  );
}

// An English aside in an Arabic heading otherwise loses its brackets when the line wraps.
function isolateLatin(nodes) {
  for (const node of nodes) {
    if (node.type !== 'heading') continue;
    node.children = node.children.flatMap((child) => {
      if (child.type !== 'text') return [child];
      return child.value
        .split(/(\([A-Za-z][^()]*\))/)
        .filter(Boolean)
        .map((part, i, parts) =>
          /^\([A-Za-z]/.test(part) && part.endsWith(')') && parts.length > 1
            ? jsx('bdi', {dir: 'ltr'}, [text(part)], 'mdxJsxTextElement')
            : text(part),
        );
    });
  }
}

// "**Label:** value" lines, read before the lists are converted.
function fieldsOf(nodes) {
  const fields = [];
  for (const node of nodes) {
    if (node.type !== 'list') continue;
    for (const item of node.children) {
      const [para] = item.children;
      if (para?.type !== 'paragraph') continue;
      const [strong, ...rest] = para.children;
      if (strong?.type !== 'strong') continue;
      const label = plain(strong).replace(/:\s*$/, '').trim();
      const value = plain({children: rest});
      if (label && value) fields.push({label, value});
    }
  }
  return fields;
}

const firstClause = (value) => value?.split(/\s*[,;،؛(]\s*|\s+[—–]\s+/)[0].replace(/\.\s*$/, '').trim() || null;

// The page's own red or amber box, surfaced as the header notice.
function alertOf(nodes) {
  for (const node of nodes) {
    if (node.type !== 'mdxJsxFlowElement' || node.name !== 'div') continue;
    const cls = node.attributes?.find((a) => a.name === 'className')?.value;
    const m = typeof cls === 'string' ? cls.match(/\balert-(danger|warning)\b/) : null;
    if (!m) continue;
    let strong = null;
    const find = (n) => {
      if (strong) return;
      if (n.type === 'strong') strong = n;
      else (n.children ?? []).forEach(find);
    };
    find(node);
    const id = 'page-alert';
    node.attributes.push({type: 'mdxJsxAttribute', name: 'id', value: id});
    return {type: m[1], title: plain(strong ?? node).slice(0, 160), text: '', href: `#${id}`};
  }
  return null;
}

function rowCount(nodes) {
  return nodes.reduce((n, node) => {
    if (node.type === 'table') return n + node.children.length - 1;
    if (node.type === 'list') return n + node.children.length;
    return n;
  }, 0);
}

function buildSection(section) {
  const tables = [];
  const groups = [];
  let intro = [];
  const after = [];
  const nodes = section.nodes;
  const headingCount = nodes.filter((node) => node.type === 'heading').length;
  const rows = rowCount(nodes);

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.type === 'heading' && isMajors(nodes[i + 1] ?? {})) {
      groups.push(facultyGroup(node, majorsRows(nodes[i + 1])));
      i += 1;
      continue;
    }
    if (isMajors(node)) {
      groups.push({id: null, name: section.title, abbr: null, url: null, rows: majorsRows(node)});
      continue;
    }
    (groups.length ? after : intro).push(node);
  }

  const convert = (list) =>
    autolink(list).map((node) => {
      if (node.type === 'table') {
        const {node: converted, raw} = convertTable(node, section.kind);
        tables.push(raw);
        return converted;
      }
      if (node.type === 'paragraph') {
        const sources = sourcesOf(node);
        if (sources) return sources;
        markLead(node);
      }
      if (node.type === 'list') return definitionList(node, section.kind) ?? node;
      if (node.type === 'blockquote') section.hasNotes = true;
      return node;
    });

  let body;
  if (groups.length) {
    intro = convert(intro);
    body = [
      ...(intro.length ? [jsx('div', {className: 'about'}, intro)] : []),
      jsx('ProgramExplorer', {groups}),
      ...convert(after),
    ];
  } else {
    body = convert(nodes);
    if (headingCount > SECTION_HEADINGS_SHOWN && rows > SECTION_ROWS_LIMIT) {
      const headingAt = body.map((node, i) => (node.type === 'heading' ? i : -1)).filter((i) => i >= 0);
      const cut = headingAt[SECTION_HEADINGS_SHOWN];
      body = [
        ...body.slice(0, cut),
        jsx('GuideMore', {count: String(headingAt.length - SECTION_HEADINGS_SHOWN)}, body.slice(cut)),
      ];
    }
  }
  section.tables = tables;
  section.groups = groups;
  section.body = body;
}

function money(value) {
  const m = value.match(MONEY);
  if (!m) return null;
  const raw = m.groups.cur ?? m.groups.cur2;
  const num = m.groups.num ?? m.groups.num2;
  const currency = {USD: '$', EUR: '€', 'ل.ل': 'LBP'}[raw] ?? raw;
  return {currency, value: Number(num.replace(/,/g, ''))};
}

function deriveFee(section) {
  for (const table of section?.tables ?? []) {
    if (!/fee|الرسم/i.test(table.head[0] ?? '')) continue;
    const found = table.head.findIndex((h) => /amount|القيمة|المبلغ/i.test(h));
    const amountCol = found >= 0 ? found : 1;
    for (const row of table.rows) {
      if (/application|admission|تقديم|طلب|القبول/i.test(row[0]) && /\d/.test(row[amountCol] ?? '')) {
        return {value: row[amountCol], label: row[0]};
      }
    }
    return null;
  }
  return null;
}

function deriveTuition(section) {
  const values = [];
  for (const table of section?.tables ?? []) {
    const col = table.head.findIndex((h) => PER_CREDIT.test(h));
    for (const row of table.rows) {
      if (col < 0 && values.length) break;
      const cells = col >= 0 ? [row[col]] : PER_CREDIT.test(row[0]) ? row.slice(1) : [];
      for (const cell of cells) {
        if (/year|flat|semester|سنة|سنوي|ثابت|فصل/i.test(cell ?? '')) continue;
        const parsed = money(cell ?? '');
        if (parsed) values.push(parsed);
      }
    }
  }
  if (!values.length) return null;
  const currencies = new Set(values.map((v) => v.currency));
  if (currencies.size !== 1) return null;
  const nums = values.map((v) => v.value);
  return {min: Math.min(...nums), max: Math.max(...nums), currency: [...currencies][0], notes: Boolean(section.hasNotes)};
}

function deriveContact(section) {
  for (const table of section?.tables ?? []) {
    const phoneCol = table.head.findIndex((h) => /phone|الهاتف|tel/i.test(h));
    const order = table.rows
      .map((row, i) => i)
      .sort((a, b) => Number(!/admission|القبول/i.test(table.rows[a][0])) - Number(!/admission|القبول/i.test(table.rows[b][0])));
    for (const r of order) {
      const row = table.rows[r];
      const email = row.join(' ').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
      const phone = phoneCol >= 0 && /\d/.test(row[phoneCol] ?? '') ? row[phoneCol] : null;
      if (email || phone) return {office: row[0], phone, email: email ? email[0] : null};
    }
  }
  return null;
}

function header(frontMatter, h1, kind) {
  const title = String(frontMatter.title ?? '');
  const dash = title.indexOf('—');
  const shortName = dash > 0 ? title.slice(0, dash).trim() : String(frontMatter.sidebar_label ?? '');
  const fullName = dash > 0 ? title.slice(dash + 1).trim() : title || h1;
  let alt = null;
  const m = kind === 'university' ? (h1 ?? '').match(/^(.*?)\s*\((.+)\)\s*$/) : null;
  if (m) {
    const inner = m[2].replace(/\s*[—–]\s*[^—–]*$/, '').trim();
    if (inner && inner !== shortName && normalize(inner) !== normalize(fullName)) alt = inner;
  }
  const applyUrl = typeof frontMatter.apply_url === 'string' ? frontMatter.apply_url : null;
  return {
    shortName,
    fullName,
    alt,
    applyUrl,
    applyHost: applyUrl ? applyUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : null,
    contentYear: frontMatter.content_year ? String(frontMatter.content_year) : null,
  };
}

// Docusaurus wraps the page's H1 in a JSX <header> before this plugin runs.
const isTitle = (node) =>
  (node.type === 'heading' && node.depth === 1) ||
  (node.type === 'mdxJsxFlowElement' &&
    node.name === 'header' &&
    node.children?.length === 1 &&
    node.children[0].type === 'heading' &&
    node.children[0].depth === 1);

function universityFacts(byKey, sections) {
  const programs = sections.flatMap((section) => section.groups);
  const scholarships = (byKey('scholarships')?.tables ?? [])
    .filter((table) => table.head.length >= 3)
    .reduce((n, table) => n + table.rows.length, 0);
  return {
    programs: {count: programs.reduce((n, group) => n + group.rows.length, 0), units: programs.length},
    fee: deriveFee(byKey('application')),
    tuition: deriveTuition(byKey('tuition')),
    contact: deriveContact(byKey('contacts')),
    scholarships: scholarships || null,
  };
}

function scholarshipFacts(byKey) {
  const fields = byKey('overview')?.fields ?? [];
  const field = (pattern) => fields.find((f) => pattern.test(f.label))?.value ?? null;
  const universities = (byKey('universities')?.tables ?? [])
    .filter((table) => /universit|الجامع/i.test(table.head[0] ?? ''))
    .reduce((n, table) => n + table.rows.length, 0);
  return {
    provider: firstClause(field(/^(provider|الجهة المانحة|المموّل|المانح)/i)),
    type: firstClause(field(/^(type|النوع)$/i)),
    universities: universities || null,
  };
}

export default function remarkGuidebook({kind = 'university'} = {}) {
  return (root, file) => {
    const frontMatter = file.data?.frontMatter ?? {};
    const top = [];
    const lead = [];
    const sections = [];
    let h1 = null;
    let notice = null;
    for (const node of root.children) {
      if (node.type === 'mdxjsEsm') {
        top.push(node);
      } else if (node.type === 'heading' && node.depth === 2) {
        sections.push({heading: node, nodes: [], hasNotes: false, kind});
      } else if (sections.length) {
        sections[sections.length - 1].nodes.push(node);
      } else if (h1 === null && isTitle(node)) {
        h1 = plain(node);
      } else if (node.type === 'containerDirective' && node.data?.hName === 'admonition' && !notice) {
        notice = {type: node.name, title: node.data.hProperties?.title ?? '', text: plain(node)};
      } else {
        lead.push(node);
      }
    }
    if (!sections.length) return;

    const arabic = /[\\/]i18n[\\/]ar[\\/]/.test(file.path ?? '');
    for (const section of sections) {
      section.title = plain(section.heading);
      section.id = headingId(section.heading);
      section.key = sectionKey(section.title, kind);
      if (arabic) isolateLatin(section.nodes);
      section.fields = fieldsOf(section.nodes);
      notice ??= alertOf(section.nodes);
      buildSection(section);
    }

    const byKey = (key) => sections.find((section) => section.key === key);
    const facts = kind === 'scholarship' ? scholarshipFacts(byKey) : universityFacts(byKey, sections);
    const counts = {
      faculty: facts.programs?.count,
      scholarships: facts.scholarships,
      universities: facts.universities,
    };
    const data = {
      kind,
      ...header(frontMatter, h1, kind),
      h1,
      notice,
      sections: sections.map(({id, key, title}) => ({id, key, title})),
      facts,
    };

    root.children = [
      ...top,
      jsx('Guidebook', {data}, [
        ...lead,
        ...sections.map((section) =>
          jsx(
            'GuideSection',
            {
              sectionId: section.id,
              sectionKey: section.key ?? undefined,
              title: section.title,
              count: section.key && counts[section.key] ? String(counts[section.key]) : undefined,
            },
            section.body,
          ),
        ),
      ]),
    ];
  };
}
