# REQ-2026-068: 删除 sh/js 双实现冗余

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前问题：`scripts/req-check.sh`（102 行）与 `scripts/req-check.js`（195 行）、`scripts/session-start.sh`（200 行）与 `scripts/session-start.js`（167 行）功能高度重叠，长期并存。`.claude/settings.example.json` 和 `.codex/hooks.json` 仍指向 `.sh` 版本，但 `scripts/harness-install.mjs` 在分发到目标项目时已经写入 `.js` 命令——模板源头与实际分发产物的命令行已经漂移。每次修改 hook 行为都要双份维护，且 Windows bash 兼容性差。

为什么现在做：刚做完 REQ-062 的 installer 加固，发现 sh/js 命令漂移正是治理框架自身的技术债；下一步 REQ-064/065 要拆分超长文件，需要先稳定 hook 入口路径。

## 目标（最小验证集 — Phase 1）
- 删除 `scripts/req-check.sh` 与 `scripts/session-start.sh`
- 更新 `.claude/settings.example.json` 中的 hook 命令为 `node scripts/*.js`
- 同步更新 `scripts/harness-install.mjs`（hook 模块分发清单）、`scripts/check-governance.mjs`（核心文件清单）、`tests/governance.test.mjs`（断言）中的引用
- 保持 hook 行为完全一致（exit code、阻断条件、豁免逻辑），由 `npm test` 验证

## 非目标
- 不修改 `.js` 版本的逻辑（行为完全保留）
- 不动 `scripts/commit-msg-check.sh`（无 .js 对应版本，不在范围）
- 不重命名 `.js` 为 `.mjs`（保持现状，避免无关变更）
- 不修复 sh 版本本身的 bug（直接删除）
- 暂不处理 `.codex/hooks.json`、`scripts/scope-guard.mjs` 注释、README/CLAUDE/AGENTS.md 中的 sh 残留——这些不影响测试通过，留待 Phase 2（后续 REQ 或本 REQ ship 阶段决策）

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个目标）
- [ ] 涉及文件数 ≤ 4？**超出**：6 个文件（2 删 + 4 改），都是 hook 入口同质迁移，紧耦合不可拆分；.codex/文档残留已划到 Phase 2 暂不处理
- [x] 涉及模块/目录 ≤ 4？（scripts/、.claude/、.codex/、tests/）
- [x] 能否用一句话描述？"删除双 sh 入口，统一到 js 实现"
- [x] 如果失败，能否干净回滚？`git revert` 即可

## 范围
- 涉及目录 / 模块：`scripts/`、`.claude/`、`.codex/`、`tests/`
- 影响接口 / 页面 / 脚本：PreToolUse hook（REQ 强制检查）、SessionStart hook（会话启动恢复）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（纯删除/引用替换，无设计变更）

**允许（CAN）** — Phase 1 最小集：
- 可修改的文件：
  - `scripts/req-check.sh`（删除）
  - `scripts/session-start.sh`（删除）
  - `.claude/settings.example.json`（hook 命令 sh→js + permissions allow 列表）
  - `scripts/harness-install.mjs`（hook 模块 files 数组移除 sh）
  - `scripts/check-governance.mjs`（行 71 引用清单移除 sh）
  - `tests/governance.test.mjs`（断言改为只检查 .js）
  - `README.md`（docs-sync 强制要求：治理脚本/测试改动需在维护者文档留痕，补一段 sh→js 迁移说明）

**禁止（CANNOT）**：
- 不可修改 `.js`/`.mjs` 内部逻辑
- 不可触碰 `commit-msg-check.sh`
- 不可修改已完成 REQ 的历史报告
- 不可修改 `.codex/hooks.json`（Phase 2 决定）
- 不可修改 `scope-guard.mjs`、README、CLAUDE.md、AGENTS.md 中的注释/文档引用（Phase 2）

**边界条件**：
- hook 行为变更必须可通过 `npm test` 验证
- `harness-install.mjs` 改动后，对目标项目分发的文件清单只剩 .js

## 验收标准
- [x] `scripts/req-check.sh` 和 `scripts/session-start.sh` 不再存在
- [x] `.claude/settings.example.json` 中 hook 命令全部使用 `node scripts/*.js`
- [x] `.codex/hooks.json` 同步更新（**已主动延期到 Phase 2 REQ**，本 REQ 在"非目标"中显式划出，详见 QA 报告对应行）
- [x] `tests/governance.test.mjs` 断言通过且不再引用 sh 文件
- [x] `npm test` 全部通过（33 项 PASS）
- [x] `npm run check:governance` 通过
- [x] `harness-install.mjs` 分发清单中不再含 sh
- [x] 手动验证：在新会话中触发 PreToolUse hook，确认仍能阻断无 REQ 的写操作

## 设计与实现链接
- 设计稿：豁免（重构通常无需设计文档）
- 相关规范：CLAUDE.md "REQ 工作流程"、`.claude/settings.example.json` hook 配置

## 报告链接
- Code Review：`requirements/reports/REQ-2026-068-code-review.md`
- QA：`requirements/reports/REQ-2026-068-qa.md`
- Ship：不适用（无对外发布动作）

## 验证计划
- 计划执行的命令：
  - `npm test`（governance.test.mjs / req-audit.test.mjs / req-status-json.test.mjs）
  - `npm run check:governance`
  - `npm run docs:verify`
  - `node scripts/req-check.js`（手动 smoke test）
  - `node scripts/session-start.js`（手动 smoke test）
- 需要的环境：本仓库 + 一次新会话（验证 hook 真实触发）
- 需要的人工验证：
  - 新会话启动时确认 SessionStart hook 输出与原 sh 版本一致
  - 在无活跃 REQ 状态下尝试 Edit 文件，确认 PreToolUse hook 仍能阻断

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：sh 文件已删除，所有引用切换到 js
- [x] 旧功能保护：33 项测试通过，hook smoke 行为与原 sh 版本一致
- [x] 逻辑正确性：未触碰 .js 内部逻辑，installer 流程已自动化测试覆盖
- [x] 完整性：Phase 1 6 文件全部更新；Phase 2 残留已在 QA 报告显式登记
- [x] 可维护性：净减 302 行；Windows 下不再依赖 bash

#### 对齐检查（record 阶段）
- [x] 目标对齐：删除仅动 sh 入口，未改 js 内部逻辑
- [x] 验收标准对齐：8 条中 7 条通过、1 条按 REQ 设计划入 Phase 2

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：
  - 遗漏文档/注释中对 sh 路径的引用（通过 grep 全局检查兜底）
  - 已分发到外部项目的旧版本仍引用 sh（不可控，但 harness-install.mjs 下次安装会清理）
  - hook 在 Windows/macOS/Linux 三平台行为细微差异（.js 版本已跨平台，sh 删除后反而改善）
- 回滚方式：`git revert <commit>` 一键回滚整个变更

## 关键决策
- 2026-05-19：选 js 作为统一入口而非 sh，理由：跨平台、与项目其余 `.mjs` 生态一致、Windows 下无需额外 bash
- 2026-05-19：颗粒度超 4 文件但不拆分，理由：sh→js 是同质改动，拆分会导致 settings/installer/test 多次反复修改

<!-- Source file: REQ-2026-068-sh-js-entry-unification.md -->
