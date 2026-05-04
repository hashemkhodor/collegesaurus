"""CLI entry point for `python -m drive_sync`.

Flags:
    --content-root <path>   Read from a local mirror dir instead of Drive.
    --only <slug>           Process only one slug (e.g. `aub` or `universities/aub`).
    --dry-run               Parse + validate, do not write MDX.
    --cache-dir <path>      Override default `.drive-cache/`.
    --out-prefix <path>     Write MDX under <path>/ (round-trip / dev only).

Env vars (Drive mode):
    GDRIVE_SERVICE_ACCOUNT_JSON   Service-account key (full JSON content).
    GDRIVE_CONTENT_ROOT_ID        Drive folder ID for the content root.

Design: spec/001-add-google-drive-backend-data/design.md §4, §6.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from loguru import logger

from drive_sync.emit.scholarship import emit_scholarship, scholarship_output_path
from drive_sync.emit.university import emit_university, university_output_path
from drive_sync.fetch import (
    FetchOptions,
    SlugFiles,
    fetch_content_tree,
    preflight_check,
)
from drive_sync.parse.assemble import (
    AssembleContext,
    assemble_scholarship,
    assemble_university,
)
from drive_sync.parse.docx import ParseDocxOptions, parse_docx
from drive_sync.parse.xlsx import ParseXlsxOptions, parse_xlsx
from drive_sync.report import ParseReport


def _configure_logging(verbose: bool) -> None:
    """Set up loguru sink: stderr, colorized, with elapsed time per line.

    Default level is INFO; -v / --verbose drops to DEBUG.
    """
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
        backtrace=False,
        diagnose=False,
    )


@dataclass
class Args:
    content_root: str | None
    only: str | None
    dry_run: bool
    cache_dir: str
    out_prefix: str
    verbose: bool


def _parse_args(argv: list[str]) -> Args:
    p = argparse.ArgumentParser(prog="drive_sync")
    p.add_argument("--content-root", default=None)
    p.add_argument("--only", default=None)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--cache-dir", default=".drive-cache")
    p.add_argument("--out-prefix", default="")
    p.add_argument("-v", "--verbose", action="store_true", help="enable DEBUG-level logging")
    ns = p.parse_args(argv)
    return Args(
        content_root=ns.content_root,
        only=ns.only,
        dry_run=ns.dry_run,
        cache_dir=ns.cache_dir,
        out_prefix=ns.out_prefix,
        verbose=ns.verbose,
    )


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    _configure_logging(args.verbose)
    report = ParseReport()

    started = time.monotonic()
    if args.content_root:
        logger.info("Source: local mirror at {}", args.content_root)
    else:
        logger.info("Source: Google Drive (folder {})", os.environ.get("GDRIVE_CONTENT_ROOT_ID", "<unset>"))
    if args.dry_run:
        logger.info("Mode: dry-run (parse + validate; no MDX written)")
    if args.out_prefix:
        logger.info("Output prefix: {}", args.out_prefix)
    if args.only:
        logger.info("Filter: --only {}", args.only)

    # Step 1: fetch.
    logger.info("Stage 1/4: fetching content tree")
    options = FetchOptions(
        content_root_id=os.environ.get("GDRIVE_CONTENT_ROOT_ID"),
        local_path=args.content_root,
        service_account_json=os.environ.get("GDRIVE_SERVICE_ACCOUNT_JSON"),
        cache_dir=args.cache_dir,
    )
    tree = fetch_content_tree(options, report)
    logger.info(
        "Fetched {} universit{} and {} scholarship{}",
        len(tree.universities),
        "y" if len(tree.universities) == 1 else "ies",
        len(tree.scholarships),
        "" if len(tree.scholarships) == 1 else "s",
    )

    # Step 2: pre-flight.
    logger.info("Stage 2/4: pre-flight checks")
    preflight_check(tree, report)

    # Step 3: parse + emit each slug.
    logger.info("Stage 3/4: parsing + emitting MDX")
    n_emitted = 0
    for sf in tree.universities.values():
        if args.only and sf.slug != args.only and f"universities/{sf.slug}" != args.only:
            continue
        n_emitted += _process_university(sf, report, args)
    for sf in tree.scholarships.values():
        if args.only and sf.slug != args.only and f"scholarships/{sf.slug}" != args.only:
            continue
        n_emitted += _process_scholarship(sf, report, args)
    logger.info("Wrote {} MDX file{}", n_emitted, "" if n_emitted == 1 else "s")

    # Step 4: report.
    logger.info("Stage 4/4: writing report")
    report.print()
    report.write_json("parse-report.json")

    elapsed = time.monotonic() - started
    if report.has_errors():
        logger.error("drive_sync FAILED in {:.1f}s ({} errors, {} warnings)", elapsed, report.count("error"), report.count("warning"))
        return 1
    logger.success("drive_sync OK in {:.1f}s ({} warnings)", elapsed, report.count("warning"))
    return 0


def _process_university(sf: SlugFiles, report: ParseReport, args: Args) -> int:
    file_label = f"universities/{sf.slug}"
    if sf.info_en is None or sf.majors_en is None:
        logger.warning("Skipping {} (missing required files)", file_label)
        return 0  # already reported by preflight
    n = 0
    if _process_university_locale(sf, "en", report, args, file_label):
        n += 1
    if sf.info_ar is not None:
        if _process_university_locale(sf, "ar", report, args, file_label):
            n += 1
    return n


def _process_university_locale(
    sf: SlugFiles,
    locale: str,
    report: ParseReport,
    args: Args,
    file_label: str,
) -> bool:
    info = sf.info_en if locale == "en" else sf.info_ar
    # When an Arabic info.docx exists but no Arabic majors.xlsx, fall back to
    # the English majors. Already warned about in preflight.
    majors = (
        sf.majors_en
        if locale == "en"
        else (sf.majors_ar if sf.majors_ar is not None else sf.majors_en)
    )
    assert info is not None and majors is not None

    logger.debug("[{}/{}] parsing {}", file_label, locale, info.name)

    info_path = sf.cache_paths.get(info.id)
    majors_path = sf.cache_paths.get(majors.id)
    if not info_path or not majors_path:
        report.error(
            file_label,
            "cache path missing — fetch did not download a file",
            web_view_link=info.web_view_link,
        )
        return False

    parsed = parse_docx(
        info_path,
        ParseDocxOptions(file_label=f"{file_label}/{info.name}", web_view_link=info.web_view_link),
        report,
    )
    if parsed is None:
        logger.error("[{}/{}] parse failed", file_label, locale)
        return False
    faculty_groups = parse_xlsx(
        majors_path,
        ParseXlsxOptions(file_label=f"{file_label}/{majors.name}", web_view_link=majors.web_view_link),
        report,
    )
    if faculty_groups is None:
        logger.error("[{}/{}] xlsx parse failed", file_label, locale)
        return False

    ctx = AssembleContext(
        slug=sf.slug,
        locale=locale,
        file_label=f"{file_label}/{info.name}",
        web_view_link=info.web_view_link,
        source_info_id=info.id,
        source_majors_id=majors.id,
    )
    ir = assemble_university(parsed, faculty_groups, ctx, report)
    if ir is None:
        logger.error("[{}/{}] assemble failed", file_label, locale)
        return False

    mdx = emit_university(ir)
    out_path = _prefixed(args.out_prefix, university_output_path(ir))
    if not args.dry_run:
        _write_output(out_path, mdx)
        logger.info("[{}/{}] -> {}", file_label, locale, out_path)
    else:
        logger.info("[{}/{}] OK (dry-run, would write {})", file_label, locale, out_path)
    return True


def _process_scholarship(sf: SlugFiles, report: ParseReport, args: Args) -> int:
    file_label = f"scholarships/{sf.slug}"
    if sf.info_en is None:
        logger.warning("Skipping {} (missing required info.docx)", file_label)
        return 0
    n = 0
    if _process_scholarship_locale(sf, "en", report, args, file_label):
        n += 1
    if sf.info_ar is not None:
        if _process_scholarship_locale(sf, "ar", report, args, file_label):
            n += 1
    return n


def _process_scholarship_locale(
    sf: SlugFiles,
    locale: str,
    report: ParseReport,
    args: Args,
    file_label: str,
) -> bool:
    info = sf.info_en if locale == "en" else sf.info_ar
    assert info is not None
    logger.debug("[{}/{}] parsing {}", file_label, locale, info.name)

    info_path = sf.cache_paths.get(info.id)
    if not info_path:
        report.error(
            file_label,
            "cache path missing — fetch did not download a file",
            web_view_link=info.web_view_link,
        )
        return False

    parsed = parse_docx(
        info_path,
        ParseDocxOptions(file_label=f"{file_label}/{info.name}", web_view_link=info.web_view_link),
        report,
    )
    if parsed is None:
        logger.error("[{}/{}] parse failed", file_label, locale)
        return False

    ctx = AssembleContext(
        slug=sf.slug,
        locale=locale,
        file_label=f"{file_label}/{info.name}",
        web_view_link=info.web_view_link,
        source_info_id=info.id,
    )
    ir = assemble_scholarship(parsed, ctx, report)
    if ir is None:
        logger.error("[{}/{}] assemble failed", file_label, locale)
        return False

    mdx = emit_scholarship(ir)
    out_path = _prefixed(args.out_prefix, scholarship_output_path(ir))
    if not args.dry_run:
        _write_output(out_path, mdx)
        logger.info("[{}/{}] -> {}", file_label, locale, out_path)
    else:
        logger.info("[{}/{}] OK (dry-run, would write {})", file_label, locale, out_path)
    return True


def _write_output(path: str, content: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def _prefixed(prefix: str, path: str) -> str:
    if not prefix:
        return path
    return os.path.join(prefix.rstrip("/"), path)


if __name__ == "__main__":
    sys.exit(main())
