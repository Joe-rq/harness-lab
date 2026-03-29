#!/usr/bin/env bash
# REQ hard enforcement check for PreToolUse hook
# Exit 0 = allow, Exit 2 = block

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$ROOT" ]; then
  exit 0
fi

# Bypass if exempt file exists
if [ -f "$ROOT/.claude/.req-exempt" ]; then
  exit 0
fi

# Read active REQ from progress.txt
PROGRESS="$ROOT/.claude/progress.txt"
if [ ! -f "$PROGRESS" ]; then
  exit 0
fi

ACTIVE_REQ=$(grep -i "^Current active REQ:" "$PROGRESS" | head -1 | sed 's/Current active REQ:[[:space:]]*//')

# If there's an active REQ, allow
if [ -n "$ACTIVE_REQ" ] && [ "$ACTIVE_REQ" != "none" ] && [ "$ACTIVE_REQ" != "无" ]; then
  exit 0
fi

# No active REQ — block and explain
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🚫 REQ ENFORCEMENT: BLOCKED                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo ""
echo "  No active REQ found. File modifications require a REQ for:"
echo "    - 3+ file changes"
echo "    - New feature development"
echo "    - Architecture/flow changes"
echo ""
echo "  To create a REQ:"
echo "    npm run req:create -- --title \"Your feature title\""
echo ""
echo "  To bypass (small fixes only):"
echo "    touch .claude/.req-exempt"
echo "    # (delete after task is done)"
echo ""
echo "╚══════════════════════════════════════════════════════════════╝"
exit 2
