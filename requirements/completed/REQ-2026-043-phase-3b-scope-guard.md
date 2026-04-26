# REQ-2026-043: Phase 3B 范围强制（防越界）

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 3A 建立了模式切换 + Stop 评估器 + SessionEnd 反思的基础安全层。但当前系统无法防止 AI 修改 REQ 声明范围外的文件——例如一个只涉及 `scripts/` 的 REQ，AI 可能顺手改了 `requirements/` 或 `.claude/` 下的文件。这种"越界修改"在 supervised/autonomous 模式下尤其危险，因为人不在 loop 中审查每一步。

## 目标
1. scope-guard.mjs 在 PreToolUse 时检查写入目标是否在 REQ 范围内
2. REQ 模板的范围章节从自由文本升级为结构化文件列表（glob 模式）
3. 越界操作被记录到 scope-violations.log

## 非目标
- 不做实时通知（只记录日志 + hook 阻断）
- 不做范围自动推断（由人工在 REQ 中声明）
- 不改 req-check.sh 的逻辑（scope-guard 是独立 hook）

## 颗粒度自检
- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（3 个文件：scope-guard.mjs、REQ_TEMPLATE.md、settings.local.json）
- [x] 涉及模块/目录 ≤ 4？（2 个：scripts/、requirements/）
- [x] 能否用一句话描述"解决了什么问题"？（防止 AI 修改 REQ 范围外的文件）
- [x] 如果失败，能否干净回滚？（删除 scope-guard.mjs + 撤销模板改动 + 移除 hook 注册）

## 范围

> 声明本 REQ 允许修改的文件/目录（scope-guard 据此拦截越界操作）。
> 支持通配符：`*`（单层匹配）、`**`（任意深度）。无声明则不拦截（向后兼容）。

- 涉及文件：
  - `scripts/scope-guard.mjs`
  - `requirements/REQ_TEMPLATE.md`
  - `.claude/settings.local.json`
  - `requirements/in-progress/REQ-2026-043-*.md`
  - `requirements/reports/REQ-2026-043-*.md`
- 涉及目录 / 模块：scripts/、requirements/
- 影响接口 / 页面 / 脚本：PreToolUse hook 链

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（本 REQ 规模小，3 个文件改动，无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/scope-guard.mjs（新建）、requirements/REQ_TEMPLATE.md（修改）、.claude/settings.local.json（修改）
- 可新增的测试 / 脚本：无

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：scripts/req-check.sh、scripts/stop-evaluator.mjs、scripts/session-reflect.mjs
- 不可引入的依赖 / 操作：只使用 Node.js stdlib

**边界条件**：
- scope-guard 与 req-check.sh 共存于 PreToolUse 阶段，两者独立运行
- scope-guard 只拦截 Write/Edit 操作，不影响 Read/Bash

## 验收标准
- [ ] scope-guard 能根据 REQ 范围拦截越界 Write/Edit 操作
- [ ] REQ 模板范围章节支持 glob 文件列表格式（如 `scripts/*.mjs`、`requirements/**`）
- [ ] 旧 REQ（无结构化范围声明）向后兼容（无范围声明 = 不拦截）
- [ ] 越界操作记录到 `.claude/scope-violations.log`
- [ ] 现有测试全部通过

## 设计与实现链接
- 设计稿：无（本 REQ 规模小，直接实施）
- 相关规范：unified-roadmap.md Phase 3B 章节

## 报告链接
- Code Review：`requirements/reports/REQ-2026-043-code-review.md`
- QA：`requirements/reports/REQ-2026-043-qa.md`

## 验证计划
- 计划执行的命令：`npm test`
- 需要的环境：本地开发环境
- 需要的人工验证：
  1. 创建一个有结构化范围声明的 REQ，尝试写入范围外文件 → 应被阻断
  2. 尝试写入范围内文件 → 应放行
  3. 无活跃 REQ → 不拦截（req-check.sh 仍然拦截）
  4. 有活跃 REQ 但无范围声明 → 不拦截（向后兼容）

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现
- [ ] 旧功能保护
- [ ] 逻辑正确性
- [ ] 完整性
- [ ] 可维护性

#### 对齐检查（record 阶段）
- [ ] 目标对齐
- [ ] 设计对齐
- [ ] 验收标准对齐

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：glob 匹配误判导致正常操作被阻断
- 回滚方式：删除 scope-guard.mjs + 移除 settings.local.json 中的 hook 注册

## 关键决策
- 2026-04-26：scope-guard 与 req-check.sh 共存于 PreToolUse，两者独立运行。req-check.sh 负责"有无 REQ"，scope-guard 负责"是否在范围内"。顺序上 req-check.sh 先执行（Shell hook 更快），scope-guard 后执行（Node.js hook）。

<!-- Source file: REQ-2026-043-phase-3b-scope-guard.md -->
