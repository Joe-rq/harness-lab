# 2026-05-12 feat: Claude Code worktree REQ guidance

## 场景

Claude Code 用户日常通过 `feature` / `bugfix` / `refactor` source-command skills 创建 REQ。Harness Lab 支持 worktree 本地进度隔离后，如果这些入口仍要求全局无活跃 REQ，就会阻断并行工作流；但把完整 worktree 流程塞进每个 REQ 类型 skill 又会造成重复和漂移。

## 关联材料

- REQ: `requirements/completed/REQ-2026-060-claude-code-worktree-req-guidance.md`
- Design: `docs/plans/REQ-2026-060-design.md`（如有）
- Code Review: `requirements/reports/REQ-2026-060-code-review.md`
- QA: `requirements/reports/REQ-2026-060-qa.md`

## 问题 / 模式

- 入口 skill 的前置检查必须与底层状态模型一致：底层按 worktree 读取 `progress.txt`，skill 也应按当前 worktree 判断活跃 REQ。
- 完整 worktree 流程包含创建目录、分支命名、状态检查、REQ 创建/启动和收尾，适合独立 skill 承载。
- 迁移安装器如果只复制阶段导航 `skills/`，不复制 `.agents/skills/source-command-*`，目标项目会缺少 Claude Code source-command 引导。

## 关键决策

- 保留 `feature` / `bugfix` / `refactor` 的轻量定位，只把前置检查改为 `npm run req:status` 当前 worktree 检查，并提示 `--all` 查看全局。
- 新增 `source-command-worktree-req` 承载并行 REQ 全流程，避免三个类型 skill 重复维护 worktree 操作细节。
- 将 `.agents/skills/source-command-*` 纳入 `harness-install` 默认 skills 模块，确保迁移后的 Claude Code 入口与源仓库一致。

## 解决方案

1. 更新现有 REQ 类型 skills：当前 worktree 无活跃 REQ 才创建；需要并行时转向 `source-command-worktree-req`。
2. 新增专用 worktree skill：引导 `git worktree add`、`cd`、`req:status`、`req:create`、`req:start`、`req:status -- --all` 和收尾删除。
3. 更新安装器、harness-setup command/skill、README 和契约测试，保证迁移时带上同一套 Claude Code source-command skills。

## 复用建议

- 当底层治理状态从全局改为局部隔离时，必须同步更新 agent-facing skills 的判断口径。
- 对“常规入口 + 专项流程”的组合，常规入口只保留分流提示，专项流程单独成 skill，降低重复。
- 修改迁移入口时，同步检查 `harness-install` 清单、harness-setup command、harness-setup skill、README 和安装器契约测试。
