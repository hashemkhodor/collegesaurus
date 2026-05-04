"""UniversityIR → MDX string + locale-aware output path resolution.

Page structure:
    ---<frontmatter>---
    # {page_h1 or title}
    ## Faculty
        {introduction body, headings demoted by 1}
        ### {facultyHeading}
        <MajorsTable rows={[...]} />
        ... per FacultyGroup
    ## Application
        {body, demoted}
    ## Tuition (AY {yearLabel})
        {body, demoted}
    ## Scholarships
    ## Requirements
    ## Contacts
"""

from __future__ import annotations

from drive_sync.emit.format import (
    emit_blocks,
    emit_faculty_heading,
    emit_frontmatter,
    emit_majors_table,
)
from drive_sync.models import UniversityIR


def emit_university(ir: UniversityIR) -> str:
    parts: list[str] = []

    parts.append(emit_frontmatter(ir.meta))
    parts.append("")
    page_h1 = ir.meta.page_h1 or ir.meta.title
    parts.append(f"# {page_h1}")
    parts.append("")

    # Faculty section.
    parts.append("## Faculty")
    parts.append("")
    intro = emit_blocks(ir.introduction, depth_offset=1)
    if intro:
        parts.append(intro)
        parts.append("")
    for group in ir.majors:
        parts.append(emit_faculty_heading(group, depth=3))
        parts.append("")
        rendered = emit_majors_table(group)
        if rendered:
            parts.append(rendered)
            parts.append("")

    # Application
    _push_section(parts, "Application", emit_blocks(ir.application, depth_offset=1))

    # Tuition (with year label)
    tuition_heading = (
        f"## Tuition ({ir.tuition_year_label})" if ir.tuition_year_label else "## Tuition"
    )
    parts.append(tuition_heading)
    parts.append("")
    body = emit_blocks(ir.tuition, depth_offset=1)
    if body:
        parts.append(body)
        parts.append("")

    _push_section(parts, "Scholarships", emit_blocks(ir.scholarships, depth_offset=1))
    _push_section(parts, "Requirements", emit_blocks(ir.requirements, depth_offset=1))
    _push_section(parts, "Contacts", emit_blocks(ir.contacts, depth_offset=1))

    out = "\n".join(parts)
    # Collapse 3+ blank lines.
    import re
    out = re.sub(r"\n{3,}", "\n\n", out).rstrip() + "\n"
    return out


def _push_section(parts: list[str], heading: str, body: str) -> None:
    parts.append(f"## {heading}")
    parts.append("")
    if body:
        parts.append(body)
        parts.append("")


def university_output_path(ir: UniversityIR) -> str:
    """Repo-relative path where the emitted MDX should be written.

    en  → universities/<slug>.mdx
    ar  → i18n/ar/docusaurus-plugin-content-docs-universities/current/<slug>.mdx
    """
    if ir.locale == "ar":
        return f"i18n/ar/docusaurus-plugin-content-docs-universities/current/{ir.slug}.mdx"
    return f"universities/{ir.slug}.mdx"
