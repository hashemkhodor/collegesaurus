"""One-shot reverse migration: legacy MDX → bootstrap docx/xlsx.

This is NOT part of the steady-state pipeline. It exists to (re)generate
~/Desktop/drive-mirror-bootstrap/ from the committed MDX files. The output
is then uploaded to Google Drive once and the migration tool is archived.

Why it lives in the same package as the forward pipeline: it shares the
`models.py` IR types so any contract drift between forward and reverse
breaks at import time.

Usage:
    python -m drive_sync.migrate \\
        --output ~/Desktop/drive-mirror-bootstrap

Design: spec/001-add-google-drive-backend-data/design.md §5.
"""
