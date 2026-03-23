# REQ-2026-002 Design

## Background

Harness Lab 目前已经有稳定的 REQ 协议，但每次创建或切换一个 REQ，至少要手动修改 REQ 文件、`requirements/INDEX.md` 和 `.claude/progress.txt`。
这让协议变成“知道该怎么做”，但没有变成“做起来足够顺手”。

## Goal

- 用最小 CLI 命令覆盖 REQ 生命周期的核心动作
- 降低手动同步 INDEX / progress 的错误率
- 保持零运行时依赖，继续只依赖 Node.js 和 Markdown 文件

## Scope

### In scope

- `scripts/req-cli.mjs`
- `package.json` 命令入口
- `README.md` 使用说明
- 对 REQ、INDEX、progress 的结构化更新
- create/start/block/complete 的真实命令验证

### Out of scope

- 不做交互式问答
- 不做多活跃 REQ
- 不做 report 自动生成
- 不做 Git hooks / CI / MCP

## Product Review

### User Value

- 解决的问题：REQ 生命周期的多文件手动同步太慢且容易漏
- 目标用户：独立开发者、小团队维护者、需要频繁切换会话的 AI agent
- 预期收益：把“新建/推进/阻塞/完成 REQ”从手工编辑降到单命令执行

### Scope

- Includes:
  - create / start / block / complete
  - INDEX / progress 同步
- Excludes:
  - 报告自动落盘
  - 团队并行多活跃 REQ

### Acceptance

- [ ] 四个命令都能在真实文件系统上执行
- [ ] create 会生成 REQ 文件和设计稿
- [ ] start / block / complete 会更新 REQ、INDEX、progress
- [ ] 治理检查命令仍然通过

### Risks and Dependencies

- 风险：Markdown 结构更新依赖现有标题和字段格式
- 依赖：Node.js；仓库结构符合 Harness Lab 约定

### Recommendation

- Proceed

## Design Review

### User Flow

1. 用户运行 `req:create` 创建 REQ 和设计稿
2. 用户运行 `req:start` 将 REQ 推进到 implementation
3. 如遇阻塞，运行 `req:block` 记录原因、恢复条件和下一步
4. 完成后运行 `req:complete`，将 REQ 移入 completed 并更新索引

### Standards Check

| Area | Status | Notes |
|------|--------|-------|
| Visual | Pass | CLI 无界面变更 |
| Interaction | Pass | 命令名与生命周期动作一一对应 |
| Accessibility | Pass | 纯命令行和 Markdown 输出 |
| Responsive | Pass | 不涉及 UI 布局 |

### Issues

- High: none
- Medium: progress 的自由文本总结不会被 CLI 完整维护
- Low: block 命令的文本参数在 Windows shell 中需要正确引用

## Engineering Review

### Architecture Impact

- 影响模块：
  - `scripts/` 新增 CLI
  - `package.json` 新增脚本入口
  - Markdown 结构化更新逻辑
- 依赖方向：
  - CLI 只读写仓库内既有文件，不引入外部服务
- 需要新增或修改的边界：
  - 把机器可维护的字段限制在 REQ 状态、INDEX 列表和 progress 头部 / 管理行

### Technical Decisions

1. 决策：用单个 `scripts/req-cli.mjs` 承载所有子命令
   原因：MVP 规模小，避免过早拆分
   备选方案：每个命令单独脚本

2. 决策：继续假设单活跃 REQ
   原因：与当前 INDEX / progress 结构保持一致，先解决最常见单线程场景
   备选方案：先重构多 REQ 并行模型

3. 决策：progress 只更新结构化字段和 CLI 管理行
   原因：自由文本总结依然需要人维护，CLI 不应伪造项目结论
   备选方案：全量重写 progress.txt

4. 决策：create 自动生成 REQ 编号、REQ 文件和设计稿
   原因：编号分配和样板创建是手工成本最高的步骤
   备选方案：要求用户手工指定 REQ 编号

### Verification

- 自动验证：
  - `npm run check:governance`
  - 在临时仓库里执行 create / block
  - 在真实仓库执行 start / complete
- 人工验证：
  - 检查生成文件内容
  - 检查 INDEX 和 progress 的状态同步
- 回滚：
  - 回退 CLI 脚本和文档变更
