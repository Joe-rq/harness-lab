# REQ-2026-094 Design

## Architecture

```text
capability manifest + profile ─▶ managed file set
old ownership hash ────────────▶ upgrade planner ◀──────── new source hash
target file hash ──────────────▶       │
                                       ├─ unchanged / adopt
                                       ├─ update / add ─▶ backup ─▶ atomic apply
                                       ├─ conflict ─────▶ preserve + report
                                       └─ stale ────────▶ preserve + report

.harness/backups/<id>/manifest.json ─▶ explicit restore / automatic rollback
```

## Ownership Contract

`.harness/ownership.json` schema v1：

- root：schemaVersion、manifestSchemaVersion、profile、lastAttemptedVersion、lastCompleteVersion、files。
- file entry：module、sourceVersion、sha256。
- files 仅来自选中 module；package、settings.local、progress/events/session、REQ 历史不进入 ownership。
- fresh/reinstall 只认领 target 与 source 字节相同的文件，或保留此前可信 baseline；不能因“路径相同”认领用户内容。

## Upgrade Classification

| Baseline | Target | New source | Class | Action |
|----------|--------|------------|-------|--------|
| old hash | = old | = target | unchanged | adopt new version metadata |
| old hash | = old | ≠ target | update | backup + replace |
| old hash | ≠ old | = source | adopt | preserve + update baseline |
| old hash | ≠ old | ≠ source | conflict | preserve |
| none | absent | present | add | backup metadata + create |
| none | = source | present | adopt | preserve + own |
| none | other | present | conflict | preserve |
| owned | present | source removed | stale | preserve，不删除 |

这是 hash-based 三方**分类**，不是内容三方合并。冲突不自动解决。

## Transaction and Backup

1. 完整解析 profile、ownership、source 和所有 canonical target，任何结构/路径错误在写前失败。
2. dry-run 只返回同一 plan，不创建 backup/report/ownership。
3. apply 在 `.harness/backups/<id>/` 保存将变文件的旧字节和 existed 标记，同时保存 ownership/profile/上次 report。
4. 文件使用同目录临时文件 + rename 原子替换。
5. 每次写入前重新核对 source/target hash，避免计划后变化被静默覆盖。
6. 任一步失败立即按 backup manifest 恢复；恢复本身先保存当前内存快照，若中途失败则回到恢复前状态。
7. 显式 `--restore <id>` 重放同一恢复逻辑；restore dry-run 只展示目标，backup payload 需通过 SHA-256 校验。

## Version Semantics

- `lastAttemptedVersion` 记录本次 source 版本。
- `lastCompleteVersion` 仅当无 conflict/stale-source-error 时推进。
- 每个 owned file 独立记录 sourceVersion，允许冲突后的 mixed baseline 被 doctor 明确识别。
- backup id 可含时间与版本，ownership/profile 本身不含时间戳，保持可审阅。

## Legacy

- 无 profile record：复用只读 profile inference；无法推断 core 时失败。
- core/default record 表示用户意图，upgrade 会按新 manifest 重新解析 module closure，因此 profile 新增文件/模块可进入计划；custom 只保留其显式模块选择。
- 无 ownership：精确等于新 source 的文件可 adopt，新缺失文件可 add，其余已有文件一律 conflict。
- 首次 legacy upgrade 可能只完成安全子集，但 active state 和用户修改不丢失；冲突由报告驱动人工处理。

## CLI

- install：现有 flags 不变，完成后刷新安全 ownership baseline。
- upgrade：`harness-install --upgrade [--dry-run] [--source <dir>]`。
- restore：`harness-install --restore <backup-id> [--dry-run]`。
- upgrade/restore 与 profile/package/history flags 互斥。

## Failure Modes

| Failure | Outcome |
|---------|---------|
| invalid profile/ownership | preflight fail，零写入 |
| source file missing | preflight fail，零写入 |
| target symlink escape | preflight fail，零写入 |
| user-modified managed file | conflict，保留并继续安全项 |
| write failure | automatic restore，非零 |
| invalid/missing backup | restore preflight fail |

## Verification

- 表驱动覆盖所有分类。
- bytes-before/after 断言 active state、用户文件、settings/package 不变。
- 故障注入验证 backup-first 与 automatic restore。
- packed bin 对 fresh ownership、upgrade dry-run/apply/restore 做离线生命周期验证。
