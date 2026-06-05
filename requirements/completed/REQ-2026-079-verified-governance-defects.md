# REQ-2026-079: Fix verified governance defects

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Bug 现象：2026-06-05 对全面评审报告进行二次核实时，确认多个治理可信度缺陷仍存在：本仓库 dogfood hook 指向已删除 `.sh` 入口、commit-msg hook symlink 指向旧仓库路径、`req-check.js` 无法识别真实 `REQ-YYYY-NNN-slug.md` 文件名、`event-store.mjs` rotation 在同月 archive 已存在时重复写入历史事件、`auto-review.mjs` 对 shell 文件语法检查拼接 shell 命令存在注入面，README 的“约 1500 行”口径也已失实。
影响范围：这些问题影响 Harness Lab 自身治理可信度、PreToolUse 强制执行、事件账本统计准确性、自动 review 安全边界和对外文档口径。模板分发配置 `.claude/settings.example.json` 已核实正确，本 REQ 只修本仓库 dogfood 配置和代码缺陷。

## 目标
- 修复本仓库 dogfood hook 与 commit-msg hook 的断链问题
- 修复 `req-check.js` 对 slugged active REQ 的 lookup 逻辑
- 修复 event rotation double-write 和 auto-review shell 文件检查的命令拼接风险
- 更新 README 轻量口径并补充回归测试，确保现有治理验证链通过

## 非目标
- 不修改 `.claude/settings.example.json` 的 hook 入口；它已核实正确
- 不清理 `.claude/settings.local.json` 的全部历史权限表，只修会导致本仓库 hook 不工作的断链入口
- 不重构 `req-cli.mjs` 单体结构或抽取共享 markdown 工具
- 不批量清理 draft invariants 或历史 audit warning baseline

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？否。本次需要同步修 5 类已核实缺陷及对应测试/报告，但它们同属“全面评审核实后 P0/P1 修复包”，拆分会留下核心治理链继续失效。
- [ ] 涉及模块/目录 ≤ 4？否。涉及本地 hook 配置、scripts、tests、README 和交付报告；范围在下方逐项限定。
- [x] 能否用一句话描述"解决了什么问题"？
- [x] 如果失败，能否干净回滚？

## 范围
- 涉及文件：
  - `.claude/settings.local.json`
  - `.git/hooks/commit-msg`
  - `README.md`
  - `scripts/req-check.js`
  - `scripts/event-store.mjs`
  - `scripts/auto-review.mjs`
  - `tests/governance.test.mjs`
  - `tests/event-store.test.mjs`
  - `requirements/in-progress/REQ-2026-079-verified-governance-defects.md`
  - `requirements/reports/REQ-2026-079-code-review.md`
  - `requirements/reports/REQ-2026-079-qa.md`
  - `context/experience/REQ-2026-079-verified-governance-defects.md`
- 涉及目录 / 模块：本地 Claude hook 配置、治理脚本、回归测试、入口文档和 REQ 交付物
- 影响接口 / 页面 / 脚本：`scripts/session-start.js` hook 入口、`scripts/req-check.js` PreToolUse 入口、`scripts/event-store.mjs` append/read 事件链、`scripts/auto-review.mjs` legacy review 路径

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（Bug 修复通常无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：上方“涉及文件”列表
- 可新增的测试 / 脚本：仅在现有测试文件中补充 regression case，不新增 npm 依赖

**禁止（CANNOT）**：
- 不可修改与 Bug 无关的文件
- 不可引入新依赖
- 不可重写历史 REQ、baseline 或 invariant 文件

**边界条件**：
- 修复应最小化，只改必要的代码
- 当前工作区已有 `.claude/worktrees/main/events/session-main.jsonl` 与 session-log 变更；不得回滚或覆盖这些既有变更

## 验收标准
- [x] `.claude/settings.local.json` 使用现存 `.js` hook 入口，commit-msg hook 指向当前仓库脚本
- [x] `req-check.js` 能通过 slugged active REQ fixture，并继续阻断 draft/template REQ
- [x] event-store 同月重复 rotation 后 `readEvents` 不再返回重复事件
- [x] `auto-review.mjs` shell 文件检查不再通过 shell 字符串拼接文件名
- [x] README 不再声称“约 1500 行”，口径与当前规模一致
- [x] `npm test`、`node scripts/docs-verify.mjs --no-diff-aware`、`node scripts/check-governance.mjs --no-diff-aware` 均通过

## 设计与实现链接
- 设计稿：豁免（Bug 修复无需设计文档）
- 相关规范：`AGENTS.md` 强制机制、`requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-079-code-review.md`
- QA：`requirements/reports/REQ-2026-079-qa.md`
- Ship：`requirements/reports/REQ-2026-079-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `node scripts/docs-verify.mjs --no-diff-aware`
  - `node scripts/check-governance.mjs --no-diff-aware`
  - `node scripts/req-audit.mjs --id REQ-2026-079 --verbose`
- 需要的环境：本仓库
- 需要的人工验证：核对 commit-msg symlink 目标、README 口径和临时 fixture 行为

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：Bug 是否已修复？回归测试是否已添加？
- [x] 旧功能保护：修复是否引入新问题？
- [x] 逻辑正确性：修复是否针对根因而非症状？
- [x] 完整性：是否处理了相关边界情况？
- [x] 可维护性：修复代码是否清晰？

#### 对齐检查（record 阶段）
- [x] 目标对齐：修复是否只针对声明的 Bug？
- [x] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- `.claude/settings.local.json` 的 allow 权限表仍有历史旧路径和 `.sh` 记录；本 REQ 只修实际 hook command。退出条件：单独清理权限表 REQ 完成。
- `.git/hooks/commit-msg` 是本地 symlink，不随 Git 分发；后续可由 installer/doctor 检查当前仓库 hook 状态。

## 风险与回滚
- 风险：中等。修复点均为治理核心入口，错误改动可能导致 hook 误挡或事件读取漏数。
- 回滚方式：`git revert`

## 关键决策
- 2026-06-05：Bug 修复 REQ，skip-design-validation 已预勾选
- 2026-06-05：`settings.example.json` 已正确，不纳入修复；只修本仓库 `.claude/settings.local.json` dogfood 入口。
- 2026-06-05：本 REQ 超过 4 文件但不拆分，因为缺陷来自同一份核实清单且需要一次性恢复治理链可信度。

<!-- Source file: REQ-2026-079-verified-governance-defects.md -->
