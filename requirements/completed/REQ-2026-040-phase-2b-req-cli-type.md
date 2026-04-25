# REQ-2026-040: Phase 2B 补充：req-cli --type 参数化，统一模板源

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Phase 2B (REQ-2026-039) 创建了 3 个 slash command（/bugfix、/feature、/refactor），但模板逻辑全靠 prompt 指导 Claude 用 Write 重写 REQ 文件——这是 prompt 保证而非代码保证，Claude 可能不遵循。同时存在三源模板管理问题（REQ_TEMPLATE.md / req-cli.mjs buildReqContent() / slash command 内联模板），其中 buildReqContent 缺少颗粒度自检和反馈与质量检查章节。

## 目标
- req-cli.mjs 加 `--type bugfix|feature|refactor` 参数，按类型生成特化内容
- buildReqContent 补全缺失章节（颗粒度自检、反馈与质量检查）
- 简化 3 个 slash command 为薄壳（收集信息 + `req:create --type`）

## 非目标
- 不改 req-validation.mjs（类型感知验证留后续）
- 不改 REQ_TEMPLATE.md（不同步问题是独立的）
- 不做模板提取为配置文件

## 范围
- 涉及目录 / 模块：scripts/、.claude/commands/
- 影响接口 / 页面 / 脚本：req-cli.mjs buildReqContent、3 个 slash command

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（改动集中在 1 个核心文件，复杂度低）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/req-cli.mjs、.claude/commands/bugfix.md、feature.md、refactor.md
- 可新增的测试 / 脚本：测试用例覆盖 --type 参数

**禁止（CANNOT）**：
- 不可修改 req-validation.mjs
- 不可修改 REQ_TEMPLATE.md

**边界条件**：
- 不改变 `replaceSection`/`getSection` 等已有函数的签名
- 不改变 req:start/req:complete 的验证逻辑

## 验收标准
- [ ] `npm run req:create -- --title "fix: xxx" --type bugfix` 生成的 REQ 包含 Bug 特化内容（Bug 现象、skip-design-validation 预勾选、回归测试验收标准）
- [ ] `npm run req:create -- --title "feat: xxx" --type feature` 生成的 REQ 包含 Feature 特化内容（Scope Control 必填提示、不预勾选 skip-design）
- [ ] `npm run req:create -- --title "refactor: xxx" --type refactor` 生成的 REQ 包含 Refactor 特化内容（技术债、行为不变约束、skip-design-validation 预勾选）
- [ ] `npm run req:create -- --title "xxx"` 不带 --type 时生成通用模板（向后兼容）
- [ ] 所有类型生成的 REQ 都包含颗粒度自检和反馈与质量检查章节
- [ ] 3 个 slash command 简化为薄壳（仅收集信息 + 调用 req:create --type）
- [ ] 现有测试全部通过

## 设计与实现链接
- 设计稿：豁免（改动集中在 1 个核心文件，复杂度低）
- 相关规范：

## 报告链接
- Code Review：`requirements/reports/REQ-2026-040-code-review.md`
- QA：`requirements/reports/REQ-2026-040-qa.md`
- Ship：不适用

## 验证计划
- 计划执行的命令：`npm test`、手动执行 `req:create --type` 各类型
- 需要的环境：本仓库
- 需要的人工验证：确认各类型 REQ 输出内容有明确差异

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：buildReqContent 改动影响 req:start 的 replaceSection 匹配（新章节标题需精确）
- 回滚方式：`git revert`

## 关键决策
- 2026-04-25：方向 B 实施——将模板逻辑从 prompt 下沉到代码，消除模板源分裂
- 2026-04-25：采用 path 3 方案（每个类型一个构建函数），避免单函数过长
