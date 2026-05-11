# REQ-2026-057 Design: harness setup execution optimization

## 问题

`harness-install` 当前把安装目标目录和 `package.json` 绑定位置绑定在一起：治理文件安装到当前 Git 项目根目录，脚本绑定也只查找根目录 `package.json`。当目标项目采用 `app/package.json` 这类结构时，安装器会复制治理文件，但不会绑定 `req:*`、`docs:*`、`check:governance` 等 npm scripts。

更糟的是，报告虽然提示未检测到根 `package.json`，后续步骤仍默认写 `npm run req:create`，这在该项目根目录不可执行，容易被理解为迁移脚本漏装或失败。

## 方案

1. 新增 package 定位参数
   - `--package-dir <dir>`：把 `<dir>/package.json` 作为脚本绑定目标
   - `--package-json <path>`：直接指定 package 文件
   - 治理文件仍安装到当前工作目录；参数只影响 npm scripts 绑定位置

2. 增强 package 发现和报告
   - 根目录缺 package 时，扫描一层常见子目录中的 `package.json`
   - 报告写清楚：未绑定的原因、检测到的候选 package、可重跑命令
   - 后续步骤按绑定状态切换：
     - 已绑定 package：提示在对应目录执行 `npm run req:create`
     - 未绑定 package：提示使用 `node scripts/req-cli.mjs create` fallback

3. 终端输出同步
   - 安装完成后的后续步骤不再固定写 `npm run`
   - 如果 package 未绑定，输出 fallback 和 `--package-dir` 建议

4. 文档入口同步
   - README、`.claude/commands/harness-setup.md`、`.agents/skills/source-command-harness-setup/SKILL.md` 增加 `--package-dir app` 示例
   - 明确默认安装是治理引导，不是完整镜像；高级治理脚本不在默认模块内

## 不做

- 不新增高级脚本迁移模块
- 不自动创建根 `package.json`
- 不猜测非标准 npm script 名称语义
- 不改变现有默认模块清单

## 验证

- `npm test`
- `npm run docs:verify`
- `npm run check:governance`

重点测试：
- 根 package 存在时保持现有绑定行为
- `--package-dir app` 能绑定 `app/package.json`
- 根 package 缺失且发现 `app/package.json` 时报告建议明确
- command / skill / README 与安装器新增参数保持同步

## 风险

- 用户可能误解 `--package-dir` 会把治理文件也安装到子目录。报告和文档必须反复说明：治理文件安装位置仍是当前 Git 项目，只有 npm scripts 绑定位置可指定。
