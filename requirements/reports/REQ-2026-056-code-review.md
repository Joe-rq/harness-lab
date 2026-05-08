# Code Review: REQ-2026-056

## 范围

- `.claude/commands/harness-setup.md`：重写一键接入 command 说明，改为描述真实安装器行为
- `.agents/skills/source-command-harness-setup/SKILL.md`：纳入 source-command skill，并与 command 保持同一套接入契约
- `package.json`：新增 `bin.harness-install`
- `tests/governance.test.mjs`：新增 command / skill / bin 契约同步测试
- `README.md`：同步 `npx harness-install` 与契约测试说明

## 正确性

- command 与 skill 都改为 `.claude` 路径，不再出现 `.Codex` 过期拼写
- 核心模块说明恢复为 `AGENTS.md` + `CLAUDE.md`，不再重复 `AGENTS.md`
- 冲突策略明确为“默认跳过已有文件”，与 `harness-install.mjs` 当前实现一致
- `npx harness-install` 有 `package.json` bin 契约支撑，仍保留本地开发时的 `node scripts/harness-install.mjs` 入口
- 新测试校验关键短语、过期短语和 bin 指向，能覆盖未来入口漂移

## 风险

- `bin` 入口只定义包分发契约，不代表本次已经发布 npm 包；README 与 command 已说明本地开发优先使用 Node 直接入口
- 未实现覆盖/取消冲突交互，这是本 REQ 的明确非目标

## 结论

改动与设计一致，未修改安装器核心行为，回归测试覆盖了新增契约。可以进入 QA。
