"""ParseReport — collects per-file errors/warnings during parse, prints to
stderr at the end, and writes parse-report.json for CI artifact upload.

Design: spec/001-add-google-drive-backend-data/design.md §4.4.
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass, field
from typing import Literal

Severity = Literal["error", "warning"]


@dataclass
class Entry:
    severity: Severity
    file: str
    """Repo-relative or Drive-folder-relative file path, e.g. `universities/aub/info.docx`."""

    message: str
    web_view_link: str | None = None
    """Drive `webViewLink` if available — clickable in CI logs."""

    where: str | None = None
    """Optional location detail, e.g. `Tuition section` or `row 4`."""


@dataclass
class ParseReport:
    entries: list[Entry] = field(default_factory=list)

    def error(
        self,
        file: str,
        message: str,
        *,
        web_view_link: str | None = None,
        where: str | None = None,
    ) -> None:
        self.entries.append(
            Entry(severity="error", file=file, message=message, web_view_link=web_view_link, where=where)
        )

    def warn(
        self,
        file: str,
        message: str,
        *,
        web_view_link: str | None = None,
        where: str | None = None,
    ) -> None:
        self.entries.append(
            Entry(severity="warning", file=file, message=message, web_view_link=web_view_link, where=where)
        )

    def has_errors(self) -> bool:
        return any(e.severity == "error" for e in self.entries)

    def count(self, severity: Severity) -> int:
        return sum(1 for e in self.entries if e.severity == severity)

    def print(self) -> None:
        """Pretty-print to stderr, one line per entry."""
        if not self.entries:
            print("drive_sync: 0 errors, 0 warnings.", file=sys.stderr)
            return
        for e in self.entries:
            tag = "[ERR]" if e.severity == "error" else "[WARN]"
            where = f" ({e.where})" if e.where else ""
            link = f" — {e.web_view_link}" if e.web_view_link else ""
            print(f"{tag} {e.file}{where} — {e.message}{link}", file=sys.stderr)
        print(
            f"drive_sync: {self.count('error')} error(s), {self.count('warning')} warning(s).",
            file=sys.stderr,
        )

    def write_json(self, path: str = "parse-report.json") -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "summary": {
                        "errors": self.count("error"),
                        "warnings": self.count("warning"),
                    },
                    "entries": [asdict(e) for e in self.entries],
                },
                f,
                indent=2,
            )
