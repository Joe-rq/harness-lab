# REQ-2026-025 Code Review

> 评审目标：修复正则替换边界风险
> 日期：2026-04-01
> 评审人：Claude Code (Agent)
> REQ：requirements/in-progress/REQ-2026-025-regex-replace-boundary-fix.md

## 状态

- ✅ 通过

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| scripts/req-cli.mjs | 修复 | `setReqStatusAndPhase` 限定替换范围 |
| tests/governance.test.mjs | 新增 | 边界测试用例 |

## 实现细节

### 修复前

```javascript
function setReqStatusAndPhase(content, status, phase) {
  let nextContent = content.replace(/^- 当前状态：.*$/m, `- 当前状态：${status}`);
  nextContent = nextContent.replace(/^- 当前阶段：.*$/m, `- 当前阶段：${phase}`);
  return nextContent;
}
```

**问题**：正则匹配任意位置的 `- 当前状态：` 模式，可能误替换代码示例中的内容。

### 修复后

```javascript
function setReqStatusAndPhase(content, status, phase) {
  // Extract the ## 状态 section and replace only within it
  const statusSectionPattern = /(## 状态\n+)([\s\S]*?)(?=\n## |$)/;
  const match = content.match(statusSectionPattern);
  if (!match) {
    fail('Missing ## 状态 section in REQ document');
  }

  // Replace status and phase lines only within the section
  let section = match[2];
  section = section.replace(/^- 当前状态：.*$/m, `- 当前状态：${status}`);
  section = section.replace(/^- 当前阶段：.*$/m, `- 当前阶段：${phase}`);

  // Reconstruct the document
  return content.replace(statusSectionPattern, `$1${section.trimEnd()}\n`);
}
```

**改进**：
1. 先定位 `## 状态` 章节
2. 在章节内进行替换
3. 重构文档

### 测试用例

新增 `testSetReqStatusAndPhaseBoundary` 测试：
- 文档包含代码示例中有相同模式
- 验证只有 `## 状态` 章节被修改
- 验证代码示例未被修改

## 评审结论

- 修复正确，边界清晰
- 测试覆盖验证通过

## 自动验证

```
npm test: 7/7 passed
```
