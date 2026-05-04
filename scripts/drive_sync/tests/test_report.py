"""Tests for ParseReport."""

import json

from drive_sync.report import ParseReport


def test_starts_empty() -> None:
    r = ParseReport()
    assert not r.has_errors()
    assert r.count("error") == 0
    assert r.count("warning") == 0


def test_separates_errors_and_warnings() -> None:
    r = ParseReport()
    r.error("universities/aub/info.docx", "missing Tuition")
    r.warn("universities/aub/info.docx", "smart quote normalized")
    assert r.count("error") == 1
    assert r.count("warning") == 1
    assert r.has_errors()


def test_print_does_not_raise(capsys) -> None:
    r = ParseReport()
    r.error("a.docx", "bad", web_view_link="https://drive/x", where="row 3")
    r.warn("a.docx", "iffy")
    r.print()
    captured = capsys.readouterr()
    assert "[ERR]" in captured.err
    assert "[WARN]" in captured.err
    assert "row 3" in captured.err
    assert "https://drive/x" in captured.err


def test_print_empty_says_zero(capsys) -> None:
    ParseReport().print()
    assert "0 errors" in capsys.readouterr().err


def test_write_json_round_trip(tmp_path) -> None:
    r = ParseReport()
    r.error("a.docx", "bad", where="row 3")
    r.warn("b.docx", "iffy")
    out = tmp_path / "report.json"
    r.write_json(str(out))
    data = json.loads(out.read_text())
    assert data["summary"] == {"errors": 1, "warnings": 1}
    assert len(data["entries"]) == 2
    assert data["entries"][0]["severity"] == "error"
