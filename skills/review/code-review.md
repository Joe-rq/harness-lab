---
name: review
description: Code review for correctness, regression risk, safety, and test gaps. Use when reviewing code changes, PRs, or implementation quality.
---

# /review

输出目标：生成一份与 REQ 绑定的代码评审报告，并明确是否阻塞后续 QA 或发布。

## 输入

开始评审前，至少确认这些输入：
- 当前 REQ 文件
- 对应设计稿
- 本次代码改动范围
- 项目自己的架构说明或约束文档

## 评审重点

### Correctness
- [ ] 行为是否符合 REQ 和设计稿
- [ ] 边界条件和错误路径是否处理完整
- [ ] 是否存在明显回归风险

### Architecture
- [ ] 是否遵循目标仓库自己的架构边界
- [ ] 依赖方向是否与项目架构文档一致
- [ ] 是否引入不必要耦合

### Tests
- [ ] 新逻辑是否有对应测试
- [ ] 回归风险是否被验证覆盖
- [ ] 未覆盖部分是否被明确记录

### Safety and Security
- [ ] 输入是否校验
- [ ] 敏感数据是否妥善处理
- [ ] 是否引入权限或数据泄露风险

## 报告落盘

报告应保存到：
- `requirements/reports/REQ-YYYY-NNN-code-review.md`

## 报告最低内容

```markdown
# Code Review: REQ-YYYY-NNN

## Inputs
- REQ:
- Design:
- Diff / files reviewed:

## Commands Run
- `...`
- 未运行命令时说明原因

## Findings
### High
1. 问题、影响、建议

### Medium
1. 问题、影响、建议

### Low
1. 问题、影响、建议

## Test Gaps
- 缺失点

## Conclusion
- Approved / Changes requested / Needs discussion
```

## 约束

- 不要用目标仓库没有声明的“默认分层”去硬套评审
- 如果没有实际运行命令，要明确写出来
- 没有 findings 也要写明 residual risk 或 testing gap
- 结论必须服务于下一步动作，而不是只给一句“看起来不错”
