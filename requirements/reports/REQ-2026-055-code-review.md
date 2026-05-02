# Code Review: REQ-2026-055

## 范围
- `scripts/req-cli.mjs`：statusCommand 新增 `--id` 分支，提取 `buildReqStatusObject` 共用函数
- `tests/req-status-json.test.mjs`：新增 5 个 `--id` 相关测试
- `README.md`：补 `--id` 用法

## 正确性
- `--id` 模式使用 `getReqPathById` 遍历 in-progress 和 completed 目录，不按目录名推断状态 ✅
- 不存在的 ID 返回 `{ req: null, error: "not_found" }` ✅
- 不带 `--id` 时行为完全不变（默认路径无任何修改） ✅
- `buildReqStatusObject` 将原有 statusCommand 内的字段提取逻辑抽取为独立函数，JSON 和 `--id` 模式共用 ✅

## 安全
- 无用户输入注入风险（`--id` 值只用于文件名匹配和内部逻辑，不拼接到命令或路径中）
- `getReqPathById` 已有 `listReqFiles` 过滤，只匹配 `.md` 且以 `REQ-` 开头的文件 ✅

## 向后兼容
- 默认模式（不带 `--id`）JSON 输出格式不变：`active_req` 字段名保持 ✅
- `--id` 模式使用 `req` 字段名（非 `active_req`），语义更准确：查询的是"这个 REQ 的状态"而非"活跃 REQ" ✅

## 已知限制
- `verification_criteria` 保留原始 Markdown 格式（含 `[x]` 标记），编排器可能需要自行解析
- `updated_at` 仍为 null（未从 REQ 文件中提取修改时间）

## 结论
实现清晰、向后兼容、测试覆盖充分。可以进入 QA。
