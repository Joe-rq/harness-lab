# Code Review: REQ-2026-095

## 状态

- ✅ Approved

## Inputs

- REQ / Design：`REQ-2026-095`、`docs/plans/REQ-2026-095-design.md`
- Reviewed：共享状态语义、audit/health/doctor 消费者、事件 projection、Git worktree identity/topology、生命周期 writer、status/session 输出、真实 worktree E2E 与公开说明。

## Findings

### High / Medium

- 无未关闭问题。
- 已关闭：blocked event 仍保留 active，导致同一 worktree 无法启动后续工作；现 active 清空并进入 `suspendedReqs`，resume/completed 会清除同 ID suspended。
- 已关闭：linked checkout writer 把自身当作 main；identity 现由 Git dir/common dir 推导，main 固定为 `main`，linked 使用 worktree admin id。
- 已关闭：`--all` 扫描人工 namespace 而不反映真实 checkout；现通过 `git worktree list --porcelain` 发现拓扑，并从各 checkout 只读本地状态。
- 已关闭：跨 worktree INDEX 被误作中心状态；现明确 events 是 runtime truth、progress 是 fallback、INDEX 是 branch-local review truth。
- 已关闭：health 把 examples/templates/duplicates 算入健康总量；共享语义排除公开示例和模板，按 invariant source/id 去重并保留重复定位。
- 已关闭：audit 基线把 error 与 warning 混比；现只比较 warning bucket，health 分离 regressions 与 known debt。
- 已关闭：macOS 临时目录 `/var` 与 `/private/var` 使真实 worktree root 误判；E2E 与 identity 比较使用 canonical real path。

### Residual

- 跨 worktree 聚合只报告 duplicate active，不自动协调、写回或合并，符合单用户与只读边界。
- 已删除/损坏 worktree 以 Git 当前拓扑为准；单个 checkout 读取错误隔离展示，不建立墓碑数据库。
- 旧 linked checkout 错写的 `main` namespace继续只读兼容；没有自动迁移或删除，避免破坏历史事件。
- 现有 125 条 warning、21 组 invariant 重复属于已知债务；本 REQ 正确分类但不扩 scope 清理。

## Conclusion

- Approved。状态口径已集中，真实 worktree writer/reader/E2E 闭环成立，未发现跨 checkout 写入或自动协调风险。
