# REQ-2026-047: Phase 5.1 Watchdog（看门狗）

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 0-4 建立了 REQ 强制、安全模式、范围防护、风险追踪、自审查等机制，但缺少对"AI 长时间运行中停滞/循环"的主动检测。当前 loop-detection.mjs 只检测 per-file 编辑循环，无法检测 REQ 级别的停滞（如一个 REQ 长时间无阶段推进）或状态循环（如同一 REQ 在 in-progress/blocked 间反复切换）。

## 目标
- 新增 `scripts/watchdog.mjs`：周期检查 REQ 状态，检测停滞和循环，超阈值时通过 additionalContext 注入提醒
- 可作为 PostToolUse hook 运行（每次操作后检查），也可 CLI 独立运行（诊断模式）

## 非目标
- 不做 CronCreate 心跳调度（Claude Code 会话内不适合长驻进程）
- 不做自动修复（只提醒，不替 agent 做决策）
- 不做 REQ 内容检查（那是 stop-evaluator 的职责）

## 颗粒度自检

- [x] 目标数 ≤ 4？（1 个脚本 + 状态文件 + hook 注册 = 3）
- [x] 涉及文件数 ≤ 4？（watchdog.mjs、.watchdog-state、settings.local.json = 3）
- [x] 涉及模块/目录 ≤ 4？（scripts/、.claude/ = 2）
- [x] 能否用一句话描述"解决了什么问题"？（检测 REQ 停滞/循环并注入提醒）
- [x] 如果失败，能否干净回滚？（删除脚本 + 移除 hook 注册即可）

## 范围

- 涉及文件：
  - `scripts/watchdog.mjs`
  - `.claude/settings.local.json`
  - `.claude/.watchdog-state`
- 涉及目录 / 模块：
  - `scripts/`
  - `.claude/`
  - `requirements/reports/**`
  - `requirements/in-progress/**`

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（小改动无需设计文档）
- [ ] skip-req-validation（紧急修复跳过 REQ 内容检查）
- [x] skip-experience（本 REQ 无值得沉淀的复用经验）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/watchdog.mjs`、`.claude/settings.local.json`
- 可新增的测试 / 脚本：`scripts/watchdog.mjs`

**禁止（CANNOT）**：
- 不可修改已有的 hook 脚本（loop-detection、stop-evaluator 等）
- 不可引入外部依赖

**边界条件**：
- 纯 Node.js stdlib 实现

## 验收标准
- [ ] watchdog.mjs 能检测 REQ 停滞（同一 REQ 阶段长时间不变）
- [ ] watchdog.mjs 能检测 REQ 状态循环（同一 REQ 反复切换状态）
- [ ] 停滞/循环超阈值时，通过 additionalContext 注入提醒
- [ ] 状态持久化到 .claude/.watchdog-state，支持跨会话续传
- [ ] 注册为 PostToolUse Write|Edit hook，不影响已有的 loop-detection 和 risk-tracker
- [ ] 支持 CLI 诊断模式：`node scripts/watchdog.mjs --diagnose`

## 设计与实现链接
- 设计稿：无（逻辑简单，直接实现）
- 相关规范：路线图 Phase 5.1

## 报告链接
- Code Review：`requirements/reports/REQ-2026-047-code-review.md`
- QA：`requirements/reports/REQ-2026-047-qa.md`

## 验证计划
- 计划执行的命令：
  - `node scripts/watchdog.mjs --diagnose`
  - `npm test`
- 需要的环境：无特殊要求
- 需要的人工验证：手动测试停滞检测（创建 mock 状态文件）

### 反馈与质量检查

#### 元反思检查（verify 阶段）

- [ ] **目标实现**：停滞检测和循环检测是否都实现？
- [ ] **旧功能保护**：loop-detection 和 risk-tracker 是否正常共存？
- [ ] **逻辑正确性**：阈值判断和状态持久化是否正确？
- [ ] **完整性**：CLI 诊断模式是否可用？
- [ ] **可维护性**：代码是否清晰？

#### 对齐检查（record 阶段）

- [ ] **目标对齐**：实现是否服务于检测 REQ 停滞的目标？
- [ ] **设计对齐**：是否与路线图 Phase 5.1 定义一致？
- [ ] **验收标准对齐**：6 条验收标准是否全部满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：PostToolUse hook 过多导致性能影响（已有 loop-detection + risk-tracker，再加 watchdog = 3 个）
- 回滚方式：移除 settings.local.json 中的 hook 注册，删除 watchdog.mjs

## 关键决策
- 2026-04-27：不做 CronCreate 心跳调度，改为 PostToolUse hook 被动检查（每次文件操作后检查一次），避免长驻进程问题
- 2026-04-27：状态持久化到 .claude/.watchdog-state 而非 per-session 文件，支持跨会话检测停滞
