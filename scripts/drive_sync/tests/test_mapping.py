"""mapping.toml — the registry that decides how .docx maps to MDX.

The point of these tests is the property in the last one: a new Word style, or
a new page section, must be reachable by editing data, never the parser.
"""

from pathlib import Path

import pytest

from drive_sync import mapping as mapping_mod
from drive_sync.mapping import load_mapping, normalize_heading, normalize_style


@pytest.fixture(autouse=True)
def _clear_cache():
    load_mapping.cache_clear()
    yield
    load_mapping.cache_clear()


def test_style_lookup_is_case_and_space_insensitive() -> None:
    """The live corpus carries body text as both `normal` and `Normal`."""
    m = load_mapping()
    assert m.style("normal") == m.style("Normal") == m.style("  NORMAL  ")
    assert normalize_style("  List   Bullet ") == "list bullet"


def test_google_docs_title_styles_are_headings() -> None:
    """Title/Subtitle are used as headings by editors but matched nothing before."""
    m = load_mapping()
    assert m.style("Title").block == "heading"
    assert m.style("Subtitle").block == "heading"


def test_unmapped_style_returns_none_so_the_caller_can_warn() -> None:
    assert load_mapping().style("Some Bespoke Style") is None


def test_section_aliases_match_in_either_language_order() -> None:
    """The old prefix rule only accepted English-first headings."""
    m = load_mapping()
    for heading in ("Faculty", "Introduction", "الكلية (Faculty)", "Faculty (الكلية)"):
        rule = m.section_for("university", heading)
        assert rule is not None and rule.key == "faculty", heading


def test_tuition_matches_with_or_without_the_year_suffix() -> None:
    m = load_mapping()
    for heading in ("Tuition", "Tuition (AY 2025-2026)", "Tuition (AY 2025-26)"):
        assert m.section_for("university", heading).key == "tuition"


def test_longest_alias_wins() -> None:
    """`Contacts of recipients` must not be swallowed by `Contacts`."""
    m = load_mapping()
    assert m.section_for("scholarship", "Contacts of recipients").key == "recipients"


def test_unknown_section_is_unmatched_not_rejected() -> None:
    assert load_mapping().section_for("university", "Rankings") is None


def test_only_the_faculty_section_carries_majors() -> None:
    by_key = load_mapping().sections_by_key("university")
    assert by_key["faculty"].majors is True
    assert [k for k, r in by_key.items() if r.majors] == ["faculty"]


def test_year_suffix_is_localized() -> None:
    m = load_mapping()
    assert m.format_year("en", "2025-2026") == "AY 2025-2026"
    assert "2025-2026" in m.format_year("ar", "2025-2026")
    assert m.format_year("ar", "2025-2026") != m.format_year("en", "2025-2026")


def test_labels_fall_back_to_english_then_to_the_heading() -> None:
    rule = load_mapping().sections_by_key("university")["tuition"]
    assert rule.label("en", "x") == "Tuition"
    assert rule.label("fr", "x") == "Tuition", "unknown locale falls back to en"


def test_normalize_heading_keeps_unicode_letters() -> None:
    assert normalize_heading("Tuition (AY 2025-2026)") == "tuitionay20252026"
    assert "الكلية" in normalize_heading("الكلية (Faculty)")


def test_a_new_style_and_section_need_no_code_change(tmp_path: Path, monkeypatch) -> None:
    """The acceptance test for the whole design.

    A Word style and a page section that the code has never heard of become
    usable by adding rows to the TOML. Nothing in parse/ or emit/ is touched.
    """
    custom = tmp_path / "mapping.toml"
    custom.write_text(
        """
[styles."heading 1"]
block = "section"

[styles."pull quote"]
block = "blockquote"

[[sections.university]]
key = "rankings"
aliases = ["Rankings", "التصنيفات"]
[sections.university.labels]
en = "Rankings"
ar = "التصنيفات"
""",
        encoding="utf-8",
    )
    monkeypatch.setattr(mapping_mod, "MAPPING_PATH", custom)
    load_mapping.cache_clear()

    m = load_mapping()
    assert m.style("Pull Quote").block == "blockquote"
    rule = m.section_for("university", "Rankings")
    assert rule is not None and rule.key == "rankings"
    assert rule.label("ar", "Rankings") == "التصنيفات"
