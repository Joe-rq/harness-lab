# REQ-2026-015 Code Review

**日期**：2026-03-29
**审查者**：AI Assistant
**状态**：✅ 通过

## 变更摘要

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `scripts/req-validation.mjs` | 新增 | 提取共享 REQ 内容校验逻辑 |
| `scripts/req-check.sh` | 修改 | 复用共享校验并在活跃 REQ 文件缺失时阻断 |
| `scripts/req-cli.mjs` | 修改 | `req:start` 在状态迁移前阻止空模板 REQ |
| `tests/governance.test.mjs` | 修改 | 覆盖模板 REQ 无法 start、共享校验识别 draft/placeholder |
| `README.md` / `AGENTS.md` / `CLAUDE.md` | 修改 | 明确 `req:create` 只创建骨架，REQ 写实后才能 start |

## 主要检查点

### 正确性

- [x] `PreToolUse` 与 `req:start` 复用同一套模板内容判定规则
- [x] `draft` 仍可作为 REQ 初始状态存在，但不能直接进入写入路径
- [x] `req:start` 只阻止空模板，不阻止已写实的 draft REQ 正常启动
- [x] 活跃 REQ 在 `progress.txt` 中存在但文件缺失时会被明确阻断

### 可维护性

- [x] 模板占位符规则集中在单一脚本，不再在 shell / CLI 两处分叉维护
- [x] 自动化测试覆盖了失败路径，而不是只覆盖 happy path
- [x] 入口文档同步解释“骨架 REQ”与“可实施 REQ”的区别

### 风险评估

- [x] 当前规则只检查关键章节模板占位符，不会因为非关键字段留空而误伤
- [x] 未来若调整 REQ 模板默认占位符，需要同步更新共享校验脚本

## 发现的问题

本次 review 未发现新的阻断问题。

## 结论

这次改动把“创建了 REQ 编号”与“REQ 已经真正进入治理流程”区分开了。建议合并。
