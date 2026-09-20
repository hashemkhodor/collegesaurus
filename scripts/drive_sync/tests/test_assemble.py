"""parse/assemble.py tests against committed fixtures."""

from drive_sync.parse.assemble import (
    AssembleContext,
    assemble_scholarship,
    assemble_university,
)
from drive_sync.parse.docx import ParseDocxOptions, parse_docx
from drive_sync.parse.xlsx import ParseXlsxOptions, parse_xlsx
from drive_sync.report import ParseReport


def test_assemble_aub_university(aub_paths) -> None:
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None
    majors = parse_xlsx(
        str(aub_paths["majors_en"]),
        ParseXlsxOptions(file_label="universities/aub/majors.xlsx"),
        report,
    )
    assert majors is not None

    ctx = AssembleContext(
        slug="aub",
        locale="en",
        file_label="universities/aub/info.docx",
        source_info_id="local:info.docx",
        source_majors_id="local:majors.xlsx",
    )
    ir = assemble_university(parsed, majors, ctx, report)
    assert ir is not None, [e.message for e in report.entries]
    assert ir.slug == "aub"
    assert ir.locale == "en"
    assert ir.meta.title.startswith("AUB")
    assert ir.meta.page_h1 is not None
    assert len(ir.majors) == 6
    # Every H1 becomes a section, in document order, with the registry key
    # attached where it matched.
    assert [s.key for s in ir.sections] == [
        "faculty", "application", "tuition", "scholarships", "requirements", "contacts",
    ]
    assert all(s.blocks for s in ir.sections)


def test_assemble_aub_arabic_university(aub_paths) -> None:
    """Arabic AUB has the same canonical English H1s in the docx (Drive convention)."""
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_ar"]),
        ParseDocxOptions(file_label="universities/aub/info.ar.docx"),
        report,
    )
    assert parsed is not None
    majors = parse_xlsx(
        str(aub_paths["majors_ar"]),
        ParseXlsxOptions(file_label="universities/aub/majors.ar.xlsx"),
        report,
    )
    assert majors is not None

    ctx = AssembleContext(
        slug="aub",
        locale="ar",
        file_label="universities/aub/info.ar.docx",
        source_info_id="local:info.ar.docx",
        source_majors_id="local:majors.ar.xlsx",
    )
    ir = assemble_university(parsed, majors, ctx, report)
    assert ir is not None, [e.message for e in report.entries]
    assert ir.locale == "ar"


def test_assemble_fulbright_scholarship(fulbright_paths) -> None:
    report = ParseReport()
    parsed = parse_docx(
        str(fulbright_paths["info_en"]),
        ParseDocxOptions(file_label="scholarships/fulbright/info.docx"),
        report,
    )
    assert parsed is not None

    ctx = AssembleContext(
        slug="fulbright",
        locale="en",
        file_label="scholarships/fulbright/info.docx",
        source_info_id="local:info.docx",
    )
    ir = assemble_scholarship(parsed, ctx, report)
    assert ir is not None, [e.message for e in report.entries]
    assert ir.slug == "fulbright"
    assert ir.kind == "scholarship"
    # Generic ordered sections — assert all canonical names are present.
    headings = [s.heading for s in ir.sections]
    expected = {
        "Overview",
        "Grade & background requirements",
        "Application window",
        "Supported universities",
        "Benefits",
        "Contacts of recipients",
    }
    assert expected.issubset(set(headings)), f"missing: {expected - set(headings)}"
    # Each canonical section has at least one block.
    for s in ir.sections:
        if s.heading in expected:
            assert s.blocks, f"section {s.heading!r} has no blocks"


def test_assemble_warns_but_still_builds_when_a_section_is_missing(aub_paths) -> None:
    """A missing canonical section is a lint warning, not a parse failure.

    Dropping a section used to return None and fail the build. The page is now
    emitted without it and the report says which one is gone.
    """
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None
    apps = [s for s in parsed.section_order if s.startswith("Application")]
    for s in apps:
        parsed.section_order.remove(s)
        del parsed.sections[s]

    ctx = AssembleContext(
        slug="aub",
        locale="en",
        file_label="universities/aub/info.docx",
        source_info_id="local:info.docx",
        source_majors_id="local:majors.xlsx",
    )
    ir = assemble_university(parsed, [], ctx, report)
    assert ir is not None
    assert not report.has_errors()
    assert "application" not in {s.key for s in ir.sections}
    assert any("missing expected section" in e.message for e in report.entries)


def test_unrecognized_h1_is_kept_not_dropped(aub_paths) -> None:
    """Adding a section to a .docx must not require a parser change.

    A 7th H1 has no registry entry, so it gets no key — but it keeps its
    heading and its blocks, and reaches the emitted page.
    """
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="universities/aub/info.docx"),
        report,
    )
    assert parsed is not None
    parsed.section_order.append("Rankings")
    parsed.sections["Rankings"] = list(parsed.sections[parsed.section_order[0]])

    ctx = AssembleContext(
        slug="aub",
        locale="en",
        file_label="universities/aub/info.docx",
        source_info_id="local:info.docx",
        source_majors_id="local:majors.xlsx",
    )
    ir = assemble_university(parsed, [], ctx, report)
    assert ir is not None
    extra = [s for s in ir.sections if s.heading == "Rankings"]
    assert len(extra) == 1
    assert extra[0].key is None
    assert extra[0].blocks

    from drive_sync.emit.university import emit_university

    assert "## Rankings" in emit_university(ir)
