# Code Review: REQ-2026-054

## 状态
- ✅ 通过

## 变更摘要

新增 `req:status --json` 命令，暴露 REQ 机器可读状态供外部编排器消费。

## 变更文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `scripts/req-cli.mjs` | 修改 | 新增 `statusCommand`、`readExternalMappings`、`findExternalMapping`，注册 status 到 CLI |
| `package.json` | 修改 | 新增 `req:status` 脚本 |
| `README.md` | 修改 | REQ 生命周期章节新增 req:status 用法 |
| `context/invariants/INV-058-external-task-req-mapping.md` | 新增 | 外部任务与 REQ 映射的不变量规则 |
| `tests/req-status-json.test.mjs` | 新增 | 7 个测试用例 |

## 审查项

### 正确性
- ✅ `readExternalMappings` 正确处理三种状态：文件不存在→null、合法 JSON→mappings、损坏 JSON→null + warning
- ✅ 重复映射检测（req_id 和 external_source:external_id 两个维度）
- ✅ 无活跃 REQ 时返回 `{"active_req": null, "external": null}`，字段完整
- ✅ `readiness` 字段基于现有 `validateReqDocument` 判断，复用已有逻辑

### 安全性
- ✅ 无新依赖引入
- ✅ `readExternalMappings` 用 try/catch 包裹 JSON.parse，不会因损坏文件崩溃
- ✅ 不写入任何文件，纯只读操作

### 向后兼容
- ✅ `req:status` 不带 `--json` 时输出人类可读文本
- ✅ 不影响现有 `req:create` / `req:start` / `req:complete` 命令
- ✅ `external-mappings.json` 不存在时不影响任何功能

### 关注点
- `verification_criteria` 输出保留了 `- [ ]` 前缀，编排器消费时需要自行清理。当前可接受，后续迭代可优化。
- `updated_at` 始终为 null，因为 REQ 文件没有更新时间戳。未来可通过 git log 补充，但 6a 不做。

## 结论

实现简洁、边界处理完整、测试覆盖充分。通过。
