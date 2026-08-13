# Harness Lab 对外承诺与双路线决策报告

> 评估日期：2026-07-16  
> 决策窗口：未来 90 天  
> 报告性质：分析与条件性路线建议，不代表路线已经实施  
> 产品边界：单一维护者，不扩展到多人并发、权限或多租户

## 一页结论

当前更适合把 Harness Lab 作为**个人精简工具继续验证**，公共脚手架路线保留，但只能在满足明确发布门槛后成为主线。

这不是因为仓库或 npm 包太大。当前候选包压缩后约 160 KB、解压后约 574 KB，且没有第三方运行依赖。真正的问题是：

1. **公开入口尚不可用**：公开 README 的 `npx harness-install` 对应 npm 包不存在；本地候选 README 改用 `--package=harness-lab` 后，又会命中另一个维护者的同名包。
2. **核心承诺存在真实性缺口**：缺少背景、目标和验收章节的 REQ 仍可能通过启动验证；状态恢复可能把 blocked 显示成 idle，并漏掉第一条暂停任务。
3. **默认安装职责混杂**：57 个源文件和 19 个命令同时包含用户生命周期、严格治理、模板仓库 CI、matcher 证据和 Pilot 工具。
4. **“安装成功”不等于“默认命令可运行”**：本轮在干净目标项目实测，`docs:verify`、`check:governance`、`harness:doctor`、`ci:verify` 均失败，但安装器仍报告成功。
5. **最强证据仍来自作者自己的本地 dogfooding**：本地候选 tarball、生命周期、升级恢复有 E3 证据；registry、三平台、真实 Claude matcher 和独立用户复用尚未形成完整 E4 证据。

因此，未来 90 天的默认判断是：

- 先修复两条路线共同依赖的真实性债务；
- 用一个真正可运行的精简 profile 验证个人重复使用价值；
- 只有明确愿意承担公开分发、兼容、平台和外部支持成本，并取得独立用户主动二次使用后，才把公共产品路线升为主线。

### 非技术读者术语速读

| 术语 | 在本报告中的意思 |
|---|---|
| profile / overlay | 一组默认安装内容 / 额外按需安装的能力包 |
| alias | 安装进 `package.json`、供用户运行的命令名 |
| fixture | 为验证安装或升级临时创建的测试项目 |
| smoke | 最短但真实的一次关键路径运行，不等于完整测试 |
| fail-open | 输入缺失或异常时错误地放行，而不是拦截 |
| matcher dispatch | Claude Code 是否真的把某类操作交给指定 Hook |
| registry | npm 等公共包仓库；“本地能打包”不等于“registry 能安装” |
| SHA / tracking ref | 不可变 Git 提交编号 / 本机记录的远端分支位置 |

## 1. 评估口径

### 1.1 证据等级

| 等级 | 含义 | 本报告中的典型例子 |
|---|---|---|
| E0 | 只有声明，或目标证据完全缺失 | “三平台均支持”、独立用户复用 |
| E1 | 代码、配置或文档已经存在 | 工作区内三平台 workflow、npm 元数据 |
| E2 | 本仓库自动验证通过 | 单元测试、契约测试、静态 matcher smoke |
| E3 | 干净目标项目端到端通过 | 本地候选 tarball 安装、REQ 生命周期、升级恢复 fixture |
| E4 | registry、托管平台或独立真实用户证据 | npm registry 元数据、公开 Actions run、非作者用户主动复用 |

E4 也可以是反证。例如，registry 明确显示同名包属于另一个项目，比“尚未发布”更强：它证明当前公开命令会命中错误对象。

### 1.2 维护成本

| 等级 | 含义 | 成本驱动 |
|---|---|---|
| C0 | 几乎没有持续成本 | 静态协议、无需兼容的本地说明 |
| C1 | 单机、偶发维护 | 一名维护者、本地环境、少量命令 |
| C2 | 每次发布需重复验证多个入口 | profile、CLI、文档、升级 fixture、Hook 配置 |
| C3 | 持续承担公开分发与用户支持 | 包身份、版本、三平台、上游 Claude 变化、迁移和数据恢复 |

本报告不虚构工时。成本等级必须同时给出实际维护对象。

### 1.3 “完成”的六层语义

公共路线必须停止把以下状态合并成一个 `completed`：

```text
implemented → committed → pushed → packaged → published → registry-smoked
```

- `implemented`：当前工作区实现完成；
- `committed`：实现与证据已固化到不可变 Git 提交；
- `pushed`：其他人可以从公共仓库获取该提交；
- `packaged`：从该提交生成候选包并通过本地 tarball smoke；
- `published`：精确版本已发布到受控 registry 身份；
- `registry-smoked`：从空缓存、精确版本完成真实安装和核心旅程。

这六层是独立的**交付证据状态**，不替换 REQ 生命周期。REQ 的 `completed` 仍只表示需求工作项闭环，不等于已经提交、推送、发布或完成 registry 验证。

## 2. 当前证据基线

### 2.1 三层项目真相

| 层次 | 2026-07-16 状态 | 可以声称什么 |
|---|---|---|
| 公开 `master` | 本地 tracking ref 为 `97f8552`；公开仓库的 `package.json` 声明版本 1.1.0，workflow 仅 Ubuntu + Node 20 | 到 REQ-088 左右的公开能力；不能代表当前工作区候选，也不表示 npm 已发布本项目 1.1.0 |
| 本地已提交 | `92e6120`，比 tracking ref 多 REQ-089/090 两个提交 | 本机可重建，但尚未公开推送 |
| 当前工作区 | REQ-091～095 标记完成；REQ-096/097 blocked；大量未提交与未跟踪文件 | 只能称“本地候选”，不能称公共交付 |

REQ-091～095 的 QA/ship 报告提供了详细本地证据，但后续 REQ 又继续修改同一批脚本。没有对应不可变提交时，不能把早期报告自动外推到当前树。本轮 `harness:doctor` 的依赖回归就是具体例子：REQ-091 曾报告 packed target doctor 可用，当前 default profile 实装却因缺少后续引入的 `hook-policy.mjs` 而失败。

### 2.2 包体与安装表面积

本轮从当前工作区重新执行安装和打包：

| 档位 | 安装器复制 | 安装后总文件 | 可计算文本行数 | Harness 命令 | 实际含义 |
|---|---:|---:|---:|---:|---|
| `core-only` | 6 | 13 | 844 | 0 | 静态协议和模板种子；没有 CLI、status 或 doctor |
| `defaults` | 57 | 64 | 10,364 | 19 | 用户生命周期、严格治理和维护者工具混装 |
| `core-only + with-hook` | 33 | 40 | 10,135 | 19 | 因 Hook 依赖整个 CLI，直接从 6 跳到 33 个复制文件 |
| npm 候选包 | 78 entries | — | — | 1 个 bin | 159,545 bytes 压缩、573,908 bytes 解压、零 bundled dependencies |

所以它**物理上不臃肿，默认职责和认知表面偏胖**。现有 `core-only` 又过于薄，不是可完成核心用户旅程的“个人精简版”。

### 2.3 本地门禁结果

当前工作区执行完整 `ci:verify`：跨 tests/capabilities/docs/governance/doctor/pack 6 个阶段的 9 项检查通过，包括 69 项 governance、12 项 status、11 项 audit、21 项 event-store 测试。

保留意见：

- 执行环境是 macOS arm64、Node 23.6.1；项目预期 Node 20，证据中 `nodeMajorMatches=false` 且未强制失败；
- governance 的“通过”包含 125 条已知历史 warning；
- 源仓库测试通过，不等于 default 目标项目的每个命令通过；
- 公开 workflow 仍只有 Ubuntu + Node 20，未见当前候选三平台发布 SHA 的完整证据。

### 2.4 REQ-096/097：做了多少，不等于现在必须做

| 未完成项 | 当前实现完成度 | 个人路线必要性 | 公共路线必要性 | 本轮判断 |
|---|---|---|---|---|
| REQ-096：跨平台 CI 与 Claude matcher | 三平台 workflow、证据结构和静态 matcher 契约已到 E1/E2；当前候选 macOS/Windows Node20 hosted run 与真实 interactive dispatch 仍是 E0 | **非必须**。只承诺实测本机；matcher 可留作维护者实验 | **必须**。三平台 Node20 hosted run 与真实 interactive dispatch 是 Day 60 硬门槛，即使 Hook 不进入 public default | 不恢复原 REQ；先选路线。选个人则暂停，选公共则按 hosted / matcher 两个证据目标拆分 |
| REQ-097：三类外部项目 Pilot | 协议、文档和 collector 到 E2；授权真实项目、完整周期、独立用户复用仍是 E0 | **原方案非必须**。用两个自有项目、四个真实任务验证主动复用即可 | 外部真实使用与非作者二次使用是 stable 门槛；“三技术栈 × 两周期 × 14–28 天”不是固定前提 | 不恢复原 REQ；公共路线成立后重写为不排除失败样本的采用实验 |

因此，未完成不等于欠账都要补齐。两条路线共同必须修的是 REQ 门禁、状态真实性和最终默认命令契约；REQ-096/097 只有与所选路线的公开承诺直接相连的部分才是必须项。

## 3. 真实性债务

### D1. npm 身份和公开入口冲突

截至 2026-07-16：

- [公开 README 的固定提交快照](https://raw.githubusercontent.com/Joe-rq/harness-lab/97f85527e1ba6fcbb4a2838c631a000ed33b8249/README.md) 使用 `npx harness-install ...`；2026-07-16 请求 [npm registry 的 `harness-install/latest`](https://registry.npmjs.org/harness-install/latest) 得到 HTTP 404 / `Not Found`。
- 当前本地 README 改为 `npx --yes --package=harness-lab harness-install ...`；但 [registry 的固定版本 `harness-lab@1.2.0`](https://registry.npmjs.org/harness-lab/1.2.0) 属于 `hgflima/harness-lab`，bin 只有 `harness-lab`，没有 `harness-install`。
- [公开 package.json 的固定提交快照](https://raw.githubusercontent.com/Joe-rq/harness-lab/97f85527e1ba6fcbb4a2838c631a000ed33b8249/package.json) 是本项目仓库中的 `harness-lab@1.1.0` 声明；公开 tag 仅见 `v0.2.0`，该 tag 内的 package version 仍为 1.1.0，且 [GitHub Releases](https://github.com/Joe-rq/harness-lab/releases) 没有对应发布。

这是 E4 反证。公共路线必须更换为受控的唯一/scoped 名称，并让 package、bin、README、tag、release 和 registry 原子一致。个人路线则应撤下 npm 可用承诺，只保留源码或本地 tarball。

### D2. REQ 必填门禁 fail-open

[REQ 验证器](../../scripts/req-validation.mjs) 对固定中文标题提取章节；章节不存在时返回空字符串，但只检查空字符串是否包含已知占位词。本轮直接验证：

```json
{
  "missingSections": { "status": "implementation", "issues": [] },
  "englishHeadings": { "status": "implementation", "issues": [] }
}
```

这与“背景、目标、验收标准未写实不能启动”的核心承诺相冲突。两条路线都必须把必需章节的缺失、空内容和不支持标题识别为问题。

### D3. default 命令契约失真

本轮在干净 Git/npm 目标中安装 `--defaults`，安装器复制 57 个文件并报告 83 项验证通过。随后逐一检查 19 个目标命令：

- `docs:verify`：失败，目标项目没有 default 未复制的根 `README.md`；
- `check:governance`：失败，同样读取未安装的模板仓库资产，并硬编码 workflow、tests 和示例 REQ 等源仓要求；
- `harness:doctor`：失败，当前 default 未复制其 import 的 `hook-policy.mjs`；同一命令在 `core+hook` 中反而通过；
- `ci:verify`：失败，目标项目没有 `tests/governance.test.mjs` 等源仓测试和 capability 同步环境。

`docs:impact` / `docs:impact:json` 在安装文件形成 baseline commit 后可以运行，但规则主要面向 Harness 自身，因此更适合作为维护者 overlay。`harness:matcher-smoke` 的静态正负集合可以运行；`pilot:observe init` 也可以运行，但二者都不属于新用户首个任务。

安装后校验目前主要验证文件和 script 字符串存在，不能把“83 项通过”解释成“19 个默认命令可用”。

### D4. 状态真相冲突

当前状态恢复链存在三个不同语义：

- [事件投影](../../scripts/event-store.mjs) 把没有 active、但存在 suspended 的状态显示为 `idle`；
- [REQ CLI](../../scripts/req-cli.mjs) 的缓存写入可能显示 `blocked`；
- [SessionStart](../../scripts/session-start.js) 优先使用事件投影，并且暂停列表解析会吞掉第一项。

会话打开事件还会刷新 `lastUpdated`，所以“今日更新”可能只表示打开了会话，而不是工作发生变化。当前 `.claude/progress.txt` 还同时写着 `Current phase: blocked` 和 `Blockers: None`。

跨会话恢复是产品核心价值，错误下一步比没有自动恢复更危险。两条路线都必须先定义一个用户可理解的唯一状态语义。

### D5. 新手契约出现得太晚或互相矛盾

- [AGENTS.md](../../AGENTS.md) 说单文件小改动不需要 REQ，但启用基础 Hook 后，[req-check](../../scripts/req-check.js) 会阻断任何无 active REQ 的非治理写入，三种 mode 也不会放宽这条核心门禁。
- 安装完成只引导 create → 填写 → start；用户到 `req:complete` 时才发现必须补 code review、QA 和 experience。
- `core-only` 安装后明确告诉用户“改装 default 才能运行 REQ”，因此它不能被宣传为可用的精简产品。
- 目标项目没有 `type: module` 时，基础 Hook 每次运行都会输出 `MODULE_TYPELESS_PACKAGE_JSON` 警告；给源码仓库的 package 增加字段并不会自动修复目标项目。

这些问题不会增加包体，却会显著增加首次任务的认知和信任成本。

## 4. 对外承诺矩阵 A：证据与成本

为避免超宽表格，固定字段拆成 A/B 两张矩阵，用 ID 对齐。A 表仍把“现有证据”和“证据缺口”分列；缺口前缀严格使用“未实现 / 已实现未验证 / 已验证未交付”。B 表包含两条路线的默认选择与改变条件。

| ID | 对外承诺 | 当前默认表面 | 现有证据 | 证据缺口 | 失败后果 | 维护成本 |
|---|---|---|---|---|---|---|
| P01 | [README](../../README.md)：“适合：使用 AI 辅助开发的个人软件工程师”；“单用户设计：无多租户/权限系统，不适合多人同时操作同一仓库” | 单用户边界放在 README 后段；产品概览仍出现“工程团队” | 单用户文件模型 E1；worktree 隔离与聚合 E2/E3 | **未实现**：单用户边界尚未在首屏、安装帮助和产品概览中一致表达 | 团队误用可能覆盖状态或丢数据 | **C1**：维护单机文档和状态；若扩到团队则 **C3**，需权限、并发和恢复支持 |
| P02 | [README](../../README.md)：“一键接入”；“如果通过包分发方式安装，`package.json` 已暴露 `harness-install` bin”；另列“手动接入” | 默认有多条安装路径；手动方案复制整个 `context/docs/requirements/scripts/.claude` | 源码与本地候选 tarball 安装 E3；registry 包身份冲突为 E4 反证 | **未实现**：受控 npm 身份；**已实现未验证**：整目录手动复制；**已验证未交付**：本地 tarball 结果未形成公共版本 | 下载错误第三方包，或把历史 REQ、报告、事件状态带入目标项目 | 源码 **C1**；公共 **C3**：包名、版本、tag、registry smoke 和用户支持 |
| P03 | [README](../../README.md)：“零第三方运行依赖：无 npm 依赖”；[package.json](../../package.json)：`engines.node = ">=20"` | npm 候选包零 bundled dependency；package 要求 Node ≥20 | 零依赖 E2/E3；旧公开 SHA 的 Ubuntu Node20 run E4；本机当前候选在 Node23 为 E2/E3 | **已实现未验证**：当前候选包在最低版本 Node20 的干净目标运行；**已验证未交付**：零依赖候选包仍未形成受控 registry 版本 | 最低支持版本无法运行，或依赖声明与包内容不一致 | 零依赖本地维护 **C1**；公共版本 **C2**：每次打包复核依赖与 Node20 最低版本 |
| P04 | [README](../../README.md)：“默认安装是治理引导，不是完整镜像”；“只有复制与安装后验证全部成功时才返回 0 并显示‘安装完成’”；已有 `lint/test/build` 时“尽量复用，并自动组合 `verify`”，缺失时写 placeholder guard | 57 个复制文件、19 aliases；用户、专家和维护者工具混装；还会写入或组合业务验证命令 | 安装、profile 和命令绑定 E2/E3；本轮逐项运行 19 个 alias | **未实现**：default 目标项目的完整命令契约，当前 4 个入口因缺资产/依赖失败；placeholder 也不等于真实业务验证 | 安装显示成功，用户首个诊断命令即报错，或把 placeholder 误认为业务验证已经建立 | **C2**：每次发布需复测 profile、19 个 alias、业务命令绑定及新手认知表面 |
| P05 | [README](../../README.md)：“REQ 生命周期管理，从创建到完成全程追踪”；“空模板 REQ 既不能通过 `PreToolUse`，也不能执行 `req:start`” | 生命周期默认；模板 115 行，字段和概念较多 | packed target 生命周期 E3；错误分类和模板检查 E2 | **未实现**：缺失/空白必填章节的 fail-closed 语义，当前可绕过启动门禁 | 用户以为治理已兜底，实际可空壳实施 | **C2**：验证器、模板、CLI、Hook 四处契约同步及正反测试 |
| P06 | [README](../../README.md)：“review / QA / ship 报告落盘，可追溯可审计”；`req:experience` 为“完成前必须” | complete 硬要求 review、QA、experience；ship 按需 | 报告/经验检查与生命周期 fixture E2/E3 | **已实现未验证**：新手是否获得大于填写成本的收益；**已验证未交付**：当前 E2/E3 收尾证据仍只在带 125 条已知 warning 的本地候选 | 收尾阶段突然增加作业，或产物变成仪式性文件 | **C2**：每个 REQ 的撰写、链接、复核，以及每次发布的 audit 和认知成本 |
| P07 | [README](../../README.md)：“跨会话恢复工作状态，减少重复沟通”；worktree 使用“独立的……events 与 progress”且状态聚合“只报告、不自动合并” | default 只安装状态/worktree 工具；`session-start.js` 仅随 `--with-hook` 安装，当前与 PreToolUse 共用同一开关 | worktree 隔离、聚合和 lifecycle E2/E3 | **未实现**：事件、缓存、INDEX、SessionStart 的统一状态语义；blocked/idle、更新时间和暂停首项仍冲突 | 给出错误下一步，破坏核心信任 | **C2**：事件、缓存、索引、SessionStart 与多 worktree 兼容同时维护 |
| P08 | [README](../../README.md)：“PreToolUse 为硬阻断：无活跃 REQ 或 REQ scope 越界时禁止 Write/Edit”；“紧急小改动可用 `.claude/.req-exempt` 临时豁免” | `--with-hook` 才安装；但 core+hook 拉入整个 CLI | Hook 脚本输入、scope 对抗和 packed fixture E2/E3；上游不可强制边界已披露 | **已实现未验证**：多种真实业务命令下的误拦、漏拦和豁免率；**已验证未交付**：候选 Hook 行为证据仍停留本地 | 误以为绝对强制，或小改动被意外阻断 | **C2**：持续维护写命令识别、scope、豁免审计和用户认知边界 |
| P09 | [README](../../README.md)：“升级只替换……未修改的受管文件”；“用户修改……都会保留并进入冲突报告”；写入前保存旧字节并提供 restore | upgrade/restore 是显式入口，ownership 记录随安装生成 | 本地候选的冲突、备份、恢复 fixture E3 | **已实现未验证**：两个真实 registry 版本 A→B 与独立用户改动；**已验证未交付**：现有 E3 仅在本地候选 | 覆盖用户文件或无法恢复，属于数据风险 | 个人 **C2**：baseline、备份和 fixture；公共 **C3**：跨版本迁移、数据事故与恢复支持 |
| P10 | [README](../../README.md)：“以下机制在模板仓库中完整运行，目标项目按需启用”；提供 `collaborative / supervised / autonomous` 三种模式 | 高级脚本随包发布但不进 default；没有明确安装参数 | 8 风险点 × 3 模式策略矩阵 E2 | **未实现**：完整、公开的 advanced overlay 安装入口；**已实现未验证**：三模式真实使用价值 | 文档说“可选”，用户却无法完整安装或误解模式效果 | 可选能力 **C2**：脚本和策略矩阵；若公开支持则 **C3**：上游兼容与模式解释 |
| P11 | [README“成功标准”](../../README.md)：“已完成工作沉淀为可复用经验”；“经验自动回流为不变量规则，在后续操作中主动提醒” | default 安装 extractor/gate；完成 REQ 会继续生成候选 | 提取、去重和 gate 生产链 E2；当前有 52 条唯一规则 | **已实现未验证**：后续任务主动消费和减少返工的价值；47 条仍为 draft、21 条重复 | 持续生产知识文件，却没有对应复用收益 | **C2**：持续提取、去重、人工裁决、激活及消费入口维护 |
| P12 | [README](../../README.md)：“GitHub Actions 已配置……三格”；matcher interactive smoke“要求同一会话的 Read 不命中、Bash 命中” | CI/matcher 被注入 default；三平台实现仍在工作区 | 静态 matcher E2；旧公开 Ubuntu Node20 run E4；候选三平台配置 E1/E2 | **已实现未验证**：当前发布 SHA 三平台 hosted run 与真实 interactive dispatch；**已验证未交付**：静态契约仍在本地候选 | 对外支持声明超过证据，增加故障与信任成本 | **C3**：三平台 runner、Node/Claude 版本、证据 artifact 与每次发布复测 |
| P13 | [README](../../README.md)：“JavaScript、Python、monorepo 各需两个真实业务 REQ 和 14–28 天 observation” | 三份 Pilot 文档和 collector 进入 default | Pilot 协议、校验和 collector E2 | **未实现**：授权真实项目、完整观察、独立用户和主动二次使用；**已实现未验证**：现协议会排除部分失败样本 | 只统计成功者，得到必然乐观的产品结论 | 实验 **C2**：招募、授权、观察和脱敏；公共持续研究 **C3**：外部支持与样本维护 |

## 5. 对外承诺矩阵 B：两条路线的默认选择

“暂停承诺”表示能力可保留在源码中，但不能继续作为默认或已验证事实宣传。

| ID | 个人精简工具默认 | 公共脚手架产品默认 | 改变当前判断的条件 |
|---|---|---|---|
| P01 | 保留单一维护者定位；删除“工程团队”歧义 | 保留单一维护者定位，不宣传团队协作 | 只有实现并验证并发、权限和恢复后才扩大用户边界 |
| P02 | 保留源码/本地 tarball；暂停 npm；删除整目录手动复制 | 必须使用受控唯一/scoped 包，并保留精确 allowlist 手动后备方案 | registry 精确版本能从空缓存完成核心旅程 |
| P03 | 保留零依赖；Node 版本只声明实际本机 | 保留零依赖和 Node ≥20 | 当前候选包在 Node20 干净目标通过，且打包元数据确认无运行依赖 |
| P04 | 新建 functional-core 默认档；其余可选 | 同样使用精简 public default；maintainer/evaluation 独立 overlay | default 中每个命令均在 packed/registry target 运行，而非只检查存在 |
| P05 | 保留简化生命周期；先修 fail-open | 保留生命周期并把必填契约视为发布门禁 | 缺失、空值、占位和受支持标题均有正反测试 |
| P06 | 普通任务采用轻量收尾；完整 review/QA/experience 进入 strict 选项 | 按风险分级；公共核心不在最后一步突然增加隐藏门槛 | 先重做 complete 契约；否则 experience 仍必须留在最小生命周期 |
| P07 | 保留状态恢复，优先于高级自动化 | 保留并定义为核心公开接口 | 事件、缓存、INDEX、SessionStart 对同一场景输出一致 |
| P08 | PreToolUse、scope guard 与豁免显式可选 | 同样作为可选写入门禁，不宣传绝对强制 | 真实任务中的误拦/漏拦/豁免可接受，且不可强制边界在接入时明确显示 |
| P09 | 升级/恢复作为可选安全能力 | ownership、dry-run、upgrade、restore 属公共安装契约 | 至少两个 registry prerelease 版本完成 A→B；写入失败不留不可恢复半状态，备份与显式 restore 通过 |
| P10 | 移出默认；无消费则归档 | 独立 advanced overlay，不属于 public default | 有明确安装入口、支持矩阵和真实使用需求 |
| P11 | 可选或归档候选，不再默认生产大量规则 | strict/learning overlay；暂停“主动提醒”承诺 | active invariant 被后续任务真实消费并证明节省返工 |
| P12 | 暂停三平台和真实 matcher 承诺 | CI/matcher evidence 属 maintainer overlay；三平台 Node20 与真实 matcher 是 Day 60 / beta 硬门槛 | REQ-096 的 hosted 与 interactive 证据真实落盘 |
| P13 | 不进默认；用两个自有项目做轻量观察 | evaluation overlay；稳定版前需要独立用户复用 | 任一实际结果都可关闭一次观察，且不得只保留 completed；随后出现主动二次使用 |

## 6. 19 个目标命令归类

本表基于 2026-07-16 从当前工作区安装出的干净 default fixture。`领域错误`表示脚本能正确加载，并对不存在的 REQ 返回预期错误，不代表已完成整条业务旅程。

| 命令 | 干净 default 实测 | 个人路线 | 公共路线 |
|---|---|---|---|
| `req` | help 成功 | 可选便利入口 | 可选便利入口 |
| `req:create` | 创建成功 | 默认核心 | 默认核心 |
| `req:start` | 正确返回 REQ 不存在；既有 packed lifecycle E3 | 默认核心，修门禁后保留 | 默认核心，修门禁后保留 |
| `req:block` | 正确返回领域错误；既有 packed lifecycle E3 | 默认核心 | 默认核心 |
| `req:complete` | 正确返回领域错误；既有 packed lifecycle E3 | 默认核心，但需先决定轻量收尾契约 | 默认核心，按风险公开完整要求 |
| `req:status` | 成功 | 默认核心，修状态语义 | 默认核心，修状态语义 |
| `req:audit` | 成功 | strict 可选 | strict 可选 |
| `req:experience` | 正确加载；packed target E3 | 目标为可选；当前仍被 complete 强制 | strict 可选；改变前仍属生命周期必需 |
| `req:reflect` | 正确加载并返回领域错误 | 可选 | 可选 |
| `req:align` | 正确加载并返回领域错误 | 可选 | 可选 |
| `governance:health` | 成功 | 可选 | strict/maintainer 可选 |
| `docs:verify` | **失败：缺根 README** | 不进入用户默认 | maintainer overlay；修复或撤销 target alias |
| `docs:impact` | baseline commit 后成功 | 不进入最小默认 | maintainer overlay |
| `docs:impact:json` | baseline commit 后成功 | 不进入最小默认 | maintainer overlay |
| `check:governance` | **失败：读取未安装的模板资产** | 不进入用户默认 | maintainer overlay；撤销 target alias |
| `harness:doctor` | **失败：default 缺 `hook-policy.mjs`；core+hook 反而成功** | 修复后默认核心 | 修复后默认核心、发布阻断项 |
| `harness:matcher-smoke` | 静态 matcher JSON 成功 | 维护者/实验 | evaluation/Claude adapter |
| `ci:verify` | **失败：缺源仓 tests** | 不安装 | maintainer CI，不注入目标默认 |
| `pilot:observe` | 合法 `init` 成功 | 研究工具，不默认 | evaluation overlay，不默认 |

建议目标结构不是简单删除 12 个命令，而是拆成三个职责：

1. **functional core**：create/start/block/complete/status/doctor；
2. **strict governance overlay**：audit/experience/reflect/align/health；
3. **maintainer/evaluation overlay**：docs contract、repository governance、CI、matcher evidence、Pilot。

`req` dispatcher 可以作为便利入口保留，但不应被当作独立能力计数。

## 7. 路线 A：个人精简工具

### 7.1 产品定义

- 用户：单一维护者及其自有项目；
- 核心价值：隔天回来知道做到哪里、重要任务不漂移、必要时限制 agent 修改范围；
- 分发：源码或本地 tarball，不承担公共 npm 身份和陌生用户支持；
- 平台：只承诺真实验证的本地环境；
- 定位名称可以收窄为“个人 AI 开发记忆与任务边界工具”，避免把完整研发审计默认施加给每个小任务。

### 7.2 最小默认能力

建立新的 `functional-core`，而不是沿用当前 `core-only`：

- 简化后的入口说明；
- create/start/block/status/complete；
- INDEX 与单一状态源；
- SessionStart 作为非阻断状态展示；可以记录会话打开事件，但不得因此更新“最后工作时间”；
- doctor；
- 默认把真实验证、未完成事项和下一步写回当前 REQ，不新增独立报告；只有 strict 才生成 review/QA/experience 资产。

显式可选：

- PreToolUse、scope guard 和全部高级 Hook；
- 完整 review、QA、experience 闭环；
- audit、reflect、align、invariant；
- worktree 并行能力；
- matcher、CI 和 Pilot 研究工具。

### 7.3 30 / 60 / 90 天推演

**Day 0–30：先让测量对象可信**

1. 修复 REQ fail-open、状态冲突，以及 functional-core 最终保留命令的运行契约；维护者命令可以移出目标项目，不要求全部改造成用户命令；
2. 定义 functional-core 及轻量/strict 两级收尾；
3. 在两个自有项目各完成两个真实任务；
4. 逐任务记录安装时间、填写治理材料时间、跨会话恢复时间、误拦、漏拦、豁免、失败和放弃；
5. 失败任务同样算完整观察，不能只统计成功者。

**Day 31–60：验证主动复用**

1. 观察第二个项目是否在没有实验要求推动时仍主动使用；
2. 至少验证两次真实跨会话恢复；
3. 列出四个任务中实际调用的命令；从未主动使用的能力不得进入默认；
4. 比较治理维护时间与减少的重新理解、返工时间，不用主观“感觉有用”代替。

**Day 61–90：冻结或继续瘦身**

1. 默认面只保留被重复使用且能说明价值的能力；
2. 没有消费入口的 invariant、advanced hooks、Pilot 进入归档候选；
3. 决定继续作为稳定个人工具，还是冻结为低维护模板；
4. 只有出现非作者用户主动需求，才重新评估公共路线。

### 7.4 成功与停止条件

成功必须同时满足：

- 在第二个项目发生主动复用；
- 状态恢复没有给出错误下一步；
- 治理维护时间不高于它减少的恢复和返工时间。

如果启用了 strict，额外要求其产物确实被后续任务读取，而不只是为通过门禁生成。

出现任一条件即停止扩功能：

- 四个真实任务后仍未主动在第二项目复用；
- 多数任务依赖豁免或绕开治理才能完成；
- 启用 strict 后，review/QA/experience 主要是仪式性文件；
- 再发生一次严重的错误状态恢复；
- 维护治理材料连续比重新理解任务更耗时。

### 7.5 成本边界

- 基础工具目标是 **C1**：单机、源码或本地 tarball、偶发维护；
- strict、Hook 和安全升级一旦启用就是 **C2**：每次变更都要重复跑生命周期、误拦和恢复验证；
- 最大成本不是文件体积，而是每个真实任务的填写与判断时间；它一旦持续高于节省的恢复/返工时间，就触发停止条件。

## 8. 路线 B：公共脚手架产品

### 8.1 产品定义

- 用户：陌生的独立单人项目维护者；
- 不扩展为团队并发、权限或多租户产品；
- 通用 CLI 是核心，Claude Code Hook/source-command/matcher 是 adapter 或 overlay；
- public default 与个人路线一样精简，公共产品不等于把更多功能默认装给用户；
- 源仓库本身会比个人路线更复杂，因为必须持续维护分发、兼容、迁移、证据和支持。

### 8.2 分阶段公共门槛

**首次 prerelease 前**：

1. 选择受控唯一/scoped 名称，让 package、bin、README 和 installer help 原子一致；
2. 从干净、不可变且通过 CI 的 SHA 生成本地候选 tarball；
3. 修复 D2–D5，并让最终 public-default 的每个命令完成文档规定的有效场景，或返回文档规定的领域错误；不得出现缺文件、缺依赖或脚本崩溃；
4. 首个 0.x alpha 可以明确标注三平台、Claude adapter 和 public upgrade 尚未达到支持状态，但它们仍是 Day 60 的路线债务；不能靠永久删除承诺把公共路线判为成功。

**首次 prerelease 发布后**：

5. 立即从空目录、空缓存、精确版本执行 registry smoke，记录 package integrity、SHA、OS/Node 和 run URL；失败则不得公告或晋级，并按 npm 实际允许的方式标记 deprecated，不承诺一定能 unpublish。

**Day 60 或 beta 晋级前**：

6. 发布 SHA 的 Ubuntu/macOS/Windows Node20 同一入口全部通过并上传独立 evidence；
7. 至少两个 prerelease registry 版本完成 A→B，覆盖用户修改冲突、active 状态和备份；写入失败不得留下不可恢复半状态，显式 restore 必须通过；
8. 从 registry 安装产物在记录的 Claude CLI 版本完成 doctor 与真实 interactive dispatch，证明 Read 不命中、Bash 命中。Hook 可以不进 public default，但真实 matcher 证据不能省略。

**stable 前**：

9. 至少两个真实项目形成闭环观察；所有实际出现的 completed、paused、abandoned、failed 均纳入，不得只保留成功样本；至少一个非作者维护者发生主动二次使用。

### 8.3 30 / 60 / 90 天推演

**Day 0–30：公开身份与核心可信**

1. 确定 scoped/唯一包名；
2. 固化并公开当前候选基线，停止把未提交工作区当成已交付；
3. 修复四项主要真实性债务和新手契约；
4. 拆分 public default、strict overlay、maintainer/evaluation overlay；
5. 让最终 public-default 在本地候选 tarball 中完成有效场景；Day 60 硬门槛在 alpha 文档中如实标为未完成；
6. 使用 `alpha`/`next` tag 发布首个 0.x prerelease，随后立即完成精确版本 registry smoke；smoke 失败则不公告、不晋级并标记 deprecated。

**Day 31–60：支持声明可信**

1. 在发布 SHA 上取得三平台 Node20 run ID 和 evidence；
2. 完成 registry A→B 升级、冲突保留和恢复；
3. 完成真实 Claude matcher dispatch；
4. 将每项公开支持声明绑定到可复现证据；
5. 任一硬门槛不能通过则停止公共路线并降回个人路线；optional/experimental 只描述 default 暴露方式，不替代路线证据。

**Day 61–90：验证采用而非安装演示**

1. 至少两个真实项目形成闭环观察，其中至少一个由独立维护者操作；
2. 所有实际出现的成功、暂停、弃用和失败都作为有效数据；首轮失败的项目不因缺少第二次任务而被排除；
3. 记录作者协助成本和支持请求；
4. 至少一个非作者维护者发生主动二次使用，才进入 stable 决策。

现有“JS/Python/monorepo × 两周期 × 14–28 天”不是逻辑上的发布前提。真实使用是必要的，但实验结构应服务风险，而不是为了完成数字制造需求。

### 8.4 停止或降级条件

- Day 30 仍没有受控包名，或版本链不一致：停止公共 npm 路线；
- registry 安装后任一默认命令不能完成文档规定的有效场景、不能返回预期领域错误，或发生缺文件/缺依赖/崩溃：不得公告或晋级；
- Day 60 三平台不能在发布 SHA 上通过：停止公共路线并降回个人路线；
- 升级覆盖用户文件、备份或 restore 失败：阻断公开发布；Day 60 仍未通过则降回个人路线；
- 真实 matcher 无法复现：不得晋级 beta；Day 60 仍未通过则降回个人路线，即使 Hook 对用户保持可选；
- Day 90 没有独立维护者主动二次使用：不进入稳定版，回到个人精简路线；
- 维护者不愿长期承担 C3 级分发、平台、上游兼容和恢复支持：公共路线在产品定义上不成立。

### 8.5 成本边界

- **C2** 的 maintainer/evaluation 工作每次发布都要重复：profile、命令、包、升级 fixture、证据与文档；
- **C3** 是不可一次性“做完”的责任：包身份、版本链、三平台、Claude 变化、外部用户支持和数据恢复；
- 即使 public default 很精简，源仓库和发布流程仍会比个人路线更重；若不接受这项长期成本，不能用一次 alpha 发布假装路线已经成立。

## 9. 二元决策规则

按顺序回答：

1. 未来 90 天是否愿意持续承担包身份、版本、三平台、Claude adapter 和外部升级恢复支持？
   - 否：选择个人精简工具。
2. Day 30 是否取得受控包名，并完成真实性债务，使最终 public-default 的有效场景达到 E3？
   - 否：选择个人精简工具。
3. Day 60 是否同时取得发布 SHA 的三平台 Node20、registry A→B 升级恢复和真实 matcher 证据？
   - 否：选择个人精简工具。
4. Day 90 是否至少出现一个非作者维护者的主动二次使用？
   - 否：公共路线不得进入稳定版，主线回到个人精简工具。
5. 以上均为是：公共脚手架产品可以成为主线。

这套规则不允许长期维持“公共 README 承诺 + 本地候选证据”的中间状态。

## 10. 路线选择后的 REQ 拆分输入

本报告不直接实施下列事项。路线确定后，按依赖拆成独立 REQ。

### 两条路线共同

1. REQ 必填章节 fail-closed；
2. 状态语义、更新时间和暂停列表统一；
3. 路线最终保留的 target alias 运行闭环与安装成功语义；
4. functional-core profile 与 CLI/Hook 依赖拆分；
5. 首次路径提前披露 complete 的真实门槛。

### 仅个人路线

1. 轻量/strict 两级完成契约；
2. 两项目四任务观察；
3. 未消费能力归档评估。

### 仅公共路线

1. scoped 包身份与版本/发布状态机；
2. registry 精确版本 smoke；
3. 发布 SHA 三平台 Node20 与真实 matcher；
4. registry A→B 升级恢复；
5. 无幸存者偏差的外部采用观察。

## 11. 独立视角复核

### 新手视角

- 最大负担不是包体，而是选择、概念和隐藏门槛；
- `core-only` 不可完成一次 REQ，default 又一次暴露 19 个命令；
- “单文件小改动不用 REQ”和基础 Hook 实际硬阻断相冲突；
- complete 的 review/QA/experience 要求出现得太晚；
- 新手最依赖门禁和状态替自己兜底，因此 fail-open 和错误恢复优先级高于高级能力。

### 发布维护视角

- 当前两种公开 npx 写法都不可用，且包身份存在供应链信任风险；
- 本地 tarball E3 不能替代 registry E4；
- package/tag/release/npm/SHA 必须形成一条不可歧义版本链；
- 三平台、真实 matcher、升级恢复和外部支持都是持续 C3 成本；
- 公共默认也应该精简，CI、Pilot、matcher evidence 属维护者职责。

### 保留的争议

- `experience` 对长期沉淀可能有价值，但当前又是 complete 的硬依赖；在修改完成契约前，不能一边称它可选、一边用门禁强制。
- SessionStart 的非阻断状态展示适合进入个人默认，但打开会话不得改变“最后工作时间”；PreToolUse 硬阻断应独立选择。
- 公共路线可以扩大价值，但不会让源码仓库更简单；它是一份长期产品运营责任，不是个人路线的自然升级版。

## 12. 条件性建议

基于截至 2026-07-16 的证据，建议按**个人精简工具**作为当前主线，先验证“是否真的会主动重复使用”，同时只修两条路线共同依赖的真实性债务。

公共脚手架路线不是被永久否决，而是处于有门槛的候选状态。只有同时满足以下条件才建议转为主线：

- 维护者明确接受未来 90 天及之后的 C3 责任；
- 分发身份和版本链受控；
- 默认命令装完即可运行；
- 对外平台/Hook/升级承诺均有对应证据；
- 至少一个独立维护者发生主动二次使用。

在此之前，继续增加高级治理功能不会解决产品的主要风险，反而会扩大默认认知表面。

## 13. 验收核对

- [x] 13 类实质性对外承诺均进入矩阵。
- [x] 每一项都有当前表面、证据、缺口、失败后果和维护成本。
- [x] 19 个目标命令全部归类并在干净 default fixture 中逐项检查。
- [x] core、default、core+hook 均实际安装并记录表面积。
- [x] npm registry、公开 package、公开 README、公开 workflow 和 Actions 状态重新核对。
- [x] REQ-096/097 的实现完成度与产品必要性分开处理。
- [x] 新手与公共发布维护者进行了独立复核，争议没有被平均掉。
- [x] 两条路线均包含目标用户、默认面、30/60/90 天节奏、证据门槛和停止条件。
- [x] 路线建议由明确的是/否条件产生，不要求读者补充产品决策。

## 参考证据

### 本仓库

- [README](../../README.md)
- [AGENTS](../../AGENTS.md)
- [产品概览](../../context/business/product-overview.md)
- [能力清单](../../scripts/capability-manifest.mjs)
- [安装器](../../scripts/harness-install.mjs)
- [REQ 验证器](../../scripts/req-validation.mjs)
- [REQ CLI](../../scripts/req-cli.mjs)
- [SessionStart](../../scripts/session-start.js)
- [事件账本](../../scripts/event-store.mjs)
- [CI 编排](../../scripts/ci-verify.mjs)
- [Pilot collector](../../scripts/pilot-observation.mjs)
- [REQ-096](../../requirements/in-progress/REQ-2026-096-p1-cross-platform-ci-claude-matcher-smoke.md)
- [REQ-097](../../requirements/in-progress/REQ-2026-097-p1-three-external-project-pilots.md)
- [REQ-089 Ship](../../requirements/reports/REQ-2026-089-ship.md)
- [REQ-091 QA](../../requirements/reports/REQ-2026-091-qa.md)
- [REQ-094 QA](../../requirements/reports/REQ-2026-094-qa.md)

### 公开状态（2026-07-16 核对）

- [npm registry：harness-lab@1.2.0 固定版本](https://registry.npmjs.org/harness-lab/1.2.0)
- [npm registry：harness-install/latest（2026-07-16 返回 404；该指针可变）](https://registry.npmjs.org/harness-install/latest)
- [公开 README：固定提交 97f8552](https://raw.githubusercontent.com/Joe-rq/harness-lab/97f85527e1ba6fcbb4a2838c631a000ed33b8249/README.md)
- [公开 package.json：固定提交 97f8552](https://raw.githubusercontent.com/Joe-rq/harness-lab/97f85527e1ba6fcbb4a2838c631a000ed33b8249/package.json)
- [公开 workflow：固定提交 97f8552](https://raw.githubusercontent.com/Joe-rq/harness-lab/97f85527e1ba6fcbb4a2838c631a000ed33b8249/.github/workflows/governance.yml)
- [公开 Actions run #75](https://github.com/Joe-rq/harness-lab/actions/runs/27957330720)
- [公开 Tags](https://github.com/Joe-rq/harness-lab/tags)
- [公开 Releases](https://github.com/Joe-rq/harness-lab/releases)
