# Contributing

Thanks for improving Harness Lab.

## Scope

这个仓库是研发治理层模板，不是业务框架。
提交改动时，优先强化这些方面：

- REQ 生命周期
- 设计 / review / QA / ship 的交付物
- 索引优先的上下文恢复方式
- 经验沉淀和跨会话交接
- 对接入项目的清晰约束

避免把模板改成特定技术栈或特定业务领域专用。

## Good Contributions

适合提交的内容：

- 更清晰的 README、AGENTS、CLAUDE 入口
- 更稳的 REQ、report、context 模板
- 更合理的 Skill 约束
- 对接入流程的补充说明
- 来自真实项目实践的可复用经验

不适合直接合入的内容：

- 强绑定某个业务框架的目录结构
- 假定所有项目都使用同一套 lint / test / build 命令
- 只能服务单个项目的领域规则

## Before Opening a PR

提交前请尽量说明：

1. 你在哪个真实项目里使用了这个模板
2. 当前模板哪里不够用或容易误导
3. 你的改动会影响哪些入口或模板文件
4. 是否需要迁移说明

## Files To Update Together

如果改动影响这些区域，通常要联动更新：

- 接入说明：
  `README.md`
- 会话入口：
  `AGENTS.md`
  `CLAUDE.md`
- 需求流程：
  `requirements/INDEX.md`
  `requirements/REQ_TEMPLATE.md`
- 技术 / 经验索引：
  `context/*/README.md`
- 执行协议：
  `skills/**`
- 自动化守门：
  `tests/`
  `.github/workflows/`

`npm run docs:impact` 会先把当前 git status 里的文档义务直接列出来，`npm run docs:impact:json` 会输出同一份结果的结构化 JSON，`npm run docs:verify` 再对这些联动关系做最小自动检查。
如果你新增了新的脚本入口或新的同步约束，请同时更新 `scripts/docs-sync-rules.json`，不要只改文档或只改脚本。
如果你修改了 `tests/`、`.github/workflows/` 或核心治理脚本，请同步确认 `README.md`、`CLAUDE.md` 和 PR 清单仍然反映最新的自动化验证要求。

## Pull Request Checklist

- [ ] 改动仍然符合“治理层模板”定位
- [ ] 没有把业务项目特化假设硬编码进模板
- [ ] 相关入口文档已同步
- [ ] 相关模板或示例已同步
- [ ] 已运行 `npm test`
- [ ] 已运行 `npm run docs:impact`
- [ ] 需要机器消费时，已验证 `npm run docs:impact:json`
- [ ] 已运行 `npm run docs:verify`
- [ ] 已运行 `npm run check:governance`
- [ ] 如有破坏性变化，已在 PR 描述中说明
