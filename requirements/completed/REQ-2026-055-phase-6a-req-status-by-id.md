# REQ-2026-055: Phase 6a: req:status --id 按 REQ ID 查询状态

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 6a 实现了 `req:status --json`，但只能输出"当前活跃 REQ"。外部编排器在任务完成、blocked、重试、恢复时，需要按 REQ ID 查询历史状态做幂等恢复和 reconciliation。当 `active_req: null` 时，completed/blocked 的 REQ 完全不可查询，编排器无法判断某个 REQ 是否已完成或阻塞。

## 目标
- 实现 `npm run req:status -- --json --id REQ-2026-XXX`，按 ID 查询 in-progress 和 completed 目录下的任意 REQ
- 不带 `--id` 时保持现有行为（输出活跃 REQ）
- 查询不存在的 REQ ID 时返回 `{"req": null, "error": "not_found"}`

## 非目标
- 不实现 `--all`（全量列表），留给 6b 或积累真实需求再开
- 不修改现有 `req:status`（不带 --id）的行为
- 不新增 npm 依赖

## 颗粒度自检
- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（req-cli.mjs、tests/req-status-json.test.mjs、README.md = 3 个代码文件）
- [x] 涉及模块/目录 ≤ 4？（scripts、tests、根目录 = 3 个）
- [x] 能否用一句话描述"解决了什么问题"？让编排器能按 ID 查询任意 REQ 状态，而非只能看活跃 REQ
- [x] 如果失败，能否干净回滚？可以，删除 --id 分支代码即可

## 范围
- 涉及文件：
  - `scripts/req-cli.mjs`
  - `tests/req-status-json.test.mjs`
  - `README.md`
- 涉及目录 / 模块：
  - `scripts/**`
  - `tests/**`
  - `package.json`
  - `README.md`
  - `requirements/**`
  - `context/experience/**`
- 影响接口 / 页面 / 脚本：
  - `npm run req:status -- --json --id REQ-2026-XXX` 新增 --id 模式

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（增量 CLI 功能，设计已在 REQ 中描述）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-cli.mjs`（statusCommand 新增 --id 分支）
- 可新增的测试 / 脚本：`tests/req-status-json.test.mjs`（新增 --id 测试用例）

**禁止（CANNOT）**：
- 不可修改现有 `req:status`（不带 --id）的行为
- 不可修改 `req:create` / `req:start` / `req:complete` 等命令
- 不可引入新的 npm 依赖

**边界条件**：
- `--id` 指定的 REQ 在两个目录中都不存在时，返回 not_found
- `--id` 与 `--json` 组合使用时，输出完整状态 JSON

## 验收标准
- [x] `npm run req:status -- --json --id REQ-2026-054` 返回 054 的完整状态 JSON（含 status: completed）
- [x] `npm run req:status -- --id REQ-2026-054` 返回人类可读的 054 状态文本
- [x] `npm run req:status -- --json --id REQ-9999-999` 返回 `{"req": null, "error": "not_found"}`
- [x] 不带 `--id` 时，`req:status --json` 行为与 Phase 6a 一致
- [x] `npm test` 全部通过
- [x] `npm run check:governance` 全部通过

## 设计与实现链接
- 设计稿：豁免（skip-design-validation）
- 相关规范：Phase 6a (REQ-2026-054) 的 statusCommand

## 报告链接
- Code Review：`requirements/reports/REQ-2026-055-code-review.md`
- QA：`requirements/reports/REQ-2026-055-qa.md`
- Ship：`requirements/reports/REQ-2026-055-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `npm run req:status -- --json --id REQ-2026-054`（completed REQ）
  - `npm run req:status -- --id REQ-2026-054`（文本模式）
  - `npm run req:status -- --json --id REQ-9999-999`（不存在）
  - `npm run req:status -- --json`（不带 --id，回归测试）
  - `npm test`
  - `npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：检查 JSON 输出字段完整性

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：--id 是否支持 in-progress 和 completed 目录查询？
- [x] 旧功能保护：不带 --id 时行为是否不变？
- [x] 逻辑正确性：不存在的 ID 是否正确返回 not_found？
- [x] 完整性：JSON 输出是否包含编排器做 reconciliation 所需的字段？
- [x] 可维护性：--id 分支是否与现有 statusCommand 架构一致？

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现是否服务于"让编排器按 ID 做 reconciliation"？
- [x] 设计对齐：是否遵守了"CLI owns schema"原则？
- [x] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：查询逻辑可能遗漏 REQ 目录（如未来新增 suspended/ 目录）——但 6a 的 getReqPathById 已覆盖 in-progress 和 completed，保持一致即可
- 回滚方式：删除 statusCommand 中的 --id 分支代码和相关测试

## 关键决策
- 2026-05-01：查询逻辑复用 getReqPathById（遍历 in-progress + completed，按状态字段输出），不按目录名推断状态
- 2026-05-01：--all 列表查询留到 6b，本次只做 --id 单点查询

<!-- Source file: REQ-2026-055-phase-6a-req-status-by-id.md -->
