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

# Try to get target file from stdin (Hook may pass tool input as JSON)
# Also check environment variables as fallback
TARGET_FILE=""
if [ -n "$CLAUDE_FILE_PATH" ]; then
  TARGET_FILE="$CLAUDE_FILE_PATH"
elif [ -n "$TOOL_INPUT_FILE" ]; then
  TARGET_FILE="$TOOL_INPUT_FILE"
elif [ -n "$FILE_PATH" ]; then
  TARGET_FILE="$FILE_PATH"
else
  # Try to read from stdin (non-blocking)
  STDIN_DATA=""
  if [ -t 0 ]; then
    : # stdin is a terminal, skip
  else
    read -t 0.1 STDIN_DATA 2>/dev/null || true
    if [ -n "$STDIN_DATA" ]; then
      # Try to extract file_path from JSON
      TARGET_FILE=$(echo "$STDIN_DATA" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    fi
  fi
fi

# Allow writes to requirements/ and docs/plans/ directories (filling REQ content)
if [ -n "$TARGET_FILE" ]; then
  REL_PATH="${TARGET_FILE#$ROOT/}"
  if [[ "$REL_PATH" == requirements/* ]] || [[ "$REL_PATH" == docs/plans/* ]]; then
    exit 0
  fi
fi

# Read active REQ from progress.txt
PROGRESS="$ROOT/.claude/progress.txt"
if [ ! -f "$PROGRESS" ]; then
  exit 0
fi

ACTIVE_REQ=$(grep -i "^Current active REQ:" "$PROGRESS" | head -1 | sed 's/Current active REQ:[[:space:]]*//')

# If there's an active REQ, check if it's properly filled
if [ -n "$ACTIVE_REQ" ] && [ "$ACTIVE_REQ" != "none" ] && [ "$ACTIVE_REQ" != "无" ]; then
  # Find the REQ file
  REQ_FILE=$(find "$ROOT/requirements" -name "${ACTIVE_REQ}-*.md" -type f 2>/dev/null | head -1)

  if [ -z "$REQ_FILE" ] || [ ! -f "$REQ_FILE" ]; then
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              🚫 REQ ENFORCEMENT: BLOCKED                    ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo ""
    echo "  Active REQ ($ACTIVE_REQ) is referenced in progress.txt,"
    echo "  but the REQ file cannot be found under requirements/."
    echo ""
    echo "  Fix the active REQ reference before making code changes."
    echo ""
    echo "╚══════════════════════════════════════════════════════════════╝"
    exit 2
  fi

  node "$ROOT/scripts/req-validation.mjs" --file "$REQ_FILE" --req-id "$ACTIVE_REQ"
  exit $?
fi

# No active REQ (or "none") — only allow requirements/ and docs/plans/
# This ensures code changes always require an active REQ
if [ -n "$TARGET_FILE" ]; then
  REL_PATH="${TARGET_FILE#$ROOT/}"
  if [[ "$REL_PATH" == requirements/* ]] || [[ "$REL_PATH" == docs/plans/* ]]; then
    exit 0
  fi
fi

# Block all other writes when no active REQ
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🚫 REQ ENFORCEMENT: BLOCKED                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo ""
echo "  No active REQ found. Code modifications require a REQ."
echo ""
echo "  To create a REQ:"
echo "    npm run req:create -- --title \"Your feature title\""
echo ""
echo "  To bypass (small fixes only):"
echo "    touch .claude/.req-exempt"
echo "    echo \"\$(date -Iseconds) | CREATE | manual | <reason>\" >> .claude/exempt-audit.log"
echo ""
echo "╚══════════════════════════════════════════════════════════════╝"
exit 2
