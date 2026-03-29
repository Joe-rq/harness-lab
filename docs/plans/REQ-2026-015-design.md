# REQ-2026-015 Design

## Background

当前治理链路存在一个结构性漏洞：`req:create` 生成的骨架 REQ 只要被索引和 progress 记录下来，就会被视为“有活跃 REQ”。此前的 `req-check.sh` 只阻断“无活跃 REQ”，没有阻断“空模板 REQ”；`req:start` 也不会验证内容是否仍是模板。结果是 agent 可以创建 REQ 编号，却没有真正写实需求内容，仍然继续实施。

## Goal

- 把“REQ 已创建”和“REQ 已可实施”明确区分开
- 让 `PreToolUse` 与 `req:start` 对空模板 REQ 使用同一套校验标准
- 在不修改 REQ 模板结构的前提下，阻断最常见的空模板绕过路径

## Scope

### In scope

- 新增共享 REQ 内容校验模块
- `req-check.sh` 复用共享校验结果，继续承担 hook 阻断入口
- `req-cli.mjs` 的 `start` 命令在状态迁移前执行相同校验
- 治理测试覆盖模板占位符和 `draft` 状态的阻断路径
- 更新入口文档和当前 REQ 的定义，使行为边界可见

### Out of scope

- 不修改 `requirements/REQ_TEMPLATE.md` 的字段结构
- 不自动判断设计稿是否也为模板
- 不在本 REQ 中直接修改其他业务仓库

## Product Review

### User Value

- 解决的问题：避免“只有编号、没有实质内容”的 REQ 被误当成有效治理对象
- 目标用户：接入 Harness Lab 的人类维护者与 AI agent
- 预期收益：创建 REQ 后必须先写实内容，治理流程才能真正进入实施阶段

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：`scripts/req-check.sh`, `scripts/req-cli.mjs`, 新增共享校验脚本, `tests/governance.test.mjs`
- 依赖方向：`req-check.sh` 通过 Node 脚本复用校验逻辑；`req-cli.mjs` 直接导入共享模块
- 需要新增或修改的边界：
  - 关键章节的模板占位符被视为“REQ 未写实”
  - `draft` 状态仍允许存在，但不允许进入写入路径
  - `req:start` 允许从 `draft` 启动，只要内容已写实

### Verification

- 自动验证：`npm test`, `npm run docs:verify`, `npm run check:governance`
- 人工验证：创建空模板 REQ，验证其无法执行 `req:start` 且在 hook 路径上被阻断
- 回滚：删除共享校验模块，恢复 `req-check.sh` 与 `req-cli.mjs` 原始行为
