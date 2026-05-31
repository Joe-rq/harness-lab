# REQ-2026-074: Stage 2: exit confirmation

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：Stage 2 已连续完成事件 schema、真实写入点、progress projection 和 worktree 聚合，但在进入 Stage 3 决策门前，需要一次明确的退出确认，证明 Stage 2 的成功定义已经满足，且没有未收尾的门禁、文档或临时豁免。
业务背景：本 REQ 对应路线图 S2-CP7。它不是新增能力，而是对 REQ-2026-070 到 REQ-2026-073 的交付物和验证证据做收口。

## 目标
- 核对 Stage 2 所有 checkpoint 和对应 REQ 均已完成
- 形成 Stage 2 退出确认报告，列出能力、证据、剩余限制和下一阶段入口
- 更新路线图、progress、README 或经验文档中的收口状态
- 运行完整测试与治理门禁，确认无 current audit 增量

## 非目标
- 不新增事件账本能力
- 不进入 Stage 3 的任务图专项实现
- 不处理 legacy audit baseline
- 不重构历史 REQ 或报告

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [ ] 涉及文件数 ≤ 4？超出：退出确认需要更新 REQ、报告、路线图、progress、README/experience
- [x] 涉及模块/目录 ≤ 4？（docs、requirements、context、.claude）
- [x] 能否用一句话描述"解决了什么问题"？确认 Stage 2 是否可以正式收口并进入 Stage 3 观察/决策门。
- [x] 如果失败，能否干净回滚？可撤销退出报告和路线图勾选，不影响已完成能力

## 范围
- 涉及目录 / 模块：`docs/plans/`、`requirements/`、`requirements/reports/`、`context/experience/`、`.claude/`
- 影响接口 / 页面 / 脚本：无新增代码入口；只运行现有测试和治理命令

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 可修改的文件 / 模块：`docs/plans/multi-agent-roadmap.md`、`.claude/progress.txt`、`README.md`、本 REQ、对应 reports/experience
- 可新增的测试 / 脚本：不新增测试脚本，只运行现有测试

**禁止（CANNOT）**：
- 不可新增 Stage 2 功能
- 不可改变事件 schema、projection 或 aggregation 代码
- 不可进入 Stage 3 实现
- 不可引入新依赖

**边界条件**：
- 退出确认必须引用真实命令结果，不写“看起来通过”
- 如果最终门禁失败，本 REQ 不能完成

## 验收标准
- [x] S2-CP1 到 S2-CP6 均有已完成 REQ、报告和验证证据
- [x] Stage 2 成功定义已满足：事件可追加，progress 可投影重建，多 worktree 可聚合查看
- [x] 路线图勾选 S2-CP7，并把当前阶段推进到 Stage 3 观察/决策门
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance`、`node scripts/req-audit.mjs --all --max-findings 20` 通过
- [x] `.claude/.req-exempt` 不存在，且无 current audit warning 增量

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-074-design.md`（Feature 建议创建设计文档）
- 相关规范：`docs/plans/multi-agent-roadmap.md` §5.6；REQ-2026-070/071/072/073

## 报告链接
- Code Review：`requirements/reports/REQ-2026-074-code-review.md`
- QA：`requirements/reports/REQ-2026-074-qa.md`
- Ship：`requirements/reports/REQ-2026-074-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test`、`npm run docs:verify`、`npm run check:governance`、`node scripts/req-audit.mjs --all --max-findings 20`、`test ! -f .claude/.req-exempt`
- 需要的环境：本仓库
- 需要的人工验证：人工核对 Stage 2 退出报告与路线图勾选一致

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：Stage 2 退出确认报告已落盘。
- [x] 旧功能保护：不改 Stage 2 已实现代码，只验证和记录。
- [x] 逻辑正确性：成功定义、路线图、progress、REQ 索引一致。
- [x] 完整性：S2-CP1 到 S2-CP7 均有证据。
- [x] 可维护性：下一阶段入口清晰。

#### 对齐检查（record 阶段）
- [x] 目标对齐：退出确认服务于“是否继续演进”的路线决策。
- [x] 设计对齐：实现符合 `docs/plans/REQ-2026-074-design.md`。
- [x] 验收标准对齐：所有验收标准均已满足。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：过早宣告 Stage 2 完成；证据缺失；路线图和 progress 不一致
- 回滚方式：撤销 S2-CP7 勾选和退出报告，保留 S2-CP1 到 S2-CP6 产物

## 关键决策
- 2026-05-31：Feature 型 REQ，建议创建设计文档
- 2026-05-31：S2-CP7 只做退出确认，不新增事件账本功能

<!-- Source file: REQ-2026-074-stage-2-exit-confirmation.md -->
