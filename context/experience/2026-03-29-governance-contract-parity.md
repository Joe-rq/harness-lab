# 2026-03-29 Governance Contract Parity

## 场景

Harness Lab 同时存在三类“入口事实”：

- 入口文档：`README.md`、`CLAUDE.md`
- 自动检查：`npm run docs:verify`、`npm run check:governance`
- 接入产物：`scripts/harness-install.mjs` 复制到目标项目的骨架

只要其中一类单独演进，治理层就会出现“文档说得通，但仓库做不到”或“仓库能做，但安装器没交付”的漂移。

## 关联材料

- REQ：`requirements/completed/REQ-2026-011-governance-self-check-installer-parity-fixes.md`
- Design：`docs/plans/REQ-2026-011-design.md`
- Code Review：`requirements/reports/REQ-2026-011-code-review.md`
- QA：`requirements/reports/REQ-2026-011-qa.md`

## 问题 / 模式

- README 精简后丢了治理检查依赖的固定入口文案，导致模板仓库自检失败
- 安装器复制清单落后于实际治理脚本，导致目标项目缺失 `check-governance.mjs`
- 安装器写入的 hook 结构与示例配置不一致，导致“文档契约”和“配置契约”分裂
- 安装器还可能因为引用不存在的脚本而生成占位文件，让目标项目拿到伪能力

## 解决方案

1. 把入口文档、治理自检、安装器视为同一个协议面的三个投影，修改任意一个都要核对另外两个。
2. 对治理模板做回归时，不只跑仓库内自检，还要在临时 Git 仓库里跑一次真实安装。
3. 安装器只能复制仓库里真实存在、且文档已声明的治理脚本；不要用占位文件掩盖契约缺失。
4. hook 配置必须对齐示例结构，避免“样例能读、安装器不会写”的双标。

## 复用建议

- 以后凡是修改 `README.md`、`CLAUDE.md`、`scripts/check-governance.mjs`、`scripts/docs-verify.mjs`、`scripts/harness-install.mjs` 之一，都默认视为“契约同步”问题，而不是单文件改动。
- 提交前至少执行两类验证：
  - 仓库自检：`npm run docs:verify`、`npm run check:governance`
  - 安装回归：在临时 Git 仓库里执行 `node scripts/harness-install.mjs --defaults --with-hook`
- 如果治理模板未来继续扩展安装能力，优先让安装器复用真实脚本和真实配置，而不是复制新的说明性占位文件。
