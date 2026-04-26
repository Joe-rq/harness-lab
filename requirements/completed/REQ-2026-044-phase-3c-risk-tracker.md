# REQ-2026-044: Phase 3C 风险追踪

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 3B 建立了范围强制（scope-guard），防止 AI 修改 REQ 声明范围外的文件。但范围是布尔判断——在范围内/不在范围内。实际操作中，即使文件在范围内，不同文件的风险等级也不同：修改 `.claude/settings.local.json` 比修改 `scripts/foo.mjs` 风险更高；修改 `scripts/req-check.sh` 比修改 `scripts/harness-doctor.mjs` 风险更高。需要一个连续的风险评估机制，在高风险操作时注入额外提醒。

## 目标
1. risk-tracker.mjs 在 PostToolUse 时根据文件路径评估风险等级（R0-R4）
2. 棘轮机制：当前会话的风险等级只升不降
3. R3+ 操作触发额外检查提醒

## 非目标
- 不做实时告警通知（只通过 hook 输出提醒）
- 不做跨会话风险累积（每次会话重置）
- 不做操作回滚（只提醒，不阻断）

## 颗粒度自检
- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（3 个文件：risk-tracker.mjs、session-start.sh、settings.local.json）
- [x] 涉及模块/目录 ≤ 4？（2 个：scripts/、.claude/）
- [x] 能否用一句话描述"解决了什么问题"？（对高风检操作注入额外检查提醒）
- [x] 如果失败，能否干净回滚？（删除 risk-tracker.mjs + 撤销 settings 改动）

## 范围

> 声明本 REQ 允许修改的文件/目录（scope-guard 据此拦截越界操作）。
> 支持通配符：`*`（单层匹配）、`**`（任意深度）。无声明则不拦截（向后兼容）。

- 涉及文件：
  - `scripts/risk-tracker.mjs`
  - `scripts/session-start.sh`
  - `.claude/settings.local.json`
  - `requirements/in-progress/REQ-2026-044-*.md`
  - `requirements/reports/REQ-2026-044-*.md`
- 涉及目录 / 模块：scripts/
- 影响接口 / 页面 / 脚本：PostToolUse hook 链

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（本 REQ 规模小，3 个文件改动）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/risk-tracker.mjs（新建）、scripts/session-start.sh（修改）、.claude/settings.local.json（修改）
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：scripts/loop-detection.mjs、scripts/scope-guard.mjs、scripts/stop-evaluator.mjs
- 不可引入的依赖 / 操作：只使用 Node.js stdlib

**边界条件**：
- risk-tracker 与 loop-detection 共存于 PostToolUse 阶段
- risk-tracker 只提醒不阻断（PostToolUse 输出不是 decision）

## 验收标准
- [ ] risk-tracker 根据文件路径正确评估风险等级（R0-R4）
- [ ] 棘轮机制：风险等级只升不降
- [ ] R3+ 操作触发额外检查提醒（通过 hook stderr 输出）
- [ ] session-start.sh 显示当前会话风险等级
- [ ] 现有测试全部通过

## 设计与实现链接
- 设计稿：无（本 REQ 规模小，直接实施）
- 相关规范：unified-roadmap.md Phase 3C 章节

## 报告链接
- Code Review：`requirements/reports/REQ-2026-044-code-review.md`
- QA：`requirements/reports/REQ-2026-044-qa.md`

## 验证计划
- 计划执行的命令：`npm test`
- 需要的环境：本地开发环境
- 需要的人工验证：
  1. 修改 .claude/settings.local.json → 应触发 R3+ 提醒
  2. 修改 scripts/risk-tracker.mjs → 应触发 R3 提醒
  3. 修改 requirements/xxx.md → 应为 R1，无提醒
  4. 棘轮机制：先改 R1 文件再改 R3 文件 → 风险从 R1 升到 R3

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现
- [ ] 旧功能保护
- [ ] 逻辑正确性
- [ ] 完整性
- [ ] 可维护性

#### 对齐检查（record 阶段）
- [ ] 目标对齐
- [ ] 设计对齐
- [ ] 验收标准对齐

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：PostToolUse hook 输出过多噪音
- 回滚方式：删除 risk-tracker.mjs + 移除 settings.local.json 中的 hook 注册

## 关键决策
- 2026-04-26：risk-tracker 与 loop-detection 共存于 PostToolUse。loop-detection 用 stdout（JSON），risk-tracker 用 stderr（纯文本提醒），避免输出格式冲突。
- 2026-04-26：风险等级定义基于文件路径模式，不需要 AI 理解语义。R0=无风险(Read)、R1=低(文档/测试)、R2=中(普通源码)、R3=高(hook脚本/配置)、R4=极高(治理核心脚本)。

<!-- Source file: REQ-2026-044-phase-3c-risk-tracker.md -->
