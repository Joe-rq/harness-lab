# Code Review: REQ-2026-018

## 审查范围
- `scripts/req-cli.mjs` - completeCommand 函数
- `tests/governance.test.mjs` - 测试用例更新

## 改动摘要
在 `completeCommand` 中添加报告文件存在检查：
- 检查 `code-review` 和 `qa` 报告是否存在
- 缺失时报错并提示用户创建

## 代码质量
- ✅ 逻辑简洁：遍历必需报告类型，检查文件存在
- ✅ 错误提示清晰：列出缺失的报告文件
- ✅ 向后兼容：已存在的 REQ 不受影响

## 实现代码
```javascript
const requiredReports = ['code-review', 'qa'];
const missingReports = [];
for (const reportType of requiredReports) {
  const reportPath = `requirements/reports/${reqId}-${reportType}.md`;
  if (!existsSync(toFullPath(reportPath))) {
    missingReports.push(reportPath);
  }
}
if (missingReports.length > 0) {
  console.error(`Cannot complete ${reqId} because required reports are missing:`);
  // ...
  process.exit(1);
}
```

## 状态
- ✅ 通过
