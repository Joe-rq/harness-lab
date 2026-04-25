# REQ-2026-037: Phase 1: invariant quality gate, lifecycle, and injection

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

REQ-036 建立了不变量提取器（--scan + --check），已有 24 条不变量。但系统只做到了"记录"和"部分提醒"，还没做到"回流驱动"：
1. 24 条不变量无状态字段（draft/active/deprecated），质量参差不齐，自动扫描候选噪声大
2. 不变量模板缺失结构化字段（触发条件、文件模式、严重级别、验证方法）
3. 注入只覆盖 req-check.sh（PreToolUse），未覆盖 Stop/SessionEnd 等关键节点
4. session-start 启动时无不变量统计，用户无法感知系统状态

## 目标

1. 不变量模板包含触发条件、文件模式、严重级别、验证方法 4 个结构化字段
2. draft → active → deprecated 生命周期可运转（新扫描默认 draft，需人工激活）
3. invariant-extractor.mjs 新增 `--inject` 模式，生成 `<system-reminder>` 格式注入文本
4. session-start.sh 显示不变量统计（总条数 / active 数 / 最近新增）

## 非目标

- 不做不变量自学习（Phase 5 范畴）
- 不做跨项目共享（Phase 6 范畴）
- 不做 Stop/SessionEnd hook 本身（Phase 3A 范畴），只做注入文本生成
- 不删除现有不变量，只标记状态

## 范围
- 涉及目录 / 模块：context/invariants/、scripts/、.claude/
- 影响接口 / 页面 / 脚本：invariant-extractor.mjs、session-start.sh

### 约束（Scope Control，可选）

- [x] skip-design-validation: 4 实体变更，REQ 内联设计，无需独立设计稿

**允许（CAN）**：
- 修改 context/invariants/TEMPLATE.md（新建）
- 修改 context/invariants/INV-*.md frontmatter（加 status 字段）
- 修改 scripts/invariant-extractor.mjs（加 --inject、--gate 模式）
- 新建 scripts/invariant-gate.mjs
- 修改 scripts/session-start.sh（加统计输出）

**禁止（CANNOT）**：
- 不修改 scripts/req-check.sh 的核心阻断逻辑
- 不修改 .claude/settings.local.json（Phase 3A 再加 hook 注册）
- 不引入新的 npm 依赖

**边界条件**：
- invariant-gate.mjs 执行时间 < 2s
- --inject 输出文本总长 < 2000 字符（避免注入膨胀）

## 验收标准
- [ ] TEMPLATE.md 包含 id/title/triggers/severity/verification/status 四个结构化字段
- [ ] 24 条现有不变量全部补充 status 字段（手工审核后标记 active 或 draft）
- [ ] `invariant-gate.mjs --scan` 能标记缺失结构化字段的条目
- [ ] `invariant-extractor.mjs --inject` 读取 active 不变量，生成注入文本
- [ ] `session-start.sh` 显示不变量统计行
- [ ] 现有 11 个测试仍通过

## 设计与实现链接
- 设计稿：本 REQ 内联（4 实体，无需独立设计稿）
- 相关规范：unified-roadmap.md Phase 1

## 报告链接
- Code Review：`requirements/reports/REQ-2026-037-code-review.md`
- QA：`requirements/reports/REQ-2026-037-qa.md`
- Ship：不适用（非发布类型）

## 验证计划
- `node scripts/invariant-gate.mjs --scan` → 输出质量不达标条目
- `node scripts/invariant-extractor.mjs --inject` → 输出注入文本，只含 active 条目
- `bash scripts/session-start.sh` → 包含不变量统计行
- `npm test` → 11 个现有测试通过
- 手工验证：新 --scan 出的不变量默认为 draft 状态

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：24 条不变量逐条审核耗时较长
- 回滚方式：git revert，frontmatter 变更为追加式（加字段不删字段），向后兼容

## 关键决策
- 2026-04-25：4 实体边界——TEMPLATE + gate + extractor + session-start，不加独立设计稿
- 2026-04-25：status 字段加在 frontmatter 中，不新建独立索引文件，保持不变量文件自包含

<!-- Source file: REQ-2026-037-phase-1-invariant-quality-gate-lifecycle-and-injection.md -->
