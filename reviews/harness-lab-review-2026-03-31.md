# harness-lab — 自适应多智能体研究画布

> 协作模式：对等协作
> 日期：2026-03-31
> 审查目标：harness-lab 项目综合评审

---

## 模式选择

**选定模式：** 对等协作

**选择理由：**
- 综合评审无主导领域，需要各方对等输入
- 深入分析需求，交叉碰撞能产生更深洞察
- 治理框架涉及产品决策、开发者体验、技术架构的多方权衡
- 无时间压力，可承担对等模式较慢的收敛速度

---

## Round 1：事实层（只写事实，不评价）

### PM — 产品视角

**产品定位：**
- 自我定位：`AI 项目的研发治理层模板`（README.md:1, package.json:4）
- 核心功能声称：
  1. 需求流转：REQ 生命周期管理，从创建到完成全程追踪
  2. 协作入口：人和 AI agent 按同一套协议接手工作
  3. 证据链：review / QA / ship 报告落盘，可追溯可审计
  4. 上下文延续：跨会话恢复工作状态，减少重复沟通
- 技术栈：Node.js (ESM), 无外部运行时依赖
- 明确边界：不是业务框架，不替换目标项目目录结构

**功能完成度：**
| 功能 | 状态 | 证据 |
|------|------|------|
| REQ 生命周期 CLI | ✅ 已实现 | scripts/req-cli.mjs:656 行，支持 create/start/block/complete |
| REQ 内容验证 | ✅ 已实现 | scripts/req-validation.mjs:288 行，检测模板占位符和 draft 状态 |
| 设计文档验证 | ✅ 已实现 | req-validation.mjs:171-220，支持豁免机制 |
| 文档同步检查 | ✅ 已实现 | scripts/docs-verify.mjs，diff-aware 文档义务检查 |
| 治理结构检查 | ✅ 已实现 | scripts/check-governance.mjs |
| PreToolUse Hook | ✅ 已实现 | settings.example.json:15-26，硬阻断无 REQ 的修改 |
| SessionStart Hook | ✅ 已实现 | settings.example.json:3-13，显示当前状态 |
| 一键安装器 | ✅ 已实现 | scripts/harness-install.mjs:872 行，跨平台支持 |
| 自动命令绑定 | ✅ 已实现 | harness-install.mjs:166-268，复用/placeholder/generate 三种模式 |
| 安装后验证 | ✅ 已实现 | harness-install.mjs:476-575 |
| 自动化测试 | ✅ 已实现 | tests/governance.test.mjs:512 行，6 个测试用例 |

**竞品功能对比：**
| 功能 | harness-lab | Linear/Airtable | Jira | GitHub Projects |
|------|-------------|-----------------|------|-----------------|
| REQ 生命周期管理 | ✅ | ✅ | ✅ | ✅ |
| AI agent 协作协议 | ✅ | ❌ | ❌ | ❌ |
| 跨会话上下文恢复 | ✅ | ❌ | ❌ | ❌ |
| 强制治理检查点 | ✅ | ❌ | ❌ | ❌ |
| 模板仓库模式 | ✅ | ❌ | ❌ | ❌ |
| 研发证据链 | ✅ | 部分 | ✅ | 部分 |
| 可嵌入现有项目 | ✅ | ❌ | ❌ | ❌ |
| 无运行时依赖 | ✅ | ❌ | ❌ | ❌ |

**目标用户线索：**
- UI 复杂度：CLI + Markdown，需要技术背景
- API 文档：无正式 API，通过 CLAUDE.md 和 AGENTS.md 暴露协议
- 多租户/权限：无，单仓库粒度
- 部署方式：复制文件到目标项目，可选 hook 配置
- 目标用户画像：使用 AI 辅助开发的软件工程师、团队技术负责人

### Designer — 开发者体验视角

> 注：harness-lab 是 CLI 工具，Designer 角色调整为开发者体验（DX）视角

**交互入口清单：**
| 入口 | 类型 | 代码行数 | 依赖 |
|------|------|---------|------|
| scripts/req-cli.mjs | CLI 主程序 | 656 | req-validation.mjs, docs-verify.mjs |
| scripts/harness-install.mjs | 安装向导 | 872 | 无外部依赖 |
| scripts/docs-verify.mjs | 文档验证 | - | docs-sync-rules.json |
| scripts/check-governance.mjs | 治理检查 | - | 无外部依赖 |
| scripts/req-check.js | PreToolUse hook | - | req-validation.mjs |
| scripts/session-start.js | SessionStart hook | - | progress.txt, INDEX.md |

**交互模式统计：**
- `console.log/error` 用于所有用户输出
- 无 alert/confirm/loading 状态变量（CLI 环境）
- 错误处理：`process.exit(1)` 终止，带错误消息
- 彩色输出：harness-install.mjs:24-32 定义 ANSI 颜色

**跨平台支持：**
- 检测：`process.platform === 'win32'`（harness-install.mjs:380-382）
- Windows：使用 `node scripts/*.js` 替代 bash
- 路径处理：`path.join()` 和 `fileURLToPath()` 替代硬编码

**错误消息质量：**
- REQ 阻断消息：视觉框架（╔═══╗）+ 清晰指引（req-validation.mjs:87-111）
- req:start 失败：列出具体问题和修复建议（req-cli.mjs:473-479）
- 安装报告：自动生成 Markdown 报告（harness-install.mjs:578-694）

**命令行交互：**
- 安装器：交互式问答（readline）+ 默认选项支持
- 帮助文档：`req-cli.mjs:618-626` 打印命令用法
- 参数解析：统一 `parseArgs` 函数

### Engineer — 技术视角

**存储层事实：**
- 文件系统存储：
  - `requirements/` 目录：REQ Markdown 文件
  - `.claude/progress.txt`：会话状态
  - `requirements/INDEX.md`：需求索引
- 无数据库，无并发控制
- 无数据迁移脚本（文件系统直接操作）

**核心引擎事实：**
- REQ 状态机：draft → in-progress → completed / blocked
- 状态转换：`setReqStatusAndPhase()` 正则替换
- ID 生成：年+序号（REQ-YYYY-NNN），扫描 in-progress 和 completed 目录
- 错误处理：`fail()` 函数调用 `process.exit(1)`
- 状态持久化：文件系统，每次操作重写整个文件

**API/协议事实：**
- CLI 接口：`req:create/start/block/complete`
- Hook 协议：SessionStart + PreToolUse（Claude Code 扩展）
- 文档同步规则：`docs-sync-rules.json` 定义触发器和义务
- 超时设置：hook timeout = 10 秒
- 无背压控制（CLI 顺序执行）

**安全机制事实：**
- 认证：无（本地 CLI）
- 输入验证：
  - REQ 内容验证（占位符检测）
  - 设计文档验证（占位符检测）
  - 年份格式验证（4 位数字）
- 沙箱/隔离：无
- 豁免机制：`.claude/.req-exempt` 文件或 Scope Control checkbox

**依赖和模块耦合事实：**
- 核心依赖：仅 Node.js 标准库（fs, path, readline, assert）
- 无外部 npm 依赖（package.json 无 dependencies）
- 模块关系：
  ```
  req-cli.mjs → req-validation.mjs → docs-verify.mjs
  harness-install.mjs → (复制文件，不导入其他脚本)
  req-check.js → req-validation.mjs
  ```
- 无接口抽象（Protocol/ABC），直接函数调用
- 代码规模：主脚本 656-872 行，单文件内聚

---

## Round 2：辩论层

### 交叉评论投票矩阵

#### 完整投票矩阵（对等协作模式）

| 议题 | PM | Designer | Engineer | Critic 质询 | 共识？ |
|------|-----|----------|----------|-------------|--------|
| 功能完成度高 | ✅ | ✅ | ✅ | - | 🤝 |
| 零依赖是优势 | ✅ | ✅ | ✅ | - | 🤝 |
| 跨平台支持完善 | ✅ | ✅ | ✅ | - | 🤝 |
| 错误消息质量高 | ✅ | ✅ | ✅ | - | 🤝 |
| AI agent 协议差异化 | ✅ | - | ✅ | Q1 | 🤝 |
| 目标用户画像需澄清 | ⚠️ | - | ✅ | Q2 | ⚠️ 分歧 |
| 单文件内聚（656-872行）| - | ❌ | ✅ | - | ⚠️ 分歧 |
| 豁免机制与"强制治理"张力 | ⚠️ | - | - | Q5 | 待定 |
| 无并发控制影响被低估 | - | - | ⚠️新发现 | 🚨Q4 | 待定 |
| Hook timeout 10秒风险 | ⚠️ | - | ⚠️新发现 | - | 待定 |
| 测试覆盖盲区 | - | - | ⚠️新发现 | Q3 | 待定 |

图例：
- ✅ = +1（同意）
- ❌ = 反驳（不同意）
- ⚡ = Critic 质询（Critic 不参与投票，仅对议题发起质询）
- 🤝 = 2/3 或 3/3 同意（共识，基于 PM/Designer/Engineer 三方投票）
- ⚠️ = ≤1/3 同意（分歧）

### 独到发现

**1. 目标用户画像与功能矛盾（PM + Critic）**
- PM 声称目标用户包含"团队技术负责人"
- 但系统无多租户/权限/并发控制
- Designer 指出"多租户/权限：无，单仓库粒度"
- **结论**：产品定位更适合个人开发者，而非团队

**2. 豁免机制的双刃剑效应（PM + Designer + Critic）**
- `.claude/.req-exempt` 允许绕过 REQ 检查
- 无审计日志记录豁免使用
- 与"强制治理检查点"的核心声称存在张力

**3. 单文件代码规模争议（Designer vs Engineer）**
- Designer 反驳：656-872 行单文件违反单一职责，导航困难，扩展性差
- Engineer +1：当前规模可维护，避免过度工程化
- **建议**：暂不拆分，但监控代码增长

**4. 首次启动体验缺失（Designer）**
- 安装后需手动配置 `settings.json`
- 无交互式教程或 `npm run req:help`
- 新用户只能阅读 CLAUDE.md 自行摸索

**5. 错误恢复路径不明确（Designer）**
- CLI 只有 create/start/block/complete
- 缺少 delete/undo/rename 命令
- 用户犯错后无恢复机制

**6. 并发写入风险（Engineer 新发现）**
- 文件系统存储无锁机制
- 多人/多 agent 同时操作会导致数据丢失
- 轻量解决方案（文件锁）：4-8 小时
- 完整解决方案（SQLite）：16-32 小时

**7. 正则替换边界风险（Engineer 新发现）**
- `setReqStatusAndPhase` 使用简单正则全局替换
- 若用户在"背景"章节写"当前状态："会被误替换
- 修复成本：1-2 小时

**8. 测试覆盖盲区（Engineer 新发现）**
- `req:block` 命令无测试
- `req:complete` 的 docs-gate 无测试
- 大文件/特殊字符无测试
- 补充成本：4-8 小时

### Critic 质询

**[Critic → PM] Q1：竞品对比的维度是否公平？**
- 论据：将 Linear/Jira 等 SaaS 产品与模板仓库对比，把形态特点包装成竞争优势
- 要求回应：PM
- 级别：普通

**[Critic → PM/Designer] Q2：目标用户画像是否存在矛盾？**
- 论据：声称"团队技术负责人"，但无权限/并发/审计能力
- 要求回应：PM / Designer
- 级别：普通

**[Critic → PM/Engineer] Q3：功能完成度是否缺少质量维度？**
- 论据："已实现"不等于"生产就绪"，缺少使用数据、边界测试
- 要求回应：PM / Engineer
- 级别：普通

**🚨 [Critic → Engineer] Q4：无并发控制的影响是否被低估？**
- 论据：如果目标是团队协作，无并发控制会导致数据丢失，是已知限制还是架构缺陷？
- 要求回应：Engineer
- 级别：🚨 关键

**[Critic → Designer/Engineer] Q5：豁免机制是否缺乏安全边界？**
- 论据：任何人可创建 `.req-exempt` 绕过检查，无审计日志
- 要求回应：Designer / Engineer
- 级别：普通

**[Critic → PM] Q6：是否有真实用户验证？**
- 论据：三方聚焦代码静态分析，无用户反馈、无真实案例
- 要求回应：PM
- 级别：普通

**[Critic → 全体] Q7：三方是否忽略了项目的核心优势？**
- 论据：零依赖、1500 行高效代码、自证能力（18 个已完成 REQ）被忽略
- 要求回应：PM / Designer / Engineer
- 级别：普通

### 🚨 Critic 关键质询追踪

| # | 关键质询内容 | 三方回应摘要 | 回应是否充分 | 处置 |
|---|------------|------------|------------|------|
| Q4 | 无并发控制的影响是否被低估？ | Engineer 承认风险，提出 4-8h/16-32h 两档解决方案 | 部分 | 纳入行动计划 P1 |

---

## Round 3：共识层

### ✅ 共识项

**1. 功能完成度高**
- 结论：声称的 11 项核心功能均有代码实现，测试覆盖核心流程
- 证据：req-cli.mjs 656 行，harness-install.mjs 872 行，governance.test.mjs 512 行
- 成本估算：无额外成本
- 优先级：已实现

**2. 零依赖是核心优势**
- 结论：无外部 npm 依赖显著降低接入门槛、安全风险、安装时间
- 建议：保持零依赖策略，文档中强调这一优势
- 成本估算：无成本
- 优先级：文档改进 P0

**3. 跨平台支持完善**
- 结论：Windows/macOS/Linux 全覆盖，测试验证跨平台行为
- 证据：process.platform 检测、.js 替代 .sh、path.join() 统一路径
- 成本估算：已实现
- 优先级：已实现

**4. 错误消息质量高**
- 结论：视觉框架 + 清晰指引 + 具体修复建议
- 建议：添加日志持久化便于事后分析
- 成本估算：2-4 小时
- 优先级：P2

**5. AI agent 协作协议是差异化优势**
- 结论：通过 CLAUDE.md + AGENTS.md + Hook 机制实现人机协作
- 风险提示：协议依赖 Claude Code 私有 Hook，迁移需评估
- 成本估算：跨平台适配（如 Cursor/Copilot）8-16 小时
- 优先级：监控，暂不行动

### ⚡ 分歧项

**1. 目标用户画像需澄清**
- 各方立场：
  - PM：目标用户包含"团队技术负责人"
  - Designer：系统无多租户/权限，适合个人开发者
  - Engineer：技术栈与开发者匹配，但并发控制缺失
  - Critic Q2：定位与实际能力矛盾
- 裁决：**修正目标用户画像为"使用 AI 辅助开发的个人软件工程师"**
- 决策依据：无权限/并发/审计能力，不适合团队协作场景
- 行动：更新 README 和 CLAUDE.md 中的用户画像描述

**2. 单文件内聚争议**
- 各方立场：
  - Designer 反驳：656-872 行违反单一职责，建议拆分
  - Engineer +1：当前规模可维护，避免过度工程化
- 裁决：**暂不拆分，设置代码规模警戒线**
- 决策依据：当前代码在 500 行警戒线上方但可控，过早拆分增加复杂性
- 行动：在 CLAUDE.md 中设置警戒线（主脚本 > 800 行需审视），当前无需改动

**3. 豁免机制与"强制治理"的张力**
- 各方立场：
  - PM：豁免机制是必要的灵活性
  - Critic Q5：无审计日志，滥用风险
- 裁决：**保留豁免机制，增加审计日志**
- 决策依据：豁免是必要的逃生舱，但需可追溯
- 行动：在 .req-exempt 创建/删除时记录时间戳和原因

---

## 被低估的优势

**1. 零依赖的稀缺性**
- npm 生态中极罕见，降低供应链攻击面
- 建议：在 README 首屏强调

**2. 代码规模效率**
- 约 1500 行实现完整 REQ 生命周期管理
- 对比 Linear/Jira 的代码规模，效率极高
- 建议：作为技术亮点宣传

**3. 自证能力（Eat Your Own Dog Food）**
- 18 个已完成 REQ，每个都有 code-review 和 QA 报告
- 项目用自己的流程治理自己
- 建议：保留并展示这些记录作为最佳实践证明

**4. 透明的数据模型**
- 所有数据都是 Markdown 文件，可用 Git 版本控制
- 用户可直接编辑，无需学习专用 API
- 建议：在文档中强调"透明可审计"

---

## 行动计划（按 ROI 排序）

| 优先级 | 行动 | 成本 | 价值 | 负责 | 状态 |
|--------|------|------|------|------|------|
| P0 | 修正目标用户画像描述 | 0.5h | 高 | PM | 待实施 |
| P0 | README 首屏强调零依赖优势 | 0.5h | 高 | PM | 待实施 |
| P1 | 添加豁免审计日志 | 4h | 高 | Engineer | 待实施 |
| P1 | 修复正则替换边界风险 | 2h | 中 | Engineer | 待实施 |
| P1 | 明确单用户边界声明 | 1h | 高 | PM | 待实施 |
| P2 | 添加错误日志持久化 | 2-4h | 中 | Engineer | 待实施 |
| P2 | 补充关键路径测试 | 4-8h | 中 | Engineer | 待实施 |
| P2 | Hook timeout 可配置化 | 1h | 低 | Engineer | 待实施 |

### P0：立即执行（高价值、低成本）

1. **修正目标用户画像**（成本：0.5 小时）
   - 将"团队技术负责人"从目标用户中移除
   - 明确声明：本框架适用于单用户仓库，不支持多人协作场景
   - 位置：README.md、AGENTS.md

2. **README 首屏强调零依赖优势**（成本：0.5 小时）
   - 在"这是什么"部分添加：零外部依赖，一键接入，无供应链风险
   - 与竞品对比时突出这一差异点

### P1：本轮迭代（高价值、中等成本）

1. **添加豁免审计日志**（成本：4 小时）
   - 记录 `.req-exempt` 创建/删除时间和原因
   - 在 req:complete 时输出豁免使用摘要
   - 为"强制治理"提供可追溯性

2. **修复正则替换边界风险**（成本：2 小时）
   - 限定 `setReqStatusAndPhase` 替换范围为 `## 状态` 章节内
   - 添加边界测试用例

3. **明确单用户边界声明**（成本：1 小时）
   - 在 AGENTS.md 添加"已知限制"章节
   - 说明无并发控制，不适合多人协作

### P2：下个周期规划（中等价值、较高成本）

1. **添加错误日志持久化**（成本：2-4 小时）
2. **补充关键路径测试**（成本：4-8 小时）
   - req:block 命令测试
   - req:complete docs-gate 测试
   - 正则边界测试
3. **Hook timeout 可配置化**（成本：1 小时）

### 待定：需用户确认

1. **并发控制方案选择**
   - 轻量级（文件锁）：4-8 小时
   - 完整方案（SQLite）：16-32 小时
   - 取决于是否将目标扩展到团队协作场景

---

## 摘要

**使用模式：** 对等协作

**关键共识：**
- 5 项达成共识：功能完成度高、零依赖优势、跨平台完善、错误消息质量高、AI agent 协议差异化

**关键分歧：**
- 3 项需要裁决：目标用户画像（已裁决为个人开发者）、单文件内聚（暂不拆分）、豁免机制张力（增加审计）

**Top 3 P0 行动：**
1. 修正目标用户画像描述（0.5h）
2. README 首屏强调零依赖优势（0.5h）
3. 明确单用户边界声明（1h）

**Critic 关键洞察：**
- Q4（无并发控制）揭示了产品定位与架构的根本矛盾，通过修正用户画像解决
- 项目被忽略的核心优势：零依赖、代码效率、自证能力、透明数据模型

---

## 被低估的优势

<!-- 待 Round 2 填充 -->

---

## 行动计划（按 ROI 排序）

<!-- 待 Round 3 填充 -->

---

## 摘要

**使用模式：** 对等协作

**关键共识：**
- 待 Round 3 确定

**关键分歧：**
- 待 Round 3 确定

**Top 3 P0 行动：**
1. 待 Round 3 确定
2. 待 Round 3 确定
3. 待 Round 3 确定

**Critic 关键洞察：**

---

## 附录：模式切换日志

| 时间 | 从 | 到 | 原因 |
|------|-----|-----|------|
| | | | |
