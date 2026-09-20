"""Loads `mapping.toml` — the data that decides how .docx maps to MDX.

The parser transports structure; this registry decides what it means. Adding a
Word style or a page section is an edit to the TOML, not to `parse/docx.py`,
`parse/assemble.py` or `emit/*`.
"""

from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

MAPPING_PATH = Path(__file__).parent / "mapping.toml"

#: Word styles arrive with inconsistent casing through the Google Docs export
#: ("normal" vs "Normal"), so every lookup is normalized.
def normalize_style(name: str) -> str:
    return " ".join(name.split()).strip().lower()


def normalize_heading(s: str) -> str:
    """Case-fold and strip non-alphanumerics, preserving Unicode letters.

    `الكلية (Faculty)` and `Faculty (الكلية)` both contain `faculty`, which is
    what makes substring matching work in either language order.
    """
    return re.sub(r"[^\w]", "", s, flags=re.UNICODE).lower()


@dataclass(frozen=True)
class StyleRule:
    block: str
    depth: int = 0
    ordered: bool | None = None
    """For list styles: True/False when the style itself says (List Number vs
    List Bullet), None when it does not (plain `List Paragraph`) — then the
    numbering definition in the docx decides."""

    italic: bool = False


@dataclass(frozen=True)
class SectionRule:
    key: str
    aliases: tuple[str, ...]
    labels: dict[str, str] = field(default_factory=dict)
    majors: bool = False
    year_suffix: bool = False

    def label(self, locale: str, fallback: str) -> str:
        return self.labels.get(locale) or self.labels.get("en") or fallback


@dataclass
class Mapping:
    styles: dict[str, StyleRule]
    sections: dict[str, tuple[SectionRule, ...]]
    year_suffix: dict[str, str]

    def style(self, name: str) -> StyleRule | None:
        return self.styles.get(normalize_style(name))

    def section_for(self, kind: str, heading: str) -> SectionRule | None:
        """Resolve a docx H1 to a registry entry, or None if it is unknown.

        Unknown is not an error: the section still renders under its own
        heading. Matching here only decides whether it gets a localized label
        (and, for `faculty`, its majors tables).
        """
        norm = normalize_heading(heading)
        if not norm:
            return None
        best: SectionRule | None = None
        best_len = 0
        for rule in self.sections.get(kind, ()):
            for alias in rule.aliases:
                a = normalize_heading(alias)
                # Longest alias wins, so "Contacts of recipients" beats "Contacts".
                if a and a in norm and len(a) > best_len:
                    best, best_len = rule, len(a)
        return best

    def sections_by_key(self, kind: str) -> dict[str, SectionRule]:
        return {r.key: r for r in self.sections.get(kind, ())}

    def format_year(self, locale: str, year: str) -> str:
        template = self.year_suffix.get(locale) or self.year_suffix.get("en") or "{year}"
        return template.format(year=year)


@lru_cache(maxsize=1)
def load_mapping(path: str | None = None) -> Mapping:
    raw = tomllib.loads(Path(path or MAPPING_PATH).read_text(encoding="utf-8"))

    styles = {
        normalize_style(name): StyleRule(
            block=rule.get("block", "paragraph"),
            depth=int(rule.get("depth", 0)),
            ordered=None if rule.get("ordered") is None else bool(rule["ordered"]),
            italic=bool(rule.get("italic", False)),
        )
        for name, rule in raw.get("styles", {}).items()
    }

    sections: dict[str, tuple[SectionRule, ...]] = {}
    for kind, entries in raw.get("sections", {}).items():
        sections[kind] = tuple(
            SectionRule(
                key=e["key"],
                aliases=tuple(e.get("aliases", ())),
                labels=dict(e.get("labels", {})),
                majors=bool(e.get("majors", False)),
                year_suffix=bool(e.get("year_suffix", False)),
            )
            for e in entries
        )

    return Mapping(styles=styles, sections=sections, year_suffix=dict(raw.get("year_suffix", {})))


def expected_section_keys(kind: str) -> tuple[str, ...]:
    """Sections a page of this kind is normally expected to have.

    These are a lint expectation, not a parse requirement — a page missing one
    still builds.
    """
    return tuple(r.key for r in load_mapping().sections.get(kind, ()))
