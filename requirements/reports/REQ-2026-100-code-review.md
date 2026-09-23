# Code Review: REQ-2026-100

> 本文件同时是 dogfood 证据：它在 REQ 的 `## 范围` **未声明** 的情况下写入成功，依赖的是本 REQ 新增的"约定交付物自动 allow"。

## 状态

- ✅ Approved（同谱系自审，独立性有限）

## Inputs

- REQ：`requirements/in-progress/REQ-2026-100-p0-scope-guard-bootstrap-and-deliverables-allowance.md`
- DESIGN：无独立设计稿（`skip-design-validation`，设计即"关键决策"段）
- Reviewed：`scripts/scope-guard.mjs`（豁免判定、allow 集合构造）、`tests/governance.test.mjs`（2 条新用例 + 注册）、`AGENTS.md`（范围声明解析规则）

## Findings

### High / Medium

- 无未关闭问题。
- 已关闭：**自举死锁**——`.claude/.req-exempt` 是豁免开关，但创建它要过同一条 scope 检查。现豁免文件本身免检（`.claude/.req-exempt` 与 `.claude/worktrees/<id>/.req-exempt`），且只在"已解析且在仓内"的目标上生效：未解析、仓外路径仍 fail closed。
- 已关闭：**REQ 改不动自己的范围**——交付物自动 allow 覆盖 REQ 自身与四类产物；实测（本次）范围未声明 reports，报告写入仍放行。
- 已关闭：**四类交付物靠人记得声明**——`requirements/in-progress/<reqId>-*`、`requirements/reports/<reqId>-*`、`context/experience/<reqId>-*`、`docs/plans/<reqId>-*` 自动进 allow 集合。
- 已关闭：**解析规则未文档化**——`AGENTS.md` 写明"范围段内反引号路径一律解析为作用域声明（CANNOT → deny、说明句 → allow）"，并给出"目录禁止 + 单文件例外"的正确写法（写进 CAN 显式列举）。

### Residual

1. 同谱系自审（同 REQ-2026-098/099 的结论）。
2. **allow/deny 优先级未改**：CANNOT 与 allow 冲突时仍 deny 胜。这是刻意保留（改优先级会让"禁止"失效）；代价是"目录级禁止 + 例外"必须改写进 CAN 段，已文档化。
3. 自动 allow 只按 `reqId` 前缀匹配，因此**活跃 REQ 无法写其他 REQ 的交付物**（用例已断言）。这是有意的收窄。
4. `matchGlob` 的 `?` 未做 glob 语义处理（会当正则量词）——既有行为，未在本 REQ 修（不属死锁范围）。
5. 只读边界 REQ 不注入交付物 allow（保持"只写 reports + 尊重 deny"），既有测试继续通过。

## Conclusion

- Approved。三处死锁与一处文档缺口关闭，均有"先复现后修复"的用例或实测；判定结果只增不减——原先被拦的豁免/交付物写入转为放行，范围外源码与其他 REQ 的交付物仍被拦。
