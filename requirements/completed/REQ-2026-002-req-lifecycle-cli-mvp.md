# REQ-2026-002: REQ lifecycle CLI MVP

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`harness-lab` 已经把 REQ、设计稿、报告和 progress 固定成协议，但创建、切换、阻塞和完成 REQ 仍需要手动修改多个文件。
这既浪费时间，也容易让 `requirements/INDEX.md`、REQ 文件和 `.claude/progress.txt` 出现漂移。

## 目标
- 提供一个最小可用的 REQ 生命周期 CLI
- 自动同步 REQ 文件、`requirements/INDEX.md` 和 `.claude/progress.txt`
- 先覆盖最常见的生命周期动作：`create / start / block / complete`

## 非目标
- 不在本轮实现交互式向导
- 不在本轮实现多 REQ 并行激活
- 不在本轮实现 report 自动落盘、CI、Git hooks 或 MCP

## 范围
- 涉及目录 / 模块：
  - `scripts/`
  - `package.json`
  - `README.md`
  - `requirements/`
  - `.claude/progress.txt`
- 影响接口 / 页面 / 脚本：
  - CLI 命令入口
  - REQ / INDEX / progress 的自动同步逻辑

## 验收标准
- [x] 仓库内可运行 `npm run req:create -- --title "..."` 创建新 REQ 和设计稿
- [x] 仓库内可运行 `npm run req:start -- --id REQ-YYYY-NNN`
- [x] 仓库内可运行 `npm run req:block -- --id REQ-YYYY-NNN --reason "..." --condition "..." --next "..."`
- [x] 仓库内可运行 `npm run req:complete -- --id REQ-YYYY-NNN`
- [x] 命令会同步更新 REQ 文件、`requirements/INDEX.md` 和 `.claude/progress.txt`
- [x] `npm run check:governance` 仍然通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-002-design.md`
- 相关规范：`requirements/REQ_TEMPLATE.md`、`requirements/INDEX.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-002-code-review.md`
- QA：`requirements/reports/REQ-2026-002-qa.md`
- Ship：不适用；本次为仓库内工具能力整改，未涉及独立发布流程

## 验证计划
- 计划执行的命令：
  - `npm run req:start -- --id REQ-2026-002`
  - `npm run req:complete -- --id REQ-2026-002`
  - 在临时仓库执行 `npm run req:create` 与 `npm run req:block`
  - `npm run check:governance`
- 需要的环境：
  - Node.js
  - 本地文件系统可写
- 需要的人工验证：
  - 检查 CLI 产出的 REQ 文件和设计稿命名
  - 检查 INDEX / progress 的状态同步是否正确

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
  - Markdown 解析过于脆弱时，可能在非标准格式仓库里更新失败
  - 自动写入 progress 只能覆盖结构化字段，无法替代完整人工总结
- 回滚方式：
  - 回退 CLI 脚本和相关文档变更，恢复手动维护流程

## 关键决策
- 2026-03-23：MVP 先做 `create / start / block / complete` 四个命令，不把 report 自动落盘塞进第一版
- 2026-03-23：CLI 先服务单活跃 REQ 模式，继续与当前 `requirements/INDEX.md` 结构对齐
- 2026-03-23：自动编号默认忽略 `900+` 的公开示例号段，真实整改沿用较小序号
- 2026-03-23：progress 只更新结构化头部和 CLI 管理行，不伪造完整人工总结
