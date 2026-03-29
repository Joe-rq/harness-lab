# AGENTS.md

Harness Lab 是一个 `研发治理层模板`，不是业务运行时框架。

它的目标是让任何接手该仓库的人或 agent，都能按一致的入口、状态和交付物推进工作，而不是依赖口头上下文。

## 项目定位

本仓库固定的是治理协议，不固定的是业务实现。

固定内容：
- REQ 生命周期
- 设计、评审、QA、发布的交付物
- 索引优先的上下文加载顺序
- 进度交接和经验沉淀机制
- **会话启动协议和实施前检查点**
- **SessionStart hook 强制机制**

由目标项目自己决定的内容：
- 技术栈
- 目录结构
- 架构分层
- 测试、构建、发布命令
- 领域规则和安全边界

## 目录导航

```text
.
├── AGENTS.md
├── CLAUDE.md
├── context/
│   ├── business/
│   ├── tech/
│   └── experience/
├── docs/
│   ├── plans/
│   └── specs/
├── requirements/
│   ├── INDEX.md
│   ├── REQ_TEMPLATE.md
│   ├── in-progress/
│   ├── completed/
│   └── reports/
├── scripts/
│   └── session-start.sh      # 会话启动脚本
├── skills/
│   ├── README.md
│   ├── plan/
│   ├── review/
│   ├── qa/
│   └── ship/
└── .claude/
    ├── progress.txt
    └── settings.example.json  # hook 配置示例
```

## 强制机制

### 1. SessionStart Hook

为确保治理协议被执行，建议配置 SessionStart hook：

1. 复制 `.claude/settings.example.json` 到 `.claude/settings.local.json`
2. 确保 `scripts/session-start.sh` 有执行权限
3. 新会话开始时会自动显示当前 REQ 状态

### 2. PreToolUse Hook

在 Write/Edit 操作前自动检查 REQ 状态：

```
触发条件：Write 或 Edit 文件
检查内容：当前是否有活跃 REQ
输出：如需要 REQ 但没有，输出警告提醒
行为：软性提醒，不阻止操作
```

**豁免机制**：
```bash
# 临时豁免（紧急修复、小改动）
touch .claude/.req-exempt

# 完成后删除
rm .claude/.req-exempt
```

### 3. 实施前检查点

**在写代码之前必须检查：**

1. **是否需要 REQ？**
   - 涉及 3+ 文件、新功能、架构变更 → 需要
   - 单文件小改动 → 不需要

2. **REQ 是否存在？**
   - 有活跃 REQ → 继续
   - 无活跃 REQ → 先创建

3. **重要：用户给出的"实施计划"不等于 REQ！**
   - 用户给计划 → 创建 REQ → 实施 → 生成报告

### 违规示例（禁止）

```
❌ 用户提供详细计划 → 直接实施 → 结束
✅ 用户提供详细计划 → 创建 REQ → 实施 → 生成报告
```

## 默认读取顺序

每次会话开始时，按下面顺序读取：
1. `AGENTS.md`
2. `requirements/INDEX.md`
3. `.claude/progress.txt`
4. 相关的 `context/*/README.md`
5. 当前 REQ、设计稿、报告和必要代码

不要默认读取整个 `context/`，更不要把整个仓库一次性吃进上下文。

## 标准工作流

### 1. 接手前
- 确认当前活跃 REQ
- 确认 progress 中的最新状态
- 确认目标项目是否已经绑定真实验证命令

### 2. 创建或继续 REQ
- 新需求进入 `requirements/in-progress/`
- `blocked / suspended` 的 REQ 仍保留在 `requirements/in-progress/`，并在 REQ 与索引里写明恢复条件
- 中大改动的设计稿进入 `docs/plans/`
- 小改动可把设计摘要直接写进 REQ
- 变更完成后补 `requirements/reports/` 下的 review / QA / ship 报告
- 完成后移入 `requirements/completed/`

### 3. 执行原则
- 优先读取索引，再按需深入
- 验证必须真实执行，不能只写"看起来没问题"
- 评审和 QA 必须有落盘结果
- 经验沉淀必须回写 `context/experience/`

## 交付物要求

一个完整 REQ 通常会产生这些文件：
- `requirements/in-progress/REQ-xxxx-*.md` 或 `requirements/completed/REQ-xxxx-*.md`
- `docs/plans/REQ-xxxx-design.md`
- `requirements/reports/REQ-xxxx-code-review.md`
- `requirements/reports/REQ-xxxx-qa.md`
- `requirements/reports/REQ-xxxx-ship.md`（需要发布时）
- `context/experience/*.md`（有复用价值时）

## 版本历史

- 2026-03-29: 添加 PreToolUse hook 强制检查 REQ 状态
- 2026-03-29: 添加会话启动协议、实施前检查点和 SessionStart hook 机制

## 框架使用边界

Harness Lab 不替你做业务架构决策。
它提供的是：
- 如何组织需求推进
- 如何保存设计与验证证据
- 如何让多次会话能连续工作
- 如何把经验复用给后续的人和 agent

如果目标项目已经有自己的分层、命令和发布方式，应保留原有业务结构，只在外面套这层治理协议。
