# REQ-2026-093 Design

## Architecture

```text
.claude/harness-mode ─▶ hook-policy ─▶ { action, effect }
                                      ├▶ PreToolUse adapters
                                      ├▶ PostToolUse adapters
                                      ├▶ Stop adapter
                                      └▶ PreCompact adapter

installer + capability manifest ─▶ .harness/profile.json
                                          │
                                          ▼
doctor ─▶ profile resolver ─▶ selected checks ─▶ one result ─▶ text/json
```

## Policy Contract

- modes: collaborative / supervised / autonomous。
- action: allow / warn / block。
- effect: none / log / recovery / snapshot。
- risk point 决策表在 import 时校验三档完整、action/effect 合法。
- Hook adapter 决定如何把 warn/block 转成该事件支持的 JSON/stderr。

## Profile Contract

- deterministic record：schema/product/profile/modules/overlays/capabilities。
- core/default 来自 manifest；interactive 为 custom 并保存实际 module closure。
- basic-hooks 由 installer 配置；advanced-hooks 进入发布但默认不复制。
- source checkout 无 record 时识别 package name 并报告 source；legacy 目标只读推断且 warning。

## Doctor

- profile check 永远运行。
- core：template；context：experience/invariants；cli：module files与 package aliases（如 package 存在）；hook overlays：settings/events/scripts/matcher/self-test。
- mode check 验证 `.claude/harness-mode`。
- text/json 从同一 report object 渲染，exitCode = failCount > 0 ? 1 : 0。

## Failure Modes

| Failure | Outcome |
|---------|---------|
| policy 缺 mode | import fail |
| invalid mode | hooks fallback collaborative；doctor warn |
| invalid profile record | doctor fail，不猜测覆盖 |
| legacy no record | inferred + warn，不写文件 |
| selected capability missing | doctor fail with exact files/scripts |

## Verification

- 24-cell policy table。
- consumer source contract + representative process smoke。
- installer record determinism。
- core/default/basic/advanced/source/legacy doctor text/json fixtures。
- 全量/pack/fresh install。
