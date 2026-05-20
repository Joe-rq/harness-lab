# 2026-05-19 Phase 2 清理 sh 引用残留：显式声明不动历史

## 场景

REQ-2026-063 已完成核心删除与引用迁移，但 `.codex/hooks.json`、`scripts/scope-guard.mjs` 注释、`AGENTS.md`、`CLAUDE.md`、`.claude/commands/harness-setup.md`、`.agents/skills/.../SKILL.md` 中仍有显式 sh 引用残留。这些残留会持续误导新接入用户，且可能反复触发 docs-sync 规则。本 REQ 将这些显式残留一次性清理。

## 关联材料

- REQ: `requirements/completed/REQ-2026-064-phase-2-sh.md`
- Code Review: `requirements/reports/REQ-2026-064-code-review.md`
- QA: `requirements/reports/REQ-2026-064-qa.md`

## 问题 / 模式

- **显式残留 vs 历史残留区分困难**：手动 grep 时需要精心设计 `--exclude-dir` 参数，才能把"活跃引用"（配置/文档/SKILL）和"历史引用"（报告/经验/不变量/设计稿）分开。
- **本地配置不应强制覆盖**：`.claude/settings.local.json` 中的 sh 权限条目是本次运行时自动记录的，repo 不应强制覆盖；新用户从 `settings.example.json` 继承会自动得到 `.js` 命令。
- **SKILL 与 commands 内容需同步**：`.claude/commands/harness-setup.md` 与 `.agents/skills/source-command-harness-setup/SKILL.md` 是同一内容的两个分发渠道，改一处漏一处会漂移。

## 关键决策

- **决策 1：显式声明不动范围**：在 REQ"非目标"中明确列出不动的历史报告、经验、不变量、设计稿、roadmap-status.md，避免后续审计时被质疑。
- **决策 2：6 文件虽超 4 实体但不拆分**：全部同质迁移（`.sh` → `.js` 引用替换），拆分反而会导致 docs-sync 反复触发；如实声明超范围并在自检中说明理由。
- **决策 3：req-check.js glob bug 不归本 REQ**：行为变更（从精确匹配到 glob）应独立成 REQ-065，本 REQ 保持纯引用替换。
- **决策 4：SKILL 与 commands 一致修改**：两处分发清单同步修改，避免"一方已迁移另一方仍显示旧表"的误导。

## 验证

- `npm test`：33 项 PASS
- `npm run check:governance`：PASS
- grep 验证：活跃引用（.md/.mjs/.json）中仅 settings.local.json 残留（本地配置）

## 可复用经验

- **grep 脚本要写进验收标准**：验证"无遗漏"时，精心设计的 `--exclude-dir` 比手动检查更可靠。本 REQ 的验收标准中写明了 grep 命令。
- **本地配置残留是正常**：`.claude/settings.local.json` 的权限列表会自动记录运行时命令，无法也不应强制清空；重要的是模板源头（`settings.example.json`）已更新。
- **显式声明"不动范围"比隐式执行更诚实**：历史报告/经验/不变量/设计稿/roadmap-status.md 的引用是历史事实，删除会破坏可追溯性；显式声明不动比逐个解释更清晰。
- **REQ-064 为 REQ-065 做好准备**：本 REQ 清理了所有显式引用残留，REQ-065 只需改 `req-check.js:88` 的内部逻辑，不再有文档/SKILL 配置漂移的干扰。

## 反例 / 应避免

- ❌ 想"顺手"改 `.claude/settings.local.json`：这是本地配置，强制覆盖会破坏用户个性化权限列表
- ❌ 想"顺手"改历史报告中的引用：历史报告是不可变事实，改了会破坏审计链
- ❌ 想"顺手"把 req-check.js glob bug 也修了：行为变更应独立成 REQ，混在一起会让 QA 报告含糊