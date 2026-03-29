# REQ-2026-009 Design

## Background

AI 可以忽略声明式指令直接修改文件。需要 PreToolUse hook 在写入前拦截。

**核心洞察**：治理框架不能依赖自觉，必须用代码强制。

## Goal

- 在 Write/Edit 前检查 REQ 状态
- 需要 REQ 但没有时，输出警告
- 提供临时豁免机制

## Scope

### In scope

- PreToolUse hook 配置
- REQ 状态检查逻辑
- 临时豁免机制

### Out of scope

- 硬性阻止操作
- CI 集成
- 改变 REQ 生命周期

## Design

### Hook 类型选择

| 类型 | 优点 | 缺点 |
|------|------|------|
| **prompt-based** | 灵活，可理解上下文 | 较慢，需要 LLM 调用 |
| **command-based** | 快速，确定性 | 不够灵活，难以判断上下文 |

**选择**：使用 **prompt-based** hook，因为：
1. 需要理解"用户是否说不用 REQ"
2. 需要判断改动规模
3. 灵活性比速度更重要

### Hook 配置

```json
{
  "PreToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [
        {
          "type": "prompt",
          "prompt": "REQ ENFORCEMENT CHECK..."
        }
      ]
    }
  ]
}
```

### 临时豁免机制

创建 `.claude/.req-exempt` 文件可临时豁免检查：

```bash
# 临时豁免
touch .claude/.req-exempt
```

## Product Review

### User Value

- 解决的问题：AI 忽略治理流程直接修改文件
- 目标用户：所有接入 Harness Lab 的项目
- 预期收益：强制治理执行，提高合规性

### Recommendation

- **Proceed** - 核心治理能力增强

## Engineering Review

### Architecture Impact

- 影响模块：.claude/settings, CLAUDE.md, AGENTS.md
- 依赖方向：无新增依赖
- 边界：只影响 Write/Edit 操作

### Verification

- 自动验证：hook 配置语法检查
- 人工验证：触发警告场景测试
- 回滚：删除 PreToolUse 配置

## Implementation Checklist

- [ ] 更新 .claude/settings.example.json 添加 PreToolUse hook
- [ ] 更新 CLAUDE.md 添加豁免机制说明
- [ ] 更新 AGENTS.md 更新强制机制说明
- [ ] 测试警告触发
