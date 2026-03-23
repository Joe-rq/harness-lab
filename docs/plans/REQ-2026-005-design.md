# REQ-2026-005 Design

## Background

当前仓库已经有 `docs:verify`，能在 changed files 与规则不一致时失败，但 agent 只有在跑验证时才会得到反馈。
这还属于“被动撞墙”，不是 agent-first 的 drift-control。

对于以仓库文档作为外部记忆的工作流，更合理的模式是：
1. 先把本次文档影响面显式列出来
2. 再在 REQ 完成时用同一套规则做最终阻断

这样 agent 不需要等人提醒“顺手改 README”，而是从一开始就拿到待办，并在完成 REQ 前被机械 gate 强制收口。

## Goal

- 增加 `docs:impact`，让 changed files 对应的文档义务对 agent 可见
- 让 `req:complete` 复用同一套 diff-aware 规则，在文档义务未满足时拒绝完成
- 保持实现简单：复用现有规则文件和 changed-files 快照方式，不新造一套 drift engine

## Scope

### In scope

- 在 `docs-verify` 逻辑中抽出“分析 changed files -> 输出 impact”的共享能力
- 新增 `docs:impact` 命令
- 在 `req:complete` 中接入 docs drift gate
- 更新 README / CONTRIBUTING 说明推荐顺序：先 `docs:impact`，后 `req:complete`

### Out of scope

- 自动生成或自动回填文档
- 更复杂的规则语义（如 `requireAll`）
- 远程 CI / PR comment 集成
- 多 REQ 并发下的差异归属问题

## Product Review

### User Value

- 解决的问题：agent 只能在最后撞到 `docs:verify` 失败，缺少前置文档待办和完成前强约束
- 目标用户：主要依赖 agent 推进 REQ、并把仓库文档当作长期记忆的维护者
- 预期收益：把文档同步从“人提醒”变成“流程默认动作”

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：
  - `scripts/docs-verify.mjs`
  - `scripts/req-cli.mjs`
  - `package.json`
  - `README.md`
  - `CONTRIBUTING.md`
- 依赖方向：
  - 继续依赖 git status 快照作为 changed-files 输入
  - `req-cli` 直接复用 docs drift 分析，而不是复制规则判断
- 需要新增或修改的边界：
  - `docs:verify` 不再只是 pass/fail，也要能输出 impact 摘要
  - `req:complete` 在进入完成态前新增 docs drift gate

### Verification

- 自动验证：
  - `npm run docs:impact`
  - `npm run docs:verify`
  - `npm run check:governance`
  - 临时 fixture 下的 `npm run req:complete -- --id ...`
- 人工验证：
  - 检查 `docs:impact` 输出是否能直接指导 agent 补文档
  - 检查 complete gate 失败信息是否清楚指出缺失文档
- 回滚：
  - 回退 `docs:impact` 和 `req:complete` 的 docs drift 集成
