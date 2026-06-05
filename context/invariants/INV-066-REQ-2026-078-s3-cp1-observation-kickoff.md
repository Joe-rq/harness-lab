---
id: INV-066
title: REQ-2026-078 S3-CP1 observation window kickoff 经验
status: draft
severity: medium
triggers:
  - glob: "requirements/completed/**"
  - glob: "docs/plans/**"
  - glob: "requirements/reports/**"
  - glob: "requirements/observations/**"
confidence: medium
message: |
  ⚠️ INV-066: REQ-2026-078 S3-CP1 observation window kickoff 经验
  来源: experience/REQ-2026-078-s3-cp1-observation-kickoff.md
---

## 详细说明

## 问题 / 模式

- "观察期"需要一个可审计起点,否则后续所有 2 周、热身期、正式期都会变成口头账。
- 主观预期要在观察前密封,且不能由 agent 代填;否则 S3-CP2 复盘会被事后合理化污染。
- 路线图进入观察期前,必须把反向否决和聚合规则写清楚,防止后续为了上任务图倒推数据。

<!-- 来源: context/experience/REQ-2026-078-s3-cp1-observation-kickoff.md -->