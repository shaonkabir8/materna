#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

B='\033[0;34m'; G='\033[0;32m'; R='\033[0;31m'; N='\033[0m'
say(){ printf "${B}▶${N} %s\n" "$*"; }
ok(){  printf "${G}✔${N} %s\n" "$*"; }
bad(){ printf "${R}✖${N} %s\n" "$*"; FAIL=1; }
FAIL=0

LOG=".attw.out"

say "Build"
npm run build >/dev/null 2>&1 && ok "build" || bad "build"

say "Tests"
npm test >/dev/null 2>&1 && ok "npm test" || bad "npm test"

say "check:package (source of truth = exit code)"
if npm run check:package >"$LOG" 2>&1; then
  ok "publint + attw exit 0"
else
  bad "publint/attw exit != 0"
  sed 's/^/    /' "$LOG"
fi

say "No un-ignored 💀 rows"
# A line is OK if it has 💀 AND contains 'ignored' anywhere.
if grep '💀' "$LOG" | grep -qv 'ignored'; then
  bad "found 💀 without 'ignored' marker"
  grep '💀' "$LOG" | grep -v 'ignored' | sed 's/^/    /'
else
  ok "every 💀 is ignored"
fi

say "No leftover .mjs in dist"
if compgen -G "dist/*.mjs" >/dev/null; then bad "stale .mjs"; else ok "clean"; fi

rm -f "$LOG"

echo
if [ "$FAIL" -eq 0 ]; then
  printf "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
  printf "${G}  ✔ PASS — ready to commit, tag, and publish${N}\n"
  printf "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
  exit 0
else
  printf "${R}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
  printf "${R}  ✖ FAIL — see errors above${N}\n"
  printf "${R}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
  exit 1
fi
