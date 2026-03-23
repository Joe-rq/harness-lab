# REQ-2026-003 Design

## Background

Harness Lab 目前已有 `check:governance`，能检查治理结构、索引和关键文件，但它还不能发现 README、REQ、设计稿和经验文档里的本地链接、命令名或路径引用是否已经过期。
这会让模板在“结构没坏”时仍然出现“说明书已落后”的问题。

## Goal

- 补上 `docs:verify` 的最小质量门
- 让本地 Markdown 链接、`npm run` 命令引用和关键路径引用能被自动检查
- 让 `check:governance` 在文档质量失败时也失败

## Scope

### In scope

- `scripts/docs-verify.mjs`
- `package.json` 的 `docs:verify` 命令
- README 中模板维护者的文档校验说明
- `check:governance` 对 `docs:verify` 的调用

### Out of scope

- 远程 URL 可达性检查
- Markdown 锚点标题精确解析
- 拼写检查、术语统一和语义过期检测
- diff-aware 的“代码改动必须改哪些文档”规则

## Product Review

### User Value

- 解决的问题：代码和流程改了，但文档没同步时，现有治理层拦不住
- 目标用户：维护 Harness Lab 本身的人，以及接入后依赖文档恢复上下文的维护者 / agent
- 预期收益：把“README 旧了、命令名错了、路径失效了”这类问题前置成自动失败

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：
  - Markdown 文档递归扫描
  - `package.json` 脚本入口
  - `check:governance` 执行链
- 依赖方向：
  - `docs:verify` 只读取仓库文件，不依赖外部服务
- 需要新增或修改的边界：
  - 引入“文档质量 gate”这一新层，但仍保持零运行时依赖

### Verification

- 自动验证：
  - `npm run docs:verify`
  - `npm run check:governance`
- 人工验证：
  - 检查 README 是否已解释 `docs:verify`
  - 核对文档质量失败会让治理检查失败
- 回滚：
  - 回退 `docs:verify` 和相关文档变更
