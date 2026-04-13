# REQ-2026-035: 错误分类器：结构化治理错误与恢复策略

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

当前 harness-lab 的治理 Hook（`req-check.sh`、`req-validation.mjs`）只有两种输出：
- `exit 0`：通过
- `exit 2`：阻断

阻断时输出的错误信息是自由文本，缺少结构化分类。这导致：
1. **用户难以快速定位问题**：需要阅读完整错误信息才能理解
2. **无法自动化恢复**：没有错误代码，无法编写自动化脚本
3. **缺少恢复建议**：只告知"失败了"，不告知"怎么办"

借鉴 hermes-agent 的 `error_classifier.py` 设计，引入结构化错误分类器。

## 目标

1. 定义治理错误的分类体系（错误代码 + 类型 + 描述）
2. 为每种错误类型提供结构化的恢复策略
3. 改造现有 Hook 输出，使用统一的错误格式
4. 支持错误日志的结构化记录

## 非目标

- 不改变现有的治理规则逻辑
- 不引入数据库（保持纯文件存储）
- 不实现自动恢复执行（只提供建议）

## 范围

- 涉及目录 / 模块：`scripts/`
- 影响接口 / 页面 / 脚本：`req-check.sh`、`req-validation.mjs`、`req-cli.mjs`

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/` 下所有文件
- 可新增的测试 / 脚本：`scripts/error-classifier.mjs`

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：`requirements/`、`context/`、`.claude/settings*.json`
- 不可引入的依赖 / 操作：外部 npm 包

**边界条件**：
- 保持向后兼容：现有 Hook 的 exit code 不变（0/2）
- 输出格式增强，不破坏现有流程

## 验收标准

- [ ] 错误分类定义完成，包含至少 6 种错误类型
- [ ] `error-classifier.mjs` 模块可独立使用
- [ ] `req-check.sh` 输出结构化错误信息
- [ ] 错误日志 `.claude/error.log` 包含错误代码
- [ ] 每种错误类型有对应的恢复命令示例
- [ ] 测试覆盖主要错误场景

## 设计与实现链接

- 设计稿：`docs/plans/REQ-2026-035-design.md`
- 相关规范：无

## 报告链接

- Code Review：`requirements/reports/REQ-2026-035-code-review.md`
- QA：`requirements/reports/REQ-2026-035-qa.md`
- Ship：`requirements/reports/REQ-2026-035-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划

- 计划执行的命令：
  - `npm test`：运行测试
  - `npm run check:governance`：验证治理检查
  - 手动触发各种错误场景，验证输出格式
- 需要的环境：Node.js 18+
- 需要的人工验证：检查错误信息的可读性和准确性

## 阻塞 / 搁置说明（可选）

- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚

- 风险：输出格式变化可能影响解析日志的脚本
- 回滚方式：恢复 `scripts/` 下修改的文件

## 关键决策

- 2026-04-13：由 `req:create` 自动生成骨架，待补充具体内容

<!-- Source file: REQ-2026-035-governance-error-classifier.md -->
