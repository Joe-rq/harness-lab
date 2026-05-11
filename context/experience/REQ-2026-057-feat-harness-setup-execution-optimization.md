# 2026-05-11 feat: harness setup execution optimization

## 场景

真实项目接入 Harness Lab 时，业务包不一定在 Git 根目录。MediAppHub 的 `package.json` 位于 `app/`，旧安装器完成治理文件复制后无法绑定 npm scripts，却仍提示用户执行 `npm run req:create`，造成“迁移缺了很多东西”的误解。

## 关联材料

- REQ: `requirements/completed/REQ-2026-057.md`
- Design: `docs/plans/REQ-2026-057-design.md`（如有）
- Code Review: `requirements/reports/REQ-2026-057-code-review.md`
- QA: `requirements/reports/REQ-2026-057-qa.md`

## 问题 / 模式

- 安装目标目录和 package scripts 绑定位置不能默认等同；治理文件应该在 Git 根，业务 npm scripts 可能在子目录 package。
- 子目录 package 里不能直接写 `node scripts/req-cli.mjs`，因为 npm script 的 cwd 是 package 目录，治理 CLI 会把子目录误判为根。
- “默认安装”容易被用户理解成“完整镜像”，报告必须把未安装项和原因写清楚。

## 关键决策

- 只新增 `--package-dir` / `--package-json`，不自动创建根 `package.json`。这样避免安装器替目标项目做包结构决策。
- 子目录 package 的治理命令使用 `cd .. && node scripts/...` 回到 Git 根目录执行，保持 CLI 现有根目录假设。
- 高级治理脚本继续不进默认安装清单，但报告和文档明确“默认安装是治理引导，不是完整镜像”。

## 解决方案

1. 在安装器中拆分 package 定位逻辑，支持根 package、`--package-dir`、`--package-json` 和候选 package 检测。
2. 根据 package 目录生成治理 npm scripts：根 package 使用 `node scripts/...`，子目录 package 使用 `cd .. && node scripts/...`。
3. 接入报告新增命令绑定状态、候选 package、能力差距和 fallback 后续步骤。
4. 用 `npm test` 覆盖子目录 package、缺根 package、文档入口同步和 Windows 路径兼容。

## 复用建议

- 任何安装器只要同时写文件和改 npm scripts，都要把“文件安装根”和“package 绑定位置”建模成两个概念。
- 对 monorepo / app 子目录项目，优先提供显式参数，不要猜测业务包语义；猜测结果只用于报告建议。
- 后续如果实现 advanced/full profile，应继续保持“默认轻量、显式增强、报告说明差距”的模式。
