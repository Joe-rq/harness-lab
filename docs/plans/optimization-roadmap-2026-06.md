# 外部对标优化路线图（2026-06）

> **状态: 📝 提案**（2026-06-12）
> 来源：2026-06-11/12 深度对标研究会话（fan-out 搜索 20 个来源、55 条论断提取、关键论断独立抽查核实 + 本仓库本地验证）。
> 定位：`unified-roadmap.md`（已完结）和 `multi-agent-roadmap.md` 之后的第三阶段演进输入。本文档只定义方案与拆分，落地时逐项创建 REQ。

---

## 研究结论摘要

2025-2026 年同类格局：**spec-kit**（80k+ stars，宪法 + 四阶段门禁）、**BMAD-METHOD**（46-48k stars，多 agent 角色模拟，单次工作流约 31,667 token、月成本 $800-2000/人）、**OpenSpec**（轻量变更隔离，2026-02 独立 13 维测评综合第一）、**cc-sdd**（Kiro 风格 EARS + 可续传任务循环）、**Agent OS**（规范编译 + 自动 recap）。

Harness Lab 已被外部验证的设计（**不要动**）：文件式跨会话记忆（Anthropic 官方 memory 工具同构）、PreCompact 快照（Anthropic context editing 同构）、防假完成评估（BMAD 真实假完成事故反证）、零依赖轻量（BMAD 成本反证）。

主要来源：
- [boucle.sh: What Claude Code Hooks Can and Cannot Enforce](https://blog.boucle.sh/posts/what-claude-code-hooks-can-and-cannot-enforce/)（190 个 hooks 失效场景目录）
- [anthropics/claude-code#21460](https://github.com/anthropics/claude-code/issues/21460) / [#34692](https://github.com/anthropics/claude-code/issues/34692)（subagent 绕过 PreToolUse）、[#40506](https://github.com/anthropics/claude-code/issues/40506)（`claude -p` 不触发）
- [Reenbit: BMAD vs Spec Kit vs OpenSpec 2026](https://reenbit.com/bmad-vs-spec-kit-vs-openspec-choosing-your-spec-driven-ai-framework/)、[redreamality SDD 综述](https://redreamality.com/blog/-sddbmad-vs-spec-kit-vs-openspec-vs-promptx/)、[softwarethug 三框架对比](https://www.softwarethug.com/posts/openspec-vs-spec-kit-vs-agent-os-compared/)
- [cc-sdd](https://github.com/gotalab/cc-sdd)、[BMAD 成本分析](https://adsantos.medium.com/you-should-bmad-part-2-a007d28a084b)、[dev.to: OpenSpec 失败实验](https://dev.to/incomplete_developer/openspec-spec-driven-development-failed-my-experiment-instructionsmd-was-simpler-and-faster-3a5d)

---

## 通用原则（所有 OPT 落地时遵守）

来自同行失败模式，落地任何一项前对照：

1. **警告优先于阻断**：新增校验默认 warning，只有证据级缺口（如 OPT-1）才用硬阻断。同类框架最高的用户流失原因是"过度流程化"——实测者结论"全部弃用，instructions.md 更快"。
2. **token 预算意识**：BMAD 教训（31.7k token/run）。每项新增 hook 输出、模板章节、注入提醒都要评估每轮对话 token 增量；hook 提醒文本能短则短。
3. **颗粒度自检**：每个 OPT 拆出的 REQ 必须过 ≤4 实体自检；本文档的拆分建议已按此约束设计。
4. **证据导向而非评分导向**：不引入 claude-sub-agent 式数值质量门（95%/80%/85%），LLM 自评分数易被糊弄；坚持"验证命令真实执行 + 输出落盘"。

---

## OPT-1 🔴 强制执行完整性修复（Bash 绕过 + hook 失效偏移）

**优先级**：最高。治理工具自身的承诺完整性是生命线；"号称硬阻断实际可绕过"比"声明为软约束"更伤信任。

### 背景与证据（本会话本地验证）

1. **Bash 绕过**：`.claude/settings.example.json` 中 REQ 强制 hook 的 matcher 仅为 `Write|Edit`。无活跃 REQ 时，`echo x > file`、`tee`、`sed -i`、heredoc 等 Bash 写文件路径完全不经过 `req-check.js`。这正是 boucle.sh 列出的头号失效模式："封一条工具路径 ≠ 封一个策略"。
2. **目录白名单死代码**：`scripts/req-check.js:85-88` 通过 `process.env.CLAUDE_TARGET_FILE` 读取目标文件，但 Claude Code 实际通过 **stdin JSON**（`tool_input.file_path`）传参，该环境变量永远为空 → `isRequirementsOrDocsFile()` 白名单（本应放行 `requirements/`、`docs/plans/`、`.claude/`）从未生效 → 无 REQ 时连填写 REQ 内容、写设计稿都被拦（**过度阻断**，与设计意图相反；2026-06-12 写入本文档时实际触发，需手动豁免）。
3. **hook 报错噪音**：`package.json` 缺 `"type": "module"`，`req-check.js`（ESM 语法）每次执行输出 `MODULE_TYPELESS_PACKAGE_JSON` 警告到 stderr，淹没真正的治理阻断信息（agent 侧只看到模块警告，看不到 REQ ENFORCEMENT 框）。
4. **平台级缺口（无法自修，需声明）**：subagent 工具调用不触发 PreToolUse（[#21460](https://github.com/anthropics/claude-code/issues/21460)、[#34692](https://github.com/anthropics/claude-code/issues/34692)）；`claude -p` 非交互模式不触发（[#40506](https://github.com/anthropics/claude-code/issues/40506)）。

### 目标

1. `req-check.js` / `scope-guard.mjs` 从 stdin 正确解析 hook 输入，目录白名单恢复生效
2. Bash 写文件模式纳入 REQ 门禁（启发式，未知模式放行）
3. hook 输出干净（无模块警告），阻断信息可达 agent
4. 平台级缺口在 README/AGENTS 如实声明，`harness:doctor` 可检测配置完整性

### 非目标

- 不追求 Bash 写检测 100% 完备（理论不可能：`perl -e`、`python -c` 等任意解释器都能写文件）；策略是覆盖高频模式 + 文档明示剩余缺口
- 不修 Claude Code 平台自身的 subagent/pipe 缺口（上游问题，只声明 + 引导 OS 级兜底）

### 方案设计

**REQ-A：stdin 解析修复 + Bash 门禁**（涉及 4 实体：`scripts/req-check.js`、`scripts/scope-guard.mjs`、`.claude/settings.example.json`、`tests/governance.test.mjs`）

1. `req-check.js`：读取 stdin JSON，取 `tool_name` + `tool_input`；`Write/Edit` 取 `file_path` 喂给白名单（替换死掉的 env 读取）；`Bash` 取 `command` 做写模式检测。
2. Bash 写模式启发式（检测到即视同 Write 走 REQ 检查）：
   - 重定向：`>`、`>>`（排除 `2>`、`&>` 到 /dev/null 等噪音目标）
   - 管道写：`| tee`、`| sponge`
   - 原地改写：`sed -i`、`perl -i`、`gawk -i inplace`
   - 文件操作：`rm`、`mv`、`cp`、`touch`、`mkdir`、`ln` 目标在 repo 内（豁免 `.claude/` 下状态文件由白名单放行）
   - heredoc 写文件：`cat >`、`cat <<.*>`
   - 未匹配任何模式 → 放行（读命令零摩擦），可选记录到 `.claude/.bash-write-audit.log` 供事后审计
3. `settings.example.json`：REQ 强制 hook matcher 从 `Write|Edit` 扩为 `Write|Edit|NotebookEdit|Bash`；`scope-guard` 同步。
4. 阻断输出改用 Claude Code hook 协议规范方式（stderr 输出阻断原因 + exit 2，或 stdout JSON `permissionDecision: "deny"`），确保 agent 能读到 E001-E008 错误信息。

**REQ-B：诊断 + 文档 + 工程修缮**（涉及 4 实体：`package.json`、`scripts/harness-doctor.mjs`、`README.md`、`AGENTS.md`）

1. `package.json` 加 `"type": "module"`；回归确认 `req-check.js`、`session-start.js` 等 `.js` 脚本仍正常（均为 ESM 语法，预期无碍；如有 CommonJS 残留改后缀 `.cjs`）。
2. `harness-doctor.mjs` 新增检测项：① REQ 强制 hook matcher 是否覆盖 Bash；② 实际向 hook 喂一条样例 stdin 验证白名单生效（self-test）；③ 提示 subagent/pipe 平台缺口。
3. `README.md`「已知限制」+ `AGENTS.md` 新增小节：明确三类不可强制场景（subagent、`claude -p`、未覆盖的 Bash 写模式），给出 OS 级兜底建议（文件权限、容器化）。安装器 `--with-hook` 输出同步提示。

### 验收标准（EARS 格式）

- When 无活跃 REQ 且无豁免，且 Bash 命令包含对 repo 内路径的 `>` / `tee` / `sed -i` 写入，the hook shall 以 exit 2 阻断并输出 E001 错误信息
- When 无活跃 REQ，且 Write 目标位于 `requirements/`、`docs/plans/` 或 `.claude/`，the hook shall 放行（白名单恢复）
- When Bash 命令为纯读操作（`grep`/`ls`/`cat file`），the hook shall 放行且不产生额外输出
- When hook 执行，stderr shall 不包含 `MODULE_TYPELESS_PACKAGE_JSON` 警告
- When 运行 `npm run harness:doctor`，输出 shall 包含 hook matcher 覆盖检查与平台缺口提示
- `npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过

### 风险与回滚

- **误杀风险**：Bash 启发式拦截合法命令（如向 `/tmp` 写临时文件）→ 路径判定限定 repo 内 + `supervised` harness-mode 可整体降级为仅提醒；回滚 = matcher 还原 `Write|Edit`
- **`"type": "module"` 副作用**：影响所有 `.js` 脚本加载 → REQ-B 单独成 REQ，失败可独立回滚

---

## OPT-2 🟠 REQ 模板：变更增量标记 + EARS 验收标准

**借鉴对象**：OpenSpec 的 `ADDED/MODIFIED/REMOVED` delta 标记；cc-sdd / Kiro 的 EARS 格式需求。

### 背景

现 REQ 模板（`requirements/REQ_TEMPLATE.md`）已有「范围 + Scope Control（可选）」与「验收标准」章节，但：① REQ 只描述"这次做什么"，没有"相对现有行为改了什么"的结构化增量，scope-guard 只能按文件清单做粗判定；② 验收标准只校验"非占位符"，不约束可证伪性——空有检查、缺乏质量。

### 方案设计（1 个 REQ，4 实体：`REQ_TEMPLATE.md`、`scripts/req-validation.mjs`、`tests/governance.test.mjs`、`README.md`）

1. 「范围」章节新增**变更增量**小节：

   ```markdown
   ### 变更增量
   - ADDED: <新增的文件/行为/命令>
   - MODIFIED: <修改的文件/行为> — 改动要点
   - REMOVED: <删除的文件/行为> — 替代方案
   ```

2. 「验收标准」章节注释中给出 EARS 模板与示例：

   ```markdown
   <!-- 推荐 EARS 格式（可证伪、可转测试）：
   - When <触发条件>, the system shall <可观察行为>
   - While <持续状态>, the system shall <约束>  -->
   ```

3. `req-validation.mjs` 新增两条**警告级**校验（遵守"警告优先于阻断"）：① 变更增量小节存在且非占位；② 验收标准中 EARS 模式匹配条数 ≥1（宽松正则 `/^- (When|While|Where|If) .+(shall|应当|必须)/im`，中英文均可）。
4. 存量 REQ 不追溯，校验只对新建 REQ 生效（以创建日期或模板版本标记区分）。

**后续衔接**（独立 REQ，依赖 OPT-1 REQ-A）：`scope-guard.mjs` 读取变更增量小节中的文件路径，作为比「约束」文件清单语义更强的越界判定输入。

### 验收标准

- When 运行 `req:create`，生成的 REQ shall 包含变更增量小节与 EARS 注释模板
- When REQ 缺变更增量或验收标准无 EARS 条目，`req:start` shall 输出 warning 但不阻断
- `npm test` 全绿；token 增量评估：模板新增 < 15 行

---

## OPT-3 🟠 经验文档自动草稿

**借鉴对象**：Agent OS 的 spec 完成后自动生成 recap。

### 背景

`req:experience` 当前生成空模板手填，是完成 REQ 路径上的最大摩擦点之一——而"完成摩擦"正是同类工具被弃用的主因。改为"自动草稿 + 人工确认"可在不降低沉淀质量的前提下降低成本。

### 方案设计（1 个 REQ，3 实体：`scripts/req-cli.mjs`、`tests/governance.test.mjs`、`README.md`）

1. `req-cli.mjs experience` 改为聚合生成预填草稿（**纯脚本聚合，不调 LLM**，守住零依赖原则）：
   - REQ 文件：标题、背景、目标、验收标准勾选状态、关键决策、临时实现与债务章节
   - `git log --grep <REQ-ID>`：commit 列表与改动文件统计
   - `requirements/reports/<REQ-ID>-*.md`：review/QA 结论行
   - 事件账本（复用 `event-store.mjs` 读取 API）：REQ 生命周期时间线、blocked 记录
2. 草稿头部插入 `<!-- AUTO-DRAFT: 以下内容为脚本聚合，需人工确认后删除本标记 -->`。
3. `req:complete` 检测到 AUTO-DRAFT 标记时输出**提醒**（不阻断——经验质量靠人工确认环节兜底，不靠门禁）。

### 验收标准

- When REQ 有关联 commit 与报告，`req:experience` shall 生成包含 commit 列表、报告结论与时间线的草稿
- When 经验文档仍含 AUTO-DRAFT 标记，`req:complete` shall 输出提醒且正常完成
- 无 git 历史 / 无报告时 shall 优雅降级为现有空模板行为

### 风险

草稿质量低导致"确认"流于形式 → 经验文档的价值评估已有 `governance:health` 不变量统计兜底；若实测确认率差再考虑加强。

---

## OPT-4 🟡 不变量宪法化（经验 → 门禁闭环）

**借鉴对象**：spec-kit 的 constitution 概念。

### 背景

`context/invariants/` 已有结构化不变量（`invariant-gate.mjs` 维护 `status`/`severity` 生命周期：draft/active/deprecated × low/medium/high/critical），但当前只在 `req-check` 时作**提醒**注入。经验回流闭环缺最后一环：不变量没有参与新 REQ 的启动门禁。

### 方案设计（1 个 REQ，4 实体：`scripts/req-cli.mjs`、`scripts/invariant-extractor.mjs`、`requirements/REQ_TEMPLATE.md`、`tests/governance.test.mjs`）

1. **宪法集定义**：`severity ∈ {high, critical}` 且 `status: active` 的不变量构成宪法集（复用现有 frontmatter，不新建文件格式）。
2. `req:start` 时：按 REQ 范围章节中的文件/模块路径匹配适用的宪法条款（不变量 frontmatter 增加可选 `paths:` 字段辅助匹配，无字段则全局适用），将清单以复选框形式自动插入 REQ 文件新章节「不变量对照」。
3. `req:complete` / `req:audit` 校验「不变量对照」章节复选框：`high` 未勾选 → warning；`critical` 未勾选 → 默认 warning，可经 `.claude/harness-mode` 为 collaborative 时升级为阻断（与现有模式分级一致）。
4. 注入条目数上限（如 5 条，按 severity 排序截断），防止宪法膨胀重演 BMAD 上下文过载。

### 验收标准

- When `req:start` 执行且存在匹配的 active high/critical 不变量，REQ 文件 shall 自动出现「不变量对照」复选框章节（≤5 条）
- When critical 条款未勾选且 harness-mode 为 collaborative，`req:complete` shall 阻断并输出条款 ID
- When 宪法集为空，流程 shall 与现状完全一致（零开销）

---

## OPT-5 🟡 任务级实现循环

**借鉴对象**：cc-sdd `/kiro-impl` 的单任务循环（新鲜实现者 TDD + 独立 reviewer + 拒绝两次触发 debug + Implementation Notes 传递 + 可中断续传）。

### 背景

本项目治理粒度是 REQ（粗）和单次编辑（细，hook 层），中间缺"任务"层：REQ 内多任务的依赖关系、边界、续传状态没有结构化表达。已有资产：verifier 系统（`HARNESS_VERIFIER_MODE` 的 subagent 模式、`verifier-session.mjs`）可复用为独立 reviewer。

### 方案设计（分两期、2 个 REQ）

**REQ-5a：任务标记协议**（3 实体：`REQ_TEMPLATE.md`、`scripts/req-cli.mjs`、`tests/governance.test.mjs`）

1. REQ「验证计划」前新增「任务清单」章节，任务行格式：

   ```markdown
   - [ ] T1: 实现 stdin 解析 _Boundary: scripts/req-check.js_ _Depends: -_
   - [ ] T2: Bash 写模式检测 _Boundary: scripts/scope-guard.mjs_ _Depends: T1_
   ```

2. `req-cli.mjs` 新增 `req:next`：解析任务清单，输出下一个无未完成依赖的任务（含 Boundary 文件）；`--json` 供编排消费。纯文本协议，无状态文件——复选框即状态，天然可中断续传。

**REQ-5b：impl-loop command**（3 实体：`.claude/commands/impl-loop.md`、`scripts/verifier-session.mjs`、`README.md`）

1. 新 source-command `/impl-loop`：循环执行 `req:next` → 实现（**只注入当前任务文本 + Boundary 文件**，不注入全 REQ 历史——token 控制，吸取 BMAD 教训）→ 运行该任务验证 → subagent 独立 review（复用 verifier-session）→ review 拒绝 2 次转 debug 模式（带上两次拒绝理由重新分析）→ 通过后勾选任务、将跨任务经验追加到 REQ「Implementation Notes」小节 → 下一任务。
2. 每任务一个迭代、循环可随时中断，重入时从复选框状态恢复。
3. 定位为**可选增强 command**，不进入默认流程、不加 hook 强制（防过度流程化）。

### 验收标准

- When 任务清单含依赖链，`req:next` shall 只返回依赖已满足的最早任务
- When reviewer 连续拒绝同一任务 2 次，循环 shall 进入 debug 模式而非第 3 次重试
- When 循环中断后重入，shall 从首个未勾选任务继续且不重做已完成任务
- 不启用 `/impl-loop` 时，现有 feature/bugfix 流程 shall 零变化

---

## OPT-6 ⚪ 治理协议解耦与多 agent 分发（远期）

**借鉴对象**：cc-sdd 单条 npx 命令分发同一套 skill 到 8 个 AI agent；三大框架共同优点"纯 Markdown、无 API key、可切换"。

### 背景

治理协议本体（REQ 流转、目录结构、状态文件、CLI、退出码、错误码 E001-E008）其实是 agent 无关的；hooks 只是 Claude Code 上的执行器。`AGENTS.md` 已是 Codex 等工具的天然入口。解耦后可触达非 Claude Code 用户，也倒逼协议边界清晰。

### 方案设计（1 个调研型 REQ，产出文档不动代码）

1. 产出 `docs/specs/governance-protocol.md`：把状态文件格式（progress.txt、事件账本 schema）、目录契约、CLI 接口（`req-cli.mjs` 子命令 + `--json` 输出）、退出码/错误码定义为正式协议；hooks 单列为「Claude Code 执行器」一章。
2. 调研并记录：Codex / Cursor / Gemini CLI 各自的 rules/hooks 等价机制映射表；`harness-install` 增加非 Claude Code 安装目标的可行性评估。
3. 明确退出标准：若调研结论是维护成本 > 收益，归档结论即关闭方向（参考 Stage 2 事件账本的退出确认先例）。

---

## 执行顺序与依赖

```
OPT-1 REQ-A（stdin + Bash 门禁）─→ OPT-1 REQ-B（doctor + 文档 + type:module）
        │
        └─→ OPT-2（模板增量 + EARS）─→ [后续] scope-guard 消费增量
                  │
OPT-3（经验草稿，无依赖，可并行）
OPT-4（宪法化，无硬依赖，建议在 OPT-2 后做以复用模板改造经验）
OPT-5a（任务协议）─→ OPT-5b（impl-loop）
OPT-6（调研，随时可做，优先级最低）
```

共约 8 个 REQ。建议节奏：OPT-1 两个 REQ 连续完成（缺口暴露状态不宜久留）；其余按需逐个推进，每完成一项观察实际使用摩擦后再启动下一项——本路线图本身也要遵守"不过度流程化"原则。

## 落地检查清单（每个 OPT 启动前）

- [ ] 通过 REQ 颗粒度自检（≤4 实体）
- [ ] 新增校验是否为警告级？若阻断级，证据是什么？
- [ ] 每轮对话 token 增量评估完成
- [ ] 对应回归测试纳入 `npm test`
- [ ] `README.md` / `AGENTS.md` / `CLAUDE.md` 同步义务过 `npm run docs:verify`
