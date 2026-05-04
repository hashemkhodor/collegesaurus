"""ScholarshipIR → MDX string + locale-aware output path resolution.

Page structure:
    ---<frontmatter>---
    # {page_h1 or title}
    ## {ir.sections[0].heading}
    ## {ir.sections[1].heading}
    ...

Scholarships use a generic ordered-section model (unlike universities,
which have a strict canonical schema). Whatever H2 sections the docx has
appear here in order — `Overview`/`Grade & background requirements`/etc.
for the standard scholarships, or program-card sections for amideast.
"""

from __future__ import annotations

import re

from drive_sync.emit.format import emit_blocks, emit_frontmatter
from drive_sync.models import ScholarshipIR


def emit_scholarship(ir: ScholarshipIR) -> str:
    parts: list[str] = []

    parts.append(emit_frontmatter(ir.meta))
    parts.append("")
    page_h1 = ir.meta.page_h1 or ir.meta.title
    parts.append(f"# {page_h1}")
    parts.append("")

    for section in ir.sections:
        parts.append(f"## {section.heading}")
        parts.append("")
        body = emit_blocks(section.blocks, depth_offset=1)
        if body:
            parts.append(body)
            parts.append("")

    out = "\n".join(parts)
    out = re.sub(r"\n{3,}", "\n\n", out).rstrip() + "\n"
    return out


def scholarship_output_path(ir: ScholarshipIR) -> str:
    """Repo-relative path where the emitted MDX should be written."""
    if ir.locale == "ar":
        return f"i18n/ar/docusaurus-plugin-content-docs-scholarships/current/{ir.slug}.mdx"
    return f"scholarships/{ir.slug}.mdx"
