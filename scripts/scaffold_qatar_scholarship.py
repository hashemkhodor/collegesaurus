"""Generate the Qatar Scholarship (AUB) `info.docx` / `info.ar.docx` parser inputs.

The site's content source of truth is Google Drive: `drive_sync` fetches
`scholarships/<slug>/info.docx` and emits the MDX at build time. This script
produces that pair of documents for the `qatar-scholarship-aub` slug from the
MDX pages in the repo, so the docx can be reviewed locally and then uploaded to
the Drive content root.

It deliberately holds no content of its own. The scholarship text lives in
exactly one place — `scholarships/qatar-scholarship-aub.mdx` and its Arabic
counterpart — and this script runs those files through the same
`reverse_mdx` → `emit_docx` path that produced every other slug's document
(`python -m drive_sync.migrate`). That keeps the docx style contract
(Heading 1 sections, `Metadata` table, `List Bullet` lists, real `w:hyperlink`
runs) identical to the rest of the corpus for free.

Usage:
    PYTHONPATH=scripts .venv/bin/python scripts/scaffold_qatar_scholarship.py
    PYTHONPATH=scripts .venv/bin/python scripts/scaffold_qatar_scholarship.py --output /tmp/qs

Verify the round trip afterwards:
    PYTHONPATH=scripts .venv/bin/python -m drive_sync \\
        --content-root .drive-cache --only qatar-scholarship-aub --out-prefix /tmp/rt
    diff scholarships/qatar-scholarship-aub.mdx /tmp/rt/scholarships/qatar-scholarship-aub.mdx
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from loguru import logger

from drive_sync.migrate.emit_docx import emit_docx
from drive_sync.migrate.reverse_mdx import MdxFile, reverse_mdx

SLUG = "qatar-scholarship-aub"

_REPO_ROOT = Path(__file__).resolve().parent.parent

# (locale, source MDX relative to the repo root, output filename)
_SOURCES: list[tuple[str, str, str]] = [
    ("en", f"scholarships/{SLUG}.mdx", "info.docx"),
    (
        "ar",
        f"i18n/ar/docusaurus-plugin-content-docs-scholarships/current/{SLUG}.mdx",
        "info.ar.docx",
    ),
]


def _configure_logging(verbose: bool) -> None:
    logger.remove()
    logger.add(
        sys.stderr,
        level="DEBUG" if verbose else "INFO",
        format=(
            "<green>{time:HH:mm:ss.SSS}</green> "
            "<level>{level: <7}</level> "
            "<level>{message}</level>"
        ),
        colorize=True,
    )


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="scaffold_qatar_scholarship")
    p.add_argument(
        "--output",
        default=".drive-cache",
        help="cache/content root to write into (default: .drive-cache)",
    )
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args(argv if argv is not None else sys.argv[1:])
    _configure_logging(args.verbose)

    out_dir = Path(args.output).expanduser()
    if not out_dir.is_absolute():
        out_dir = _REPO_ROOT / out_dir
    slug_dir = out_dir / "scholarships" / SLUG
    slug_dir.mkdir(parents=True, exist_ok=True)

    n_err = 0
    for locale, rel_src, out_name in _SOURCES:
        src = _REPO_ROOT / rel_src
        if not src.is_file():
            logger.error("[{}] missing source MDX: {}", locale, src)
            n_err += 1
            continue
        ir = reverse_mdx(MdxFile(path=src, slug=SLUG, locale=locale))
        if ir is None:
            logger.error("[{}] could not parse {}", locale, src)
            n_err += 1
            continue
        if ir.kind != "scholarship":
            logger.error("[{}] {} parsed as a {} page, expected a scholarship", locale, src, ir.kind)
            n_err += 1
            continue
        dest = slug_dir / out_name
        emit_docx(ir, dest)
        logger.info("[{}] {} -> {} ({} sections)", locale, rel_src, dest, len(ir.sections))

    if n_err:
        logger.error("scaffold FAILED ({} error(s))", n_err)
        return 1
    logger.success("scaffold OK — upload {} to the Drive content root to publish", slug_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
