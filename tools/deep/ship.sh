#!/usr/bin/env bash
# tools/deep/ship.sh "<commit title>" <smoke args...>  : generate, check, build, render, commit, push
set -euo pipefail
cd "$(dirname "$0")/../.."
title="$1"; shift
python3 tools/deep/build.py
node tools/deep/check.cjs
npm run build >/tmp/ship-build.log 2>&1 || { tail -20 /tmp/ship-build.log; exit 1; }
npx vite preview --port 4173 >/tmp/pv.log 2>&1 & pv=$!
trap 'kill $pv 2>/dev/null || true' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:4173/course/ && break; sleep 0.5; done
out=$(python3 tools/deep/smoke.py "$@" 2>&1 | grep -v "agent-proxy\|fonts.google\|Allowed domains\|Use the Read")
echo "$out"
echo "$out" | grep -q "errors \[\]" || { echo "page errors"; exit 1; }
echo "$out" | grep -E "^#" | grep -q "parts 0" && { echo "a lesson has no deep sections"; exit 1; }
git add -A
git commit -qm "$title

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01AxYiTPg9EgGkyMnFLTBbrC"
git -c push.negotiate=true push 2>&1 | tail -1
