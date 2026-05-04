#!/usr/bin/env bash
# Pull from Drive → regenerate MDX in the repo → build → serve.
#
# Usage:
#   ./scripts/sync-test.sh              # sync + build, then exit
#   ./scripts/sync-test.sh --serve      # sync + build + serve (blocks until Ctrl-C)
#   ./scripts/sync-test.sh --dry-run    # parse + validate only, no MDX written
#   ./scripts/sync-test.sh --only aub   # one slug
#
# Run from the repo root. Restore the repo afterwards with `scripts/sync-clean.sh`.
#
# Env vars (auto-loaded from ~/.gcloud-keys/collegesaurus-drive-sync.json if unset):
#   GDRIVE_SERVICE_ACCOUNT_JSON   service-account JSON key contents
#   GDRIVE_CONTENT_ROOT_ID        Drive folder id (or full URL — pipeline strips it)

set -euo pipefail

cd "$(dirname "$0")/.."

# Colour helpers (only when stderr is a TTY).
if [ -t 2 ]; then
    bold=$'\033[1m'; cyan=$'\033[36m'; red=$'\033[31m'; reset=$'\033[0m'
else
    bold=""; cyan=""; red=""; reset=""
fi
say()  { printf "%s» %s%s\n" "$cyan" "$1" "$reset" >&2; }
fail() { printf "%s✗ %s%s\n" "$red" "$1" "$reset" >&2; exit 1; }

# Parse flags.
serve=false
sync_args=()
while [ $# -gt 0 ]; do
    case "$1" in
        --serve) serve=true; shift ;;
        --dry-run|--only|--cache-dir|--out-prefix|-v|--verbose)
            sync_args+=("$1"); shift
            # If the flag takes a value, also forward it.
            case "${sync_args[-1]}" in
                --only|--cache-dir|--out-prefix)
                    [ $# -gt 0 ] || fail "${sync_args[-1]} expects a value"
                    sync_args+=("$1"); shift ;;
            esac
            ;;
        -h|--help)
            # Print the leading comment block (after the shebang) until the
            # first non-`#` line.
            sed -n '2,/^[^#]/{/^[^#]/!{ s/^# \{0,1\}//; p; }; }' "$0"
            exit 0
            ;;
        *) fail "unknown flag: $1" ;;
    esac
done

# Sanity: venv + python.
[ -x .venv/bin/python ] || fail "no .venv/ — run: python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt"

# Auto-load credentials if env vars aren't already set.
if [ -z "${GDRIVE_SERVICE_ACCOUNT_JSON:-}" ]; then
    key_file="$HOME/.gcloud-keys/collegesaurus-drive-sync.json"
    [ -r "$key_file" ] || fail "GDRIVE_SERVICE_ACCOUNT_JSON not set, and no key at $key_file"
    GDRIVE_SERVICE_ACCOUNT_JSON="$(cat "$key_file")"
    export GDRIVE_SERVICE_ACCOUNT_JSON
    say "loaded service-account key from $key_file"
fi
if [ -z "${GDRIVE_CONTENT_ROOT_ID:-}" ]; then
    fail "GDRIVE_CONTENT_ROOT_ID is not set; export it (folder id or URL) and re-run"
fi

# Run pipeline.
# Expand the array safely under `set -u`: ${arr[@]+"${arr[@]}"} expands to
# nothing when the array is empty, otherwise to its elements.
say "syncing from Drive"
PYTHONPATH=scripts .venv/bin/python -m drive_sync ${sync_args[@]+"${sync_args[@]}"}

# If --dry-run was passed, we're done.
for a in ${sync_args[@]+"${sync_args[@]}"}; do
    if [ "$a" = "--dry-run" ]; then
        say "dry-run complete (no MDX written)"
        exit 0
    fi
done

# Build.
say "running npm run build"
npm run build

# Optional serve.
if $serve; then
    say "starting npm run serve at http://localhost:3000 (Ctrl-C to stop)"
    npm run serve
else
    say "build done. To preview: npm run serve  (or pass --serve)"
    say "to restore the legacy MDX: ./scripts/sync-clean.sh"
fi
