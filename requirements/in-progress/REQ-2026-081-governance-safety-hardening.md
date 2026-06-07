# REQ-2026-081: governance-safety-hardening

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
/simplify 审查和用户核实发现四个治理问题：

1. **R4 规则遗漏（H）**：risk-tracker.mjs 的 R4（最高风险等级）白名单有 11 条规则，但 11 个 hook 脚本中有 6 个不在 R4 中，被静默降级为 R3 或 R2。特别是 `session-start.js` 是 `.js` 后缀，落入 R2 通配，连 R3 都不是。这不是理论风险，是已发生的降级。

2. **git rev-parse 重复调用（G）**：risk-tracker.mjs 每次 PostToolUse 触发时 `git rev-parse --show-toplevel` 被调用 2-3 次（main() 1 次 + RATCHET_FILE() 1-2 次），因为 RATCHET_FILE() 是无参函数，每次重新计算。

3. **配置漂移无检测（C 短期）**：`.codex/hooks.json` 与 `settings.local.json` 的 hook 配置完全手动同步，无任何自动化检测。已发生过漂移-修复循环（codex 从 4 类变为 6 类是人工修复的）。R4 规则也有同样问题——新增 hook 脚本时漏加 R4 规则不会被任何检查发现。

4. **权限表膨胀（F）**：settings.local.json 的 permissions.allow 有 118 条，其中约 70 条是被通配符覆盖的历史残留命令（echo/mv/curl/claude 等），约 6 条含硬编码旧路径。可读性差，每次权限检查增加无效匹配。

## 目标
- 补齐 6 个缺失的 R4 规则，让所有 hook 脚本获得最高风险保护
- 消除 risk-tracker 的重复 git rev-parse 调用（2-3 次 → 1 次）
- 在 check:governance 中增加 hook 配置一致性检查和 R4 覆盖完整性检查
- 清理 settings.local.json 权限表中 ~70 条被通配符覆盖的历史残留

## 非目标
- 不改 `.codex/hooks.json`（C 的问题用检查发现，不用生成脚本解决）
- 不创建共享 git-utils 模块（其他脚本只调 1 次 git rev-parse，缓存无收益）
- 不实现 R4 自动推导（R4 ≠ hook 脚本，两套列表语义不同）

## 颗粒度自检
- [x] 目标数 ≤ 4？4 个目标
- [x] 涉及文件数 ≤ 4？4 个文件（risk-tracker.mjs、check-governance.mjs、settings.local.json、tests）
- [x] 涉及模块/目录 ≤ 4？2 个（scripts/、.claude/）
- [x] 能否用一句话描述？修复治理安全防护降级 + 增加配置漂移检测 + 权限表清理
- [x] 如果失败，能否干净回滚？能，git revert

## 范围
- 涉及目录 / 模块：scripts/、.claude/、tests/
- 影响接口 / 页面 / 脚本：risk-tracker.mjs、check-governance.mjs、settings.local.json
- 测试文件：tests/governance.test.mjs（新增 hook 一致性和 R4 覆盖断言）、risk-tracker R4 分类断言

### 约束（Scope Control，可选）

**允许（CAN）**：
- 修改 risk-tracker.mjs 的 R4 规则和函数签名
- 在 check-governance.mjs 中增加一致性检查
- 清理 settings.local.json 的 permissions.allow
- 增加对应测试

**禁止（CANNOT）**：
- 不可修改 settings.local.json 的 **hooks 配置部分**（配置漂移用检测发现，不直接同步修复）
- 不可修改 .codex/hooks.json
- 不可修改 risk-tracker.mjs 的风险等级数值或 label
- 不可创建新的共享模块文件

- [x] skip-design-validation（代码修正 + 小范围增强，不需要设计稿）

## 验收标准
- [ ] 6 个缺失的 hook 脚本在 R4 规则中（session-start.js、review-gatekeeper.mjs、deploy-guard.mjs、risk-tracker.mjs、watchdog.mjs、precompact-notify.mjs）
- [ ] risk-tracker.mjs 每次 PostToolUse 只调用 1 次 git rev-parse
- [ ] check:governance 检测 .codex/hooks.json 与 settings.local.json 的 hook 类型集合差异和每个 hook entry 的 matcher/command/timeout 字段一致性
- [ ] check:governance 检测 hook 脚本未在 R4 规则中的降级情况
- [ ] settings.local.json 权限表从 118 条清理到 ~45 条，保留所有通配符和 MCP 权限
- [ ] `npm test` 通过
- [ ] `npm run check:governance` 通过

## 设计与实现链接
- 设计稿：无
- 相关规范：/simplify 审查报告（本轮对话）、用户核实表（本轮对话）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-081-code-review.md`
- QA：`requirements/reports/REQ-2026-081-qa.md`

## 验证计划
- 计划执行的命令：`npm test`、`npm run check:governance`
- 需要的环境：无特殊要求
- 需要的人工验证：确认 R4 规则覆盖所有 hook 脚本

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

## 临时实现与债务
- 无

## 风险与回滚
- 风险：R4 规则扩展可能将非核心脚本误标为 R4（低风险，新增 6 条均为 hook 注册脚本）
- 回滚方式：git revert

## 关键决策
- 2026-06-06：将 /simplify 审查的 H+G+C+F 合并为一个 REQ（4 个目标，4 个文件，同一治理安全主题）

<!-- Source file: REQ-2026-081-governance-safety-hardening.md -->
