# 2026-07-12 跨 worktree 聚合前先定义状态事实

## 场景

当 events、progress、INDEX 与文件目录都能表达“当前状态”时，直接增加跨 worktree 扫描会放大歧义：blocked 可能仍被当作 active，分支索引可能被误当成中心数据库，branch name 也可能被误当成稳定 identity。

## 关联材料

- REQ：`requirements/completed/REQ-2026-095-p1-state-semantics-real-worktree.md`
- Design：`docs/plans/REQ-2026-095-design.md`
- QA：`requirements/reports/REQ-2026-095-qa.md`

## 关键决策

- 当前 checkout namespaced events 是运行态事实；progress 只作缺失时 fallback；INDEX 是当前分支可审阅事实。
- blocked/suspended 不属于 active 集合，同一 worktree 可以保留多个 suspended，但只能有一个 active。
- worktree identity 来自 Git admin dir，而不是分支名或 checkout 路径；拓扑来自 `git worktree list --porcelain`。
- 聚合保持只读，只定位 duplicate active，不自动协调其他 checkout。
- 健康统计先排除 example/template 并去重，再报告原始重复债务；基线内 warning 与新增回归分开。

## 复用建议

- 在增加“全局状态”前，先为每类数据写清 authority、scope 与 fallback，否则全局视图只会汇总矛盾。
- 跨 checkout 测试必须创建真实 Git worktree 并通过真实 writer 产生数据；手工目录 fixture 只能验证解析器。
- macOS 临时目录存在 `/var` 与 `/private/var` 别名，涉及 checkout identity 或 root 比较时使用 canonical real path。
- 兼容旧错误数据时优先只读兼容、停止继续产生；不要为了清爽自动重写历史账本。
