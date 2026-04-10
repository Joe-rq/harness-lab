# harness-lab 自治模式渐进式路线图

> 2026-04-10 | 基于 wow-harness 对比分析与元反思框架设计

## 核心思路

不是重写，是**进化**。在现有 harness-lab 架构上引入"模式"概念，从人机协作逐步过渡到 AI 自治。

关键转变：**信任边界从"人"迁移到"Hook + 脚本"**。

```
Phase 0          Phase 1           Phase 2           Phase 3           Phase 4
人机协作    →   带刹车的半自治   →   受限自治        →   自审自治       →   全自治
(当前)          (防假完成)         (防越界)          (自审查)          (自学习)
人当守门人      人+脚本共同守门     脚本当守门人       AI+脚本守门       AI 自我进化
```

每个 Phase 必须独立可用，不存在"做完 Phase 4 才有价值"的情况。

---

## Phase 0: 当前状态（已完成）

### 已有能力
- REQ 生命周期管理（create → start → complete）
- PreToolUse 强制阻断（无 REQ 不让改代码）
- PostToolUse 循环检测（5 次/小时提醒）
- SessionStart 状态恢复 + 豁免 TTL 检查
- 元反思 + 对齐检查
- Experience 沉淀系统

### 信任边界：人
- 人创建 REQ、写验收标准、做 Code Review、做 QA
- AI 辅助执行，人不看就不动

### Hook 覆盖率
```
SessionStart  → ✅ 1 个 hook
PreToolUse    → ✅ 1 个 hook
PostToolUse   → ✅ 1 个 hook
Stop          → ❌ 无
PreCompact    → ❌ 无
SessionEnd    → ❌ 无
```

---

## Phase 1: 防假完成（Stop 评估器 + 模式基础设施）

**目标**：AI 不能再说"我搞定了"就结束，必须通过机械验证。

### 为什么这是第一步
AI 最常见也是最危险的失败模式是**声称完成但实际没完成**。wow-harness 的 stop-evaluator 被列为最高优先级，因为这是"AI 跑掉"的第一道防线。如果你让 AI 自治 2 小时，回来发现它声称完成了 5 个 REQ 但实际只有 1 个能用——这就是灾难。

### 要构建的东西

#### 1.1 模式切换机制
```
文件：.claude/settings.local.json
改动：新增 "harnessMode" 字段

{
  "harnessMode": "collaborative" | "supervised" | "autonomous",
  ...
}
```

每个 hook 脚本启动时读取此字段，根据模式走不同分支。
- `collaborative`：当前行为，人当守门人
- `supervised`：Phase 1-2，人在旁监督但脚本主动拦截
- `autonomous`：Phase 3-4，全脚本守门

#### 1.2 Stop 评估器
```
新建：scripts/stop-evaluator.mjs
注册：settings.local.json → Stop 阶段
```

**逻辑**：
1. 读取当前 REQ 的验收标准
2. 读取本次会话的 git diff（改了什么文件）
3. 交叉检查：验收标准中的每个条目是否有对应的代码改动
4. 未覆盖的条目 → 注入 `additionalContext` 提醒

**关键设计**：
- supervised 模式：提醒（fail-open）
- autonomous 模式：硬阻断（fail-closed）
- 状态存储在 `.claude/.stop-state/`

#### 1.3 SessionEnd 反思
```
新建：scripts/session-reflect.mjs
注册：settings.local.json → SessionEnd 阶段
```

**逻辑**：
1. 读取本次会话改动的文件列表
2. 检查 REQ 进度（目标 vs 完成）
3. 生成简短摘要写入 `.claude/session-log/`
4. 如果 REQ 未完成，自动更新 progress.txt 的 Next steps

### 验证方式
1. 让 AI 完成一个 REQ 中的一个目标就尝试停止
2. Stop 评估器应拦截并提醒"验收标准 X 未覆盖"
3. 切换到 supervised 模式，确认 hook 行为变化

### 退出标准
- [ ] `harnessMode` 字段可切换，hook 行为随之变化
- [ ] Stop 评估器在 AI 提前结束时注入提醒
- [ ] SessionEnd 自动更新 progress.txt

### 预计新增/修改文件

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/stop-evaluator.mjs | 新建 | ~150 |
| scripts/session-reflect.mjs | 新建 | ~80 |
| scripts/loop-detection.mjs | 修改（加模式判断） | +10 |
| scripts/session-start.sh | 修改（显示模式） | +5 |
| .claude/settings.local.json | 修改（加 harnessMode + Stop/SessionEnd hook） | +20 |

---

## Phase 2: 防越界（范围强制 + 风险追踪）

**目标**：AI 只能改 REQ 声明范围内的文件，越界自动拦截。

### 为什么是第二步
有了"防假完成"之后，第二个问题是"AI 改了不该改的东西"。自治模式下 AI 可能自作主张改了 10 个文件，但 REQ 只涉及 3 个。范围强制确保 AI 的每个操作都在 REQ 声明的范围内。

### 要构建的东西

#### 2.1 范围强制器
```
新建：scripts/scope-guard.mjs
注册：settings.local.json → PreToolUse 阶段（在 req-check 之后）
```

**逻辑**：
1. 读取当前 REQ 的"范围"章节（允许修改的文件/目录）
2. PreToolUse 时检查目标文件是否在范围内
3. 越界 → supervised 模式警告，autonomous 模式硬阻断
4. 每次越界记录到 `.claude/scope-violations.log`

**REQ 模板需要更新**：
```markdown
## 范围
- 涉及文件：
  - src/auth/login.ts（允许修改）
  - src/auth/session.ts（允许修改）
  - tests/auth/（允许新增）
```

范围声明从"自由文本"变成"结构化文件列表"，脚本才能解析。

#### 2.2 风险追踪器
```
新建：scripts/risk-tracker.mjs
注册：settings.local.json → PostToolUse 阶段
```

**逻辑**：
1. 根据文件路径判断风险等级（R0-R4）
   - R0: 测试文件（低风险）
   - R1: 普通 src/ 文件
   - R2: 配置文件（tsconfig, package.json）
   - R3: Hook 脚本（scripts/*.mjs）
   - R4: 治理文件（.claude/settings.local.json, AGENTS.md）
2. 棘轮机制：风险只升不降
3. 超过阈值（如 R3+）→ 注入额外检查提醒
4. 状态存储在 `.claude/.risk-state.json`

### 验证方式
1. 创建 REQ 声明只能改 `src/auth/`
2. 尝试编辑 `src/billing/` → scope-guard 拦截
3. 编辑 `.claude/settings.local.json` → 风险追踪器标记为 R4

### 退出标准
- [ ] PreToolUse scope-guard 能根据 REQ 范围拦截越界操作
- [ ] 风险追踪器实时更新，R3+ 操作触发额外提醒
- [ ] 范围违规有审计日志

### 预计新增/修改文件

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/scope-guard.mjs | 新建 | ~120 |
| scripts/risk-tracker.mjs | 新建 | ~100 |
| requirements/REQ_TEMPLATE.md | 修改（范围章节结构化） | +15 |
| .claude/settings.local.json | 修改 | +20 |

---

## Phase 3: 自审查（审查隔离 + 自动 QA）

**目标**：AI 自己审查自己的代码，通过机械验证而非人工判断。

### 为什么是第三步
有了"防假完成"和"防越界"之后，AI 的行为已经被约束在一个安全范围内。现在可以让它自己审查自己的工作了。关键是**审查 Agent 和实现 Agent 必须隔离**——用不同的上下文，否则就是"自己给自己打分"。

### 要构建的东西

#### 3.1 审查 Agent 隔离
```
新建：scripts/review-gatekeeper.mjs
注册：settings.local.json → PreToolUse 阶段（Task matcher）
```

**逻辑**：
1. 检测是否在 spawn review/audit 类型的子 Agent
2. 如果是 → 注入只读指令，限制子 Agent 的工具白名单
3. 审查 Agent 不能使用 Edit/Write/Bash
4. 审查结果写入 `requirements/reports/`

**实现方式**：
- 通过 PreToolUse Task hook，在 spawn 时注入额外 prompt
- 审查 Agent 使用独立的 context（只看 REQ + 代码 diff，不看实现 Agent 的思考过程）

#### 3.2 自动 QA 管道
```
新建：scripts/auto-qa.mjs
```

**逻辑**：
1. 读取 REQ 的验证计划
2. 自动执行验证计划中的命令（lint, test, type-check, docs:verify）
3. 收集结果，与验收标准对比
4. 生成 `requirements/reports/REQ-XXX-qa.md`

#### 3.3 自动 Code Review
```
新建：scripts/auto-review.mjs
```

**逻辑**：
1. 读取 git diff --stat（改了什么文件）
2. 对照 REQ 范围检查
3. 运行基础检查（语法、导入、安全模式）
4. 生成 `requirements/reports/REQ-XXX-code-review.md`

### 验证方式
1. AI 实现代码后自动触发 review Agent
2. Review Agent 无法编辑文件（工具隔离验证）
3. 自动 QA 运行 lint + test，结果写入报告

### 退出标准
- [ ] Review Agent 物理上无法编辑文件
- [ ] 自动 QA 能运行项目测试并生成报告
- [ ] 自动 Code Review 能检测基本安全问题

### 预计新增/修改文件

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/review-gatekeeper.mjs | 新建 | ~100 |
| scripts/auto-qa.mjs | 新建 | ~120 |
| scripts/auto-review.mjs | 新建 | ~100 |
| skills/autonomous/self-review.md | 新建 | ~60 |
| .claude/settings.local.json | 修改 | +15 |

---

## Phase 4: 全自治（看门狗 + 不变量学习 + 上下文路由）

**目标**：AI 可以长时间（>1 小时）无人干预地运行，自动检测和修正错误。

### 为什么是最后一步
前三步构建了安全边界（防假完成、防越界、自审查）。第四步是让 AI 在这些边界内自由奔跑，同时通过看门狗确保它不会停滞，通过不变量学习确保它不重复犯错。

### 要构建的东西

#### 4.1 看门狗（Watchdog）
```
新建：scripts/watchdog.mjs
运行方式：CronCreate 或独立进程
```

**逻辑**：
1. 定时（每 5-10 分钟）检查 progress.txt 和 REQ 状态
2. 检测停滞：REQ phase 长时间未变化
3. 检测循环：同一 REQ 反复在 review → implementation 切换
4. 停滞超过阈值 → 注入提醒或自动创建阻塞说明
5. 严重停滞 → 记录到 `.claude/watchdog-alerts.log`

#### 4.2 不变量提取器（类似 Crystal-Learn）
```
新建：scripts/invariant-extractor.mjs
```

**逻辑**：
1. 读取 `context/experience/` 中的经验文档
2. 提取重复出现的失败模式
3. 生成不变量规则（INV-XXX 格式）
4. 不变量自动注入到相关 skill 的 prompt 中

**初始不变量**（从 harness-lab 已有经验中提取）：
```
INV-001: 模板占位符逃逸 — AI 填充最小内容通过验证
INV-002: 豁免文件遗忘 — 创建豁免后忘记删除
INV-003: 报告形式主义 — 报告存在但无实质内容
INV-004: 范围蠕变 — 实现范围超过 REQ 声明
```

#### 4.3 上下文路由
```
新建：scripts/context-router.mjs
注册：settings.local.json → PostToolUse 阶段
```

**逻辑**：
1. 文件路径 → 自动加载相关上下文
2. 路由表配置在 `.claude/context-routes.json`
3. 例如：编辑 `scripts/*.mjs` → 自动加载 `context/tech/governance-scripts.md`

#### 4.4 部署守卫
```
新建：scripts/deploy-guard.mjs
注册：settings.local.json → PreToolUse Bash 阶段
```

**逻辑**：
1. 拦截危险 Bash 命令（rm -rf、force push、drop table 等）
2. 拦截生产环境部署命令
3. autonomous 模式下硬阻断，supervised 模式下警告

### 验证方式
1. 启动 autonomous 模式，让 AI 完成 1 个 REQ 全程无人干预
2. 看门狗应检测停滞并注入提醒
3. 不变量提取器应从经验文档中识别重复模式

### 退出标准
- [ ] 看门狗能检测并报告 REQ 停滞
- [ ] 不变量从经验文档中自动提取
- [ ] 上下文路由根据文件路径自动加载
- [ ] 部署守卫拦截危险命令
- [ ] AI 能在 autonomous 模式下完成 1 个完整 REQ（无人干预 > 30 分钟）

### 预计新增/修改文件

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/watchdog.mjs | 新建 | ~100 |
| scripts/invariant-extractor.mjs | 新建 | ~120 |
| scripts/context-router.mjs | 新建 | ~80 |
| scripts/deploy-guard.mjs | 新建 | ~100 |
| .claude/context-routes.json | 新建 | ~30 |
| .claude/invariants/ | 新建目录 | - |
| .claude/settings.local.json | 修改 | +25 |

---

## 全局架构演进图

```
                    Phase 0          Phase 1           Phase 2           Phase 3           Phase 4
                 ──────────       ──────────        ──────────        ──────────        ──────────
Hook 覆盖：
  SessionStart   ✅ 状态恢复      ✅ +模式显示      ✅                ✅                ✅
  PreToolUse     ✅ REQ 强制      ✅                ✅ +范围强制       ✅ +审查隔离      ✅ +部署守卫
  PostToolUse    ✅ 循环检测      ✅ +模式感知      ✅ +风险追踪       ✅                ✅ +上下文路由
  Stop           ❌               ✅ 完成度评估     ✅                ✅                ✅ 硬阻断
  SessionEnd     ❌               ✅ 自动反思       ✅                ✅                ✅
  PreCompact     ❌               ❌                ❌                ❌                ✅ 上下文保留

信任边界：
  Layer 1 认知   人              人               人               脚本              脚本+不变量
  Layer 2 意图   人              脚本(提醒)       脚本(拦截)       脚本(隔离)         脚本(全守门)
  Layer 3 执行   人              脚本(监控)       脚本(范围)       脚本(自审)         脚本(看门狗)
  Layer 4 优化   人              人               人               人                脚本(学习)

模式支持：
  collaborative  ✅              ✅               ✅               ✅                ✅
  supervised     ❌              ✅               ✅               ✅                ✅
  autonomous     ❌              ❌               ❌               ✅(受限)           ✅(完全)
```

---

## 优先级与节奏建议

| Phase | 预计 REQ 数 | 每个 REQ 预计文件改动 | 建议节奏 |
|-------|------------|---------------------|---------|
| Phase 1 | 2-3 个 REQ | 2-3 个文件/REQ | 完成后立即可用 |
| Phase 2 | 2-3 个 REQ | 2-3 个文件/REQ | Phase 1 验证稳定后开始 |
| Phase 3 | 3-4 个 REQ | 2-3 个文件/REQ | 需要真实项目验证 |
| Phase 4 | 4-5 个 REQ | 2-3 个文件/REQ | 前三个 Phase 稳定运行后 |

**关键原则**：
- 每个 Phase 完成后必须在真实项目上跑 1-2 个 REQ 验证
- 不要跳 Phase，每个 Phase 都是下一个的前置依赖
- Phase 1-2 可以在当前 harness-lab 仓库自举（用 harness-lab 开发 harness-lab）
- Phase 3-4 建议在真实业务项目上验证

---

## 风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Hook 执行超时影响编辑体验 | 每次 Write/Edit 额外等待 | 所有 hook 设 5-10s 超时，fail-open |
| 范围声明维护成本高 | 每个 REQ 需要精确列出文件 | 可用 glob 模式简化，如 `src/auth/**` |
| 审查隔离不够彻底 | AI 可能通过其他方式"作弊" | Schema 级工具限制，不只靠 prompt |
| 不变量提取质量低 | 生成无用的限制 | 需要人工审核不变量，不自动注入 |
| 自治模式下 AI 陷入死循环 | 持续操作但无进展 | 看门狗检测 + 自动创建阻塞说明 |
