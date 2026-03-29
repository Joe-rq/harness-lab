# REQ-2026-008 Design

## Background

在 agent-flow-lite 项目接入 Harness Lab 后发现：
1. AI 跳过治理入口直接进入实现模式
2. 用户提供的"实施计划"被当作跳过 REQ 的借口
3. CLAUDE.md 中的指令是声明式的，没有强制执行机制

根本原因：框架缺少强制机制来确保治理流程被执行。

## Goal

- 确保新会话启动时 AI 必须了解当前状态
- 确保 AI 在实施前检查是否需要 REQ
- 防止"用户计划"被当作跳过 REQ 的借口

## Scope

### In scope

- 会话启动协议（CLAUDE.md 顶层声明）
- 实施前检查点（REQ 判断逻辑）
- SessionStart hook 机制
- 违规示例说明

### Out of scope

- CI 集成
- Git hooks
- MCP 服务

## Product Review

### User Value

- 解决的问题：治理框架被绕过，导致工作无记录、无追踪
- 目标用户：所有接入 Harness Lab 的项目
- 预期收益：确保治理流程被执行，提高可追溯性

### Recommendation

- **Proceed** - 核心治理能力增强，无业务风险

## Engineering Review

### Architecture Impact

- 影响模块：CLAUDE.md, AGENTS.md, scripts/, .claude/
- 依赖方向：无新增依赖
- 需要新增或修改的边界：
  - 新增 scripts/session-start.sh
  - 新增 .claude/settings.example.json

### Verification

- 自动验证：`bash scripts/session-start.sh` 输出正确
- 人工验证：新会话测试，确认状态显示
- 回滚：删除 settings.local.json 中的 hooks 配置

## Implementation Notes

### 会话启动协议

```markdown
## ⚠️ 会话启动协议

**在回复用户的第一个消息之前，必须执行以下步骤：**
1. 读取 requirements/INDEX.md
2. 读取 .claude/progress.txt
3. 在回复开头声明当前状态
```

### 实施前检查点

| 情况 | 需要 REQ |
|------|----------|
| 涉及 3+ 文件的改动 | ✅ 是 |
| 新功能开发 | ✅ 是 |
| 单文件小改动 | ❌ 否 |

### 违规示例

```
❌ 用户提供详细计划 → 直接实施 → 结束
✅ 用户提供详细计划 → 创建 REQ → 实施 → 生成报告
```

### SessionStart Hook

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$(git rev-parse --show-toplevel)/scripts/session-start.sh\"",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Subagent 兼容

脚本检测 `$CLAUDE_SUBAGENT` 或 `$AGENT_TASK` 环境变量，跳过全局上下文加载。
