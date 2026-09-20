"""Fetch stage: produces a `ContentTree` describing every page in the source.

The content root is walked as:

    <root>/<content_prefix>/<kind>/<year>/<slug>/<files>

`content_prefix` defaults to `v2`; pass "" to read a pre-v2 (flat) tree, which
has no year level.

Two source modes, behind one walk:
1. Google Drive (production): authenticate via service account, walk the
   content-root folder, download files into `.drive-cache/`.
2. Local mirror (`--content-root <path>`): the same layout on disk. Used for
   local dev and tests.
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
from typing import Iterator, Literal, Protocol
from urllib.parse import quote as urlquote

from loguru import logger

from drive_sync.models import is_valid_slug
from drive_sync.report import ParseReport


_DRIVE_FOLDER_URL_RE = re.compile(r"https?://drive\.google\.com/drive/folders/([\w-]+)")


def _normalize_folder_id(value: str) -> str:
    m = _DRIVE_FOLDER_URL_RE.search(value)
    if m:
        return m.group(1)
    return value.strip()


Kind = Literal["university", "scholarship"]
Locale = Literal["en", "ar"]

DEFAULT_CONTENT_PREFIX = "v2"

KIND_BY_DIR: dict[str, Kind] = {
    "universities": "university",
    "scholarships": "scholarship",
}
DIR_BY_KIND: dict[Kind, str] = {v: k for k, v in KIND_BY_DIR.items()}

IGNORED_TOP_LEVEL = frozenset({"templates"})

ATTACHMENTS_DIR = "attachments"

YEAR_RE = re.compile(r"^\d{4}-\d{4}$")

UNVERSIONED_YEAR = "unversioned"

_RECOGNIZED_UNIVERSITY = ("info.docx", "info.ar.docx", "majors.xlsx", "majors.ar.xlsx")
_RECOGNIZED_SCHOLARSHIP = ("info.docx", "info.ar.docx")


def is_valid_year(name: str) -> bool:
    return bool(YEAR_RE.fullmatch(name))


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------


@dataclass
class DriveFileMeta:
    """Metadata for a single file in the content tree."""

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
    year: str

    info_en: DriveFileMeta | None = None
    """info.docx (English) — required for the page to be processed."""

    majors_en: DriveFileMeta | None = None
    """majors.xlsx (English) — required for universities."""

    info_ar: DriveFileMeta | None = None
    """info.ar.docx — optional Arabic counterpart."""

    majors_ar: DriveFileMeta | None = None
    """majors.ar.xlsx — optional Arabic counterpart (universities only)."""

    attachments: list[DriveFileMeta] = field(default_factory=list)
    """Files under `<slug>/attachments/`, published as static assets."""

    cache_paths: dict[str, str] = field(default_factory=dict)
    """File ID → local filesystem path (after download or mirror walk)."""

    @property
    def label(self) -> str:
        """Report label, e.g. `universities/2025-2026/aub`."""
        return f"{DIR_BY_KIND[self.kind]}/{self.year}/{self.slug}"


@dataclass
class ContentTree:
    """Every slug in the source, keyed by year then slug."""

    universities: dict[str, dict[str, SlugFiles]] = field(default_factory=dict)
    scholarships: dict[str, dict[str, SlugFiles]] = field(default_factory=dict)

    def kind_map(self, kind: Kind) -> dict[str, dict[str, SlugFiles]]:
        return self.universities if kind == "university" else self.scholarships

    def add(self, sf: SlugFiles) -> None:
        self.kind_map(sf.kind).setdefault(sf.year, {})[sf.slug] = sf

    def years(self, kind: Kind) -> list[str]:
        """Years present for a kind, newest first."""
        return sorted(self.kind_map(kind), reverse=True)

    def latest_year(self, kind: Kind) -> str | None:
        years = self.years(kind)
        return years[0] if years else None

    def iter_slugs(self) -> Iterator[SlugFiles]:
        for kind_map in (self.universities, self.scholarships):
            for year in sorted(kind_map, reverse=True):
                for slug in sorted(kind_map[year]):
                    yield kind_map[year][slug]

    def count(self) -> int:
        return sum(1 for _ in self.iter_slugs())


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
    content_prefix: str = DEFAULT_CONTENT_PREFIX


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------


@dataclass
class Entry:
    """One child of a folder, from either backend."""

    id: str
    name: str
    is_dir: bool
    meta: DriveFileMeta | None = None


class Source(Protocol):
    root_id: str

    def children(self, parent_id: str) -> list[Entry]: ...


_FOLDER_MIME = "application/vnd.google-apps.folder"
_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class DriveSource:
    """Lists a Google Drive folder tree."""

    def __init__(self, drive, root_id: str) -> None:
        self.drive = drive
        self.root_id = root_id

    def children(self, parent_id: str) -> list[Entry]:
        out: list[Entry] = []
        for f in _list_children(self.drive, parent_id):
            is_dir = f.get("mimeType") == _FOLDER_MIME
            meta = None if is_dir else _to_drive_file_meta(f)
            if not is_dir and meta is None:
                continue
            out.append(Entry(id=f["id"], name=f.get("name", ""), is_dir=is_dir, meta=meta))
        return out


class LocalSource:
    """Lists a local mirror directory with the same layout."""

    def __init__(self, root_path: str) -> None:
        self.root_id = str(Path(root_path).resolve())

    def children(self, parent_id: str) -> list[Entry]:
        base = Path(parent_id)
        if not base.is_dir():
            return []
        out: list[Entry] = []
        for entry in sorted(base.iterdir()):
            if entry.is_dir():
                out.append(Entry(id=str(entry), name=entry.name, is_dir=True))
                continue
            if not entry.is_file():
                continue
            lower = entry.name.lower()
            mime = (
                _DOCX_MIME
                if lower.endswith(".docx")
                else _XLSX_MIME
                if lower.endswith(".xlsx")
                else "application/octet-stream"
            )
            meta = DriveFileMeta(
                id=str(entry),
                name=entry.name,
                mime_type=mime,
                modified_time=time.strftime(
                    "%Y-%m-%dT%H:%M:%SZ", time.gmtime(entry.stat().st_mtime)
                ),
                web_view_link=f"file://{urlquote(str(entry))}",
            )
            out.append(Entry(id=str(entry), name=entry.name, is_dir=False, meta=meta))
        return out


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------


def fetch_content_tree(options: FetchOptions, report: ParseReport) -> ContentTree:
    """Build the tree, downloading into the cache when reading from Drive."""
    if options.local_path:
        logger.debug("Loading local mirror from {}", options.local_path)
        source: Source = LocalSource(options.local_path)
        tree = build_content_tree(source, options.content_prefix, report)
        _record_local_cache_paths(tree)
        return tree

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
    source = DriveSource(drive, folder_id)
    tree = build_content_tree(source, options.content_prefix, report)
    download_all(drive, tree, options.cache_dir, options.concurrency)
    return tree


def load_local_content_root(
    root_path: str,
    report: ParseReport,
    content_prefix: str = DEFAULT_CONTENT_PREFIX,
) -> ContentTree:
    """Walk a local mirror directory. Kept as a named entry point for tests."""
    tree = build_content_tree(LocalSource(root_path), content_prefix, report)
    _record_local_cache_paths(tree)
    return tree


def _record_local_cache_paths(tree: ContentTree) -> None:
    """In mirror mode the file id *is* the path, so the cache map is identity."""
    for sf in tree.iter_slugs():
        for meta in _all_files(sf):
            sf.cache_paths[meta.id] = meta.id


def _all_files(sf: SlugFiles) -> Iterator[DriveFileMeta]:
    for meta in (sf.info_en, sf.majors_en, sf.info_ar, sf.majors_ar):
        if meta is not None:
            yield meta
    yield from sf.attachments


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------


def build_content_tree(source: Source, content_prefix: str, report: ParseReport) -> ContentTree:
    """Walk <root>/<prefix>/<kind>/<year>/<slug>/ and classify every file.

    With `content_prefix=""` the year level is absent (pre-v2 layout) and every
    slug is filed under `UNVERSIONED_YEAR`.
    """
    tree = ContentTree()

    root_id = _resolve_prefix(source, content_prefix, report)
    if root_id is None:
        return tree

    for kind_entry in source.children(root_id):
        if not kind_entry.is_dir:
            continue
        kind = KIND_BY_DIR.get(kind_entry.name)
        if kind is None:
            if kind_entry.name not in IGNORED_TOP_LEVEL:
                report.warn(
                    f"{kind_entry.name}/",
                    "not `universities` or `scholarships` — folder skipped",
                )
            else:
                logger.debug("Ignoring top-level entry {!r}", kind_entry.name)
            continue

        if content_prefix:
            for year_entry in source.children(kind_entry.id):
                if not year_entry.is_dir:
                    report.warn(
                        f"{kind_entry.name}/{year_entry.name}",
                        "file at the year level — expected a year folder; skipped",
                    )
                    continue
                if not is_valid_year(year_entry.name):
                    report.warn(
                        f"{kind_entry.name}/{year_entry.name}/",
                        "not an academic year like `2025-2026` — folder skipped",
                    )
                    continue
                _walk_year(source, kind_entry.name, kind, year_entry, tree, report)
        else:
            _collect_slugs(source, kind_entry.name, kind, UNVERSIONED_YEAR, kind_entry.id, tree, report)

        years = tree.years(kind)
        logger.info(
            "Listed {}: {} slug(s) across {} year(s)",
            kind_entry.name,
            sum(len(tree.kind_map(kind)[y]) for y in years),
            len(years),
        )

    return tree


def _resolve_prefix(source: Source, content_prefix: str, report: ParseReport) -> str | None:
    """Descend into the `content_prefix` folder. Returns None if it is missing."""
    if not content_prefix:
        return source.root_id
    for entry in source.children(source.root_id):
        if entry.is_dir and entry.name == content_prefix:
            return entry.id
    report.error(
        f"{content_prefix}/",
        f"content prefix folder `{content_prefix}` not found under the content root",
    )
    return None


def _walk_year(
    source: Source,
    kind_dir: str,
    kind: Kind,
    year_entry: Entry,
    tree: ContentTree,
    report: ParseReport,
) -> None:
    _collect_slugs(source, kind_dir, kind, year_entry.name, year_entry.id, tree, report)


def _collect_slugs(
    source: Source,
    kind_dir: str,
    kind: Kind,
    year: str,
    parent_id: str,
    tree: ContentTree,
    report: ParseReport,
) -> None:
    for slug_entry in source.children(parent_id):
        if not slug_entry.is_dir:
            continue
        slug = slug_entry.name
        where = f"{kind_dir}/{year}/{slug}/" if year != UNVERSIONED_YEAR else f"{kind_dir}/{slug}/"
        if not is_valid_slug(slug):
            report.error(
                where,
                f'slug "{slug}" must be lowercase ASCII letters/digits/hyphens — folder skipped',
            )
            continue
        sf = SlugFiles(slug=slug, kind=kind, year=year)
        _classify(source, sf, slug_entry.id, where, report)
        tree.add(sf)
        logger.debug("Found {}", where)


def _classify(
    source: Source,
    sf: SlugFiles,
    slug_id: str,
    where: str,
    report: ParseReport,
) -> None:
    """Sort a slug folder's children into the recognized slots."""
    recognized = (
        _RECOGNIZED_UNIVERSITY if sf.kind == "university" else _RECOGNIZED_SCHOLARSHIP
    )
    for entry in source.children(slug_id):
        if entry.is_dir:
            if entry.name.lower() == ATTACHMENTS_DIR:
                for att in source.children(entry.id):
                    if not att.is_dir and att.meta is not None:
                        sf.attachments.append(att.meta)
            else:
                report.warn(where, f"unexpected subfolder `{entry.name}/` — ignored")
            continue

        meta = entry.meta
        if meta is None:
            continue
        lower = meta.name.lower()
        if lower not in recognized:
            report.warn(
                where,
                f"`{meta.name}` is not a recognized content file and is ignored — "
                f"move it into `{ATTACHMENTS_DIR}/` to publish it",
                web_view_link=meta.web_view_link,
            )
            continue
        if lower == "info.docx":
            sf.info_en = meta
        elif lower == "info.ar.docx":
            sf.info_ar = meta
        elif lower == "majors.xlsx":
            sf.majors_en = meta
        elif lower == "majors.ar.xlsx":
            sf.majors_ar = meta


# ---------------------------------------------------------------------------
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
    return build("drive", "v3", http=http, cache_discovery=False)


def auth_drive(service_account_json: str):
    """Returns an authenticated Drive v3 service object.

    The returned object is safe for single-threaded use (e.g. the listing
    walk). Concurrent downloads in `download_all` create their own per-thread
    services via the credentials stashed on the returned object.
    """
    info, creds = _make_credentials(service_account_json)
    logger.info("Authenticating as service account {}", info.get("client_email", "<unknown>"))
    service = _build_service(creds)
    service._drive_sync_credentials = creds
    return service


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------


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
                raise _translate_http_error(err, parent_id) from err
            raise
        out.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return out


def _translate_http_error(err, folder_id: str) -> Exception:
    status = err.resp.status if err.resp else 0
    if status == 403:
        return RuntimeError(
            f"Service account cannot read folder {folder_id}. "
            f"Re-share at Viewer permission. ({err})"
        )
    if status == 404:
        return RuntimeError(
            f"Drive folder {folder_id} not found (404). "
            f"Check GDRIVE_CONTENT_ROOT_ID; it should be the ID, not the URL."
        )
    return _DriveHttpError(err)


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
# ---------------------------------------------------------------------------


def download_all(drive, tree: ContentTree, cache_dir: str, concurrency: int) -> None:
    """Download every classified file into `cache_dir`. Concurrent + retry.

    Each worker thread builds its own Drive service via thread-local storage,
    so downloads actually run in parallel — `httplib2.Http` (the transport
    underneath googleapiclient) is not thread-safe, and a shared service
    serializes all workers onto a single connection.
    """
    os.makedirs(cache_dir, exist_ok=True)

    jobs: list[tuple[SlugFiles, DriveFileMeta, bool]] = []
    for sf in tree.iter_slugs():
        for meta in (sf.info_en, sf.majors_en, sf.info_ar, sf.majors_ar):
            if meta is not None:
                jobs.append((sf, meta, False))
        for meta in sf.attachments:
            jobs.append((sf, meta, True))

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
        sf, meta, is_attachment = job
        local_dir = os.path.join(cache_dir, DIR_BY_KIND[sf.kind], sf.year, sf.slug)
        if is_attachment:
            local_dir = os.path.join(local_dir, ATTACHMENTS_DIR)
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, meta.name)
        rel = f"{sf.label}/{meta.name}"
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
            fut.result()

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
# ---------------------------------------------------------------------------


def preflight_check(tree: ContentTree, report: ParseReport) -> None:
    """Fail loudly on suspicious tree state."""
    info_count = sum(1 for sf in tree.iter_slugs() if sf.info_en)
    if info_count == 0:
        raise RuntimeError(
            "Content root appears empty (no info.docx files found) — refusing to emit. "
            "Check --content-prefix; the tree is walked as <prefix>/<kind>/<year>/<slug>/."
        )

    for sf in tree.iter_slugs():
        where = f"{sf.label}/"
        if sf.info_en is None:
            report.error(where, "missing required `info.docx`")
        if sf.kind == "university":
            if sf.majors_en is None:
                report.error(where, "missing required `majors.xlsx`")
            if sf.info_ar is not None and sf.majors_ar is None:
                report.warn(
                    where,
                    "has `info.ar.docx` but no `majors.ar.xlsx` — "
                    "Arabic page will fall back to English majors",
                )


# ---------------------------------------------------------------------------
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
