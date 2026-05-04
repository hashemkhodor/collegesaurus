"""Shared pytest fixtures: paths into `tests/fixtures/`.

The fixtures directory mirrors a Drive content root:
    tests/fixtures/
    ├── universities/aub/{info,info.ar}.docx + {majors,majors.ar}.xlsx
    ├── scholarships/fulbright/{info,info.ar}.docx
    └── expected/{aub,aub.ar,fulbright,fulbright.ar}.mdx

This keeps the test suite hermetic: it doesn't depend on `~/Desktop/`.
"""

from __future__ import annotations

from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def fixtures_dir() -> Path:
    """Path to the test fixtures root."""
    return FIXTURES


@pytest.fixture(scope="session")
def expected_dir() -> Path:
    """Path to the expected MDX snapshots."""
    return FIXTURES / "expected"


@pytest.fixture
def aub_paths() -> dict[str, Path]:
    base = FIXTURES / "universities" / "aub"
    return {
        "info_en": base / "info.docx",
        "info_ar": base / "info.ar.docx",
        "majors_en": base / "majors.xlsx",
        "majors_ar": base / "majors.ar.xlsx",
    }


@pytest.fixture
def fulbright_paths() -> dict[str, Path]:
    base = FIXTURES / "scholarships" / "fulbright"
    return {
        "info_en": base / "info.docx",
        "info_ar": base / "info.ar.docx",
    }


@pytest.fixture
def life_paths() -> dict[str, Path]:
    """LIFE scholarship — used to cover blockquote + ordered-list parsing."""
    base = FIXTURES / "scholarships" / "life"
    return {
        "info_en": base / "info.docx",
        "info_ar": base / "info.ar.docx",
    }
