# REQ-2026-021: 统一 commit 规范

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

当前 harness-lab 的 commit 历史混乱：
- 语言不统一（中英文混用）
- 格式不一致（有的用 conventional commits，有的用简单描述）
- REQ 编号引用方式不一致

这导致：
- 历史记录难以阅读
- 无法自动生成 changelog
- 难以追溯改动与 REQ 的关系

## 目标
- 定义统一的 commit message 格式
- 支持 REQ 编号自动关联
- 提供文档和示例

## 非目标
- 不引入 commitlint 等强制检查工具（后续可扩展）
- 不修改历史 commit

## 范围
- 涉及目录 / 模块：文档、CONTRIBUTING.md
- 影响接口 / 页面 / 脚本：无

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：CONTRIBUTING.md、context/experience/
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：无
- 不可引入的依赖 / 操作：无

**边界条件**：
- 时间 / 环境 / 数据约束：无
- 改动规模或发布边界：文档改动

## 验收标准
- [ ] CONTRIBUTING.md 包含 commit 规范
- [ ] 规范定义格式、类型、scope
- [ ] 提供正确/错误示例
- [ ] 说明 REQ 编号关联方式

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-021-design.md`
- 相关规范：Conventional Commits 1.0.0

## 报告链接
- Code Review：`requirements/reports/REQ-2026-021-code-review.md`
- QA：`requirements/reports/REQ-2026-021-qa.md`
- Ship：不适用（文档改动无发布）

## 验证计划
- 计划执行的命令：无
- 需要的环境：无
- 需要的人工验证：检查文档完整性

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：无
- 回滚方式：删除文档

## 关键决策
- 2026-03-30：采用 Conventional Commits 格式，支持 REQ 编号后缀

<!-- Source file: REQ-2026-021-unified-commit-convention.md -->
