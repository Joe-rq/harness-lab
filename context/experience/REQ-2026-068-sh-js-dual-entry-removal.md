# 2026-05-19 删除 sh/js 双入口：从模板源头消除命令漂移

## 场景

harness-lab 长期并存两套 hook 入口：bash 版（`scripts/req-check.sh` 102 行 / `scripts/session-start.sh` 200 行）与 Node.js 版（`scripts/req-check.js` 195 行 / `scripts/session-start.js` 167 行）。模板源头 `.claude/settings.example.json` 与 `.codex/hooks.json` 引用 `.sh`，但 `scripts/harness-install.mjs` 分发到目标项目时已经写入 `node *.js` 命令——**模板源头与实际分发产物的命令行漂移**已经存在数个 REQ 周期，每次修改 hook 行为都要双份维护，且 Windows 下 bash 兼容性差。本次借助 REQ 治理流程一次性消除该技术债。

## 关联材料

- REQ: `requirements/completed/REQ-2026-068-sh-js-entry-unification.md`
- Code Review: `requirements/reports/REQ-2026-068-code-review.md`
- QA: `requirements/reports/REQ-2026-068-qa.md`

## 问题 / 模式

- **双实现长期并存**：sh 版本是早期 PoC，js 版本是后续跨平台重写，但 sh 始终没被删
- **配置漂移**：`harness-install.mjs` 早已使用 `.js`，模板入口配置仍引用 `.sh`，新用户接入时看到的命令与实际安装产物不一致
- **隐性预期 bug**：在删 sh 后才发现 `req-check.js:88` 用 `${activeReq}.md` 精确拼接路径，而 sh 版本是 `find ${ACTIVE_REQ}-*.md` glob 匹配——这个不一致原本被 sh 入口"挡住"了
- **测试覆盖足够**：33 项自动化测试（governance/req-status-json/req-audit）保证了删除安全性

## 关键决策

- **决策 1：最小验证集（Phase 1）+ 残留 Phase 2 分离**：仅删 6 个紧耦合文件（2 删 + 4 改 + README docs-sync 留痕），把 `.codex/hooks.json`、`scope-guard.mjs` 注释、AGENTS.md 等非阻断引用显式划入 Phase 2。颗粒度自检中 4 实体规则虽然实际涉及 7 文件，但全部同质且紧耦合，拆分反而会导致 settings/installer/test 多次反复修改。

- **决策 2：保留 `commit-msg-check.sh`**：唯一没有 .js 对应的 sh 脚本，明确写入"非目标"，避免范围蔓延

- **决策 3：docs-sync 触发的 README 改动不算超范围**：`scripts/docs-sync-rules.json` 强制规定"治理脚本/测试改动需在 README 或 CONTRIBUTING 留痕"，这是完成 REQ 的必经治理闭环，应主动接受而非视为越界

- **决策 4：预先存在的 .js bug 不归本 REQ**：发现 `req-check.js:88` 路径拼接 bug 是手动 smoke 时的副产物，但 bug 在删 sh 之前就已存在（harness-install 早就分发 .js），日常 hook 走 stdin 放行分支不受影响。如实记入 code-review / QA 的 Residual Risk，作为后续 REQ 候选

## 验证

- `npm test`：33 项 PASS（governance 14 + req-status 12 + req-audit 7）
- `npm run check:governance`：PASS（required files、entry alignment、INDEX/progress、docs:verify、req:audit 全过）
- 手动 smoke：`node scripts/session-start.js`、`node scripts/req-check.js` 行为与原 sh 版本一致

## 可复用经验

- **删除双实现前先 grep 全引用网**：本次受益于 `grep -E "req-check\.(sh|js)" --include="*.mjs"` 一次列出 9 个文件，再按"是否影响测试通过"筛出 6 个必改集
- **docs-sync 是隐藏的范围扩张点**：任何治理脚本/测试改动都会触发，提前在 REQ 中预留 README 改动配额
- **手动 smoke 容易暴露预先存在的 bug**：在删除冗余实现时，原本被冗余实现"挡住"的对应版本 bug 会浮出水面——要识别它属于历史问题、不要把"修复"卷入当前 REQ
- **颗粒度自检超 4 实体时，明确说明耦合性比强行拆分更诚实**：本次 6 文件全部同质（sh→js 引用迁移），拆分会导致 hook 入口在中间状态不可用

## 反例 / 应避免

- ❌ 想"顺手"把 `.codex/hooks.json` 和 AGENTS.md 一起改完：会导致 6 文件范围扩到 10+，且 Codex 入口与 Claude Code 入口耦合关系另外一套，应单独成 REQ
- ❌ 想"顺手"修复 `req-check.js:88` 的路径拼接 bug：那是行为变更，违反"重构 ≠ 新功能"的非目标边界
