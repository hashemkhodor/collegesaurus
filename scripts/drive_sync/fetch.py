"""Fetch stage: produces a `ContentTree` describing every page in the source.

Two source modes:
1. Google Drive (production): authenticate via service account, walk the
   content-root folder, download files into `.drive-cache/`.
2. Local mirror (`--content-root <path>`): walk the local directory tree
   with the same layout. Used for local dev and tests.

Design: spec/001-add-google-drive-backend-data/design.md §4.2, §5.3.
"""

from __future__ import annotations

import io
import json
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal
from urllib.parse import quote as urlquote

from loguru import logger

from drive_sync.models import is_valid_slug
from drive_sync.report import ParseReport


# A pasted Drive folder URL is a common copy-paste mistake. Strip the URL
# prefix so `GDRIVE_CONTENT_ROOT_ID=https://drive.google.com/drive/folders/<id>`
# also works.
_DRIVE_FOLDER_URL_RE = re.compile(r"https?://drive\.google\.com/drive/folders/([\w-]+)")


def _normalize_folder_id(value: str) -> str:
    m = _DRIVE_FOLDER_URL_RE.search(value)
    if m:
        return m.group(1)
    return value.strip()


Kind = Literal["university", "scholarship"]
Locale = Literal["en", "ar"]


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------


@dataclass
class DriveFileMeta:
    """Metadata for a single docx/xlsx in the content tree."""

    id: str
    """Drive file ID (or local absolute path in mirror mode)."""

    name: str
    mime_type: str
    modified_time: str
    md5_checksum: str | None = None
    web_view_link: str | None = None


@dataclass
class SlugFiles:
    slug: str
    kind: Kind
    info_en: DriveFileMeta | None = None
    """info.docx (English) — required for the page to be processed."""

    majors_en: DriveFileMeta | None = None
    """majors.xlsx (English) — required for universities."""

    info_ar: DriveFileMeta | None = None
    """info.ar.docx — optional Arabic counterpart."""

    majors_ar: DriveFileMeta | None = None
    """majors.ar.xlsx — optional Arabic counterpart (universities only)."""

    cache_paths: dict[str, str] = field(default_factory=dict)
    """File ID → local filesystem path (after download or mirror walk)."""


@dataclass
class ContentTree:
    universities: dict[str, SlugFiles] = field(default_factory=dict)
    scholarships: dict[str, SlugFiles] = field(default_factory=dict)


@dataclass
class FetchOptions:
    content_root_id: str | None
    """Drive folder ID — required when `local_path` is None."""

    local_path: str | None
    """Path to a local mirror directory — bypasses Drive when set."""

    service_account_json: str | None
    """Service account JSON string (full content of the key file)."""

    cache_dir: str = ".drive-cache"
    concurrency: int = 4


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def fetch_content_tree(options: FetchOptions, report: ParseReport) -> ContentTree:
    if options.local_path:
        logger.debug("Loading local mirror from {}", options.local_path)
        return load_local_content_root(options.local_path, report)
    if not options.service_account_json or not options.content_root_id:
        raise RuntimeError(
            "fetch_content_tree: must provide either local_path, "
            "or both service_account_json and content_root_id"
        )
    drive = auth_drive(options.service_account_json)
    folder_id = _normalize_folder_id(options.content_root_id)
    if folder_id != options.content_root_id:
        logger.warning(
            "GDRIVE_CONTENT_ROOT_ID looks like a URL — stripped to folder id {}",
            folder_id,
        )
    tree = list_content_root(drive, folder_id, report)
    download_all(drive, tree, options.cache_dir, options.concurrency)
    return tree


# ---------------------------------------------------------------------------
# T-2.1 — Auth
# ---------------------------------------------------------------------------


_DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def _make_credentials(service_account_json: str):
    """Parse the JSON key into google-auth Credentials."""
    from google.oauth2 import service_account

    info = json.loads(service_account_json)
    return info, service_account.Credentials.from_service_account_info(info, scopes=_DRIVE_SCOPES)


def _build_service(credentials):
    """Build a fresh Drive v3 service with a private httplib2.Http.

    Each call returns an independent service safe to use from a single
    thread — `httplib2.Http` is NOT thread-safe, so download workers must
    not share a service object.
    """
    import httplib2
    from google_auth_httplib2 import AuthorizedHttp
    from googleapiclient.discovery import build

    http = AuthorizedHttp(credentials, http=httplib2.Http())
    # cache_discovery=False suppresses the "file_cache not supported" warning.
    return build("drive", "v3", http=http, cache_discovery=False)


def auth_drive(service_account_json: str):
    """Returns an authenticated Drive v3 service object.

    The returned object is safe for single-threaded use (e.g. the listing
    walk in `list_content_root`). Concurrent downloads in `download_all`
    create their own per-thread services via the credentials stashed on
    the returned object.
    """
    info, creds = _make_credentials(service_account_json)
    logger.info("Authenticating as service account {}", info.get("client_email", "<unknown>"))
    service = _build_service(creds)
    # Stash the credentials so `download_all` can build per-thread services
    # without re-parsing the JSON key. (Custom attribute; safe — google's
    # service object is just a regular Python object.)
    service._drive_sync_credentials = creds
    return service


# ---------------------------------------------------------------------------
# T-2.2 — List
# ---------------------------------------------------------------------------


_FOLDER_MIME = "application/vnd.google-apps.folder"


def list_content_root(drive, root_id: str, report: ParseReport) -> ContentTree:
    """Walk the content-root folder tree and classify files per slug+locale."""
    logger.info("Listing content root {}", root_id)
    tree = ContentTree()

    try:
        top_level = _list_children(drive, root_id)
    except _DriveHttpError as err:
        if err.status == 403:
            raise RuntimeError(
                f"Service account cannot read content-root folder {root_id}. "
                f"Re-share at Viewer permission. ({err})"
            ) from err
        if err.status == 404:
            raise RuntimeError(
                f"Drive folder {root_id} not found (404). "
                f"Check GDRIVE_CONTENT_ROOT_ID; it should be the ID, not the URL."
            ) from err
        raise

    for top in top_level:
        if top.get("mimeType") != _FOLDER_MIME:
            continue
        name = top.get("name", "")
        kind: Kind | None = (
            "university"
            if name == "universities"
            else "scholarship"
            if name == "scholarships"
            else None
        )
        if kind is None:
            logger.debug("Ignoring top-level entry {!r} (not universities/scholarships)", name)
            continue

        slug_folders = _list_children(drive, top["id"])
        valid_slugs = 0
        for slug_folder in slug_folders:
            if slug_folder.get("mimeType") != _FOLDER_MIME:
                continue
            slug = slug_folder.get("name", "")
            if not is_valid_slug(slug):
                report.error(
                    f"{name}/{slug}/",
                    f'slug "{slug}" must be lowercase ASCII letters/digits/hyphens — folder skipped',
                )
                continue
            files = _list_children(drive, slug_folder["id"])
            sf = _classify_slug_files(slug, kind, files)
            if kind == "university":
                tree.universities[slug] = sf
            else:
                tree.scholarships[slug] = sf
            valid_slugs += 1
            logger.debug(
                "Found {}/{} ({} file{})",
                name, slug, len(files), "" if len(files) == 1 else "s",
            )
        logger.info("Listed {}: {} slug{}", name, valid_slugs, "" if valid_slugs == 1 else "s")

    return tree


def _list_children(drive, parent_id: str) -> list[dict]:
    """Paginated `drive.files().list()` for one parent folder."""
    out: list[dict] = []
    page_token: str | None = None
    fields = (
        "nextPageToken, files(id, name, mimeType, modifiedTime, "
        "md5Checksum, webViewLink, parents)"
    )
    while True:
        try:
            resp = _with_retry(
                lambda: drive.files()
                .list(
                    q=f"'{parent_id}' in parents and trashed = false",
                    fields=fields,
                    pageSize=200,
                    pageToken=page_token,
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True,
                )
                .execute()
            )
        except Exception as err:
            from googleapiclient.errors import HttpError

            if isinstance(err, HttpError):
                raise _DriveHttpError(err) from err
            raise
        out.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return out


def _classify_slug_files(slug: str, kind: Kind, files: list[dict]) -> SlugFiles:
    sf = SlugFiles(slug=slug, kind=kind)
    for f in files:
        meta = _to_drive_file_meta(f)
        if meta is None:
            continue
        lower = meta.name.lower()
        if lower == "info.docx":
            sf.info_en = meta
        elif lower == "info.ar.docx":
            sf.info_ar = meta
        elif kind == "university" and lower == "majors.xlsx":
            sf.majors_en = meta
        elif kind == "university" and lower == "majors.ar.xlsx":
            sf.majors_ar = meta
    return sf


def _to_drive_file_meta(f: dict) -> DriveFileMeta | None:
    if not (f.get("id") and f.get("name") and f.get("mimeType") and f.get("modifiedTime")):
        return None
    return DriveFileMeta(
        id=f["id"],
        name=f["name"],
        mime_type=f["mimeType"],
        modified_time=f["modifiedTime"],
        md5_checksum=f.get("md5Checksum"),
        web_view_link=f.get("webViewLink"),
    )


# ---------------------------------------------------------------------------
# T-2.3 — Download
# ---------------------------------------------------------------------------


def download_all(drive, tree: ContentTree, cache_dir: str, concurrency: int) -> None:
    """Download every classified file into `cache_dir`. Concurrent + retry.

    Each worker thread builds its own Drive service via thread-local storage,
    so downloads actually run in parallel — `httplib2.Http` (the transport
    underneath googleapiclient) is not thread-safe, and a shared service
    serializes all workers onto a single connection.
    """
    os.makedirs(cache_dir, exist_ok=True)

    jobs: list[tuple[SlugFiles, DriveFileMeta]] = []
    for kind_map in (tree.universities, tree.scholarships):
        for sf in kind_map.values():
            for meta in (sf.info_en, sf.majors_en, sf.info_ar, sf.majors_ar):
                if meta is not None:
                    jobs.append((sf, meta))

    if not jobs:
        logger.info("No files to download")
        return

    logger.info(
        "Downloading {} file{} into {} (concurrency={})",
        len(jobs), "" if len(jobs) == 1 else "s", cache_dir, concurrency,
    )
    started = time.monotonic()

    creds = getattr(drive, "_drive_sync_credentials", None)
    if creds is None:
        raise RuntimeError(
            "download_all: Drive service is missing `_drive_sync_credentials` — "
            "build it via auth_drive() so per-thread clients can be created."
        )

    thread_local = threading.local()

    def get_thread_service():
        svc = getattr(thread_local, "drive", None)
        if svc is None:
            svc = _build_service(creds)
            thread_local.drive = svc
            logger.debug(
                "Built thread-local Drive service for thread {}",
                threading.current_thread().name,
            )
        return svc

    def fetch_one(job) -> str:
        sf, meta = job
        folder = "universities" if sf.kind == "university" else "scholarships"
        local_dir = os.path.join(cache_dir, folder, sf.slug)
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, meta.name)
        rel = f"{folder}/{sf.slug}/{meta.name}"
        t0 = time.monotonic()
        ts = get_thread_service()
        _with_retry(lambda: _download_file(ts, meta.id, local_path))
        sf.cache_paths[meta.id] = local_path
        logger.debug("Downloaded {} in {:.2f}s", rel, time.monotonic() - t0)
        return rel

    with ThreadPoolExecutor(
        max_workers=max(1, concurrency),
        thread_name_prefix="drive-dl",
    ) as pool:
        futures = [pool.submit(fetch_one, j) for j in jobs]
        for fut in as_completed(futures):
            fut.result()  # surface exceptions

    elapsed = time.monotonic() - started
    rate = len(jobs) / elapsed if elapsed > 0 else 0
    logger.info(
        "Downloaded {} file(s) in {:.1f}s ({:.1f} files/s)",
        len(jobs), elapsed, rate,
    )


def _download_file(drive, file_id: str, local_path: str) -> None:
    from googleapiclient.http import MediaIoBaseDownload

    request = drive.files().get_media(fileId=file_id, supportsAllDrives=True)
    buf = io.FileIO(local_path, "wb")
    try:
        downloader = MediaIoBaseDownload(buf, request)
        done = False
        while not done:
            _status, done = downloader.next_chunk()
    finally:
        buf.close()


# ---------------------------------------------------------------------------
# T-2.4 — Local mirror mode
# ---------------------------------------------------------------------------


_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def load_local_content_root(root_path: str, report: ParseReport) -> ContentTree:
    """Walk a local mirror directory the same way list_content_root walks Drive."""
    root = Path(root_path).resolve()
    tree = ContentTree()

    for folder, kind in (("universities", "university"), ("scholarships", "scholarship")):
        kind_dir = root / folder
        if not kind_dir.is_dir():
            continue
        for slug_dir in sorted(kind_dir.iterdir()):
            if not slug_dir.is_dir():
                continue
            slug = slug_dir.name
            if not is_valid_slug(slug):
                report.error(
                    f"{folder}/{slug}/",
                    f'slug "{slug}" must be lowercase ASCII letters/digits/hyphens — folder skipped',
                )
                continue
            sf = SlugFiles(slug=slug, kind=kind)
            for entry in sorted(slug_dir.iterdir()):
                if not entry.is_file():
                    continue
                lower = entry.name.lower()
                meta = DriveFileMeta(
                    id=str(entry),
                    name=entry.name,
                    mime_type=(
                        _DOCX_MIME
                        if lower.endswith(".docx")
                        else _XLSX_MIME
                        if lower.endswith(".xlsx")
                        else "application/octet-stream"
                    ),
                    modified_time=time.strftime(
                        "%Y-%m-%dT%H:%M:%SZ", time.gmtime(entry.stat().st_mtime)
                    ),
                    web_view_link=f"file://{urlquote(str(entry))}",
                )
                if lower == "info.docx":
                    sf.info_en = meta
                elif lower == "info.ar.docx":
                    sf.info_ar = meta
                elif kind == "university" and lower == "majors.xlsx":
                    sf.majors_en = meta
                elif kind == "university" and lower == "majors.ar.xlsx":
                    sf.majors_ar = meta
                sf.cache_paths[meta.id] = str(entry)
            if kind == "university":
                tree.universities[slug] = sf
            else:
                tree.scholarships[slug] = sf
    return tree


# ---------------------------------------------------------------------------
# T-2.5 — Pre-flight checks
# ---------------------------------------------------------------------------


def preflight_check(tree: ContentTree, report: ParseReport) -> None:
    """Fail loudly on suspicious tree state."""
    info_count = sum(1 for sf in tree.universities.values() if sf.info_en) + sum(
        1 for sf in tree.scholarships.values() if sf.info_en
    )
    if info_count == 0:
        raise RuntimeError(
            "Drive content root appears empty (no info.docx files found) — refusing to emit. "
            "If this is intentional, delete the legacy MDX files manually."
        )

    for slug, sf in tree.universities.items():
        if sf.info_en is None:
            report.error(f"universities/{slug}/", "missing required `info.docx`")
        if sf.majors_en is None:
            report.error(f"universities/{slug}/", "missing required `majors.xlsx`")
        if sf.info_ar is not None and sf.majors_ar is None:
            report.warn(
                f"universities/{slug}/",
                "has `info.ar.docx` but no `majors.ar.xlsx` — Arabic page will fall back to English majors",
            )
    for slug, sf in tree.scholarships.items():
        if sf.info_en is None:
            report.error(f"scholarships/{slug}/", "missing required `info.docx`")


# ---------------------------------------------------------------------------
# Retry + error helpers
# ---------------------------------------------------------------------------


_RETRY_DELAYS_S = (0.25, 0.5, 1.0)


def _with_retry(fn):
    """Run `fn`; retry on transient HTTP errors (429, 5xx) with exponential backoff."""
    import random

    last_err: BaseException | None = None
    for attempt in range(len(_RETRY_DELAYS_S) + 1):
        try:
            return fn()
        except Exception as err:
            last_err = err
            if attempt >= len(_RETRY_DELAYS_S):
                break
            if not _is_retryable(err):
                break
            time.sleep(_RETRY_DELAYS_S[attempt] + random.random() * 0.1)
    assert last_err is not None
    raise last_err


def _is_retryable(err: BaseException) -> bool:
    from googleapiclient.errors import HttpError

    if isinstance(err, HttpError):
        status = err.resp.status if err.resp else 0
        return status == 429 or 500 <= status < 600
    msg = str(err)
    return any(s in msg for s in ("ECONNRESET", "ETIMEDOUT", "ENETUNREACH"))


class _DriveHttpError(RuntimeError):
    def __init__(self, http_error) -> None:
        self.status = http_error.resp.status if http_error.resp else 0
        super().__init__(str(http_error))
