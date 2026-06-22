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
- **已测**（通过直接喂 PreToolUse stdin 验证 hook 逻辑，等价 claude session 触发，绕过 cwd 局限）：

  | 项 | 场景 | 结果 |
  |---|------|------|
  | 1 | 无 REQ + Bash 写 `echo>x` | ✅ 拦（exit 2，REQ ENFORCEMENT 框） |
  | 2 | 无 REQ + Bash 纯读 `ls`/`grep` | ✅ 放行（exit 0，零摩擦） |
  | 3 | 有 REQ（范围外）+ Bash 写 | ✅ scope-guard 阻断（decision:block + 范围提示） |
  | 4 | 有 REQ（范围内）+ Bash 写 | ✅ scope-guard 放行（exit 0） |
  | 5 | subagent 写 | 平台缺口（#21460，已知不可强制，文档已声明） |
  | 6 | `claude -p` 写 | 平台缺口（#40506，已知不可强制） |

- **结论**：OPT-1A/1B 在目标项目工作完全正常。无误杀、无漏拦。
- **实验中的误判（值得记录）**：项 1 初次测试时我一度以为是"repo 外路径（`/tmp/x.txt`）误杀"。重测在有活跃 REQ 状态下放行 → 确认实为"无 REQ 拦所有写"（正确行为），非误杀。**实验过程中容易把"治理生效"误读成"误杀"，需对照条件再下结论。**
- **未覆盖的薄层**：直接喂 stdin 跳过了 matcher 过滤 + claude 调度链。验了 hook 逻辑，没验"claude 是否真把 Bash 命令喂进 hook"。后者风险低（OPT-1B doctor 的 matcher 覆盖检查能验配置层），但若有调度层缺陷，本实验不可见。

### 4. `--skip-experience` 下降率
- REQ-001：**0 skip**（用 OPT-3 experience 草稿 + 人工确认）
- 对照（dogfooding 085/086）：**2/2 skip**（`--skip-experience`）
- 下降率：样本 1，从 100% skip → 0% skip。OPT-3 有效（待更多样本确认）。

## 3 个 actionable 缺陷（已修，REQ-2026-088）

1. ✅ **#2 标题宽松匹配**：`req-validation.mjs` `hasExemption` 加宽松回退（精确取不到 section 时，用 `### 约束` 前缀正则）。兼容 `### 约束（Scope Control）` / `### 约束（Scope Control，可选）` / `### 约束`。
2. ✅ **#3 install 配 .gitignore**：`harness-install.mjs` 新增 `appendGitignore`（幂等追加，标记 `# Harness Lab 运行时状态`）。安装流程末端无条件调用。
3. ✅ **doctor 传播**：`modules.cli.files` 加 `harness-doctor.mjs` + `packageScripts` 加 `harness:doctor`。目标项目默认装即可跑 OPT-1B 三自检。

回归测试：`testExemptionHeadingLenient`、`testHarnessInstallGitignoreAndDoctor`（含幂等断言）。commit `4a12736`。

## 局限

- 样本 1（轻 REQ），中/重复杂度摩擦未覆盖（REQ-2 跳过）。
- 单项目（academic-paper-workflow），无第二对照。
- hook 验证未覆盖 claude 调度链（见 §3 "未覆盖的薄层"）。

## 实验后续洞察（跑完才悟到，比四指标更有方向感）

四指标只把"应该没问题"变成"确实没问题"。下面四条是评估初稿没写、跑完才看到的更深判断：

### A. OPT-3 的真实价值不止"降摩擦"，还是事件账本的下游延伸

REQ-001 experience 草稿的"实施时间线"段来自 `event-store.mjs` 真实事件聚合——**这本身就是 [[ESAA]] event sourcing 的下游产物**。OPT-3 顺手把"经验文档"从手填变成"事件账本投影"，相当于把 Stage 2 事件账本的价值向下游延伸了一步。

**含义**：评估 OPT-3 时只看"--skip-experience 是否下降"是低估了它。它实际把"事件账本只在 §7 决策门用一次"变成了"持续被 experience 消费"，提高了事件账本的边际效用。

### B. harness-lab 最脆弱点是"格式精确匹配静默失效"，而非可见的功能缺陷

REQ-088 修的 3 缺陷里，**最致命的是 #2 标题匹配**——它**静默失效**，用户连"哪里错了"都不知道，只看到 req:start 报"缺 design"。#3（.gitignore）和 doctor 不传播都是**可见**后可修，#2 是**不可见**。

**潜在债务（REQ-088 未覆盖）**：类似 `getSection(content, '具体标题')` 精确匹配的调用可能在 req-validation.mjs / scope-guard.mjs 其他位置也存在。**应做一次 grep：所有标题精确匹配点，评估静默失效风险**。这是 REQ-088 没覆盖的潜在债务。

### C. 第二项目实验**没**为 S3-CP3 决策提供新数据

样本只跑了 REQ-001（轻），用了 self-review，**没**触发 verifier subagent，**没**让事件账本承担"§7 决策门"那种压力。`multi-agent-roadmap` Stage 1（独立 verifier）和 Stage 2（事件账本）的"真实使用观察期"**仍单源**于 harness-lab 自身。

**含义**：S3-CP3（收口/修订/开任务图）的决策依据**仍单源**。如果你想用第二项目真正验证 verifier/事件账本价值，需要：① 跑一个中等复杂度 REQ（我跳过的 REQ-2 类型）；② 开 `HARNESS_VERIFIER_MODE=subagent`；③ 在事件账本积累更多 `verifier_blocked/passed` 事件。否则第二项目只验证了"REQ 生命周期 + Bash 门禁"，不验证治理协议的多层价值。

### D. academic-paper-workflow 长期承载 harness 需调 `harness-mode`

academic-paper-workflow 现装了 41 个 harness 文件 + hook（默认 `collaborative` 模式，PreToolUse 硬阻断）。**未来在此仓干任何事（写论文、改 paper-workflow skill、tweak 模板）都受门禁约束**。对**轻量改动**（改 README、tweak skill）负担过重。

**建议**：academic-paper-workflow 的真实业务流（用户跑 `/paper-workflow` 写论文）若不需要 REQ 治理颗粒度，应改 `.claude/harness-mode` 为 `supervised`（提醒不阻断）。`collaborative` 适合"治理工具自己开发"，不适合"被治理的业务仓"。

## 结论

harness-lab 在 Python 项目（academic-paper-workflow）**可用且经 hook 实测验证**：setup 极快、Bash 门禁正常工作、OPT-3 真降 skip-experience。3 个 actionable 缺陷已修（REQ-088）。

**对 OPT-2/4/5 的判断**（仍成立）：
- OPT-2（EARS/变更增量）：未触发——REQ-001 用 skip-design，EARS 未测。**暂缓**。
- OPT-4（不变量宪法化）：academic-paper-workflow 无不变量，未触发。**暂缓**。
- OPT-5（任务图）：**不做**——实验痛点是接入摩擦（已修），不是并行协作。

**真正的下一步**（来自后续洞察，不是四指标）：
1. 扫描 `getSection` 精确匹配的其他静默失效点（洞察 B 潜在债务）。
2. 若想用第二项目验证 verifier/事件账本价值，跑中等复杂度 REQ + 开 subagent verifier（洞察 C）。
3. academic-paper-workflow 的 harness-mode 调整为 `supervised`（洞察 D）。
