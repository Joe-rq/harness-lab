# REQ-2026-036 Code Review 报告

> 2026-04-18

## 变更概览

| 文件 | 操作 | 行数 |
|------|------|------|
| `scripts/invariant-extractor.mjs` | 新增 | ~210 |
| `scripts/req-check.sh` | 修改 | +10/-2 |
| `scripts/req-cli.mjs` | 修改 | +14/-1 |
| `context/invariants/INV-001-*.md` | 新增 | ~30 |
| `context/invariants/INV-002-*.md` | 新增 | ~25 |
| `context/invariants/INV-003-*.md` | 新增 | ~20 |
| `docs/plans/REQ-2026-036-design.md` | 新增 | ~80 |

## 代码质量评估

### invariant-extractor.mjs

**优点**：
- 双模式（--scan/--check）职责清晰
- globMatch 简洁实用
- checkInvariants 只输出到 stderr，不阻断

**问题**：
- YAML frontmatter 解析较脆弱，`message: |` 块依赖缩进正则，建议后续引入 YAML 解析库
- scanExperience 的 `FAILURE_SIGNALS` 正则列表太宽泛，自动提取噪声率高
- 没有对 invariant 文件格式的 schema 校验

**建议**（非阻塞，后续迭代处理）：
- 考虑为 --scan 输出添加 `--dry-run` 模式，只显示候选不写文件
- 后续可引入轻量 YAML 解析替代正则

### req-check.sh 变更

- invariant check 放在 REQ 验证之后、exit 之前，位置正确
- `|| true` 确保不变量检查失败不影响退出码
- 注意：修复了原始 `head-1` 为 `head -1` 的 bug

### req-cli.mjs 变更

- execSync 调用有 10s timeout，合理
- try-catch 包裹，失败不阻塞 complete 流程
- invariantExtractor 路径通过 existsSync 检查

## 安全性

- 无外部输入注入风险（invariant 文件由项目维护者控制）
- execSync 的命令参数是硬编码的脚本路径，不接受用户输入

## 架构评估

新增了 `context/invariants/` 作为"经验回流"的数据层，与现有 `context/experience/` 形成上下游关系。这个分层是合理的——experience 是原始数据，invariants 是提取后的结构化规则。

## 结论

通过。核心实现简洁有效，3 条种子不变量已验证匹配正确。后续迭代可优化自动提取精度和 YAML 解析。
