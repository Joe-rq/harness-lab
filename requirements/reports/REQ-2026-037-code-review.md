# REQ-2026-037 Code Review 报告

> 2026-04-25

## 变更概览

| 文件 | 操作 | 行数 |
|------|------|------|
| `context/invariants/TEMPLATE.md` | 新增 | ~25 |
| `context/invariants/INV-001~024` frontmatter | 修改 | +2/条 (status+severity) |
| `scripts/invariant-gate.mjs` | 新增 | ~110 |
| `scripts/invariant-extractor.mjs` | 修改 | +45 (status/severity 解析 + --inject 模式) |
| `scripts/session-start.sh` | 修改 | +10 |

## 代码质量评估

### invariant-gate.mjs

**优点**：
- 双模式 --scan/--mark-draft 职责清晰
- REQUIRED_FIELDS + VALID_* 常量定义，便于扩展
- 跳过 TEMPLATE 文件，不误报

**问题**：
- parseFrontmatter 只处理单行键值对，不处理 triggers 列表——但这不影响质量门禁功能（triggers 是 --check 的职责）
- 退出码 1 用于"有质量问题"，与常规错误码冲突——不过作为 CI 集成点可以接受

### invariant-extractor.mjs 变更

**优点**：
- --inject 模式输出格式清晰，含 severity 标签
- 只注入 active 状态不变量，draft 不注入——生命周期逻辑正确
- --check 模式加了 deprecated 过滤
- --scan 新生成的候选自动带 status: draft + severity: medium

**问题**：
- --inject 输出同时写文件和 stdout，双输出策略需注意消费者不会重复消费
- injectInvariants 的输出未做长度截断（REQ 里约束 <2000 字符），当前 3 条 active 约几百字符，后续需关注

### session-start.sh 变更

- grep -rl 查找 status 行，简单可靠
- 统计行格式与启动面板风格一致

## 安全性

- 无外部输入风险，invariant 文件由项目维护者控制
- .claude/.invariant-injections/ 写入路径通过 ensureDir 创建，无路径遍历风险

## 架构评估

Phase 1 在 REQ-036 基础上补了三个能力：质量门禁（gate）、生命周期（status 字段）、注入扩展（--inject）。三层各司其职，没有耦合。TEMPLATE.md 的结构化字段为后续 draft→active 的审核提供了标准。

## 结论

通过。5 个验收标准全部满足，现有测试无回归。
