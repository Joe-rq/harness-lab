# REQ-2026-065: feat: legacy audit baseline

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：REQ-2026-063 已把 125 个历史 audit warning 摘要化，但维护者仍无法区分“已知历史债务总量”和“本次新增债务”。如果只看 warning 总数，后续新增 warning 可能被 125 的历史基数掩盖。
业务背景：Harness Lab 需要一个只读债务基线机制，让历史 warning 可以被显式登记、持续观察，同时不降低 targeted audit 和 completion gate 的严格性。

## 目标
- 新增 legacy audit baseline 文件，记录当前已知 warning 分布
- `req:audit` JSON/text 输出展示当前 warning 与 baseline 的 delta
- `governance:health` 展示 baseline 状态，帮助判断是否新增治理债务
- 补充测试和文档，确保 baseline 不改变门禁语义

## 非目标
- 不把 baseline 当成 suppression，`findings` 仍完整输出到 JSON
- 不自动修复或批量改写历史 REQ / QA 报告
- 不改变 `req:complete --id` 的 strict audit
- 不引入外部依赖

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [x] 涉及文件数 ≤ 4？（脚本/测试/文档/基线文件，另有 REQ 交付物）
- [x] 涉及模块/目录 ≤ 4？（scripts / tests / requirements / README）
- [x] 能否用一句话描述"解决了什么问题"？把已知 legacy warning 固化成可比较基线，后续新增债务能被看见。
- [x] 如果失败，能否干净回滚？可通过 git revert 回滚。

## 范围
- 涉及目录 / 模块：`scripts/req-audit.mjs`, `scripts/governance-health.mjs`, `tests/req-audit.test.mjs`, `requirements/audit-baseline.json`, `README.md`
- 影响接口 / 页面 / 脚本：`req:audit`, `governance:health`

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [x] skip-design-validation（小型治理输出增强，设计摘要直接写入 REQ）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/req-audit.mjs`, `scripts/governance-health.mjs`, `tests/req-audit.test.mjs`, `README.md`
- 可新增的测试 / 脚本：`requirements/audit-baseline.json`

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：历史 completed REQ 正文和旧 QA 报告
- 不可引入的依赖 / 操作：新增 npm 依赖、自动修复、warning suppression

**边界条件**：
- 时间 / 环境 / 数据约束：仅使用 Node.js 标准库
- 改动规模或发布边界：baseline 只影响摘要和 health，不影响 `ok` 判定

## 验收标准
- [x] `requirements/audit-baseline.json` 记录当前 legacy warning 总数和按 code 分布
- [x] `req:audit --all` 文本输出展示 baseline 是否超出
- [x] `node scripts/req-audit.mjs --all --format json` 输出包含 `baseline`
- [x] `governance:health` 文本和 JSON 展示 baseline 状态
- [x] baseline 不改变 `ok` 和 `findings`，warning 仍可通过 `--verbose` 展开
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：小型治理输出增强，设计摘要直接写入本 REQ
- 相关规范：REQ-2026-063 warning triage

## 报告链接
- Code Review：`requirements/reports/REQ-2026-065-code-review.md`
- QA：`requirements/reports/REQ-2026-065-qa.md`
- Ship：`requirements/reports/REQ-2026-065-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test && npm run docs:verify && npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：手动查看 `req:audit` 和 `governance:health` baseline 输出

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：baseline 文件、文本输出、JSON 输出和 health 展示均已实现。
- [x] 旧功能保护：baseline 不改变 `ok`、`findings` 或 `check:governance` 阻断语义。
- [x] 逻辑正确性：测试覆盖 within baseline 和 over baseline 两种路径。
- [x] 完整性：支持默认 baseline、`--baseline path` 和 `--no-baseline`。
- [x] 可维护性：baseline 对比集中在 `req-audit`，health 复用结果。

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现让新增治理债务能从 125 个 legacy warning 中凸显出来。
- [x] 设计对齐：baseline 是只读比较，不是 suppression 或自动修复。
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

<!-- Source file: REQ-2026-065-feat-legacy-audit-baseline.md -->
