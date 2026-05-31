# REQ-2026-067: fix: duplicate completed REQ IDs

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Bug 现象：`npm run check:governance` 被 `req:audit` 阻断，原因是 completed REQ 中存在重复 ID：`REQ-2026-063` 和 `REQ-2026-064` 各对应两个不同需求文件。
影响范围：当前所有治理门禁都会因 2 个 duplicate-req-id error 失败，直接阻断 REQ-2026-066 的最终完成验证。

## 目标
- 将 `REQ-2026-063-sh-js.md` 重编号为未占用 ID，保留其历史语义和经验引用
- 将 `REQ-2026-064-phase-2-sh.md` 重编号为未占用 ID，保留其历史语义和经验引用
- 为两个重编号后的历史 REQ 补齐独立 code-review / QA 报告，避免新增 missing-report warning
- 验证 duplicate-req-id error 清零，`check:governance` 不再因 REQ-2026-063/064 重复失败

## 非目标
- 不清理 `REQ-2026-032` 的历史 duplicate warning（baseline 内 legacy warning，非当前阻断项）
- 不批量修复历史 QA evidence / unchecked-items warning
- 不修改 `req-audit.mjs` 的规则语义
- 不改 REQ-2026-066 的实现内容

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [ ] 涉及文件数 ≤ 4？超出：需要重命名 2 个历史 REQ、补 4 份报告、更新 experience / invariant / INDEX 引用；全部围绕同一 duplicate-id 根因
- [x] 涉及模块/目录 ≤ 4？（requirements/completed、requirements/reports、context/experience、context/invariants / INDEX）
- [x] 能否用一句话描述"解决了什么问题"？把两个误复用的 completed REQ ID 拆成唯一 ID，恢复治理审计门禁。
- [x] 如果失败，能否干净回滚？可通过 git revert 或反向重命名恢复

## 范围
- 涉及目录 / 模块：`requirements/completed/`、`requirements/reports/`、`requirements/INDEX.md`、`context/experience/`、`context/invariants/`
- 影响接口 / 页面 / 脚本：`req:audit`、`check:governance`

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（Bug 修复通常无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：
  - `requirements/completed/REQ-2026-063-sh-js.md` → 重命名并更新为 `REQ-2026-068-*`
  - `requirements/completed/REQ-2026-064-phase-2-sh.md` → 重命名并更新为 `REQ-2026-069-*`
  - `requirements/INDEX.md`
  - 对应 `context/experience/` 和 `context/invariants/` 引用
- 可新增的测试 / 脚本：不新增脚本；补齐 `requirements/reports/REQ-2026-068-*`、`REQ-2026-069-*` 报告作为治理证据

**禁止（CANNOT）**：
- 不可修改与 Bug 无关的文件
- 不可引入新依赖
- 不可改写 `REQ-2026-063-feat-governance-audit-warning-triage.md` 和 `REQ-2026-064-fix-invariant-incremental-source-dedup.md` 的 ID

**边界条件**：
- 修复只改治理文档和报告引用，不改运行时代码

## 验收标准
- [x] `req:audit --all` 不再输出 `REQ-2026-063` / `REQ-2026-064` 的 duplicate-req-id error
- [x] `find requirements/completed requirements/in-progress ...` 显示 `REQ-2026-063`、`064`、`068`、`069` 均唯一
- [x] 重编号后的 `REQ-2026-068`、`REQ-2026-069` 均有 code-review / QA 报告
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 执行完成；若仍有历史 warning，确认不再是 duplicate error 阻断

## 设计与实现链接
- 设计稿：豁免（Bug 修复无需设计文档）
- 相关规范：`scripts/req-audit.mjs` duplicate ID 审计规则

## 报告链接
- Code Review：`requirements/reports/REQ-2026-067-code-review.md`
- QA：`requirements/reports/REQ-2026-067-qa.md`
- Ship：`requirements/reports/REQ-2026-067-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test`、`npm run docs:verify`、`npm run check:governance`、`node scripts/req-audit.mjs --all --verbose`
- 需要的环境：本仓库
- 需要的人工验证：手动核对重编号后的历史 REQ 语义与报告链接一致

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：`REQ-2026-063` / `REQ-2026-064` duplicate error 已清零。
- [x] 旧功能保护：未修改运行时代码，只重编号历史治理文档和证据链。
- [x] 逻辑正确性：保留原 063/064 真实语义，将 sh/js 历史需求拆到 068/069。
- [x] 完整性：REQ、报告、experience、invariant、INDEX 链路均已同步。
- [x] 可维护性：两个历史重编号有独立 review / QA 报告，后续审计可追踪。

#### 对齐检查（record 阶段）
- [x] 目标对齐：仅处理 duplicate completed REQ ID，不清理其他历史 warning。
- [x] 验收标准对齐：所有验收标准均已验证通过。

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
- 2026-05-31：Bug 修复 REQ，skip-design-validation 已预勾选
- 2026-05-31：将历史 `REQ-2026-063-sh-js.md` 重编号为 `REQ-2026-068-sh-js-entry-unification.md`
- 2026-05-31：将历史 `REQ-2026-064-phase-2-sh.md` 重编号为 `REQ-2026-069-sh-js-reference-cleanup.md`

<!-- Source file: REQ-2026-067-fix-duplicate-completed-req-ids.md -->
