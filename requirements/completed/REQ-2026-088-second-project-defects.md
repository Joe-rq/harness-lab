# REQ-2026-088: 第二项目实验 3 缺陷修复（标题宽松 + install .gitignore + doctor 传播）

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
2026-06-22 第二项目受控实验（academic-paper-workflow 接入 harness-lab，1 个 REQ）暴露 3 个 actionable 缺陷（详见 `requirements/observations/2026-06-22-second-project-experiment.md`）。这些是**实验数据驱动的修复**，非凭空加机制——符合"数据回来再改"原则。

1. **#2 标题精确匹配脆弱**：`req-validation.mjs` `hasExemption` 用 `getSection(reqContent, '### 约束（Scope Control，可选）')` 精确匹配。用户写 `### 约束（Scope Control）`（漏"，可选"）→ 豁免静默失效，req:start 报缺 design 且无格式提示。
2. **#3 install 不配 .gitignore**：`harness-install.mjs` 不自动追加 harness 运行时状态忽略到目标 `.gitignore` → 目标项目 git status 被状态文件（.claude/.xxx-status / events/ / worktrees/）污染。
3. **doctor 不传播**：`harness-install.mjs` `modules.cli.files` 不含 `harness-doctor.mjs` → 目标项目无法跑 OPT-1B 三项自检（Bash 覆盖 / stdin 契约 / 平台缺口）。

## 目标
1. `req-validation.mjs` `hasExemption` 标题匹配宽松化：识别 `### 约束` 前缀（兼容"（Scope Control）"与"（Scope Control，可选）"），豁免不再因标题漏字静默失效。
2. `harness-install.mjs` 安装时自动追加 harness 运行时忽略段到目标 `.gitignore`（参照 harness-lab/.gitignore line 32-43）。
3. `harness-install.mjs` 传播 `harness-doctor.mjs`（加入 `modules.cli.files` 或 hook 模块），目标项目可跑 `harness:doctor`。

## 非目标
- 不改 REQ_TEMPLATE.md 标题（保持"，可选"为推荐写法，但匹配宽松化）。
- 不改 harness 运行时状态文件清单（只传播现有忽略项）。
- 不修 #4（complete 强制报告）/ #5（docs gate）——这些是 harness 设计取舍（治理完整性 vs 小改动摩擦），非缺陷，不在本 REQ。

## 颗粒度自检
- [x] 目标数 ≤ 4？（3）
- [x] 涉及文件数 ≤ 4？（4：req-validation.mjs / harness-install.mjs / tests/governance.test.mjs / README.md）
- [x] 涉及模块/目录 ≤ 4？（2：scripts/ + tests/ + 根 docs）
- [x] 一句话：修实验暴露的 3 个接入缺陷（标题宽松 / .gitignore / doctor 传播）
- [x] 失败回滚：三处各自独立可回滚

## 范围
- 涉及文件：
  - `scripts/req-validation.mjs`（`hasExemption` 标题宽松匹配）
  - `scripts/harness-install.mjs`（追加 .gitignore + modules 传播 doctor）
  - `tests/governance.test.mjs`（3 缺陷回归）
  - `README.md`（install 行为说明：自动配 .gitignore + 传播 doctor）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（3 缺陷各自独立清晰，无需设计文档）

**允许（CAN）**：
- 可修改：上述 4 文件

**禁止（CANNOT）**：
- 不可修改：req-cli.mjs / event-store.mjs / harness-doctor.mjs 本体 / REQ_TEMPLATE.md / .codex/hooks.json / .claude/settings*.json

## 验收标准
- [x] When REQ Scope Control 标题为 `### 约束（Scope Control）`（无"，可选"），`hasExemption` shall 仍识别 skip-design-validation 豁免
- [x] When `harness-install` 到 fixture 项目，目标 `.gitignore` shall 含 harness 运行时忽略段（.claude/.xxx-status 等）
- [x] When `harness-install` 到 fixture 项目，目标 `scripts/` shall 含 `harness-doctor.mjs`
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-088-design.md`
- 相关规范：`requirements/observations/2026-06-22-second-project-experiment.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-088-code-review.md`
- QA：`requirements/reports/REQ-2026-088-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：`npm test`、`npm run docs:verify`、`npm run check:governance`
- 需要的环境：Node.js
- 需要的人工验证：fixture 项目跑 install 检查 .gitignore + doctor 存在

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] **目标实现**：标题宽松 / .gitignore / doctor 传播三目标全达
- [x] **旧功能保护**：精确标题仍识别；npm test 全绿
- [x] **逻辑正确性**：宽松匹配不误识别非 Scope Control 段
- [x] **完整性**：三缺陷都有实现与测试
- [x] **可维护性**：.gitignore 追加幂等（不重复）

#### 对齐检查（record 阶段）
- [x] **目标对齐**：实现服务于"降低接入摩擦"
- [x] **设计对齐**：与 design 稿一致
- [x] **验收标准对齐**：四条验收全有实现与验证

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：宽松标题匹配可能误识别（如其他 `### 约束` 段）→ 对冲：仍要求"约束"关键词 + Scope Control 上下文
- 回滚：三处独立还原

## 关键决策
- 2026-06-22：3 缺陷为第二项目实验（academic-paper-workflow）暴露，实验驱动修复（observations/2026-06-22-second-project-experiment.md）。
- 2026-06-22：#4（complete 强制报告）/ #5（docs gate）不修——是治理完整性取舍，非缺陷。
- 2026-06-22：标题宽松用 `### 约束` 前缀匹配（兼容两种写法），不删"，可选"推荐写法。
