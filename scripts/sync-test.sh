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
# Env vars, in order of precedence: already exported > ./.env > built-in default.
#   GDRIVE_CONTENT_ROOT_ID           Drive folder id (or full URL — pipeline strips it)
#   GDRIVE_SERVICE_ACCOUNT_JSON      service-account JSON key contents
#   GDRIVE_SERVICE_ACCOUNT_JSON_FILE path to the key file; read into the above.
#                                    Defaults to ~/.gcloud-keys/collegesaurus-drive-sync.json
#
# Copy .env.example to .env to set these once. `.env` is symlinked into each
# argus task worktree (worktree.config), so one copy serves every worktree.

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
            # Hold the flag in a scalar: macOS ships bash 3.2, which has no
            # negative array subscripts (${arr[-1]} is a "bad array subscript").
            flag="$1"; sync_args+=("$flag"); shift
            # If the flag takes a value, also forward it.
            case "$flag" in
                --only|--cache-dir|--out-prefix)
                    [ $# -gt 0 ] || fail "$flag expects a value"
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

# Load ./.env, then credentials. Precedence: exported > .env > default path.
#
# `set -a` exports everything .env defines, but sourcing also overwrites vars
# already in the environment — so stash what was set beforehand and restore it
# after, keeping one-off overrides authoritative:
#   GDRIVE_CONTENT_ROOT_ID=<other> ./scripts/sync-test.sh --dry-run
pre_root_id="${GDRIVE_CONTENT_ROOT_ID:-}"
pre_sa_json="${GDRIVE_SERVICE_ACCOUNT_JSON:-}"
pre_sa_file="${GDRIVE_SERVICE_ACCOUNT_JSON_FILE:-}"

if [ -r .env ]; then
    set -a
    # shellcheck source=/dev/null
    . ./.env
    set +a
    say "loaded .env"
fi

if [ -n "$pre_root_id" ]; then GDRIVE_CONTENT_ROOT_ID="$pre_root_id"; fi
if [ -n "$pre_sa_json" ]; then GDRIVE_SERVICE_ACCOUNT_JSON="$pre_sa_json"; fi
if [ -n "$pre_sa_file" ]; then GDRIVE_SERVICE_ACCOUNT_JSON_FILE="$pre_sa_file"; fi

# Resolve the key: explicit JSON wins, else read the file the pointer names.
if [ -z "${GDRIVE_SERVICE_ACCOUNT_JSON:-}" ]; then
    key_file="${GDRIVE_SERVICE_ACCOUNT_JSON_FILE:-$HOME/.gcloud-keys/collegesaurus-drive-sync.json}"
    # A quoted "~/..." in .env arrives literally; expand it ourselves.
    case "$key_file" in "~/"*) key_file="$HOME/${key_file#\~/}" ;; esac
    [ -r "$key_file" ] || fail "no service-account key: set GDRIVE_SERVICE_ACCOUNT_JSON, or point GDRIVE_SERVICE_ACCOUNT_JSON_FILE at a readable key (tried $key_file)"
    GDRIVE_SERVICE_ACCOUNT_JSON="$(cat "$key_file")"
    say "loaded service-account key from $key_file"
fi
export GDRIVE_SERVICE_ACCOUNT_JSON

if [ -z "${GDRIVE_CONTENT_ROOT_ID:-}" ]; then
    fail "GDRIVE_CONTENT_ROOT_ID is not set; put it in .env (see .env.example) or export it"
fi
export GDRIVE_CONTENT_ROOT_ID

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
