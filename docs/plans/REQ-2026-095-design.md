# REQ-2026-095 Design

## State Authority

| Fact | Authority | Consumers |
|------|-----------|-----------|
| 当前 worktree active/suspended | 当前 checkout namespaced events | status / session / hooks |
| 当前 worktree 恢复缓存 | worktree-local progress.txt | events 缺失时 fallback |
| 分支可审阅 REQ 清单 | requirements/INDEX.md + REQ docs | audit / review / fallback |
| 跨 worktree runtime 总览 | `git worktree list` + 每 checkout events | status --all |
| 历史治理债务 | audit baseline | health / audit |
| REQ/invariant 库存 | shared state-semantics parser | health / doctor |

跨 worktree 聚合不把 INDEX 当作中心数据库，因为不同 worktree 的 INDEX 属于不同分支快照；聚合只读，不写回任何 checkout。

## Worktree Topology

```text
git worktree list --porcelain
        │
        ├─ main root ─── .claude/worktrees/main/events + legacy .claude/events
        ├─ linked A ──── .claude/worktrees/<gitdir-id>/events
        └─ linked B ──── .claude/worktrees/<gitdir-id>/events
                              │
                              ▼
                    independent projections
                              │
                              ▼
                   duplicate active conflicts
```

- identity 来自 `--git-dir` 与 `--git-common-dir`，main 固定为 `main`，linked 使用 Git worktree admin dir basename。
- branch 只作展示，不能作唯一 identity（detached、重命名与同名路径问题）。
- 旧 bug 在 linked checkout 写入 `main` namespace；current reader 将其合并到该 linked identity，但兼容扫描不重复展示 synthetic main。

## Lifecycle Semantics

- req_created / req_started：设置 active；started 同时从 suspended 移除同 ID。
- req_blocked：若是当前 active 则 active→none/idle；upsert `{reqId,status,phase,reason}` 到 suspendedReqs。
- req_completed：清除 active（若匹配）并从 suspendedReqs 移除。
- 同一 worktree 可有多个 suspended，但只能有一个 active。

## Repository Inventory

- REQ：解析 document status；blocked 与 suspended 都归 operational suspended；带“公开脱敏示例/仅用于演示”的文件单列 examples，不计 active/draft/suspended。
- invariant：排除 TEMPLATE 文件/占位内容；按 source 与 id 识别重复，unique/status count 排除重复文件，duplicate groups 保留定位证据。
- audit：baseline 只比较 warning counts；regression = errors + warnings over baseline，debt = baseline 内已知 warnings。

## Compatibility

- 非 Git fixture 回退单 main topology，继续支持人工 namespace 测试。
- progress/INDEX 在无 events 时继续 fallback。
- 输出新增字段，不删除现有 JSON 字段；`in_progress` 兼容字段保留为 active+draft。

## Verification

- unit：identity/topology/parser/audit signal/projection transitions。
- real E2E：实际 `git worktree add` 两个 checkout，通过真实 req-cli writer 产生 events，再从 main `status --all` 聚合。
- parity：同一 fixture 的 status/session/health/doctor 对 suspended 与 counts 断言一致。
