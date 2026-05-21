# REQ-2026-063: feat: governance audit warning triage

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：REQ-2026-062 引入完成态审计后，全量 `req:audit` 能暴露历史治理债务，但当前仓库已有 125 个 legacy warning。长列表虽然准确，却会让维护者难以快速判断“有没有新的错误、主要债务类型是什么、是否需要展开细节”。
业务背景：Harness Lab 需要把治理健康从“输出所有问题”升级为“默认输出可读摘要，必要时可展开明细”。这能保留审计严谨性，同时降低历史债务对日常检查的噪音。

## 目标
- 为 `req:audit` 增加 warning/error 摘要和可控明细输出
- 为 `governance:health` 增加 audit warning 分布、legacy/current 区分和 top finding code
- 补充专项测试，确保摘要不改变 JSON findings 和门禁语义
- 更新使用文档和完成交付物

## 非目标
- 不批量改写历史 completed REQ 或 QA 报告
- 不降低 targeted audit / `req:complete` 的 error 级阻断
- 不引入自动修复或 warning suppression 文件
- 不引入外部依赖

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [x] 涉及文件数 ≤ 4？（核心代码/测试/文档约 4 类，另有本 REQ 交付物）
- [x] 涉及模块/目录 ≤ 4？（scripts / tests / README / requirements）
- [x] 能否用一句话描述"解决了什么问题"？把历史 audit warning 长列表变成默认可读、可展开的治理摘要。
- [x] 如果失败，能否干净回滚？可通过 git revert 回滚本 REQ 变更。

## 范围
- 涉及目录 / 模块：`scripts/`, `tests/`, `README.md`, `requirements/`
- 影响接口 / 页面 / 脚本：`req:audit`, `governance:health`

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [x] skip-design-validation（小型输出体验优化，设计摘要直接写入 REQ）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-audit.mjs`, `scripts/governance-health.mjs`, `tests/req-audit.test.mjs`, `README.md`
- 可新增的测试 / 脚本：在 `tests/req-audit.test.mjs` 内新增摘要行为测试

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：历史 completed REQ 正文和旧 QA 报告（除非当前 REQ 交付物）
- 不可引入的依赖 / 操作：新增 npm 依赖、自动修复、批量历史迁移

**边界条件**：
- 时间 / 环境 / 数据约束：仅使用 Node.js 标准库
- 改动规模或发布边界：保持 `check:governance` 的 pass/fail 语义不变

## 验收标准
- [x] `req:audit --all` 默认输出摘要，不再刷出完整 warning 长列表
- [x] `req:audit --verbose` 可展开完整 finding 明细
- [x] `req:audit --max-findings N` 可限制文本明细数量
- [x] JSON 输出继续包含 `{ ok, findings }`，并增加可机器消费的 `summary`
- [x] `governance:health` 文本和 JSON 展示 warning 分布、legacy/current 计数和 top finding code
- [x] `check:governance` 的 error 阻断语义不变，warning 仍不阻断
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：小型优化，设计摘要直接写入本 REQ
- 相关规范：REQ-2026-062 审计框架

## 报告链接
- Code Review：`requirements/reports/REQ-2026-063-code-review.md`
- QA：`requirements/reports/REQ-2026-063-qa.md`
- Ship：`requirements/reports/REQ-2026-063-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test && npm run docs:verify && npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：手动查看 `req:audit` 和 `governance:health` 文本输出是否更易读

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：默认摘要、verbose 展开、max-findings、JSON summary 和 health 摘要均已实现。
- [x] 旧功能保护：`check:governance` 仍通过，warning 不阻断、error 继续阻断。
- [x] 逻辑正确性：测试覆盖默认隐藏明细、verbose 展开、max-findings 截断和 summary 统计。
- [x] 完整性：README 已说明新用法，health 文本和 JSON 均同步。
- [x] 可维护性：summary 由 `req-audit` 统一计算，health 复用同一结构。

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现直接降低历史 warning 长列表噪音。
- [x] 设计对齐：保持只读审计和门禁语义不变，只优化输出层和健康摘要。
- [x] 验收标准对齐：所有验收标准均已验证。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：功能遗漏（对照验收标准检查）、与现有功能冲突
- 回滚方式：`git revert` 或功能开关关闭

## 关键决策
- 2026-05-17：Feature 型 REQ，建议创建设计文档

<!-- Source file: REQ-2026-063-feat-governance-audit-warning-triage.md -->
