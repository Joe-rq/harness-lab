# REQ-2026-031: Governance: 强制经验沉淀闭环

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
在 openclaw-auto-memory 项目的使用中发现了 Harness Lab 框架的一个真实漏洞：

1. **软约束问题**：`requirements/INDEX.md` 第78行写着"如有复用价值，补 `context/experience/` 经验文档"——这是纯粹的软约束
2. **无校验**：`req:complete` 脚本只检查 code-review/qa/ship 三份报告，完全不校验 experience 文档
3. **无生成器**：没有 `req:experience --id REQ-xxx` 命令来自动初始化骨架
4. **实践结果**：001-006 共6个REQ的经验文档全部缺失，包括：
   - 002 被 req:start exact heading 陷阱卡三次
   - 003/004 oxfmt 反复打断 verify 的教训
   - 005 E2E 测试目录和 temp dir 隔离经验
   - 006 docs:verify 相对路径链接失败教训

harness-lab 自身虽有18个 experience 文档，但全靠自觉而非机制保障。

## 目标
- **目标1**: `req:complete` 强制检查 `context/experience/` 下是否有对应 REQ 的经验文档
- **目标2**: 提供 `req:experience --id REQ-xxx` 命令快速生成经验文档骨架
- **目标3**: 提供 `--skip-experience` 选项（需说明理由）处理确实无价值的 REQ
- **目标4**: 更新 `requirements/INDEX.md` 和模板，明确经验沉淀为强制步骤

## 非目标
- 不强制要求 experience 文档的长度或质量（仅要求存在性）
- 不追溯要求补齐历史 REQ 的经验文档（仅对新 REQ 生效）
- 不修改 experience 文档的目录结构或命名约定

## 范围
- 涉及目录 / 模块：
  - `scripts/req-cli.mjs`（新增 experience 子命令和 complete 检查）
  - `requirements/INDEX.md`（更新生命周期约定）
  - `requirements/REQ_TEMPLATE.md`（添加经验沉淀相关字段）
  - `context/experience/README.md`（补充生成器使用说明）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（框架 governance 修复，设计内容已写入 REQ 文件）

**允许（CAN）**：
- 修改 req-cli.mjs 添加子命令和校验逻辑
- 修改 INDEX.md 和 REQ_TEMPLATE.md 文档
- 添加辅助模板文件（如 `context/experience/TEMPLATE.md`）

**禁止（CANNOT）**：
- 修改现有 experience 文档
- 修改 req:complete 的报告检查逻辑（code-review/qa/ship 部分）
- 引入新的外部依赖

**边界条件**：
- 改动规模：仅 CLI 脚本和文档，不涉及测试框架或 hooks
- 向后兼容：已有豁免文件 `.claude/.req-exempt` 机制不受影响

## 验收标准
- [x] `req:experience --id REQ-xxx` 可生成 `context/experience/REQ-xxx-*.md` 骨架
- [x] 生成的骨架包含 REQ 链接、关键决策、踩坑记录、可复用模式等章节
- [x] `req:complete` 执行时检查 `context/experience/REQ-{id}*` 文件存在性
- [x] 检查失败时给出明确错误提示并指导用户使用 req:experience
- [x] `--skip-experience "理由"` 可绕过检查（理由会输出到控制台）
- [x] `requirements/INDEX.md` 第78行改为强约束措辞
- [x] `npm test` 通过（测试已更新适配新检查）
- [ ] `npm run check:governance` 通过（需要处理 docs gate）

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-031-design.md`（本文档即设计，无需单独设计稿）
- 相关规范：context/experience/README.md

## 报告链接
- Code Review：`requirements/reports/REQ-2026-031-code-review.md`
- QA：`requirements/reports/REQ-2026-031-qa.md`
- Ship：不适用（本改动为框架内部 governance 修复，无需发布）

## 验证计划
- 计划执行的命令：
  - `npm test` - 确保测试通过
  - `npm run check:governance` - governance 检查通过
  - `npm run req:experience -- --id REQ-2026-031` - 测试生成器
  - `npm run req:complete -- --id REQ-2026-031` - 测试强制检查
- 需要的环境：本地 Node.js 环境
- 需要的人工验证：手动测试 CLI 交互

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：
  - `req:complete` 强制检查可能导致已有自动化流程失败
  - `--skip-experience` 滥用可能成为逃避经验沉淀的后门
- 回滚方式：
  - 恢复 scripts/req-cli.mjs 到上一版本
  - 恢复 requirements/INDEX.md 第78行措辞

## 关键决策
- 2026-04-01：发现 openclaw-auto-memory 项目 001-006 REQ 经验文档全部缺失
- 2026-04-01：创建 REQ-2026-031 修复 governance 漏洞
- 2026-04-01：决定将 experience 从软约束升级为硬检查，但允许 `--skip` 应对特殊情况

<!-- Source file: REQ-2026-031-governance.md -->
