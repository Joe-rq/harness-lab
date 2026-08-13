# REQ-2026-097 Design：三类外部项目 Pilot

## Pilot 单元

每个 pilot 是一个独立 Git 项目、一个匿名 `pilotId`、一种 `projectType`（javascript/python/monorepo）和 14–28 天 observation window。项目必须有真实验证入口和真实待办；教学章节、临时 fixture、Harness Lab 仓库不纳入。

## 证据链

```text
只读 preflight
  → 用户授权项目与真实任务
  → 安装 dry-run / baseline diff
  → observation init
  → REQ cycle 1（design → implementation → review → QA → complete）
  → 至少一次跨会话 recovery observation
  → REQ cycle 2（同等完整）
  → 14–28 天 repeat-use / incident observation
  → validate → 脱敏 summary → cross-pilot synthesis
```

## Observation schema

原始 JSONL 只允许下列固定事件与字段，禁止任意 payload：

| Event | Required fields | Purpose |
|-------|-----------------|---------|
| `pilot_started` | pilotId, projectType, occurredAt, baselineRef | observation 起点 |
| `first_req_ready` | reqId, occurredAt, elapsedMinutes | 从接入完成到首个可 start REQ |
| `cycle_started` | reqId, occurredAt | 周期起点 |
| `cycle_completed` | reqId, occurredAt, verificationResult | 完整周期 |
| `recovery_started` | reqId, occurredAt | 新会话收到恢复任务 |
| `recovery_completed` | reqId, occurredAt, elapsedSeconds, outcome | 到正确复述 current/next/blocker |
| `incident` | reqId?, occurredAt, classification, severity | false-block / false-miss / true-block |
| `exemption_used` | reqId, occurredAt, reasonCode | 豁免次数与涉及周期 |
| `repeat_use` | occurredAt, intent | 第 2 周后主动再用/放弃/暂停 |
| `pilot_closed` | occurredAt, outcome | 观察结束 |

`baselineRef` 只能是 commit hash 或 `uncommitted-reviewed` 枚举；不记录绝对路径。`reasonCode`、`intent`、classification 使用枚举。所有时间为带时区 ISO-8601，collector 拒绝倒序、未来过远、重复 start/close 和 close 后事件。

## 指标公式

- 首个 REQ 用时：`first_req_ready.elapsedMinutes`，三项目分别报告，不只给平均数。
- 恢复耗时：每次 `recovery_completed.elapsedSeconds` 的 median、p90（小样本标注 descriptive）。
- 误拦/漏拦：`incident.classification` 的原始计数与每 completed cycle 比率。
- 豁免率：`使用过 exemption 的 completed cycles / completed cycles`；另报 exemptions/cycle，避免缺少 Hook 总操作数时制造假精度。
- 重复使用：第 14 天后是否存在 `repeat_use=intentional_reuse`，同时记录 paused/abandoned；这不是用户留存率。
- 周期完整度：completed REQ 是否同时有 review、QA、真实 project verification evidence。

## CLI

`scripts/pilot-observation.mjs`：

- `init --pilot-id ... --project-type ... --baseline-ref ... --at ... --output ...`
- `record --event ... --at ...` 加事件专用参数
- `summary --input ... --output ...` 生成无路径、确定性 JSON/Markdown
- `validate --input ... [--as-of ...]` 验证 schema、顺序、周期完整度与 14–28 天退出条件

CLI 零依赖、append-only；只允许写显式 output/input 所在项目的 `.harness/pilot/`，不自动发现或上传项目。测试使用 fixture 时间，不依赖真实等待。

## 候选预检（只读，待用户确认）

| Type | Primary candidate | Current fact | Risk |
|------|-------------------|--------------|------|
| JavaScript | `studymate-agent` | Git clean；2026-07-09 有提交；已有 AGENTS.md | 需确认现有 AGENTS 合并策略与两个真实任务 |
| Python | `rag-agent-showcase` | Git clean；2026-07-09 有提交；pyproject + CLAUDE.md | 需发现真实 Python 验证命令与两个任务 |
| Monorepo | `archive/MiroFish` | Git clean；root package + backend pyproject + frontend package | 位于 archive、最近提交 2026-01-17，可能没有真实 repeat-use 意图 |

备选 monorepo `MediAppHub` 已有 Harness 历史且仅 progress dirty，适合升级/长期观察，但不是 fresh adoption；是否纳入由用户决定。

## 完成边界

collector 与 protocol 完成不等于 P1 pilot 完成。只有用户授权、六个真实 REQ completed、每项目观察至少 14 天并通过 validate，REQ-097 才能 completed。
