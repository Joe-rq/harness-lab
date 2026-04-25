# harness-lab 统一路线图

> 2026-04-18 | 整合自《自治模式渐进式路线图》(04-10) + 《元反思诊断》(04-18)

本文档合并了两份战略文档的方向判断，并根据已完成进度重新排列阶段。

原始文档保留不动：
- `docs/plans/autonomous-mode-roadmap.md` — 分阶段架构与实现细节
- `docs/plans/development-strategy-meta-reflection.md` — 四层架构诊断与优先级分析

---

## 核心思路

不是重写，是**进化**。在现有 harness-lab 架构上引入"模式"概念，从人机协作逐步过渡到 AI 自治。

关键转变：**信任边界从"人"迁移到"Hook + 脚本"**。

```
Phase 0    →  Phase 1   →  Phase 2A    →  Phase 2B   →  Phase 3A   →  Phase 3B   →  Phase 3C   →  Phase 4    →  Phase 5    →  Phase 6
人机协作      经验回流      Onboarding    参数化        基础安全       范围强制       风险追踪       自审查        全自治        跨项目
(已完成)      (学习闭环)    (降低摩擦)    (工作流特化)   (防假完成)     (防越界)       (R0-R4)      (审查隔离)    (自学习)      (共享)
人守门        经验→规则    30分钟上手    按需模板       模式+Stop     范围拦截       风险分级       AI自审+QA     看门狗+学习   脱敏模式
```

---

## Phase 0: 当前已完成状态

### 已有能力

| 类别 | 能力 | 来源 REQ |
|------|------|----------|
| REQ 生命周期 | create → start → complete CLI | REQ-017 |
| 强制阻断 | PreToolUse：无 REQ 不让改代码 | REQ-023 |
| 循环检测 | PostToolUse：5 次/小时提醒 | REQ-034 |
| 状态恢复 | SessionStart：恢复上下文 + 豁免 TTL | REQ-018 |
| 元反思 + 对齐 | verify/record 阶段检查清单 | REQ-032 |
| Experience 沉淀 | 35+ 篇经验文档 | REQ-031 |
| 错误分类器 | 结构化治理错误 (E001-E008) | REQ-035 |
| **不变量提取器** | --scan/--check 双模式，24 条不变量 | REQ-036 |
| **不变量集成** | req-check.sh 集成提醒 + complete 触发增量扫描 | REQ-036 |

### Hook 覆盖率

```
SessionStart  → ✅ 状态恢复
PreToolUse    → ✅ REQ 强制 + 不变量提醒
PostToolUse   → ✅ 循环检测
Stop          → ❌ 无
SessionEnd    → ❌ 无
PreCompact    → ❌ 无
```

### 四层架构诊断（元反思评分）

| 层 | 评分 | 已有 | 缺口 |
|----|------|------|------|
| Layer 1 认知边界 | 70/100 | 4 实体约束、REQ 颗粒度 | Skill 参数化、问题分类 |
| Layer 2 意图防护 | 75/100 | 强制阻断、豁免审计、错误分类 | DX 认知悬崖、无 doctor |
| Layer 3 执行可靠 | 65→75/100 | REQ CLI、循环检测、**不变量** | Stop/SessionEnd 缺失、无并发 REQ |
| Layer 4 持续优化 | 40→55/100 | **不变量提取 + 注入** | 无自学习、无上下文路由 |

---

## Phase 1: 经验回流深化

**目标**：从"不变量存在"进化到"不变量自动驱动行为"。

### 为什么是第一步

REQ-036 已建立了不变量提取器的基础（扫描 + 注入提醒）。当前系统做到了"记录"和"部分提醒"，但还没做到"回流驱动"。24 条不变量中有大量是自动扫描的候选，质量参差不齐，需要：

1. 精炼不变量质量（手工审核 + 删除低价值条目）
2. 扩大注入覆盖面（不只是 req-check.sh，还覆盖 Stop/SessionEnd 等关键节点）
3. 建立不变量生命周期（创建 → 审核 → 激活 → 废弃）

### 要构建的东西

#### 1.1 不变量质量门禁

```
修改：context/invariants/TEMPLATE.md
新增：scripts/invariant-gate.mjs
```

**逻辑**：
1. 每个 invariant 必须包含：触发条件、影响文件路径模式、严重级别、验证方法
2. 新扫描出的不变量默认为 `draft` 状态，需人工审核后激活
3. `invariant-gate.mjs`：在 `--scan` 后自动标记质量不达标的条目

#### 1.2 不变量注入扩展

```
修改：scripts/invariant-extractor.mjs（新增 --inject 模式）
```

**逻辑**：
1. `--inject` 模式：读取激活状态的不变量，生成 `<system-reminder>` 格式的注入文本
2. 输出到 `.claude/.invariant-injections/` 供各 hook 消费
3. req-check.sh、session-start.sh 等脚本直接读取注入文件

#### 1.3 不变量统计面板

```
修改：scripts/session-start.sh
```

**逻辑**：启动时显示不变量统计（总条数 / 激活数 / 最近新增）

### 退出标准

- [ ] 不变量模板包含触发条件、文件模式、严重级别、验证方法
- [ ] draft/active/deprecated 生命周期可运转
- [ ] `--inject` 模式生成注入文本
- [ ] session-start 显示不变量统计

### 预计文件改动

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| context/invariants/TEMPLATE.md | 修改 | +15 |
| scripts/invariant-gate.mjs | 新建 | ~80 |
| scripts/invariant-extractor.mjs | 修改 | +50 |
| scripts/session-start.sh | 修改 | +10 |

---

## Phase 2A: Onboarding DX

**目标**：新用户 30 分钟内完成接入并创建第一个 REQ。

### 为什么是第二步（先于参数化）

经验回流系统就绪后（Phase 1），新用户接入时会自动获得已有的不变量保护。此时先解决"能不能用"比"能不能用好"更重要。DX 是漏斗的第一层——如果新用户在这层就流失，参数化对它们没有意义。

### 2A 的小范围约束

Phase 2A 只解决"接入"问题，不涉及 REQ 创建后的工作流特化。后者是 Phase 2B 的范畴。

### 要构建的东西

#### 2A.1 harness-doctor 命令

```
新建：scripts/harness-doctor.mjs
```

**逻辑**：
1. 检查 hook 是否生效（settings.local.json 中的配置是否正确）
2. 检查 REQ 模板是否已定制（非默认占位符）
3. 检查 experience 目录是否有内容
4. 检查不变量系统是否激活
5. 输出结构化诊断报告 + 修复建议

#### 2A.2 交互式首个 REQ 向导

```
新建：skills/onboarding/first-req.md
```

**逻辑**：
1. 接入后引导用户创建第一个真实 REQ
2. 根据项目类型（React/Python/Go）推荐模板字段
3. 自动填充项目名称、技术栈等信息

### 退出标准

- [ ] `harness-doctor` 能诊断 5 项健康指标并给出修复建议
- [ ] 首个 REQ 向导能在 5 分钟内引导用户完成第一个 REQ

### Phase 2A 验证方式

**测试仓库来源**：临时 clone 一个真实开源项目（如 `git clone https://github.com/expressjs/express.git /tmp/harness-test-express`），在其上执行：
1. 运行 `harness-setup` 接入
2. 运行 `harness-doctor`，报告应全部通过
3. 使用首个 REQ 向导创建第一个 REQ，计时应在 5 分钟内
4. 测试完成后删除临时目录 `rm -rf /tmp/harness-test-*`

### 预计文件改动

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/harness-doctor.mjs | 新建 | ~120 |
| skills/onboarding/first-req.md | 新建 | ~80 |

---

## Phase 2B: Skill 参数化（工作流特化）

**目标**：不同类型的 REQ（bugfix/feature/refactor）有各自特化的创建体验。

### 为什么是紧接 2A

基本 DX 完成后，用户已经能创建标准 REQ。但如果每次创建 bugfix 都要手动填写"复现步骤"、每次创建 feature 都要手动填写"用户故事"，重复劳动太多。参数化让这些字段成为默认值。

### 要构建的东西

#### 2B.1 三种特化 slash command

```
新建：.claude/commands/bugfix.md
新建：.claude/commands/feature.md
新建：.claude/commands/refactor.md
```

**设计原则**：
- 不引入新的模板文件源——`req-cli.mjs` 的 `buildReqContent()` 继续生成通用骨架
- slash command 指导 Claude 在骨架上用 Write 重写整个文件（而非 Edit 逐节填，避免 INV-039 章节重复问题）
- 每种类型的"就绪标准"不同：bugfix 只需"哪个函数坏了"，feature 需要背景+目标+非目标+验收标准

**各类型特化内容**：

| 字段 | /bugfix | /feature | /refactor |
|------|---------|----------|-----------|
| 背景 | Bug 现象 + 影响范围 | 用户痛点 + 业务背景 | 技术债/流程缺口 + 为什么现在做 |
| 目标 | 定位根因→修复→回归测试 | 实现[功能]→... | 重构[模块]→保持行为不变 |
| 非目标 | 不做影响范围外改动 | 不做[超出范围的功能] | 不做功能行为变更、不做[后续 Phase] |
| Scope Control | skip-design-validation 预勾选 | CAN/CANNOT 必填 | skip-design-validation 预勾选 |
| 验收标准 | Bug 不复现+回归测试通过 | 功能按设计实现+测试通过 | 测试通过+无行为变化 |
| 设计文档 | 豁免 | 需要时创建 | 豁免 |

#### 2B.2 项目类型适配器（拆至后续 REQ）

```
延后：skills/adapters/react.md
延后：skills/adapters/python.md
延后：skills/adapters/go.md
```

**原因**：适配器的"可用"定义模糊（产出什么？修改 settings？注入 context？），且当前 3 个 slash command 已占 4 实体。适配器拆为独立 REQ，可与 Phase 2A 的 first-req 向导中的项目类型识别表复用。

### 退出标准

- [ ] 3 种特化 REQ slash command 可用（/bugfix、/feature、/refactor）
- [ ] 每个命令能引导创建对应类型的 REQ 并自动填充特化字段
- [ ] 自动填充的内容比空模板更具体，类型间有明显差异

### Phase 2B 验证方式

在已安装 harness-lab 的仓库上测试：
1. 运行 `/bugfix`，按向导创建 bugfix 型 REQ，检查包含"Bug 现象"、"影响范围"字段且 skip-design-validation 已勾选
2. 运行 `/feature`，按向导创建 feature 型 REQ，检查包含"用户痛点"字段且 Scope Control 的 CAN/CANNOT 有提示
3. 运行 `/refactor`，按向导创建 refactor 型 REQ，检查包含"技术债"字段且非目标包含"不做功能行为变更"
4. 三种类型创建的 REQ 均能通过 `req:start` 验证

### 预计文件改动

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| .claude/commands/bugfix.md | 新建 | ~80 |
| .claude/commands/feature.md | 新建 | ~80 |
| .claude/commands/refactor.md | 新建 | ~80 |

---

## Phase 3A: 基础安全模式（模式切换 + Stop + SessionEnd）

**目标**：建立模式分层 + 防止 AI 假完成 + 会话结束时自动反思。

### 为什么是 3A

这是安全护栏的**基础层**。模式切换为后续所有 hook 提供分支依据；Stop 和 SessionEnd 是 AI 最容易"假装完成"的两个节点，必须优先堵住。

### 要构建的东西

#### 3A.1 模式切换机制

```
修改：.claude/settings.local.json
```

新增 `harnessMode` 字段：
```json
{
  "harnessMode": "collaborative" | "supervised" | "autonomous"
}
```

每个 hook 脚本启动时读取此字段，根据模式走不同分支。

#### 3A.2 Stop 评估器

```
新建：scripts/stop-evaluator.mjs
注册：settings.local.json → Stop 阶段
```

**逻辑**：
1. 读取当前 REQ 的验收标准
2. 读取本次会话的 git diff
3. 交叉检查：验收标准中的每个条目是否有对应改动
4. 未覆盖 → supervised 提醒 / autonomous 硬阻断

#### 3A.3 SessionEnd 反思

```
新建：scripts/session-reflect.mjs
注册：settings.local.json → SessionEnd 阶段
```

**逻辑**：
1. 读取本次会话改动的文件列表
2. 检查 REQ 进度（目标 vs 完成）
3. 生成摘要写入 `.claude/session-log/`
4. REQ 未完成时自动更新 progress.txt

### 退出标准

- [ ] `harnessMode` 字段可切换，hook 行为随之变化
- [ ] Stop 评估器在 AI 提前结束时注入提醒
- [ ] SessionEnd 自动更新 progress.txt

### 预计文件改动

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/stop-evaluator.mjs | 新建 | ~150 |
| scripts/session-reflect.mjs | 新建 | ~80 |
| scripts/loop-detection.mjs | 修改（加模式判断） | +10 |
| .claude/settings.local.json | 修改 | +15 |

---

## Phase 3B: 范围强制（防越界）

**目标**：AI 不能修改 REQ 声明范围外的文件。

### 为什么是 3B（独立拆分）

范围强制器涉及 REQ 模板结构变更（范围从自由文本变为结构化文件列表），是一个**跨模块的契约变更**。与 3A 的基础模式切换相比，它需要更多测试验证，独立推进可以降低回滚复杂度。

### 要构建的东西

#### 3B.1 范围强制器

```
新建：scripts/scope-guard.mjs
注册：settings.local.json → PreToolUse 阶段
```

**逻辑**：
1. 读取当前 REQ 的"范围"章节（结构化文件列表）
2. PreToolUse 时检查目标文件是否在范围内
3. 越界 → supervised 警告 / autonomous 硬阻断
4. 记录到 `.claude/scope-violations.log`

**REQ 模板需更新**：范围声明从自由文本变为结构化文件列表。

### 退出标准

- [ ] scope-guard 能根据 REQ 范围拦截越界操作
- [ ] 范围声明格式文档化，旧 REQ 可向后兼容

### 预计文件改动

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/scope-guard.mjs | 新建 | ~120 |
| requirements/REQ_TEMPLATE.md | 修改（范围章节结构化） | +15 |
| .claude/settings.local.json | 修改 | +5 |

---

## Phase 3C: 风险追踪

**目标**：实时评估操作风险等级，R3+ 触发额外检查。

### 为什么是 3C（独立拆分）

风险追踪器与范围强制器解耦：范围强制是**布尔判断**（在范围内/不在），风险追踪是**连续评估**（R0-R4）。两者逻辑独立，分开实施便于分别验证。

### 要构建的东西

#### 3C.1 风险追踪器

```
新建：scripts/risk-tracker.mjs
注册：settings.local.json → PostToolUse 阶段
```

**逻辑**：
1. 根据文件路径判断风险等级（R0-R4）
2. 棘轮机制：风险只升不降
3. 超过 R3+ → 注入额外检查提醒

### 退出标准

- [ ] 风险追踪器实时更新，R3+ 触发提醒
- [ ] 风险等级定义文档化

### 预计文件改动

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/risk-tracker.mjs | 新建 | ~100 |
| scripts/session-start.sh | 修改（显示模式+风险） | +5 |
| .claude/settings.local.json | 修改 | +5 |

---

## Phase 4: 自审查（审查隔离 + 自动 QA）

**目标**：AI 自己审查自己的代码，通过机械验证而非人工判断。

### 为什么是第四步

有了安全护栏后，AI 的行为已被约束在安全范围内。现在可以让它自审——关键是**审查 Agent 和实现 Agent 必须隔离**。

### 要构建的东西

#### 4.1 审查 Agent 隔离

```
新建：scripts/review-gatekeeper.mjs
注册：settings.local.json → PreToolUse Task matcher
```

**逻辑**：
1. 检测是否在 spawn review/audit 类型子 Agent
2. 如果是 → 注入只读指令，限制工具白名单
3. 审查 Agent 不能使用 Edit/Write/Bash
4. 结果写入 `requirements/reports/`

#### 4.2 自动 QA 管道

```
新建：scripts/auto-qa.mjs
```

**逻辑**：
1. 读取 REQ 的验证计划
2. 自动执行验证命令（lint, test, type-check, docs:verify）
3. 收集结果，与验收标准对比
4. 生成 `requirements/reports/REQ-XXX-qa.md`

#### 4.3 自动 Code Review

```
新建：scripts/auto-review.mjs
```

**逻辑**：
1. 读取 git diff --stat
2. 对照 REQ 范围检查
3. 运行基础检查（语法、导入、安全模式）
4. 生成 `requirements/reports/REQ-XXX-code-review.md`

### 退出标准

- [ ] Review Agent 物理上无法编辑文件
- [ ] 自动 QA 能运行项目测试并生成报告
- [ ] 自动 Code Review 能检测基本安全问题

### 预计文件改动

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/review-gatekeeper.mjs | 新建 | ~100 |
| scripts/auto-qa.mjs | 新建 | ~120 |
| scripts/auto-review.mjs | 新建 | ~100 |
| skills/autonomous/self-review.md | 新建 | ~60 |
| .claude/settings.local.json | 修改 | +15 |

---

## Phase 5: 全自治（看门狗 + 上下文路由 + 部署守卫）

**目标**：AI 可以长时间（>1 小时）无人干预地运行，自动检测和修正错误。

### 为什么是第五步

前四步构建了学习闭环、安全边界和自审能力。第五步让 AI 在这些边界内自由奔跑，同时通过看门狗防止停滞。

### 要构建的东西

#### 5.1 看门狗（Watchdog）

```
新建：scripts/watchdog.mjs
运行方式：CronCreate 或独立进程
```

**逻辑**：
1. 定时检查 progress.txt 和 REQ 状态
2. 检测停滞：REQ phase 长时间未变化
3. 检测循环：同一 REQ 反复切换
4. 停滞超阈值 → 注入提醒或创建阻塞说明

#### 5.2 上下文路由

```
新建：scripts/context-router.mjs
注册：settings.local.json → PostToolUse 阶段
```

**逻辑**：
1. 文件路径 → 自动加载相关上下文
2. 路由表配置在 `.claude/context-routes.json`
3. 如：编辑 `scripts/*.mjs` → 自动加载 `context/tech/governance-scripts.md`

#### 5.3 部署守卫

```
新建：scripts/deploy-guard.mjs
注册：settings.local.json → PreToolUse Bash 阶段
```

**逻辑**：
1. 拦截危险 Bash 命令（rm -rf、force push、drop table）
2. autonomous 模式硬阻断，supervised 警告

#### 5.4 不变量自学习（深化）

```
修改：scripts/invariant-extractor.mjs
```

**逻辑**：
1. 在 Phase 1 基础上增加自动质量评估
2. 不变量使用频率追踪（被触发次数）
3. 长期未触发的不变量自动标记为 deprecated
4. 高频触发的不变量升级严重级别

### 退出标准

- [ ] 看门狗能检测并报告 REQ 停滞
- [ ] 上下文路由根据文件路径自动加载
- [ ] 部署守卫拦截危险命令
- [ ] 不变量自学习运转（使用频率 + 自动废弃）
- [ ] AI 能在 autonomous 模式下完成 1 个完整 REQ，期间遇到至少 1 次异常（测试失败 / lint 错误 / 范围冲突）并成功自恢复，无需人工干预

### 预计文件改动

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/watchdog.mjs | 新建 | ~100 |
| scripts/context-router.mjs | 新建 | ~80 |
| scripts/deploy-guard.mjs | 新建 | ~100 |
| scripts/invariant-extractor.mjs | 修改（自学习） | +60 |
| .claude/context-routes.json | 新建 | ~30 |
| .claude/settings.local.json | 修改 | +25 |

---

## Phase 6（远期）：跨项目模式共享

**目标**：多个使用 harness-lab 的项目之间共享脱敏后的不变量模式。

### 为什么是远期

这是《Thin Harness, Fat Skills》里 "skills compound" 的终极形态，但需要前 5 个阶段稳定运行后才有价值。当前没有跨项目的使用场景来验证。

### 愿景

1. 项目 A 发现的不变量模式可脱敏后发布到共享库
2. 项目 B 接入时自动获得"前人踩过的坑"的保护
3. 模式有版本控制，项目可选择性订阅

---

## 全局架构演进图

```
                  Phase 0        Phase 1         Phase 2         Phase 3A        Phase 3B        Phase 3C        Phase 4         Phase 5         Phase 6
               ──────────     ──────────      ──────────      ──────────      ──────────      ──────────      ──────────      ──────────      ──────────
Hook 覆盖：
  SessionStart ✅ 状态恢复    ✅ +不变量统计   ✅              ✅ +模式显示     ✅              ✅              ✅              ✅              ✅
  PreToolUse   ✅ REQ +不变量 ✅ +注入扩展     ✅              ✅              ✅ +范围强制     ✅ +审查隔离    ✅ +部署守卫    ✅
  PostToolUse  ✅ 循环检测    ✅              ✅              ✅              ✅ +风险追踪     ✅              ✅ +上下文路由  ✅
  Stop         ❌            ❌              ❌              ✅ 完成度评估    ✅              ✅              ✅              ✅ 硬阻断       ✅
  SessionEnd   ❌            ❌              ❌              ✅ 自动反思      ✅              ✅              ✅              ✅              ✅
  PreCompact   ❌            ❌              ❌              ❌              ❌              ❌              ❌              ✅ 上下文保留    ✅

学习闭环：
  不变量提取    ✅ 基础扫描    ✅ 质量门禁     ✅              ✅              ✅              ✅              ✅              ✅ 自学习       ✅ 跨项目
  不变量注入    ✅ req-check   ✅ 多节点注入   ✅              ✅              ✅              ✅              ✅              ✅              ✅

信任边界：
  Layer 1 认知 人            人+规则          人+规则          人              人              人              脚本            脚本+不变量     共享不变量
  Layer 2 意图 人+脚本       人+脚本          人+脚本          脚本(拦截)      脚本(拦截)      脚本(拦截)      脚本(隔离)      脚本(全守门)    脚本
  Layer 3 执行 人+脚本       人+脚本          人+脚本          脚本(模式)      脚本(范围)      脚本(风险)      脚本(自审)      脚本(看门狗)    脚本
  Layer 4 优化 人            脚本(提取)       人              人              人              人              人              脚本(学习)      脚本(共享)

模式支持：
  collaborative ✅           ✅              ✅              ✅              ✅              ✅              ✅              ✅              ✅
  supervised    ❌           ❌              ❌              ✅              ✅              ✅              ✅              ✅              ✅
  autonomous    ❌           ❌              ❌              ❌              ❌              ❌              ✅(受限)         ✅(完全)         ✅
```

---

## 优先级与节奏建议

| Phase | 预计 REQ 数 | 文件改动/REQ | 建议节奏 | 依赖 |
|-------|------------|-------------|---------|------|
| Phase 1 | 1-2 个 REQ | 2-3 个/REQ | 立即可开始，已有基础 | 无 |
| Phase 2A | 1 个 REQ | 2-3 个/REQ | Phase 1 完成后 | Phase 1（不变量就绪后 onboarding 才有意义） |
| Phase 2B | 1-2 个 REQ | 2-3 个/REQ | Phase 2A 验证后 | **Phase 2A 硬前置**（向导可用后参数化才有意义） |
| Phase 3A | 1-2 个 REQ | 2-3 个/REQ | Phase 2B 验证后 | 无强依赖 |
| Phase 3B | 1 个 REQ | 2-3 个/REQ | Phase 3A 稳定后 | Phase 3A（模式切换是范围强制的分支依据） |
| Phase 3C | 1 个 REQ | 2-3 个/REQ | Phase 3B 稳定后 | Phase 3A（模式切换是风险追踪的分支依据） |
| Phase 4 | 3-4 个 REQ | 2-3 个/REQ | Phase 3B 稳定后 | Phase 3B（范围强制是审查隔离的前提） |
| Phase 5 | 3-4 个 REQ | 2-3 个/REQ | Phase 4 真实项目验证后 | Phase 3A+4 |
| Phase 6 | 待定 | 待定 | Phase 5 稳定运行后 | Phase 5 |

**关键原则**：
- Phase 1 和 2A 可交错推进；**Phase 2B 依赖 2A 验证通过**
- Phase 3A 是 3B/3C/4 的硬前置（模式切换为后续 hook 提供分支依据）
- Phase 3B 是 Phase 4 的硬前置（范围强制是审查隔离的前提）
- Phase 1-3 可在 harness-lab 仓库自举
- Phase 4-5 建议在真实业务项目上验证
- 每个 Phase 完成后必须跑 1-2 个真实 REQ 验证
- Phase 间验证不通过不得进入下一个 Phase（可原地返工迭代）

---

## 风险与回滚

| 风险 | 影响 | 缓解措施 | 相关错误分类 |
|------|------|---------|------------|
| 不变量质量低，注入变成噪音 | AI 忽略提醒 | draft/active 生命周期，人工审核 | E003 文档质量不足 |
| Hook 执行超时影响编辑体验 | Write/Edit 额外等待 | 所有 hook 设 5-10s 超时，fail-open | — |
| **Hook 超时叠加** | 多个 hook 串行执行，单次操作等待 15-30s | 并行化无依赖 hook；总超时上限 15s | — |
| 范围声明维护成本高 | 每个 REQ 需精确列文件 | glob 模式简化，如 `src/auth/**` | — |
| 审查隔离不够彻底 | AI 可能"作弊" | Schema 级工具限制，不只靠 prompt | — |
| 路线图本身漂移 | 计划与实现脱节 | roadmap-status.md 强制追踪；Phase 间验证不通过不得进入下一阶段 | E006 状态不同步 |
| 自治模式陷入死循环 | 持续操作无进展 | 看门狗检测 + 自动阻塞说明 |
| DX 优化后发现用户不用 | 投入浪费 | 先在 1 个真实新项目上验证 |

---

## 路线图运转机制

### 路线图进度追踪

统一路线图本身也需要追踪进度，否则会变为一纸空文。

**存储位置**：`.claude/roadmap-status.md`

**内容格式**：

```markdown
# 路线图状态

| Phase | 状态 | 当前 REQ | 验证结果 | 更新日期 |
|-------|------|----------|---------|---------|
| Phase 1 | pending | — | — | — |
| Phase 2A | — | — | — | — |
| Phase 2B | — | — | — | — |
| Phase 3 | — | — | — | — |
| Phase 4 | — | — | — | — |
| Phase 5 | — | — | — | — |
| Phase 6 | — | — | — | — |
```

**更新时机**：
1. 当 Phase 的某个 REQ 进入 in-progress 时，更新"当前 REQ"
2. 当 Phase 的所有 REQ 完成且验证通过后，标记状态为 completed
3. 当路线图本身被修订时，追加修订记录到文件末尾

**SessionStart 显示**：SessionStart hook 恢复上下文时，一并读取 roadmap-status.md 并显示当前阶段进度。

### Phase 间验证标准

每个 Phase 完成后，用以下清单判断是否允许进入下一个 Phase。任何一项不通过，必须在当前 Phase 返工迭代。

| 检查项 | 通过标准 | 验证方式 |
|--------|---------|---------|
| 退出标准 | 所有 checkbox 已勾选 | 人工审查 |
| 文件改动 | 新建/修改的文件数与预计一致（误差 ≤1） | `git diff --stat` |
| 回归测试 | 已有测试全部通过 | `npm test` |
| 真实 REQ 验证 | 用该 Phase 新能力完成 1-2 个真实 REQ，且过程无异常 | 执行 req:start → req:complete 全流程 |
| 耗时 | 真实 REQ 验证的耗时在合理范围内（≤2 倍预期） | 计时 |

### 路线图修订协议

统一路线图不是一成不变的。以下情况触发修订：

1. **Phase 完成后回顾**：每个 Phase 完成后，花 15 分钟回顾——原计划是否遗漏了什么？是否有新的洞察需要调整后续 Phase？
2. **外部参考更新**：当《Thin Harness, Fat Skills》或 wow-harness 发布新版本时，对比检查是否有值得吸收的新模式
3. **紧急修复**：当前 Phase 实施过程中发现重大设计缺陷，可立即修订后续 Phase 的方案

**修订规则**：
- 修订必须记录到 `.claude/roadmap-status.md` 末尾
- 修订不得删除已完成 Phase 的内容，只能追加说明或修改待完成 Phase
- 修订后更新本文档的版本日期

### 外部参考对标检查点

每完成一个 Phase，执行一次外部参考回顾（耗时 10 分钟）：

| 参考来源 | 检查内容 | 更新频率 |
|---------|---------|---------|
| 《Thin Harness, Fat Skills》 | 新的框架模式、skill 设计最佳实践 | 每 Phase |
| wow-harness（GitHub） | 新功能、新 hook 类型 | 每 Phase |
| Context Hub / Claude Code 文档 | 新 hook 阶段、新 skill 能力 | 每 2 Phase |

**输出**：将对比发现的 1-3 个最有价值的新洞察写入 `context/experience/roadmap-review-{date}.md`，并判断是否需要创建新的 REQ 来跟进。

---

## 与原始文档的对照

| 原始文档内容 | 统一路线图位置 | 变化 |
|-------------|---------------|------|
| 路线图 Phase 0 | Phase 0 | 吸收 REQ-036 成果 |
| 路线图 Phase 1（Stop 评估器） | Phase 3A.2 | 优先级下调，归入基础安全模式 |
| 路线图 Phase 2（范围+风险） | Phase 3B + 3C | **拆分**：范围强制与风险追踪独立为两个 Phase |
| 路线图 Phase 3（自审查） | Phase 4 | 不变 |
| 路线图 Phase 4（全自治） | Phase 5 | 不变量学习拆为 Phase 1+5 两步 |
| 元反思方向 1（学习闭环） | Phase 1 | **前置**，基础已在 REQ-036 落地 |
| 元反思方向 2（DX） | Phase 2A | 新增阶段，从原笼统 Phase 2 中拆分独立 |
| 元反思方向 3（Skill 参数化） | Phase 2B | 从原笼统 Phase 2 中拆分独立 |
| 元反思方向 4（Stop 评估器） | Phase 3A.2 | 与路线图 Phase 1 合并为基础安全模式 |
| 元反思方向 5（跨项目共享） | Phase 6 | 远期愿景 |

### 本次修订记录（2026-04-20）

**触发原因**：元反思审查发现 Phase 3 违反 4 实体规则（涉及 5 个模块 + 8 个文件 + 模板修改）。

**修订内容**：
1. Phase 3 → 拆分为 3A（模式+Stop+SessionEnd）、3B（范围强制）、3C（风险追踪）
2. Phase 2B 明确为 Phase 2A 硬前置（消除"互不强依赖"矛盾）
3. Phase 5 验收标准从"30分钟无人干预"强化为"遇异常自恢复"
4. 风险表新增"Hook超时叠加"项，引用 E003/E006 错误分类
5. Phase 2A 验证方式明确测试仓库来源（临时 clone）
6. 新增 `.claude/roadmap-status.md` 追踪文件
