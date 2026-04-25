#!/usr/bin/env bash
# commit-msg hook: 校验提交消息格式
# 规范定义见 CONTRIBUTING.md

COMMIT_MSG_FILE="$1"
FIRST_LINE=$(head -1 "$COMMIT_MSG_FILE")

# 豁免：merge commit、revert commit、fixup/squash
case "$FIRST_LINE" in
  Merge*|Revert*|fixup!*|squash!*) exit 0 ;;
esac

# 允许的 type
VALID_TYPES="feat|fix|docs|refactor|test|chore"

# 正则：<type>(<scope>): <描述> (REQ-YYYY-NNN) 或 <type>: <描述>
# scope 可选，REQ 编号 feat/fix 必填
PATTERN="^(${VALID_TYPES})(\([^)]+\))?: .+"

if ! echo "$FIRST_LINE" | grep -qE "$PATTERN"; then
  cat >&2 <<EOF
🚫 Commit 消息格式错误

  实际: $FIRST_LINE

  规范: <type>(<scope>): <中文描述> (REQ-YYYY-NNN)

  type: feat | fix | docs | refactor | test | chore
  scope: req | hook | install | governance | docs（可选）

  正确示例:
    feat(req): 新增设计文档验证 (REQ-2026-020)
    fix(hook): 修复绕过漏洞 (REQ-2026-017)
    docs: 统一 commit 规范
    chore: 更新依赖

  详见 CONTRIBUTING.md
EOF
  exit 1
fi

# feat/fix 必须包含 REQ 编号（半角括号）
TYPE=$(echo "$FIRST_LINE" | sed -E "s/^(${VALID_TYPES}).*/\1/")
if [ "$TYPE" = "feat" ] || [ "$TYPE" = "fix" ]; then
  if ! echo "$FIRST_LINE" | grep -qE "\(REQ-[0-9]{4}-[0-9]{3}\)"; then
    cat >&2 <<EOF
🚫 feat/fix 类型必须包含 REQ 编号（半角括号）

  实际: $FIRST_LINE

  缺少 (REQ-YYYY-NNN)，或使用了全角括号（）

  正确: feat(req): 新增功能 (REQ-2026-041)
  错误: feat(req): 新增功能（REQ-2026-041）
EOF
    exit 1
  fi
fi

exit 0
