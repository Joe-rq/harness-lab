# REQ-2026-022: 优化 harness-setup 安装流程

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

harness-setup 是将治理框架接入新项目的关键入口。在实际使用和代码审查中发现以下问题：

1. **Windows 兼容性问题**：hook 配置使用 bash 脚本，Windows 环境无法直接运行
2. **缺少安装后验证**：安装完成后没有验证框架是否真正生效的机制
3. **CLAUDE.md 融合存在优先级冲突风险**：目标项目可能声明"优先级最高"，覆盖治理协议
4. **settings.local.json 合并策略粗糙**：直接覆盖可能丢失用户已有的 hook 配置
5. **context/ 目录模板内容过多**：增加接入成本，需要手动清理大量占位内容

这些问题会降低框架的易用性和稳定性，需要系统性优化。

## 目标

- 添加安装后验证机制，确保框架正确生效
- 修复 Windows 兼容性，使 hook 能在多平台运行
- 改进 CLAUDE.md 融合策略，避免优先级冲突
- 实现 settings.local.json 深度合并，保留用户配置
- 简化 context/ 目录初始模板，降低接入成本

## 非目标

- 不修改核心 REQ 生命周期逻辑
- 不引入新的外部依赖
- 不改变现有的 hook 阻断机制
- 不修改目标项目的业务代码结构

## 范围

- 涉及目录 / 模块：
  - `scripts/harness-install.mjs` - 主安装脚本
  - `.claude/commands/harness-setup.md` - skill 文档
  - `scripts/session-start.sh` → 需要跨平台版本
  - `scripts/req-check.sh` → 需要跨平台版本
  - `context/` 目录模板文件

- 影响接口 / 页面 / 脚本：
  - 新增 `scripts/session-start.js` - Node.js 跨平台版本
  - 新增 `scripts/req-check.js` - Node.js 跨平台版本
  - 新增安装后验证逻辑
  - 修改 settings.local.json 合并策略

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（本改动涉及安装流程，无需额外设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/harness-install.mjs、.claude/commands/harness-setup.md
- 可新增的文件 / 模块：scripts/*.js 跨平台脚本、tests/* 验证测试

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：核心 REQ 生命周期脚本 (req-cli.mjs, req-validation.mjs)
- 不可引入的依赖 / 操作：不引入新的 npm 依赖

**边界条件**：
- 保持与现有 macOS/Linux 环境的兼容性
- Windows 支持以 Windows 10/11 为主
- 不修改已安装项目的运行方式（仅影响新安装）

## 验收标准

- [x] 安装后在 Windows 环境能正确运行 session-start 和 req-check（通过 Node.js 跨平台脚本实现）
- [x] 安装后自动验证 `npm run req:create` 命令可用（verifyInstallation 函数检查）
- [x] 安装后自动验证 hook 配置正确（检查 SessionStart/PreToolUse 配置）
- [x] 目标项目已有 settings.local.json 时，非冲突配置被保留（深度合并策略实现）
- [x] context/ 目录初始文件数量减少 50% 以上（从 9 个文件减少到 4 个）
- [x] 安装报告包含验证结果和下一步明确指引（生成验证结果章节）
- [x] 现有 macOS/Linux 环境功能不受影响（通过 npm test 验证）

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-022-design.md`
- 相关规范：scripts/harness-install.mjs 现有实现

## 报告链接
- Code Review：`requirements/reports/REQ-2026-022-code-review.md`
- QA：`requirements/reports/REQ-2026-022-qa.md`
- Ship：`requirements/reports/REQ-2026-022-ship.md`

## 验证计划
- 计划执行的命令：
  ```bash
  npm test
  npm run docs:verify
  npm run check:governance
  ```
- 需要的环境：Windows 10/11、macOS、Linux
- 需要的人工验证：在真实 Windows 环境运行安装流程

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：跨平台脚本可能引入新 bug
- 回滚方式：回退到基于 bash 的版本，保留原脚本作为备选

## 关键决策
- 2026-03-30：决定采用 Node.js 脚本实现跨平台支持，而非 powershell/cmd 双版本（降低维护成本）
