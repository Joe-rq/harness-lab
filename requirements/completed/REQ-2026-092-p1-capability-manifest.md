# REQ-2026-092: P1 最小 capability manifest 单一事实源

## 状态
- 当前状态：completed
- 当前阶段：ship

## 背景
P0 已闭合分发、安装、路径门禁和用户文档，但模块文件、目标 package scripts、profile 组合、doctor 期望和测试契约仍散落在 installer、doctor、package.json 与 tests 中。新增能力需要同步修改多份列表，任何一份遗漏都可能再次产生“源码能跑、安装包缺文件、doctor 误报或测试自洽绿灯”。原全景评审将最小 capability manifest 列为首项 P1，并要求删除重复 command map，让能力增删只维护一个权威来源。

## 目标
- 建立经过运行时校验的 ESM capability manifest，统一模块文件、目标 scripts、安装 profile、Hook overlay 与 doctor 基础期望。
- 让 installer 和 doctor 直接消费 manifest，删除各自重复的能力/命令事实。
- 把 npm `files` 变成由 manifest 可检查、可生成的派生产物，漂移时门禁失败。
- 重构契约测试，使其消费 manifest，同时保留独立语义能力断言防止自举式绿灯。

## 非目标
- 不在本 REQ 实现完整 mode × hook 风险矩阵或 profile-aware doctor 诊断；REQ-093 承接。
- 不实现安装升级/所有权/备份；REQ-094 承接。
- 不修改 REQ/event-store/worktree 状态语义或 CI 平台矩阵。
- 不引入 JSON Schema、构建框架或第三方依赖。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（7 个实现/文档文件；manifest 必须同时替换两个消费者、npm 派生边界和独立契约测试，否则会产生双源过渡态，记录为架构原子例外）
- [x] 涉及模块/目录 ≤ 4？（manifest、installer/doctor、package 派生、测试/README）
- [x] 能否用一句话描述“解决了什么问题”？（让能力文件、命令、profile 和诊断期望只有一个权威来源）
- [x] 如果失败，能否干净回滚？（无用户数据迁移，恢复原常量与 package files 即可）

## 范围
- 涉及文件：
  - `scripts/capability-manifest.mjs`（新增）
  - `scripts/capability-sync.mjs`（新增）
  - `scripts/harness-install.mjs`
  - `scripts/harness-doctor.mjs`
  - `package.json`
  - `tests/governance.test.mjs`
  - `README.md`
- 涉及目录 / 模块：能力模型、安装器、doctor、npm 分发/契约测试
- 影响接口 / 页面 / 脚本：`harness-install` 内部导出兼容；新增 `capabilities:check/sync`；无 UI

### 约束（Scope Control）

**豁免项**：
- [ ] skip-design-validation
- [ ] skip-req-validation
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：仅上述 7 个实现/文档文件与本 REQ design/ADR/review/QA/ship/experience。
- 可新增的测试 / 脚本：新增两个零依赖 manifest/sync 脚本；测试只使用临时 fixture。

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：Hook 行为、REQ CLI、event-store、upgrade 协议、CI workflow、用户 session/worktree 数据。
- 不可引入的依赖 / 操作：不得新增第三方库，不得 publish/push，不得自动覆盖用户目标项目文件。

**边界条件**：
- manifest 加载时必须 fail fast：重复 capability/file/script、未知模块、profile 依赖不闭合或非法路径均拒绝。
- `package.json.files` 是 checked-in 派生物；`--check` 只读，`--write` 只更新该字段且保持其他字段。
- tests 不复制完整 files/scripts map，但保留独立的最低语义 capability ID 与公开命令集合。
- installer 现有导出 `modules` 保持兼容，行为不变。

## 验收标准
- [x] manifest 单一导出模块文件、target package scripts、core/default profile、Hook overlay、doctor 基础期望与发布文件；schema/闭包校验通过。
- [x] installer 删除本地 `modules`/packageScripts command map，直接消费 manifest；fresh/core/core+hook/package-dir 行为不变。
- [x] doctor 的基础 Hook 事件/脚本期望来自 manifest，不再维护独立硬编码列表；完整 profile-aware 诊断明确留给 REQ-093。
- [x] `capability-sync --check` 在 `package.json.files` 漂移时非零退出并给出差异，`--write` 可确定性修复；当前 package files 与 manifest 一致。
- [x] tests 删除完整 `REQUIRED_DEFAULT_TARGET_ASSETS` / `REQUIRED_TARGET_SCRIPTS` 双份 map，改用 manifest，并以独立语义 ID/命令最小集合防止自举遗漏。
- [x] manifest 新增/删除能力只需修改 manifest 并运行 sync；installer/doctor/test 读取同一来源，无第二份手工 command map。
- [x] 真实候选 tarball仍可离线安装并完成公开生命周期，且包含 manifest 运行依赖、不包含 runtime/session 隐私数据。
- [x] `npm test`、`npm run capabilities:check`、`npm run docs:verify`、`npm run check:governance`、doctor 与 pack 检查全部通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-092-design.md`
- ADR：`docs/plans/REQ-2026-092-capability-manifest-adr.md`
- 评审依据：`reviews/harness-lab-review-2026-07-10.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-092-code-review.md`
- QA：`requirements/reports/REQ-2026-092-qa.md`
- Ship：`requirements/reports/REQ-2026-092-ship.md`

## 验证计划
- 计划执行的命令：manifest/sync/installer/doctor/tests 语法检查；capability check；governance suite；完整 npm test；docs/governance/doctor；隔离 cache pack。
- 需要的环境：Node.js 20+、npm、git；无外网和外部服务。
- 需要的人工验证：审阅 manifest 是否只表达稳定能力事实；审阅独立最低契约是否足以捕捉自洽遗漏；比较安装行为前后输出。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：五类能力事实均收敛到 manifest。
- [x] 旧功能保护：所有 profile、package-dir、重装与 packed lifecycle 无回归。
- [x] 逻辑正确性：schema、闭包、派生差异和路径安全 fail fast。
- [x] 完整性：源码、package、installer、doctor、测试、README 同步。
- [x] 可维护性：新增能力路径只改 manifest + 生成派生物。

#### 对齐检查（record 阶段）
- [x] 目标对齐：只做 P1 单一事实源，不混入升级/mode/state。
- [x] 设计对齐：ESM manifest + checked-in derived package files + independent semantic contract。
- [x] 验收标准对齐：每条验收均有静态、运行或 packed 证据。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- `package.json.files` 受 npm 格式约束仍需 checked-in，但不再手工维护；由 sync 生成并由 check 门禁。退出条件：未来正式采用 staging package 且发布/隐私回归证明等价后，移除该派生字段与 sync。

## 风险与回滚
- 风险：manifest 成为过度抽象；仅收纳已存在、跨消费者重复的稳定事实，不引入插件系统。
- 风险：tests 直接消费 manifest 形成自举绿灯；保留语义 capability ID 与公开命令的独立最小集合。
- 风险：sync 改写 package 格式；只替换 `files` 数组并用两空格稳定序列化，测试确定性。
- 回滚方式：恢复 installer/doctor/tests 原常量，删除两个新脚本与 package aliases。

## 关键决策
- 2026-07-11：采用 ESM manifest，消费者无需解析/转换层，Node 20+ 为既有约束。
- 2026-07-11：package files 采用 checked-in 派生物 + check/write，而不是放宽 npm 隐私 allowlist。
- 2026-07-11：保留语义最小契约，拒绝让测试完全由同一 manifest 自证。

<!-- Source file: REQ-2026-092-p1-capability-manifest.md -->
