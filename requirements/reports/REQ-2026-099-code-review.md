# Code Review: REQ-2026-099

## 状态

- ✅ Approved（**同谱系自审**，独立性有限，见 Residual 1）

## Inputs

- REQ：`requirements/in-progress/REQ-2026-099-p0-commitment-convergence-personal-route.md`
- DESIGN：无独立设计稿（`skip-design-validation`，判据来自 `docs/plans/2026-09-23-route-decision-personal-slim-tool.md`）
- Reviewed：`README.md`（安装段、平台段、upgrade/restore 示例）、`.claude/commands/harness-setup.md`、`.agents/skills/source-command-harness-setup/SKILL.md`、`tests/governance.test.mjs`（两处短语契约）、REQ-2026-096 / 097 的状态与搁置说明

## Findings

### High / Medium

- 无未关闭问题。
- 已关闭：README 与两个发布资产承诺了 `npx --yes --package=harness-lab harness-install`——registry 上的同名包属他人且无该 bin（route 报告 D1 的 E4 反证）。三处均改为「源码脚本」与「本地 tarball + `npm exec --package=<tgz> --`」两条有证据的路径。
- 已关闭：README 以"目标支持 Windows、macOS、Linux"作承诺，但 `windows-latest` 长期失败。改为写出已实测环境与 **Windows 4 项失败 + run ID**，明确"未验证、不作承诺"——撤承诺但保留警示。
- 已关闭：`tests/governance.test.mjs:1164` 与 `:2654` 把旧 npx 写法列为**必需短语**，等于守卫在强制一个假承诺。改为必需"源码形式 + tarball 形式"，并把旧 npx 形式移入禁用短语表（防回流）；未降低断言强度。
- 已关闭：REQ-2026-096 / 097 停留在 `blocked`，会被下个会话当欠账补。转 `suspended` 并写明个人路线下的处置与恢复条件。

### Residual

1. **本评审为同谱系自审**，不构成异质交叉验证（同 REQ-2026-098 的结论）。
2. **文件层 suspended 未进事件账本**：事件 schema 无 `req_suspended`，`event-store.mjs:513` 把投影中的 status 硬编码为 `blocked`，因此 `session-start` 的搁置列表仍显示 `(blocked / …)`。已登记为债务（REQ "临时实现与债务"），修复需触碰 `scripts/`，不在本 REQ 范围。
3. `docs/plans/2026-07-harness-lab-product-route-decision.md` 与既有 reports 仍写着旧 npx 写法——**刻意保留**（历史证据）；禁用短语检查只覆盖三个发布/入口资产，不覆盖历史记录。
4. `context/tech/testing-strategy.md:50` 描述三平台 matrix，但已写明"每格必须有成功 run identity 才算通过"，属证据门控陈述，未改（记于 REQ 关键决策）。
5. 存量 125 条 governance warning 未动，`req:audit` 维持基线内无 delta。

## Conclusion

- Approved。两条已知为假的对外承诺已从三个资产撤下，守卫同步收紧；096/097 的状态语义与路线决策一致；未发现新增副作用或范围外改动。
