"""A cheap "did anything in Drive change?" check, for the deploy workflow.

`python -m drive_sync --fingerprint` walks the content tree without
downloading anything and prints `{"fingerprint": ..., "newest": ...}`: a hash
of every classified file's identity and version (id, md5, modified time), and
the most recent edit time. The build publishes the fingerprint in
/chatbot/version.json; deploy.yml compares a fresh one with the live value
and skips the rebuild when nothing changed.
"""

from __future__ import annotations

import hashlib

from drive_sync.fetch import ContentTree, _all_files


def fingerprint(tree: ContentTree) -> dict[str, str | None]:
    rows: list[str] = []
    newest: str | None = None
    for sf in tree.iter_slugs():
        for meta in _all_files(sf):
            rows.append(
                "\t".join(
                    [sf.label, meta.name, meta.id, meta.md5_checksum or "", meta.modified_time]
                )
            )
            newest = max(newest or meta.modified_time, meta.modified_time)
    digest = hashlib.sha256("\n".join(sorted(rows)).encode()).hexdigest()[:16]
    return {"fingerprint": digest, "newest": newest}
