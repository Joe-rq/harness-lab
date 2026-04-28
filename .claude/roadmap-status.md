# 路线图状态

> 自动生成于 2026-04-20
> 修订记录见本文档末尾

| Phase | 状态 | 当前 REQ | 验证结果 | 更新日期 |
|-------|------|----------|---------|---------|
| Phase 0 | completed | — | 全部通过 | 2026-04-18 |
| Phase 1 | completed | REQ-2026-037 | 全部通过 | 2026-04-25 |
| Phase 2A | completed | REQ-2026-038 | 全部通过 | 2026-04-25 |
| Phase 2B | completed | REQ-2026-040 | 全部通过 | 2026-04-25 |
| Phase 3A | completed | REQ-2026-042 | 全部通过 | 2026-04-26 |
| Phase 3B | completed | REQ-2026-043 | 全部通过 | 2026-04-26 |
| Phase 3C | completed | REQ-2026-044 | 全部通过 | 2026-04-26 |
| Phase 4 | completed | REQ-2026-046 | 全部通过 | 2026-04-26 |
| Phase 5.1 | completed | REQ-2026-047 | 全部通过 | 2026-04-27 |
| Phase 5.2 | completed | REQ-2026-048 | 全部通过 | 2026-04-27 |
| Phase 5.3 | completed | REQ-2026-049 | 全部通过 | 2026-04-27 |
| Phase 5.4 | completed | REQ-2026-050 | 全部通过 | 2026-04-27 |
| Phase 5.5 | completed | REQ-2026-051 | 全部通过 | 2026-04-28 |
| Phase 5.6 | completed | REQ-2026-052 | 全部通过 | 2026-04-28 |
| Phase 5 集成验证 | completed | REQ-2026-053 | 全部通过 | 2026-04-28 |
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

### 2026-04-26

- Phase 3A 完成 (REQ-2026-042)：基础安全模式（模式切换 + Stop 评估器 + SessionEnd 反思）
  - 新增 .claude/harness-mode 配置文件（collaborative/supervised/autonomous）
  - 新增 scripts/stop-evaluator.mjs：Stop hook 交叉检查验收标准 vs git diff，未覆盖则阻断
  - 新增 scripts/session-reflect.mjs：SessionEnd hook 自动生成会话摘要 + 更新 progress.txt
  - session-start.sh 显示当前模式
  - Hook 覆盖率：Stop 和 SessionEnd 从 ❌ 变为 ✅

### 2026-04-26

- Phase 3B 完成 (REQ-2026-043)：范围强制（防越界）
  - 新增 scripts/scope-guard.mjs：PreToolUse hook 检查写入目标是否在 REQ 范围内
  - REQ_TEMPLATE.md 范围章节升级为结构化文件列表（支持 glob 模式）
  - 越界操作记录到 .claude/scope-violations.log
  - 与 req-check.sh 共存于 PreToolUse，职责分离：REQ 检查 vs 范围检查

### 2026-04-26

- Phase 3C 完成 (REQ-2026-044)：风险追踪
  - 新增 scripts/risk-tracker.mjs：PostToolUse hook 根据文件路径评估风险等级（R0-R4）
  - 棘轮机制：风险等级只升不降，持久化到 .claude/.risk-ratchet
  - R3+ 操作触发 stderr 提醒
  - session-start.sh 显示当前会话风险等级
  - 与 loop-detection 共存于 PostToolUse，stderr vs stdout 隔离

### 2026-04-26

- Phase 4 完成 (REQ-2026-045 + REQ-2026-046)：自审查（审查隔离 + 自动 QA + 自动 Code Review）
  - 新增 scripts/review-gatekeeper.mjs：PreToolUse Agent matcher，检测审查 Agent，强制使用只读 subagent_type
  - 新增 scripts/auto-qa.mjs：自动执行 REQ 验证命令，生成 QA 报告
  - 新增 scripts/auto-review.mjs：自动代码审查（范围合规 + 安全模式 + 基础检查），生成 Code Review 报告
  - 新增 .claude/commands/self-review.md：/self-review slash command
  - Hook 覆盖率新增：PreToolUse Agent matcher（审查隔离）

### 2026-04-27

- Phase 5.1 完成 (REQ-2026-047)：Watchdog 看门狗
  - 新增 scripts/watchdog.mjs：PostToolUse hook 检测 REQ 停滞和状态循环
  - 停滞检测：同一 REQ 编辑超过阈值(10)次无阶段推进 → 注入提醒
  - 循环检测：同一 REQ 状态反复切换(阈值3次) → 注入提醒
  - 状态持久化到 .claude/.watchdog-state，支持跨会话续传
  - CLI 诊断模式：`node scripts/watchdog.mjs --diagnose`
  - 与 loop-detection、risk-tracker 共存于 PostToolUse

### 2026-04-27

- Phase 5 路线图修正（5.1 已完成，5.2-5.6 重新规划）
  - 原因：原 5.2 Context Router 和 5.3 Deploy Guard 是护栏打磨，不解决"AI 卡住了怎么办"
  - 核心思路：将"自驱动"拆解为"自恢复"（AI 遇错能自救）而非"自启动"（AI 自己取任务开始跑）
  - 修正后子阶段：
    - 5.1 看门狗 ✅（不变）
    - 5.2 自恢复指令（CLAUDE.md 增强 + /resume command）— 替代原 Context Router
    - 5.3 上下文续传（session-start.sh 增强 + CLAUDE.md 续传协议）— 替代原 Deploy Guard
    - 5.4 autonomous 模式实质化（hook 行为分化）— 新增
    - 5.5 部署守卫（保留，自恢复能力越强刹车越重要）— 从原 5.3 顺延
    - 5.6 不变量清理（去重+频率追踪+自动废弃）— 从原 5.4 升级

### 2026-04-27

- Phase 5.2 完成 (REQ-2026-048)：自恢复指令
  - CLAUDE.md 新增"异常响应协议"章节：停滞/循环/R3+ 三种异常的标准响应流程
  - 新增 /resume slash command：读取 progress.txt + watchdog-state → 建议下一步
  - 本质是 prompt 层面的决策指南，非新脚本——hook 架构决定了决策逻辑必须在 AI 的行为指令里
  - 关键决策：hook 只能 inject 不能执行动作，所以 5.2/5.3 的核心是 CLAUDE.md 指令而非新脚本

### 2026-04-27

- Phase 5.3 完成 (REQ-2026-049)：上下文续传
  - session-start.sh 增强：检测未完成 REQ → 展示最近 session-log 摘要 + git diff 未提交改动
  - CLAUDE.md 新增"续传协议"章节：AI 启动时发现未完成 REQ → 主动询问，不自动继续
  - 降级处理：无 in-progress REQ 时跳过中断点展示；session-log 无匹配时只展示 git diff

### 2026-04-27

- Phase 5.4 完成 (REQ-2026-050)：autonomous 模式实质化
  - watchdog: autonomous=静默恢复+日志, supervised=强选策略, collaborative=友好提醒
  - risk-tracker: autonomous=允许+日志, supervised=强警告, collaborative=stderr 提醒
  - stop-evaluator: collaborative 改为提醒不阻断；supervised/autonomous 阻断（安全边界）
  - session-start: autonomous 自动续传+日志
  - scope-guard 未修改：三种模式都阻断（安全边界不可绕过）

### 2026-04-28

- Phase 5.5 完成 (REQ-2026-051)：部署守卫
  - 新增 scripts/deploy-guard.mjs：PreToolUse Bash hook，17 种危险命令模式
  - collaborative=提醒（allow+additionalContext），supervised=阻断，autonomous=阻断
  - 覆盖：rm -rf/r、force push、git reset --hard、git clean -f、git checkout .、drop/truncate table、delete from、fork bomb、磁盘写入、远程脚本执行、chmod 777、npm publish、docker rm -f/rmi -f
  - rm -f 单文件删除安全放行
  - 阻断日志持久化到 .claude/.deploy-guard.log
  - 补位 risk-tracker 在 supervised 模式下无法真正阻断 R3+ 操作的缺陷

### 2026-04-28

- Phase 5.6 完成 (REQ-2026-052)：不变量清理
  - invariant-extractor.mjs：去重（标题+触发路径组合 → 保留 ID 最小）+ 频率追踪（--check 写 .inv-usage.json）+ 自动废弃（90 天未触发的 draft → deprecated）+ 高频升级（触发 ≥10 次 → medium→high）
  - invariant-gate.mjs：新增 --deprecate-stale 和 --upgrade-frequent 独立命令
  - --scan --dedup 清理：359 → 38 个不变量（删除 330 条重复 + 跳过 17 条 + 提取 9 条新候选）
  - Phase 5 全部完成

### 2026-04-28

- Phase 5 集成验证完成 (REQ-2026-053)：PreCompact hook + autonomous 端到端
  - 新增 scripts/precompact-notify.mjs：PreCompact hook，压缩前保存快照 + systemMessage 提醒
  - 新增 CLAUDE.md 压缩恢复协议：压缩后必须读取 .compact-snapshot.md 恢复上下文
  - session-start.sh 新增 Hook 覆盖率检查（6/6 ✅）
  - autonomous 模式行为验证：deploy-guard 正确拦截危险命令 + 自恢复
  - Phase 5 全部退出标准已验证，包括"autonomous 模式下完成 REQ + 遇异常自恢复"
