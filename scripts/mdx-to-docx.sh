#!/usr/bin/env bash
# Reverse migration: legacy .mdx in the repo → pretty .docx + .xlsx mirror.
#
# This is the bootstrap that turns hand-authored MDX into Drive-ready Word
# documents (with proper Heading 1-6 styles, styled tables, etc.) so editors
# can take over via Drive. The forward sync (`scripts/sync-test.sh`) goes the
# other direction.
#
# Usage:
#   ./scripts/mdx-to-docx.sh                       # all 13 universities + 9 scholarships, en + ar
#   ./scripts/mdx-to-docx.sh --only aub            # one slug
#   ./scripts/mdx-to-docx.sh --output /tmp/foo     # custom output dir
#   ./scripts/mdx-to-docx.sh -v                    # debug logging
#
# Default output: ~/Desktop/drive-mirror-bootstrap/
#
# No Drive credentials needed — purely local. Run from the repo root.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -t 2 ]; then
    cyan=$'\033[36m'; red=$'\033[31m'; reset=$'\033[0m'
else
    cyan=""; red=""; reset=""
fi
say()  { printf "%s» %s%s\n" "$cyan" "$1" "$reset" >&2; }
fail() { printf "%s✗ %s%s\n" "$red" "$1" "$reset" >&2; exit 1; }

# Defaults.
output="$HOME/Desktop/drive-mirror-bootstrap"
migrate_args=()

while [ $# -gt 0 ]; do
    case "$1" in
        --output)
            [ $# -ge 2 ] || fail "--output expects a value"
            output="$2"; shift 2 ;;
        --only)
            [ $# -ge 2 ] || fail "--only expects a value"
            migrate_args+=("--only" "$2"); shift 2 ;;
        -v|--verbose)
            migrate_args+=("-v"); shift ;;
        -h|--help)
            sed -n '2,/^[^#]/{/^[^#]/!{ s/^# \{0,1\}//; p; }; }' "$0"
            exit 0 ;;
        *) fail "unknown flag: $1" ;;
    esac
done

# Sanity: venv.
[ -x .venv/bin/python ] || fail "no .venv/ — run: python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt"

mkdir -p "$output"

say "migrating MDX → docx into $output"
PYTHONPATH=scripts .venv/bin/python -m drive_sync.migrate \
    --output "$output" \
    ${migrate_args[@]+"${migrate_args[@]}"}

say "done. Open the .docx files in $output to review (or drag the tree into Drive)."
