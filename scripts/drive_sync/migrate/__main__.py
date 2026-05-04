"""CLI for the one-shot reverse migration.

Usage:
    python -m drive_sync.migrate \\
        --output ~/Desktop/drive-mirror-bootstrap

Reads legacy MDX files from `universities/`, `scholarships/`, and the i18n
counterparts, then emits .docx + .xlsx into `<output>/{universities,scholarships}/<slug>/`.

Files NOT migrated:
- `intro.mdx` (overview pages, hand-authored by design)
- `_template.mdx` (developer templates)
- `amideast.mdx` (non-standard structure — stays hand-authored per design.md §5.4)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from loguru import logger

from drive_sync.migrate.emit_docx import emit_docx
from drive_sync.migrate.emit_xlsx import emit_xlsx
from drive_sync.migrate.reverse_mdx import MdxFile, reverse_mdx


_REPO_ROOT = Path(__file__).parent.parent.parent.parent  # collegesaurus/

_SOURCE_DIRS: list[tuple[str, str, str]] = [
    # (mdx_dir, kind, locale)
    ("universities", "university", "en"),
    ("scholarships", "scholarship", "en"),
    (
        "i18n/ar/docusaurus-plugin-content-docs-universities/current",
        "university",
        "ar",
    ),
    (
        "i18n/ar/docusaurus-plugin-content-docs-scholarships/current",
        "scholarship",
        "ar",
    ),
]

_EXCLUDED_NAMES = {"intro.mdx", "_template.mdx"}
# amideast was previously excluded because it doesn't fit the canonical 6-section
# scholarship template. The schema is now generic ordered sections, so amideast
# (with its YES Program / MENA / Hope Fund / etc. cards) is migratable.


def _configure_logging(verbose: bool) -> None:
    logger.remove()
    level = "DEBUG" if verbose else "INFO"
    logger.add(
        sys.stderr,
        level=level,
        format=(
            "<green>{time:HH:mm:ss.SSS}</green> "
            "<level>{level: <7}</level> "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> "
            "<level>{message}</level>"
        ),
        colorize=True,
    )


def _discover_legacy_mdx(repo_root: Path, only: str | None) -> list[MdxFile]:
    out: list[MdxFile] = []
    for rel_dir, _kind, locale in _SOURCE_DIRS:
        d = repo_root / rel_dir
        if not d.is_dir():
            continue
        for f in sorted(d.iterdir()):
            if f.suffix != ".mdx":
                continue
            if f.name in _EXCLUDED_NAMES:
                continue
            slug = f.stem
            if only and slug != only:
                continue
            out.append(MdxFile(path=f, slug=slug, locale=locale))
    return out


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="drive_sync.migrate")
    p.add_argument(
        "--output",
        required=True,
        help="output directory (e.g. ~/Desktop/drive-mirror-bootstrap)",
    )
    p.add_argument("--only", default=None, help="filter to one slug (for debugging)")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args(argv if argv is not None else sys.argv[1:])
    _configure_logging(args.verbose)

    output_root = Path(args.output).expanduser().resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    logger.info("Output directory: {}", output_root)

    repo_root = _REPO_ROOT
    files = _discover_legacy_mdx(repo_root, args.only)
    if not files:
        logger.warning("No MDX files matched (only={})", args.only)
        return 0
    logger.info("Found {} legacy MDX file{}", len(files), "" if len(files) == 1 else "s")

    n_ok = 0
    n_err = 0
    for f in files:
        ir = reverse_mdx(f)
        if ir is None:
            n_err += 1
            continue
        kind_dir = "universities" if ir.kind == "university" else "scholarships"
        slug_dir = output_root / kind_dir / ir.slug
        slug_dir.mkdir(parents=True, exist_ok=True)
        suffix = ".ar" if ir.locale == "ar" else ""
        info_path = slug_dir / f"info{suffix}.docx"
        emit_docx(ir, info_path)
        logger.info("[{}/{}/{}] -> {}", kind_dir, ir.slug, ir.locale, info_path)
        if ir.kind == "university":
            majors_path = slug_dir / f"majors{suffix}.xlsx"
            emit_xlsx(ir.majors, majors_path)
            logger.info("[{}/{}/{}] -> {}", kind_dir, ir.slug, ir.locale, majors_path)
        n_ok += 1

    logger.info("Migrated {} file(s); {} failed", n_ok, n_err)
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main())
