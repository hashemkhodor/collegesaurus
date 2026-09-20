"""Assembles parsed docx + xlsx into UniversityIR / ScholarshipIR.

Every H1 in the document becomes a section, in document order. The section
registry (`mapping.toml`) decides which sections get a localized label and
where the majors tables go; a heading it does not recognize is kept anyway,
under its own text. Adding a section to a .docx must not require a code change.

Sections a page is normally expected to have are a *lint expectation*, reported
as warnings, not a parse failure.
"""

from __future__ import annotations

from dataclasses import dataclass

from drive_sync.mapping import expected_section_keys, load_mapping
from drive_sync.models import (
    FacultyGroup,
    Locale,
    ScholarshipIR,
    Section,
    UniversityIR,
)
from drive_sync.parse.docx import ParsedDocx, validate_metadata
from drive_sync.report import ParseReport


@dataclass
class AssembleContext:
    slug: str
    locale: Locale
    file_label: str
    web_view_link: str | None = None
    source_info_id: str = ""
    source_majors_id: str = ""
    year: str = ""


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

    sections = _sections(parsed, "university", ctx, report)
    if not sections:
        report.error(
            ctx.file_label,
            "no H1 content sections found",
            web_view_link=ctx.web_view_link,
        )
        return None

    return UniversityIR(
        slug=ctx.slug,
        locale=ctx.locale,
        year=ctx.year,
        meta=meta,
        sections=sections,
        majors=majors,
        source_info_id=ctx.source_info_id,
        source_majors_id=ctx.source_majors_id,
    )


def assemble_scholarship(
    parsed: ParsedDocx,
    ctx: AssembleContext,
    report: ParseReport,
) -> ScholarshipIR | None:
    """Build ScholarshipIR from a parsed info.docx."""
    meta = validate_metadata(parsed.metadata_raw, ctx.file_label, report, ctx.web_view_link)
    if meta is None:
        return None

    sections = _sections(parsed, "scholarship", ctx, report)
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
        year=ctx.year,
        meta=meta,
        sections=sections,
        source_info_id=ctx.source_info_id,
    )


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------


def _sections(
    parsed: ParsedDocx,
    kind: str,
    ctx: AssembleContext,
    report: ParseReport,
) -> list[Section]:
    """Every H1 becomes a section; the registry only supplies the key."""
    mapping = load_mapping()
    sections: list[Section] = []
    for heading in parsed.section_order:
        rule = mapping.section_for(kind, heading)
        sections.append(
            Section(
                heading=heading,
                key=rule.key if rule else None,
                blocks=parsed.sections[heading],
            )
        )
    _warn_missing(sections, kind, ctx, report)
    return sections


def _warn_missing(
    sections: list[Section],
    kind: str,
    ctx: AssembleContext,
    report: ParseReport,
) -> None:
    """Canonical sections are expected, not required.

    Universities are expected to carry all six; scholarships are open-ended by
    design (amideast's H1s are program cards), so nothing is expected of them.
    """
    if kind != "university":
        return
    present = {s.key for s in sections if s.key}
    missing = [k for k in expected_section_keys(kind) if k not in present]
    if missing:
        report.warn(
            ctx.file_label,
            f"missing expected section(s): {', '.join(missing)}",
            web_view_link=ctx.web_view_link,
        )
