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

# 显示当前模式
MODE_FILE="$ROOT_DIR/.claude/harness-mode"
if [ -f "$MODE_FILE" ]; then
  HARNESS_MODE=$(cat "$MODE_FILE" | tr -d '[:space:]')
else
  HARNESS_MODE="collaborative"
fi
echo ""
echo "🛡️ 模式: ${HARNESS_MODE}"

# 显示当前会话风险等级
RATCHET_FILE="$ROOT_DIR/.claude/.risk-ratchet"
if [ -f "$RATCHET_FILE" ]; then
  RISK_LEVEL=$(cat "$RATCHET_FILE" | tr -d '[:space:]')
  if [ -n "$RISK_LEVEL" ]; then
    echo "⚠️ 风险: R${RISK_LEVEL}"
  fi
fi

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

# 不变量统计
INV_DIR="$ROOT_DIR/context/invariants"
if [ -d "$INV_DIR" ]; then
  INV_TOTAL=$(ls "$INV_DIR"/INV-*.md 2>/dev/null | grep -v TEMPLATE | wc -l | tr -d ' ')
  INV_ACTIVE=$(grep -rl "^status: active" "$INV_DIR"/INV-*.md 2>/dev/null | wc -l | tr -d ' ')
  INV_DRAFT=$(grep -rl "^status: draft" "$INV_DIR"/INV-*.md 2>/dev/null | wc -l | tr -d ' ')
  INV_DEPRECATED=$(grep -rl "^status: deprecated" "$INV_DIR"/INV-*.md 2>/dev/null | wc -l | tr -d ' ')
  echo ""
  echo "🛡️ 不变量: ${INV_TOTAL} 条 (active: ${INV_ACTIVE} / draft: ${INV_DRAFT} / deprecated: ${INV_DEPRECATED})"
fi

# 检测未完成 REQ 并展示中断点
ACTIVE_REQ=""
if [ -f "$PROGRESS_FILE" ]; then
  ACTIVE_REQ=$(grep "^Current active REQ:" "$PROGRESS_FILE" | sed 's/Current active REQ: *//' | tr -d '[:space:]')
fi

if [ -n "$ACTIVE_REQ" ] && [ "$ACTIVE_REQ" != "none" ] && [ "$ACTIVE_REQ" != "无" ]; then
  # 检查 REQ 是否仍在 in-progress 目录
  REQ_IN_PROGRESS=$(ls "$ROOT_DIR"/requirements/in-progress/${ACTIVE_REQ}*.md 2>/dev/null | head -1)
  if [ -n "$REQ_IN_PROGRESS" ]; then
    echo ""
    echo "📎 中断点恢复："

    # 展示最近 session-log（最近一条）
    LATEST_LOG=$(ls -t "$ROOT_DIR"/.claude/session-log/session-*.md 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
      # 提取该 log 中的改动文件
      LOG_REQ=$(grep "^- 活跃 REQ:" "$LATEST_LOG" | sed 's/- 活跃 REQ: *//')
      if [ "$LOG_REQ" = "$ACTIVE_REQ" ]; then
        echo "  📋 上次会话摘要："
        sed -n '/^## 改动文件/,/^## /p' "$LATEST_LOG" | grep "^- " | head -5 | while read -r line; do
          echo "    $line"
        done
      fi
    fi

    # 展示 git diff 中与该 REQ 相关的未提交文件
    UNCOMMITTED=$(git -C "$ROOT_DIR" diff --name-only HEAD 2>/dev/null | head -5)
    if [ -n "$UNCOMMITTED" ]; then
      echo "  📝 未提交改动："
      echo "$UNCOMMITTED" | while read -r line; do
        echo "    - $line"
      done
    fi

    echo "  💡 询问用户：是否继续 ${ACTIVE_REQ}？"
  fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ 请根据上述状态继续工作，或询问用户需要做什么"
echo "════════════════════════════════════════════════════════════"
echo ""
