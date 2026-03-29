# 2026-03-29 Portable Command Binding

## 场景

治理模板的 guard 本身不是问题。真正的接入摩擦发生在：目标项目已经有真实验证命令，但模板安装器没有复用它们，导致接入完成后还要人工再绑一次 `lint / test / build / verify`。

## 关联材料

- REQ：`requirements/completed/REQ-2026-014-portable-real-command-binding-for-target-projects.md`
- Design：`docs/plans/REQ-2026-014-design.md`
- Code Review：`requirements/reports/REQ-2026-014-code-review.md`
- QA：`requirements/reports/REQ-2026-014-qa.md`

## 问题 / 模式

- 只靠 README 提醒“请手动绑定真实命令”，接入体验仍会卡在最后一步
- 如果目标项目已有标准脚本名，却没有被自动复用，就是纯粹的机械摩擦
- 如果目标项目没有真实命令，也不能静默成功；必须给出统一 placeholder 和明确缺口

## 解决方案

1. 把 placeholder guard 统一收敛到单独脚本，例如 `scripts/template-guard.mjs`。
2. 安装器只做“安全增量更新”：
   - 保留已有真实 `lint / test / build / verify`
   - 对缺失命令写入 placeholder
   - 对缺失的 `verify` 优先基于已有真实脚本自动组合
3. 安装报告必须显式说明每个命令是 `preserved`、`generated` 还是 `placeholder-added`。
4. 自动绑定只依赖标准脚本名，不猜测非标准脚本的语义。

## 复用建议

- 以后继续优化可移植性时，优先扩大“安全可复用”的范围，而不是扩大“高风险猜测”的范围。
- 如果要支持更复杂的脚本发现，最好走显式配置文件或安装器交互，而不是默认猜测 `test:unit = test`、`build:prod = build`。
- 对治理模板来说，“明确 placeholder + 缺口报告”比“错误地自动猜中一条命令”更安全。
