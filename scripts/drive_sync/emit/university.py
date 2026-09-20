"""UniversityIR → MDX string.

Page structure:
    ---<frontmatter>---
    [staleness banner, when carried forward from an older year]
        {body, headings demoted by 1}
        <MajorsTable rows={[...]} />

Section labels come from `mapping.toml`, so an Arabic page gets Arabic
headings and a section the registry does not know still renders under its own
heading.
"""

from __future__ import annotations

import re

from drive_sync.emit.format import (
    emit_blocks,
    emit_faculty_heading,
    emit_frontmatter,
    emit_majors_table,
    emit_stale_banner,
)
from drive_sync.mapping import load_mapping
from drive_sync.models import Section, UniversityIR


def emit_university(ir: UniversityIR, stale_from: str | None = None, year: str = "") -> str:
    mapping = load_mapping()
    content_year = stale_from or year or ir.year

    parts: list[str] = []

    parts.append(emit_frontmatter(ir.meta, {"content_year": content_year}))
    parts.append("")
    page_h1 = ir.meta.page_h1 or ir.meta.title
    parts.append(f"# {page_h1}")
    parts.append("")
    if stale_from:
        parts.append(emit_stale_banner(ir.locale, year or ir.year, stale_from))
        parts.append("")

    for section in ir.sections:
        rule = mapping.sections_by_key("university").get(section.key) if section.key else None
        parts.append(f"## {section_label(ir, section, content_year)}")
        parts.append("")
        body = emit_blocks(section.blocks, depth_offset=1)
        if body:
            parts.append(body)
            parts.append("")
        if rule is not None and rule.majors:
            for group in ir.majors:
                parts.append(emit_faculty_heading(group, depth=3))
                parts.append("")
                rendered = emit_majors_table(group)
                if rendered:
                    parts.append(rendered)
                    parts.append("")

    out = "\n".join(parts)
    out = re.sub(r"\n{3,}", "\n\n", out).rstrip() + "\n"
    return out


def section_label(ir: UniversityIR | object, section: Section, year: str = "") -> str:
    """Localized H2 text for a section, with the academic year where wanted."""
    mapping = load_mapping()
    locale = getattr(ir, "locale", "en")
    kind = getattr(ir, "kind", "university")
    rule = mapping.sections_by_key(kind).get(section.key) if section.key else None
    if rule is None:
        return section.heading
    label = rule.label(locale, section.heading)
    effective_year = year or getattr(ir, "year", "")
    if rule.year_suffix and effective_year:
        return f"{label} ({mapping.format_year(locale, effective_year)})"
    return label
