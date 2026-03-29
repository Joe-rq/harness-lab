# 2026-03-29 Governance Automation Gate

## 场景

治理模板如果只有文档、脚本和手动命令，而没有自动化测试和 CI 门禁，就仍然依赖维护者“记得去跑”。

这意味着框架虽然写了规则，但规则不一定会在每次提交时自动执行。

## 关联材料

- REQ：`requirements/completed/REQ-2026-013-governance-automation-tests-and-ci-gate.md`
- Design：`docs/plans/REQ-2026-013-design.md`
- Code Review：`requirements/reports/REQ-2026-013-code-review.md`
- QA：`requirements/reports/REQ-2026-013-qa.md`

## 问题 / 模式

- `docs:verify` 和 `check:governance` 只靠人工执行时，容易出现“规则还在，没人运行”的空档
- 只增加 CI workflow 但没有仓库级自动化测试，依然无法保护脚本回归
- 只增加测试但不把它写进治理自检，后续维护者又可能把测试和 workflow 删掉

## 解决方案

1. 仓库自身必须有一个零依赖、默认可运行的测试入口，例如 `npm test`。
2. CI workflow 要直接复用现有治理命令，而不是另写一套隐藏脚本。
3. `scripts/check-governance.mjs` 需要把测试文件、workflow 和 `test` script 也纳入契约检查。
4. 入口文档和贡献指南必须同步写出自动化验证要求，否则门禁会退化成“只有 CI 知道”的隐形规则。

## 复用建议

- 以后凡是新增治理脚本，都默认补两层保护：
  - 至少一条自动化测试
  - 至少一个 CI 执行入口
- 如果运行环境对子进程有限制，优先用单进程脚本测试，而不是依赖测试框架的 worker / subprocess 模式。
- 仓库级 `npm test` 最好保持零依赖，避免治理模板为了测试而先变成“需要装一堆工具”的项目。
