# REQ-2026-006 Design

## Background

当前 `docs:impact` 已经能把文档义务展示给人看，但对于 agent / CI 来说，文本输出仍然不够稳定。
如果下游只能解析控制台文案，任何一句提示语调整都可能破坏自动化。

因此需要把 impact 结果显式暴露成结构化输出，同时保留现有文本模式，避免打断维护者当前流程。

## Goal

- 为 `docs:impact` 增加稳定的 JSON 输出
- 保持文本输出不变，继续服务人类维护者
- 让文本 / JSON / complete gate 共享同一份 impact 分析结果

## Scope

### In scope

- 为 `docs-verify` 参数增加 `--format json`
- 新增 `docs:impact:json` 脚本入口
- 明确 impact payload 的最小字段集合
- 更新 README / CONTRIBUTING 中 agent / CI 的使用说明

### Out of scope

- 独立 JSON Schema 文件
- 远程 API、PR comment 或 MCP 输出
- `req:complete` 的 JSON 错误输出改造
- 更复杂的 rule metadata 或 severity 分级

## Product Review

### User Value

- 解决的问题：agent / CI 当前只能读取文本输出，缺少稳定可解析的 docs impact 契约
- 目标用户：主要依赖 agent 自动推进、或需要把 docs impact 接入脚本链路的维护者
- 预期收益：减少脆弱的文本解析，让 drift-control 能被直接编排和消费

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：
  - `scripts/docs-verify.mjs`
  - `scripts/check-governance.mjs`
  - `package.json`
  - `README.md`
  - `CONTRIBUTING.md`
- 依赖方向：
  - 继续复用现有 `analyzeDocsImpact`
  - 结构化输出只做序列化层，不改规则引擎
- 需要新增或修改的边界：
  - `docs:impact` 增加输出格式概念
  - 需要明确哪些字段可作为稳定契约对外承诺

### Verification

- 自动验证：
  - `npm run docs:impact`
  - `npm run docs:impact:json`
  - `npm run docs:verify`
  - `npm run check:governance`
  - 定向状态文件下的 `--impact-only --format json`
- 人工验证：
  - 检查 JSON 字段是否足够让 agent / CI 决策
  - 检查文本模式仍然可读且未退化
- 回滚：
  - 回退结构化输出参数和脚本入口
