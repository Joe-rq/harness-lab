# 路线图状态

> 自动生成于 2026-04-20
> 修订记录见本文档末尾

| Phase | 状态 | 当前 REQ | 验证结果 | 更新日期 |
|-------|------|----------|---------|---------|
| Phase 0 | completed | — | 全部通过 | 2026-04-18 |
| Phase 1 | completed | REQ-2026-037 | 全部通过 | 2026-04-25 |
| Phase 2A | completed | REQ-2026-038 | 全部通过 | 2026-04-25 |
| Phase 2B | completed | REQ-2026-040 | 全部通过 | 2026-04-25 |
| Phase 3A | — | — | — | — |
| Phase 3B | — | — | — | — |
| Phase 3C | — | — | — | — |
| Phase 4 | — | — | — | — |
| Phase 5 | — | — | — | — |
| Phase 6 | — | — | — | — |

---

## 修订记录

### 2026-04-20

- Phase 3 拆分为 3A/3B/3C（违反 4 实体规则，见路线图文档修订说明）
- 新增 roadmap-status.md 追踪文件

### 2026-04-25

- Phase 1 完成 (REQ-2026-037)：不变量质量门禁、生命周期 (draft/active/deprecated)、--inject 注入模式、session-start 统计
- 24 条不变量：3 active / 20 draft / 1 deprecated

### 2026-04-25

- Phase 2A 完成 (REQ-2026-038)：harness-doctor 诊断命令（5 项检查）、first-req 交互式向导
- harness:doctor 脚本绑定到 package.json

### 2026-04-25

- Phase 2B 方案修订：
  - 路径从 `skills/req/` 改为 `.claude/commands/`（统一到已有 slash command 路径）
  - 项目适配器拆至后续 REQ（定义模糊，且 3 个 command 已占 4 实体）
  - 实现方式改为 slash command 指导 Claude 用 Write 重写 REQ（避免 INV-039 章节重复问题）
  - 退出标准从"1 种适配器可用"改为"3 种 command 可用+内容有类型差异"
  - 验证方式从 `req:create --type` 改为 `/bugfix`、`/feature`、`/refactor` slash command

### 2026-04-25

- Phase 2B 完成 (REQ-2026-039)：3 个特化 REQ slash command（/bugfix、/feature、/refactor）
  - bugfix：Bug 现象+影响范围+skip-design-validation 预勾选
  - feature：用户痛点+业务背景+Scope Control CAN/CANNOT 必填提示
  - refactor：技术债描述+行为不变约束+后续 Phase 排除
- 项目适配器延后至后续 REQ

### 2026-04-25

- Phase 2B 补充 (REQ-2026-040)：req-cli --type 参数化，模板源统一
  - req-cli.mjs 新增 --type bugfix|feature|refactor 参数
  - 4 个构建函数（generic + 3 特化），补全颗粒度自检和反馈章节
  - 3 个 slash command 简化为薄壳（收集信息 → req:create --type）
  - 消除模板源分裂（REQ_TEMPLATE.md / req-cli.mjs / slash command 三源 → req-cli.mjs 单源）
  - 路线图 Phase 2B 章节已更新反映新方案

### 2026-04-25

- 治理修补 (REQ-2026-041)：commit-msg hook 校验提交消息格式
  - 新增 scripts/commit-msg-check.sh，符号链接到 .git/hooks/commit-msg
  - 校验 CONTRIBUTING.md 规范：type/scope 必填、feat/fix 必须半角括号 REQ 编号
  - 全角括号/缺 type/英文描述全拦截，merge/revert/fixup/squash 自动豁免
  - 填补治理盲区：规范写了≠规范生效，commit 格式从"靠自觉"变为"代码强制"
