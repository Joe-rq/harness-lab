# REQ-2026-027: Hook timeout 可配置化

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 Hook timeout 硬编码为 10 秒。在性能较差的机器上，或项目规模较大时，可能需要更长的 timeout。用户需要知道如何调整这个值。

## 目标
- 在 AGENTS.md 中说明 timeout 配置方式
- 说明调整 timeout 的场景和影响

## 非目标
- 不修改 harness-install.mjs 的默认值（10 秒对大多数场景足够）
- 不添加运行时配置检测

## 范围
- 涉及目录 / 模块：AGENTS.md
- 影响接口 / 页面 / 脚本：无

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（纯文档改进）

**允许（CAN）**：
- 可修改的文件 / 模块：AGENTS.md
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：代码文件
- 不可引入的依赖 / 操作：无

**边界条件**：
- 时间 / 环境 / 数据约束：无
- 改动规模或发布边界：纯文档变更

## 验收标准
- [ ] AGENTS.md 包含 timeout 配置说明
- [ ] 说明哪些场景需要调整 timeout
- [ ] `npm run docs:verify` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-027-design.md`（豁免）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-027-code-review.md`
- QA：`requirements/reports/REQ-2026-027-qa.md`
- Ship：不需要发布

## 验证计划
- 计划执行的命令：npm run docs:verify
- 需要的环境：Node.js
- 需要的人工验证：文档审查

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：无风险，纯文档变更
- 回滚方式：git revert

## 关键决策
- 2026-04-01：来自评审结论 P2 行动项

<!-- Source file: REQ-2026-027-hook-timeout-config.md -->
