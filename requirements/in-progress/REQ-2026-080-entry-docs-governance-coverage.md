# REQ-2026-080: entry-docs-governance-coverage

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
文档审计发现 15 处文档与代码偏移（排除 1 处误报）。系统性模式：dogfood 配置（settings.local.json）跑着 7 类 hook 的完整治理链，但入口文档（README/AGENTS.md/CLAUDE.md）只描述了 2 类（SessionStart + PreToolUse）。高级机制（PostToolUse 监控、PreCompact 快照、Stop 防假完成、SessionEnd 反思、harness 三模式、verifier 系统）对用户不可发现。

REQ-080（代码修正：risk-tracker .sh 残留 + settings.local.json 失效权限）和 REQ-081（harness-setup.md skill 同步）已作为小改动直接完成。本 REQ 处理剩余的入口文档覆盖问题。

## 目标
- 入口文档（README/AGENTS.md/CLAUDE.md）覆盖全部 hook 类型，让用户能从文档发现框架的完整治理能力
- .codex/hooks.json 配置与 settings.local.json 对齐，补齐缺失的 PreCompact 和 SessionEnd
- CLAUDE.md 的异常响应协议和压缩恢复协议补充触发前提（hook 配置依赖）

## 非目标
- 不改 settings.example.json（高级 hook 不在默认安装范围是有意设计）
- 不改 harness-install.mjs（安装器代码无偏移，偏差在 skill 文档侧已在 REQ-081 修）
- 不做文档重写，只做增量补全

## 颗粒度自检
- [x] 目标数 ≤ 4？3 个目标（文档覆盖 + codex 对齐 + 前提补充）
- [x] 涉及文件数 ≤ 4？4 个文件（README.md、AGENTS.md、CLAUDE.md、.codex/hooks.json）
- [x] 涉及模块/目录 ≤ 4？2 个（根目录文档 + .codex）
- [x] 能否用一句话描述"解决了什么问题"？入口文档与实际治理能力的描述偏移修复
- [x] 如果失败，能否干净回滚？能，全部是文档编辑，git revert 即可

## 范围
- 涉及目录 / 模块：根目录 .md 文件、.codex/
- 影响接口 / 页面 / 脚本：无代码行为变更，纯文档

### 约束（Scope Control，可选）

**允许（CAN）**：
- 修改 README.md、AGENTS.md、CLAUDE.md、.codex/hooks.json
- 增量插入段落，不重写现有内容

**禁止（CANNOT）**：
- 不可修改任何 .mjs/.js 脚本
- 不可修改 settings.local.json 或 settings.example.json
- 不可引入新的治理规则或 hook

- [x] skip-design-validation（纯文档补全，不涉及代码行为变更）

## 验收标准
- [ ] README.md 命令表格包含 `req:status --all`
- [ ] README.md 包含「高级治理机制」小节（Hook 类型表 / Harness 模式 / Verifier 系统）
- [ ] AGENTS.md 目录树包含 `invariants/`、`references/`、`req-check.js`、`req-cli.mjs`
- [ ] AGENTS.md 强制机制章节描述全部 6 类 hook
- [ ] CLAUDE.md 异常响应协议注明 PostToolUse 前提
- [ ] CLAUDE.md 压缩恢复协议注明 PreCompact 前提
- [ ] .codex/hooks.json 包含 PreCompact 和 SessionEnd
- [ ] `npm test` 通过
- [ ] `npm run check:governance` 通过
- [ ] `npm run docs:verify` 通过

## 设计与实现链接
- 设计稿：无（纯文档增量，不需要设计稿）
- 相关规范：审计报告见本轮对话

## 报告链接
- Code Review：`requirements/reports/REQ-2026-080-code-review.md`
- QA：`requirements/reports/REQ-2026-080-qa.md`

## 验证计划
- 计划执行的命令：`npm test`、`npm run check:governance`、`npm run docs:verify`
- 需要的环境：无特殊要求
- 需要的人工验证：确认 README/AGENTS.md/CLAUDE.md 描述的 hook 类型与 settings.local.json 实际配置一致

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现
- [ ] 旧功能保护
- [ ] 逻辑正确性
- [ ] 完整性
- [ ] 可维护性

#### 对齐检查（record 阶段）
- [ ] 目标对齐
- [ ] 设计对齐
- [ ] 验收标准对齐

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：文档描述与实际行为不一致（低风险，纯文档）
- 回滚方式：git revert

## 关键决策
- 2026-06-05：将原审计 15 项偏移中属于文档覆盖的 10 项合并为 1 个 REQ，避免碎片化

<!-- Source file: REQ-2026-080-entry-docs-governance-coverage.md -->
