"""Assembles parsed docx + xlsx into UniversityIR / ScholarshipIR.

Given a ParsedDocx (and FacultyGroup[] for universities), this resolves the
expected H1 sections (handling Arabic-aliased headings like
`الكلية (Faculty)` → Faculty) and builds the typed IR object.

Design: spec/001-add-google-drive-backend-data/design.md §3.5, §4.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from drive_sync.models import (
    Block,
    FacultyGroup,
    Locale,
    ScholarshipIR,
    ScholarshipSection,
    UniversityIR,
)
from drive_sync.parse.docx import (
    ParsedDocx,
    find_section,
    validate_metadata,
)
from drive_sync.report import ParseReport


UNIVERSITY_SECTIONS = (
    "Introduction",
    "Application",
    "Tuition",
    "Scholarships",
    "Requirements",
    "Contacts",
)

_TUITION_YEAR_RE = re.compile(r"\((AY\s+[^)]+)\)", re.IGNORECASE)


@dataclass
class AssembleContext:
    slug: str
    locale: Locale
    file_label: str
    web_view_link: str | None = None
    source_info_id: str = ""
    source_majors_id: str = ""


def assemble_university(
    parsed: ParsedDocx,
    majors: list[FacultyGroup],
    ctx: AssembleContext,
    report: ParseReport,
) -> UniversityIR | None:
    """Build UniversityIR from a parsed info.docx + majors.xlsx FacultyGroups."""
    meta = validate_metadata(parsed.metadata_raw, ctx.file_label, report, ctx.web_view_link)
    if meta is None:
        return None

    sections = _require_sections(parsed, list(UNIVERSITY_SECTIONS), ctx, report)
    if sections is None:
        return None

    tuition_key, tuition_blocks = sections["Tuition"]
    year_label = _extract_year_label(tuition_key)

    return UniversityIR(
        slug=ctx.slug,
        locale=ctx.locale,
        meta=meta,
        introduction=sections["Introduction"][1],
        application=sections["Application"][1],
        tuition_year_label=year_label,
        tuition=tuition_blocks,
        scholarships=sections["Scholarships"][1],
        requirements=sections["Requirements"][1],
        contacts=sections["Contacts"][1],
        majors=majors,
        source_info_id=ctx.source_info_id,
        source_majors_id=ctx.source_majors_id,
    )


def assemble_scholarship(
    parsed: ParsedDocx,
    ctx: AssembleContext,
    report: ParseReport,
) -> ScholarshipIR | None:
    """Build ScholarshipIR from a parsed info.docx.

    Scholarships use a generic ordered-section model (see ScholarshipIR docstring),
    so we accept any H2 sections in document order — the pipeline doesn't enforce
    a canonical naming scheme. Editors can rename, add, or remove sections in
    Drive without breaking the build.
    """
    meta = validate_metadata(parsed.metadata_raw, ctx.file_label, report, ctx.web_view_link)
    if meta is None:
        return None

    sections = [
        ScholarshipSection(heading=heading, blocks=parsed.sections[heading])
        for heading in parsed.section_order
    ]
    if not sections:
        report.error(
            ctx.file_label,
            "scholarship has no H1 content sections",
            web_view_link=ctx.web_view_link,
        )
        return None

    return ScholarshipIR(
        slug=ctx.slug,
        locale=ctx.locale,
        meta=meta,
        sections=sections,
        source_info_id=ctx.source_info_id,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _require_sections(
    parsed: ParsedDocx,
    wanted: list[str],
    ctx: AssembleContext,
    report: ParseReport,
) -> dict[str, tuple[str, list[Block]]] | None:
    """Resolve every wanted section name; report missing ones together."""
    out: dict[str, tuple[str, list[Block]]] = {}
    missing: list[str] = []
    for name in wanted:
        found = find_section(parsed, name)
        if found is None:
            missing.append(name)
            continue
        out[name] = found
    if missing:
        report.error(
            ctx.file_label,
            f"missing required H1 section(s): {', '.join(missing)}",
            web_view_link=ctx.web_view_link,
        )
        return None
    return out


def _extract_year_label(tuition_heading: str) -> str:
    m = _TUITION_YEAR_RE.search(tuition_heading)
    return m.group(1).strip() if m else ""
