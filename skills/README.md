# Skills

> 本目录存放 Harness Lab 的阶段性技能提示。
> 先确认当前 REQ，再按阶段选择对应 skill，而不是一次性读完整个目录。

## Skill Map

| Skill | 阶段 | 适用场景 | 主要输出位置 |
|------|------|----------|-------------|
| `plan/ceo-review.md` | design | 做需求前的产品 / 业务审查 | `docs/plans/REQ-YYYY-NNN-design.md` |
| `plan/design-review.md` | design | 有界面、交互或体验变化时做设计评审 | `docs/plans/REQ-YYYY-NNN-design.md` |
| `plan/eng-review.md` | design / implementation | 做技术方案、边界和验证链路评审 | `docs/plans/REQ-YYYY-NNN-design.md` |
| `review/code-review.md` | review | 评审正确性、回归风险、架构和测试缺口 | `requirements/reports/REQ-YYYY-NNN-code-review.md` |
| `qa/qa.md` | qa | 逐条核对验收标准、回归和环境前提 | `requirements/reports/REQ-YYYY-NNN-qa.md` |
| `ship/ship.md` | ship | 准备发布、记录 smoke 和回滚方案 | `requirements/reports/REQ-YYYY-NNN-ship.md` |

## 使用顺序

1. 读取 `AGENTS.md`、`requirements/INDEX.md` 和当前 REQ。
2. 如果还没有设计稿，先用 `plan/*` 系列 skill 补齐设计与评审结论。
3. 进入实现后，用 `review` 和 `qa` 产出正式报告。
4. 需要发布时，再用 `ship` 补发布报告。

## 使用原则

- skill 是阶段导航，不替代当前 REQ、设计稿和项目自己的上下文。
- 产出优先写回仓库文件，不要只停留在聊天记录里。
- 如果某个阶段不适用，也要在 REQ 或报告中写明原因，而不是直接跳过。
