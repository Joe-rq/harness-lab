# 技术 Context 索引

> 先读本索引，再按需加载具体技术文档。
> 技术 context 的目标是帮助后续会话快速恢复系统约束，而不是堆砌实现细节。

## 建议的最小集合

优先补齐这几份文档：
- `architecture.md`：整体架构和边界
- `tech-stack.md`：技术栈与关键依赖
- `testing-strategy.md`：测试和验证策略
- `env-contract.md`：环境变量、配置和密钥约束
- `deployment-runbook.md`：构建、部署、回滚与 smoke 流程

## 文档使用原则

- 架构文档描述边界和依赖方向，不复制实现细节
- 测试文档描述真实命令和预期结果，不写空话
- 环境文档明确哪些配置是必需的、谁负责提供
- 发布文档明确发布顺序、验证动作和回滚方式

## 何时更新

- 架构边界变化时更新 `architecture.md`
- 验证链路变化时更新 `testing-strategy.md`
- 环境变量新增或变更时更新 `env-contract.md`
- 发布流程变化时更新 `deployment-runbook.md`

## 模板说明

本模板仓库已预置：
- `architecture.md`
- `tech-stack.md`
- `testing-strategy.md`
- `env-contract.md`
- `deployment-runbook.md`

接入新项目时，不要保留占位内容；应在第一次接入时替换成目标项目的真实事实。
