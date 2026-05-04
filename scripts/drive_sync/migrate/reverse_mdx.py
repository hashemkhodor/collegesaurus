"""MDX → IR.

Reverse of the forward emit/* modules. Reads a hand-authored .mdx file
and produces a UniversityIR or ScholarshipIR.

Pipeline:
    1. Strip the YAML frontmatter and `<MajorsTable rows={[...]}>` JSX blocks
       (the latter become FacultyGroups; everything else is plain Markdown).
    2. Parse the remaining Markdown via `markdown-it-py` with GFM table support.
    3. Walk the resulting tokens and build a list of `Block` objects per H2
       section. The page H1 is captured as `meta.page_h1` if it differs from
       `meta.title`.
    4. The H2 named "Faculty" is the universities-only section; its inline
       prose becomes the IR's `introduction` and the per-H3 + JSX blocks
       become FacultyGroups.

This is one-shot code; we keep it pragmatic.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from loguru import logger
from markdown_it import MarkdownIt
from markdown_it.token import Token
from mdit_py_plugins.front_matter import front_matter_plugin

from drive_sync.models import (
    Block,
    Blockquote,
    Code,
    FacultyGroup,
    Heading,
    LinkRun,
    List_,
    ListItem,
    MajorRow,
    Metadata,
    Paragraph,
    RawHtml,
    Run,
    ScholarshipIR,
    ScholarshipSection,
    Table,
    TableCell,
    TableRow,
    TextRun,
    UniversityIR,
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


@dataclass
class MdxFile:
    """Identifying info for a parsed legacy MDX file."""

    path: Path
    slug: str
    locale: str  # 'en' | 'ar'


def reverse_mdx(file: MdxFile) -> UniversityIR | ScholarshipIR | None:
    """Read an MDX file and return its IR. Logs on failure, returns None."""
    text = file.path.read_text(encoding="utf-8")

    # Step 1: split frontmatter + body.
    meta_raw, body = _split_frontmatter(text)
    if not meta_raw:
        logger.error("[{}] missing YAML frontmatter", file.path)
        return None
    try:
        meta = _parse_metadata(meta_raw)
    except Exception as err:  # noqa: BLE001
        logger.error("[{}] frontmatter validation failed: {}", file.path, err)
        return None

    # Step 2: extract <MajorsTable rows={[...]}/> JSX blocks. Each block is
    # tied to the immediately-preceding H3 heading line. We replace the JSX
    # with a placeholder marker so markdown-it doesn't choke on the JSX.
    try:
        body, jsx_rows_by_marker = _extract_majors_jsx(body)
    except Exception as err:  # noqa: BLE001
        logger.error("[{}] failed to parse <MajorsTable> JSX: {}", file.path, err)
        return None

    # Step 3: parse Markdown. We enable `html: True` so JSX/HTML blocks like
    # `<div className="alert-warning">…</div>` round-trip as RawHtml IR
    # blocks (with backslash-escaped variants — `\<div ...>` — handled
    # specially below since markdown-it sees those as text).
    md = MarkdownIt("commonmark", {"breaks": False, "html": True}).use(front_matter_plugin).enable("table")
    tokens = md.parse(body)

    # Step 4: walk tokens.
    parsed = _walk(tokens, jsx_rows_by_marker)

    # Discard intro page-title H1 and capture page_h1 on Metadata if it differs.
    if parsed.page_h1 and parsed.page_h1 != meta.title:
        meta = meta.model_copy(update={"page_h1": parsed.page_h1})

    # Use alias-aware matching so Arabic-authored MDX (`## الكلية (Faculty)`) is
    # detected as a university.
    is_university = _find_section(parsed, "Faculty") is not None
    if is_university:
        return _build_university(file, meta, parsed)
    return _build_scholarship(file, meta, parsed)


# ---------------------------------------------------------------------------
# Frontmatter
# ---------------------------------------------------------------------------


_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?\n)---\s*\n", re.DOTALL)


def _split_frontmatter(text: str) -> tuple[str | None, str]:
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return None, text
    return m.group(1), text[m.end():]


def _parse_metadata(raw: str) -> Metadata:
    """Parse the small subset of YAML we use (key: value lines)."""
    data: dict[str, str | int] = {}
    for line in raw.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*$", line)
        if not m:
            continue
        key, value = m.group(1), m.group(2)
        # Strip wrapping quotes if present.
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        if key == "sidebar_position":
            data[key] = int(value)
        else:
            data[key] = value
    return Metadata.model_validate(data)


# ---------------------------------------------------------------------------
# <MajorsTable rows={[...]}/> extraction
# ---------------------------------------------------------------------------


_MAJORSTABLE_RE = re.compile(
    r"<MajorsTable\b[^>]*?\brows=\{\[(?P<rows>.*?)\]\}\s*/?>(?:\s*</MajorsTable>)?",
    re.DOTALL,
)
_MARKER_PREFIX = "%%MAJORSTABLE_PLACEHOLDER_"


def _extract_majors_jsx(body: str) -> tuple[str, dict[str, list[MajorRow]]]:
    """Replace each `<MajorsTable rows={[...]}/>` with a marker; collect rows."""
    rows_by_marker: dict[str, list[MajorRow]] = {}
    counter = 0

    def replace(m: re.Match) -> str:
        nonlocal counter
        marker = f"{_MARKER_PREFIX}{counter}%%"
        counter += 1
        rows_text = m.group("rows")
        rows = _parse_jsx_rows(rows_text)
        rows_by_marker[marker] = rows
        return marker

    new_body = _MAJORSTABLE_RE.sub(replace, body)
    return new_body, rows_by_marker


def _parse_jsx_rows(rows_text: str) -> list[MajorRow]:
    """Convert `{program: 'X', credits: 1}, …` JS-literal syntax → MajorRow[]."""
    # Pass 1: single-quoted strings → double-quoted, with escape handling.
    out: list[str] = []
    i = 0
    n = len(rows_text)
    while i < n:
        c = rows_text[i]
        if c == "'":
            buf: list[str] = []
            i += 1
            while i < n:
                ch = rows_text[i]
                if ch == "\\" and i + 1 < n:
                    buf.append(ch)
                    buf.append(rows_text[i + 1])
                    i += 2
                    continue
                if ch == "'":
                    i += 1
                    break
                buf.append(ch)
                i += 1
            decoded = "".join(buf).replace("\\'", "'")
            out.append(json.dumps(decoded))
            continue
        if c == '"':
            out.append(c)
            i += 1
            while i < n:
                ch = rows_text[i]
                out.append(ch)
                i += 1
                if ch == "\\" and i < n:
                    out.append(rows_text[i])
                    i += 1
                    continue
                if ch == '"':
                    break
            continue
        out.append(c)
        i += 1
    s = "".join(out)
    # Pass 2: bare keys → quoted keys.
    s = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)", r'\1"\2"\3', s)
    # Wrap with [...] BEFORE stripping trailing commas, so a final dangling
    # `,` (common in legacy JSX rows) is now preceded by `]`.
    wrapped = f"[{s}]"
    # Pass 3: trailing commas before `}` or `]`.
    wrapped = re.sub(r",(\s*[}\]])", r"\1", wrapped)
    data = json.loads(wrapped)
    rows: list[MajorRow] = []
    for entry in data:
        # Drop unknown keys (e.g. legacy `faculty=` JSX prop is no longer a row field).
        clean = {k: v for k, v in entry.items() if k in MajorRow.model_fields}
        rows.append(MajorRow.model_validate(clean))
    return rows


# ---------------------------------------------------------------------------
# Markdown token walk
# ---------------------------------------------------------------------------


@dataclass
class _Walked:
    page_h1: str | None
    h2_names: list[str]
    sections: dict[str, list[Block]]
    """H2 name (verbatim) → blocks"""

    faculty_groups: list[FacultyGroup]
    """Universities-only: H3 + <MajorsTable> tied together."""

    intro_blocks_before_first_h3: list[Block]
    """Blocks under H2 'Faculty' that precede the first H3 (university intro)."""


def _walk(tokens: list[Token], jsx_rows_by_marker: dict[str, list[MajorRow]]) -> _Walked:
    out = _Walked(
        page_h1=None,
        h2_names=[],
        sections={},
        faculty_groups=[],
        intro_blocks_before_first_h3=[],
    )

    i = 0
    n = len(tokens)
    current_section: str | None = None
    current_blocks: list[Block] = []
    # Buffer for content that appears BEFORE the first H2 — typically a
    # page-level callout like `<div className="alert-danger">…</div>`. We
    # prepend it to the first H2 section's blocks so it survives the round
    # trip (the docx schema has no "between H1 and first H1-section" slot).
    preamble: list[Block] = []

    # State for the Faculty H2 sub-walk.
    in_faculty: bool = False
    seen_first_h3_in_faculty: bool = False
    pending_faculty_heading: tuple[str, str | None, str | None] | None = None

    def commit_section() -> None:
        if current_section is not None:
            out.sections[current_section] = list(current_blocks)

    while i < n:
        t = tokens[i]
        if t.type == "heading_open" and t.tag == "h1":
            text, end = _consume_inline_text(tokens, i + 1)
            out.page_h1 = text.strip()
            i = end + 1  # skip heading_close
            continue
        if t.type == "heading_open" and t.tag == "h2":
            commit_section()
            text, end = _consume_inline_text(tokens, i + 1)
            current_section = text.strip()
            current_blocks = []
            # If we've buffered any preamble content (between H1 and this
            # first H2), prepend it to this section. After this it's owned
            # by the section and shouldn't be flushed again.
            if preamble:
                current_blocks.extend(preamble)
                preamble = []
            # Match the Faculty section by canonical name OR any Arabic alias
            # (e.g. `الكلية (Faculty)`).
            norm = _normalize(current_section)
            in_faculty = (
                norm.startswith(_normalize("Faculty"))
                or any(_normalize(a) and _normalize(a) in norm for a in _SECTION_ALIASES.get("Faculty", []))
            )
            seen_first_h3_in_faculty = False
            pending_faculty_heading = None
            out.h2_names.append(current_section)
            i = end + 1
            continue
        if t.type == "heading_open" and t.tag == "h3" and in_faculty:
            text_runs, end = _consume_inline_runs(tokens, i + 1)
            heading, abbr, url = _split_faculty_heading_runs(text_runs)
            pending_faculty_heading = (heading, abbr, url)
            seen_first_h3_in_faculty = True
            # Stash the intro blocks accumulated before this H3.
            if not out.intro_blocks_before_first_h3:
                out.intro_blocks_before_first_h3 = list(current_blocks)
                current_blocks = []
            i = end + 1
            continue
        if t.type == "html_block" or t.type == "paragraph_open":
            # `paragraph_open` may wrap a placeholder marker token alone.
            block, end = _read_block(tokens, i)
            i = end + 1
            if block is None:
                continue
            # Marker?
            if isinstance(block, _MarkerBlock):
                marker = block.marker
                if pending_faculty_heading is not None and marker in jsx_rows_by_marker:
                    heading, abbr, url = pending_faculty_heading
                    out.faculty_groups.append(
                        FacultyGroup(
                            heading=heading,
                            abbr=abbr,
                            url=url,
                            rows=jsx_rows_by_marker[marker],
                        )
                    )
                    pending_faculty_heading = None
                continue
            target = current_blocks if current_section is not None else preamble
            target.append(block)
            continue
        # Other block tokens (heading 4+, blockquote, list, table, fence)
        if t.type in ("heading_open", "blockquote_open", "bullet_list_open", "ordered_list_open", "table_open", "fence", "code_block"):
            block, end = _read_block(tokens, i)
            i = end + 1
            if block is None:
                continue
            target = current_blocks if current_section is not None else preamble
            target.append(block)
            continue
        i += 1

    commit_section()
    return out


# Internal "block" used to thread MajorsTable placeholders through the walk.
@dataclass
class _MarkerBlock:
    marker: str


def _consume_inline_text(tokens: list[Token], start: int) -> tuple[str, int]:
    """From `inline` after a heading_open, return (plain text, index of heading_close)."""
    i = start
    while i < len(tokens) and tokens[i].type != "heading_close":
        if tokens[i].type == "inline":
            return _flat_inline_text(tokens[i]), i + 1
        i += 1
    return "", i


def _consume_inline_runs(tokens: list[Token], start: int) -> tuple[list[Run], int]:
    i = start
    while i < len(tokens) and tokens[i].type != "heading_close":
        if tokens[i].type == "inline":
            return _inline_to_runs(tokens[i]), i + 1
        i += 1
    return [], i


def _flat_inline_text(token: Token) -> str:
    parts: list[str] = []
    for c in token.children or []:
        if c.type == "text":
            parts.append(c.content)
        elif c.type == "code_inline":
            parts.append(c.content)
        elif c.type in ("link_open", "link_close"):
            continue  # render the link's text but ignore the wrapping
        elif c.type == "softbreak" or c.type == "hardbreak":
            parts.append(" ")
    return "".join(parts).strip()


def _inline_to_runs(token: Token) -> list[Run]:
    runs: list[Run] = []
    bold_depth = 0
    italic_depth = 0
    link_url: str | None = None
    link_text_buffer: list[str] = []
    for c in token.children or []:
        if c.type == "strong_open":
            bold_depth += 1
        elif c.type == "strong_close":
            bold_depth = max(0, bold_depth - 1)
        elif c.type == "em_open":
            italic_depth += 1
        elif c.type == "em_close":
            italic_depth = max(0, italic_depth - 1)
        elif c.type == "link_open":
            link_url = c.attrs.get("href", "") if c.attrs else ""
            link_text_buffer = []
        elif c.type == "link_close":
            text = "".join(link_text_buffer)
            if link_url is not None and text:
                runs.append(LinkRun(text=text, url=link_url, bold=bool(bold_depth), italic=bool(italic_depth)))
            link_url = None
            link_text_buffer = []
        elif c.type == "text":
            if link_url is not None:
                link_text_buffer.append(c.content)
            else:
                runs.append(TextRun(text=c.content, bold=bool(bold_depth), italic=bool(italic_depth)))
        elif c.type == "code_inline":
            if link_url is not None:
                link_text_buffer.append(c.content)
            else:
                runs.append(TextRun(text=c.content, code=True))
        elif c.type == "softbreak":
            if link_url is not None:
                link_text_buffer.append(" ")
            else:
                runs.append(TextRun(text=" "))
        elif c.type == "hardbreak":
            if link_url is not None:
                link_text_buffer.append("\n")
            else:
                runs.append(TextRun(text="\n"))
    return _coalesce_runs(runs)


def _coalesce_runs(runs: list[Run]) -> list[Run]:
    out: list[Run] = []
    for r in runs:
        if (
            isinstance(r, TextRun)
            and out
            and isinstance(out[-1], TextRun)
            and out[-1].bold == r.bold
            and out[-1].italic == r.italic
            and out[-1].code == r.code
        ):
            merged = TextRun(text=out[-1].text + r.text, bold=r.bold, italic=r.italic, code=r.code)
            out[-1] = merged
        else:
            out.append(r)
    return out


def _read_block(tokens: list[Token], i: int) -> tuple[Block | _MarkerBlock | None, int]:
    """Read one block-level structure starting at tokens[i]. Returns (block, last_index)."""
    t = tokens[i]
    if t.type == "html_block":
        marker = _detect_marker(t.content)
        if marker:
            return _MarkerBlock(marker=marker), i
        # Real HTML/JSX block (e.g. `<div className="alert-warning">`) —
        # preserve verbatim. The `.strip()` removes any trailing newline
        # that markdown-it emits with html_block content.
        return RawHtml(content=t.content.strip()), i
    if t.type == "paragraph_open":
        # Look at the inline child to detect a marker-only paragraph.
        if i + 1 < len(tokens) and tokens[i + 1].type == "inline":
            inline_content = tokens[i + 1].content.strip()
            marker = _detect_marker(inline_content)
            if marker:
                # Skip until paragraph_close.
                j = i + 1
                while j < len(tokens) and tokens[j].type != "paragraph_close":
                    j += 1
                return _MarkerBlock(marker=marker), j
            runs = _inline_to_runs(tokens[i + 1])
            j = i + 2
            while j < len(tokens) and tokens[j].type != "paragraph_close":
                j += 1
            if not runs:
                return None, j
            return Paragraph(runs=runs), j
        return None, i
    if t.type == "heading_open":
        # MDX H1 is the page title (handled at top of _walk), MDX H2 is the
        # section title. Inside a section, MDX H3 is the first sub-heading;
        # we store it as IR depth=2 so it matches the convention used by the
        # forward parser (where docx Heading 2 → IR depth=2). Symmetry across
        # parsers keeps the round-trip a no-op for heading depth.
        depth = max(1, int(t.tag[1:]) - 1)
        runs, end = _consume_inline_runs(tokens, i + 1)
        return Heading(depth=depth, runs=runs), end
    if t.type == "blockquote_open":
        return _read_blockquote(tokens, i)
    if t.type == "bullet_list_open":
        return _read_list(tokens, i, ordered=False)
    if t.type == "ordered_list_open":
        return _read_list(tokens, i, ordered=True)
    if t.type == "table_open":
        return _read_table(tokens, i)
    if t.type in ("fence", "code_block"):
        lang = (t.info or "").strip() or None
        return Code(value=t.content.rstrip("\n"), lang=lang), i
    return None, i


_MARKER_INLINE_RE = re.compile(rf"^{re.escape(_MARKER_PREFIX)}\d+%%$")


def _detect_marker(s: str) -> str | None:
    s = s.strip()
    if _MARKER_INLINE_RE.match(s):
        return s
    return None


def _read_blockquote(tokens: list[Token], i: int) -> tuple[Blockquote, int]:
    j = i + 1
    paras: list[Paragraph] = []
    while j < len(tokens) and tokens[j].type != "blockquote_close":
        if tokens[j].type == "paragraph_open":
            if j + 1 < len(tokens) and tokens[j + 1].type == "inline":
                runs = _inline_to_runs(tokens[j + 1])
                if runs:
                    paras.append(Paragraph(runs=runs))
            # advance to paragraph_close
            while j < len(tokens) and tokens[j].type != "paragraph_close":
                j += 1
        j += 1
    return Blockquote(paragraphs=paras), j


def _read_list(tokens: list[Token], i: int, *, ordered: bool) -> tuple[List_, int]:
    close_tag = "ordered_list_close" if ordered else "bullet_list_close"
    items: list[ListItem] = []
    j = i + 1
    while j < len(tokens) and tokens[j].type != close_tag:
        if tokens[j].type == "list_item_open":
            # Collect the first paragraph's runs as the item content.
            k = j + 1
            runs: list[Run] = []
            while k < len(tokens) and tokens[k].type != "list_item_close":
                if tokens[k].type == "paragraph_open":
                    if k + 1 < len(tokens) and tokens[k + 1].type == "inline":
                        runs = _inline_to_runs(tokens[k + 1])
                    while k < len(tokens) and tokens[k].type != "paragraph_close":
                        k += 1
                    break
                k += 1
            items.append(ListItem(runs=runs))
            # advance to list_item_close
            while j < len(tokens) and tokens[j].type != "list_item_close":
                j += 1
        j += 1
    return List_(ordered=ordered, items=items), j


def _read_table(tokens: list[Token], i: int) -> tuple[Table, int]:
    rows: list[TableRow] = []
    j = i + 1
    while j < len(tokens) and tokens[j].type != "table_close":
        if tokens[j].type == "tr_open":
            cells: list[TableCell] = []
            k = j + 1
            while k < len(tokens) and tokens[k].type != "tr_close":
                if tokens[k].type in ("th_open", "td_open"):
                    if k + 1 < len(tokens) and tokens[k + 1].type == "inline":
                        runs = _inline_to_runs(tokens[k + 1])
                    else:
                        runs = []
                    cells.append(TableCell(runs=runs))
                    while k < len(tokens) and tokens[k].type not in ("th_close", "td_close"):
                        k += 1
                k += 1
            rows.append(TableRow(cells=cells))
            j = k
        j += 1
    return Table(rows=rows), j


# ---------------------------------------------------------------------------
# Faculty heading helpers
# ---------------------------------------------------------------------------


def _split_faculty_heading_runs(runs: list[Run]) -> tuple[str, str | None, str | None]:
    """Recover (heading, abbr, url) from H3 runs like `Eng ([ENG](https://x))`.

    The first link in the runs is the abbr+url; preceding text is the heading.
    """
    leading: list[str] = []
    abbr: str | None = None
    url: str | None = None
    for r in runs:
        if isinstance(r, LinkRun) and abbr is None:
            abbr = r.text
            url = r.url
            break
        if isinstance(r, TextRun):
            leading.append(r.text)
    heading_text = "".join(leading).rstrip()
    # Strip a trailing " (" if present.
    heading_text = re.sub(r"\s*\(\s*$", "", heading_text).strip()
    if abbr is None:
        # No link → use full text.
        full = "".join(r.text for r in runs if isinstance(r, (TextRun, LinkRun)))
        return full.strip(), None, None
    return heading_text, abbr, url


# ---------------------------------------------------------------------------
# IR builders
# ---------------------------------------------------------------------------


_TUITION_YEAR_RE = re.compile(r"\((AY\s+[^)]+)\)", re.IGNORECASE)


# Arabic aliases for canonical English section names. These let the parser
# pick up Arabic-authored MDX where the H2 is e.g. `## الكلية (Faculty)`.
_SECTION_ALIASES: dict[str, list[str]] = {
    "Faculty": ["الكلية"],
    "Application": ["التقديم"],
    "Tuition": ["الأقساط"],
    "Scholarships": ["المنح"],
    "Requirements": ["المتطلبات"],
    "Contacts": ["جهات الاتصال", "جهات اتصال"],
    "Overview": ["نظرة عامة"],
    "Grade": ["الدرجة", "متطلبات"],
    "Supported": ["الجامعات المدعومة", "الجامعات"],
    "Benefits": ["المنافع", "الفوائد"],
}


def _find_section(walked: _Walked, name: str) -> tuple[str, list[Block]] | None:
    """Match wanted name against section headings, with alias + substring tolerance.

    Match passes:
    1. Prefix match on canonical name or any alias.
    2. Substring match (e.g. `الأقساط (Tuition — AY 2025-2026)` contains `tuition`).
    """
    candidates = [name, *_SECTION_ALIASES.get(name, [])]
    norms = [n for n in (_normalize(c) for c in candidates) if n]
    # Pass 1: prefix match.
    for wanted in norms:
        for heading in walked.h2_names:
            if _normalize(heading).startswith(wanted):
                return heading, walked.sections.get(heading, [])
    # Pass 2: substring (handles Arabic headings with English in parens).
    for wanted in norms:
        for heading in walked.h2_names:
            if wanted in _normalize(heading):
                return heading, walked.sections.get(heading, [])
    return None


def _normalize(s: str) -> str:
    """Lowercase + drop everything that isn't a Unicode letter or digit."""
    return re.sub(r"[^\p{L}\p{N}]", "", s).lower() if False else re.sub(
        r"[^\w]", "", s, flags=re.UNICODE
    ).lower()


def _build_university(file: MdxFile, meta: Metadata, walked: _Walked) -> UniversityIR | None:
    application = _find_section(walked, "Application")
    tuition = _find_section(walked, "Tuition")
    scholarships = _find_section(walked, "Scholarships")
    requirements = _find_section(walked, "Requirements")
    contacts = _find_section(walked, "Contacts")
    if not (application and tuition and scholarships and requirements and contacts):
        logger.error("[{}] missing one or more required H2 sections", file.path)
        return None
    tuition_key, tuition_blocks = tuition
    year_label = ""
    m = _TUITION_YEAR_RE.search(tuition_key)
    if m:
        year_label = m.group(1).strip()

    return UniversityIR(
        slug=file.slug,
        locale=file.locale,
        meta=meta,
        introduction=walked.intro_blocks_before_first_h3,
        application=application[1],
        tuition_year_label=year_label,
        tuition=tuition_blocks,
        scholarships=scholarships[1],
        requirements=requirements[1],
        contacts=contacts[1],
        majors=walked.faculty_groups,
        source_info_id=str(file.path),
        source_majors_id=str(file.path),
    )


def _build_scholarship(file: MdxFile, meta: Metadata, walked: _Walked) -> ScholarshipIR | None:
    """Scholarships use the generic ordered-section model — accept any H2s."""
    sections = [
        ScholarshipSection(heading=h, blocks=walked.sections.get(h, []))
        for h in walked.h2_names
    ]
    if not sections:
        logger.error("[{}] scholarship has no H2 sections", file.path)
        return None
    return ScholarshipIR(
        slug=file.slug,
        locale=file.locale,
        meta=meta,
        sections=sections,
        source_info_id=str(file.path),
    )
