# REQ-2026-036: 学习闭环：经验回流机制

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

项目已完成 35 个 REQ，`context/experience/` 中沉淀了 20+ 篇经验文档。但这些文档是"死资产"——写完就躺平，从不被消费。第 35 个 REQ 和第 1 个 REQ 面对的治理规则完全一样，系统没有从历史中学到任何东西。

发展战略（`docs/plans/development-strategy-meta-reflection.md`）将"经验回流"列为方向 1，评分当前 Layer 4 持续优化层仅 40/100。核心缺口：经验 → 模式 → 注入 skill/hook 这条链路完全断开。

最小行动：做一个不变量提取器，扫描 experience 中的失败/错误模式，提取为结构化规则，在 PreToolUse hook 中按文件路径匹配自动注入相关警告。

## 目标

- **目标 1**：创建 `scripts/invariant-extractor.mjs`，扫描 `context/experience/` 提取可复用的失败模式/不变量规则
- **目标 2**：创建 `context/invariants/` 目录存放提取出的结构化规则（如 `INV-001-template-placeholder-escape.md`）
- **目标 3**：在 PreToolUse hook（`req-check.sh` 或新 hook）中，按文件路径/操作类型匹配不变量，自动输出提醒
- **目标 4**：在 `req:complete` 流程中触发重新扫描，确保新经验能回流到不变量库

## 非目标

- 不做自学习（skill 自我改写），那是远期目标
- 不做跨项目模式共享
- 不做 Skill 参数化（方向 3）
- 不做 NLP/LLM 智能提取——先用正则 + 结构化模板，人工确认

## 范围
- 涉及目录 / 模块：`scripts/`、`context/invariants/`（新增）、`context/experience/`（只读扫描）
- 影响接口 / 页面 / 脚本：`req-check.sh`（新增不变量检查调用）、`req-cli.mjs`（complete 时触发扫描）

### 约束（Scope Control）

**允许（CAN）**：
- 修改 `scripts/req-check.sh`、`scripts/req-cli.mjs`
- 新增 `scripts/invariant-extractor.mjs`
- 新增 `context/invariants/` 目录及规则文件

**禁止（CANNOT）**：
- 不修改 `context/experience/` 中的现有文档
- 不引入新的 npm 依赖
- 不修改 CLAUDE.md 的核心规则

**边界条件**：
- 不变量提取基于正则匹配 + 手动确认模板，不做 LLM 调用
- 初始版本从现有 20 篇 experience 中提取 3-5 条核心不变量作为种子

## 验收标准
- [ ] `invariant-extractor.mjs` 能扫描 experience 目录并输出结构化不变量候选
- [ ] `context/invariants/` 目录有至少 3 条初始不变量规则
- [ ] PreToolUse hook 在匹配到相关操作时输出不变量提醒
- [ ] `req:complete` 触发后自动重新扫描 experience 目录
- [ ] 手动测试：新建一个符合已知失败模式的操作，验证 hook 是否输出提醒
- [ ] 不增加 req-check.sh 执行时间超过 2 秒

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-036-design.md`
- 相关规范：`docs/plans/development-strategy-meta-reflection.md`（方向 1）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-036-code-review.md`
- QA：`requirements/reports/REQ-2026-036-qa.md`
- Ship：`requirements/reports/REQ-2026-036-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- `node scripts/invariant-extractor.mjs --scan` 验证扫描输出
- `node scripts/invariant-extractor.mjs --check --file scripts/xxx.mjs` 验证不变量匹配
- `npm test` 确保不破坏现有测试
- 手动测试 req-check.sh 在匹配场景下的输出

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：不变量提取精度低，产生噪声警告导致用户忽略 → 初始版本只提取高置信度模式，提供 `--quiet` 选项
- 回滚方式：删除 `invariant-extractor.mjs` 和 `context/invariants/`，移除 req-check.sh 中的调用即可

## 关键决策
- 2026-04-18：由发展战略方向 1 驱动，将路线图 Phase 4.2（不变量提取器）前置
- 2026-04-18：采用正则 + 模板匹配而非 LLM 提取，保持零依赖

<!-- Source file: REQ-2026-036-learning-loop-experience-feedback.md -->
