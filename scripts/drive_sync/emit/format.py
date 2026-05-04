"""Deterministic emit helpers: frontmatter, MajorsTable JSX, Block → Markdown.

Three concerns:
1. Frontmatter (fixed key order, YAML-formatted; URLs unquoted unless unsafe).
2. <MajorsTable> JSX block (fixed key order; single-quoted, JSON-encoded values).
3. Block.render dispatch (paragraph / heading / table / list / blockquote / code).

Risk mitigations applied here:
- T-R.3: drop runs whose target URL has a non-https/http/mailto scheme.
- T-R.4: every <MajorsTable> cell value goes through `json.dumps`, then re-quoted
  to single quotes for parity with the legacy hand-authored convention.

Design: spec/001-add-google-drive-backend-data/design.md §4.3, §7.
"""

from __future__ import annotations

import json
import re

from drive_sync.models import (
    Block,
    Blockquote,
    Code,
    FacultyGroup,
    Heading,
    LinkRun,
    List_,
    MajorRow,
    Metadata,
    Paragraph,
    RawHtml,
    Run,
    Table,
    TextRun,
)


# ---------------------------------------------------------------------------
# Frontmatter
# ---------------------------------------------------------------------------


_FRONTMATTER_ORDER = ("sidebar_position", "title", "sidebar_label", "apply_url")
"""`page_h1` is intentionally NOT in the frontmatter — it's metadata-only,
consumed by the page H1 emitter (emit_university / emit_scholarship)."""


def emit_frontmatter(meta: Metadata) -> str:
    lines = ["---"]
    data = meta.model_dump(exclude_none=True)
    for key in _FRONTMATTER_ORDER:
        if key not in data:
            continue
        value = data[key]
        lines.append(f"{key}: {_format_yaml_scalar(value)}")
    lines.append("---")
    return "\n".join(lines)


_YAML_RESERVED_LEAD = re.compile(r"^[!&*?|>%@`'\"]")


def _format_yaml_scalar(value: object) -> str:
    """YAML scalar with minimal quoting.

    URLs (`https://...`) are safe unquoted: a `:` followed by `/` doesn't
    create a key/value boundary in YAML's plain-scalar grammar. We only quote
    when really necessary.
    """
    if isinstance(value, (int, float, bool)):
        return str(value)
    s = str(value)
    if "\n" in s or "\r" in s:
        return json.dumps(s)
    if s.strip() != s:
        return json.dumps(s)
    if ": " in s or "\t#" in s or s.endswith(":"):
        return json.dumps(s)
    if _YAML_RESERVED_LEAD.match(s):
        return json.dumps(s)
    return s


# ---------------------------------------------------------------------------
# <MajorsTable> JSX
# ---------------------------------------------------------------------------


_ROW_KEY_ORDER = ("program", "degree", "department", "credits", "years", "language", "source")


def emit_majors_table(group: FacultyGroup) -> str:
    """Serialize a FacultyGroup's rows as a `<MajorsTable rows={[...]}>` block.

    The component declares `faculty` as an unused prop — we don't emit it. The
    per-faculty heading is rendered separately by the university emitter as
    a `### Heading ([Abbr](url))`.
    """
    if not group.rows:
        return ""
    body_lines = "\n".join(f"    {{{_format_row_props(r)}}}," for r in group.rows)
    return f"<MajorsTable\n  rows={{[\n{body_lines}\n  ]}}\n/>"


def _format_row_props(row: MajorRow) -> str:
    parts: list[str] = []
    data = row.model_dump(exclude_none=True)
    for key in _ROW_KEY_ORDER:
        if key not in data:
            continue
        v = data[key]
        if v is None or v == "":
            continue
        # Coerce HttpUrl back to string for serialization.
        v = str(v) if not isinstance(v, (int, float, bool, str)) else v
        parts.append(f"{key}: {_format_jsx_value(v)}")
    return ", ".join(parts)


def _format_jsx_value(v: object) -> str:
    """Single-quoted, JSON-escape-safe value for emission inside JSX."""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v)
    # JSON-encode (handles all escapes) then convert to single-quoted form,
    # escaping any embedded single quotes.
    inner = json.dumps(s)[1:-1].replace('\\"', '"').replace("'", "\\'")
    return f"'{inner}'"


def emit_faculty_heading(group: FacultyGroup, depth: int) -> str:
    """`### Heading ([Abbr](url))` form. Falls back to plain heading."""
    hashes = "#" * depth
    if group.abbr and group.url:
        return f"{hashes} {group.heading} ([{group.abbr}]({group.url}))"
    return f"{hashes} {group.heading}"


# ---------------------------------------------------------------------------
# Block → Markdown
# ---------------------------------------------------------------------------


def emit_blocks(blocks: list[Block], depth_offset: int = 0) -> str:
    """Render a list of blocks to a Markdown string.

    `depth_offset` adds (or, with a positive value, demotes) heading levels.
    The university/scholarship emitters typically pass 1 so docx H2s become
    MDX H3s (the page H1 + per-section H2 are emitted separately).
    """
    parts: list[str] = []
    for block in blocks:
        rendered = _render_block(block, depth_offset)
        if rendered:
            parts.append(rendered)
    out = "\n\n".join(parts)
    return _normalize_blank_lines(out)


_DANGEROUS_URL_SCHEMES = ("javascript:", "data:", "vbscript:")


def _render_block(block: Block, depth_offset: int) -> str:
    if isinstance(block, Paragraph):
        return _render_runs(block.runs)
    if isinstance(block, Heading):
        depth = max(1, min(6, block.depth + depth_offset))
        return f"{'#' * depth} {_render_runs(block.runs)}"
    if isinstance(block, Table):
        return _render_table(block)
    if isinstance(block, List_):
        return _render_list(block)
    if isinstance(block, Blockquote):
        return _render_blockquote(block)
    if isinstance(block, Code):
        fence = "```" + (block.lang or "")
        return f"{fence}\n{block.value}\n```"
    if isinstance(block, RawHtml):
        # Emit the HTML verbatim — no MDX escaping. The editor authored this
        # as literal markup (e.g. `<div className="alert-warning">`).
        return block.content
    return ""


def _render_runs(runs: list[Run]) -> str:
    parts: list[str] = []
    for run in runs:
        parts.append(_render_run(run))
    return "".join(parts)


def _render_run(run: Run) -> str:
    if isinstance(run, TextRun):
        if run.code:
            # Inline code is rendered between backticks; the contents stay
            # literal (no MDX/Markdown interpretation).
            return f"`{run.text}`"
        text = _escape_mdx_text(run.text)
        if run.bold and run.italic:
            return f"***{text}***"
        if run.bold:
            return f"**{text}**"
        if run.italic:
            return f"_{text}_"
        return text
    if isinstance(run, LinkRun):
        url = run.url
        # Drop dangerous schemes (T-R.3).
        if any(url.lower().startswith(scheme) for scheme in _DANGEROUS_URL_SCHEMES):
            return _escape_mdx_text(run.text)
        text = _escape_mdx_text(run.text)
        if run.bold:
            text = f"**{text}**"
        if run.italic:
            text = f"_{text}_"
        return f"[{text}]({url})"
    return ""


def _escape_mdx_text(s: str) -> str:
    """Escape characters that MDX interprets as syntax in prose / table cells.

    MDX treats `<` as the start of a JSX tag and `{` as the start of a JS
    expression. If a docx contains literal text like `<54 credits` or
    `{state}`, the MDX compiler will fail to parse the output. We emit
    Markdown-style backslash escapes (`\\<`, `\\{`, `\\}`) which MDX
    accepts as literal characters.

    We don't escape `>` (only meaningful at line start, where Block-level
    blockquote rendering handles it), `*`, `_`, `[`, `]` (Markdown
    formatting chars; if the source had literal stars it'd live in the
    bold/italic flags, not in TextRun.text).
    """
    return (
        s.replace("\\", "\\\\")
        .replace("<", "\\<")
        .replace("{", "\\{")
        .replace("}", "\\}")
    )


def _render_table(table: Table) -> str:
    if not table.rows:
        return ""
    header = table.rows[0]
    body = table.rows[1:]
    n_cols = max(len(r.cells) for r in table.rows)

    def cells_to_md(row) -> list[str]:
        out = [_render_runs(c.runs) for c in row.cells]
        # Pad short rows so the markdown is well-formed.
        out += [""] * (n_cols - len(out))
        return out

    lines = []
    lines.append("| " + " | ".join(cells_to_md(header)) + " |")
    lines.append("| " + " | ".join(["---"] * n_cols) + " |")
    for row in body:
        lines.append("| " + " | ".join(cells_to_md(row)) + " |")
    return "\n".join(lines)


def _render_list(list_block: List_) -> str:
    lines: list[str] = []
    for i, item in enumerate(list_block.items, start=1):
        marker = f"{i}." if list_block.ordered else "-"
        lines.append(f"{marker} {_render_runs(item.runs)}")
    return "\n".join(lines)


def _render_blockquote(bq: Blockquote) -> str:
    lines: list[str] = []
    for p in bq.paragraphs:
        text = _render_runs(p.runs)
        for line in text.split("\n"):
            lines.append(f"> {line}")
    return "\n".join(lines)


def _normalize_blank_lines(text: str) -> str:
    """Collapse 3+ consecutive newlines into exactly 2."""
    return re.sub(r"\n{3,}", "\n\n", text)
