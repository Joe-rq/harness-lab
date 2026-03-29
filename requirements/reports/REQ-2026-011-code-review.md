# REQ-2026-011 Code Review

**日期**：2026-03-29
**审查者**：AI Assistant
**状态**：✅ 通过

## 变更摘要

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `scripts/harness-install.mjs` | 修改 | 修复安装器模块清单、hook 选择逻辑和 settings 写入结构 |
| `README.md` | 修改 | 恢复治理自检所需入口说明，并修复手动接入路径列表 |
| `CLAUDE.md` | 修改 | 明确模板仓库入口文档 / 治理脚本改动后的验证命令 |
| `.claude/commands/harness-setup.md` | 修改 | 对齐安装文档与安装器真实行为 |

## 主要检查点

### 正确性

- [x] 安装器默认带 hook 时会显式选中 `hook` 模块，不再出现“已配置 hook 但未安装 hook 模块”的分叉
- [x] CLI 模块复制的脚本与仓库真实存在的脚本一致，不再创建伪造的 `docs-impact.mjs`
- [x] `settings.local.json` 写入 `hooks.PreToolUse`，与 `.claude/settings.example.json` 契约一致
- [x] README 恢复了治理自检依赖的固定入口文案和示例链接

### 一致性

- [x] `README.md`、`CLAUDE.md`、`/harness-setup`、安装器模块清单描述的是同一套治理产物
- [x] `npm run docs:verify` 与 `npm run check:governance` 都以真实命令通过

### 可维护性

- [x] 未放宽 `scripts/check-governance.mjs` 断言来掩盖问题
- [x] 修复集中在契约对齐层，没有引入新依赖或新工作流分支

## 发现的问题

本次 review 未发现新的阻断问题。

## 结论

这次修复恢复了 Harness Lab 最关键的三方契约一致性：

1. 入口文档能通过模板自检。
2. 安装器复制的治理骨架与文档描述一致。
3. hook 配置结构与示例配置一致。

建议合并。
