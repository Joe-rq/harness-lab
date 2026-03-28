# REQ-2026-007 Design

## Background

当前仓库已经有 REQ 模板、设计稿和 review / QA 报告链路，但“范围”仍主要是描述性字段。
当任务需要明确限制 agent 或协作者的可操作边界时，维护者只能把“不能改哪些文件”“不能引新依赖”之类的约束散落在聊天或设计正文里。

这不是流程缺失，而是表达位置缺失。
因此本次只做一个小升级：给 REQ 协议补一个可选的 `Scope Control` 位置，并把它同步到 `req:create` 骨架与 engineering review 检查项。

## Goal

- 增加一个轻量、可选的 `Scope Control` 字段
- 让 REQ 模板、CLI 骨架和评审入口对该字段保持一致
- 保持 backward-compatible，不把模板升级成更重的实验系统

## Scope

### In scope

- 在 `requirements/REQ_TEMPLATE.md` 的“范围”下增加 `Scope Control`
- 在 `scripts/req-cli.mjs` 的骨架生成逻辑中加入同样结构
- 在 `requirements/INDEX.md` 和 `README.md` 中说明何时使用该字段
- 在 `skills/plan/eng-review.md` 中增加对该字段的审查点
- 在 `skills/README.md` 中同步 skill 的职责说明

### Out of scope

- `Results Logging`
- REQ 复杂度分级
- 自动 enforcement、策略引擎或权限系统
- 旧 REQ 的批量迁移

## Product Review

### User Value

- 解决的问题：需要强边界的 REQ 缺少统一表达位置，容易让禁止动作和执行边界停留在口头上下文里
- 目标用户：依赖 agent 推进任务、或需要多人协作拆边界的维护者
- 预期收益：让“允许 / 禁止 / 边界条件”变成仓库内可见事实，而不是聊天附注

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：
  - `requirements/REQ_TEMPLATE.md`
  - `scripts/req-cli.mjs`
  - `requirements/INDEX.md`
  - `skills/plan/eng-review.md`
  - `skills/README.md`
  - `README.md`
- 依赖方向：
  - 继续由 REQ 驱动设计、实现、评审和 QA
  - `req:create` 继续使用内置骨架生成，但要和模板协议同步
- 需要新增或修改的边界：
  - REQ 可额外声明 `CAN / CANNOT / 边界条件`
  - engineering review 在 REQ 声明了 `Scope Control` 时，需要检查其是否清楚、是否与设计一致

### Verification

- 自动验证：
  - `npm run docs:impact`
  - `npm run docs:verify`
  - `npm run check:governance`
  - 临时 fixture 下的 `node scripts/req-cli.mjs create --title "Fixture scope control"`
- 人工验证：
  - 检查模板与生成骨架的 `Scope Control` 结构一致
  - 检查 README / INDEX / skill 是否说明该字段的使用场景
- 回滚：
  - 回退模板、CLI 骨架、技能与入口文档中的 `Scope Control` 改动
