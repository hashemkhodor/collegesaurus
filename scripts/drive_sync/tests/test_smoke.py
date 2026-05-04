"""Smoke tests — verify the package and its IR types load cleanly."""

import drive_sync
from drive_sync.models import (
    Metadata,
    MajorRow,
    FacultyGroup,
    UniversityIR,
    ScholarshipIR,
    Paragraph,
    TextRun,
    is_valid_slug,
)


def test_package_has_version() -> None:
    assert drive_sync.__version__


def test_metadata_https_only() -> None:
    Metadata(
        title="AUB",
        sidebar_label="AUB",
        sidebar_position=1,
        apply_url="https://join.aub.edu.lb/apply/",
    )
    # http:// is rejected by the validator (T-R.2)
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Metadata(
            title="AUB",
            sidebar_label="AUB",
            sidebar_position=1,
            apply_url="http://insecure.example.com/",
        )


def test_metadata_blank_title_rejected() -> None:
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Metadata(title="   ", sidebar_label="X", sidebar_position=1)


def test_slug_validator() -> None:
    assert is_valid_slug("aub")
    assert is_valid_slug("hariri-foundation")
    assert not is_valid_slug("Bad-Name")
    assert not is_valid_slug("-leading")
    assert not is_valid_slug("trailing-")
    assert not is_valid_slug("has spaces")
    assert not is_valid_slug("")


def test_university_ir_round_trip() -> None:
    """Build a minimal UniversityIR and dump → load to confirm the schema is consistent."""
    ir = UniversityIR(
        slug="aub",
        locale="en",
        meta=Metadata(title="AUB", sidebar_label="AUB", sidebar_position=1),
        introduction=[Paragraph(runs=[TextRun(text="Hello.")])],
        application=[],
        tuition_year_label="AY 2025-2026",
        tuition=[],
        scholarships=[],
        requirements=[],
        contacts=[],
        majors=[
            FacultyGroup(
                heading="MSFEA",
                rows=[MajorRow(program="Architecture", degree="BArch", years=5)],
            )
        ],
        source_info_id="legacy:info.docx",
        source_majors_id="legacy:majors.xlsx",
    )
    dumped = ir.model_dump_json()
    loaded = UniversityIR.model_validate_json(dumped)
    assert loaded == ir


def test_scholarship_ir_round_trip() -> None:
    from drive_sync.models import ScholarshipSection

    ir = ScholarshipIR(
        slug="fulbright",
        locale="en",
        meta=Metadata(title="Fulbright", sidebar_label="Fulbright", sidebar_position=2),
        sections=[
            ScholarshipSection(heading="Overview", blocks=[]),
            ScholarshipSection(heading="Benefits", blocks=[]),
        ],
        source_info_id="legacy:info.docx",
    )
    dumped = ir.model_dump_json()
    loaded = ScholarshipIR.model_validate_json(dumped)
    assert loaded == ir
