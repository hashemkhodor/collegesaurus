"""Should a scheduled deploy rebuild the site? Used by deploy.yml's check-drive job.

    python -m drive_sync --fingerprint > fingerprint.json
    python -m drive_sync.check fingerprint.json   # appends changed=... to $GITHUB_OUTPUT

It rebuilds when the live site (its /chatbot/version.json) was built from
another commit, for example a push whose run a newer scheduled run cancelled.
It also rebuilds when Drive changed and the last edit is at least 3 minutes
old; a half-finished edit waits for the next run.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

VERSION_URL = "https://collegesaurus.org/chatbot/version.json"
QUIET_SECONDS = 180


def decide(
    fingerprint: dict, live: dict | None, commit: str, now: datetime
) -> tuple[bool, str]:
    """(rebuild?, why) for the Drive `fingerprint`, the live version.json and this commit."""
    if live is None:
        return True, "the live site has no version.json"
    if live.get("site_commit") != commit:
        return True, f"the live site was built from {live.get('site_commit')}, not {commit}"
    if live.get("drive_fingerprint") == fingerprint["fingerprint"]:
        return False, "Drive and the site code are unchanged"
    try:
        edited = datetime.fromisoformat(str(fingerprint.get("newest")).replace("Z", "+00:00"))
    except ValueError:
        return True, "Drive changed"
    quiet = (now - edited).total_seconds()
    if quiet < QUIET_SECONDS:
        return False, f"Drive was edited {quiet:.0f}s ago; waiting for edits to settle"
    return True, "Drive changed"


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    fingerprint = json.loads(Path(args[0]).read_text())
    try:
        url = f"{VERSION_URL}?t={time.time_ns()}"  # past the Pages CDN cache
        with urllib.request.urlopen(url, timeout=20) as response:
            live = json.load(response)
    except Exception as exc:
        print(f"live version.json unavailable: {exc}", file=sys.stderr)
        live = None
    changed, reason = decide(fingerprint, live, os.environ.get("GITHUB_SHA", ""), datetime.now(UTC))
    print(f"rebuild={changed}: {reason}")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as out:
            out.write(f"fingerprint={fingerprint['fingerprint']}\n")
            out.write(f"changed={'true' if changed else 'false'}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
