# REQ-2026-056: harness-setup skill 与分发契约同步

## 经验

一键接入能力不是单个安装器脚本，而是一组入口契约：Claude command、source-command skill、README、package bin 和安装器测试必须同步。只修安装器或只修文档都会留下迁移时的错误指令。

## 可复用规则

- 修改安装入口时，同时检查 `.claude/commands/harness-setup.md` 与 `.agents/skills/source-command-harness-setup/SKILL.md`
- 文档中出现 `npx <command>` 前，先确认 `package.json` 有对应 `bin`
- 如果安装器没有实现某个交互分支，文档应写当前真实行为，而不是理想流程
- 对入口文档漂移要写自动化测试，至少覆盖关键短语、禁用过期短语和 package 契约

## 本次决策

- 保留安装器当前“检测冲突后默认跳过”的行为，不实现覆盖/取消交互
- 增加 `bin.harness-install`，让 `npx harness-install` 有明确包分发契约
- 将 `.agents` skill 作为正式迁移入口纳入版本控制和测试覆盖
