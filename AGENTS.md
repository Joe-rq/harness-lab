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
├── skills/
│   ├── plan/
│   ├── review/
│   ├── qa/
│   └── ship/
└── .claude/
    └── progress.txt
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
- 设计稿进入 `docs/plans/`
- 变更完成后补 `requirements/reports/` 下的 review / QA / ship 报告
- 完成后移入 `requirements/completed/`

### 3. 执行原则
- 优先读取索引，再按需深入
- 验证必须真实执行，不能只写“看起来没问题”
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

## 框架使用边界

Harness Lab 不替你做业务架构决策。
它提供的是：
- 如何组织需求推进
- 如何保存设计与验证证据
- 如何让多次会话能连续工作
- 如何把经验复用给后续的人和 agent

如果目标项目已经有自己的分层、命令和发布方式，应保留原有业务结构，只在外面套这层治理协议。
