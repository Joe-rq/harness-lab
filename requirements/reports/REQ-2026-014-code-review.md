# REQ-2026-014 Code Review

**日期**：2026-03-29
**审查者**：AI Assistant
**状态**：✅ 通过

## 变更摘要

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `scripts/template-guard.mjs` | 新增 | 统一 placeholder guard 行为 |
| `scripts/harness-install.mjs` | 修改 | 安全增量更新目标项目 `package.json`，自动复用真实命令并补 placeholder |
| `package.json` | 修改 | 模板仓库 guard 脚本改为复用 `template-guard.mjs` |
| `tests/governance.test.mjs` | 修改 | 覆盖真实命令保留、`verify` 自动生成、placeholder fallback 场景 |
| `README.md` / `AGENTS.md` / `CONTRIBUTING.md` / `.claude/commands/harness-setup.md` | 修改 | 同步接入后命令绑定新契约 |
| `scripts/check-governance.mjs` | 修改 | 把 `template-guard.mjs` 和新 package script 契约纳入检查 |

## 主要检查点

### 正确性

- [x] 安装器只在缺失或 placeholder 情况下写入 `lint / test / build / verify`
- [x] 已存在的真实脚本会被保留，不会被覆盖
- [x] `verify` 会基于已有真实脚本组合生成，而不是盲目写死三段链路
- [x] 缺失命令会落到统一的 `node scripts/template-guard.mjs <name>` placeholder

### 可维护性

- [x] guard 文案集中到单一脚本，不再在 `package.json` 里维护多段内联 `node -e`
- [x] 自动绑定规则保守，只依赖标准脚本名，不猜测非标准语义
- [x] 安装报告显式展示 `preserved / generated / placeholder-added` 状态，便于接手

### 风险评估

- [x] 目标项目脚本更新是增量式的；已有真实脚本和已有自定义 `verify` 都会被保留
- [x] 即使目标项目没有任何真实命令，也会得到明确 placeholder，而不是静默成功

## 发现的问题

本次 review 未发现新的阻断问题。

## 结论

这次改动把“手动绑定真实命令”的主要摩擦点收敛成了两个更可控的状态：

1. 已有真实命令的项目，安装后直接得到可用 `verify`。
2. 缺失真实命令的项目，安装后立刻看到明确 placeholder 和缺口报告。

建议合并。
