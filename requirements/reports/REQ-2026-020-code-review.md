# Code Review: REQ-2026-020

## 审查范围
- `scripts/req-validation.mjs` - 新增设计文档验证函数
- `scripts/req-cli.mjs` - startCommand 中调用设计文档验证
- `tests/governance.test.mjs` - 补充测试用例

## 改动摘要

### 新增函数 (req-validation.mjs)
1. `validateDesignDocument(reqId, reqContent, rootDir)` - 设计文档内容验证
2. `buildDesignBlockMessage({ reqId, validation })` - 构建阻断消息
3. `hasDesignExemption(reqContent)` - 检查豁免标记

### 验证逻辑
- 检测设计文档是否存在
- 检测占位符行是否有实际内容（精确匹配，非子串匹配）
- 支持 REQ 约束章节标注豁免

### startCommand 集成 (req-cli.mjs)
- 在 REQ 内容验证后添加设计文档验证
- 阻断空设计文档的 REQ 进入实施阶段
- 显示跳过提示当豁免标记存在

## 代码质量
- ✅ 逻辑正确：精确匹配占位符行，避免误报
- ✅ 与现有机制一致：复用 validateReqDocument 的模式
- ✅ 测试覆盖：测试用例覆盖正常流程
- ✅ 豁免机制：支持小改动跳过设计文档要求

## 状态
- ✅ 通过
