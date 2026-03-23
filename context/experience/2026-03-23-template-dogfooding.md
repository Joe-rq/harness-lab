# 2026-03-23 Template Dogfooding

## 场景

`harness-lab` 作为治理模板仓库，需要证明自己也能按同一套 REQ / 设计 / 报告机制推进变更，而不是只提供公开示例。

## 关联材料

- REQ：`requirements/completed/REQ-2026-001-template-hardening.md`
- Design：`docs/plans/REQ-2026-001-design.md`
- Code Review：`requirements/reports/REQ-2026-001-code-review.md`
- QA：`requirements/reports/REQ-2026-001-qa.md`

## 问题 / 模式

- 只有公开示例时，模板可信度容易停留在“设计完整”，而不是“实践可用”
- 悬空的模板配置（例如不存在的验证脚本）会直接削弱 onboarding 质量
- 目录级导航缺失时，使用者很难知道什么时候该读哪个 skill 或 context 文档

## 解决方案

1. 用真实 REQ 承接模板自身整改，而不是继续把所有工作都写成说明文字。
2. 为模板仓库补一个真实的治理检查命令，例如 `npm run check:governance`。
3. 公开示例继续保留在真实目录位置，但要同时引入真实完成的 REQ，用来区分“演示样本”和“模板自身实践”。
4. 对 `blocked / suspended` 这类生命周期状态，除了在规则里写定义，还要补一个最小示例。

## 复用建议

- 新建治理模板时，尽早让模板仓库自己走一遍完整 REQ 闭环
- 模板侧检查命令只校验治理结构和证据链，不要冒充业务验证
- 如果 README 同时服务人类和 AI agent，应显式拆成最短路径和完整路径两条入口
