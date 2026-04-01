# REQ-2026-026 Code Review

> 评审目标：添加错误日志持久化
> 日期：2026-04-01
> 评审人：Claude Code (Agent)
> REQ：requirements/in-progress/REQ-2026-026-error-log-persistence.md

## 状态

- ✅ 通过

## 变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| scripts/req-cli.mjs | 新增功能 | 添加 `appendErrorLog` 函数 |
| scripts/req-cli.mjs | 修改 | `fail()` 调用 `appendErrorLog` |

## 实现细节

### 新增函数

```javascript
function appendErrorLog(message, type = 'ERROR') {
  try {
    const logPath = toFullPath('.claude/error.log');
    const timestamp = new Date().toISOString();
    const firstLine = message.split('\n')[0].slice(0, 200);
    const entry = `${timestamp} | ${type} | ${firstLine}\n`;
    mkdirSync(path.dirname(logPath), { recursive: true });
    appendFileSync(logPath, entry, 'utf8');
  } catch {
    // Silently ignore log write failures to avoid masking the original error
  }
}
```

### 修改的 fail() 函数

```javascript
function fail(message) {
  console.error(message);
  appendErrorLog(message, 'FAIL');
  process.exit(1);
}
```

### 日志格式

```
2026-04-01T04:09:48.473Z | FAIL | REQ not found: REQ-NONEXISTENT
```

字段说明：
- 时间戳（ISO 8601）
- 错误类型（FAIL、ERROR 等）
- 错误消息首行（截断至 200 字符）

### 设计决策

1. **静默失败**：日志写入失败不阻断主流程，避免掩盖原始错误
2. **消息截断**：只记录首行且限制 200 字符，保持日志可读性
3. **类型参数**：预留类型字段，未来可扩展不同错误类型

## 评审结论

- 实现简洁，满足验收标准
- 向后兼容，不影响现有流程

## 自动验证

```
npm test: 7/7 passed
手动测试：错误日志正常写入 .claude/error.log
```
