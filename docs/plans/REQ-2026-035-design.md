# REQ-2026-035 Design: 错误分类器

## Background

当前治理 Hook 的错误输出是非结构化的自由文本，缺少错误代码和恢复建议。

## Goal

- 定义结构化的错误分类体系
- 提供清晰的恢复策略
- 保持向后兼容

## Scope

### In scope

- 错误类型定义
- `error-classifier.mjs` 模块实现
- 改造现有脚本输出

### Out of scope

- 自动执行恢复
- 数据库存储

## Error Classification

### 错误类型定义

| 代码 | 类型 | 描述 | 恢复策略 |
|------|------|------|----------|
| E001 | NO_ACTIVE_REQ | 无活跃 REQ | `npm run req:create -- --title "..."` |
| E002 | REQ_NOT_FOUND | REQ 文件不存在 | 检查 `requirements/` 目录 |
| E003 | REQ_DRAFT_STATUS | REQ 仍为 draft 状态 | `npm run req:start -- --id REQ-xxx` |
| E004 | REQ_TEMPLATE_EMPTY | REQ 模板未填充 | 编辑 REQ 文件，填充背景、目标等 |
| E005 | DOCS_DRIFT | 文档同步缺失 | `npm run docs:impact` 查看影响 |
| E006 | MISSING_REPORTS | 缺少必需报告 | 创建 code-review / qa 报告 |
| E007 | MISSING_EXPERIENCE | 缺少经验文档 | `npm run req:experience -- --id REQ-xxx` |
| E008 | EXEMPT_ABUSED | 豁免机制滥用 | 检查 `.claude/exempt-audit.log` |

### 输出格式

**错误块格式**：

```
╔══════════════════════════════════════════════════════════════╗
║              🚫 GOVERNANCE BLOCKED                          ║
╠══════════════════════════════════════════════════════════════╣
║  错误代码: E001                                              ║
║  错误类型: NO_ACTIVE_REQ                                     ║
║  描述: 无活跃 REQ，代码修改需要 REQ                           ║
╠══════════════════════════════════════════════════════════════╣
║  恢复策略:                                                   ║
║    1. 创建 REQ:                                              ║
║       npm run req:create -- --title "Your feature"           ║
║    2. 或临时豁免（仅限小改动）:                                ║
║       touch .claude/.req-exempt                              ║
╚══════════════════════════════════════════════════════════════╝
```

**日志格式**：

```
2026-04-13T10:00:00.000Z | E001 | NO_ACTIVE_REQ | No active REQ found
```

## Implementation

### 1. error-classifier.mjs

```javascript
// 错误类型定义
export const ErrorTypes = {
  NO_ACTIVE_REQ: {
    code: 'E001',
    type: 'NO_ACTIVE_REQ',
    message: '无活跃 REQ，代码修改需要 REQ',
    recovery: [
      '创建 REQ:',
      '  npm run req:create -- --title "Your feature"',
      '或临时豁免（仅限小改动）:',
      '  touch .claude/.req-exempt',
    ],
  },
  // ... 其他类型
};

// 格式化错误块
export function formatErrorBlock(errorType, context = {}) { ... }

// 记录错误日志
export function logError(errorType, context = {}) { ... }
```

### 2. 改造 req-check.sh

```bash
# 引用 Node 模块生成错误块
ERROR_OUTPUT=$(node "$ROOT/scripts/error-classifier.mjs" --type NO_ACTIVE_REQ --context "file=$TARGET_FILE")
echo "$ERROR_OUTPUT"
exit 2
```

### 3. 改造 req-validation.mjs

```javascript
import { formatErrorBlock, logError } from './error-classifier.mjs';

function failWithClassification(errorType, context) {
  const block = formatErrorBlock(errorType, context);
  console.error(block);
  logError(errorType, context);
  process.exit(1);
}
```

## Verification

- 单元测试：`tests/error-classifier.test.mjs`
- 集成测试：触发各种错误场景，验证输出格式
- 手动验证：检查错误信息的可读性
