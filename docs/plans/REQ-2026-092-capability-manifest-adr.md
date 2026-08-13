# ADR-092: 以 ESM capability manifest 作为安装能力单一事实源

## Status

Accepted

## Context

Harness Lab 的模块文件、目标 package scripts、profile、doctor 期望和测试清单已在多个文件复制。P0 证明这种复制会导致分发与文档漂移，但 npm `package.json.files` 又必须保留严格 allowlist，不能简单删除。

## Decision

使用零依赖 ESM manifest 表达稳定能力事实。installer、doctor 和测试直接 import；`package.json.files` 作为 npm 所需的 checked-in 派生物，由专用 sync/check 工具生成和校验。测试另外保留小型语义 capability/command 集合，避免同源自证。

## Consequences

### Positive

- 能力增删的权威修改点收敛为一个文件。
- 消费者不再维护 files/scripts command map。
- npm 隐私 allowlist 继续严格，漂移可被 CI 阻断。
- 后续 profile-aware doctor 与升级 ownership 可复用稳定 ID。

### Negative

- package.json 仍有一个生成字段，需要运行 sync 并提交派生 diff。
- ESM manifest 是代码，必须限制为静态数据且不执行外部输入。
- 独立语义契约仍需维护少量产品级 ID。

### Neutral

- 不改变目标项目文件格式或 installer CLI。
- 不在本 ADR 定义 mode 风险策略和升级算法。

## Alternatives Considered

### 保留各文件常量并增强一致性测试

拒绝：只能检测漂移，能力增删仍需多处手工修改。

### JSON manifest + JSON Schema

拒绝：增加解析/Schema 维护层和依赖收益有限；当前 Node-only 运行时可直接安全 import 静态 ESM。

### 生成 staging npm package

暂缓：可完全消除 package files 派生字段，但引入构建目录、清理和发布流程，超过最小 P1 所需。

## References

- `reviews/harness-lab-review-2026-07-10.md`
- `docs/plans/REQ-2026-092-design.md`
