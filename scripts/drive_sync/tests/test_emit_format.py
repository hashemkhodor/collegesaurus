"""Tests for emit/format.py."""

from drive_sync.emit.format import (
    emit_blocks,
    emit_faculty_heading,
    emit_frontmatter,
    emit_majors_table,
)
from drive_sync.models import (
    Blockquote,
    FacultyGroup,
    Heading,
    LinkRun,
    List_,
    ListItem,
    MajorRow,
    Metadata,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
)


# --- Frontmatter ----------------------------------------------------------


def test_frontmatter_fixed_key_order_and_unquoted_url() -> None:
    out = emit_frontmatter(
        Metadata(
            title="AUB",
            sidebar_label="AUB",
            sidebar_position=1,
            apply_url="https://join.aub.edu.lb/apply/",
        )
    )
    lines = out.split("\n")
    assert lines[0] == "---"
    assert lines[1] == "sidebar_position: 1"
    assert lines[2] == "title: AUB"
    assert lines[3] == "sidebar_label: AUB"
    assert lines[4] == "apply_url: https://join.aub.edu.lb/apply/"
    assert lines[5] == "---"


def test_frontmatter_omits_optional_fields() -> None:
    out = emit_frontmatter(Metadata(title="X", sidebar_label="X", sidebar_position=2))
    assert "apply_url" not in out
    assert "page_h1" not in out  # page_h1 is metadata-only, not in frontmatter


# --- MajorsTable ---------------------------------------------------------


def test_majors_table_single_quoted_and_fixed_order() -> None:
    out = emit_majors_table(
        FacultyGroup(
            heading="MSFEA",
            abbr="MSFEA",
            url="https://x.example/",
            rows=[
                MajorRow(
                    program="Architecture",
                    degree="BArch",
                    department="School of A",
                    credits=174,
                    years=5,
                    source="https://x.example/y",
                ),
            ],
        )
    )
    # No `faculty` JSX prop emitted.
    assert "faculty=" not in out
    # Single-quoted strings, fixed key order.
    expected_substring = (
        "program: 'Architecture', degree: 'BArch', "
        "department: 'School of A', credits: 174, years: 5, "
        "source: 'https://x.example/y'"
    )
    assert expected_substring in out


def test_majors_table_skips_undefined_fields() -> None:
    out = emit_majors_table(
        FacultyGroup(heading="X", rows=[MajorRow(program="A", degree="BS")])
    )
    assert "program: 'A', degree: 'BS'" in out
    assert "language" not in out
    assert "credits" not in out


def test_majors_table_escapes_embedded_single_quote() -> None:
    out = emit_majors_table(
        FacultyGroup(
            heading="X",
            rows=[MajorRow(program="A's program", degree="BS")],
        )
    )
    assert "'A\\'s program'" in out


def test_majors_table_escapes_newlines() -> None:
    out = emit_majors_table(
        FacultyGroup(
            heading="X",
            rows=[MajorRow(program="multi\nline", degree="BS")],
        )
    )
    assert "'multi\\nline'" in out


# --- Faculty heading -----------------------------------------------------


def test_faculty_heading_with_link() -> None:
    out = emit_faculty_heading(
        FacultyGroup(heading="Eng", abbr="ENG", url="https://x.example/", rows=[]),
        3,
    )
    assert out == "### Eng ([ENG](https://x.example/))"


def test_faculty_heading_without_link() -> None:
    out = emit_faculty_heading(FacultyGroup(heading="X", rows=[]), 2)
    assert out == "## X"


# --- emit_blocks ---------------------------------------------------------


def test_emit_paragraph() -> None:
    out = emit_blocks([Paragraph(runs=[TextRun(text="Hello.")])])
    assert out == "Hello."


def test_emit_heading_demotion() -> None:
    blocks = [
        Heading(depth=1, runs=[TextRun(text="A")]),
        Heading(depth=2, runs=[TextRun(text="B")]),
    ]
    out = emit_blocks(blocks, depth_offset=1)
    assert "## A" in out
    assert "### B" in out


def test_emit_heading_clamped_at_six() -> None:
    out = emit_blocks([Heading(depth=6, runs=[TextRun(text="X")])], depth_offset=5)
    assert out.startswith("###### X")


def test_emit_runs_bold_italic_combinations() -> None:
    p = Paragraph(runs=[
        TextRun(text="plain "),
        TextRun(text="bold", bold=True),
        TextRun(text=" "),
        TextRun(text="italic", italic=True),
        TextRun(text=" "),
        TextRun(text="both", bold=True, italic=True),
    ])
    out = emit_blocks([p])
    assert out == "plain **bold** _italic_ ***both***"


def test_emit_link() -> None:
    p = Paragraph(runs=[
        TextRun(text="see "),
        LinkRun(text="here", url="https://x.example/"),
    ])
    out = emit_blocks([p])
    assert out == "see [here](https://x.example/)"


def test_emit_link_strips_dangerous_scheme() -> None:
    p = Paragraph(runs=[
        TextRun(text="see "),
        LinkRun(text="here", url="javascript:alert(1)"),
    ])
    out = emit_blocks([p])
    # text preserved but no link wrapping.
    assert out == "see here"


def test_emit_table_renders_header_separator() -> None:
    table = Table(rows=[
        TableRow(cells=[
            TableCell(runs=[TextRun(text="Term")]),
            TableCell(runs=[TextRun(text="Opens")]),
        ]),
        TableRow(cells=[
            TableCell(runs=[TextRun(text="Fall")]),
            TableCell(runs=[TextRun(text="Aug 1")]),
        ]),
    ])
    out = emit_blocks([table])
    lines = out.split("\n")
    assert lines[0] == "| Term | Opens |"
    assert lines[1] == "| --- | --- |"
    assert lines[2] == "| Fall | Aug 1 |"


def test_emit_unordered_list() -> None:
    blocks = [List_(ordered=False, items=[
        ListItem(runs=[TextRun(text="alpha")]),
        ListItem(runs=[TextRun(text="beta")]),
    ])]
    out = emit_blocks(blocks)
    assert out == "- alpha\n- beta"


def test_emit_ordered_list() -> None:
    blocks = [List_(ordered=True, items=[
        ListItem(runs=[TextRun(text="first")]),
        ListItem(runs=[TextRun(text="second")]),
    ])]
    out = emit_blocks(blocks)
    assert out == "1. first\n2. second"


def test_emit_blockquote() -> None:
    blocks = [Blockquote(paragraphs=[Paragraph(runs=[TextRun(text="Note.")])])]
    out = emit_blocks(blocks)
    assert out == "> Note."
