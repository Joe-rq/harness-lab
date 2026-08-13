# ADR-093: 集中 Hook 决策，保留事件协议适配

## Status

Accepted

## Context

七个 Hook 重复读取 mode 并实现分支，而 Claude Hook 事件支持的输出能力并不相同。完全统一输出会混淆 PreToolUse block、PostToolUse context、Stop 和 PreCompact 副作用。

## Decision

集中 `mode × risk point` 的 action/effect；各 Hook 只做信号检测、文案和事件协议适配。doctor 使用 installer 写入的确定性 profile record选择检查，并统一 text/json 退出语义。

## Consequences

### Positive
- 24 个决策可表驱动验证，README 可从同一事实校准。
- 保留不同 Hook 事件的合法协议能力。
- doctor 不再用源码仓库期望误判 core/default target。

### Negative
- Hook adapter 仍有少量 action-to-output 映射。
- legacy 项目只能推断 profile，结果必须标 warning。

## Alternatives Considered

- 每个 Hook 保持分支 + 文档测试：拒绝，仍是行为多源。
- 统一 Hook runtime/输出：拒绝，上游事件协议与阻断能力不同。
- doctor 仅检查文件存在：拒绝，不能验证 profile/配置契约。
