# REQ-2026-001: Template hardening and self-dogfooding

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
2026-03-23 的 peer review 指出：模板仓库自身没有真实 REQ、`.claude` 存在悬空验证入口、`skills/` 缺少目录导航、README 没有人类 / AI 双路径、`context/business/` 缺少最小存根，且 blocked / suspended 生命周期只有规则没有示例。

## 目标
- 用一个真实 REQ 承接模板自身的 P0 / P1 整改
- 给模板仓库补上真实治理检查命令
- 补齐 skills 导航、业务概览、人类 / AI 启动路径和 blocked 示例

## 非目标
- 不把模板仓库伪装成业务运行时项目
- 不引入目标项目级的真实 `lint / test / build / verify`
- 不在本轮处理 P2 的术语对照、CI 指南和 context 维护策略

## 范围
- 涉及目录 / 模块：
  - `README.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `package.json`
  - `.claude/`
  - `requirements/`
  - `docs/plans/`
  - `skills/`
  - `context/business/`
  - `context/experience/`
  - `scripts/check-governance.mjs`
- 影响接口 / 页面 / 脚本：
  - 仓库入口文档
  - 模板治理检查命令
  - 公开示例集合

## 验收标准
- [x] 本次整改有真实 REQ、设计稿、code review 和 QA 报告
- [x] 模板仓库可运行 `npm run check:governance`
- [x] `skills/` 目录有 README 导航
- [x] README 区分人类维护者最短路径和 AI agent 完整路径
- [x] `context/business/` 提供最小业务概览
- [x] 提供 blocked / suspended 示例 REQ

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-001-design.md`
- 相关规范：`README.md`、`AGENTS.md`、`CLAUDE.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-001-code-review.md`
- QA：`requirements/reports/REQ-2026-001-qa.md`
- Ship：不适用；本次为仓库内模板整改，未涉及独立发布流程

## 验证计划
- 计划执行的命令：
  - `npm run check:governance`
- 需要的环境：
  - Node.js
- 需要的人工验证：
  - 核对 README 的人类 / AI 启动路径
  - 核对 `requirements/INDEX.md`、`.claude/progress.txt` 和示例列表一致
  - 核对 `skills/README.md`、`product-overview.md` 和 blocked 示例是否可发现

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
  - `check:governance` 目前以结构和关键文本为主，不能代替人工判断文档质量
- 回滚方式：
  - 直接回退本次文档和脚本变更

## 关键决策
- 2026-03-23：模板仓库通过 `npm run check:governance` 做自验证，不把 `lint / test / build / verify` guard 脚本伪装成真实业务验证
- 2026-03-23：真实整改用 `REQ-2026-001` 承接，公开示例继续保留在真实目录结构中
- 2026-03-23：blocked / suspended 示例保留在 `requirements/in-progress/`，与生命周期约定保持一致
