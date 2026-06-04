# REQ-2026-075 Code Review(自查)

> REQ: [REQ-2026-075](../completed/REQ-2026-075-stage-3-7-event-store-schema.md)
> Review 日期: 2026-06-03
> Review 模式: 实施者自查(独立 verifier review 留待 REQ-077)
> 范围: `scripts/event-store.mjs`、`tests/event-store.test.mjs`、`docs/plans/REQ-2026-075-{design,evaluation-metrics}.md`、`CONTRIBUTING.md`

## 1. 正确性(Correctness)

- ✅ 13 个新 type schema 字段类型与设计文档 §2.1 / §2.2 一致
- ✅ version 字段默认 `"1.0"` 通过 `buildEvent` 自动注入
- ✅ rotation 触发条件 `MAX_EVENT_LINES`(默认 1000)符合设计
- ✅ stats 命令 6 维度计分公式与 `docs/plans/REQ-2026-075-evaluation-metrics.md` §1-6 一致
- ⚠️ **find-1**: ESM 模式下原 write 时 `require('node:fs')` 不可用,已通过把 `renameSync` 加入顶部 import 修复
- ⚠️ **find-2**: readEvents 原本只读 `events/*.jsonl`,rotation 后 archive 目录里的事件读不到;已通过 listEventFiles 扩展修复
- ⚠️ **find-3**: validateEvent 严格模式会拒旧 0.9 事件;已通过 readEvents 局部兼容(只对 version 缺失告警,其他错误仍抛)

## 2. 复用(Simplification)

- ✅ `EVENT_TYPE_SCHEMAS` map 统一管理 13 个新 type + 6 个旧 type,避免散落
- ✅ `typeDefaultPayload` 测试 fixture 集中,新增 type 时 1 行即可测试
- ✅ `computeEvaluationMetrics` 复用 `readEvents` 的输出格式,无重复解析
- 💡 **建议 1**(非阻塞):若未来 type > 30 个,`EVENT_TYPE_SCHEMAS` 可考虑拆为 `event-schemas.mjs` 子模块单独维护
- 💡 **建议 2**(非阻塞):CLI handler 当前在 `event-store.mjs` 文件底部,若未来加更多子命令可考虑拆 `cli/event-store.mjs`

## 3. 效率(Efficiency)

- ✅ `appendEvent` 性能 < 50ms(旧测试 `testAppendPerformanceUnder50ms` 仍通过)
- ✅ `readEvents` 走 `readdirSync` + `readFileSync` 单次读,无循环 IO
- ✅ rotation 触发时 `renameSync` 是 O(1),不阻塞
- 💡 **建议 3**(非阻塞):当 archive 文件增多,readEvents 会 O(n) 顺序读所有文件;未来可加索引或 LRU 缓存

## 4. 高度(Altitude / 抽象层级)

- ✅ `EVENT_TYPE_SCHEMAS` 把"哪些 type 合法 + 各自 payload 形状"集中,未来加 type 不需改 validateEvent
- ✅ `computeEvaluationMetrics` 抽象出 §7 6 维度的统一接口,CLI 与 REQ-076 未来 hook 都能复用
- ✅ `getMaxEventLines` 支持 env 优先 + options override,符合"配置可调"原则

## 5. 安全性

- ✅ `appendFileSync` + `JSON.stringify` 无注入风险
- ✅ `readdirSync` + 文件名 `endsWith('.jsonl')` 过滤避免读取意外文件
- ✅ 事件 payload 字段类型校验防止原型链污染
- ⚠️ **find-4**:`getDefaultSessionId` fallback 到 `'session-main'` 是设计选择(避免在无 env 时崩溃),但会被多 session 串写同一文件,这是 F7 债务,REQ-076 处理

## 6. 测试覆盖

- ✅ 9 旧测试 + 6 新测试 = 15 测试全过
- ✅ 覆盖:合法写入、版本注入、版本校验、type 白名单、13 个 type 各自、rotation、metrics 计算、legacy 兼容
- ⚠️ **find-5**:未测 CLI 子命令 `read --since 14d` 的实际时间过滤逻辑(只测了语法解析),留待 REQ-076 补强

## 7. 文档对齐

- ✅ `docs/plans/REQ-2026-075-design.md` §2 列出 13 个新 type,与实现 1:1 对应
- ✅ `docs/plans/REQ-2026-075-evaluation-metrics.md` §1-6 列出 6 维度计分公式,与 `computeEvaluationMetrics` 一致
- ✅ `CONTRIBUTING.md` 新增"事件账本测试"小节,符合 governance-automation rule
- ⚠️ **find-6**:`multi-agent-roadmap.md` §7 仍是路线图原版"6 维度空表头",需在 S3-CP2 填表时按 evaluation-metrics.md 引用(本 REQ 范围外)

## 8. 风险

| 风险 | 严重度 | 缓解 |
|------|--------|------|
| F1 verifier 三入口默认值分裂未修 | CRITICAL | REQ-077 处理 |
| F5 §7 6 维度物理上不可计算 | 已修复(本 REQ) | — |
| F7 worktree 命名空间不在文件路径 | CRITICAL | REQ-076 处理 |
| AC-10 review 部分未走独立 verifier | medium | REQ-077 subagent 跑独立 review |

## 9. 结论

**通过**(实施者自查)。`scripts/event-store.mjs` 实现与设计文档对齐,15 测试全过,governance 通过,CLI 行为符合设计。建议:

- **合并本 REQ**(标记 implementation → review,等待 REQ-077 跑独立 verifier)
- **不阻塞 REQ-076** 启动:F1/F7 仍是 CRITICAL,应并行推进

## 10. 经验沉淀(留待合并到 REQ-075-experience.md)

- ESM 模式下不要用 `require()`,所有 fs 操作走顶部 import
- 跨版本兼容时,validateEvent 严格模式 + readEvents 局部兼容 是干净的分工
- `Object.freeze` 用于 type schema map 防止运行时误改
- `value` 字段应当总是数值,`enabled` 单独控制可用性 — 比 N/A 字符串更可测

<!-- Source: 自查,非独立 verifier 走流程 -->
