# REQ-2026-007: Scope control lightweight upgrade

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 REQ 的“范围”字段只能描述会改哪里，不能直接表达 agent 或协作者这次“允许做什么、禁止做什么”。
这会带来两个实际问题：
- 对需要强边界的任务，只写“涉及目录”还不够，容易把禁止动作留在口头约束里
- 即使维护者已经有明确边界，模板和 `req:create` 也没有统一位置承载它

因此需要做一次小升级，把 `Scope Control` 引入 REQ 协议层，但只做可选增强，不把模板扩成实验或指标系统。

## 目标
- 为 REQ 模板增加可选的 `Scope Control` 子节
- 让 `npm run req:create` 生成的新 REQ 骨架包含同样的 `Scope Control` 结构
- 让维护者和评审者知道什么时候应该填写、如何检查这个字段

## 非目标
- 不引入 `Results Logging`、Level 分级或完整实验循环
- 不把 `Scope Control` 做成强制填写项或自动执行器
- 不在本轮增加新的目录结构或技能体系

## 范围
- 涉及目录 / 模块：
  - `requirements/REQ_TEMPLATE.md`
  - `requirements/INDEX.md`
  - `scripts/req-cli.mjs`
  - `skills/plan/eng-review.md`
  - `skills/README.md`
  - `README.md`
- 影响接口 / 页面 / 脚本：
  - `npm run req:create`
  - REQ 编写约定
  - engineering review 检查清单

### 约束（Scope Control）
> 明确这次升级允许做什么、不能顺手扩到哪里。

**允许（CAN）**：
- 修改模板、REQ CLI 骨架和相关说明文档
- 为 engineering review 增加对 `Scope Control` 的审查项
- 补充最小经验沉淀与 REQ 报告

**禁止（CANNOT）**：
- 同时引入 `Results Logging`
- 修改 REQ 生命周期状态机或新增复杂分级系统
- 把 `Scope Control` 扩展成自动阻断、自动授权或策略引擎

**边界条件**：
- 保持新增字段为可选填写
- 不破坏现有 REQ 文件兼容性
- 生成骨架与模板结构必须保持一致

## 验收标准
- [x] `requirements/REQ_TEMPLATE.md` 在“范围”下新增可选的 `Scope Control` 子节，包含 `CAN / CANNOT / 边界条件`
- [x] `scripts/req-cli.mjs` 生成的新 REQ 骨架包含与模板一致的 `Scope Control` 结构
- [x] `requirements/INDEX.md`、`README.md` 和 `skills/plan/eng-review.md` 说明何时使用和如何审查 `Scope Control`
- [x] 真实执行验证命令，至少覆盖 REQ CLI 骨架生成和治理检查通过场景

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-007-design.md`
- 相关规范：`requirements/REQ_TEMPLATE.md`、`scripts/req-cli.mjs`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-007-code-review.md`
- QA：`requirements/reports/REQ-2026-007-qa.md`
- Ship：`requirements/reports/REQ-2026-007-ship.md`（本次不适用；模板协议小升级，无独立发布动作）

## 验证计划
- 计划执行的命令：
  - `npm run docs:impact`
  - `npm run docs:verify`
  - `npm run check:governance`
  - 临时 fixture 下的 `node scripts/req-cli.mjs create --title "Fixture scope control"`
- 需要的环境：
  - Node.js
  - Git
- 需要的人工验证：
  - 核对模板与 `req:create` 生成骨架中的 `Scope Control` 结构一致
  - 核对 README / INDEX / skill 已说明该字段是“可选但显式”的边界表达

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
  - 如果只改模板不改 `req:create`，后续新 REQ 会继续产出旧骨架
  - 如果把 `Scope Control` 写得过重，会让轻量 REQ 也被迫填写大量约束
- 回滚方式：
  - 回退模板、CLI 骨架和相关说明文档中的 `Scope Control` 变更

## 关键决策
- 2026-03-28：由 `req:create` 自动生成骨架，待补充具体内容
- 2026-03-28：本轮只落地 `Scope Control`，不把 `Results Logging` 一起并入基础模板
- 2026-03-28：`Scope Control` 保持可选字段，但 `req:create` 与模板都要提供统一骨架，避免约定漂移

<!-- Source file: REQ-2026-007-scope-control-lightweight-upgrade.md -->
