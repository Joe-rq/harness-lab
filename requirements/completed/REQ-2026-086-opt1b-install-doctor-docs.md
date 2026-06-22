# REQ-2026-086: OPT-1B — 目标项目 matcher 传播 + 缺口声明 + doctor 自检

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
REQ-2026-085（OPT-1A）让**模板仓库自身**的 PreToolUse matcher 覆盖了 Bash（`settings.local.json` + `.codex/hooks.json` + `settings.example.json` 三处同步），并修复了 req-check stdin 契约。但 OPT-1 还剩三个缺口：

1. **目标项目未传播**：`harness-install.mjs` 的 `configureHook` 生成目标项目 `settings.local.json` 时，PreToolUse matcher 仍是 `Write|Edit` —— `--with-hook` 安装的目标项目 Bash 写仍绕过门禁。OPT-1A 只修了模板仓自身，没修安装链。
2. **缺口未声明**：subagent 不触发 PreToolUse（#21460/#34692）、`claude -p` 不触发（#40506）、`perl -e`/`python -c` 等解释器写（理论不可封）—— 这三类不可强制场景在 README/AGENTS 未明确声明，使用者无从知道边界。
3. **无自检**：`harness-doctor.mjs` 不检测"matcher 是否覆盖 Bash""stdin 解析是否生效""平台缺口是否已声明"，配置漂移只能靠人发现。

本 REQ（OPT-1B）修这三处。模块警告（`.mjs` 后缀）与 hook 输出格式迁移（`hookSpecificOutput`）归后续（收益低/风险高/旧格式兼容）。

## 目标
1. `harness-install.mjs` `configureHook` 生成的目标项目 PreToolUse matcher 扩为 `Write|Edit|NotebookEdit|Bash`，与模板仓一致。
2. `README.md` + `AGENTS.md` 在已知限制/强制机制处声明三类不可强制场景（subagent / `claude -p` / 未覆盖 Bash 写模式），并给 OS 级兜底建议（文件权限/容器化）。
3. `harness-doctor.mjs` 新增三项自检：① 目标/本仓 PreToolUse matcher 是否覆盖 Bash；② 喂样例 stdin 验证 req-check 白名单生效（self-test）；③ 提示 subagent/pipe 平台缺口。

## 非目标
- 不改脚本后缀为 `.mjs`（`MODULE_TYPELESS_PACKAGE_JSON` 警告困扰但不致命；改名牵连 settings/codex/install/README/skill/3 个测试断言，高风险低收益，缓做）。
- 不迁移 hook 阻断输出到 `hookSpecificOutput.permissionDecision`（旧 `exit 2`/`decision:block` 兼容仍有效，缓做）。
- 不实现 Bash 写检测 100% 完备（`perl -e`/`python -c` 理论不可封；本 REQ 只做文档声明 + doctor 提示）。

## 颗粒度自检
- [x] 目标数 ≤ 4？（3）
- [~] 涉及文件数 ≤ 4？（实际 5：harness-install.mjs / README.md / AGENTS.md / harness-doctor.mjs / tests/governance.test.mjs；超颗粒度理由——三子项强相关于"OPT-1 目标项目完整化 + 缺口诚实 + 诊断"，install 传播与文档声明天然成对，doctor 自检是对前两者的可检测化，拆分会破坏 OPT-1 收尾的原子性）
- [x] 涉及模块/目录 ≤ 4？（3：scripts/ + tests/ + 根 docs）
- [x] 能否用一句话描述"解决了什么问题"？能——让目标项目也获得 Bash 门禁、诚实标注不可强制缺口、把配置正确性变成可检测。
- [x] 如果失败，能否干净回滚？能——configureHook matcher 还原 + doctor 检查项移除。

## 范围
- 涉及文件：
  - `scripts/harness-install.mjs`（`configureHook` matcher 扩 Bash）
  - `scripts/harness-doctor.mjs`（新增三项自检）
  - `README.md`（已知限制：三类不可强制 + OS 兜底）
  - `AGENTS.md`（强制机制段同步声明）
  - `tests/governance.test.mjs`（install matcher 扩面 + doctor 检查回归）

### 约束（Scope Control）

**允许（CAN）**：
- 可修改的文件 / 模块：上述 5 个文件
- 可新增的测试 / 脚本：`tests/governance.test.mjs` 内新增用例、`harness-doctor.mjs` 内新增检查项

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/req-check.js`、`scripts/scope-guard.mjs`（OPT-1A 已定）、`scripts/session-start.js`、`package.json`、`.codex/hooks.json`、`.claude/settings*.json`
- 不可引入的依赖 / 操作：脚本后缀改名；新增 npm 依赖；改 hook 输出格式

**边界条件**：
- 改动规模：5 文件；install 与 doctor 各为一个内聚子项
- 发布边界：模板仓库 + `--with-hook` 目标项目安装链同步生效

## 验收标准
- [x] When 运行 `harness-install --with-hook` 到 fixture 项目，目标 `settings.local.json` 的 PreToolUse matcher shall 包含 `Bash`
- [x] `README.md`「已知限制」shall 列出三类不可强制场景（subagent / `claude -p` / 未覆盖 Bash 写模式）+ OS 级兜底建议
- [x] `AGENTS.md` 强制机制段 shall 同步声明不可强制边界
- [x] When 运行 `npm run harness:doctor`，输出 shall 包含 matcher 覆盖检查、stdin self-test 结果、平台缺口提示
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-086-design.md`
- 相关规范：`docs/plans/optimization-roadmap-2026-06.md` OPT-1；前置 `REQ-2026-085`（OPT-1A）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-086-code-review.md`
- QA：`requirements/reports/REQ-2026-086-qa.md`
- Ship：不适用（模板仓库）

## 验证计划
- 计划执行的命令：`npm test`、`npm run docs:verify`、`npm run check:governance`、`npm run harness:doctor`
- 需要的环境：Node.js
- 需要的人工验证：fixture 项目跑 `harness-install --with-hook` 检查生成 settings 的 matcher

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] **目标实现**：install matcher 传播 / 文档声明 / doctor 自检三目标全达
- [x] **旧功能保护**：install 其他行为不变；npm test 全绿
- [x] **逻辑正确性**：doctor self-test 是否真验证 stdin 解析（非占位）
- [x] **完整性**：三类缺口都有文档 + doctor 提示
- [x] **可维护性**：doctor 检查项是否集中可扩展

**输出要求**：记录到 `requirements/reports/REQ-2026-086-qa.md`

#### 对齐检查（record 阶段）
- [x] **目标对齐**：实现服务于"目标项目 Bash 门禁 + 缺口诚实 + 可检测"
- [x] **设计对齐**：与 design 稿一致
- [x] **验收标准对齐**：五条验收全有实现与验证

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：`configureHook` 改 matcher 影响所有新装目标项目的 hook 触发（Bash 命令额外跑 req-check/scope-guard，略增延迟）；对冲：hook timeout 已配置，Bash 纯读走 fast-path（req-check 写检测未命中即 exit 0）
- 回滚方式：`configureHook` matcher 还原 `Write|Edit`；doctor 检查项移除

## 关键决策
- 2026-06-22：OPT-1B 聚焦 ① install matcher 传播 + ② 文档声明 + ③ doctor 自检（紧急低风险三项）。④ hook 输出格式迁移（`hookSpecificOutput`）与 ⑤ `.mjs` 后缀改名缓做——④旧格式兼容仍有效；⑤收益仅消模块警告却牵连 ~8 处引用 + 3 个测试断言（`testHarnessSetupCommandSkillAndBinStayAligned` 等硬编码 `scripts/req-check.js`），高风险低收益。
- 2026-06-22：三类不可强制场景（subagent / `claude -p` / 解释器写）采用"文档声明 + doctor 提示 + OS 级兜底建议"策略，不追求代码层封堵（上游平台限制 + 理论不可封）。
