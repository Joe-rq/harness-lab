# REQ-2026-096: P1 跨平台 CI 与 Claude Matcher Smoke

## 状态
- 当前状态：blocked
- 当前阶段：qa

## 背景
README 声明 macOS / Linux / Windows 与 Claude Code Hook 支持，但当前 CI 只有 Ubuntu + Node 20；现有测试直接调用 Hook stdin，只能证明脚本契约，不能证明 Claude Code 对 `Write|Edit|NotebookEdit|Bash` matcher 的实际分发。平台分支与配置一致性测试不是三平台运行证据。

P1 只要求代表性矩阵，不做 OS × agent × worktree 全组合。真实 worktree 已由 REQ-095 单独验证，本 REQ 聚焦三种 OS 的同一 Node 20 门禁，以及真实 Claude CLI matcher 的最小正/负 smoke。

## 目标
- 将 GitHub Actions 扩为 Ubuntu、macOS、Windows 的 Node 20 fail-fast=false 矩阵，并让每个平台执行同一组仓库门禁。
- 建立平台无关的 CI 入口与证据摘要，使失败能定位到 test/capability/docs/governance/doctor/pack 阶段。
- 建立可重复的 Claude matcher smoke：真实 CLI doctor 校验配置，并由真实交互会话证明 Bash 命中、Read 不命中 canonical PreToolUse matcher。
- 对平台支持声明标注 evidence 状态，不把“矩阵已配置”写成“所有 runner 已通过”。

## 非目标
- 不覆盖所有 Node 版本、CPU、shell、Claude Code 版本或 agent 产品。
- 不把 `claude -p` 当作 Hook 证据；已知非交互模式不触发 PreToolUse。
- 不推送分支、不触发远端 Actions、不伪造三平台 pass；远端运行必须单独取得真实 run 证据。
- 不重复真实 worktree E2E，不修改 Hook risk policy 或业务生命周期。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（workflow、runner、matcher smoke、tests/docs/REQ 交付物需要同步）
- [x] 涉及模块/目录 ≤ 4？（CI、matcher smoke、tests、docs/REQ）
- [x] 能否用一句话描述"解决了什么问题"？（让跨平台与 Claude matcher 支持声明拥有分层、可定位的真实证据）
- [x] 如果失败，能否干净回滚？（移除新 runner/smoke 与 workflow matrix 即可）

## 范围
- 新增：`scripts/ci-verify.mjs`、`scripts/claude-matcher-smoke.mjs`
- 修改：`.github/workflows/governance.yml`、`scripts/capability-manifest.mjs`、`package.json`
- 修改：`tests/governance.test.mjs`、`README.md`、`context/tech/testing-strategy.md` 与 REQ 交付物

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 仅上述 CI/matcher 脚本、workflow、单一事实源/派生 package、测试与文档。
- 可在 `/tmp` 创建一次性 Claude matcher smoke fixture；不得写入真实项目或持久用户设置。

**禁止（CANNOT）**：
- 不修改 lifecycle/state/upgrade/Hook policy 实现，不更改用户 session 数据。
- 不引入第三方依赖，不 commit/push/publish，不宣称未执行的远端 runner 结果。

**边界条件**：
- 当前本机只能直接执行 macOS；Ubuntu/Windows 的完成证据必须来自 GitHub Actions run。
- Claude 真实交互 smoke 依赖本机已安装且已认证的 Claude Code；自动化契约测试不得依赖模型或网络。

## 验收标准
- [x] workflow 是 Ubuntu/macOS/Windows + Node 20 矩阵，fail-fast=false；每格执行同一 `ci:verify` 并上传独立 evidence summary。
- [x] `ci:verify` 不依赖 Bash 特有语法，逐阶段执行 test/capability/docs/governance/doctor/pack，失败保留阶段名与退出码。
- [ ] matcher smoke 校验 canonical matcher 的 positive/negative 集合、两套仓库配置与 installer 产物，并能验证真实 Claude CLI doctor/交互事件样本。
- [ ] 本地 macOS 完整门禁与真实 Claude matcher smoke 通过；Ubuntu/Windows 只在有 Actions run URL/ID 后标记通过。
- [x] README/testing strategy 明确证据层级、已知 `claude -p` 缺口和复现命令；完整回归与候选包通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-096-design.md`（Feature 建议创建设计文档）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-096-code-review.md`
- QA：`requirements/reports/REQ-2026-096-qa.md`
- Ship：`requirements/reports/REQ-2026-096-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行：matcher unit/fixture、`npm run ci:verify`、`claude doctor`、一次真实 interactive matcher smoke、完整 `npm test` 与 REQ audit。
- 环境：Node 20+、Git、npm；本地 Claude Code 2.1.207；GitHub hosted Ubuntu/macOS/Windows runner。
- 人工：核对真实 Hook 事件只包含 Bash 命中而不包含 Read，并记录 CLI 版本；远端核对三格 run ID、OS 与结论。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现：功能是否完整实现？是否覆盖了核心场景？
- [ ] 旧功能保护：新功能是否破坏了现有功能？
- [ ] 逻辑正确性：边界情况是否处理？错误处理是否完备？
- [ ] 完整性：是否有遗漏的子功能？
- [ ] 可维护性：代码是否清晰？接口是否合理？

#### 对齐检查（record 阶段）
- [ ] 目标对齐：实现是否服务于最初的用户痛点？
- [ ] 设计对齐：实现是否符合设计文档？
- [ ] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：Claude Code 未登录，GitHub CLI token 失效且 API 不通
- 恢复条件：完成 Claude 与 GitHub 认证并允许触发 hosted Actions
- 下一步：执行 interactive matcher smoke 和三平台 workflow_dispatch，核验 artifacts

## 临时实现与债务
- 无

## 风险与回滚
- 风险：workflow 配置正确但 runner 未实际执行；报告必须分离 configured/local/remote，不以静态 YAML 代替运行证据。
- 风险：模型不遵循 smoke 提示；事件 logger 记录原始 hook stdin，按 tool_name 判断，失败可重试但不得手工伪造。
- 风险：CLI 版本改变 matcher 语义；证据记录版本，契约测试固定预期集合，升级后重跑。
- 回滚：恢复单 Ubuntu workflow，移除 CI runner/matcher smoke 与对应 manifest/package/docs 条目。

## 关键决策
- 2026-07-12：三平台共享同一 CI runner；workflow 只编排 matrix，不复制门禁列表。
- 2026-07-12：matcher 证据分三层：纯函数契约、Claude doctor 配置、真实交互 dispatch；不使用 `claude -p`。
- 2026-07-12：配置存在不等于 runner 通过，远端结果必须有 run identity。

<!-- Source file: REQ-2026-096-p1-cross-platform-ci-claude-matcher-smoke.md -->
