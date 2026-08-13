# REQ-2026-094: P1 安全升级 v1

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 installer 通过 skip-existing 保护已有文件，但它既不知道哪些文件由 Harness Lab 管理，也不能把旧的未修改治理文件升级到新版本。重复安装不是升级：新能力无法可靠下发，用户修改与模板旧版本无法区分，也没有备份、冲突清单和恢复入口。

P1 评审明确要求先做克制的安全升级 v1：版本标记、备份、只更新未修改受管文件、冲突报告；不预先实现自动三方合并。REQ-092/093 已提供 capability manifest 与确定性 profile，本 REQ 在其上增加 ownership baseline 和显式 upgrade/restore。

## 目标
- 让新安装生成 ownership/version baseline，并让旧安装可只读推断 profile 后进入安全升级。
- 提供显式 `--upgrade` dry-run/apply：只更新相对 baseline 未修改的受管文件，新文件可安全加入，用户修改一律保留并报告冲突。
- 每次实际变更前生成可恢复备份，并提供 `--restore <backup-id>`；失败时自动恢复。
- 用 adversarial fixtures 覆盖用户修改、legacy、active REQ、路径逃逸、部分失败与幂等。

## 非目标
- 不做自动三方内容合并、交互式冲突编辑或删除上游已移除文件。
- 不覆盖目标 `package.json`、`.claude/settings.local.json`、progress/events/session、业务文件或历史 REQ。
- 不实现跨进程并发锁、多用户权限或远程版本下载；source 仍由当前包或 `--source` 提供。
- 不修改状态语义/worktree/CI/pilot。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（upgrade 引擎、installer/doctor/manifest、tests/docs 与交付物构成一个数据安全原子变更）
- [x] 涉及模块/目录 ≤ 4？（upgrade engine、installer/profile、diagnostics/tests、docs）
- [x] 能否用一句话描述"解决了什么问题"？（让旧治理文件可升级而不覆盖用户改动或运行状态）
- [x] 如果失败，能否干净回滚？（写前备份、自动恢复、显式 restore；不迁移业务数据）

## 范围
- 新增：`scripts/managed-upgrade.mjs`
- 修改：`scripts/capability-manifest.mjs`、`scripts/harness-install.mjs`、`scripts/harness-doctor.mjs`
- 修改：`tests/governance.test.mjs`、`README.md`、由 manifest sync 的 `package.json`
- 交付：本 REQ design/ADR/review/QA/ship/experience

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation

**允许（CAN）**：
- 仅上述实现、测试、公开说明与交付物。

**禁止（CANNOT）**：
- 不可修改：REQ lifecycle/event-store/worktree/Hook policy/CI/用户 session 数据。
- 不可引入：第三方依赖、网络下载、隐式 upgrade、publish/push/commit、自动合并冲突。

**边界条件**：
- 仅 capability manifest 中目标 profile 的 module files 属于受管候选；生成状态和业务文件永不纳入。
- upgrade 必须显式；dry-run 零写入；无有效 profile/ownership 时只能安全推断/采用精确同内容文件，未知已有内容视为冲突。
- 所有目标路径必须为安全仓库相对路径且不得经 symlink 逃逸。
- 冲突不是命令崩溃：保留文件、报告非零冲突计数和未完成版本；结构错误/备份失败才拒绝写入。

## 验收标准
- [x] fresh/reinstall 写合法 `.harness/ownership.json`，包含 source version、profile/module、逐文件 SHA-256；只认领与 source 精确相同或已有 baseline 的受管文件。
- [x] `--upgrade --dry-run` 与 apply 使用同一 plan；unmodified/update、new/adopt、modified/conflict、stale/no-delete 分类确定且报告精确。
- [x] apply 写前备份所有将改文件及 ownership/profile/report；成功写新 baseline，写失败自动恢复；`--restore <id>` 可人工恢复且支持 dry-run。
- [x] legacy 无 record 时只读推断 profile；未知已有文件不覆盖；active REQ、progress、events、settings.local、package 和业务文件字节不变。
- [x] 非法 ownership/profile、source 缺文件、hash/path/symlink 逃逸、非法 backup id 在写前失败。
- [x] doctor 定位 ownership 缺失/非法/mixed version，README 说明 upgrade/冲突/恢复语义。
- [x] fixtures 覆盖 fresh、future upgrade、legacy、用户修改、冲突、幂等、restore、自动回滚、dry-run 零写入及 packed bin。
- [x] 完整 tests、capability/docs/governance/doctor/pack/fresh install 全部通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-094-design.md`（Feature 建议创建设计文档）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-094-code-review.md`
- QA：`requirements/reports/REQ-2026-094-qa.md`
- Ship：`requirements/reports/REQ-2026-094-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划：Node syntax、upgrade fixture tests、`npm test`、capability/docs/governance/doctor、pack/fresh install。
- 环境：Node 20+、git/npm、本地临时 fixture，无网络。
- 人工：逐项检查 dry-run/apply report、backup 内容、用户修改与 active 状态字节保持、restore 后哈希。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：功能是否完整实现？是否覆盖了核心场景？
- [x] 旧功能保护：新功能是否破坏了现有功能？
- [x] 逻辑正确性：边界情况是否处理？错误处理是否完备？
- [x] 完整性：是否有遗漏的子功能？
- [x] 可维护性：代码是否清晰？接口是否合理？

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现是否服务于最初的用户痛点？
- [x] 设计对齐：实现是否符合设计文档？
- [x] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：ownership 误认领导致覆盖；只认领 source 精确匹配或已有可信 baseline，并以冲突优先。
- 风险：中途写失败；先完成备份，逐文件原子替换，catch 后自动 restore。
- 回滚方式：目标项目运行 `harness-install --restore <backup-id>`；模板仓库整体回退 upgrade engine/installer/manifest/doctor/docs/tests。

## 关键决策
- 2026-07-11：P1 只做 hash-based 三方分类，不自动合并文件内容。
- 2026-07-11：冲突保留用户文件并允许其他安全文件升级；complete version 仅在零冲突时推进。
- 2026-07-11：备份属于目标项目运行态，放 `.harness/backups/` 并加入 installer ignore；ownership/profile 保持可审阅。
- 2026-07-11：core/default upgrade 按新 manifest 重算 modules；custom profile 保留显式选择。
- 2026-07-11：backup payload 带 SHA-256；restore 失败时回到 restore 前内存快照。
- 2026-07-11：退出码 0=无冲突、2=冲突已保留、1=结构/路径/写入错误。

<!-- Source file: REQ-2026-094-p1-safe-upgrade-v1.md -->
