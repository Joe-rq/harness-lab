# REQ-2026-042: Phase 3A: 基础安全模式（模式切换 + Stop 评估器 + SessionEnd 反思）

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：AI 在会话结束时容易"假装完成"——声称已实现但验收标准未覆盖、progress.txt 未更新、下次会话丢失上下文。
业务背景：Phase 3A 是安全护栏的基础层。当前 hook 覆盖了 SessionStart/PreToolUse/PostToolUse/commit-msg，但 Stop 和 SessionEnd 两个关键节点完全空白。AI 最容易在这两个节点假完成。

## 目标
- 新增 harnessMode 字段（collaborative/supervised/autonomous），所有 hook 读取此字段走不同分支
- 新增 Stop 评估器：交叉检查 REQ 验收标准 vs git diff，未覆盖则提醒/阻断
- 新增 SessionEnd 反思：自动更新 progress.txt，生成会话摘要

## 非目标
- 不做范围强制（Phase 3B）
- 不做风险追踪（Phase 3C）
- 不做 autonomous 模式的完整行为（当前只实现 collaborative + supervised，autonomous 预留接口）

## 颗粒度自检
- [x] 目标数 ≤ 4？3 个目标
- [x] 涉及文件数 ≤ 4？settings.local.json + stop-evaluator.mjs + session-reflect.mjs + loop-detection.mjs = 4
- [x] 涉及模块/目录 ≤ 4？scripts/ + .claude/ = 2
- [x] 能否用一句话描述"解决了什么问题"？堵住 Stop 和 SessionEnd 两个假完成漏洞
- [x] 如果失败，能否干净回滚？独立脚本，可删除 hook 注册即可

## 范围
- 涉及目录 / 模块：scripts/、.claude/
- 影响接口 / 页面 / 脚本：settings.local.json hooks 注册、session-start.sh 显示模式

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [x] skip-design-validation（改动范围明确，沿用路线图设计）

**允许（CAN）**：
- 可修改的文件 / 模块：.claude/settings.local.json、scripts/loop-detection.mjs、scripts/session-start.sh
- 可新增的测试 / 脚本：scripts/stop-evaluator.mjs、scripts/session-reflect.mjs

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：scripts/req-cli.mjs、scripts/req-check.sh、requirements/ 模板
- 不可引入的依赖 / 操作：禁止 npm 依赖，纯 Node.js stdlib

**边界条件**：
- Stop 评估器只在有活跃 REQ 时生效
- SessionEnd 反思只在有文件改动时生成摘要
- collaborative 模式：提醒但不阻断；supervised 模式：阻断未覆盖的验收标准

## 验收标准
- [ ] harnessMode 字段可切换（collaborative/supervised），hook 行为随之变化
- [ ] Stop 评估器：AI 提前结束时，交叉检查验收标准 vs git diff，未覆盖条目注入提醒
- [ ] SessionEnd 反思：会话结束时自动更新 progress.txt + 生成 session-log 摘要
- [ ] session-start.sh 显示当前模式
- [ ] 现有测试全部通过

## 设计与实现链接
- 设计稿：路线图 Phase 3A 章节（docs/plans/unified-roadmap.md）
- 相关规范：Hook 输出格式（decision + additionalContext）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-042-code-review.md`
- QA：`requirements/reports/REQ-2026-042-qa.md`
- Ship：`requirements/reports/REQ-2026-042-ship.md`（需要发布时填写；否则在 REQ 中说明不适用）

## 验证计划
- 计划执行的命令：`npm test`
- 需要的环境：本仓库
- 需要的人工验证：
  1. 切换 harnessMode 值，验证 session-start.sh 显示正确模式
  2. 有活跃 REQ 时模拟 Stop，验证评估器输出
  3. 有文件改动时模拟 SessionEnd，验证 progress.txt 更新

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现：功能是否完整实现？是否覆盖了核心场景？
- [ ] 旧功能保护：新功能是否破坏了现有功能？
- [ ] 逻辑正确性：边界情况是否处理？错误处理是否完备？
- [ ] 完整性：是否有遗漏的子功能？
- [ ] 可维护性：代码是否清晰？接口是否合理？

#### 对齐检查（record 阶段）
- [ ] 目标对齐：实现是否服务于最初的用户痛点？
- [ ] 设计对齐：实现是否符合设计文档？
- [ ] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：功能遗漏（对照验收标准检查）、与现有功能冲突
- 回滚方式：`git revert` 或功能开关关闭

## 关键决策
- 2026-04-26：Feature 型 REQ，建议创建设计文档

<!-- Source file: REQ-2026-042-phase-3a-stop-sessionend.md -->
