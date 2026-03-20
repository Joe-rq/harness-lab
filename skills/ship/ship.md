---
name: ship
description: Release engineering and delivery readiness. Use when a change is being prepared for release or handoff.
---

# /ship

输出目标：生成一份与 REQ 绑定的发布报告，记录发布条件、实际执行动作、结果和回滚方式。

## 输入

开始发布前，至少确认：
- 当前 REQ 文件
- 对应设计稿
- 最新 code review 与 QA 结论
- 项目的 deployment runbook

## 发布前检查
- [ ] 阻塞性评审问题已关闭或明确接受风险
- [ ] QA 已完成或明确记录未完成原因
- [ ] 文档和配置已同步
- [ ] 回滚方案明确

## 报告落盘

报告应保存到：
- `requirements/reports/REQ-YYYY-NNN-ship.md`

## 报告最低内容

```markdown
# Ship Report: REQ-YYYY-NNN

## Scope
- REQ:
- Release target:
- Operator:

## Preconditions
- Review:
- QA:
- Config / docs updated:

## Commands and Actions
| Step | Result | Evidence |
|------|--------|----------|
| Build | Pass / Fail | |
| Deploy | Pass / Fail | |
| Smoke | Pass / Fail | |

## Risks
- 风险和接受方式

## Rollback
- 回滚入口：
- 回滚步骤：
- 回滚后验证：

## Conclusion
- Shipped / Blocked / Partial
```

## 约束

- 没有发布动作时，不要伪造 ship 结果
- 如果只是“准备可发布”，要明确写清楚不是已发布
- 没有回滚方式时，不要给出可发布结论
