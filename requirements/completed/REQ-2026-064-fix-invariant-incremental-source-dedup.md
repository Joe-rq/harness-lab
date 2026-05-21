# REQ-2026-064: fix: invariant incremental source dedup

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Bug 现象：`req:complete` 会触发 `node scripts/invariant-extractor.mjs --scan --incremental`，但 incremental 来源去重失效，导致已处理过的 experience 仍被重复抽取成新的 draft invariant。
影响范围：完成 REQ 后会生成大量重复的 `context/invariants/INV-*.md` 候选，污染 git status，也降低经验回流信号质量。

## 目标
- 定位 Bug 根因
- 实现修复
- 添加回归测试防止复发

## 非目标
- 不做影响范围外的改动
- 不重构相关代码（除非 Bug 本身由代码质量问题引起）

## 颗粒度自检
- [x] 目标数 ≤ 4？（定位、修复、测试）
- [x] 涉及文件数 ≤ 4？（脚本、测试、REQ/报告）
- [x] 涉及模块/目录 ≤ 4？（scripts / tests / requirements / context）
- [x] 能否用一句话描述"解决了什么问题"？修复 incremental scan 对已处理 experience 的来源去重。
- [x] 如果失败，能否干净回滚？可通过 git revert 回滚。

## 范围
- 涉及目录 / 模块：`scripts/invariant-extractor.mjs`, `tests/governance.test.mjs`, `context/invariants/`
- 影响接口 / 页面 / 脚本：`node scripts/invariant-extractor.mjs --scan --incremental`

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（Bug 修复通常无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/invariant-extractor.mjs`
- 可新增的测试 / 脚本：`tests/governance.test.mjs` 中新增回归测试

**禁止（CANNOT）**：
- 不可修改与 Bug 无关的文件
- 不可引入新依赖

**边界条件**：
- 修复应最小化，只改必要的代码

## 验收标准
- [x] incremental scan 能识别已有 invariant 中的 `experience/foo.md` 和 `context/experience/foo.md` 来源
- [x] 已处理 experience 不再重复生成新的 invariant
- [x] 新 experience 仍能生成新的 draft invariant
- [x] 回归测试通过
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：豁免（Bug 修复无需设计文档）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-064-code-review.md`
- QA：`requirements/reports/REQ-2026-064-qa.md`
- Ship：`requirements/reports/REQ-2026-064-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test && npm run docs:verify && npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：手动复现确认 Bug 已修复

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：Bug 已修复，回归测试已添加。
- [x] 旧功能保护：新 experience 仍可生成 draft invariant。
- [x] 逻辑正确性：修复来源归一化根因，而不是只清理生成文件。
- [x] 完整性：同时识别 `experience/foo.md` 和 `context/experience/foo.md`。
- [x] 可维护性：来源解析集中到 `extractExperienceSources()`。

#### 对齐检查（record 阶段）
- [x] 目标对齐：只修复 incremental 来源去重。
- [x] 验收标准对齐：所有验收标准均已验证。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：低风险，Bug 修复范围小
- 回滚方式：`git revert`

## 关键决策
- 2026-05-17：Bug 修复 REQ，skip-design-validation 已预勾选

<!-- Source file: REQ-2026-064-fix-invariant-incremental-source-dedup.md -->
