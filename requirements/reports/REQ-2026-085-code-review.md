# REQ-2026-085 Code Review：OPT-1A — req-check stdin 契约 + Bash 写入门禁

## 状态
- ✅ 通过（自审）

## 范围合规
- 改动限于 REQ 声明范围：`req-check.js` / `scope-guard.mjs` / `settings.example.json` / `settings.local.json` / `.codex/hooks.json` / `tests/governance.test.mjs` / `CONTRIBUTING.md`
- 未触碰 CANNOT 清单：`package.json` / `req-cli.mjs` / `harness-install.mjs` / `session-start.js` / `harness-doctor.mjs` / `README.md` / `AGENTS.md`（均归 REQ-2026-086）

## 安全模式
- hook 输出维持现有 `exit 2` / `decision:block` 兼容格式（`hookSpecificOutput.permissionDecision` 迁移归 REQ-086）
- 纯读命令零摩擦放行（`ls`/`grep`/`cat`/`git status`），避免误杀开发流
- 写检测对 repo 外路径（`/tmp` 等）放行，降低误杀

## 主要发现
1. **Bash 检测启发式内联两份**（req-check.js + scope-guard.mjs）一致；已在两处注释标记，REQ-086 若发现漂移则抽 `scripts/bash-write-detect.mjs`。
2. **inplace-edit（`sed -i` / `perl -i`）targetPath 未提取**（返回 null）：scope-guard 对此类无法判范围 → 放行（req-check 仍强制"必须有合规 REQ"）。`redirect` / `pipe-write` / `file-op` / `heredoc` 均提取目标，覆盖主要写路径。文档（CONTRIBUTING）已注明。
3. **两 hook 输入契约统一**：req-check.js 从 env-var 改 stdin，与 scope-guard.mjs 对齐；消除"同职责 hook 两套输入契约"的债。

## 风险与回滚
- 误杀合法 Bash 写（如 repo 内 `rm` 清理产物）：`supervised` harness-mode 可整体降级为仅提醒；回滚 = `settings*.json` matcher 还原 `Write|Edit` + req-check 还原 env-var 读取。
- matcher 仅扩本仓（`settings.local.json` + `.codex/hooks.json` + `settings.example.json`）；目标项目 `--with-hook` 安装的 matcher 传播归 REQ-2026-086（改 `harness-install.mjs` configureHook）。

## 结论
OPT-1A 达成承诺完整性修复：Bash 写不再绕过 REQ 门禁，白名单死代码恢复。剩余的模块警告 / hook 输出格式 / doctor 自检 / 文档声明 / install 传播归 REQ-2026-086。
