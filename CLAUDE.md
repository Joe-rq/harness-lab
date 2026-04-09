# CLAUDE.md

## ⚠️ 会话启动协议

**在回复用户的第一个消息之前，必须执行以下步骤：**

1. 读取 `requirements/INDEX.md` 确认当前活跃 REQ
2. 读取 `.claude/progress.txt` 恢复上下文
3. 在回复开头声明当前状态

**状态声明格式：**
```
📊 当前状态: [REQ编号] / [阶段] / [下一步]
```

**如果用户没有指定任务，不要主动开始实现。先确认：**
- 当前是否有活跃 REQ？
- 用户想要做什么？

---

## 🚨 实施前检查点

**在写代码之前，必须通过以下检查：**

### 检查 1: 是否需要 REQ？

| 情况 | 需要 REQ |
|------|----------|
| 涉及 3+ 文件的改动 | ✅ 是 |
| 新功能开发 | ✅ 是 |
| 架构/流程变更 | ✅ 是 |
| 单文件小改动（typo、小 bug） | ❌ 否 |
| 用户明确说"不用 REQ" | ❌ 否 |

### 检查 2: REQ 颗粒度是否合适？

**核心原则：一个 REQ 涉及实体数 ≤ 4**

实体定义：修改/新增的文件、涉及的模块、关联的概念。

| 涉及文件数 | 判断 |
|-----------|------|
| 1-2 | ❌ 不需要 REQ |
| 3-4 | ✅ 需要 1 个 REQ |
| 5-8 | ⚠️ 需要 2 个 REQ（按功能边界拆分） |
| 9+ | ❌ 必须拆分为 3+ 个 REQ |

**颗粒度自检清单**（创建 REQ 时必填）：

```
1. [ ] 目标数 ≤ 4？
2. [ ] 涉及文件数 ≤ 4？
3. [ ] 涉及模块/目录 ≤ 4？
4. [ ] 能否用一句话描述"解决了什么问题"？
5. [ ] 如果失败，能否干净回滚？
```

任何一项回答"否"→ 考虑拆分。

### 检查 3: REQ 是否存在？

```
如果需要 REQ:
  ├── 有活跃 REQ → 继续实施
  └── 无活跃 REQ → 先创建 REQ，再实施
```

### 检查 4: 计划来源是什么？

**重要：** 用户给出的"实施计划"不等于 REQ！

- 用户给计划 → 询问是否需要创建 REQ → 创建 REQ → 实施
- 用户说"直接做"且符合小改动标准 → 可以跳过 REQ

### 违规示例（禁止）

```
❌ 用户提供详细计划 → 直接实施 → 结束
✅ 用户提供详细计划 → 创建 REQ → 实施 → 生成报告
```

### 强制执行机制

PreToolUse hook 会**强制阻断**无活跃 REQ 的文件修改操作：

```
🚫 REQ ENFORCEMENT: BLOCKED
No active REQ found. File modifications require a REQ for:
  - 3+ file changes
  - New feature development
  - Architecture/flow changes
```

Hook 也会检测 REQ 是否有实际内容：
- 如果 REQ 仍包含模板占位符（如 `说明为什么要做这件事。`），会被阻断
- 如果 REQ 状态是 `draft`，需要先运行 `npm run req:start` 进入 in-progress 状态

`req:create` 只会生成骨架文件，不代表这个 REQ 已经可以直接开始实施。
在运行 `npm run req:start` 之前，必须先把背景、目标、验收标准等关键章节写实；空模板 REQ 会被 `req:start` 直接拒绝。

### REQ 工作流程

```bash
# 1. 创建 REQ（自动创建豁免文件）
npm run req:create -- --title "Your feature"

# 2. 填充 REQ 内容（背景、目标、验收标准等）
# 豁免文件已自动创建，可以直接编辑 requirements/in-progress/REQ-xxx-*.md

# 3. 启动 REQ（验证内容完整性，自动删除豁免文件）
npm run req:start -- --id REQ-xxx --phase implementation

# 4. 开始实施
```

**关键点**：
- `req:create` 会自动创建 `.claude/.req-exempt` 豁免文件
- `req:start` 成功后会自动删除豁免文件
- 如果手动创建豁免文件，应在完成后删除

### 临时豁免机制

如果需要临时跳过 REQ 检查（如紧急修复、小改动）：

```bash
# 创建豁免标记文件
touch .claude/.req-exempt

# 完成后删除
rm .claude/.req-exempt
```

**注意**：豁免应在完成任务后立即删除，不应长期保留。

---

## 角色

你在一个采用 Harness Lab 的仓库里工作。你的首要目标不是立刻修改代码，而是先按索引恢复上下文，再按 REQ 推进工作。

## 默认工作方式

### 理解任务
- 从 REQ 和设计稿理解范围、非目标和验收标准
- 只加载本次任务必要的业务和技术 context

### 实现任务
- 遵循 `plan -> build -> verify -> fix -> record` 闭环
- **build 阶段**：如果涉及 4+ 文件，系统会提示。此时请反思：是否真的需要这么多文件？能否用 TaskCreate 拆分？
- **verify 阶段**：执行元反思（对照 REQ 模板中的检查清单）
- **record 阶段**：执行对齐检查（确认实现与目标、设计、验收标准对齐）
- 重要状态变化及时更新 `.claude/progress.txt`

> **4 实体规则**：人类工作记忆约 4±1 个组块。当修改文件 ≥4 时，系统会触发警告。这不是硬性限制，而是触发反思的信号——考虑拆分或使用 TaskCreate。

### 验证任务
- review / QA / ship 的结论必须落到 `requirements/reports/`
- 报告里要记录实际执行的命令、结果和阻塞项
- 如果修改的是模板仓库的入口文档或治理脚本，至少执行 `npm test`、`npm run docs:verify` 和 `npm run check:governance`

### 完成任务
- 更新 REQ 状态
- 更新 `.claude/progress.txt`
- 有复用价值的结论写入 `context/experience/`

## 输出约束

- 不要把"计划中"说成"已完成"
- 不要把"理论上可行"说成"已验证"
- 不要让关键决策只存在聊天记录里
- 不要跳过报告落盘

## 完成定义

一个需求只有在下面条件满足时，才算真正推进：
- REQ 状态更新了
- 设计稿与实现一致
- review / QA / ship 结论已落盘
- **元反思检查已完成**（verify 阶段的问题清单已回答）
- **对齐检查已完成**（实现与目标、设计、验收标准对齐确认）
- 验证命令真实执行或明确说明未执行原因
- `.claude/progress.txt` 能让下一次会话继续接手
