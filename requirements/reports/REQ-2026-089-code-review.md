# Code Review: REQ-2026-089

## 状态

- ✅ Approved（自审；前序只读审计发现均已修复并回归）

## Inputs

- REQ: `requirements/in-progress/REQ-2026-089-review-plan-p0-distribution-installation.md`
- Design: `docs/plans/REQ-2026-089-design.md`
- Diff / files reviewed: `package.json`、`scripts/harness-install.mjs`、`tests/governance.test.mjs`、`README.md`、`.claude/commands/harness-setup.md`、`.agents/skills/source-command-harness-setup/SKILL.md`
- Review basis: `reviews/harness-lab-review-2026-07-10.md` 的 P0 公开分发与安装项

## Commands Run

- `git diff --check`
- `node --check scripts/harness-install.mjs`
- `node --check tests/governance.test.mjs`
- `node --test tests/governance.test.mjs`
- `npm test`
- `npm run docs:verify`
- `npm run check:governance`
- `npm run harness:doctor`
- `env npm_config_cache=/private/tmp/harness-lab-npm-cache npm pack --dry-run --json --ignore-scripts`

## Findings

### High

- 无未关闭高风险问题。
- 已关闭：`--core-only` 曾绑定未安装的 CLI；现仅 CLI profile 绑定 package scripts，core-only 对合法或损坏的 package 均保持原字节。
- 已关闭：package 定位只做 lexical containment；现对目录和文件符号链接追加 realpath containment，越界在复制前失败。
- 已关闭：Hook 子串、非 command 类型或 Bash-only matcher 可伪装成功；现仅接受 canonical Node 命令，并要求完整 `Write|Edit|NotebookEdit|Bash` 覆盖。
- 已关闭：非法 settings 深层结构与非字符串 npm script 值可被静默保留/覆盖；现均在复制前失败并保留原文件。

### Medium

- 无未关闭阻塞问题。
- 已关闭：已有 INDEX/progress 在重装或 `--clean-template-history` 时可能被重置；现只生成缺失 INDEX，重复安装逐字节保留用户 INDEX、REQ、progress 与 settings。
- 已关闭：复制或安装后验证失败仍可能输出成功；现统一进入 `partial`、返回 1、隐藏成功横幅并生成诊断报告。

### Low / Residual Risk

- Windows 的 package symlink 对抗用例因本机权限差异仅在非 Windows 执行；Windows/macOS/Linux CI 矩阵属于评审计划 P1，不由本 REQ 冒充完成。
- 除 package 目标外的全部 installer 写路径 canonical safe-write、TOCTOU/硬链接防护属于下一项 P0 门禁与写目标治理，不在本 REQ 范围。
- 已有同名治理 script 的所有权识别、原子写入和升级合并属于 P1 capability/upgrade；当前仍遵循保护用户已有非空 script 的兼容策略。
- 最终独立复核尝试因外部 agent 额度限制未执行成功，未将其计为通过证据；结论基于已完成的前序只读审计、逐项自审和真实回归命令。

## Test Gaps

- 未执行线上 npm registry publish/install；REQ 明确只验本地候选 tarball。
- 未在 Windows/Linux 实机运行本次安装 fixture；P1 OS 矩阵继续跟踪。
- 目标项目的 `check:governance` 本 REQ 只保证入口与依赖存在，不宣称模板仓库规则已完成 profile 适配。

## Conclusion

- Approved。REQ-089 范围内的公开分发、fresh install、重复安装、配置保护和失败终态均有直接测试证据，可进入 QA/交付收口。
