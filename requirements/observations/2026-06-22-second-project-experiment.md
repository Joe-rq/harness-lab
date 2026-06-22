# 第二个项目受控实验：academic-paper-workflow 接入 harness-lab

> 日期：2026-06-22
> 实验地：`/Users/qrq/AI/code/02-work/academic-paper-workflow`（Python/uv 项目，Claude Code skill 架构）
> 治理工具：harness-lab（commit `5a82ab0`，含 OPT-1A/1B/3）
> 样本：1 个 REQ（REQ-2026-001 规范 uv.lock 与 .gitignore，轻）
> 目的：四指标受控观测，数据回来再定 OPT-2/4/5

## 实验设计

四指标（用户定义）：setup 时间 / REQ 创建完成摩擦 / hook 误杀漏拦 / `--skip-experience` 下降率。
样本规模：1-2 个真实 REQ 跑完整链路。本实验跑 1 个（轻），REQ-2（中）因 hook 误杀受 cwd 局限测不了而跳过（见局限）。

## 四指标数据

### 1. setup 时间
- 机器：`harness-install --with-hook` 0.065s（41 文件复制 + hook 配置 + 验证 10 项通过）。极快。
- 人摩擦：**无 `package.json` → 所有 req/harness 命令须 `node scripts/req-cli.mjs ...`（非 `npm run req:...`）**。Python 项目适配差，命令冗长。

### 2. REQ 创建完成摩擦（6 点）

| # | 类型 | 发现 |
|---|------|------|
| 1 | 摩擦 | 无 package.json → req 命令 `node scripts/req-cli.mjs ...` 冗长 |
| 2 | **缺陷** | `skip-design-validation` 要求 Scope Control 标题**精确** `### 约束（Scope Control，可选）`（含"，可选"），漏两字 → 豁免静默失效，req:start 报缺 design 且无格式提示 |
| 3 | **缺陷** | `harness-install` 不自动配目标项目 `.gitignore` 运行时忽略（.claude/.xxx-status / events/ / worktrees/）→ git status 被状态文件污染，用户须手动参照 harness-lab/.gitignore |
| 4 | 摩擦 | `req:complete` 强制 review+QA 报告（MISSING_REPORTS），小改动负担 |
| 5 | 摩擦 | `complete` docs gate 对小改动强制（`--no-docs-gate` 绕，但用户须知该 flag）|
| 6 | ✅正面 | OPT-3 experience 自动草稿（聚合 REQ/git/reports/事件账本）降 `--skip-experience` 滥用——REQ-001 用了 experience，没 skip |

### 3. hook 误杀/漏拦
- **未测（局限）**：实验在 AI-resource session 操作 academic-paper-workflow，cwd 不是目标项目 → PreToolUse hook 不触发。OPT-1A/1B 的 Bash 门禁、scope-guard 在本实验无法验证。
- 待用户在 academic-paper-workflow 的 claude session 实测（清单见下）。

### 4. `--skip-experience` 下降率
- REQ-001：**0 skip**（用 OPT-3 experience 草稿 + 人工确认）
- 对照（dogfooding 085/086）：**2/2 skip**（`--skip-experience`）
- 下降率：样本 1，从 100% skip → 0% skip。OPT-3 有效（待更多样本确认）。

## 3 个 actionable 缺陷（回 harness-lab 修）

1. **#2 标题宽松匹配**：`req-validation.mjs` `hasExemption` 的 `getSection` 精确匹配 `### 约束（Scope Control，可选）`。改为宽松（`### 约束` 前缀匹配）或失败时提示"标题须含 'Scope Control'"。
2. **#3 install 配 .gitignore**：`harness-install.mjs` 安装时自动追加 harness 运行时忽略段到目标 `.gitignore`（参照 harness-lab/.gitignore line 32-43）。
3. **doctor 不传播**：`harness-install.mjs` `modules.cli.files`（或 hook 模块）加入 `harness-doctor.mjs`，让目标项目能跑 OPT-1B 自检。

## 局限

- **hook 误杀/漏拦未测**（cwd 局限）。这是受控实验最大未覆盖项。
- 样本 1（轻 REQ），中/重复杂度摩擦未覆盖（REQ-2 跳过）。
- 单项目（academic-paper-workflow），无第二对照。

## hook 误杀实测清单（用户在 academic-paper-workflow claude session 跑）

1. 无活跃 REQ 时 `echo x > test.txt`（Bash 写）→ 应被 req-check 阻断（OPT-1A）
2. 无活跃 REQ 时 `ls` / `grep` → 应放行（纯读）
3. 有活跃 REQ（范围外）时 `echo > out-of-scope.txt` → 应被 scope-guard 阻断
4. 有活跃 REQ（范围内）时 `echo > in-scope.txt` → 应放行
5. subagent 工具调用写文件 → **应绕过**（平台缺口 #21460，已知不可强制）
6. `claude -p` 非交互写 → **应绕过**（#40506，已知）

## 结论

harness-lab 在 Python 项目（academic-paper-workflow）**可用**：setup 极快、OPT-3 experience 有效降 skip-experience。但 3 个缺陷（标题精确匹配 / install 不配 .gitignore / doctor 不传播）增加接入摩擦，应修。hook 误杀/漏拦待用户在目标 session 实测（清单已给）。

**对 OPT-2/4/5 的判断**（数据回来再定）：
- OPT-2（EARS/变更增量）：未触发——REQ-001 用 skip-design，EARS 未测。暂缓判断成立。
- OPT-4（不变量宪法化）：academic-paper-workflow 无不变量，未触发。暂缓成立。
- OPT-5（任务图）：**不做**判断成立——实验痛点是接入摩擦（缺陷 #2/#3），不是并行协作。

**下一步**：回 harness-lab 修 3 缺陷（REQ-088），再请用户在 academic-paper-workflow 实测 hook 清单。
