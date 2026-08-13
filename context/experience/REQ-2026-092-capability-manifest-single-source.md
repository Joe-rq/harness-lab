# 2026-07-11 能力单一事实源仍需要独立语义契约

## 场景

installer、doctor、npm 发布和测试都需要知道“有哪些能力”，复制完整 files/scripts map 会漂移；但让测试完全读取同一个 manifest 又会产生自举式绿灯。

## 关联材料

- REQ: `requirements/completed/REQ-2026-092-p1-capability-manifest.md`
- Design / ADR: `docs/plans/REQ-2026-092-design.md`、`docs/plans/REQ-2026-092-capability-manifest-adr.md`
- QA: `requirements/reports/REQ-2026-092-qa.md`

## 关键决策

- ESM manifest 统一模块文件、target scripts、profile、overlay、doctor expectation 和 publication。
- package files 是 npm 所需派生物，用 check/write 管理，不放宽隐私 allowlist。
- installer/doctor/tests 直接消费 manifest；tests 另保留少量语义 capability ID 和关键公开命令。
- manifest 在 import 时校验路径、重复、依赖、cycle 与引用，非法定义 fail fast。

## 复用建议

- 单一事实源解决的是“事实复制”，不是取消所有独立验收标准。
- 生成文件应有只读 check 和显式 write 两种模式，CI 默认只跑 check。
- profile 应由 module dependency closure 解析，避免 overlay 手工补依赖。
