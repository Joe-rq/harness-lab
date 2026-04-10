# REQ-2026-034: 循环检测与豁免 TTL 机制

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
借鉴 wow-harness 项目分析，发现 harness-lab 存在两个治理盲区：
1. AI 在编辑同一文件时可能陷入 edit-fix-edit 循环，当前无任何感知机制
2. `.req-exempt` 豁免文件创建后无过期机制，AI 可创建后"忘记"删除，导致治理形同虚设

这两个机制都是轻量级 PostToolUse hook，成本极低但堵住真实漏洞。

## 目标
- 新增 PostToolUse 循环检测 hook：同一文件 5 次/小时触发提醒
- 新增 SessionStart 豁免 TTL 检查：超过 2 小时强制提醒
- 保持纯 Node.js 零依赖技术栈一致性

## 非目标
- 不做审查隔离（人机协作场景不需要）
- 不做风险追踪棘轮机制（P2 优先级，后续再议）
- 不引入 Python 依赖

## 范围
- 涉及目录 / 模块：scripts/, .claude/
- 影响接口 / 页面 / 脚本：session-start.sh, settings.local.json

### 约束（Scope Control，可选）
**豁免项**：
- [x] skip-design-validation（逻辑简单，无需独立设计稿）

**允许（CAN）**：
- 新建 scripts/loop-detection.js
- 修改 scripts/session-start.sh
- 修改 .claude/settings.local.json
- 新增 .claude/.loop-state/ 目录存储状态

**禁止（CANNOT）**：
- 不修改 req-check.js / req-check.sh
- 不引入任何外部 npm 依赖

**边界条件**：
- 循环检测阈值：同一文件 5 次/小时
- 豁免 TTL：2 小时

## 验收标准
- [ ] PostToolUse hook 能检测同一文件重复编辑并注入提醒
- [ ] SessionStart 时检查豁免文件 TTL 并显示警告
- [ ] 状态文件存储在 .claude/.loop-state/ 并有 1 小时 TTL 自动清理
- [ ] 不影响正常的单次编辑操作
- [ ] 跨平台兼容（Windows/macOS/Linux）

## 设计与实现链接
- 设计稿：无需独立设计稿（逻辑简单，直接实现）
- 相关规范：wow-harness loop-detection.py 和 risk-tracker.py

## 报告链接
- Code Review：`requirements/reports/REQ-2026-034-code-review.md`
- QA：`requirements/reports/REQ-2026-034-qa.md`
- Ship：不适用（模板仓库无需发布）

## 验证计划
- 手动触发 PostToolUse hook 验证循环检测
- 创建超过 2 小时的豁免文件验证 SessionStart 警告
- 确认状态文件 TTL 清理逻辑

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：PostToolUse hook 执行超时影响编辑体验
- 回滚方式：从 settings.local.json 移除 PostToolUse hook 注册

## 关键决策
- 2026-04-10：采用 wow-harness 的循环检测模式，但用 Node.js 重写
- 2026-04-10：豁免 TTL 设为 2 小时，比 wow-harness 的 1 小时更宽松

<!-- Source file: REQ-2026-034-loop-detection-and-exempt-ttl.md -->
