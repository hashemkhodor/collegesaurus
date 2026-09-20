"""fetch.py — local-mirror mode tests (the Drive backend shares the same walk)."""

from pathlib import Path

import pytest

from drive_sync.fetch import (
    ContentTree,
    LocalSource,
    SlugFiles,
    build_content_tree,
    is_valid_year,
    load_local_content_root,
    preflight_check,
)
from drive_sync.report import ParseReport

YEAR = "2025-2026"


def _make_mirror(tmp_path: Path, layout: dict[str, str]) -> Path:
    for rel, content in layout.items():
        full = tmp_path / rel
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content)
    return tmp_path


def _uni(tree: ContentTree, slug: str, year: str = YEAR) -> SlugFiles:
    return tree.universities[year][slug]


def test_local_mirror_discovers_universities_and_scholarships(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            f"v2/universities/{YEAR}/aub/info.docx": "x",
            f"v2/universities/{YEAR}/aub/majors.xlsx": "x",
            f"v2/scholarships/{YEAR}/fulbright/info.docx": "x",
        },
    )
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    assert tree.years("university") == [YEAR]
    assert tree.years("scholarship") == [YEAR]
    aub = _uni(tree, "aub")
    assert aub.info_en and aub.info_en.name == "info.docx"
    assert aub.majors_en and aub.majors_en.name == "majors.xlsx"
    assert aub.info_ar is None
    assert aub.label == f"universities/{YEAR}/aub"
    assert not report.has_errors()


def test_local_mirror_picks_up_arabic_counterparts(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            f"v2/universities/{YEAR}/aub/info.docx": "x",
            f"v2/universities/{YEAR}/aub/majors.xlsx": "x",
            f"v2/universities/{YEAR}/aub/info.ar.docx": "x",
            f"v2/universities/{YEAR}/aub/majors.ar.xlsx": "x",
        },
    )
    report = ParseReport()
    aub = _uni(load_local_content_root(str(root), report), "aub")
    assert aub.info_ar and aub.info_ar.name == "info.ar.docx"
    assert aub.majors_ar and aub.majors_ar.name == "majors.ar.xlsx"


def test_multiple_years_are_kept_separate(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            "v2/universities/2024-2025/aub/info.docx": "old",
            "v2/universities/2024-2025/aub/majors.xlsx": "old",
            "v2/universities/2025-2026/aub/info.docx": "new",
            "v2/universities/2025-2026/aub/majors.xlsx": "new",
        },
    )
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    assert tree.years("university") == ["2025-2026", "2024-2025"]
    assert tree.latest_year("university") == "2025-2026"
    assert tree.count() == 2
    assert not report.has_errors()


def test_missing_content_prefix_is_an_error(tmp_path: Path) -> None:
    root = _make_mirror(tmp_path, {f"universities/{YEAR}/aub/info.docx": "x"})
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    assert tree.count() == 0
    assert report.has_errors()
    assert "content prefix" in " ".join(e.message for e in report.entries)


def test_empty_prefix_reads_the_pre_v2_flat_layout(tmp_path: Path) -> None:
    """`--content-prefix ''` still reads the old tree, for cutover comparison."""
    root = _make_mirror(
        tmp_path,
        {"universities/aub/info.docx": "x", "universities/aub/majors.xlsx": "x"},
    )
    report = ParseReport()
    tree = build_content_tree(LocalSource(str(root)), "", report)
    assert tree.years("university") == ["unversioned"]
    assert tree.universities["unversioned"]["aub"].info_en is not None
    assert not report.has_errors()


def test_non_year_folder_is_skipped_with_a_warning(tmp_path: Path) -> None:
    root = _make_mirror(tmp_path, {"v2/universities/draft/aub/info.docx": "x"})
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    assert tree.count() == 0
    assert report.count("warning") == 1
    assert "academic year" in report.entries[0].message


def test_local_mirror_rejects_invalid_slug(tmp_path: Path) -> None:
    root = _make_mirror(tmp_path, {f"v2/universities/{YEAR}/Bad-Name/info.docx": "x"})
    report = ParseReport()
    load_local_content_root(str(root), report)
    assert report.has_errors()


def test_unknown_top_level_folder_warns(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            f"v2/universities/{YEAR}/aub/info.docx": "x",
            f"v2/universities/{YEAR}/aub/majors.xlsx": "x",
            "v2/universties/typo.txt": "x",
        },
    )
    report = ParseReport()
    load_local_content_root(str(root), report)
    assert any("universities" in e.message for e in report.entries if e.severity == "warning")


def test_templates_folder_is_ignored_quietly(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            f"v2/universities/{YEAR}/aub/info.docx": "x",
            f"v2/universities/{YEAR}/aub/majors.xlsx": "x",
            "v2/templates/info.docx": "x",
        },
    )
    report = ParseReport()
    load_local_content_root(str(root), report)
    assert report.count("warning") == 0


def test_attachments_are_collected_not_warned(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            f"v2/universities/{YEAR}/lu/info.docx": "x",
            f"v2/universities/{YEAR}/lu/majors.xlsx": "x",
            f"v2/universities/{YEAR}/lu/attachments/fees.pdf": "x",
            f"v2/universities/{YEAR}/lu/attachments/chart.jpg": "x",
        },
    )
    report = ParseReport()
    lu = _uni(load_local_content_root(str(root), report), "lu")
    assert sorted(a.name for a in lu.attachments) == ["chart.jpg", "fees.pdf"]
    assert report.count("warning") == 0


def test_stray_file_in_slug_folder_warns(tmp_path: Path) -> None:
    """The live `lu` folder has exactly this shape; today it is silently dropped."""
    root = _make_mirror(
        tmp_path,
        {
            f"v2/universities/{YEAR}/lu/info.docx": "x",
            f"v2/universities/{YEAR}/lu/majors.xlsx": "x",
            f"v2/universities/{YEAR}/lu/entrance exams.docx": "x",
        },
    )
    report = ParseReport()
    load_local_content_root(str(root), report)
    warnings = [e for e in report.entries if e.severity == "warning"]
    assert len(warnings) == 1
    assert "entrance exams.docx" in warnings[0].message
    assert "attachments/" in warnings[0].message


def test_preflight_raises_on_empty_tree() -> None:
    report = ParseReport()
    with pytest.raises(RuntimeError, match="empty"):
        preflight_check(ContentTree(), report)


def test_preflight_flags_missing_majors_xlsx(tmp_path: Path) -> None:
    root = _make_mirror(tmp_path, {f"v2/universities/{YEAR}/aub/info.docx": "x"})
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    preflight_check(tree, report)
    text = " ".join(e.message for e in report.entries)
    assert "majors.xlsx" in text


def test_preflight_warns_on_arabic_info_without_arabic_majors(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            f"v2/universities/{YEAR}/aub/info.docx": "x",
            f"v2/universities/{YEAR}/aub/majors.xlsx": "x",
            f"v2/universities/{YEAR}/aub/info.ar.docx": "x",
        },
    )
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    preflight_check(tree, report)
    assert report.count("warning") == 1
    assert report.count("error") == 0


def test_year_pattern() -> None:
    assert is_valid_year("2025-2026")
    assert not is_valid_year("2025")
    assert not is_valid_year("AY2025-26")
    assert not is_valid_year("draft")


def test_local_mirror_against_committed_fixtures(fixtures_dir: Path, fixture_year: str) -> None:
    """End-to-end smoke against the committed fixtures directory."""
    report = ParseReport()
    tree = load_local_content_root(str(fixtures_dir), report)
    assert fixture_year in tree.universities
    assert "aub" in tree.universities[fixture_year]
    assert "fulbright" in tree.scholarships[fixture_year]
    assert "life" in tree.scholarships[fixture_year]
    aub = _uni(tree, "aub", fixture_year)
    assert aub.info_en and aub.info_ar
    assert aub.majors_en and aub.majors_ar
    preflight_check(tree, report)
    assert not report.has_errors()
