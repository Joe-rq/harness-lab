# Code Review: REQ-2026-094

## 状态

- ✅ Approved

## Inputs

- REQ / Design / ADR：`REQ-2026-094`、`docs/plans/REQ-2026-094-design.md`、`docs/plans/REQ-2026-094-safe-upgrade-adr.md`
- Reviewed：ownership schema、planner/apply/backup/restore、installer CLI、profile migration、doctor、manifest/publication、tests、README。

## Findings

### High / Medium

- 无未关闭问题。
- 已关闭：仅凭路径认领已有文件会覆盖用户内容；fresh/reinstall 只认领与 source 精确同 hash 的文件，或保留已有可信 baseline。
- 已关闭：旧 core/default profile 的 module 列表会随新 manifest 漂移并被 doctor 判坏；upgrade 将 profile id/overlay 视为用户意图，按当前 manifest 重算 closure 并写回新 record，custom 仍保留显式模块。
- 已关闭：计划后 source/target 变化可能造成 TOCTOU 覆盖；每个写入前重新核对 source/target hash，不一致即自动恢复。
- 已关闭：只备份不校验 payload 可能恢复损坏内容；backup manifest 记录 SHA-256，restore 在任何写入前验证全部 payload、路径、重复项与 mode。
- 已关闭：restore 本身中途失败可能留下混合状态；恢复前保存当前内存快照，异常时回到恢复前状态并组合报告错误。
- 已关闭：上游移除项若直接删除风险过高；v1 标记 stale、保留文件并移出 ownership，不传播删除。
- 已关闭：invalid ownership 在普通 reinstall 中被静默重建；现安装失败并要求先审阅/恢复，避免销毁 baseline 证据。

### Residual

- 无跨进程并发锁；符合仓库单用户边界，但外部进程在 backup 与写入之间并发修改仍不属于支持场景。写前 rehash 缩小了窗口。
- legacy 无 ownership 时无法证明旧内容是否被用户改过，因此保守地产生冲突；不猜测 baseline 是安全取舍。
- 不自动合并冲突、不删除上游移除文件；只有 pilot 提供真实冲突样本后才考虑 P2。
- sourceVersion 取 npm package version；正式 publish 必须按 npm 规则发布新版本，本 REQ 未 publish。

## Conclusion

- Approved。受管边界、冲突优先、备份恢复和 profile 演进形成闭环，未发现用户数据覆盖路径。
