"""Build-time Drive → MDX pipeline.

Reads docx/xlsx files from a Google Drive content root (or a local mirror with
the same layout), parses them into typed IR objects, and emits MDX files at
the paths Docusaurus expects under `universities/`, `scholarships/`, and
`i18n/ar/...`.

Design: spec/001-add-google-drive-backend-data/design.md
"""

__version__ = "0.1.0"
