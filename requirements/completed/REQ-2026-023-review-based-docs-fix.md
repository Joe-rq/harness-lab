# REQ-2026-023: 基于综合评审结果的文档修正

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
2026-03-31 完成 harness-lab 项目综合评审（reviews/harness-lab-review-2026-03-31.md），评审识别出以下 P0 行动项：
1. 修正目标用户画像描述：移除"团队技术负责人"，明确单用户边界
2. README 首屏强调零依赖优势
3. AGENTS.md 添加"已知限制"章节

## 目标
- 修正 README.md 和 AGENTS.md 中的用户定位描述，与实际能力对齐
- 在 README 首屏显式强调零外部依赖的核心优势
- 在 AGENTS.md 明确单用户设计的已知限制

## 非目标
- 不实现并发控制、权限系统等团队协作功能（评审结论：暂不扩展到团队场景）
- 不重构代码架构（文档修正不涉及代码改动）

## 范围
- 涉及目录 / 模块：README.md、AGENTS.md
- 影响接口 / 页面 / 脚本：无（纯文档变更）

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**豁免项**：
- [x] skip-design-validation（纯文档修正无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：README.md、AGENTS.md
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：scripts/ 目录下的任何代码文件
- 不可引入的依赖 / 操作：新增 npm 依赖

**边界条件**：
- 时间 / 环境 / 数据约束：无
- 改动规模或发布边界：仅限入口文档的定位描述修正

## 验收标准
- [ ] README.md"适合"章节不再包含"多人或多 agent 协作项目"
- [ ] README.md 包含明确的"零外部依赖"核心优势说明
- [ ] README.md"已知限制"章节说明单用户和无并发控制
- [ ] AGENTS.md 包含"已知限制"章节，说明单用户设计边界
- [ ] npm run docs:verify 通过
- [ ] npm test 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-023-design.md`
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-023-code-review.md`
- QA：`requirements/reports/REQ-2026-023-qa.md`
- Ship：`requirements/reports/REQ-2026-023-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：npm test、npm run docs:verify、npm run check:governance
- 需要的环境：Node.js
- 需要的人工验证：无

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：低风险，纯文档变更
- 回滚方式：git revert 提交即可

## 关键决策
- 2026-03-31：评审结论认定目标用户画像与系统能力矛盾，需修正定位描述

<!-- Source file: REQ-2026-023-review-based-docs-fix.md -->
