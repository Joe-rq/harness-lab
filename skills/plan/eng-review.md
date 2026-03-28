---
name: plan-eng-review
description: Technical design and feasibility review for a requirement before or during implementation.
---

# /plan-eng-review

输出目标：围绕当前 REQ 给出工程方案评审，并把结论沉淀到对应设计稿中。

## 输入

开始前至少确认：
- 当前 REQ 文件
- 对应设计稿或待补设计稿
- 相关技术 context 索引和文档
- 目标仓库自己的架构说明

## 审查重点

### Architecture
- [ ] 是否符合目标仓库自己的架构边界
- [ ] 依赖方向是否正确
- [ ] 改动点和影响范围是否明确
- [ ] REQ 如声明了 `Scope Control`，其允许 / 禁止项是否足够清楚且与方案一致

### Data and Contracts
- [ ] 数据结构或存储变化是否说明清楚
- [ ] API / schema / contract 是否定义清楚
- [ ] 敏感数据和权限边界是否考虑到

### Verification
- [ ] 测试与验证链路是否明确
- [ ] 环境前提和配置约束是否明确
- [ ] 回滚和发布影响是否明确
- [ ] REQ 如声明了边界条件，验证计划是否覆盖这些限制

## 输出建议

优先把结论写入：
- `docs/plans/REQ-YYYY-NNN-design.md`

必要时同步更新：
- `context/tech/architecture.md`
- `context/tech/testing-strategy.md`
- `context/tech/env-contract.md`
- `context/tech/deployment-runbook.md`

## 输出最低内容

```markdown
## Engineering Review

### Architecture Impact
- 影响模块：
- 依赖方向：
- 需要新增或修改的边界：

### Scope Control Review
- 是否声明：
- 允许项是否明确：
- 禁止项是否明确：
- 边界条件是否可执行：

### Technical Decisions
1. 决策：
   原因：
   备选方案：

### Validation Plan
- Commands:
- Manual checks:
- Environment requirements:

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| ... | ... | ... |

### Recommendation
- Proceed / Revise / Split
```

## 约束

- 不要用预设的固定分层去硬套目标仓库
- 如果目标仓库没有架构文档，先补最小边界说明
- 没有验证计划时，不要把方案写成 ready
