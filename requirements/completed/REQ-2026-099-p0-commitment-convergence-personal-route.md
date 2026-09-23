# REQ-2026-099: P0 对外承诺收敛（个人路线）

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

`docs/plans/2026-09-23-route-decision-personal-slim-tool.md` 已把主线定为个人精简工具：2026-07-16 报告的 §9 五问逐条为否——受控包名未取得、D2/D3/D5 债务未修、三平台含 Windows 失败、无外部用户样本。报告 §5 矩阵 B 的"个人精简工具默认"列要求三处收敛：**P02 撤下 npm 入口、P12 暂停三平台与真实 matcher 承诺、P03 版本声明只写实际验证过的环境**。

当前 README 仍在做被撤下的承诺，且两条已知为假：

1. `README.md:60-63` 与 `131-132`、`142` 仍写 `npx --yes --package=harness-lab harness-install ...`。而 route 报告的 D1 证据（E4 反证）显示：registry 的 `harness-lab@1.2.0` 属 `hgflima/harness-lab`，bin 只有 `harness-lab`、没有 `harness-install`——这条命令**装不到本项目**。
2. `README.md:77` 声明"目标支持 Windows、macOS、Linux"、`README.md` 平台段声明三平台 matrix。实测（run `35858281776`、`31672675613`，两次提交同一组）：ubuntu ✓、macos ✓、**windows ✗**，4 项失败（`spawnSync npm.cmd EINVAL`×2、`spawn claude ENOENT`×1、worktree deep-equal×1）。该红已存在一个多月，期间无人发现——**承诺与守卫脱节**。

同时 REQ-2026-096/097 的状态仍为 `blocked`（= 待补的欠账），而路线决策已把它们判为"个人路线下非必须"（报告 §2.4）：096 暂停三平台与 matcher 承诺；097 的原方案（三技术栈 × 两周期 × 14–28 天）非必须，改用两个自有项目的轻量观察。状态不改，下个会话会把它们当欠账去补。

## 目标

- 撤下两条已知为假的公开承诺：npm 入口改为本地 tarball / 源码路径；三平台声明降级为"已实测环境 + 已知失败"，并保留证据 run ID。
- 把 REQ-2026-096 / REQ-2026-097 从 `blocked` 转为 `suspended`，写明个人路线下的处置与恢复条件。
- 让 README 的承诺与 `package.json` 实际能力、CI 实际结果三者一致，消除"承诺大于证据"的表述。

## 非目标

- 不修 Windows 的 4 项失败（承诺撤下后不再是发布阻断项；是否作为 CI 卫生单独修，属另一个决定）。
- 不删除 096/097 的实现（`ci-verify.mjs`、`claude-matcher-smoke.mjs`、`pilot-observation.mjs` 保留在源码与 capability manifest 中）。
- 不改 `package.json` 的 `engines`、`files`、`version`；不发包、不打 tag、不动 registry。
- 不做 functional-core 拆分、不改 complete 门槛（属路线决策的后续 REQ）。

## 颗粒度自检

- [x] 目标数 ≤ 4？（3 个目标）
- [ ] 涉及文件数 ≤ 4？（实测为 6：`README.md` + 两个发布资产 + `tests/governance.test.mjs` + 两份 REQ 状态。发布资产是在实施扫描中发现的——**同一个假承诺出现在三处**，其中两处随包发布、是用户安装时 agent 直接读的资产；测试文件是**守卫**：`tests/governance.test.mjs:1164` 与 `:2654` 把旧 npx 写法写成"必须存在"的短语，改承诺就必须同步改守卫，否则门禁红）
- [x] 涉及模块/目录 ≤ 4？（根级 README、发布资产、测试契约、requirements/in-progress）
- [x] 能否用一句话描述"解决了什么问题"？（让对外承诺与已有证据一致，并停止把路线已暂停的 REQ 当欠账）
- [x] 如果失败，能否干净回滚？（纯文档改动，`git revert` 即可；无代码、无数据、无外部副作用）

## 范围

- 涉及文件：
  - `README.md`
  - `.agents/skills/source-command-harness-setup/SKILL.md`
  - `.claude/commands/harness-setup.md`
  - `tests/governance.test.mjs`（仅两处短语契约：`testInstallerDeclaredSourcesExistAndArgsAreStrict` 的 README 映射断言、`testHarnessSetupCommandSkillAndBinStayAligned` 的必需/禁用短语表）
  - `requirements/in-progress/REQ-2026-096-p1-cross-platform-ci-claude-matcher-smoke.md`
  - `requirements/in-progress/REQ-2026-097-p1-three-external-project-pilots.md`
  - `requirements/in-progress/REQ-2026-099-p0-commitment-convergence-personal-route.md`（本 REQ 自身）
  - `requirements/reports/REQ-2026-099-*.md`（交付报告）
  - `context/experience/REQ-2026-099-*.md`（完成前置的经验文档）
  - `.claude/.req-exempt`（`req:create` 生成，`req:start` 后自动删除）
- 涉及目录 / 模块：根级公开说明、in-progress REQ 生命周期状态
- 影响接口 / 页面 / 脚本：`README.md` 的安装与平台声明段落（无脚本行为变更）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（纯承诺收敛，判据来自已落盘的路线决策文件；另建设计稿会制造重复真相）
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：上述 README 段落与两份 REQ 的状态、阻塞/搁置说明、非目标与关键决策
- 可新增的测试 / 脚本：无（文档改动，不新增测试）

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`scripts/` 目录下的任何文件、`package.json`、`.github/workflows/` 目录下的任何文件、`requirements/INDEX.md`（由 `req:block` / `req:complete` 机器写入）
- 测试：只有"范围"中明确列出的那一处短语契约可以修改；该测试目录下的其他文件一律不动，也不得降低任何断言的强度
- 不可引入的依赖 / 操作：不提 tag、不发 npm、不删 096/097 的实现文件、不改 CI workflow

**边界条件**：
- 时间 / 环境 / 数据约束：文档改动不依赖运行环境；证据引用固定为 run ID，不用可变的 `gh run list` 输出
- 改动规模或发布边界：仅模板仓库自身；对已安装消费方的行为无影响

## 验收标准

- [x] `README.md` 不再出现 `npx --yes --package=harness-lab`（含 upgrade / restore 示例）；包分发段改为本地 tarball 与源码两种路径，并注明"本仓库不发布到公开 registry"
- [x] 两个发布资产（`.agents/skills/source-command-harness-setup/SKILL.md`、`.claude/commands/harness-setup.md`）同样不再出现 `npx --yes --package=harness-lab`；改为与 `npm test` 中 packed-install fixture 一致的 `npm exec --package=<tarball> -- harness-install` 形式
- [x] 两处短语契约测试同步更新且**不降低强度**：必需短语为 `node /path/to/harness-lab/scripts/harness-install.mjs --defaults` 与 `npm exec --yes --package=./harness-lab-<version>.tgz -- harness-install --defaults`；禁用短语新增 `npx --yes --package=harness-lab`（防止旧承诺回流）
- [x] 平台声明段落不再出现"目标支持 Windows、macOS、Linux"这类承诺式表述；改为"已实测环境（macOS + 本机 Node，CI ubuntu ✓ / macos ✓）"并列出 **Windows 4 项失败与 run ID**，明确"Windows 未验证、不作承诺"
- [x] `README.md` 中与 npm 发布相关的表述（"随 npm 包发布"等）改为中性的"随包发布 / 由 capability manifest 声明"，不暗示 registry 可用
- [x] REQ-2026-096 状态为 `suspended`，搁置说明含：个人路线暂停三平台与 matcher 承诺、实现保留在源码、恢复条件（转公共路线或本机需要）；已勾选的验收项保留不删
- [x] REQ-2026-097 状态为 `suspended`，搁置说明含：原方案（三技术栈 × 两周期 × 14–28 天）在个人路线下非必要、改用两个自有项目四任务轻量观察、恢复条件（转公共路线时重写）；已勾选的验收项保留不删
- [x] 四道门禁全绿（`npm test`、`docs:verify`、`check:governance`、`harness:doctor`），且 `req:audit` 保持基线内无 delta

## 设计与实现链接
- 设计稿：不另建；判据来自 `docs/plans/2026-09-23-route-decision-personal-slim-tool.md`（"对既有对外承诺的影响"表）
- 相关规范：`docs/plans/2026-07-harness-lab-product-route-decision.md`（§5 矩阵 B、§2.4）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-099-code-review.md`
- QA：`requirements/reports/REQ-2026-099-qa.md`
- Ship：`requirements/reports/REQ-2026-099-ship.md`

## 验证计划
- 计划执行的命令：
  - `grep -n "npx --yes --package=harness-lab" README.md`（期望：无匹配）
  - `grep -n "目标支持 Windows" README.md`（期望：无匹配）
  - `npm test`、`npm run docs:verify`、`npm run check:governance`、`npm run harness:doctor`、`npm run req:audit`
  - `npm run req:status`（确认 096/097 出现在 suspended 列表、active 只有一个）
- 需要的环境：macOS + Node ≥20（本机）
- 需要的人工验证：逐段读 README 安装与平台声明，确认没有残留的承诺式措辞；确认 096/097 的搁置说明能让人一眼看懂"为什么不做"

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：3 个目标全部达成——两条假承诺已撤下（README + 2 个发布资产 + 2 处守卫），096/097 转 suspended 并写明个人路线下的处置，README 承诺与 `package.json`/CI 实际结果一致。
- [x] 旧功能保护：`npm test` 69 governance + 12 status + 11 audit + 25 event-store 全通过。过程中两处短语契约测试先失败（它们把旧 npx 写法写成"必须存在"）——**这是守卫在强制假承诺**，按"换形式不降强度"处理：必需短语替换为有运行证据的形式，禁用短语新增旧 npx 形式。`state-semantics.mjs:20` 把 blocked/suspended 归为一类，health/doctor 计数与 `req:audit` 基线（125）均无变化。
- [x] 逻辑正确性：README 新写的安装命令取自 `tests/governance.test.mjs` 的 packed-install fixture（每次 `npm test` 从真实 tarball 执行同一 bin，registry 指向不可达端口），不是自造命令。INDEX/ID 编号冲突已登记（099 被本 REQ 占用，门禁升级顺延）。
- [x] 完整性：6 项验收全部完成并有检查命令；未做项一处已显式登记为债务（文件层 suspended 未进事件账本），无半成品。
- [x] 可维护性：删掉三处重复的假命令，换成同一形式的两条路径（源码 / tarball），并把"不能再出现旧 npx 写法"固化为禁用短语，后续不会回流。

#### 对齐检查（record 阶段）
- [x] 目标对齐：直接服务于路线决策 §5 矩阵 B 的 P02/P12 —— 撤下无法兑现的承诺，而不是继续修承诺。
- [x] 设计对齐：无独立设计稿（`skip-design-validation` 已声明）；实现与 6 条关键决策一致，其中 2 条为实施中的范围扩展（发布资产、守卫测试），均已记入决策并说明理由。
- [x] 验收标准对齐：逐条对应实现与验证命令；"平台声明"一条同时覆盖 README 的平台段与安装段的 npm 措辞。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务

- 观察项（**不属本 REQ 交付**）：REQ 文件的 `suspended` 状态没有进入事件账本。`session-start.js` 的「搁置中的 REQ」列表由 `req_blocked` 事件投影而来（`event-store.mjs:513` 把 status 硬编码为 `blocked`），而事件 schema 没有 `req_suspended` 类型；因此 096/097 转为 suspended 后，**启动输出仍会显示 `(blocked / …)`**，只有 `state-semantics.mjs:20`（把 blocked/suspended 归为同一类）与 REQ 文件本身反映了新状态。影响：状态语义在"文件层 vs 事件层"分叉，与 REQ-2026-098 修的同类问题不同层；health/doctor 计数不受影响。
  - 退出条件：后续 REQ 二选一——① 新增 `req_suspended` 事件类型，并提供写入入口；② 让投影对文件层 suspended 做交叉校验并报告不一致。
- 本次未触碰 `scripts/`，因此上述缺口无法在本 REQ 内关闭（范围所限，已记录而不是硬修）。

## 风险与回滚
- 风险：撤下平台承诺后，Windows 用户缺少警示——缓解：在平台段明确写出"Windows 未验证"与已知失败项，而不是静默删除
- 风险：096/097 转 suspended 后被人误读为"已放弃"——缓解：搁置说明写明恢复条件，且实现与 collector 保留在源码
- 回滚方式：`git revert` 本 REQ 提交；同时把两份 REQ 的状态改回 `blocked`

## 关键决策
- 2026-09-23：**撤承诺而不是修承诺**。依据路线决策 §5 P02/P12：个人路线暂停 npm 与三平台承诺；修 Windows 的 4 项失败是另一件事（CI 卫生），不与承诺绑定。
- 2026-09-23：**096/097 用 `suspended` 而不是 `blocked`**。`blocked` 表示"待补的欠账"，`suspended` 表示"已决定不做/暂不做"；路线决策已判定它们在个人路线下非必须（报告 §2.4），继续用 `blocked` 会让下个会话误以为需要补。
- 2026-09-23：**编号冲突登记**——REQ-2026-098 的关键决策曾把"门禁参照升级"预留给 REQ-2026-099，但 `req:create` 的计数器把 099 分配给本 REQ（编号无法预留）。门禁升级改由后续 REQ 承接，已在 `.claude/progress.txt` Next steps 记录。
- 2026-09-23：**范围扩到两个发布资产**（`.agents/skills/source-command-harness-setup/SKILL.md`、`.claude/commands/harness-setup.md`）。实施扫描时发现同一假承诺共三处，其中两处随包发布、且是用户安装时 agent 直接读取的资产——只改 README 等于半个修复。
- 2026-09-23：**README 的安装命令改为 `npm exec --package=<tarball> -- harness-install`**，而不是自造一条新命令。依据：该形式正是 `tests/governance.test.mjs` 的 packed-install fixture 每次 `npm test` 执行的路径（且把 registry 指向不可达端口），是本仓库唯一有运行证据的包安装形式。
- 2026-09-23：**不改 `context/tech/testing-strategy.md`**。该文件第 50 行如实描述 CI matrix，并已写明"每格必须有成功 run identity 才能作为平台通过证据"，属证据门控的事实陈述，不是支持承诺；改它属于扩大范围。
- 2026-09-23：**同步更新 `tests/governance.test.mjs` 的两处短语契约**（`README.md must publish the verified package/bin mapping` 与 harness-setup 三件套对齐测试）。原断言把 `npx --yes --package=harness-lab harness-install --defaults` 写成"必须存在"——**守卫在强制一个已知为假的承诺**。修法是换掉被强制的形式、不降低强度：必需短语改为源码形式与 `npm exec --package=<tarball> --` 形式，并把旧 npx 形式移入禁用短语表。
- 2026-09-23：**短语用 `--defaults` 结尾的行**作为断言锚点，因为断言要求的是"至少存在一条带该形式的命令示例"；三个资产（README / command / skill）当前都同时含源码形式与 tarball 形式，已用行尾锚定的 grep 逐一确认。

<!-- Source file: REQ-2026-099-p0-commitment-convergence-personal-route.md -->
