# 观察：`req:complete` 会连带批量废弃 invariant（2026-09-23）

> 性质：现场记录，**不是**已决策项。工作区当前有 63 个 `context/invariants/INV-*.md` 处于未提交的 `draft → deprecated` 改动，等待裁定。

## 触发链（已核实）

1. `npm run req:complete --id REQ-2026-098` → `scripts/req-cli.mjs:1567-1570` 以 `execSync` 调用
   `node scripts/invariant-extractor.mjs --scan --incremental --dedup`；
2. 该 CLI 入口在 `--scan` 分支下**无条件**调用 `autoDeprecate()`（`scripts/invariant-extractor.mjs:461`）；
3. `autoDeprecate()` 的判据是**文件 mtime**（`statSync(inv.path).mtimeMs`），超过 `DEPRECATION_THRESHOLD_DAYS`（90 天）未触发的 draft 一律改写为 `status: deprecated`（`invariant-extractor.mjs:148-151`）；
4. 本仓库 invariant 库最后修改停在 6–7 月，因此 2026-09-23 一次执行把**整库 draft** 打成 deprecated。

时间戳证据：`context/invariants/*` 全部 mtime = `2026-09-23 19:58:07`，与 `req:complete` 同刻。

## 观察到的问题

1. **一次完成的副作用是 63 个文件的状态变更**，且没有报告、没有确认、没有回滚点。执行者（用户）从 `req:complete` 的输出里看不到这件事。
2. **`context/invariants/TEMPLATE.md` 也被打成 `deprecated`**——模板的示例状态被改写，而它是新 invariant 的种子文件（无模板/示例豁免）。该文件已单独回退到 HEAD；63 个 `INV-*.md` 保持现状未提交。
3. 判据用**文件 mtime** 近似"未被触发"。这与仓库既有的"消费入口"思路不同：mtime 只反映文件被改写的时间，不反映规则是否真的被命中（对比 2026-07-16 路线报告 P11 的结论：47 条 draft 缺的是**消费证据**，不是时间）。

## 现状与可选处置

- 现状：63 个 `INV-*.md` 工作区未提交；`harness:doctor` 报 invariant 73 条 / 4 active；`req:audit` 仍在 125 warning 基线内（无 delta）。
- 选项 A（接受）：63 条 draft 长期零消费，视为死积累一次性清账；需要补一条说明并确认 `TEMPLATE.md` 类文件永久排除在 autoDeprecate 之外。
- 选项 B（回退）：`git checkout -- context/invariants/` 恢复原状；但下一次 `req:complete` 会再次触发同一批改动——需要先改阈值或加确认，否则只是把问题推迟。
- 选项 C（改造）：把 autoDeprecate 从"完成 REQ 的隐式副作用"改为显式命令 + 变更报告（例如仅输出候选清单、由人确认后批量执行），并把模板/示例文件加入排除集。

## 关联

- 触发它的 REQ：`requirements/completed/REQ-2026-098-p0-state-handoff-single-truth-source.md`
- 同一主题的既有判断：`docs/plans/2026-07-harness-lab-product-route-decision.md` 第 5 节 P11（invariant 缺消费而非缺数量）
- 相关脚本：`scripts/invariant-extractor.mjs`、`scripts/invariant-gate.mjs`、`scripts/req-cli.mjs`
