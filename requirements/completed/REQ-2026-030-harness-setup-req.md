# REQ-2026-030: 修复 harness-setup 移植时污染目标项目的 REQ 数据

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

`harness-setup` Skill 在将框架移植到新项目时，会将 `requirements/` 目录下的所有内容原封不动复制过去，包括：

1. `completed/` 目录中的 22 个框架内部 REQ（REQ-2026-001 到 REQ-2026-022）
2. `INDEX.md` 中记录的框架历史 REQ 列表
3. `reports/` 目录中的框架执行报告

这导致新项目被污染：
- REQ 编号从 023 开始，而非 001
- 索引文件中充斥着与业务无关的框架历史
- 报告目录包含大量无用的历史数据

用户期望移植的是**框架机制**，而非**框架数据**。

## 目标

- `harness-setup` 在安装时清理框架自身的 REQ 数据
- 新项目的 `completed/` 目录为空（仅保留 `.gitkeep`）
- 新项目的 `INDEX.md` 重置为初始状态（无"最近完成"列表）
- 新项目的 `reports/` 目录为空（仅保留 `.gitkeep`）
- 保留 `REQ_TEMPLATE.md` 和示例 REQ（900+ 编号）作为参考

## 非目标

- 不修改 REQ 的编号规则
- 不修改 REQ 文件的格式或模板
- 不影响现有项目的 REQ 数据

## 范围
- 涉及目录 / 模块：`CLAUDE.md`（skill 定义）、`skills/harness-setup/`
- 影响接口 / 页面 / 脚本：`harness-setup` Skill 的安装逻辑

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（安装逻辑修复，无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：`CLAUDE.md` 中的 skill 定义
- 可新增的测试 / 脚本：可选的验证测试

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：REQ 文件模板、其他 skill 定义
- 不可引入的依赖 / 操作：无

**边界条件**：
- 改动仅限于 `harness-setup` 的安装逻辑
- 不影响现有项目的 REQ 数据

## 验收标准
- [ ] `harness-setup` 安装后，目标项目的 `requirements/completed/` 目录为空（只有 `.gitkeep`）
- [ ] `harness-setup` 安装后，目标项目的 `requirements/INDEX.md` 不包含任何 REQ-2026-00x 或 REQ-2026-01x 的历史记录
- [ ] `harness-setup` 安装后，目标项目的 `requirements/reports/` 目录为空（只有 `.gitkeep`）
- [ ] `harness-setup` 安装后，目标项目的 `requirements/in-progress/` 只包含示例 REQ（900+ 编号）
- [ ] 在干净目录测试 `harness-setup`，确认 REQ 编号从 001 开始

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-030-design.md`
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-030-code-review.md`
- QA：`requirements/reports/REQ-2026-030-qa.md`
- Ship：`requirements/reports/REQ-2026-030-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - 在临时目录运行 `harness-setup`
  - 检查 `requirements/completed/` 是否为空
  - 检查 `requirements/INDEX.md` 是否已重置
  - 检查 `requirements/reports/` 是否为空
  - 运行 `npm run req:create -- --title test` 验证编号是否从 001 开始
- 需要的环境：干净的临时目录
- 需要的人工验证：确认安装后的目录结构符合预期

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
- 回滚方式：

## 关键决策
- 2026-04-01：由 `req:create` 自动生成骨架，待补充具体内容

<!-- Source file: REQ-2026-030-harness-setup-req.md -->
