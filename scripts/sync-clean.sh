#!/usr/bin/env bash
# Reset working tree after a `sync-test.sh` run.
#
# Everything drive_sync writes is generated and gitignored, so there is nothing
# to restore — this just deletes the artifacts:
#   .drive-cache/, parse-report.json, build/, .docusaurus/,
#   <plugin>_versioned_docs/, <plugin>_versioned_sidebars/, <plugin>_versions.json,
#   the i18n/ar version-* counterparts, and static/attachments/.
# - Does NOT touch ~/.gcloud-keys/ — that is a persistent local resource,
#   not a run artifact.
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

# Remove runtime artifacts (each may or may not exist).
paths=(.drive-cache parse-report.json build .docusaurus static/attachments)
for plugin in universities scholarships; do
    paths+=("${plugin}_versioned_docs" "${plugin}_versioned_sidebars" "${plugin}_versions.json")
    paths+=("${plugin}"/*.mdx)
done
# Generated per-version Arabic mirrors + their version label files.
for d in i18n/ar/docusaurus-plugin-content-docs-*/version-*; do
    [ -e "$d" ] && paths+=("$d")
done
for d in i18n/ar/docusaurus-plugin-content-docs-*/current; do
    [ -e "$d" ] && paths+=("$d")
done

for path in "${paths[@]}"; do
    # `universities/*.mdx` stays literal when nothing matches; skip those, and
    # never delete the hand-authored templates.
    case "$path" in
        *'*'*) continue ;;
        */_template.mdx) continue ;;
    esac
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
