# REQ-2026-011: Governance self-check and installer parity fixes

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
2026-03-29 的治理增强提交把方向推对了，但当前仓库头部状态出现了几处回归：

- `README.md` 与 `CLAUDE.md` 的精简调整让 `npm run docs:verify` 和 `npm run check:governance` 失效
- `scripts/harness-install.mjs` 宣称目标项目会具备 `check:governance` 等能力，但实际没有复制对应脚本
- 安装器写入的 hook 结构与 `.claude/settings.example.json` 的契约不一致，存在配置不生效风险

这些问题的共同点不是“功能缺失”，而是治理入口、治理脚本和接入产物不再描述同一个事实。需要把它们重新拉回一条真实可验证的链路。

## 目标
- 恢复模板仓库自身的 `docs:verify` / `check:governance` 通过状态
- 修复安装器与治理契约的偏差，让目标项目拿到与说明一致的治理骨架
- 保持治理检查严格，不通过降低门槛来掩盖真实回归

## 非目标
- 不新增新的治理能力或安装特性
- 不改动 REQ 生命周期模型
- 不引入第三方依赖或新的运行时要求

## 范围
- 涉及目录 / 模块：`scripts/`, `README.md`, `CLAUDE.md`, `.claude/commands/`, `requirements/`, `docs/plans/`
- 影响接口 / 页面 / 脚本：`scripts/harness-install.mjs`, `/harness-setup`, `npm run docs:verify`, `npm run check:governance`

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：安装器、入口文档、治理自检脚本相关说明、REQ 与报告文件
- 可新增的测试 / 脚本：临时安装验证目录和报告文件

**禁止（CANNOT）**：
- 不可通过删除治理检查或放宽断言来“假通过”
- 不可引入新的 npm 依赖或跳过真实命令验证

**边界条件**：
- 时间 / 环境 / 数据约束：需在本仓库内完成真实命令验证，并在临时 Git 仓库里验证安装器
- 改动规模或发布边界：仅修复治理模板与安装路径一致性，不涉及业务运行时代码

## 验收标准
- [x] `npm run docs:verify` 在当前仓库通过
- [x] `npm run check:governance` 在当前仓库通过
- [x] `scripts/harness-install.mjs --defaults --with-hook` 为目标项目复制必需治理脚本，并写出与示例一致的 hook 结构
- [x] `README.md`、`CLAUDE.md`、`/harness-setup` 对安装和治理自检的说明保持一致

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-011-design.md`
- 相关规范：`AGENTS.md`, `CLAUDE.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-011-code-review.md`
- QA：`requirements/reports/REQ-2026-011-qa.md`
- Ship：不适用（治理模板修复，无独立发布动作）

## 验证计划
- 计划执行的命令：
  - `npm run docs:verify`
  - `npm run check:governance`
  - `node scripts/harness-install.mjs --defaults --with-hook`（在临时 Git 仓库中）
- 需要的环境：Node.js、Git、本地可写临时目录
- 需要的人工验证：检查安装产物和 `.claude/settings.local.json` 结构

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：如果只为了通过检查而写入低质量说明，会削弱入口文档可读性
- 回滚方式：逐文件回退本次修复提交，恢复到修复前状态

## 关键决策
- 2026-03-29：由 `req:create` 自动生成骨架，待补充具体内容
- 2026-03-29：优先修复契约一致性，而不是放宽治理检查本身

<!-- Source file: REQ-2026-011-governance-self-check-installer-parity-fixes.md -->
