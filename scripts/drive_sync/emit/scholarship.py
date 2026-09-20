"""ScholarshipIR → MDX string.

Scholarships have always used an open ordered-section model: whatever H1s the
docx has appear here in order. The registry supplies localized labels for the
common ones (`Overview`, `Benefits`, ...); program-card sections like
amideast's `YES Program` pass through under their own heading.
"""

from __future__ import annotations

import re

from drive_sync.emit.format import emit_blocks, emit_frontmatter, emit_stale_banner
from drive_sync.emit.university import section_label
from drive_sync.models import ScholarshipIR


def emit_scholarship(ir: ScholarshipIR, stale_from: str | None = None, year: str = "") -> str:
    parts: list[str] = []

    parts.append(emit_frontmatter(ir.meta))
    parts.append("")
    page_h1 = ir.meta.page_h1 or ir.meta.title
    parts.append(f"# {page_h1}")
    parts.append("")
    if stale_from:
        parts.append(emit_stale_banner(ir.locale, year or ir.year, stale_from))
        parts.append("")

    for section in ir.sections:
        parts.append(f"## {section_label(ir, section, year)}")
        parts.append("")
        body = emit_blocks(section.blocks, depth_offset=1)
        if body:
            parts.append(body)
            parts.append("")

    out = "\n".join(parts)
    out = re.sub(r"\n{3,}", "\n\n", out).rstrip() + "\n"
    return out

