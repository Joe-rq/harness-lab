# REQ-2026-038: Phase 2A: Onboarding DX — harness-doctor and first-req wizard

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 1 完成后，不变量系统已就绪（3 active / 20 draft）。但新用户接入 harness-lab 的摩擦仍然很高：没有健康检查手段，不知道 hook 是否生效；没有引导流程，创建第一个 REQ 需要阅读大量文档。路线图 Phase 2A 的目标是让新用户 30 分钟内完成接入并创建第一个 REQ。

## 目标
- 实现 `harness-doctor` 诊断命令，检查 5 项健康指标并给出修复建议
- 实现首个 REQ 向导 slash command，5 分钟内引导用户完成第一个 REQ

## 非目标
- 不做项目类型自动检测（Phase 2B 的适配器范畴）
- 不做 harness-setup 的功能扩展（setup 是安装，doctor 是体检）
- 不做 REQ 模板特化（Phase 2B 的范畴）

## 颗粒度自检
1. [x] 目标数 ≤ 4？2 个
2. [x] 涉及文件数 ≤ 4？2 个新建
3. [x] 涉及模块/目录 ≤ 4？2 个（scripts/ + .claude/commands/）
4. [x] 能否用一句话描述"解决了什么问题"？新用户不知道接入是否成功、不知道怎么创建第一个 REQ
5. [x] 如果失败，能否干净回滚？删除 2 个新文件即可

## 范围
- 涉及目录 / 模块：scripts/、.claude/commands/
- 影响接口 / 脚本：新增 `npm run harness:doctor` 命令

### 约束（Scope Control，可选）

**允许（CAN）**：
- 新建 scripts/harness-doctor.mjs
- 新建 .claude/commands/first-req.md
- 修改 package.json 添加 harness:doctor 脚本

**禁止（CANNOT）**：
- 不可修改现有 hook 脚本
- 不可修改 settings.local.json
- 不可引入 npm 依赖

**边界条件**：
- harness-doctor 必须能在项目根目录直接运行
- first-req 向导通过 Claude Code slash command 调用
- [x] skip-design-validation：2 个新文件，路线图已有详细设计，无需独立设计文档

## 验收标准
- [ ] `harness-doctor` 能诊断 5 项健康指标并给出修复建议
- [ ] 5 项检查：hook 配置、hook 脚本存在性、REQ 模板定制、experience 内容、不变量激活状态
- [ ] 输出结构化诊断报告（通过/警告/失败 + 修复建议）
- [ ] 首个 REQ 向导能在 5 分钟内引导用户完成第一个 REQ
- [ ] 向导根据项目类型推荐 REQ 字段（React/Python/Go 基础识别）

## 设计与实现链接
- 设计稿：无（需求足够清晰，不需要独立设计文档）
- 相关规范：`docs/plans/unified-roadmap.md` Phase 2A

## 报告链接
- Code Review：`requirements/reports/REQ-2026-038-code-review.md`
- QA：`requirements/reports/REQ-2026-038-qa.md`
- Ship：`requirements/reports/REQ-2026-038-ship.md`

## 验证计划
- 计划执行的命令：`npm run harness:doctor`、`/first-req`（手动）
- 需要的环境：本仓库
- 需要的人工验证：手动执行 /first-req 向导体验流程

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：harness-doctor 假阳性过多（对已配置项目误报），导致用户忽略
- 回滚方式：删除 2 个新文件 + 移除 package.json 中的脚本

## 关键决策
- 2026-04-25：first-req 放在 .claude/commands/ 而非 skills/，与 harness-setup 保持一致
- 2026-04-25：harness-doctor 第 5 项检查设为"hook 脚本存在性"（配置正确但脚本丢失是最常见的接入问题）
