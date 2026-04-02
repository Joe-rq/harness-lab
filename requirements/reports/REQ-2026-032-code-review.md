# Code Review: REQ-2026-032 Experience 文档质量门禁

## 概述

本 REQ 解决了 REQ-2026-031 遗留的深层问题：经验文档存在性检查不等于质量检查。

## 代码变更

### scripts/req-cli.mjs

**新增函数**：
- `validateExperienceContent(content)` - 验证经验文档内容是否有占位符
- `findExperienceDocs(reqId)` - 查找经验文档，支持文件名和内容匹配

**修改逻辑**：
- `completeCommand` 检查逻辑从"存在性检查"升级为"质量门禁"
- 检测到占位符时列出具体章节并给出修复指导

### context/experience/README.md

- 明确命名约定为 `REQ-xxx-slug.md`
- 添加生成命令说明
- 添加内容校验警告

### README.md

- 添加 `req:experience` 命令说明
- 添加经验文档质量门禁说明

## 设计评价

**优点**：
1. 双重匹配策略（文件名 + 内容链接）兼容历史文档
2. 占位符检测复用了 `req-validation.mjs` 的成熟模式
3. 错误提示明确，列出具体问题

**潜在风险**：
1. 9 个占位符可能不够全面，未来模板更新需要同步
2. 内容匹配依赖 `requirements/completed/{reqId}.md` 链接格式

## 测试覆盖

- 现有测试使用 `--skip-experience` 参数适配
- 手动验证了空骨架检测和填充内容通过两种场景

## 结论

✅ 代码逻辑正确，实现了设计目标。
