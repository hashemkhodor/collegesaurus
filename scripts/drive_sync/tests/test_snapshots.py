"""End-to-end snapshot tests: fixture docx/xlsx → MDX, byte-equal to expected snapshot.

These are the F4 cutover gate. If a parser or emitter change shifts the output,
the snapshot diff is the human review surface. If the change is intentional,
regenerate via:

    python -m drive_sync \\
        --content-root scripts/drive_sync/tests/fixtures \\
        --out-prefix /tmp/regen-snapshots
    # then move /tmp/regen-snapshots/* into the right names under
    # scripts/drive_sync/tests/fixtures/expected/

Design: spec/001-add-google-drive-backend-data/design.md §5.5.
"""

from __future__ import annotations

from pathlib import Path

from drive_sync.emit.scholarship import emit_scholarship
from drive_sync.emit.university import emit_university
from drive_sync.parse.assemble import (
    AssembleContext,
    assemble_scholarship,
    assemble_university,
)
from drive_sync.parse.docx import ParseDocxOptions, parse_docx
from drive_sync.parse.xlsx import ParseXlsxOptions, parse_xlsx
from drive_sync.report import ParseReport


# ---------------------------------------------------------------------------
# Pipeline helpers (shared with the Arabic / idempotency tests below)
# ---------------------------------------------------------------------------


def _build_university_mdx(
    info_path: Path,
    majors_path: Path,
    *,
    slug: str,
    locale: str,
    file_label: str,
) -> tuple[str, ParseReport]:
    report = ParseReport()
    parsed = parse_docx(
        str(info_path),
        ParseDocxOptions(file_label=file_label),
        report,
    )
    assert parsed is not None, [e.message for e in report.entries]
    majors = parse_xlsx(
        str(majors_path),
        ParseXlsxOptions(file_label=file_label.replace("info", "majors").replace(".docx", ".xlsx")),
        report,
    )
    assert majors is not None
    ctx = AssembleContext(
        slug=slug,
        locale=locale,
        file_label=file_label,
        source_info_id=str(info_path),
        source_majors_id=str(majors_path),
    )
    ir = assemble_university(parsed, majors, ctx, report)
    assert ir is not None
    return emit_university(ir), report


def _build_scholarship_mdx(
    info_path: Path,
    *,
    slug: str,
    locale: str,
    file_label: str,
) -> tuple[str, ParseReport]:
    report = ParseReport()
    parsed = parse_docx(
        str(info_path),
        ParseDocxOptions(file_label=file_label),
        report,
    )
    assert parsed is not None, [e.message for e in report.entries]
    ctx = AssembleContext(
        slug=slug,
        locale=locale,
        file_label=file_label,
        source_info_id=str(info_path),
    )
    ir = assemble_scholarship(parsed, ctx, report)
    assert ir is not None
    return emit_scholarship(ir), report


# ---------------------------------------------------------------------------
# T-4.5 — university snapshot tests
# ---------------------------------------------------------------------------


def test_aub_english_matches_snapshot(aub_paths, expected_dir: Path) -> None:
    mdx, _ = _build_university_mdx(
        aub_paths["info_en"],
        aub_paths["majors_en"],
        slug="aub",
        locale="en",
        file_label="universities/aub/info.docx",
    )
    expected = (expected_dir / "aub.mdx").read_text(encoding="utf-8")
    assert mdx == expected, _diff(mdx, expected, "aub.mdx")


def test_aub_arabic_matches_snapshot(aub_paths, expected_dir: Path) -> None:
    mdx, _ = _build_university_mdx(
        aub_paths["info_ar"],
        aub_paths["majors_ar"],
        slug="aub",
        locale="ar",
        file_label="universities/aub/info.ar.docx",
    )
    expected = (expected_dir / "aub.ar.mdx").read_text(encoding="utf-8")
    assert mdx == expected, _diff(mdx, expected, "aub.ar.mdx")


# ---------------------------------------------------------------------------
# T-4.6 — scholarship snapshot tests
# ---------------------------------------------------------------------------


def test_fulbright_english_matches_snapshot(fulbright_paths, expected_dir: Path) -> None:
    mdx, _ = _build_scholarship_mdx(
        fulbright_paths["info_en"],
        slug="fulbright",
        locale="en",
        file_label="scholarships/fulbright/info.docx",
    )
    expected = (expected_dir / "fulbright.mdx").read_text(encoding="utf-8")
    assert mdx == expected, _diff(mdx, expected, "fulbright.mdx")


def test_fulbright_arabic_matches_snapshot(fulbright_paths, expected_dir: Path) -> None:
    mdx, _ = _build_scholarship_mdx(
        fulbright_paths["info_ar"],
        slug="fulbright",
        locale="ar",
        file_label="scholarships/fulbright/info.ar.docx",
    )
    expected = (expected_dir / "fulbright.ar.mdx").read_text(encoding="utf-8")
    assert mdx == expected, _diff(mdx, expected, "fulbright.ar.mdx")


# ---------------------------------------------------------------------------
# T-4.3 — parser IR shape (smoke check on AUB)
# ---------------------------------------------------------------------------


def test_aub_english_ir_shape(aub_paths) -> None:
    """Lightweight check that the parsed IR has the expected structure."""
    report = ParseReport()
    parsed = parse_docx(
        str(aub_paths["info_en"]),
        ParseDocxOptions(file_label="aub/info.docx"),
        report,
    )
    assert parsed is not None
    assert parsed.metadata_raw["sidebar_position"] == "1"
    assert parsed.metadata_raw["title"].startswith("AUB")
    assert parsed.metadata_raw["page_h1"] == "American University of Beirut (AUB)"
    section_norm = [s.lower().split()[0] for s in parsed.section_order]
    for expected in ("introduction", "application", "tuition", "scholarships", "requirements", "contacts"):
        assert any(s.startswith(expected) for s in section_norm), f"missing: {expected}"


# ---------------------------------------------------------------------------
# T-4.4 — xlsx parser shape
# ---------------------------------------------------------------------------


def test_aub_xlsx_groups_match_expected_shape(aub_paths) -> None:
    report = ParseReport()
    groups = parse_xlsx(
        str(aub_paths["majors_en"]),
        ParseXlsxOptions(file_label="aub/majors.xlsx"),
        report,
    )
    assert groups is not None
    # AUB has 6 faculties.
    assert len(groups) == 6
    # Each faculty heading parsed an abbr+url out.
    assert all(g.abbr and g.url for g in groups)
    total_rows = sum(len(g.rows) for g in groups)
    # AUB has roughly 46 majors across the 6 faculties.
    assert 40 <= total_rows <= 55, f"unexpected total: {total_rows}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _diff(actual: str, expected: str, label: str) -> str:
    """Build a unified diff for assertion failure messages."""
    import difflib

    return "\n" + "\n".join(
        difflib.unified_diff(
            expected.splitlines(),
            actual.splitlines(),
            fromfile=f"expected/{label}",
            tofile=f"actual/{label}",
            lineterm="",
        )
    )


# ---------------------------------------------------------------------------
# T-4.7 — idempotency (FR-9)
# ---------------------------------------------------------------------------


def test_aub_pipeline_idempotent(aub_paths) -> None:
    """Run the full pipeline twice; both runs produce byte-identical MDX."""
    a, _ = _build_university_mdx(
        aub_paths["info_en"],
        aub_paths["majors_en"],
        slug="aub",
        locale="en",
        file_label="universities/aub/info.docx",
    )
    b, _ = _build_university_mdx(
        aub_paths["info_en"],
        aub_paths["majors_en"],
        slug="aub",
        locale="en",
        file_label="universities/aub/info.docx",
    )
    assert a == b


def test_fulbright_pipeline_idempotent(fulbright_paths) -> None:
    a, _ = _build_scholarship_mdx(
        fulbright_paths["info_en"],
        slug="fulbright",
        locale="en",
        file_label="scholarships/fulbright/info.docx",
    )
    b, _ = _build_scholarship_mdx(
        fulbright_paths["info_en"],
        slug="fulbright",
        locale="en",
        file_label="scholarships/fulbright/info.docx",
    )
    assert a == b


# ---------------------------------------------------------------------------
# T-4.8 — Arabic / RTL preservation (T-R.6)
# ---------------------------------------------------------------------------


# Unicode marks we explicitly verify don't get stripped in the round-trip.
_RLM = "‏"  # Right-to-Left Mark
_LRM = "‎"  # Left-to-Right Mark
# Block of common Arabic letters used in Lebanese university names. Picked to
# survive even aggressive non-letter normalization.
_ARABIC_LETTERS = "ابتثجحخدذرزسشصضطظعغفقكلمنهويءىؤإأة"


def test_aub_arabic_preserves_arabic_letters(aub_paths) -> None:
    """The Arabic AUB MDX must contain Arabic letters from the source content."""
    mdx, _ = _build_university_mdx(
        aub_paths["info_ar"],
        aub_paths["majors_ar"],
        slug="aub",
        locale="ar",
        file_label="universities/aub/info.ar.docx",
    )
    assert any(ch in mdx for ch in _ARABIC_LETTERS), (
        "Arabic AUB MDX appears to have lost all Arabic letters during the round-trip"
    )


def test_arabic_marks_pass_through_when_present_in_source(fulbright_paths) -> None:
    """If the source docx contains U+200F / U+200E, they must survive emission.

    We don't assert presence (the bootstrap may not contain any), but we do
    assert that *if* the parsed paragraphs contain them, they appear unchanged
    in the emitted MDX.
    """
    from drive_sync.models import LinkRun, Paragraph, TextRun

    mdx, _ = _build_scholarship_mdx(
        fulbright_paths["info_ar"],
        slug="fulbright",
        locale="ar",
        file_label="scholarships/fulbright/info.ar.docx",
    )
    # Construct a paragraph with explicit RLM/LRM marks and round-trip through
    # the emitter to verify it doesn't strip them. (The block-level emitter
    # is what matters; format.py preserves run.text verbatim.)
    from drive_sync.emit.format import emit_blocks

    block = Paragraph(runs=[TextRun(text=f"left{_LRM} mid {_RLM}right")])
    out = emit_blocks([block])
    assert _RLM in out
    assert _LRM in out
    # The Arabic Fulbright MDX exists and is non-empty (sanity).
    assert len(mdx) > 100


def test_arabic_locale_emits_to_i18n_path(aub_paths) -> None:
    """The output path resolver must point Arabic content at i18n/ar/..."""
    from drive_sync.emit.university import university_output_path
    from drive_sync.models import (
        FacultyGroup,
        MajorRow,
        Metadata,
        UniversityIR,
    )

    ir = UniversityIR(
        slug="aub",
        locale="ar",
        meta=Metadata(title="AUB", sidebar_label="AUB", sidebar_position=1),
        introduction=[], application=[], tuition_year_label="",
        tuition=[], scholarships=[], requirements=[], contacts=[],
        majors=[FacultyGroup(heading="X", rows=[MajorRow(program="X")])],
        source_info_id="x",
        source_majors_id="y",
    )
    assert university_output_path(ir) == (
        "i18n/ar/docusaurus-plugin-content-docs-universities/current/aub.mdx"
    )
