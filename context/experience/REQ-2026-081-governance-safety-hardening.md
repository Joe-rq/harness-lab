# 2026-06-10 Governance safety hardening

## 场景

治理 hook 链本身会持续演进，最容易出现两个隐蔽问题：运行配置已经增加脚本，但风险分级或一致性检查没有同步；本地权限表长期积累历史例外，实际审查时很难看出哪些权限仍有必要。

## 关联材料

- REQ: `requirements/completed/REQ-2026-081-governance-safety-hardening.md`
- Code Review: `requirements/reports/REQ-2026-081-code-review.md`
- QA: `requirements/reports/REQ-2026-081-qa.md`

## 问题 / 模式

- hook 配置和风险规则是两套表，人工同步容易漏项。
- `.js` / `.mjs` 后缀差异会让脚本落入较低风险通配规则，例如 `session-start.js` 被普通源码规则覆盖。
- 重复调用 `git rev-parse` 这类小成本操作，在 PostToolUse 高频路径上会变成持续噪声。
- 权限表膨胀会降低审查质量，通配符已经覆盖的历史条目应及时删除。

## 关键决策

- 不自动生成 `.codex/hooks.json`，而是在 `check:governance` 中做配置一致性检查；这样保留人工控制，但能及时发现漂移。
- R4 覆盖检查从当前 hook 配置提取脚本名，再与 `risk-tracker.mjs` 的 R4 规则比对，避免维护第三份清单。
- 只缓存 `risk-tracker` 当前路径需要的 git root，不创建共享 git-utils 模块，避免为单点性能问题扩大架构面。

## 解决方案

1. 将所有已注册 hook 脚本补入 `risk-tracker.mjs` R4 规则。
2. 将 `RATCHET_FILE()` 改为接收 `rootDir`，消除重复 `git rev-parse`。
3. 在 `check-governance.mjs` 中校验 `.claude/settings.local.json` 与 `.codex/hooks.json` 的 hook 类型、entry 数量、matcher、command、timeout。
4. 在测试中断言每个 hook 脚本都有 R4 规则，并断言 `risk-tracker.mjs` 只调用一次 `git rev-parse`。
5. 清理 `.claude/settings.local.json` 的历史权限例外，将 permissions.allow 收敛到可审查规模。

## 复用建议

- 每新增一个 hook 脚本，必须同步考虑三件事：是否进入 R4、是否需要配置一致性检查、是否需要权限表最小化。
- 对配置漂移，优先用门禁检测而不是自动改写，除非已经明确单一权威源。
- 高频 hook 中的 shell 调用要控制次数；哪怕单次成本很低，也会在每次 Write/Edit 后放大。
