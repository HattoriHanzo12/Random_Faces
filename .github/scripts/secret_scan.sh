#!/usr/bin/env bash
set -euo pipefail

PATTERN='AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}|sk_live_[A-Za-z0-9]{16,}|sk_test_[A-Za-z0-9]{16,}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----|-----BEGIN PRIVATE KEY-----'

echo "Scanning tracked files for common secret patterns..."
if git grep -I -n -E "$PATTERN" -- .; then
  echo "Potential secret pattern found in tracked files."
  exit 1
fi
echo "No tracked-file secret patterns found."

echo "Scanning git history for common secret patterns..."
tmp_output="$(mktemp)"
trap 'rm -f "$tmp_output"' EXIT

while IFS= read -r commit; do
  if git grep -I -n -E "$PATTERN" "$commit" -- . >"$tmp_output" 2>/dev/null; then
    echo "Potential secret pattern found in history at commit: $commit"
    cat "$tmp_output"
    exit 1
  fi
done < <(git rev-list --all)

echo "No history secret patterns found."
