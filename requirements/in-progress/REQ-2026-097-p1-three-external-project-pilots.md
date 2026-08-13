# REQ-2026-097: P1 三类外部项目 Pilot

## 状态
- 当前状态：blocked
- 当前阶段：implementation

## 背景
Harness Lab 的内部 dogfooding 很强，但不能证明外部采用。P1 要求 JavaScript、Python、monorepo 三类外部项目各完成至少两个真实 REQ 周期，并观察 2–4 周，记录首个 REQ 用时、跨会话恢复耗时、误拦/漏拦、豁免率与重复使用。fixture 或在 Harness Lab 自己仓库创建 REQ 都不能替代外部 pilot。

本机只读盘点发现多个候选项目，但它们属于用户的其他工作区；“完成 P1”不自动授权修改任意候选，也不能替候选项目编造两项业务需求。先建立可审计的 pilot 协议、指标口径与候选适配报告，再由用户确认项目和真实任务。

## 目标
- 定义三类 pilot 的纳入/退出标准、指标字典、证据分层与隐私边界。
- 提供零依赖 pilot observation CLI，记录 started/cycle/recovery/incident/exemption/repeat-use 事件并生成确定性汇总。
- 对候选项目只读预检，明确技术栈、真实验证命令、脏工作区/既有治理冲突与推荐顺序。
- 在用户授权后完成 3×2 个真实 REQ 周期与 14–28 天观察，形成跨项目结论。

## 非目标
- 不把临时 fixture、教学 demo 或 Harness Lab 自身算作外部 pilot。
- 不擅自给外部项目选业务需求、清理脏改动、commit/push/publish。
- 不采集代码内容、环境变量、提示词或绝对本机路径；只记录治理事件与聚合指标。
- 不因 pilot 数量小就外推市场规模、团队协作能力或统计显著性。

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [ ] 涉及文件数 ≤ 4？（协议、collector、tests、三项目证据与 REQ 交付物必须同步）
- [x] 涉及模块/目录 ≤ 4？（pilot protocol、metrics CLI、tests、evidence/reports）
- [x] 能否用一句话描述"解决了什么问题"？（把外部采用从印象判断变成三类项目、六个真实周期的可审计证据）
- [x] 如果失败，能否干净回滚？（collector 为附加能力，pilot 数据在外部项目本地，可撤下且不改业务状态）

## 范围
- 新增：`scripts/pilot-observation.mjs`、`docs/pilots/README.md`、`docs/pilots/PILOT_TEMPLATE.md`
- 修改：`scripts/capability-manifest.mjs`、`package.json`、`tests/governance.test.mjs`、`README.md`、testing strategy
- 新增：三个经过脱敏的 pilot evidence/report；外部项目内安装产物与两轮真实 REQ 交付物须单独授权

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 在本仓库实现协议、CLI、契约测试和只读候选报告。
- 获用户逐项目授权后，按安全 installer 流程接入候选并记录 observation；保留所有既有修改。

**禁止（CANNOT）**：
- 未授权前不可写 `/Users/qrq/AI/code/02-work/` 下其他项目。
- 不引入外部 analytics/SaaS，不上传原始事件，不自动 commit/push，不清理候选脏工作区。

**边界条件**：
- 每个 pilot 观察窗最少 14 天、最多 28 天；每类至少 2 个由项目真实目标驱动并完成 review/QA 的 REQ。
- 相同维护者的三个本机项目只能验证跨技术栈适配，不能等价于三个独立用户；结论必须注明样本相关性。

## 验收标准
- [x] 协议固定 project type、真实周期、观察窗、指标公式、事件证据、隐私与退出标准；模板不含占位绿灯。
- [x] observation CLI 的 init/record/summary/validate 幂等或 append-only，拒绝非法时间顺序、未知事件、路径/代码内容字段和不完整周期。
- [ ] JS/Python/monorepo 各有授权项目与 baseline，真实验证命令可执行，安装/升级不覆盖既有状态或用户改动。
- [ ] 每项目至少 2 个 completed REQ，含真实业务目标、review、QA 与项目验证证据；fixture/治理自测不计数。
- [ ] 每项目观察 14–28 天，首个 REQ、恢复、误拦/漏拦、豁免、repeat-use 指标有原始 observation 与脱敏 summary。
- [ ] 三项目报告明确共同问题、技术栈特有问题、样本限制与 P2 go/no-go；完整仓库门禁通过。

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-097-design.md`（Feature 建议创建设计文档）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-097-code-review.md`
- QA：`requirements/reports/REQ-2026-097-qa.md`
- Ship：`requirements/reports/REQ-2026-097-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 本仓库：collector contract/adversarial tests、`npm test`、capability/docs/governance/doctor/pack。
- 外部项目：先只读发现各自 lint/test/build/verify，再由 pilot REQ 固定；不套用 npm 命令到 Python。
- 人工：维护者为 false-block/false-miss 做事后分类，确认业务 REQ 真实性、恢复起止点和 repeat-use 意图。

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现：功能是否完整实现？是否覆盖了核心场景？
- [ ] 旧功能保护：新功能是否破坏了现有功能？
- [ ] 逻辑正确性：边界情况是否处理？错误处理是否完备？
- [ ] 完整性：是否有遗漏的子功能？
- [ ] 可维护性：代码是否清晰？接口是否合理？

#### 对齐检查（record 阶段）
- [ ] 目标对齐：实现是否服务于最初的用户痛点？
- [ ] 设计对齐：实现是否符合设计文档？
- [ ] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：三个外部项目尚未逐项授权，六个真实业务任务未确认，且观察窗至少 14 天
- 恢复条件：确认三个项目与每项目两个真实待办并授权写入
- 下一步：逐项目 dry-run、baseline、observation init，完成两轮 REQ 后观察 14-28 天

## 临时实现与债务
- 无

## 风险与回滚
- 风险：同一用户三项目产生选择偏差；报告不外推独立用户留存，后续再招募外部维护者。
- 风险：为了完成指标制造“假需求”；纳入标准要求项目既有目标、实际变更与独立 QA 证据。
- 风险：观察日志泄漏路径/代码；schema 使用匿名 project id 和枚举，不接受任意 payload。
- 回滚：停止 observation、移除 collector/publication；外部项目通过 REQ-094 backup restore 或接入基线反向 diff 恢复，不删除其 REQ 历史。

## 关键决策
- 2026-07-12：同一维护者三项目是“跨技术栈适配 pilot”，不是独立用户市场验证。
- 2026-07-12：两轮必须是真实业务 REQ；安装验证、文档自测、fixture 不计入 2 cycles。
- 2026-07-12：raw observation 留在各项目，Harness Lab 只接收脱敏 summary 与必要证据引用。

<!-- Source file: REQ-2026-097-p1-three-external-project-pilots.md -->
