# REQ-2026-066: Stage 1: 独立 verifier session 与 schema 级工具白名单

## 状态
- 当前状态：draft
- 当前阶段：design

## 背景

**用户痛点**:当前 `scripts/auto-review.mjs` 和 `scripts/auto-qa.mjs` 与 worker 跑在**同一 session、同一上下文**,reviewer 看到的是被 worker 思考路径污染过的状态。这种「自己检查自己」的结构是单 AI 自查的典型失效模式 —— reviewer 会「诚恳地告诉你没问题」,因为它评估对象是被自己污染的记忆,做不出真正纠偏。

**业务背景**:本 REQ 是 `docs/plans/multi-agent-roadmap.md` Stage 1 的工程落地。Spike S1-CP2(2026-05-22)已确认 Claude Code 原生 subagent 支持 schema 级 `tools`/`disallowedTools` 白名单,且 subagent 在独立 context window 运行,满足 Worker/Verifier 论证的核心前提(verifier 看不到 worker 上下文 + 物理无写权限)。

**参考**:
- 路线图详细设计:`docs/plans/multi-agent-roadmap.md` §4
- Spike 证据:Claude Code 官方文档 + `~/.claude/agents/42plugin-skill-reviewer.md` 现成示例

## 目标

1. **新建独立 verifier subagent 定义**:在 `.claude/agents/verifier.md` 用 frontmatter `tools` + `disallowedTools` 双重声明,强制只允许 Read/Grep/Glob,硬禁止 Write/Edit/Bash/NotebookEdit/Task
2. **新建启动 + 通信契约**:`scripts/verifier-session.mjs` 负责构造 verifier 调用上下文(JSON envelope,只传 artifact 路径不传内容)并解析返回结果
3. **集成到现有 auto-review / auto-qa**:`scripts/auto-review.mjs` 和 `scripts/auto-qa.mjs` 切换为通过独立 verifier subagent 执行评审,旧逻辑保留为环境变量开关 fallback
4. **真实案例验证**:至少 1 例「同一份代码旧 verifier 漏报、新 verifier 查出」的对照案例,落入 QA 报告

## 非目标

- 不引入跨 session 通信、background agents、worktree 聚合(Stage 2 范围)
- 不做 verifier 二次派生 / 修复回路 / 任务图(Stage 3 范围)
- 不改 invariants 结构、不动 REQ 生命周期
- 不重写现有 reviewer 的判断规则,只改它的「执行环境」

## 颗粒度自检

- [x] 目标数 ≤ 4?(4 个,边界)
- [x] 涉及文件数 ≤ 4?(2 新 + 2 改 = 4)
- [x] 涉及模块/目录 ≤ 4?(`.claude/agents/` + `scripts/` = 2)
- [x] 能否用一句话描述"解决了什么问题"?「让 verifier 在独立 context + 物理无写权限的 subagent 里跑」
- [x] 如果失败,能否干净回滚?保留旧 verifier 路径 + 环境变量开关,`git revert` 即可

## 范围

- 涉及目录 / 模块:`.claude/agents/`、`scripts/`
- 影响接口 / 页面 / 脚本:
  - `.claude/agents/verifier.md`(新建)
  - `scripts/verifier-session.mjs`(新建)
  - `scripts/auto-review.mjs`(修改:增加 subagent 调用分支)
  - `scripts/auto-qa.mjs`(修改:增加 subagent 调用分支)

### 约束(Scope Control)

**豁免项**:
- [x] skip-design-validation(详细设计已在 `docs/plans/multi-agent-roadmap.md` §4,本 REQ 内不另起 design.md 避免冗余)

**允许(CAN)**:
- 在 `.claude/agents/` 新建 verifier subagent 定义文件
- 在 `scripts/` 新建 `verifier-session.mjs`
- 修改 `auto-review.mjs`、`auto-qa.mjs` 增加 subagent 调用路径
- 修改 `package.json` 仅限于添加测试脚本入口(不动现有命令)

**禁止(CANNOT)**:
- 不得修改 `scripts/req-cli.mjs`、`scripts/session-start.js`、`scripts/req-check.js`、`scripts/event-store.mjs`(Stage 2 范围,本 Stage 不动)
- 不得修改 `.claude/settings.json` hook 配置(避免影响其它 hook)
- 不得引入新 npm 依赖(零依赖原则)
- 不得修改任何 invariants(`context/invariants/`)
- 不得改 `progress.txt` 读写路径

**边界条件**:
- 旧 verifier 路径必须保留为 fallback,通过环境变量(如 `HARNESS_VERIFIER_MODE=legacy|subagent`)切换
- 新 verifier subagent 启动延迟 > 30s 时,文档化为已知限制,**不**自动降级(避免静默回退)

## 验收标准

- [ ] `.claude/agents/verifier.md` 存在,frontmatter 同时声明 `tools` 白名单和 `disallowedTools` 黑名单
- [ ] 手工测试:尝试让 verifier 写文件,被工具白名单拦截(留存证据,贴到 QA 报告)
- [ ] `scripts/verifier-session.mjs` 提供清晰 API,JSON envelope 只传 artifact 路径
- [ ] `auto-review.mjs` / `auto-qa.mjs` 在 `HARNESS_VERIFIER_MODE=subagent`(默认)时走新路径,`legacy` 时走旧路径
- [ ] 至少 1 例对照案例:旧 verifier 通过、新 verifier 查出问题,记录入 QA 报告 `## 验证证据`
- [ ] `npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过
- [ ] 现有 review/QA 自动化在 `legacy` 模式下行为完全不变(fallback 健康)

## 设计与实现链接
- 设计稿:`docs/plans/multi-agent-roadmap.md` §4(已豁免独立 design.md)
- 相关规范:`~/.claude/agents/42plugin-skill-reviewer.md`(参照范例)

## 报告链接
- Code Review:`requirements/reports/REQ-2026-066-code-review.md`
- QA:`requirements/reports/REQ-2026-066-qa.md`
- Ship:`requirements/reports/REQ-2026-066-ship.md`(本 REQ 不涉外发布,可在 record 阶段说明不适用)

## 验证计划
- 计划执行的命令:`npm test && npm run docs:verify && npm run check:governance`
- 需要的环境:本仓库 + Claude Code(用于真实启动 verifier subagent)
- 需要的人工验证:
  1. 手动触发 verifier subagent,尝试 Write 操作,确认被拦截
  2. 构造 1 例已知有问题的代码(如缺失 await),分别用 legacy / subagent 模式跑 auto-review,对比结果
  3. 切回 legacy 模式跑一遍现有自动化,确认 fallback 路径无回归

### 反馈与质量检查

#### 元反思检查(verify 阶段)
- [ ] 目标实现:verifier subagent 是否真在独立 context 跑?(看 Claude Code session UI 是否有独立窗口)
- [ ] 旧功能保护:legacy 模式跑 `npm test` 是否全绿?
- [ ] 逻辑正确性:JSON envelope 缺字段时是否优雅报错?subagent 启动失败时是否抛清晰错误而非静默?
- [ ] 完整性:对照路线图 §4.4 退出标准 4 条是否全部满足?
- [ ] 可维护性:`verifier-session.mjs` 是否单一职责?后续 Stage 2 接入 background agents 时是否容易扩展?

#### 对齐检查(record 阶段)
- [ ] 目标对齐:是否解决了「reviewer 看到污染上下文」的原始痛点?(用对照案例证明)
- [ ] 设计对齐:实现是否符合路线图 §4 的描述?偏离点是否在决策日志记录?
- [ ] 验收标准对齐:7 条验收标准是否逐条勾选?

## 阻塞 / 搁置说明
- 原因:无
- 恢复条件:无
- 下一步:无

## 临时实现与债务
- 通信契约使用文件 + JSON envelope,Stage 2 接入事件流后,这一层应迁移到事件流。本 REQ 暂不处理,记录为已知债务。

## 风险与回滚

| 风险 | 应对 |
|------|------|
| Subagent 启动延迟 > 30s 用户不可接受 | 文档化为已知限制,Stage 2 接入 background agents 改善;不自动降级 |
| 信息密度过高导致 reviewer 上下文污染 | JSON envelope 严格限制字段,只传 artifact 路径;路径外内容由 verifier 自行 Read |
| Subagent 不能再 spawn 子 subagent | 本 Stage 不允许 verifier 派生 fixer,修复仍由主 session 完成 |

**回滚方式**:
- `git revert` 本 REQ 全部提交,或
- 设 `HARNESS_VERIFIER_MODE=legacy`,系统行为完全回到当前状态

## 关键决策

- 2026-05-22(Spike):确认 Claude Code 原生 subagent 支持 schema 级工具白名单,本 REQ 走主线方案,不需要 prompt 级降级方案
- 2026-05-22(本 REQ 起草):豁免独立 design.md,以路线图 §4 为设计真相源,避免文档冗余
- 2026-05-22(本 REQ 起草):新 verifier 默认开启(`HARNESS_VERIFIER_MODE=subagent`),legacy 为显式 fallback —— 「灰度」交给环境变量,不引入复杂开关
- 2026-05-31(Spike S1-CP2.5):**结论 A — 可脚本调用**。实测 `claude --agent <name> -p "..." --output-format json` 可从 Node `child_process.spawn` 稳定调用,JSON 输出一次性 parse 成功。详见下方 Spike 记录。

## Spike S1-CP2.5 记录: 调用入口验证

### 调用方式

```bash
claude --agent verifier-spike -p "<prompt>" --output-format json
```

从 Node:
```javascript
import { spawn } from 'child_process';
const proc = spawn('claude', ['--agent', 'verifier-spike', '-p', prompt, '--output-format', 'json']);
// proc.stdout → JSON string
```

### 实测数据

| 测试项 | 结果 | 备注 |
|--------|------|------|
| `--agent` 从文件加载 | ✅ | `.claude/agents/verifier-spike.md` 正确解析 |
| `--output-format json` | ✅ | 返回 `{ type, result, session_id, total_cost_usd, usage, permission_denials, ... }` |
| Node `child_process.spawn` | ✅ | exit 0, JSON 一次性 parse |
| 工具白名单(prompt 层) | ✅ | Agent 主动拒绝 Write 请求 |
| 工具白名单(schema 层) | — | 未触发,因为 prompt 层已拦截;schema 层作为 runtime 兜底 |
| `--max-turns` 超时 | ✅ | `terminal_reason: "max_turns"`, `is_error: true` |
| 不存在 agent 名 | ⚠️ | **静默 fallback 到默认 agent**,需前置校验 |
| 空 prompt | ⚠️ | 无 stdout 输出,JSON parse 失败 |
| `--agents` inline | ❌ 不适用 | 只定义 subagent 供 Agent tool 调用,不约束主 session |

### 性能

| 指标 | 值 |
|------|-----|
| 总延迟 | 12–18s(含 CLI 启动 ~2s) |
| API 延迟 | 5–13s(取决于 turn 数) |
| 费用 | $0.05–0.06/次(简单查询) |

### 输入 envelope 示例

```json
{
  "reqId": "REQ-2026-066",
  "checkType": "scope-compliance",
  "artifactPaths": ["scripts/auto-review.mjs"],
  "instructions": "Read scripts/auto-review.mjs and count functions."
}
```

### 输出结构

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "result": "<agent text output, may contain JSON code block>",
  "session_id": "uuid",
  "total_cost_usd": 0.055,
  "duration_ms": 11987,
  "num_turns": 2,
  "usage": { "input_tokens": 8639, "output_tokens": 383 },
  "permission_denials": [],
  "terminal_reason": "completed"
}
```

### 失败示例

| 场景 | 表现 |
|------|------|
| `--max-turns` 限制 | `is_error: true`, `terminal_reason: "max_turns"`, `result` 为空 |
| 不存在 agent | 静默 fallback,无错误信号 |
| 空 prompt | 无 stdout,parse 失败 |

### 结论

**A — 可脚本调用。** S1-CP3 按此路径实现 `scripts/verifier-session.mjs`。

前置校验要求:
1. 调用前确认 `.claude/agents/verifier.md` 存在(防止静默 fallback)
2. 空结果时明确报错(而非静默)
3. `--max-turns` 作为超时保险

<!-- Source file: REQ-2026-066-stage-1-verifier-session-schema.md -->
