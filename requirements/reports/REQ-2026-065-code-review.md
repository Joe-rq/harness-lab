# Code Review: REQ-2026-065

## Findings

未发现阻断性问题。

## Review Notes

- `requirements/audit-baseline.json` 固化当前 125 个 legacy warning 的总量和按 code 分布，作为后续新增治理债务的比较基准。
- `req-audit.mjs` 读取 baseline 后只生成 delta 信息，不修改 `ok` 或 `findings`，因此 baseline 不是 suppression。
- CLI 支持默认 baseline、`--baseline path` 和 `--no-baseline`，文本输出展示 within / over baseline，JSON 输出包含 `baseline`。
- `governance-health.mjs` 复用 audit baseline 信息，避免健康报告和审计命令统计口径漂移。
- 测试覆盖 within baseline、over baseline，以及 baseline 不抹掉 findings。

## Residual Risk

- 当前 baseline 是按 finding code 统计，不按具体 REQ/file 逐项锁定；它适合观察新增类型/数量，不适合替代完整审计明细。
- 后续如果逐步清理 legacy debt，需要同步更新 `requirements/audit-baseline.json`，否则 health 会显示 improved delta。

## Conclusion

改动符合“基线不是豁免”的治理目标，可以进入 QA。
