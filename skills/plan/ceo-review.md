---
name: plan-ceo-review
description: Product and business review for a requirement before implementation starts.
---

# /plan-ceo-review

输出目标：围绕当前 REQ 做一次产品和业务审查，并把结论沉淀到对应设计稿或需求文档中。

## 输入

开始前至少确认：
- 当前 REQ 文件
- `requirements/INDEX.md`
- 相关业务 context 索引和文档

## 审查重点

- [ ] 用户价值是否清楚
- [ ] 目标用户和使用场景是否明确
- [ ] 范围与非目标是否分清
- [ ] 验收标准是否可验证
- [ ] 关键依赖、约束和风险是否列出

## 输出建议

优先把结论写入：
- `docs/plans/REQ-YYYY-NNN-design.md`

必要时同步更新：
- 当前 REQ 的目标、非目标、验收标准

## 输出最低内容

```markdown
## Product Review

### User Value
- 解决的问题：
- 目标用户：
- 预期收益：

### Scope
- Includes:
- Excludes:

### Acceptance
- [ ] 标准 1
- [ ] 标准 2

### Risks and Dependencies
- 风险：
- 依赖：

### Recommendation
- Proceed / Revise / Defer
```

## 约束

- 不要在用户价值不清楚时直接进入实现
- 不要把“想法”写成“已承诺范围”
- 输出应服务于后续设计和实现，而不是停留在聊天结论
