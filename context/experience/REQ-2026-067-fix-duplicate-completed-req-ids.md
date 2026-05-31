# REQ-2026-067 duplicate completed REQ ID 修复经验

## 场景

`check:governance` 被 completed REQ 中的重复编号阻断：`REQ-2026-063` 和 `REQ-2026-064` 各自对应两个不同历史需求。正确修法不是放宽 `req-audit`，而是保留已有真实语义，把误复用编号的历史需求重编号到未占用 ID。

## 关联材料

- REQ：`requirements/completed/REQ-2026-067-fix-duplicate-completed-req-ids.md`
- Code Review：`requirements/reports/REQ-2026-067-code-review.md`
- QA：`requirements/reports/REQ-2026-067-qa.md`

## 问题 / 模式

- **报告编号会误导归属判断**：如果只改 REQ 文件名，不补新编号的 review / QA 报告，审计链仍会把历史证据串到原 063/064。
- **重编号要改完整链路**：REQ 正文、报告链接、experience 文件名、invariant 来源、INDEX 都要一起迁移，否则下次 audit 或人工排查仍会看到旧号残留。
- **baseline warning 不是当前阻断项**：`REQ-2026-032` 仍是 legacy duplicate warning，但不应混入当前 bugfix 范围。

## 关键决策

- **决策 1：保留原 063/064 语义**：`REQ-2026-063` 继续代表 governance audit warning triage，`REQ-2026-064` 继续代表 invariant incremental source dedup。
- **决策 2：使用 068/069 承接历史 sh/js 需求**：因为 066 已被搁置、067 是当前 bugfix，068/069 是下一个可用编号。
- **决策 3：补历史报告而不伪造当前代码执行**：068/069 的报告明确为历史回填，当前完整回归只记录在 067 QA。

## 验证

- `node scripts/req-audit.mjs --all --verbose`：0 errors，125 legacy warnings，baseline within
- `npm test`：PASS
- `npm run docs:verify`：PASS
- `npm run check:governance`：PASS

## 可复用经验

- 处理 duplicate REQ ID 时，先判定哪个编号语义是“主线真实语义”，再给误复用文件分配新号。
- 重编号历史 REQ 时，报告和 experience/invariant 比文件名更容易漏；用 `rg` 搜旧文件名、旧报告名和标题 ID，比只查 `REQ-YYYY-NNN` 更可靠。
- 对 baseline 内历史 warning，要在 REQ 非目标里显式声明，否则修复范围会失控。
