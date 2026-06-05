# REQ-2026-079 Code Review

**日期**：2026-06-05  
**REQ**：REQ-2026-079

## 审查结论

未发现阻断性问题。

## 变更范围

| 文件 / 入口 | 变更 | 审查结论 |
|-------------|------|----------|
| `.claude/settings.local.json` | SessionStart / PreToolUse hook 从已删除 `.sh` 改为现存 `.js` | 符合本仓库 dogfood 修复目标；未修改模板分发文件 |
| `.git/hooks/commit-msg` | symlink 改为 `../../scripts/commit-msg-check.sh` | 使用相对路径，仓库移动后不再绑定旧绝对路径 |
| `scripts/req-check.js` | 新增 `findActiveReqPath()`，支持 `REQ-YYYY-NNN-slug.md` | 与 `req-cli.mjs` 文件命名契约对齐，保留 exact path 兼容 |
| `scripts/event-store.mjs` | 同月 archive 已存在时 append 后清空当前文件 | 解决重复 rotation 造成 readEvents 重复读事件的问题 |
| `scripts/auto-review.mjs` | `.sh` 语法检查从 shell 字符串改为 `spawnSync('bash', ['-n', fullPath])` | 消除文件名拼接 shell 注入面 |
| `README.md` | 删除“约 1500 行”失实口径 | 改成约 1 万行治理脚本，和当前规模一致 |
| `tests/*` | 增加 slugged REQ、local hook、auto-review、rotation dedup 回归 | 覆盖本次关键失败路径 |

## 重点检查

- `req-check.js` 只接受标准 `REQ-\d{4}-\d{3}` ID 做 slug 查找，避免把 progress 中的异常字符串当 glob。
- rotation 修复不改 archive 文件名策略；只是确保被归档的当前文件不会在下一次 rotation 中再次归档。
- `auto-review.mjs` 已经导入 `spawnSync`，本次只是复用现有 import，没有扩大依赖面。
- `.claude/settings.local.json` 的历史 allow 权限表仍有旧 `.sh` 字符串；这是本 REQ 非目标，不影响实际 hook command。

## 残留风险

- `.git/hooks/commit-msg` 不属于 Git 跟踪文件，后续换机或重新 clone 仍需要重新安装 hook。
- `settings.local.json` 权限表污染仍存在，应单独开清理 REQ，避免和本次核心修复混在一起。

## 结论

本次修复针对已核实缺陷，范围与 REQ 对齐，可以进入 QA。

<!-- Source file: REQ-2026-079-code-review.md -->
