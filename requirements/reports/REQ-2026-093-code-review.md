# Code Review: REQ-2026-093

## 状态

- ✅ Approved

## Inputs

- REQ / Design / ADR：`REQ-2026-093`、`docs/plans/REQ-2026-093-design.md`、`docs/plans/REQ-2026-093-hook-policy-adr.md`
- Reviewed：Hook policy、七个 mode consumer、capability manifest、installer profile、doctor、tests、README、候选包。

## Findings

### High / Medium

- 无未关闭问题。
- 已关闭：七个 Hook 分散解析 mode，非法值行为可能不一致；现统一安全回退 collaborative，并消费完整 policy matrix。
- 已关闭：profile record 只校验字段、未校验 profile/overlay/module 互相一致；doctor 现验证 dependency closure、能力列表、overlay 对应模块及 core/default 精确组成。
- 已关闭：doctor 只发现缺失能力，不能发现 record 外完整模块；新增能力漂移 warning，且 warn 不改变退出码。
- 已关闭：高级 Hook 新增发布后，packed default lifecycle 测试误把“发布”当成“默认安装”；测试改为按 profile closure 验证，另独立断言高级 Hook 已发布但未默认安装。
- 已关闭：README 曾声称 collaborative/supervised 不生成 PreCompact 快照；实现走读确认三种模式均生成快照，只有 autonomous 额外写审计事件，矩阵与文档已统一。

### Residual

- 高级 Hook 已进入 npm allowlist，但 installer 尚无公开 `--with-advanced-hooks` 开关；本 REQ 只建立 capability/doctor 契约，默认不安装。
- source checkout 没有目标安装 record，doctor 通过 package name 只读推断并显示 warning，这是预期诊断语义。
- profile schema/product version 当前为 1；安全升级与 migration 由 REQ-094 承接。

## Conclusion

- Approved。策略决策、事件适配、安装事实和诊断事实边界清晰，未发现阻断发布候选的问题。
