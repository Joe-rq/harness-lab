# REQ-2026-056 Design: harness-setup skill 与一键迁移分发契约

## 问题

当前安装器能力与入口说明不完全一致：

- `.claude/commands/harness-setup.md` 是已跟踪的 Claude command 入口
- `.agents/skills/source-command-harness-setup/SKILL.md` 是迁移后的 source-command skill，但尚未纳入版本控制，且有过期描述
- 文档写了 `npx harness-install`，但 `package.json` 没有 `bin` 字段
- 文档描述了覆盖/取消冲突策略，但安装器真实行为是检测已有文件后跳过

本次优化应让“agent 按 skill 执行”和“用户按 command 文档执行”得到同一套真实行为。

## 方案

1. 统一两份入口文档
   - `.agents/skills/source-command-harness-setup/SKILL.md`
   - `.claude/commands/harness-setup.md`

   两者保留各自 frontmatter，但主体说明应一致。重点修正：
   - `.claude` 路径大小写
   - `AGENTS.md` / `CLAUDE.md` 核心模块说明
   - hook 复制文件包含 `.sh` 与 `.js`
   - 冲突策略改为“默认跳过已有文件”
   - CLI 入口与真实 package 契约一致

2. 补 package bin
   - 在 `package.json` 增加：
     ```json
     {
       "bin": {
         "harness-install": "scripts/harness-install.mjs"
       }
     }
     ```
   - 复用现有 shebang，不新增 wrapper 脚本。

3. 增加测试
   - 在 `tests/governance.test.mjs` 增加契约测试：
     - command 与 skill 的关键短语一致
     - skill 不再包含 `.Codex`、重复核心 `AGENTS.md`、虚假的覆盖/取消实现描述
     - `package.json` 暴露 `harness-install` bin 且指向现有安装器

4. 交付物
   - Code Review 报告
   - QA 报告
   - 经验沉淀

## 不做

- 不改安装器默认行为
- 不新增包发布脚本
- 不真实执行 `npx` 网络安装

## 验证

- `npm test`
- `npm run docs:verify`
- `npm run check:governance`

## 风险

- package `bin` 只定义入口，不代表已经发布到 npm。文档中应表达为“包分发时支持”，本地仍推荐直接运行 `node scripts/harness-install.mjs` 或 `npm run harness:install`。
