# REQ-2026-074 Stage 2 退出确认经验

## 场景

一条多 checkpoint 路线完成后，最后一个 REQ 应该专门做退出确认，而不是顺手开启下一阶段。退出确认的价值是把能力、证据、剩余限制和下一阶段入口整理清楚。

## 关联材料

- REQ：`requirements/completed/REQ-2026-074-stage-2-exit-confirmation.md`
- 设计：`docs/plans/REQ-2026-074-design.md`
- 退出报告：`requirements/reports/REQ-2026-074-stage-2-exit.md`
- Code Review：`requirements/reports/REQ-2026-074-code-review.md`
- QA：`requirements/reports/REQ-2026-074-qa.md`

## 问题 / 模式

- **退出确认不是新功能**：如果在退出 REQ 里继续加能力，路线就无法收口。
- **证据按 checkpoint 链接**：退出报告要引用每个 checkpoint 的 REQ、报告和经验，而不是只写总结。
- **下一阶段只给入口**：Stage 3 先进入观察/决策门，不直接承诺实现任务图。

## 关键决策

- **决策 1：Stage 2 可以退出**。事件 append、写入点、projection、worktree aggregation 已形成闭环。
- **决策 2：保留 best-effort 写入限制**。是否升级为硬阻断留给真实使用观察后再判断。
- **决策 3：Stage 3 从观察期开始**。至少真实使用 2 周再填评估表。

## 验证

- `npm test`：PASS
- `npm run docs:verify`：PASS
- `npm run check:governance`：PASS
- `node scripts/req-audit.mjs --all --max-findings 20`：PASS
- `.claude/.req-exempt` absent：PASS

## 可复用经验

- 退出 REQ 的 QA 表要包含“文件核对”和“命令核对”两类证据。
- 路线图顶部、checkpoint 勾选、progress next step 必须同步，否则恢复会误导后续 agent。
- 对于分阶段路线，最后要明确剩余限制，避免“完成”被误解为无限制生产可用。
