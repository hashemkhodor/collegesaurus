"""CLI entry point for `python -m drive_sync`.

Flags:
    --content-root <path>     Read from a local mirror dir instead of Drive.
    --content-prefix <name>   Folder under the root holding the content tree
                              (default `v2`; pass "" for the pre-v2 flat layout).
    --year <YYYY-YYYY>        Process only one academic year.
    --only <slug>             Process only one slug (e.g. `aub`).
    --validate                Structural check only: walk the tree and report.
                              Downloads nothing, parses nothing, writes nothing.
    --dry-run                 Parse + validate, do not write MDX.
    --cache-dir <path>        Override default `.drive-cache/`.
    --out-prefix <path>       Write output under <path>/ (round-trip / dev only).

Env vars (Drive mode):
    GDRIVE_SERVICE_ACCOUNT_JSON        Service-account key (full JSON content).
    GDRIVE_SERVICE_ACCOUNT_JSON_FILE   Path to the key file (alternative).
    GDRIVE_CONTENT_ROOT_ID             Drive folder ID for the content root.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from loguru import logger

from drive_sync.emit.scholarship import emit_scholarship
from drive_sync.emit.university import emit_university
from drive_sync.emit.versions import (
    VersionPlan,
    plan_versions,
    write_version_manifests,
)
from drive_sync.fetch import (
    DEFAULT_CONTENT_PREFIX,
    ContentTree,
    FetchOptions,
    LocalSource,
    SlugFiles,
    build_content_tree,
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
    content_prefix: str
    year: str | None
    only: str | None
    validate: bool
    dry_run: bool
    cache_dir: str
    out_prefix: str
    verbose: bool


def _parse_args(argv: list[str]) -> Args:
    p = argparse.ArgumentParser(prog="drive_sync")
    p.add_argument("--content-root", default=None)
    p.add_argument(
        "--content-prefix",
        default=os.environ.get("GDRIVE_CONTENT_PREFIX", DEFAULT_CONTENT_PREFIX),
        help='folder under the content root holding the tree (default "v2")',
    )
    p.add_argument("--year", default=None, help="process only this academic year")
    p.add_argument("--only", default=None)
    p.add_argument(
        "--validate",
        action="store_true",
        help="structural + schema check only; downloads nothing, writes nothing",
    )
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--cache-dir", default=".drive-cache")
    p.add_argument("--out-prefix", default="")
    p.add_argument("-v", "--verbose", action="store_true", help="enable DEBUG-level logging")
    ns = p.parse_args(argv)
    return Args(
        content_root=ns.content_root,
        content_prefix=ns.content_prefix,
        year=ns.year,
        only=ns.only,
        validate=ns.validate,
        dry_run=ns.dry_run,
        cache_dir=ns.cache_dir,
        out_prefix=ns.out_prefix,
        verbose=ns.verbose,
    )


def _service_account_json() -> str | None:
    """Accept the key inline or as a path, so a `.env` per .env.example works."""
    inline = os.environ.get("GDRIVE_SERVICE_ACCOUNT_JSON")
    if inline:
        return inline
    key_file = os.environ.get("GDRIVE_SERVICE_ACCOUNT_JSON_FILE")
    if key_file:
        expanded = os.path.expanduser(key_file)
        if os.path.isfile(expanded):
            return Path(expanded).read_text(encoding="utf-8")
        logger.warning("GDRIVE_SERVICE_ACCOUNT_JSON_FILE points at a missing file: {}", expanded)
    return None


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    _configure_logging(args.verbose)
    report = ParseReport()

    started = time.monotonic()
    if args.content_root:
        logger.info("Source: local mirror at {}", args.content_root)
    else:
        logger.info(
            "Source: Google Drive (folder {})",
            os.environ.get("GDRIVE_CONTENT_ROOT_ID", "<unset>"),
        )
    logger.info("Content prefix: {}", args.content_prefix or "<none>")
    if args.validate:
        logger.info("Mode: validate (structure only; no download, no parse, no write)")
    elif args.dry_run:
        logger.info("Mode: dry-run (parse + validate; nothing written)")
    if args.out_prefix:
        logger.info("Output prefix: {}", args.out_prefix)
    if args.year:
        logger.info("Filter: --year {}", args.year)
    if args.only:
        logger.info("Filter: --only {}", args.only)

    logger.info("Stage 1/4: building content tree")
    tree = _build_tree(args, report)
    logger.info(
        "Found {} slug(s) across years: {}",
        tree.count(),
        ", ".join(sorted(set(tree.years("university")) | set(tree.years("scholarship")), reverse=True))
        or "<none>",
    )

    logger.info("Stage {}: pre-flight checks", "2/2" if args.validate else "2/4")
    preflight_check(tree, report)

    if not args.validate:
        logger.info("Stage 3/4: parsing + emitting")
        plan = plan_versions(tree, only_year=args.year)
        n_emitted = _process(plan, report, args)
        logger.info("Wrote {} file{}", n_emitted, "" if n_emitted == 1 else "s")

        if not args.dry_run:
            write_version_manifests(plan, args.out_prefix)

        logger.info("Stage 4/4: writing report")

    report.print()
    if not args.validate:
        report.write_json("parse-report.json")

    elapsed = time.monotonic() - started
    if report.has_errors():
        logger.error(
            "drive_sync FAILED in {:.1f}s ({} errors, {} warnings)",
            elapsed, report.count("error"), report.count("warning"),
        )
        return 1
    logger.success("drive_sync OK in {:.1f}s ({} warnings)", elapsed, report.count("warning"))
    return 0


def _build_tree(args: Args, report: ParseReport) -> ContentTree:
    if args.validate:
        if not args.content_root:
            from drive_sync.fetch import DriveSource, auth_drive, _normalize_folder_id

            key = _service_account_json()
            root_id = os.environ.get("GDRIVE_CONTENT_ROOT_ID")
            if not key or not root_id:
                raise RuntimeError(
                    "--validate against Drive needs GDRIVE_CONTENT_ROOT_ID and a "
                    "service-account key (GDRIVE_SERVICE_ACCOUNT_JSON[_FILE])"
                )
            source = DriveSource(auth_drive(key), _normalize_folder_id(root_id))
        else:
            source = LocalSource(args.content_root)
        return build_content_tree(source, args.content_prefix, report)

    options = FetchOptions(
        content_root_id=os.environ.get("GDRIVE_CONTENT_ROOT_ID"),
        local_path=args.content_root,
        service_account_json=_service_account_json(),
        cache_dir=args.cache_dir,
        content_prefix=args.content_prefix,
    )
    return fetch_content_tree(options, report)


def _process(plan: VersionPlan, report: ParseReport, args: Args) -> int:
    n = 0
    for entry in plan.entries:
        sf = entry.files
        if args.only and sf.slug != args.only and f"{sf.label}" != args.only:
            continue
        if sf.kind == "university":
            n += _process_university(entry, report, args)
        else:
            n += _process_scholarship(entry, report, args)
    return n


def _process_university(entry, report: ParseReport, args: Args) -> int:
    sf = entry.files
    if sf.info_en is None or sf.majors_en is None:
        logger.warning("Skipping {} (missing required files)", sf.label)
        return 0
    n = 0
    if _process_university_locale(entry, "en", report, args):
        n += 1
    if sf.info_ar is not None:
        if _process_university_locale(entry, "ar", report, args):
            n += 1
    return n


def _process_university_locale(entry, locale: str, report: ParseReport, args: Args) -> bool:
    sf: SlugFiles = entry.files
    info = sf.info_en if locale == "en" else sf.info_ar
    majors = (
        sf.majors_en
        if locale == "en"
        else (sf.majors_ar if sf.majors_ar is not None else sf.majors_en)
    )
    assert info is not None and majors is not None

    label = f"{sf.label}/{locale}"
    logger.debug("[{}] parsing {}", label, info.name)

    info_path = sf.cache_paths.get(info.id)
    majors_path = sf.cache_paths.get(majors.id)
    if not info_path or not majors_path:
        report.error(
            sf.label,
            "cache path missing — fetch did not download a file",
            web_view_link=info.web_view_link,
        )
        return False

    parsed = parse_docx(
        info_path,
        ParseDocxOptions(file_label=f"{sf.label}/{info.name}", web_view_link=info.web_view_link),
        report,
    )
    if parsed is None:
        logger.error("[{}] parse failed", label)
        return False
    faculty_groups = parse_xlsx(
        majors_path,
        ParseXlsxOptions(file_label=f"{sf.label}/{majors.name}", web_view_link=majors.web_view_link),
        report,
    )
    if faculty_groups is None:
        logger.error("[{}] xlsx parse failed", label)
        return False

    ctx = AssembleContext(
        slug=sf.slug,
        locale=locale,
        file_label=f"{sf.label}/{info.name}",
        web_view_link=info.web_view_link,
        source_info_id=info.id,
        source_majors_id=majors.id,
    )
    ir = assemble_university(parsed, faculty_groups, ctx, report)
    if ir is None:
        logger.error("[{}] assemble failed", label)
        return False

    mdx = emit_university(ir, stale_from=entry.stale_from, year=entry.year)
    return _write(entry.output_path(locale), mdx, label, args)


def _process_scholarship(entry, report: ParseReport, args: Args) -> int:
    sf = entry.files
    if sf.info_en is None:
        logger.warning("Skipping {} (missing required info.docx)", sf.label)
        return 0
    n = 0
    if _process_scholarship_locale(entry, "en", report, args):
        n += 1
    if sf.info_ar is not None:
        if _process_scholarship_locale(entry, "ar", report, args):
            n += 1
    return n


def _process_scholarship_locale(entry, locale: str, report: ParseReport, args: Args) -> bool:
    sf: SlugFiles = entry.files
    info = sf.info_en if locale == "en" else sf.info_ar
    assert info is not None
    label = f"{sf.label}/{locale}"
    logger.debug("[{}] parsing {}", label, info.name)

    info_path = sf.cache_paths.get(info.id)
    if not info_path:
        report.error(
            sf.label,
            "cache path missing — fetch did not download a file",
            web_view_link=info.web_view_link,
        )
        return False

    parsed = parse_docx(
        info_path,
        ParseDocxOptions(file_label=f"{sf.label}/{info.name}", web_view_link=info.web_view_link),
        report,
    )
    if parsed is None:
        logger.error("[{}] parse failed", label)
        return False

    ctx = AssembleContext(
        slug=sf.slug,
        locale=locale,
        file_label=f"{sf.label}/{info.name}",
        web_view_link=info.web_view_link,
        source_info_id=info.id,
    )
    ir = assemble_scholarship(parsed, ctx, report)
    if ir is None:
        logger.error("[{}] assemble failed", label)
        return False

    mdx = emit_scholarship(ir, stale_from=entry.stale_from, year=entry.year)
    return _write(entry.output_path(locale), mdx, label, args)


def _write(out_path: str, content: str, label: str, args: Args) -> bool:
    full = _prefixed(args.out_prefix, out_path)
    if args.validate or args.dry_run:
        logger.info("[{}] OK (would write {})", label, full)
        return True
    p = Path(full)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    logger.info("[{}] -> {}", label, full)
    return True


def _prefixed(prefix: str, path: str) -> str:
    if not prefix:
        return path
    return os.path.join(prefix.rstrip("/"), path)


if __name__ == "__main__":
    sys.exit(main())
