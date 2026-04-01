# REQ-2026-030 Code Review 报告

**日期**：2026-04-01  
**审查人员**：Claude Code  
**状态**：✅ 通过

---

## 变更摘要

在 `scripts/harness-install.mjs` 中添加 `sanitizeFrameworkData()` 函数，用于在安装时清理框架自身的 REQ 数据，避免污染目标项目。

---

## 代码变更

### 新增函数：`sanitizeFrameworkData(targetDir)`

**位置**：`scripts/harness-install.mjs`

**功能**：
1. 清理 `requirements/completed/` - 删除所有 REQ-2026-001 到 REQ-2026-899 的文件
2. 清理 `requirements/in-progress/` - 删除所有 REQ-2026-001 到 REQ-2026-899 的文件，保留 900+ 示例
3. 清理 `requirements/reports/` - 删除所有框架历史报告
4. 重置 `requirements/INDEX.md` - 清空"最近完成"列表，重置活跃/搁置 REQ 为"无"

**关键实现细节**：

```javascript
// 使用正则匹配 REQ 编号
if (/^REQ-2026-\d{3}/.test(file)) {
  const reqNum = parseInt(file.match(/REQ-2026-(\d{3})/)?.[1], 10);
  if (reqNum && reqNum < 900) {
    // 删除框架历史文件
  }
}
```

### 修改函数：`main()`

在安装流程中，复制文件后、创建 progress.txt 前调用 `sanitizeFrameworkData()`：

```javascript
// 复制文件
const results = copyFiles(...);

// 清理框架自身数据
const sanitizeResults = sanitizeFrameworkData(targetDir);
log(`   ✅ 已移除: ${sanitizeResults.removed.length} 个框架文件`);
```

---

## 审查检查项

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 代码风格一致性 | ✅ | 遵循现有代码风格 |
| 错误处理 | ✅ | 使用 fs.existsSync 检查文件存在性 |
| 边界条件 | ✅ | 正确处理 .gitkeep、README.md 等保留文件 |
| 正则表达式准确性 | ✅ | 正确匹配 REQ-YYYY-NNN 格式 |
| 函数导出 | ✅ | 使用 export 以便测试 |
| 不影响现有功能 | ✅ | 所有单元测试通过 |

---

## 潜在问题与建议

### 1. 编号范围硬编码

**问题**：900 作为示例/框架数据的分界线是硬编码的。

**建议**：当前实现可接受，因为示例 REQ 编号（900+）是框架约定。如需更灵活，可改为配置项。

### 2. INDEX.md 替换逻辑

**问题**：使用正则替换 INDEX.md 内容，如果模板格式变化可能失效。

**建议**：当前实现可接受，因为 INDEX.md 模板由框架控制。

---

## 测试覆盖

- ✅ 单元测试：`npm test` 全部通过（9/9）
- ✅ 手动验证：创建测试环境验证清理逻辑
- ✅ 边界测试：验证 .gitkeep、README.md、示例 REQ 保留

---

## 结论

**✅ Code Review 通过**

代码实现正确，测试覆盖充分，可以合并。
