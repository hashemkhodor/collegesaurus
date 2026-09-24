"""fingerprint.py — the cheap "did anything in Drive change?" check for deploy.yml."""

import json
import os
import shutil
from pathlib import Path

from drive_sync.__main__ import main
from drive_sync.fetch import load_local_content_root
from drive_sync.fingerprint import fingerprint
from drive_sync.report import ParseReport

FIXTURES = Path(__file__).parent / "fixtures"
LATER = 1_900_000_000  # 2030-03-17T17:46:40Z


def _mirror(tmp_path: Path) -> Path:
    shutil.copytree(FIXTURES / "v2", tmp_path / "v2")
    return tmp_path


def _fingerprint(root: Path) -> dict:
    return fingerprint(load_local_content_root(str(root), ParseReport()))


def test_unchanged_content_gives_the_same_fingerprint(tmp_path):
    root = _mirror(tmp_path)

    assert _fingerprint(root) == _fingerprint(root)


def test_an_edited_file_changes_the_fingerprint(tmp_path):
    root = _mirror(tmp_path)
    before = _fingerprint(root)["fingerprint"]

    os.utime(root / "v2/universities/2025-2026/aub/info.docx", (LATER, LATER))

    assert _fingerprint(root)["fingerprint"] != before


def test_a_removed_page_changes_the_fingerprint(tmp_path):
    root = _mirror(tmp_path)
    before = _fingerprint(root)["fingerprint"]

    shutil.rmtree(root / "v2/scholarships/2025-2026/life")

    assert _fingerprint(root)["fingerprint"] != before


def test_newest_is_the_latest_edit_time(tmp_path):
    root = _mirror(tmp_path)

    os.utime(root / "v2/scholarships/2025-2026/fulbright/info.docx", (LATER, LATER))

    assert _fingerprint(root)["newest"] == "2030-03-17T17:46:40Z"


def test_cli_prints_the_fingerprint_as_json_and_writes_nothing(tmp_path, capsys, monkeypatch):
    root = _mirror(tmp_path / "content")
    monkeypatch.chdir(tmp_path)

    code = main(["--content-root", str(root), "--fingerprint"])

    assert code == 0
    assert json.loads(capsys.readouterr().out) == _fingerprint(root)
    assert sorted(p.name for p in tmp_path.iterdir()) == ["content"]
