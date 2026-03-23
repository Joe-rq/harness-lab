# REQ-2026-004 Design

## Background

`REQ-2026-003` 补上了静态文档质量门，但它无法约束“功能改了，文档也必须一起改”。
这类问题在模板仓库里很常见：`scripts/` 或 `package.json` 更新了，README、AGENTS、CLAUDE 或 `skills/README.md` 仍停留在旧状态。

仓库已经在 `CONTRIBUTING.md` 里写了 `Files To Update Together`，说明团队心里其实已有同步规则，只是还没有自动化执行。

## Goal

- 在 `docs:verify` 中加入 diff-aware 文档同步检查
- 复用一份集中配置来定义“触发改动 -> 需要联动更新的文档”
- 保持规则最小、透明、可维护，优先覆盖高价值入口文档

## Scope

### In scope

- 为 `docs:verify` 增加 changed files 收集和规则匹配
- 新增规则配置文件，承载 diff-aware 映射
- 更新 README / CONTRIBUTING，让维护者知道规则从哪里来、如何满足
- 让 `check:governance` 继续串联 diff-aware 检查结果

### Out of scope

- 自动生成文档内容
- 复杂语义校验
- 外部 URL / 锚点可达性增强
- CI 平台专用差异计算策略

## Product Review

### User Value

- 解决的问题：代码或治理脚本改了，但入口文档没同步时，现有静态文档检查抓不住
- 目标用户：维护 Harness Lab 模板本身的人，以及依赖入口文档接手仓库的人 / agent
- 预期收益：把“改了脚本却没改说明书”前置成自动失败，而不是 review 阶段靠人肉发现

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：
  - `scripts/docs-verify.mjs`
  - `scripts/check-governance.mjs`
  - `scripts/docs-sync-rules.json`
  - `README.md`
  - `CONTRIBUTING.md`
- 依赖方向：
  - 仅依赖本地 Node.js 与 git CLI
  - 规则配置与检查逻辑解耦，方便后续扩展
- 需要新增或修改的边界：
  - `docs:verify` 从“静态文档 lint”扩展为“静态 lint + changed-files 同步约束”
  - 如果当前目录不是 git 仓库，diff-aware 规则默认降级跳过并给出说明

### Verification

- 自动验证：
  - `npm run docs:verify`
  - `npm run check:governance`
  - 在临时 git fixture 中分别验证“缺少文档同步失败”和“补齐文档后通过”
- 人工验证：
  - 检查 README 是否说明 diff-aware 行为
  - 检查 CONTRIBUTING 是否指向规则配置入口
- 回滚：
  - 回退规则配置与 `docs:verify` 的 diff-aware 逻辑
