"""Year → Docusaurus version mapping, and the manifests that make it work.

Every academic year in the content tree becomes a Docusaurus docs version.
The site runs with `includeCurrentVersion: false`, so there is no `current`
special case: the newest year is `lastVersion` and serves the bare route
(`/universities/aub`), older years serve `/universities/<year>/aub`.

Files written per plugin `<p>` and year `<y>` (paths verified against
@docusaurus/plugin-content-docs lib/versions/files.js + constants.js):

    <p>_versions.json
    <p>_versioned_docs/version-<y>/<slug>.mdx
    <p>_versioned_sidebars/version-<y>-sidebars.json
    i18n/ar/docusaurus-plugin-content-docs-<p>/version-<y>/<slug>.mdx
    i18n/ar/docusaurus-plugin-content-docs-<p>/version-<y>.json
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from loguru import logger

from drive_sync.fetch import DIR_BY_KIND, ContentTree, Kind, SlugFiles

PLUGIN_BY_KIND: dict[Kind, str] = {"university": "universities", "scholarship": "scholarships"}

SIDEBAR_ID = {"universities": "universitiesSidebar", "scholarships": "scholarshipsSidebar"}

AR_LOCALE_DIR = "i18n/ar"


def versioned_docs_dir(plugin: str, year: str) -> str:
    return f"{plugin}_versioned_docs/version-{year}"


def versioned_sidebars_path(plugin: str, year: str) -> str:
    return f"{plugin}_versioned_sidebars/version-{year}-sidebars.json"


def versions_json_path(plugin: str) -> str:
    return f"{plugin}_versions.json"


def localized_docs_dir(plugin: str, year: str, locale: str = "ar") -> str:
    return f"i18n/{locale}/docusaurus-plugin-content-docs-{plugin}/version-{year}"


def localized_version_json(plugin: str, year: str, locale: str = "ar") -> str:
    return f"i18n/{locale}/docusaurus-plugin-content-docs-{plugin}/version-{year}.json"


@dataclass
class VersionEntry:
    """One page to render, and the version it renders into."""

    files: SlugFiles
    year: str
    """The version this is published under."""

    stale_from: str | None = None
    """Set when the content was carried forward from an older year."""

    @property
    def plugin(self) -> str:
        return PLUGIN_BY_KIND[self.files.kind]

    def output_path(self, locale: str) -> str:
        slug = self.files.slug
        if locale == "ar":
            return f"{localized_docs_dir(self.plugin, self.year)}/{slug}.mdx"
        return f"{versioned_docs_dir(self.plugin, self.year)}/{slug}.mdx"


@dataclass
class VersionPlan:
    entries: list[VersionEntry] = field(default_factory=list)
    years_by_plugin: dict[str, list[str]] = field(default_factory=dict)
    """Plugin id → every year it publishes, newest first."""


def plan_versions(tree: ContentTree, only_year: str | None = None) -> VersionPlan:
    """Decide what gets rendered into which version, including carry-forward.

    A slug missing from year Y but present in an earlier year is carried
    forward into Y from its most recent earlier year, and flagged stale. A
    live URL disappearing is worse for readers than slightly old numbers that
    say so on the page.

    `only_year` limits which pages are rendered (a dev filter); the version
    manifests still list every year, so the site stays consistent.
    """
    plan = VersionPlan()

    for kind in ("university", "scholarship"):
        plugin = PLUGIN_BY_KIND[kind]  # type: ignore[index]
        by_year = tree.kind_map(kind)  # type: ignore[arg-type]
        years = sorted(by_year, reverse=True)
        if not years:
            continue
        plan.years_by_plugin[plugin] = years

        carried: dict[str, tuple[str, SlugFiles]] = {}
        for year in reversed(years):
            for slug, sf in by_year[year].items():
                carried[slug] = (year, sf)
            if only_year and year != only_year:
                continue
            for slug in sorted(carried):
                source_year, sf = carried[slug]
                plan.entries.append(
                    VersionEntry(
                        files=sf,
                        year=year,
                        stale_from=source_year if source_year != year else None,
                    )
                )
                if source_year != year:
                    logger.warning(
                        "{}/{}/{}: no folder for {} — carrying {} forward (marked stale)",
                        DIR_BY_KIND[sf.kind], year, slug, year, source_year,
                    )

    return plan


def write_version_manifests(plan: VersionPlan, out_prefix: str = "") -> None:
    """Write versions.json, the versioned sidebar stubs, and the ar label files."""
    for plugin, years in plan.years_by_plugin.items():
        _write_json(out_prefix, versions_json_path(plugin), years)

        sidebar_key = SIDEBAR_ID[plugin]
        for year in years:
            # Docusaurus writes this file un-normalized (lib/cli.js
            _write_json(
                out_prefix,
                versioned_sidebars_path(plugin, year),
                {sidebar_key: [{"type": "autogenerated", "dirName": "."}]},
            )
            _write_json(
                out_prefix,
                localized_version_json(plugin, year),
                {
                    "version.label": {
                        "message": year,
                        "description": f"The label for version {year}",
                    }
                },
            )
        logger.info("{}: wrote manifests for {} version(s)", plugin, len(years))


def _write_json(out_prefix: str, rel_path: str, payload) -> None:
    full = os.path.join(out_prefix.rstrip("/"), rel_path) if out_prefix else rel_path
    p = Path(full)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
