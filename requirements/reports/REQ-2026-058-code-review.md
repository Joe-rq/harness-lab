# Code Review: REQ-2026-058

## Findings

未发现阻断性问题。

## Review Notes

- `scripts/worktree-utils.mjs` 新增 worktree 检测和本地进度路径解析，API 简洁集中：`getWorktreeId`、`getProgressPath`、`safeBranchName`、`readProgressContent`、`extractActiveReq`。
- `req-cli.mjs` 改造彻底：
  - `toFullPath()` 增加 `path.isAbsolute()` 防护，避免 `getProgressPath()` 返回绝对路径时被重复拼接
  - `updateProgress()` 使用 `getProgressPath(root)` 替代硬编码 `.claude/progress.txt`
  - `updateIndex()` 从单活跃 REQ 改为列表式管理，支持 `removeActiveId` 参数
  - `createCommand()` / `startCommand()` 改为检查**本 worktree** 的活跃 REQ，允许多 worktree 并行启动不同 REQ
  - `statusCommand()` 默认读取本地 progress，`--all` 才展示 INDEX 全局视图
- `session-start.js`、`precompact-notify.mjs`、`session-reflect.mjs` 均通过 `getProgressPath()` 读取正确的本地进度文件。
- `.claude/commands/resume.md` 和 `self-review.md` 将第 1 步从直接读取 `progress.txt` 改为运行 `npm run req -- status`，避免 worktree 路径感知泄漏到命令文档。
- `README.md` 新增 worktree 支持章节和 `.claude/worktrees/` 目录说明。
- 向后兼容：主仓库（非 worktree）`getWorktreeId()` 返回 `null`，`getProgressPath()` 回退到原有 `.claude/progress.txt` 路径，行为 100% 不变。

## Review Notes（补充修复项）

- `session-start.sh` 和 `req-check.sh` 已通过 `node --input-type=module -e` 调用 `worktree-utils.mjs` 的 `getProgressPath()`，动态获取 worktree 对应的 progress.txt 路径。
- 同理，`.req-exempt` 豁免路径也通过 `getExemptPath()` 实现 worktree 本地隔离：worktree 场景下优先检查 `.claude/worktrees/{id}/.req-exempt`，回退到全局 `.claude/.req-exempt`。

## Residual Risk

- 分支名安全化仅替换 `/`，其他特殊字符（如 `\`、空格）在极端场景可能产生不合法目录名，但这类分支名在 git worktree 创建时通常已被拒绝。

## Conclusion

改动符合方案 A（本地隔离），核心路径覆盖完整，hook 脚本和豁免机制均已适配 worktree，向后兼容有保障。
