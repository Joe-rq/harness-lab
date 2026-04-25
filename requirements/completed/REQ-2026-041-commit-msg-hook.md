# REQ-2026-041: commit-msg hook 校验提交消息格式

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
CONTRIBUTING.md 定义了 commit 规范（中文描述、type/scope、REQ 编号关联），但没有任何 hook 在 `git commit` 时校验消息格式。规范写了≠规范生效——连续多个 commit 用了英文消息、全角括号，无人拦截。REQ-2026-021 当初标注"后续可引入 commitlint"，但一直没做。

## 目标
- 新增 commit-msg hook 脚本校验提交消息格式
- feat/fix 类型必须包含 (REQ-YYYY-NNN)，其他类型可选
- 校验失败时拒绝提交并给出正确示例

## 非目标
- 不引入 commitlint 依赖（纯 shell 脚本，零依赖）
- 不校验 body 内容（只校验首行格式）

## 颗粒度自检
- [x] 目标数 ≤ 4？（2 个：脚本 + hook 注册）
- [x] 涉及文件数 ≤ 4？（2 个文件）
- [x] 涉及模块/目录 ≤ 4？（2 个目录）
- [x] 能否用一句话描述"解决了什么问题"？（commit 消息格式无校验，规范形同虚设）
- [x] 如果失败，能否干净回滚？（删除脚本 + 移除 hook 配置）

## 范围
- 涉及目录 / 模块：scripts/、.claude/
- 影响接口 / 页面 / 脚本：git commit 行为

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（单脚本，逻辑简单）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/commit-msg-check.sh、.claude/settings.local.json
- 可新增的测试 / 脚本：commit-msg-check.sh

**禁止（CANNOT）**：
- 不可引入 npm 依赖
- 不可修改 req-cli.mjs

**边界条件**：
- 只校验首行格式，不校验 body

## 验收标准
- [ ] `git commit -m "feat(req): 新增功能 (REQ-2026-041)"` 通过校验
- [ ] `git commit -m "docs: 更新文档"` 通过校验（非 feat/fix 无需 REQ 编号）
- [ ] `git commit -m "Add new feature"` 被拒绝（无 type、英文描述）
- [ ] `git commit -m "feat(req): 新增功能（REQ-2026-041）"` 被拒绝（全角括号）
- [ ] `git commit -m "fix: 修复bug"` 被拒绝（feat/fix 缺 REQ 编号）
- [ ] 现有测试全部通过

## 设计与实现链接
- 设计稿：豁免
- 相关规范：CONTRIBUTING.md Commit 规范章节

## 报告链接
- Code Review：`requirements/reports/REQ-2026-041-code-review.md`
- QA：`requirements/reports/REQ-2026-041-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：`npm test`、手动测试各种 commit 消息格式
- 需要的环境：本仓库
- 需要的人工验证：确认合法消息通过、非法消息被拦截

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现：commit 消息格式是否被校验？
- [ ] 旧功能保护：git commit 正常流程是否不受影响？
- [ ] 逻辑正确性：边界情况（无 scope、merge commit）是否处理？
- [ ] 完整性：所有 type 和 scope 是否覆盖？
- [ ] 可维护性：type/scope 列表是否容易扩展？

#### 对齐检查（record 阶段）
- [ ] 目标对齐：校验规则是否与 CONTRIBUTING.md 一致？
- [ ] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：hook 过严导致正常 commit 被误拒（如 merge commit、revert commit）
- 回滚方式：移除 settings.local.json 中的 hook 配置

## 关键决策
- 2026-04-25：纯 shell 脚本，零依赖，对照 CONTRIBUTING.md 规范校验首行
- 2026-04-25：merge commit 和 revert commit 自动豁免
