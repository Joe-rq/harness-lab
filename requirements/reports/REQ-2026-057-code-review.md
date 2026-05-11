# Code Review: REQ-2026-057

## Findings

未发现阻断性问题。

## Review Notes

- `scripts/harness-install.mjs` 新增 `--package-dir` / `--package-json` 后，治理文件安装目录仍保持为当前 Git 项目根目录，避免把 harness 文件复制到业务包子目录。
- 子目录 package 的治理脚本通过 `cd .. && node scripts/...` 回到根目录执行，避免 `req-cli.mjs`、`docs-verify.mjs` 把 `app/` 误判为治理根。
- 根目录缺失 `package.json` 时不再假装 npm scripts 已可用，报告会给出 `node scripts/req-cli.mjs` fallback 和检测到的候选 package。
- `.claude/commands/harness-setup.md` 与 `.agents/skills/source-command-harness-setup/SKILL.md` 保持同步，新增参数和默认安装边界一致。
- 顺手修复 `tests/req-status-json.test.mjs` 的 Windows file URL 路径转换问题，避免 `D:\D:\...` 导致完整 `npm test` 失败。

## Residual Risk

- `--package-dir` 只扫描和示例一层子目录；复杂 monorepo 可使用 `--package-json` 显式指定更深层 package。
- 子目录 package 中的 placeholder guard 会先 `cd` 到治理根再执行，这符合当前治理脚本依赖根目录的设计，但用户后续替换真实 lint/test/build 时应改回业务包自己的命令。

## Conclusion

改动符合设计，新增测试覆盖根 package、子目录 package、缺 package fallback、command/skill 文档同步和 Windows 测试路径修复。可以进入 QA。
