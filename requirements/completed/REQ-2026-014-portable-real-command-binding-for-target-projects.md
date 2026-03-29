# REQ-2026-014: Portable real command binding for target projects

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 Harness Lab 在模板仓库内通过 guard 脚本避免把占位命令误当成真实验证链路，这是安全的；但在接入目标项目时，仍然主要依赖维护者手动绑定 `lint / test / build / verify`。

这带来了明显摩擦：

- 接入后还需要二次手工收尾
- 常见项目明明已经有真实 `lint / test / build`，却没有被自动复用
- 缺失绑定时只有文档提示，没有统一的项目内 guard 和缺口报告

因此，问题不在于 guard 的存在，而在于“接入后真实命令绑定”没有形成自动化辅助路径。

## 目标
- 降低目标项目接入后的真实命令绑定摩擦
- 让安装器自动识别并复用目标项目已有的 `lint / test / build` 脚本
- 在无法自动绑定时，生成统一 placeholder guard 和清晰的缺口报告

## 非目标
- 不尝试猜测非标准脚本名对应的真实语义
- 不覆盖目标项目已经存在的真实脚本
- 不改变模板仓库自身的治理协议

## 范围
- 涉及目录 / 模块：`scripts/`, `package.json`, `README.md`, `.claude/commands/`, `tests/`, `requirements/`, `docs/plans/`
- 影响接口 / 页面 / 脚本：`scripts/harness-install.mjs`, `scripts/template-guard.mjs`, 目标项目 `package.json` scripts, 安装报告

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：安装器、package scripts、入口文档、治理自检、自动化测试
- 可新增的测试 / 脚本：`scripts/template-guard.mjs`、安装器绑定逻辑相关测试

**禁止（CANNOT）**：
- 不可覆盖目标项目已有的真实 `lint / test / build / verify`
- 不可通过猜测框架特定脚本名来做高风险自动绑定
- 不可引入新的 npm 依赖

**边界条件**：
- 时间 / 环境 / 数据约束：需在临时 Git 仓库中真实验证安装器对 `package.json` 的绑定结果
- 改动规模或发布边界：仅增强接入体验和命令契约，不扩展到更复杂的项目检测器

## 验收标准
- [x] 安装器在目标项目已有 `lint / test / build` 时可自动生成或补齐 `verify`
- [x] 安装器不会覆盖目标项目已有的真实命令
- [x] 安装器在命令缺失时会写入统一的 placeholder guard，并在报告中明确缺口
- [x] README / 安装文档 / 自动化测试覆盖新的绑定行为

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-014-design.md`
- 相关规范：`AGENTS.md`, `CLAUDE.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-014-code-review.md`
- QA：`requirements/reports/REQ-2026-014-qa.md`
- Ship：不适用（治理模板接入体验增强，无独立发布动作）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
  - `node scripts/harness-install.mjs --defaults`（在临时 Git 仓库含 `package.json` 的场景下）
- 需要的环境：Node.js、Git、本地文件系统可写临时目录
- 需要的人工验证：核对目标项目 `package.json` 是否保留真实脚本并生成合理 `verify`

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：如果绑定逻辑过于激进，可能误改目标项目脚本约定
- 回滚方式：回退安装器与 guard 脚本改动，恢复仅文档提示的模式

## 关键决策
- 2026-03-29：由 `req:create` 自动生成骨架，待补充具体内容
- 2026-03-29：自动绑定仅基于目标项目已存在的标准脚本名，避免高风险猜测

<!-- Source file: REQ-2026-014-portable-real-command-binding-for-target-projects.md -->
