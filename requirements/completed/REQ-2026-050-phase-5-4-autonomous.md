# REQ-2026-050: Phase 5.4 autonomous 模式实质化

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
三种模式（collaborative/supervised/autonomous）目前唯一区别是提醒语气，没有行为分化。collaborative 和 supervised 对 stop-evaluator 和 scope-guard 的行为完全相同（都是阻断），autonomous 模式与 collaborative 在 watchdog 和 risk-tracker 中无区别。模式配置变成了"装饰品"而非"行为开关"。

## 目标
让三种模式产生实际行为差异：

| 场景 | collaborative | supervised | autonomous |
|------|--------------|------------|------------|
| Watchdog 停滞 | 提醒 + 建议恢复策略 | 阻断 + 强制选择恢复策略 | 静默执行恢复策略 + 记录到日志 |
| Stop 未覆盖 | 提醒（不阻断） | 阻断 | 阻断（安全边界） |
| Scope 越界 | 阻断 | 阻断 | 阻断（安全边界） |
| Risk R3+ | stderr 提醒 | 阻断 + 提醒 | 允许 + 记录到 .risk-actions.log |
| 续传 | 询问是否继续 | 询问是否继续 | 自动继续 + 记录 |

**安全边界不可绕过**：Stop 未覆盖和 Scope 越界在 autonomous 模式下也阻断。

## 非目标
- 不新增模式类型
- 不修改 CLAUDE.md（异常响应协议和续传协议已覆盖行为指引）
- 不实现 Deploy Guard（属于 5.5）

## 颗粒度自检
- [x] 目标数 ≤ 4？→ 3（watchdog + risk-tracker + stop-evaluator + session-start）
- [x] 涉及文件数 ≤ 4？→ 3（watchdog.mjs + risk-tracker.mjs + stop-evaluator.mjs + session-start.sh = 4）
- [x] 涉及模块/目录 ≤ 4？→ 2（scripts/ + .claude/）
- [x] 能否用一句话描述"解决了什么问题"？→ 让三种模式从语气差异变为行为差异
- [x] 如果失败，能否干净回滚？→ 可以，git revert 即可，模式降级到现有行为

## 范围
- 涉及目录 / 模块：scripts/、.claude/session-log/
- 影响接口 / 页面 / 脚本：watchdog.mjs、risk-tracker.mjs、stop-evaluator.mjs、session-start.sh

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（改动是现有脚本的条件分支增强，逻辑明确）

**允许（CAN）**：
- scripts/watchdog.mjs：新增 autonomous 模式的静默恢复 + 日志记录
- scripts/risk-tracker.mjs：新增 autonomous 模式的允许 + 记录到 .risk-actions.log
- scripts/stop-evaluator.mjs：修正 collaborative 模式为提醒不阻断
- scripts/session-start.sh：新增 autonomous 模式的自动续传
- requirements/in-progress/**：REQ 文件自身
- requirements/reports/**：QA/CR 报告

**禁止（CANNOT）**：
- 不修改 scripts/scope-guard.mjs（三种模式都阻断，无需改动）
- 不修改 .claude/settings.local.json
- 不修改 CLAUDE.md

**边界条件**：
- scope-guard 三种模式都阻断——安全边界不可绕过

## 验收标准
- [ ] watchdog：autonomous 模式下不注入 additionalContext，而是记录恢复动作到日志
- [ ] watchdog：supervised 模式下阻断（decision: block）
- [ ] risk-tracker：autonomous 模式下 R3+ 不阻断，记录到 .risk-actions.log
- [ ] risk-tracker：supervised 模式下 R3+ 阻断
- [ ] stop-evaluator：collaborative 模式下不阻断（改为提醒）
- [ ] session-start.sh：autonomous 模式下自动续传（不显示询问提示）
- [ ] 现有治理测试全部通过

## 设计与实现链接
- 设计稿：不需要（skip-design-validation）
- 路线图参考：`docs/plans/unified-roadmap.md` Phase 5.4 章节

## 报告链接
- Code Review：`requirements/reports/REQ-2026-050-code-review.md`
- QA：`requirements/reports/REQ-2026-050-qa.md`

## 验证计划
- 计划执行的命令：`npm test`
- 需要的环境：本仓库
- 需要的人工验证：模拟三种模式下的 hook 输出

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [ ] 目标实现：三种模式是否有明确的行为差异？
- [ ] 旧功能保护：collaborative 模式的现有行为是否保持？
- [ ] 逻辑正确性：安全边界（Stop/Scope）是否在任何模式下都阻断？
- [ ] 完整性：所有 5 个场景是否都覆盖？
- [ ] 可维护性：模式分支是否清晰简洁？

#### 对齐检查（record 阶段）
- [ ] 目标对齐：实现是否服务于"模式从装饰品变为行为开关"？
- [ ] 设计对齐：实现是否符合路线图 5.4 描述？
- [ ] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：collaborative 模式 stop-evaluator 改为不阻断可能导致假完成；autonomous 模式 risk R3+ 允许可能导致破坏性操作
- 回滚方式：git revert

## 关键决策
- 2026-04-27：scope-guard 三种模式都阻断——安全边界不可绕过是硬约束
- 2026-04-27：collaborative stop-evaluator 从阻断改为提醒——与路线图定义对齐，collaborative = 人确认后执行
- 2026-04-27：skip-design-validation——改动是现有脚本的条件分支增强

<!-- Source file: REQ-2026-050-phase-5-4-autonomous.md -->
