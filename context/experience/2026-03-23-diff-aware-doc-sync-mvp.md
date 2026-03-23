# 2026-03-23 Diff-aware Doc Sync MVP

## 场景

静态 `docs:verify` 只能发现断链、缺脚本和失效路径，抓不住“脚本改了但 README 没改”这种真实文档漂移。

## 关联材料

- REQ：`requirements/completed/REQ-2026-004-diff-aware-doc-sync-mvp.md`
- Design：`docs/plans/REQ-2026-004-design.md`
- Code Review：`requirements/reports/REQ-2026-004-code-review.md`
- QA：`requirements/reports/REQ-2026-004-qa.md`

## 问题 / 模式

- 直接在 Node 里起子进程读 git diff，在当前 sandbox 环境会遇到 `spawnSync git EPERM`
- 仅靠静态文档 lint，无法判断这次 changed files 是否应该联动更新入口文档
- 把规则硬编码在脚本里，可维护性会迅速恶化

## 解决方案

1. 把 diff-aware 规则独立到 `scripts/docs-sync-rules.json`。
2. `npm run docs:verify` / `npm run check:governance` 先执行只读的 `git -c safe.directory=* status --porcelain=v1 -uall`，生成 changed-files 快照。
3. `docs:verify` 读取这个快照，按规则判断“触发文件”是否伴随至少一个约定文档更新。
4. 用合成状态文件做失败 / 通过两组定向验证，确保规则不是只会放行。

## 复用建议

- 先把 diff-aware 规则限定在高价值入口，不要试图一次覆盖所有目录
- 如果规则映射需要长期维护，优先做成独立配置文件，不要散落在脚本分支里
- 在受限环境里需要 git changed files 时，优先考虑由 shell 入口先产出快照，再让 Node 纯读取处理
