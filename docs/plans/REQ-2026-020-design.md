# REQ-2026-020 Design

## Background

治理框架存在漏洞：`check-governance.mjs` 只检查设计文档是否存在，`req:start` 只验证 REQ 文件内容。

可以在 `docs/plans/REQ-xxx-design.md` 放一个空模板，通过所有治理检查后开始实施。

## Goal

- 在 `req:start` 阶段强制验证设计文档内容
- 与现有 REQ 内容验证机制保持一致
- 提供豁免机制处理小改动场景

## Scope

### In scope

- 在 `req-validation.mjs` 中新增设计文档验证函数
- 在 `req-cli.mjs` 的 `startCommand` 中调用验证
- 支持通过 REQ 约束章节标注豁免
- 补充测试用例

### Out of scope

- 修改 `check-governance.mjs`（职责不同）
- 验证设计文档质量（只检查占位符）
- 验证报告文件内容（仅检查存在性）

## Product Review

### User Value

- 解决的问题：治理框架漏洞，空设计文档可绕过检查
- 目标用户：使用 Harness Lab 的开发者和 agent
- 预期收益：确保设计文档有实际内容才能开始实施

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：
  - `scripts/req-validation.mjs` - 新增验证函数
  - `scripts/req-cli.mjs` - startCommand 中调用验证
- 依赖方向：
  - 复用现有 REQ 验证框架
  - 复用设计文档模板占位符列表
- 需要新增或修改的边界：
  - 设计文档验证逻辑
  - 豁免机制检测

### Verification

- 自动验证：
  - `npm test` - 单元测试
  - `npm run check:governance` - 治理检查
- 人工验证：
  - 创建空设计文档的 REQ，确认 `req:start` 阻断
  - 填写设计文档后，确认 `req:start` 通过
  - 标注豁免后，确认 `req:start` 跳过验证
- 回滚：
  - 移除验证逻辑
  - 删除测试用例

## Implementation Details

### 1. 设计文档验证函数 (req-validation.mjs)

```javascript
export function validateDesignDocument(reqId, reqContent) {
  const issues = [];
  const designPath = `docs/plans/${reqId}-design.md`;

  // 检查豁免标记
  if (hasDesignExemption(reqContent)) {
    return { valid: true, issues: [], skipped: true };
  }

  // 检查文件存在
  if (!existsSync(toFullPath(designPath))) {
    issues.push(`Missing design document: ${designPath}`);
    return { valid: false, issues, skipped: false };
  }

  // 检查模板占位符
  const content = readFileSync(toFullPath(designPath), 'utf8');
  const placeholders = [
    '补充本次需求的目标',
    '补充本次需求包含的内容',
    '补充本次需求不包含的内容',
    '解决的问题：',
    '目标用户：',
    '预期收益：',
    'Proceed / Revise / Defer',
    '影响模块：',
    '依赖方向：',
    '需要新增或修改的边界：',
    '自动验证：',
    '人工验证：',
    '回滚：',
  ];

  for (const placeholder of placeholders) {
    if (content.includes(placeholder)) {
      issues.push(`Design doc still has placeholder: "${placeholder}"`);
    }
  }

  return { valid: issues.length === 0, issues, skipped: false };
}

function hasDesignExemption(reqContent) {
  // 检查约束章节是否有设计文档豁免标记
  const constraintSection = getSection(reqContent, '### 约束（Scope Control');
  return constraintSection.includes('设计文档豁免') ||
         constraintSection.includes('skip-design-validation');
}
```

### 2. startCommand 中调用 (req-cli.mjs)

```javascript
// 在 REQ 验证之后添加
const designValidation = validateDesignDocument(reqId, req.content);
if (!designValidation.valid) {
  fail([
    `Cannot start ${reqId}: design document validation failed`,
    ...designValidation.issues,
    '',
    'Please fill in the design doc before starting implementation.',
    'For small changes, add "设计文档豁免" in the Scope Control section.',
  ].join('\n'));
}
if (designValidation.skipped) {
  console.log('Design document validation skipped (exemption marked).');
}
```

### 3. 测试用例

```javascript
// tests/design-validation.test.mjs
describe('Design Document Validation', () => {
  it('should block empty design doc', () => {
    // 创建空设计文档的 REQ
    // 运行 req:start
    // 期望失败
  });

  it('should pass filled design doc', () => {
    // 创建填写完整设计文档的 REQ
    // 运行 req:start
    // 期望成功
  });

  it('should skip validation when exempted', () => {
    // 创建标注豁免的 REQ
    // 运行 req:start
    // 期望跳过验证
  });
});
```
