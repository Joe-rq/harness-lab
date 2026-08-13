---
id: INV-072
title: 2026-07-11 能力单一事实源仍需要独立语义契约
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
confidence: medium
message: |
  ⚠️ INV-072: 2026-07-11 能力单一事实源仍需要独立语义契约
  来源: experience/REQ-2026-092-capability-manifest-single-source.md
---

## 详细说明

## 复用建议

- 单一事实源解决的是“事实复制”，不是取消所有独立验收标准。
- 生成文件应有只读 check 和显式 write 两种模式，CI 默认只跑 check。
- profile 应由 module dependency closure 解析，避免 overlay 手工补依赖。

<!-- 来源: context/experience/REQ-2026-092-capability-manifest-single-source.md -->