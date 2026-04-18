# REQ-2026-036 设计文档：学习闭环 — 经验回流机制

> 2026-04-18 | 方向 1 最小版本

## 核心设计

### 数据流

```
context/experience/*.md
        ↓ (invariant-extractor.mjs --scan)
context/invariants/INV-NNN-slug.md  (结构化规则)
        ↓ (PreToolUse hook 调用 --check)
    警告输出到 stderr → Claude 看到 → 调整行为
        ↑
req:complete 触发重新扫描 → 新 experience 被提取
```

### 三层结构

**Layer 1：不变量提取器** (`scripts/invariant-extractor.mjs`)

两个模式：
- `--scan`：扫描 `context/experience/`，提取可复用模式，生成候选到 `context/invariants/`
- `--check --file <path>`：给定操作目标文件，匹配相关不变量，输出提醒

提取策略：
- 扫描 experience 文档中的"问题"、"错误"、"坑"、"避免"等关键词段落
- 提取涉及的文件路径模式（如 `scripts/*.sh`、`requirements/**`）
- 生成结构化不变量文件，包含：ID、描述、触发条件、提醒文本、来源 experience

**Layer 2：不变量规则格式** (`context/invariants/INV-NNN-slug.md`)

```yaml
---
id: INV-001
title: 模板占位符逃逸
triggers:
  - glob: "requirements/**/*.md"
  - pattern: "Edit|Write"
message: |
  ⚠️ INV-001: 检查是否残留模板占位符（如 {描述...}）
  来源: experience/2026-03-31-req-template-edit-pattern.md
confidence: high
---

## 详细说明
REQ 模板填充时，Edit 工具的 old_string 截断不当会导致章节重复。
预防：Edit 后立即 Read 验证。
```

**Layer 3：Hook 集成** (`req-check.sh`)

在现有 `req-check.sh` 的末尾（通过 REQ 检查后），调用：
```bash
node "$ROOT/scripts/invariant-extractor.mjs" --check --file "$TARGET_FILE"
```

输出不影响退出码（仅提醒，不阻断）。

### req:complete 集成

在 `req-cli.mjs` 的 complete 流程中，experience 写入后触发：
```bash
node scripts/invariant-extractor.mjs --scan --incremental
```

`--incremental` 只扫描新增/修改的 experience 文档。

## 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/invariant-extractor.mjs` | 新增 | 核心提取器 + 匹配器 |
| `context/invariants/` | 新增 | 不变量规则目录 |
| `context/invariants/INV-001-template-placeholder-escape.md` | 新增 | 种子不变量 |
| `context/invariants/INV-002-scope-warning-pattern.md` | 新增 | 种子不变量 |
| `context/invariants/INV-003-edit-truncation-section-dup.md` | 新增 | 种子不变量 |
| `scripts/req-check.sh` | 修改 | 新增不变量检查调用 |
| `scripts/req-cli.mjs` | 修改 | complete 流程触发重新扫描 |

共 7 个文件/目录，其中 4 个新增、3 个修改。

## 依赖

- 无新 npm 依赖
- 依赖现有 Node.js 运行时
- 依赖 `context/experience/` 目录已有内容

## 验证方式

1. `node scripts/invariant-extractor.mjs --scan` 输出提取结果
2. `node scripts/invariant-extractor.mjs --check --file requirements/in-progress/test.md` 验证 INV-001 触发
3. `npm test` 不破坏现有测试
4. req-check.sh 执行时间增量 < 2s
