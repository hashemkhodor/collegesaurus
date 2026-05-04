"""parse/docx.py tests against committed fixtures."""

from drive_sync.models import (
    Blockquote,
    Heading,
    LinkRun,
    List_,
    Paragraph,
    Table,
    TextRun,
)
from drive_sync.parse.docx import (
    ParseDocxOptions,
    find_section,
    parse_docx,
    validate_metadata,
)
from drive_sync.report import ParseReport


# ---------------------------------------------------------------------------
# AUB (university)
# ---------------------------------------------------------------------------


def test_parse_aub_info_docx(aub_paths) -> None:
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None, [e.message for e in report.entries]
    assert not report.has_errors()

    # Metadata recovered.
    assert parsed.metadata_raw["title"].startswith("AUB")
    assert parsed.metadata_raw["sidebar_label"] == "AUB"
    assert parsed.metadata_raw["sidebar_position"] == "1"
    assert parsed.metadata_raw["apply_url"].startswith("https://")
    assert "page_h1" in parsed.metadata_raw

    # All six content sections present.
    expected_sections = {"Introduction", "Application", "Tuition", "Scholarships", "Requirements", "Contacts"}
    found = set()
    for s in parsed.section_order:
        for e in expected_sections:
            if s.startswith(e):
                found.add(e)
    assert found == expected_sections, f"missing sections: {expected_sections - found}"


def test_parse_aub_metadata_validates(aub_paths) -> None:
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None
    meta = validate_metadata(parsed.metadata_raw, "universities/aub/info.docx", report)
    assert meta is not None
    assert meta.title.startswith("AUB")
    assert meta.sidebar_position == 1
    assert str(meta.apply_url) == "https://join.aub.edu.lb/apply/"


def test_find_section_handles_year_label(aub_paths) -> None:
    """`Tuition` should match `Tuition (AY 2025-2026)` via prefix-normalize."""
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None
    found = find_section(parsed, "Tuition")
    assert found is not None
    key, _blocks = found
    assert key.startswith("Tuition")


def test_aub_introduction_contains_paragraph(aub_paths) -> None:
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None
    found = find_section(parsed, "Introduction")
    assert found is not None
    _key, blocks = found
    paragraphs = [b for b in blocks if isinstance(b, Paragraph)]
    assert paragraphs, "Introduction should contain at least one paragraph"
    text = " ".join(_runs_text(p.runs) for p in paragraphs)
    assert "AUB offers" in text or "American University" in text


def test_aub_application_has_table_with_real_header(aub_paths) -> None:
    """The first row of an Application table must NOT be empty."""
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None
    found = find_section(parsed, "Application")
    assert found is not None
    _key, blocks = found
    tables = [b for b in blocks if isinstance(b, Table)]
    assert tables, "Application should contain at least one table"
    header = tables[0].rows[0]
    header_text = " ".join(_runs_text(c.runs).strip() for c in header.cells)
    assert header_text.strip() != "", f"first row appears empty: {header!r}"


def test_aub_introduction_has_hyperlinks(aub_paths) -> None:
    """Reference: link in AUB Introduction must round-trip as a LinkRun."""
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None
    found = find_section(parsed, "Introduction")
    assert found is not None
    _key, blocks = found
    has_link = any(
        any(isinstance(r, LinkRun) for r in p.runs)
        for p in blocks
        if isinstance(p, Paragraph)
    )
    assert has_link, "expected at least one hyperlink in AUB Introduction body"


# ---------------------------------------------------------------------------
# Metadata validation edges
# ---------------------------------------------------------------------------


def test_metadata_validation_rejects_http_apply_url() -> None:
    report = ParseReport()
    raw = {
        "title": "X",
        "sidebar_label": "X",
        "sidebar_position": "1",
        "apply_url": "http://insecure.example.com/",
    }
    meta = validate_metadata(raw, "x.docx", report)
    assert meta is None
    assert report.has_errors()


# ---------------------------------------------------------------------------
# LIFE (scholarship) — covers blockquote + ordered-list parsing
# ---------------------------------------------------------------------------


def test_parse_life_scholarship(life_paths) -> None:
    report = ParseReport()
    parsed = parse_docx(
        str(life_paths["info_en"]),
        ParseDocxOptions(file_label="scholarships/life/info.docx"),
        report,
    )
    assert parsed is not None, [e.message for e in report.entries]
    expected = {"Overview", "Grade", "Application", "Supported", "Benefits", "Contacts"}
    found = set()
    for s in parsed.section_order:
        for e in expected:
            if e.lower() in s.lower():
                found.add(e)
    assert found == expected, f"missing scholarship sections: {expected - found}"


def test_blockquote_recognized_in_life(life_paths) -> None:
    """LIFE has a `> Note: ...` blockquote in 'Supported universities'."""
    report = ParseReport()
    parsed = parse_docx(
        str(life_paths["info_en"]),
        ParseDocxOptions(file_label="scholarships/life/info.docx"),
        report,
    )
    assert parsed is not None
    found = find_section(parsed, "Supported universities")
    assert found is not None
    _key, blocks = found
    has_blockquote = any(isinstance(b, Blockquote) for b in blocks)
    assert has_blockquote, "LIFE Supported universities should contain a Quote-styled blockquote"


def test_ordered_list_recognized_in_life(life_paths) -> None:
    """LIFE 'Application window' has a numbered application-process list."""
    report = ParseReport()
    parsed = parse_docx(
        str(life_paths["info_en"]),
        ParseDocxOptions(file_label="scholarships/life/info.docx"),
        report,
    )
    assert parsed is not None
    found = find_section(parsed, "Application window")
    assert found is not None
    _key, blocks = found
    lists = [b for b in blocks if isinstance(b, List_)]
    assert lists, "LIFE Application window should contain at least one list"
    assert any(l.ordered for l in lists), "LIFE has a numbered application-process list"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _runs_text(runs) -> str:
    parts = []
    for r in runs:
        if isinstance(r, (TextRun, LinkRun)):
            parts.append(r.text)
    return "".join(parts)
