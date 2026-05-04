#!/usr/bin/env bash
# Reset working tree after a `sync-test.sh` run.
#
# - Restores the legacy .mdx files via `git checkout --` (universities/,
#   scholarships/, and the i18n/ar/ counterparts).
# - Deletes runtime artifacts: .drive-cache/, parse-report.json, build/, .docusaurus/.
# - Does NOT touch ~/.gcloud-keys/ or ~/Desktop/drive-mirror-bootstrap/ — those
#   are persistent local resources, not run artifacts.
#
# Usage:
#   ./scripts/sync-clean.sh          # restore + remove artifacts
#   ./scripts/sync-clean.sh --dry-run  # show what would be removed
#
# Safe to run any time. Idempotent.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ -t 2 ]; then
    cyan=$'\033[36m'; yellow=$'\033[33m'; reset=$'\033[0m'
else
    cyan=""; yellow=""; reset=""
fi
say()  { printf "%s» %s%s\n" "$cyan" "$1" "$reset" >&2; }
note() { printf "%s· %s%s\n" "$yellow" "$1" "$reset" >&2; }

dry_run=false
[ "${1:-}" = "--dry-run" ] && dry_run=true

run() {
    if $dry_run; then
        printf "  would: %s\n" "$*" >&2
    else
        eval "$@"
    fi
}

# 1. Restore legacy MDX (only if there's something to restore).
say "restoring legacy MDX"
if git diff --quiet -- universities/ scholarships/ i18n/ar/ 2>/dev/null; then
    note "  working tree clean for managed paths — nothing to restore"
else
    run "git checkout -- universities/ scholarships/ i18n/ar/"
fi

# 2. Remove runtime artifacts (each may or may not exist).
for path in .drive-cache parse-report.json build .docusaurus; do
    if [ -e "$path" ]; then
        suffix=""
        [ -d "$path" ] && suffix="/"
        say "removing $path$suffix"
        run "rm -rf '$path'"
    fi
done

if $dry_run; then
    note "dry-run: no changes made"
else
    say "clean."
fi
