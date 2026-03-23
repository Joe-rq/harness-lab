# REQ-2026-003: Docs quality gate MVP

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前治理层更擅长校验“文件在不在、索引是否一致”，但不擅长校验“功能更新后文档是否同步”。
例如 README、REQ、设计稿和经验文档里的命令、路径、链接，可能在代码变化后继续指向旧状态，却不会被现有 `check:governance` 拦下来。

## 目标
- 提供一个 `docs:verify` 的最小文档质量门
- 检查本地 Markdown 链接、文档里提到的 `npm run` 命令，以及关键路径引用是否有效
- 把文档质量检查纳入现有 `check:governance`

## 非目标
- 不在本轮做 diff-aware 的“改代码必须改哪些文档”强约束
- 不在本轮校验远程 URL、外部站点可达性或锚点标题准确性
- 不在本轮做拼写检查、术语统一或全文语义比对

## 范围
- 涉及目录 / 模块：
  - `scripts/`
  - `package.json`
  - `README.md`
  - `requirements/`
  - `docs/`
  - `context/`
- 影响接口 / 页面 / 脚本：
  - `npm run docs:verify`
  - `npm run check:governance`
  - 模板仓库维护流程

## 验收标准
- [x] 仓库内可运行 `npm run docs:verify`
- [x] `docs:verify` 能发现本地 Markdown 链接失效
- [x] `docs:verify` 能发现文档里引用了不存在的 `npm run` 命令
- [x] `docs:verify` 能发现关键代码块路径引用失效
- [x] `check:governance` 会在 `docs:verify` 失败时一并失败
- [x] README 说明模板维护者应运行 `docs:verify`

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-003-design.md`
- 相关规范：`README.md`、`scripts/check-governance.mjs`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-003-code-review.md`
- QA：`requirements/reports/REQ-2026-003-qa.md`
- Ship：`requirements/reports/REQ-2026-003-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：
  - `npm run docs:verify`
  - `npm run check:governance`
- 需要的环境：
  - Node.js
- 需要的人工验证：
  - 核对 README 是否解释了 `docs:verify`
  - 核对 `check:governance` 是否把 `docs:verify` 纳入结果

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
  - `docs:verify` 的规则如果写得过死，会让文档维护成本过高
  - 本轮只做本地路径和本地命令校验，不能覆盖文档语义是否过期
- 回滚方式：
  - 回退 `scripts/docs-verify.mjs` 及相关 README / package / governance 变更

## 关键决策
- 2026-03-23：MVP 只做本地文档质量门，不做外部链接可达性和语义同步判断
- 2026-03-23：`docs:verify` 作为独立命令存在，同时由 `check:governance` 统一调用
- 2026-03-23：命令和关键路径引用先只校验核心文档，避免把模板占位符和研究文档误判成错误

<!-- Source file: REQ-2026-003-docs-quality-gate-mvp.md -->
