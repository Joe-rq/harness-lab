#!/bin/bash
# Harness Lab 会话启动脚本
# 在每次会话开始时输出当前状态
# 仅对主会话生效，跳过 subagent 会话

# 检测是否是 subagent 会话（通过环境变量或其他标识）
# Subagents 通常有特定的环境变量或任务上下文
if [ -n "$CLAUDE_SUBAGENT" ] || [ -n "$AGENT_TASK" ]; then
  # Subagent 会话，跳过全局上下文加载
  echo "🔄 Subagent 会话，跳过全局上下文加载"
  exit 0
fi

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$ROOT_DIR" ]; then
  echo "⚠️ 无法确定仓库根目录"
  exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🔄 Harness Lab 会话启动"
echo "════════════════════════════════════════════════════════════"

# 检查豁免文件 TTL
EXEMPT_FILE="$ROOT_DIR/.claude/.req-exempt"
EXEMPT_TTL_SECONDS=7200  # 2 小时

if [ -f "$EXEMPT_FILE" ]; then
  # 获取文件修改时间（秒级时间戳）
  if stat --format='%Y' "$EXEMPT_FILE" >/dev/null 2>&1; then
    # GNU stat (Linux)
    EXEMPT_MTIME=$(stat --format='%Y' "$EXEMPT_FILE")
  elif stat -f '%m' "$EXEMPT_FILE" >/dev/null 2>&1; then
    # BSD stat (macOS)
    EXEMPT_MTIME=$(stat -f '%m' "$EXEMPT_FILE")
  else
    # Fallback: 用 find
    EXEMPT_MTIME=$(find "$EXEMPT_FILE" -printf '%T@' 2>/dev/null | cut -d. -f1)
  fi

  if [ -n "$EXEMPT_MTIME" ]; then
    NOW=$(date +%s)
    AGE=$(( NOW - EXEMPT_MTIME ))

    if [ "$AGE" -gt "$EXEMPT_TTL_SECONDS" ]; then
      HOURS=$(( AGE / 3600 ))
      MINUTES=$(( (AGE % 3600) / 60 ))
      echo ""
      echo "╔════════════════════════════════════════════════════════════╗"
      echo "║            ⚠️  豁免文件已过期                              ║"
      echo "╠════════════════════════════════════════════════════════════╣"
      echo "║  .claude/.req-exempt 已存在 ${HOURS}h ${MINUTES}m"
      echo "║  超过 2 小时 TTL，治理检查已被绕过。"
      echo "║"
      echo "║  如果豁免不再需要，请删除："
      echo "║    rm .claude/.req-exempt"
      echo "║"
      echo "║  如果仍需豁免，请确认原因并记录。"
      echo "╚════════════════════════════════════════════════════════════╝"
    else
      MINUTES_LEFT=$(( (EXEMPT_TTL_SECONDS - AGE) / 60 ))
      echo ""
      echo "⏳ 豁免文件有效（剩余 ${MINUTES_LEFT} 分钟）：.claude/.req-exempt"
    fi
  fi
fi

# 读取 progress.txt
PROGRESS_FILE="$ROOT_DIR/.claude/progress.txt"
if [ -f "$PROGRESS_FILE" ]; then
  echo ""
  echo "📋 当前进度："
  # 提取关键信息
  grep -E "^(Current|Last|Next|Recently)" "$PROGRESS_FILE" | head -10
else
  echo "⚠️ 进度文件不存在: $PROGRESS_FILE"
fi

# 读取 INDEX.md 中的活跃 REQ
INDEX_FILE="$ROOT_DIR/requirements/INDEX.md"
if [ -f "$INDEX_FILE" ]; then
  echo ""
  echo "📌 需求索引："
  # 提取当前活跃 REQ
  sed -n '/## 当前活跃 REQ/,/^## /p' "$INDEX_FILE" | head -10
else
  echo "⚠️ 需求索引不存在: $INDEX_FILE"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ 请根据上述状态继续工作，或询问用户需要做什么"
echo "════════════════════════════════════════════════════════════"
echo ""
