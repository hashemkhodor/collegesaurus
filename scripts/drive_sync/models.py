"""IR (Intermediate Representation) types — pydantic v2 models.

The parser stages emit these; the emitter stages consume them. They are the
sole contract between parse/* and emit/*. See design.md §3.5.

Block types form a discriminated union via `kind`. We model them as
explicit classes (not dataclass with type=str) so pydantic produces
validation errors that point at the precise field.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


# ---------------------------------------------------------------------------
# Inline runs (used inside a paragraph or table cell)
# ---------------------------------------------------------------------------


class TextRun(BaseModel):
    """A run of text inside a paragraph, with optional formatting."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal["text"] = "text"
    text: str
    bold: bool = False
    italic: bool = False
    code: bool = False


class LinkRun(BaseModel):
    """A hyperlink with its visible text and target URL."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal["link"] = "link"
    text: str
    url: str
    bold: bool = False
    italic: bool = False


Run = Annotated[Union[TextRun, LinkRun], Field(discriminator="kind")]


# ---------------------------------------------------------------------------
# Block-level content (paragraphs, tables, lists, etc.)
# ---------------------------------------------------------------------------


class Paragraph(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["paragraph"] = "paragraph"
    runs: list[Run]


class Heading(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["heading"] = "heading"
    depth: int  # 1-6, but the emitter typically demotes by 1 (so docx H1 → MDX H2)
    runs: list[Run]


class TableCell(BaseModel):
    model_config = ConfigDict(extra="forbid")

    runs: list[Run]


class TableRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cells: list[TableCell]


class Table(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["table"] = "table"
    rows: list[TableRow]  # first row is the header, by GFM convention


class ListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    runs: list[Run]
    # Future: nested children (sub-lists). Not in v1.


class List_(BaseModel):  # `List` shadows typing.List; rename
    model_config = ConfigDict(extra="forbid")

    kind: Literal["list"] = "list"
    ordered: bool
    items: list[ListItem]


class Blockquote(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["blockquote"] = "blockquote"
    paragraphs: list[Paragraph]


class Code(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["code"] = "code"
    value: str
    lang: str | None = None


class RawHtml(BaseModel):
    """A block of raw HTML / JSX passed through the MDX pipeline verbatim.

    Used for things like `<div className="alert-warning">…</div>` callouts —
    the editor types the literal markup in the docx, the pipeline keeps it
    as-is (no MDX escaping), and Docusaurus renders it as JSX.
    """

    model_config = ConfigDict(extra="forbid")

    kind: Literal["raw_html"] = "raw_html"
    content: str


Block = Annotated[
    Union[Paragraph, Heading, Table, List_, Blockquote, Code, RawHtml],
    Field(discriminator="kind"),
]


# ---------------------------------------------------------------------------
# Frontmatter / Metadata
# ---------------------------------------------------------------------------


class Metadata(BaseModel):
    """The page metadata extracted from the `# Metadata` table at the top of every info.docx."""

    model_config = ConfigDict(extra="forbid")

    title: str
    sidebar_label: str
    sidebar_position: int
    apply_url: HttpUrl | None = None
    page_h1: str | None = None
    """Optional rich page H1; falls back to `title` when emitting."""

    @field_validator("apply_url")
    @classmethod
    def _https_only(cls, v: HttpUrl | None) -> HttpUrl | None:
        # Mitigates T-R.2 — only https:// URLs survive.
        if v is None:
            return None
        if v.scheme != "https":
            raise ValueError("apply_url must use https://")
        return v

    @field_validator("title", "sidebar_label")
    @classmethod
    def _nonempty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v

    @field_validator("sidebar_position")
    @classmethod
    def _nonneg(cls, v: int) -> int:
        if v < 0:
            raise ValueError("must be >= 0")
        return v


# ---------------------------------------------------------------------------
# Major rows + faculty groups (universities only)
# ---------------------------------------------------------------------------


class MajorRow(BaseModel):
    """A single row in `<MajorsTable rows={[...]}>`. Mirrors the React component's prop shape."""

    model_config = ConfigDict(extra="forbid")

    program: str
    degree: str | None = None
    department: str | None = None
    credits: int | None = None
    years: int | None = None
    language: str | None = None
    source: HttpUrl | None = None


class FacultyGroup(BaseModel):
    """One faculty's worth of major rows, plus the heading text + optional link."""

    model_config = ConfigDict(extra="forbid")

    heading: str  # e.g. "Maroun Semaan Faculty of Engineering & Architecture"
    abbr: str | None = None  # e.g. "MSFEA"
    url: HttpUrl | None = None  # faculty page URL
    rows: list[MajorRow]


# ---------------------------------------------------------------------------
# Page-level IRs
# ---------------------------------------------------------------------------


Locale = Literal["en", "ar"]


class UniversityIR(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["university"] = "university"
    slug: str
    locale: Locale
    meta: Metadata
    introduction: list[Block]
    application: list[Block]
    tuition_year_label: str  # e.g. "AY 2025-2026"; "" when not present
    tuition: list[Block]
    scholarships: list[Block]
    requirements: list[Block]
    contacts: list[Block]
    majors: list[FacultyGroup]
    source_info_id: str  # Drive file ID of info.docx (or local path in mirror mode)
    source_majors_id: str


class ScholarshipSection(BaseModel):
    """One H2-level section of a scholarship page.

    Scholarships use a generic ordered-section model rather than fixed fields
    (unlike `UniversityIR`, which has a strict canonical schema). This lets
    a scholarship like amideast — whose H2s are program cards (`YES Program`,
    `MENA`, `Hope Fund`, ...) rather than the canonical six — be managed by
    the same pipeline. Editors can add or rename sections in Drive without
    breaking the build.
    """

    model_config = ConfigDict(extra="forbid")

    heading: str
    """The H2 text as authored, verbatim (e.g. `Overview` or `YES Program`)."""

    blocks: list[Block]


class ScholarshipIR(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["scholarship"] = "scholarship"
    slug: str
    locale: Locale
    meta: Metadata
    sections: list[ScholarshipSection]
    source_info_id: str


PageIR = Annotated[
    Union[UniversityIR, ScholarshipIR],
    Field(discriminator="kind"),
]


# ---------------------------------------------------------------------------
# Slug validation (used by fetch.py)
# ---------------------------------------------------------------------------

import re

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")


def is_valid_slug(s: str) -> bool:
    """Lowercase ASCII letters/digits/hyphens; no leading or trailing hyphen."""
    return bool(SLUG_RE.fullmatch(s))
