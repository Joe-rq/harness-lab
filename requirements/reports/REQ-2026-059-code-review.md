# Code Review: REQ-2026-059

## Findings

未发现阻断性问题。

## Review Notes

- `scripts/harness-install.mjs` 的默认 CLI 模块已补齐 `scripts/error-classifier.mjs` 与 `scripts/worktree-utils.mjs`。前者是 `req-cli.mjs` 的既有运行时依赖，后者是 REQ-2026-058 引入的 worktree 路径工具；迁移后不再只复制入口脚本而遗漏依赖。
- `scripts/req-check.js` 已改用 `getProgressPath()` 读取当前环境对应的 `progress.txt`，并通过 `getExemptPath()` 优先检查 worktree 专属 `.req-exempt`，同时保留全局 `.claude/.req-exempt` 兜底。
- `tests/governance.test.mjs` 不再只断言文件存在；安装到临时 fixture 后会实际运行：
  - `node scripts/req-cli.mjs status`
  - `node scripts/session-start.js`
  - 带全局豁免文件的 `node scripts/req-check.js`
- `/harness-setup` command、source-command skill 与 README 已同步新增迁移清单和回归测试说明，降低入口文档与真实安装器漂移风险。

## Residual Risk

- 跨平台 hook 脚本仍使用 `.js` + ESM import。在无 `"type": "module"` 的目标项目中，当前 Node 版本会自动重解析并给出 warning；这是既有跨平台脚本分发约束，本次未改文件后缀或 package 类型。
- 回归测试覆盖非 git fixture 的迁移后可执行性；真实 git worktree 端到端仍由 REQ-2026-058 的源仓库验证链路覆盖。

## Conclusion

修复针对迁移命令的实际缺口：默认安装清单包含 worktree 运行时依赖，迁移后的 CLI / hook 入口能直接执行。可以进入 QA。
