---
name: qa
description: Requirement-oriented QA and verification. Use when validating features, regression risk, or release readiness.
---

# /qa

输出目标：生成一份与 REQ 绑定的 QA 报告，记录真实执行过的验证动作、结果和阻塞项。

## 输入

开始 QA 前，至少确认：
- 当前 REQ 文件
- 对应设计稿
- 相关 code review 结论
- 项目的测试策略和环境约束

## QA 重点

### Requirement Validation
- [ ] 验收标准逐条核对
- [ ] Happy path 验证
- [ ] Error path 和边界条件验证

### Regression
- [ ] 关键回归路径验证
- [ ] 关键集成点验证

### Environment
- [ ] 记录测试环境和前置条件
- [ ] 记录需要的环境变量、测试数据或依赖服务

## 报告落盘

报告应保存到：
- `requirements/reports/REQ-YYYY-NNN-qa.md`

## 报告最低内容

```markdown
# QA Report: REQ-YYYY-NNN

## Scope
- REQ:
- Design:
- Build / branch:

## Environment
- OS / runtime:
- Required env:
- Test data:

## Commands Run
| Command | Result | Notes |
|---------|--------|-------|
| `...` | Pass / Fail | |

## Manual Verification
| Scenario | Result | Evidence |
|----------|--------|----------|
| ... | Pass / Fail | log / screenshot / note |

## Issues
1. 问题、严重级别、建议

## Conclusion
- Pass / Fail / Blocked
```

## 约束

- 没有真实执行命令或操作时，不能写 Pass
- 如果只做了静态阅读，没有做 QA，就明确写未执行
- QA 结论要能回溯到具体命令、日志、界面操作或输出结果
