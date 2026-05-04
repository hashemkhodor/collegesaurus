"""parse/xlsx.py tests against bootstrap fixtures + synthetic sheets."""

from pathlib import Path

from openpyxl import Workbook

from drive_sync.parse.xlsx import (
    ParseXlsxOptions,
    parse_faculty_heading,
    parse_xlsx,
)
from drive_sync.report import ParseReport


def _write_fixture(tmp_path: Path, rows: list[list]) -> str:
    wb = Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    out = tmp_path / "majors.xlsx"
    wb.save(str(out))
    return str(out)


def test_parse_faculty_heading_extracts_link() -> None:
    text = "Maroun Semaan Faculty of Engineering ([MSFEA](https://example.com/x))"
    heading, abbr, url = parse_faculty_heading(text)
    assert heading == "Maroun Semaan Faculty of Engineering"
    assert abbr == "MSFEA"
    assert url == "https://example.com/x"


def test_parse_faculty_heading_falls_back_for_plain_text() -> None:
    text = "Faculty of Arts and Sciences"
    heading, abbr, url = parse_faculty_heading(text)
    assert heading == text
    assert abbr is None
    assert url is None


def test_parse_minimal_synthetic_sheet(tmp_path: Path) -> None:
    path = _write_fixture(
        tmp_path,
        [
            ["program", "degree", "faculty", "department", "credits", "duration", "language", "source"],
            ["Architecture", "BArch", "MSFEA", "School of Architecture", 174, 5, "EN", "https://aub.edu.lb/x"],
            ["Civil Engineering", "BE", "MSFEA", "CEE", 150, 4, "EN", "https://aub.edu.lb/y"],
            ["Biology", "BS", "FAS", "Biology", 120, 3, "EN", "https://aub.edu.lb/z"],
        ],
    )
    report = ParseReport()
    groups = parse_xlsx(path, ParseXlsxOptions(file_label="majors.xlsx"), report)
    assert groups is not None
    assert not report.has_errors()
    assert len(groups) == 2
    assert groups[0].heading == "MSFEA"
    assert len(groups[0].rows) == 2
    assert groups[0].rows[0].program == "Architecture"
    assert groups[0].rows[0].years == 5  # duration → years
    assert groups[1].heading == "FAS"
    assert groups[1].rows[0].program == "Biology"


def test_missing_required_column(tmp_path: Path) -> None:
    path = _write_fixture(
        tmp_path,
        [
            ["program", "degree"],  # faculty missing
            ["Architecture", "BArch"],
        ],
    )
    report = ParseReport()
    groups = parse_xlsx(path, ParseXlsxOptions(file_label="majors.xlsx"), report)
    assert groups is None
    assert report.has_errors()


def test_row_with_missing_program_reports_error(tmp_path: Path) -> None:
    path = _write_fixture(
        tmp_path,
        [
            ["program", "degree", "faculty"],
            ["Architecture", "BArch", "MSFEA"],
            ["", "BS", "MSFEA"],  # row 3 missing program
        ],
    )
    report = ParseReport()
    groups = parse_xlsx(path, ParseXlsxOptions(file_label="majors.xlsx"), report)
    assert groups is None
    assert report.has_errors()


def test_skips_blank_rows(tmp_path: Path) -> None:
    path = _write_fixture(
        tmp_path,
        [
            ["program", "degree", "faculty"],
            ["A", "BA", "X"],
            [None, None, None],
            ["B", "BS", "X"],
        ],
    )
    report = ParseReport()
    groups = parse_xlsx(path, ParseXlsxOptions(file_label="majors.xlsx"), report)
    assert groups is not None
    assert not report.has_errors()
    assert len(groups[0].rows) == 2


def test_aub_majors_fixture(aub_paths) -> None:
    """Sanity: the AUB fixture parses with multiple faculty groups."""
    report = ParseReport()
    groups = parse_xlsx(
        str(aub_paths["majors_en"]),
        ParseXlsxOptions(file_label="universities/aub/majors.xlsx"),
        report,
    )
    assert groups is not None, [e.message for e in report.entries]
    assert not report.has_errors()
    # AUB has 6 faculties.
    assert len(groups) >= 5
    total = sum(len(g.rows) for g in groups)
    assert total >= 20

    # First faculty's heading should parse out an abbr+url.
    assert groups[0].abbr is not None
    assert groups[0].url is not None
    # Faculty heading text should NOT contain the `(...)` link block — that was
    # parsed off into abbr/url.
    assert "[" not in groups[0].heading
