# REQ-2026-054: Phase 6a: req status --json + external mappings

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Harness Lab 的 REQ 状态散落在多个文件中（INDEX.md、progress.txt、REQ Markdown），没有机器可读的结构化输出。外部编排器（如 OpenAI Symphony）无法判断当前 REQ 是否可执行、处于什么阶段、有什么阻塞。Phase 6 的目标是让 Harness Lab 成为「可被调度器安全消费的治理状态提供者」，而 6a 是第一步：暴露 REQ 状态为 JSON，并预留外部任务映射的数据结构。

## 目标
- 实现 `npm run req:status -- --json`，输出当前活跃 REQ 的机器可读状态
- 预留并读取 `requirements/external-mappings.json`，让 `req:status --json` 包含外部映射信息
- 新增不变量：外部任务系统不能取代仓库内 REQ，实施门禁只认 REQ readiness

## 非目标
- 不实现 `req:import`（留给 Phase 6b）
- 不修改 REQ Markdown 模板（不加 external mapping 字段）
- 不实现 WORKFLOW.md 模板
- 不实现 harness:doctor --orchestrator 检查
- 不承诺 Symphony 专用适配

## 颗粒度自检
- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（req-cli.mjs、external-mappings.json、1 个不变量文件、1 个测试文件）
- [x] 涉及模块/目录 ≤ 4？（scripts、requirements、context/invariants、tests）
- [x] 能否用一句话描述"解决了什么问题"？让外部编排器能读懂 REQ 状态并判断是否可执行
- [x] 如果失败，能否干净回滚？可以，新命令不影响现有功能，删除映射文件即可

## 范围
- 涉及文件：
  - `scripts/req-cli.mjs`
  - `requirements/external-mappings.json`（新增）
  - `context/invariants/INV-058-external-task-req-mapping.md`（新增）
  - `tests/req-status-json.test.mjs`（新增）
- 涉及目录 / 模块：
  - `scripts/**`
  - `package.json`
  - `README.md`
  - `requirements/**`
  - `context/invariants/**`
  - `context/experience/**`
  - `tests/**`
- 影响接口 / 页面 / 脚本：
  - `npm run req:status` 新增 `--json` 模式

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（新增 CLI 子命令，设计已在 REQ 中描述）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-cli.mjs`（新增 status 命令）
- 可新增的测试 / 脚本：`tests/req-status-json.test.mjs`

**禁止（CANNOT）**：
- 不可修改 REQ Markdown 模板
- 不可修改现有 `req:create` / `req:start` / `req:complete` 命令的行为
- 不可引入新的 npm 依赖

**边界条件**：
- `external-mappings.json` 不存在时，`req:status --json` 的 external 字段返回 null

## 验收标准
- [x] `npm run req:status -- --json` 输出合法 JSON，包含 active REQ 的完整状态
- [x] 无活跃 REQ 时，`req:status --json` 返回 `{"active_req": null}`
- [x] `external-mappings.json` 不存在时，external 字段为 null；存在时返回映射信息
- [x] `external-mappings.json` 格式错误时，返回 warning 而非崩溃
- [x] `req:status`（不带 --json）保持人类可读的文本输出
- [x] 不变量 INV-058 已创建且内容完整
- [x] `npm test` 全部通过
- [x] `npm run check:governance` 全部通过

## 设计与实现链接
- 设计稿：豁免（skip-design-validation）
- 相关规范：Symphony SPEC.md（参考编排器消费模式）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-054-code-review.md`
- QA：`requirements/reports/REQ-2026-054-qa.md`
- Ship：`requirements/reports/REQ-2026-054-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `npm run req:status -- --json`（有活跃 REQ 和无活跃 REQ 两种场景）
  - `npm test`
  - `npm run check:governance`
  - 手动创建 `requirements/external-mappings.json` 后验证 `req:status --json` 输出
  - 手动创建损坏的 `external-mappings.json` 后验证 warning 输出
- 需要的环境：本仓库
- 需要的人工验证：检查 JSON 输出字段完整性

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：`req:status --json` 是否输出完整？映射是否正确读取？
- [x] 旧功能保护：现有 `req:status`（文本模式）是否正常？
- [x] 逻辑正确性：边界情况（无活跃 REQ、映射文件不存在/损坏）是否处理？
- [x] 完整性：JSON 输出是否包含编排器调度所需的最小信息集？
- [x] 可维护性：status 命令是否与现有 req-cli 架构一致？

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现是否服务于「让编排器能消费 REQ 状态」？
- [x] 设计对齐：是否遵守了「CLI owns schema」原则？
- [x] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：JSON 输出字段可能不完全覆盖编排器需求——但 6a 的目标就是先暴露再迭代，3-5 个真实 REQ 会补齐缺口
- 回滚方式：删除 `statusCommand` 函数和相关测试，删除 `external-mappings.json`

## 关键决策
- 2026-05-01：external mapping 存储在 `requirements/external-mappings.json`（方案 C），不修改 REQ Markdown
- 2026-05-01：6a 只做 `req:status --json`（只读），不做 `req:import`（写入）
- 2026-05-01：字段命名保持中立（external_source / external_id / external_url），不绑定特定追踪器

<!-- Source file: REQ-2026-054-phase-6a-req-status-json-external-mappings.md -->
