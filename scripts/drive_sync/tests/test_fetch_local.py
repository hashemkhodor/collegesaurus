"""fetch.py — local-mirror mode tests (Drive API path is exercised manually in F6)."""

from pathlib import Path

import pytest

from drive_sync.fetch import (
    ContentTree,
    load_local_content_root,
    preflight_check,
)
from drive_sync.report import ParseReport


def _make_mirror(tmp_path: Path, layout: dict[str, str]) -> Path:
    for rel, content in layout.items():
        full = tmp_path / rel
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content)
    return tmp_path


def test_local_mirror_discovers_universities_and_scholarships(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            "universities/aub/info.docx": "x",
            "universities/aub/majors.xlsx": "x",
            "scholarships/fulbright/info.docx": "x",
        },
    )
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    assert len(tree.universities) == 1
    assert len(tree.scholarships) == 1
    aub = tree.universities["aub"]
    assert aub.info_en and aub.info_en.name == "info.docx"
    assert aub.majors_en and aub.majors_en.name == "majors.xlsx"
    assert aub.info_ar is None
    assert not report.has_errors()


def test_local_mirror_picks_up_arabic_counterparts(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            "universities/aub/info.docx": "x",
            "universities/aub/majors.xlsx": "x",
            "universities/aub/info.ar.docx": "x",
            "universities/aub/majors.ar.xlsx": "x",
        },
    )
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    aub = tree.universities["aub"]
    assert aub.info_ar and aub.info_ar.name == "info.ar.docx"
    assert aub.majors_ar and aub.majors_ar.name == "majors.ar.xlsx"


def test_local_mirror_rejects_invalid_slug(tmp_path: Path) -> None:
    root = _make_mirror(tmp_path, {"universities/Bad-Name/info.docx": "x"})
    report = ParseReport()
    load_local_content_root(str(root), report)
    assert report.has_errors()


def test_local_mirror_handles_missing_kind_folder(tmp_path: Path) -> None:
    """Only universities/, no scholarships/."""
    root = _make_mirror(tmp_path, {"universities/aub/info.docx": "x"})
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    assert len(tree.universities) == 1
    assert len(tree.scholarships) == 0
    assert not report.has_errors()


def test_preflight_raises_on_empty_tree() -> None:
    report = ParseReport()
    with pytest.raises(RuntimeError, match="empty"):
        preflight_check(ContentTree(), report)


def test_preflight_flags_missing_majors_xlsx(tmp_path: Path) -> None:
    root = _make_mirror(tmp_path, {"universities/aub/info.docx": "x"})
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    preflight_check(tree, report)
    text = " ".join(e.message for e in report.entries)
    assert "majors.xlsx" in text


def test_preflight_warns_on_arabic_info_without_arabic_majors(tmp_path: Path) -> None:
    root = _make_mirror(
        tmp_path,
        {
            "universities/aub/info.docx": "x",
            "universities/aub/majors.xlsx": "x",
            "universities/aub/info.ar.docx": "x",
        },
    )
    report = ParseReport()
    tree = load_local_content_root(str(root), report)
    preflight_check(tree, report)
    assert report.count("warning") == 1
    assert report.count("error") == 0


def test_local_mirror_against_committed_fixtures(fixtures_dir: Path) -> None:
    """End-to-end smoke against the committed fixtures directory."""
    report = ParseReport()
    tree = load_local_content_root(str(fixtures_dir), report)
    assert "aub" in tree.universities
    assert "fulbright" in tree.scholarships
    assert "life" in tree.scholarships
    aub = tree.universities["aub"]
    assert aub.info_en and aub.info_ar
    assert aub.majors_en and aub.majors_ar
    preflight_check(tree, report)
    assert not report.has_errors()
