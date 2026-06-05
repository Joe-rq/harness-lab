# Code Review: REQ-2026-080

## 基本信息
- REQ: REQ-2026-080-entry-docs-governance-coverage
- 审查范围: 文档与代码偏移修复（15 项审计偏移）
- 提交: `582200b`
- 审查日期: 2026-06-06

## 审查结论: PASS

## 改动概览

### 代码修正（无文档偏移）
| 文件 | 改动 | 风险 |
|------|------|------|
| `scripts/risk-tracker.mjs:37` | R4 规则 `req-check.sh` → `req-check.js` | 低：正则匹配字符串变更 |
| `.claude/settings.local.json` | 删除 6 条失效权限 | 无：纯清理 |

### Skill 同步（1 文件）
| 文件 | 改动 | 风险 |
|------|------|------|
| `.claude/commands/harness-setup.md:66,82` | CLI 列表补全 + 初始化描述对齐 SKILL.md | 低：文档修正 |

### 入口文档覆盖（4 文件）
| 文件 | 改动 | 风险 |
|------|------|------|
| `README.md` | 命令表格 +1 行；新增高级治理机制小节 | 低：纯增量 |
| `AGENTS.md` | 目录树补全；高级 hook 表格 | 低：纯增量 |
| `CLAUDE.md` | 两处前提说明 blockquote | 低：纯增量 |
| `.codex/hooks.json` | 补齐 PreCompact + SessionEnd | 中：配置变更 |

### /simplify 清理（同提交）
- AGENTS.md: 4 个一句话小节合并为表格
- CLAUDE.md: 两处前提统一措辞模板

## 检查项

- [x] 所有改动均可追溯到用户请求（审计偏移修复）
- [x] 无超出范围的"顺手改进"
- [x] 新增内容与已有文档风格一致
- [x] `.codex/hooks.json` 的 PreCompact/SessionEnd 与 `settings.local.json` 结构一致
- [x] 删除的权限条目均为失效条目（对应 .sh 文件已不存在或无效路径）
- [x] `npm test` 通过（28 + 12 + 11 + 21 = 72 测试）
- [x] `npm run check:governance` 通过
- [x] `npm run docs:verify` 通过
- [x] CI 绿灯

## 已知遗留

1. `.codex/hooks.json` 与 `settings.local.json` 手动维护两份 hook 配置，无自动同步机制（/simplify 审查发现，架构变更范围超出本 REQ）
2. `risk-tracker.mjs` 的 R4 规则仍为手动白名单（`commit-msg-check.sh` 保留，因该文件实际存在）
