# Session 报告：状态交接修复与门禁加固（2026-09-22 → 09-23）

> 性质：一次连续工作会话的 durable 记录。范围：5 个 REQ（098–102）+ 1 份路线决策 + 1 项 invariant 处置。
> 提交区间：`fb91d4e..3932230`（11 个提交，均已推送）。

## 一、交付清单

| REQ | 内容 | 提交 | 核心证据 |
|---|---|---|---|
| REQ-2026-098 | 状态交接单一真相源：事件账本为唯一状态源；`lastUpdated` 只由工作事件推进；删 `blockers` 死字段；SessionStart 分「机器状态 / 最近事件 / 人的笔记」三区；修 INDEX 搁置列表吞首项 | `394d851` | 修复前 `Last updated: 2026-08-13`（最后一次开会话）→ 修复后为最后工作日；人写的 4 条 Next steps 由"输出 0 条"变为逐条照登 |
| — | 路线决策落盘：按 2026-07-16 报告 §9 五问逐条对否 → **个人精简工具为主线**，观察窗重置为 2026-09-23 → 2026-12-22 | `2787b27` | §9 判定表逐条列证据：受控包名未取得、D2/D3/D5 未修、三平台含 Windows 失败、无外部样本 |
| REQ-2026-099 | 对外承诺收敛：撤下 npm 入口与三平台承诺（README + 2 个随包发布资产 + 2 处守卫）；REQ-096/097 由 `blocked` 转 `suspended` | `2c0a05a` | 安装命令改为与 `npm test` packed-install fixture 同形式；Windows 4 项失败与 run ID 写进 README |
| REQ-2026-100 | 门禁自举：豁免文件（含 worktree-local）写入免检；四类约定交付物按 `reqId` 前缀自动 allow；解析规则进 AGENTS.md / README | `24bdd95` | 真实仓库 `touch/rm .claude/.req-exempt` 由"被拦"变"放行"；报告在未声明路径写入成功（dogfood） |
| REQ-2026-101 | heredoc 正文不参与写目标解析（支持 `<<'EOF'` / `<<"EOF"` / `<<EOF` / `<<-EOF`、多定界符、未闭合、排除 `<<<`） | `010adc1` | 同一条含 `<reqId>-*` 的提交命令：修复前 hook exit 2 → 修复后 exit 0（活体回归） |
| REQ-2026-102 | D2 必需章节 fail-closed：缺章节 / 空章节 / 非模板标题三类拒绝；占位符改行首匹配；判定与渲染单点化 | `ffbd22d` | 故意缺 `## 目标` 的样本执行真实 `req:start` → `missing required section: 目标`；本 REQ 正文引用占位符由"被拦"变"通过" |
| 处置项 | 接受 63 条 90 天未触发的 draft invariant 转 deprecated，并记录其隐式触发链 | `1029efe` `784bfd5` | 现场记录见 `2026-09-23-invariant-auto-deprecate-side-effect.md` |

测试规模：87 → **122**（74 governance + 12 req:status + 11 req:audit + 25 event-store）。`req:audit` 全程维持 125 warning 基线内无 delta。CI：ubuntu ✓ / macos ✓ / windows ✗（4 项既存失败，未引入新失败）。

## 二、系统性发现：四个缺陷同族

**根因一句话：把"提及 / 数据"当成了"内容 / 命令"。**

| 现象 | 表现 | 修复 |
|---|---|---|
| 1. 豁免文件本身要过豁免门禁 | 活跃 REQ 范围不含 `.claude/` 时，`touch .claude/.req-exempt` 被拦 → 范围改不动、豁免建不了（自举死锁） | REQ-2026-100：豁免文件免检，判定插在 canonical path 校验之后 |
| 2. `CANNOT` 段里提到要写的路径 | 为说明"只允许改这一处测试"而写出该路径 → 它变成 deny | REQ-2026-100：规则文档化；"目录禁止 + 单文件例外"改写进 CAN 段 |
| 3. heredoc 正文里的 `>` | 正文被当命令分词 → `writes:true` → 无活跃 REQ 时阻断正常提交 | REQ-2026-101：分词前剥离正文 |
| 4. REQ 正文**引用**占位符 | 子串匹配判为"占位符未替换" → 阻断写它的 REQ（起草时被迫三次改写措辞） | REQ-2026-102：改行首锚定匹配 |

另一个不同族的根因出现在 REQ-2026-098：**同一事实多处计算**（`progress.txt` 的头部由 `updateProgress()` 独立算出，与 `buildProgressProjection()` 构成两份真相；渲染层用 `||` 隐式定权重且从未文档化）。已登记为债务（`updateProgress` 是否改为从投影取值，留给后续 REQ）。

**可复用判据**（已写入 REQ-2026-102 的经验文档）：

1. 任何"检查某段文本是否违规"的校验器，先回答"这段文本取不到时返回什么"——把"取不到"单独当一类问题，而不是让它自然流过检查。
2. 判定必须区分"内容"与"提及"：用行首锚定 + 归一化，而不是子串匹配。
3. 同一判定只能有一份实现（本次发现三份占位符实现、多处写目标判定），门禁类逻辑必须单点。
4. 修复要有两个方向的证据：该拒的拒、该放的放。只有拒绝方向，容易在消除假阳性时把真拦截一起修没。
5. 逃生开关必须能自己打开（逃生动能不能自己上锁）。

## 三、遗留与后续

**代码侧（已定，未开工）**：

- 事件层补 `req_suspended`：事件 schema 没有该类型，投影的搁置列表由 `req_blocked` 事件硬编码 `status: 'blocked'` 生成，因此 096/097 转为 `suspended` 后启动输出仍显示 blocked（需触碰 `scripts/`）。
- 投影 ↔ INDEX 一致性门禁（REQ-098 预留的尾巴）。
- Windows 4 项失败的其中 2 项可本机验证（`spawnSync npm.cmd EINVAL`）——路线已撤下三平台承诺，此项现定位为 CI 卫生。
- `invariant-extractor` 的 `autoDeprecate` 改造：由 `req:complete` 的隐式副作用改为显式命令 + 排除模板文件（现状：模板文件会被误改，本次已手工回退）。
- functional-core profile 与 complete 门槛提前披露（路线 Day 0–30 剩余项）。

**用户侧（实效层唯一证据来源）**：

- 在 `academic-paper-workflow` 跑 hook 实测清单 6 项（见 `2026-06-22-second-project-experiment.md`）。
- 两个自有项目各两个真实任务，逐任务记录首个 REQ 用时、跨会话恢复耗时、误拦/漏拦、豁免、放弃与 repeat-use；失败任务同样计为完整观察。

**新观察（待查）**：本次 5 篇 `context/experience/REQ-2026-09x-*.md` 未产出新的 invariant 候选。`invariant-extractor --scan --incremental` 对新经验文档的触发条件需要核实——它直接关系到路线决策里"自有积累必须能被消费"的判据。

## 四、自查题（供 merge / 复盘用）

1. `scope-guard` 的豁免文件为什么必须免检？若改为"只有范围含 `.claude/` 的 REQ 才能创建它"，会复现什么问题？
2. `lastUpdated` 与"最后一条事件的时间"差在哪？再加一类"不推进它"的事件时，改哪里、补什么测试？
3. README 的安装命令为什么取 `npm exec --package=<tarball> -- harness-install`，而不是另写一条更简洁的？
4. REQ-2026-102 修好之前，为什么 REQ 正文不能在验收标准里写出占位符字面量？漏报与误报分别伤害什么？
5. 若给这套治理系统的下一版定一条设计原则，你会写哪一句？

参考要点：1）逃生动能不能自己上锁；2）差在"有工作发生"与"有人打开会话"，38% 事件是噪声；3）那条形式有 packed-install fixture 的运行证据，自造命令等于再添一条无证据的承诺；4）旧实现是子串匹配，任何引用都误报；误报伤可用性（使用者绕开门禁），漏报伤可信度（承诺变纸）；5）门禁必须区分内容与提及，且逃生开关必须能自己打开。

## 关联

- 路线决策：`docs/plans/2026-09-23-route-decision-personal-slim-tool.md`
- 每个 REQ 的 code-review / QA / ship 报告：`requirements/reports/REQ-2026-09{8,9}-*`、`REQ-2026-10{0,1,2}-*`
- 经验文档：`context/experience/REQ-2026-09{8,9}-*`、`REQ-2026-10{0,1,2}-*`
- invariant 处置现场：`requirements/observations/2026-09-23-invariant-auto-deprecate-side-effect.md`
