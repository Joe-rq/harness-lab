# ADR: Safe upgrade v1 uses ownership hashes without auto-merge

## Status

Accepted for REQ-2026-094.

## Context

skip-existing 能防止覆盖，却不能更新旧治理文件。完整内容三方合并、远程版本获取和删除传播会显著扩大数据风险；P1 的目标是先让可证明未修改的文件安全升级。

## Decision

- 以 capability/profile 确定候选，以 ownership SHA-256 证明旧 baseline。
- target 等于 baseline 才允许替换；无 baseline 的已有不同内容一律冲突。
- 支持安全项部分升级，但只在零冲突时推进 complete version。
- 所有实际写入先备份，并提供显式 restore；删除上游移除文件不在 v1。
- legacy 采用安全子集，不猜测旧 baseline。

## Consequences

- 用户修改默认不丢失，升级结果可解释、可恢复。
- legacy 首次升级可能产生较多冲突，需要人工处理。
- ownership 形成未来升级的稳定基础；只有 pilot 证明需要时才考虑内容三方合并。
