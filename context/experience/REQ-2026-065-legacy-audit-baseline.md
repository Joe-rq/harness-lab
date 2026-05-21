# REQ-2026-065 legacy audit baseline 经验

## 场景

严格审计上线后，历史仓库常常会有大量 legacy warning。如果只展示总数，新增 warning 会被历史基数掩盖；如果直接 suppress，又会损失审计透明度。

## 问题或模式

- 历史 warning 需要可见，但不应该淹没新增问题。
- 基线如果改变 pass/fail 语义，就会变成隐性豁免。
- 健康报告需要回答“是否比已知债务更糟”，而不仅是“现在有多少 warning”。

## 根因或关键判断

治理债务基线应是比较器，不是过滤器。它可以记录已知数量和类型分布，但不能删除 findings，也不能影响 strict audit。

## 解决方案

- 用 `requirements/audit-baseline.json` 记录当前已知 warning 总数和按 code 分布。
- `req:audit` 保留完整 `findings`，额外输出 `baseline` delta。
- `governance:health` 复用 baseline 状态，展示 within / over baseline。
- 测试验证 baseline 内和超出 baseline 两种场景。

## 后续项目如何复用

- 对老项目上线新门禁时，先建立 baseline，再逐步降低 baseline。
- 不要用 baseline 替代真实 QA 证据或完成态修复。
- 每次清理一类 legacy warning 后，同步更新 baseline，并保留对应 REQ/QA 证据。

## 相关交付物

- REQ：`requirements/completed/REQ-2026-065-feat-legacy-audit-baseline.md`
- Code Review：`requirements/reports/REQ-2026-065-code-review.md`
- QA：`requirements/reports/REQ-2026-065-qa.md`
