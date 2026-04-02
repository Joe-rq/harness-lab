# REQ-2026-032: Experience 文档质量门禁

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

REQ-2026-031 实现了"经验沉淀强制检查"，但存在以下深层问题：

### 问题 1：命名约定与检查逻辑矛盾

当前 `context/experience/` 目录下 21 篇经验文档：
- 仅 2 篇使用 REQ ID 命名（`REQ-2026-031-governance.md`）
- 其余 19 篇使用日期命名（`2026-03-23-xxx.md`）

`req:complete` 的检查逻辑使用 `startsWith(reqId)` 匹配文件名，无法识别日期命名的经验文档。这导致：
- 如果允许两种命名 → 检查逻辑有漏洞
- 如果只允许 REQ ID 命名 → 历史 19 篇文档"不合规"

### 问题 2：存在性 ≠ 质量

用户可以执行：
```bash
npm run req:experience -- --id REQ-xxx   # 生成空骨架
npm run req:complete -- --id REQ-xxx     # 检查通过
```

空骨架文件可以通过检查，完全违背"确保有价值经验被沉淀"的初衷。这与 REQ-2026-015 解决的"空模板 REQ"问题完全相同，只是对象换成了经验文档。

### 问题 3：无内容校验

类似 REQ-2026-015 的 `req:start` 阻断空模板，`req:complete` 也应该阻断空经验文档。

## 目标

- **目标 1**：统一经验文档命名约定，明确必须使用 `REQ-xxx-slug.md` 格式
- **目标 2**：实现经验文档内容校验，检测模板占位符是否被填充
- **目标 3**：更新 `req:complete` 检查逻辑，从"存在性检查"升级为"质量门禁"
- **目标 4**：提供迁移方案，处理历史日期命名文档

## 非目标

- 不强制要求经验文档的长度（仅要求关键章节有实质内容）
- 不自动迁移历史文档（提供工具但由人工决定）
- 不修改经验文档的目录结构

## 范围

- 涉及目录 / 模块：
  - `scripts/req-cli.mjs`（experience 子命令和 complete 检查逻辑）
  - `context/experience/TEMPLATE.md`（添加内容校验规则）
  - `context/experience/README.md`（明确命名约定）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（小改动，设计内容已写入 REQ 文件）

**允许（CAN）**：
- 修改 req-cli.mjs 添加内容校验逻辑
- 更新模板和 README 文档
- 添加 `req:experience --migrate` 迁移工具（可选）

**禁止（CANNOT）**：
- 自动删除或重命名历史经验文档
- 引入新的外部依赖
- 修改已有经验文档的内容

**边界条件**：
- 改动规模：仅 CLI 脚本和文档
- 向后兼容：历史文档保持可读，只是检查逻辑不认

## 验收标准

- [x] `context/experience/README.md` 明确命名约定为 `REQ-xxx-slug.md`
- [x] `req:complete` 检查逻辑能识别文件内容中的 REQ 链接（支持日期命名文档）
- [x] 内容校验检测以下模板占位符：
  - `{DATE}` 未替换
  - `{TITLE}` 未替换
  - `{REQ_ID}` 未替换
  - `{遇到的关键问题或重复模式}` 未替换
  - `{踩过的坑}` 未替换
- [x] 检测到占位符时给出明确错误提示，列出未填充章节
- [ ] `--skip-experience` 仍可使用，但需要明确理由
- [ ] `npm test` 通过

## 设计与实现链接

- 设计稿：本文档即设计（小改动无需单独设计稿）
- 相关规范：
  - `context/experience/TEMPLATE.md`
  - `context/experience/README.md`
- 参考实现：`scripts/req-validation.mjs`（REQ 空模板检测逻辑）

## 报告链接

- Code Review：`requirements/reports/REQ-2026-032-code-review.md`
- QA：`requirements/reports/REQ-2026-032-qa.md`
- Ship：不适用（框架内部改进）

## 验证计划

- 计划执行的命令：
  - `npm test` - 确保测试通过
  - 创建一个空骨架经验文档，验证 `req:complete` 能否阻断
  - 填充内容后验证能否通过
- 需要的环境：本地 Node.js 环境
- 需要的人工验证：手动测试内容校验逻辑

## 阻塞 / 搁置说明（可选）

- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚

- 风险：
  - 内容校验过严可能误判有效文档
  - 历史 19 篇日期命名文档在严格检查下会被标记为"未关联 REQ"
- 回滚方式：
  - 恢复 scripts/req-cli.mjs 到上一版本
  - 删除内容校验相关代码

## 关键决策

- 2026-04-02：创建 REQ-2026-032，基于 REQ-2026-031 元反思发现的问题
- 2026-04-02：决定参考 REQ-2026-015 的空模板检测模式，复用 `req-validation.mjs` 的设计思路
- 2026-04-02：决定支持文件内容中的 REQ 链接识别，兼容历史日期命名文档

<!-- Source file: REQ-2026-032-experience-doc-quality-gate.md -->
