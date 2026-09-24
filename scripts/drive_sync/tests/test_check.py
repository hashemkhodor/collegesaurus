"""check.py — whether a scheduled deploy should rebuild the site."""

from datetime import UTC, datetime

import pytest

from drive_sync import check
from drive_sync.check import decide

NOW = datetime(2026, 9, 24, 12, 0, 0, tzinfo=UTC)
COMMIT = "c145ba04"
DRIVE = {"fingerprint": "b21a12a3", "newest": "2026-09-24T11:00:00.000Z"}
LIVE = {"drive_fingerprint": "b21a12a3", "site_commit": COMMIT}


def test_rebuilds_when_the_live_site_has_no_version_file():
    assert decide(DRIVE, None, COMMIT, NOW)[0] is True


def test_rebuilds_when_the_live_site_was_built_from_another_commit():
    # e.g. a push whose run was cancelled by a newer scheduled run, or failed
    changed, reason = decide(DRIVE, LIVE | {"site_commit": "0ld0ld00"}, COMMIT, NOW)

    assert changed is True
    assert "0ld0ld00" in reason


def test_skips_when_drive_and_code_are_both_unchanged():
    assert decide(DRIVE, LIVE, COMMIT, NOW)[0] is False


def test_rebuilds_when_drive_changed_and_edits_have_settled():
    edited = DRIVE | {"fingerprint": "new", "newest": "2026-09-24T11:56:00.000Z"}  # 4 min ago

    assert decide(edited, LIVE, COMMIT, NOW)[0] is True


def test_waits_while_someone_is_still_editing():
    editing = DRIVE | {"fingerprint": "new", "newest": "2026-09-24T11:59:00.000Z"}  # 1 min ago

    changed, reason = decide(editing, LIVE, COMMIT, NOW)

    assert changed is False
    assert "60s ago" in reason


def test_cli_appends_the_decision_to_the_github_output(tmp_path, monkeypatch):
    fingerprint = tmp_path / "fingerprint.json"
    fingerprint.write_text('{"fingerprint": "b21a12a3", "newest": null}')
    output = tmp_path / "github_output"
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    monkeypatch.setenv("GITHUB_SHA", COMMIT)

    def unreachable(*args, **kwargs):
        raise OSError("site down")

    monkeypatch.setattr(check.urllib.request, "urlopen", unreachable)

    assert check.main([str(fingerprint)]) == 0
    assert output.read_text() == "fingerprint=b21a12a3\nchanged=true\n"


@pytest.mark.parametrize("newest", [None, "not-a-date"])
def test_an_unknown_edit_time_does_not_block_a_rebuild(newest):
    changed = decide(DRIVE | {"fingerprint": "new", "newest": newest}, LIVE, COMMIT, NOW)[0]

    assert changed is True
