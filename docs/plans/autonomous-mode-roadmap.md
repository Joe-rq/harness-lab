# harness-lab 自治模式渐进式路线图 v2

> 2026-04-10 | 基于元架构审视修订

## 修订说明

本版本基于**四层元架构**（认知边界→意图防护→执行可靠→持续优化）审视 v1 版本，补充了以下关键内容：

| 修订项 | 原版本 | 修订后 |
|--------|--------|--------|
| 元反思检查点 | ❌ 缺失 | ✅ 每个 Phase 强制 6 问检查 |
| 看门狗时机 | Phase 4 | Phase 1（基础版） |
| 兜底策略 | ⚠️ 模糊 | ✅ 明确 fail-open/fail-closed 场景 |
| 验收标准 | 自然语言 | ✅ 结构化模板（可机械验证） |
| 三重防护 | ❌ 缺失 | ✅ Phase 2 补充 |
| Hook 性能 | ❌ 未考虑 | ✅ Phase 2 倍速测试 |

---

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

## 元架构映射

| Phase | Layer 1 认知边界 | Layer 2 意图防护 | Layer 3 执行可靠 | Layer 4 持续优化 |
|-------|-----------------|-----------------|-----------------|-----------------|
| Phase 1 | ✅ 验收标准结构化 | ⚠️ 兜底策略 | ✅ 看门狗基础 | - |
| Phase 2 | ✅ 范围约束 | ✅ 三重防护 | ✅ 完整性检查 | ✅ 性能基准 |
| Phase 3 | - | ✅ 审查隔离 | ✅ 自动 QA | - |
| Phase 4 | ✅ 不变量学习 | - | ✅ 看门狗增强 | ✅ 积累飞轮 |

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

## Phase 1: 防假完成（Stop 评估器 + 看门狗基础 + 元反思检查点）

**目标**：AI 不能再说"我搞定了"就结束，必须通过机械验证。

**元架构覆盖**：
- Layer 1 认知边界：验收标准结构化
- Layer 3 执行可靠：看门狗基础（停滞检测）

### 为什么这是第一步

AI 最常见也是最危险的失败模式是**声称完成但实际没完成**。wow-harness 的 stop-evaluator 被列为最高优先级，因为这是"AI 跑掉"的第一道防线。

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

#### 1.2 验收标准结构化模板

**问题**：原验收标准是自然语言，AI 无法自检。

**解决方案**：验收标准必须**可机械验证**。

```markdown
## 验收标准（结构化模板）

### 功能验证
- [ ] 测试 `test_login_redirect` 通过
- [ ] 测试 `test_session_persistence` 通过
- [ ] 无 TypeScript 编译错误（`tsc --noEmit`）

### 行为验证
- [ ] 登录后跳转路径 = `/dashboard`（硬编码检查）
- [ ] Session 有效期 = 7 天（配置项检查）

### 文档验证
- [ ] `docs/auth.md` 包含 "Session Management" 章节
```

**结构化要求**：
1. 每条验收标准必须是**可执行命令**或**可断言条件**
2. 禁止模糊描述（如"提升用户体验"、"优化性能"）
3. AI 可以通过运行命令或检查文件来验证

#### 1.3 Stop 评估器

```
新建：scripts/stop-evaluator.mjs
注册：settings.local.json → Stop 阶段
```

**逻辑**：
1. 读取当前 REQ 的验收标准（结构化格式）
2. 逐条执行验证命令或检查条件
3. 收集未通过的条目 → 注入 `additionalContext` 提醒
4. 记录验证结果到 `.claude/.stop-state/REQ-XXX.json`

**关键设计**：
- supervised 模式：提醒（fail-open）
- autonomous 模式：硬阻断（fail-closed）

```javascript
// 伪代码
function evaluateStop(reqId) {
  const criteria = parseAcceptanceCriteria(reqId);
  const results = [];

  for (const criterion of criteria) {
    if (criterion.type === 'test') {
      const passed = runTest(criterion.testName);
      results.push({ criterion, passed, evidence: `test output` });
    } else if (criterion.type === 'check') {
      const passed = checkCondition(criterion.condition);
      results.push({ criterion, passed, evidence: `check result` });
    }
  }

  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    return {
      allowStop: false,
      message: `以下验收标准未通过：\n${failed.map(f => `- ${f.criterion.text}`).join('\n')}`
    };
  }

  return { allowStop: true };
}
```

#### 1.4 看门狗基础版（停滞检测）

```
新建：scripts/stall-detector.mjs
运行方式：SessionStart hook 或 CronCreate
```

**逻辑**：
1. 读取 `.claude/progress.txt` 的 `lastUpdate` 时间戳
2. 计算距离上次更新的时间间隔
3. 超过阈值（30 分钟）→ 注入停滞提醒
4. 超过严重阈值（2 小时）→ 自动创建阻塞说明

```javascript
const STALL_THRESHOLD = 30 * 60 * 1000; // 30 分钟
const SEVERE_THRESHOLD = 2 * 60 * 60 * 1000; // 2 小时

function detectStall() {
  const progress = readProgress();
  const elapsed = Date.now() - new Date(progress.lastUpdate).getTime();

  if (elapsed > SEVERE_THRESHOLD) {
    return {
      level: 'severe',
      action: 'create-blocker',
      message: `REQ ${progress.currentReq} 已停滞 ${Math.floor(elapsed / 60000)} 分钟`
    };
  }

  if (elapsed > STALL_THRESHOLD) {
    return {
      level: 'warning',
      action: 'inject-reminder',
      message: `检测到停滞，上次更新：${progress.lastUpdate}`
    };
  }

  return { level: 'ok' };
}
```

#### 1.5 元反思检查点

**每个 Phase 完成后强制 6 问检查**：

```markdown
## 元反思检查清单

在宣布 Phase 完成前，必须回答：

1. **正确性**：实现是否正确？有无语法/逻辑错误？
2. **目标达成**：REQ 的验收标准是否全部覆盖？
3. **完整性**：是否有遗漏的边缘情况？
4. **一致性**：改动是否与 REQ 范围一致？是否越界？
5. **安全性**：是否引入新的风险？Hook 失败时行为是什么？
6. **优化空间**：是否有更简洁的实现？

### 回答格式

| 问题 | 状态 | 证据 |
|------|------|------|
| 正确性 | ✅ | `npm test` 通过，无 lint 错误 |
| 目标达成 | ⚠️ | 验收标准 3/4 通过，1 条需人工验证 |
| 完整性 | ✅ | 边缘情况已在测试中覆盖 |
| 一致性 | ✅ | 改动文件均在 REQ 范围内 |
| 安全性 | ⚠️ | Hook 超时未处理，需补充兜底 |
| 优化空间 | ✅ | stop-evaluator 可合并到 gatekeeper |
```

#### 1.6 兜底策略文档

```
新建：docs/governance/fallback-strategies.md
```

**内容**：

| 场景 | 模式 | 行为 | 记录 |
|------|------|------|------|
| Hook 超时（>5s） | collaborative | fail-open，允许继续 | `.claude/hook-timeouts.log` |
| Hook 超时（>5s） | supervised | fail-open + 警告注入 | 同上 |
| Hook 超时（>5s） | autonomous | fail-closed，阻断操作 | 同上 |
| Hook 异常（未捕获） | 所有 | fail-open + 错误日志 | `.claude/hook-errors.log` |
| REQ 文件损坏 | 所有 | 警告 + 降级到 collaborative | `.claude/req-errors.log` |
| 验收标准解析失败 | 所有 | 警告 + 跳过自动验证 | `.claude/parse-errors.log` |

#### 1.7 SessionEnd 反思

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

1. 创建 REQ，填写结构化验收标准
2. 让 AI 完成一个 REQ 中的一个目标就尝试停止
3. Stop 评估器应拦截并提醒"验收标准 X 未通过"
4. 手动模拟停滞（不更新 progress.txt 30 分钟）
5. SessionStart 应检测到停滞并注入提醒

### 退出标准

- [ ] `harnessMode` 字段可切换，hook 行为随之变化
- [ ] Stop 评估器能解析结构化验收标准并执行验证
- [ ] 看门狗基础版能检测停滞并注入提醒
- [ ] SessionEnd 自动更新 progress.txt
- [ ] 元反思检查清单已完成（6 问全部回答）

### 预计新增/修改文件

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/stop-evaluator.mjs | 新建 | ~200 |
| scripts/stall-detector.mjs | 新建 | ~80 |
| scripts/session-reflect.mjs | 新建 | ~80 |
| docs/governance/fallback-strategies.md | 新建 | ~60 |
| requirements/REQ_TEMPLATE.md | 修改（验收标准结构化） | +30 |
| scripts/loop-detection.mjs | 修改（加模式判断） | +10 |
| scripts/session-start.sh | 修改（显示模式 + 停滞检测） | +15 |
| .claude/settings.local.json | 修改（加 harnessMode + Stop/SessionEnd hook） | +25 |

---

## Phase 2: 防越界（范围强制 + 三重防护 + 风险追踪）

**目标**：AI 只能改 REQ 声明范围内的文件，越界自动拦截。

**元架构覆盖**：
- Layer 1 认知边界：范围约束
- Layer 2 意图防护：三重防护
- Layer 3 执行可靠：完整性检查
- Layer 4 持续优化：性能基准

### 为什么是第二步

有了"防假完成"之后，第二个问题是"AI 改了不该改的东西"。自治模式下 AI 可能自作主张改了 10 个文件，但 REQ 只涉及 3 个。

### 要构建的东西

#### 2.1 范围强制器

```
新建：scripts/scope-guard.mjs
注册：settings.local.json → PreToolUse 阶段（在 req-check 之后）
```

**逻辑**：
1. 读取当前 REQ 的"范围"章节（结构化文件列表）
2. PreToolUse 时检查目标文件是否在范围内
3. 越界 → supervised 模式警告，autonomous 模式硬阻断
4. 每次越界记录到 `.claude/scope-violations.log`

**REQ 模板需要更新**：
```markdown
## 范围

### 允许修改
- `src/auth/login.ts`
- `src/auth/session.ts`

### 允许新增
- `tests/auth/**/*.test.ts`

### 禁止修改
- `src/billing/**`
- `.claude/settings.local.json`
```

范围声明从"自由文本"变成"结构化文件列表"，支持 glob 模式。

#### 2.2 三重防护

```
新建：scripts/triple-protection.mjs
注册：settings.local.json → PreToolUse + PostToolUse 阶段
```

**第一重：输入验证（PreToolUse）**
```javascript
function validateInput(toolCall) {
  // 检查文件路径合法性
  if (toolCall.name === 'Edit' || toolCall.name === 'Write') {
    const filePath = toolCall.input.file_path;
    if (!isWithinProject(filePath)) {
      return { valid: false, reason: '文件路径超出项目范围' };
    }
    if (isBlacklisted(filePath)) {
      return { valid: false, reason: '禁止修改此文件' };
    }
  }

  // 检查 REQ 存在性
  if (!hasActiveReq() && !hasExemption()) {
    return { valid: false, reason: '无活跃 REQ' };
  }

  return { valid: true };
}
```

**第二重：执行监控（PostToolUse）**
```javascript
function monitorExecution(toolCall, result) {
  // 记录操作日志
  logOperation(toolCall, result);

  // 检测异常输出
  if (result.error) {
    logError(toolCall, result.error);
    return { action: 'log', level: 'error' };
  }

  // 检测可疑模式
  if (containsSuspiciousPattern(result.output)) {
    return { action: 'warn', message: '检测到可疑输出模式' };
  }

  return { action: 'continue' };
}
```

**第三重：输出验证（PostToolUse）**
```javascript
function validateOutput(toolCall, result) {
  if (toolCall.name === 'Write' || toolCall.name === 'Edit') {
    const filePath = toolCall.input.file_path;

    // 语法检查
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      const syntaxOk = checkSyntax(filePath);
      if (!syntaxOk) {
        return { valid: false, reason: '语法错误' };
      }
    }

    // 类型检查（可选，较慢）
    if (shouldRunTypeCheck(filePath)) {
      const typeOk = runTypeCheck(filePath);
      if (!typeOk) {
        return { valid: false, reason: '类型错误' };
      }
    }
  }

  return { valid: true };
}
```

#### 2.3 风险追踪器

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
   - R4: 治理文件（.claude/settings.local.json, CLAUDE.md）
2. 棘轮机制：风险只升不降
3. 超过阈值（如 R3+）→ 注入额外检查提醒
4. 状态存储在 `.claude/.risk-state.json`

#### 2.4 Hook 性能基准

```
新建：scripts/benchmark-hooks.mjs
```

**目的**：当 Hook 串联达到 4 个时，验证性能可接受。

```javascript
async function benchmarkHooks(operations = 100) {
  const results = {
    reqCheck: [],
    scopeGuard: [],
    tripleProtection: [],
    riskTracker: []
  };

  for (let i = 0; i < operations; i++) {
    // 模拟 Edit 操作
    const start = performance.now();
    await runHook('req-check');
    results.reqCheck.push(performance.now() - start);

    const start2 = performance.now();
    await runHook('scope-guard');
    results.scopeGuard.push(performance.now() - start2);

    // ... 其他 hook
  }

  return {
    summary: {
      totalAvg: calculateAverage(results),
      maxSingle: Math.max(...Object.values(results).flat()),
      targetMet: calculateAverage(results) < 100 // 目标：< 100ms
    },
    details: results
  };
}
```

**目标**：
- 单次 Hook 延迟 < 100ms
- 100 次操作累积延迟 < 5s
- 超过目标 → 考虑合并 Hook 或优化逻辑

#### 2.5 Hook 合并优化

当 Hook 数量超过 3 个时，考虑合并为 **统一网关**：

```javascript
// scripts/gatekeeper.mjs
// 合并 req-check + scope-guard + deploy-guard

async function gatekeeper(toolCall) {
  const checks = [
    checkReq(toolCall),
    checkScope(toolCall),
    checkDeploySafety(toolCall)
  ];

  // 并行执行检查
  const results = await Promise.all(checks);

  // 汇总结果
  const blockers = results.filter(r => !r.passed);
  if (blockers.length > 0) {
    return {
      allow: false,
      reasons: blockers.map(b => b.reason)
    };
  }

  return { allow: true };
}
```

### 验证方式

1. 创建 REQ 声明只能改 `src/auth/`
2. 尝试编辑 `src/billing/` → scope-guard 拦截
3. 编辑 `.claude/settings.local.json` → 风险追踪器标记为 R4
4. 运行 `node scripts/benchmark-hooks.mjs --operations 100`
5. 验证延迟是否符合目标

### 退出标准

- [ ] PreToolUse scope-guard 能根据 REQ 范围拦截越界操作
- [ ] 三重防护（输入→执行→输出）已实现
- [ ] 风险追踪器实时更新，R3+ 操作触发额外提醒
- [ ] Hook 性能基准测试通过（< 100ms）
- [ ] 元反思检查清单已完成

### 预计新增/修改文件

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/scope-guard.mjs | 新建 | ~150 |
| scripts/triple-protection.mjs | 新建 | ~120 |
| scripts/risk-tracker.mjs | 新建 | ~100 |
| scripts/benchmark-hooks.mjs | 新建 | ~80 |
| requirements/REQ_TEMPLATE.md | 修改（范围章节结构化） | +20 |
| .claude/settings.local.json | 修改 | +30 |

---

## Phase 3: 自审查（审查隔离 + 自动 QA）

**目标**：AI 自己审查自己的代码，通过机械验证而非人工判断。

**元架构覆盖**：
- Layer 2 意图防护：审查隔离
- Layer 3 执行可靠：自动 QA

### 为什么是第三步

有了"防假完成"和"防越界"之后，AI 的行为已经被约束在一个安全范围内。现在可以让它自己审查自己的工作了。

### 前置验证（必须先完成）

**在实施 Phase 3 之前，需要验证技术可行性：**

1. PreToolUse Task hook 能否限制子 Agent 的工具白名单？
2. 审查隔离能否通过 schema 层实现？

**验证步骤**：
```bash
# 1. 创建测试 hook
cat > .claude/test-task-hook.mjs << 'EOF'
export default function({ tool, input }) {
  if (tool === 'Task' && input.subagent_type === 'reviewer') {
    // 尝试注入工具限制
    return {
      additionalContext: '你是一个审查 Agent，只能使用 Read/Grep/Glob 工具。',
      allowedTools: ['Read', 'Grep', 'Glob']
    };
  }
}
EOF

# 2. 注册到 settings.local.json
# 3. spawn 一个 reviewer agent
# 4. 验证它是否真的无法使用 Edit/Write
```

**如果 schema 级限制不可行**：
- 退而求其次：审查 Agent 用独立进程
- 通过文件系统隔离（只给它只读访问的目录）
- 或者暂时跳过 Phase 3，等待 Claude Code API 支持

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

```javascript
// 伪代码
function reviewGatekeeper(toolCall) {
  if (toolCall.name !== 'Agent') return { allow: true };

  const { subagent_type } = toolCall.input;
  if (subagent_type !== 'reviewer' && subagent_type !== 'auditor') {
    return { allow: true };
  }

  // 注入工具限制
  return {
    allow: true,
    modification: {
      ...toolCall.input,
      tools: ['Read', 'Grep', 'Glob', 'LSP'], // 只读工具
      additionalContext: `
你是审查 Agent，职责是检查代码质量。

**禁止行为**：
- 不能修改任何文件
- 不能执行任何 Bash 命令
- 只能读取和分析代码

**必须输出**：
1. 代码质量评估
2. 潜在问题列表
3. 改进建议
      `
    }
  };
}
```

#### 3.2 自动 QA 管道

```
新建：scripts/auto-qa.mjs
```

**逻辑**：
1. 读取 REQ 的验证计划
2. 自动执行验证计划中的命令（lint, test, type-check, docs:verify）
3. 收集结果，与验收标准对比
4. 生成 `requirements/reports/REQ-XXX-qa.md`

```javascript
async function runAutoQA(reqId) {
  const req = readReq(reqId);
  const results = [];

  // 从验收标准提取验证命令
  const commands = extractVerificationCommands(req.acceptanceCriteria);

  for (const cmd of commands) {
    const result = await executeCommand(cmd);
    results.push({
      command: cmd,
      passed: result.exitCode === 0,
      output: result.stdout.slice(0, 500) // 截断
    });
  }

  // 生成报告
  const report = generateQAReport(reqId, results);
  writeReport(`requirements/reports/${reqId}-qa.md`, report);

  return {
    passed: results.every(r => r.passed),
    failedCount: results.filter(r => !r.passed).length
  };
}
```

#### 3.3 自动 Code Review

```
新建：scripts/auto-review.mjs
```

**逻辑**：
1. 读取 git diff --stat（改了什么文件）
2. 对照 REQ 范围检查
3. 运行基础检查（语法、导入、安全模式）
4. 生成 `requirements/reports/REQ-XXX-code-review.md`

```javascript
async function runAutoReview(reqId) {
  const req = readReq(reqId);
  const diff = await getGitDiff();

  const checks = [
    checkScopeCompliance(req.scope, diff.files),
    checkSyntax(diff.files),
    checkImports(diff.files),
    checkSecurityPatterns(diff.content)
  ];

  const results = await Promise.all(checks);

  return {
    scopeCompliance: results[0],
    syntaxOk: results[1],
    importIssues: results[2],
    securityWarnings: results[3],
    overallPassed: results.every(r => r.passed)
  };
}
```

#### 3.4 审查 Skill 定义

```
新建：skills/autonomous/self-review.md
```

```markdown
# 自审查 Skill

## 触发条件
- AI 完成 implementation 阶段
- 准备进入 review 阶段

## 执行流程

1. **范围检查**：确认改动文件在 REQ 范围内
2. **语法检查**：运行 lint + type-check
3. **测试检查**：运行相关测试
4. **安全检查**：扫描常见漏洞模式
5. **生成报告**：写入 requirements/reports/

## 输出格式

\`\`\`markdown
# REQ-XXX 自审查报告

## 范围合规性
- ✅ 改动文件均在 REQ 范围内

## 语法检查
- ✅ ESLint: 无错误
- ✅ TypeScript: 无类型错误

## 测试检查
- ✅ 相关测试全部通过

## 安全检查
- ⚠️ 发现 1 个潜在问题：...

## 建议
- [建议内容]
\`\`\`
```

### 验证方式

1. AI 实现代码后自动触发 review Agent
2. Review Agent 无法编辑文件（工具隔离验证）
3. 自动 QA 运行 lint + test，结果写入报告
4. 对照元反思检查清单验证

### 退出标准

- [ ] 技术可行性已验证（工具限制可实施）
- [ ] Review Agent 物理上无法编辑文件
- [ ] 自动 QA 能运行项目测试并生成报告
- [ ] 自动 Code Review 能检测基本安全问题
- [ ] 元反思检查清单已完成

### 预计新增/修改文件

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/review-gatekeeper.mjs | 新建 | ~120 |
| scripts/auto-qa.mjs | 新建 | ~150 |
| scripts/auto-review.mjs | 新建 | ~120 |
| skills/autonomous/self-review.md | 新建 | ~80 |
| .claude/settings.local.json | 修改 | +20 |

---

## Phase 4: 全自治（看门狗增强 + 不变量学习 + 上下文路由）

**目标**：AI 可以长时间（>1 小时）无人干预地运行，自动检测和修正错误。

**元架构覆盖**：
- Layer 1 认知边界：不变量学习
- Layer 3 执行可靠：看门狗增强
- Layer 4 持续优化：积累飞轮

### 为什么是最后一步

前三步构建了安全边界（防假完成、防越界、自审查）。第四步是让 AI 在这些边界内自由奔跑，同时通过看门狗确保它不会停滞，通过不变量学习确保它不重复犯错。

### 要构建的东西

#### 4.1 看门狗增强版

```
新建：scripts/watchdog.mjs
运行方式：CronCreate 或独立进程
```

**相比 Phase 1 基础版的增强**：

| 功能 | Phase 1 基础版 | Phase 4 增强版 |
|------|---------------|---------------|
| 停滞检测 | ✅ 30 分钟无更新 | ✅ + 智能分析停滞原因 |
| 循环检测 | ❌ | ✅ 同一 REQ 反复切换阶段 |
| 自动恢复 | ❌ | ✅ 注入恢复建议或创建子任务 |
| 告警升级 | ❌ | ✅ 严重停滞 → 通知人类 |

```javascript
// 伪代码
async function watchdog() {
  const progress = readProgress();
  const reqHistory = readReqHistory(progress.currentReq);

  // 停滞检测（继承 Phase 1）
  const stallStatus = detectStall(progress);

  // 循环检测（新增）
  const loopStatus = detectLoop(reqHistory);
  if (loopStatus.detected) {
    // 同一阶段反复切换超过 3 次
    return {
      action: 'create-subtask',
      message: `检测到循环：${loopStatus.description}`,
      suggestion: loopStatus.breakoutPlan
    };
  }

  // 自动恢复（新增）
  if (stallStatus.level === 'severe') {
    const recoveryPlan = await generateRecoveryPlan(progress);
    return {
      action: 'inject-recovery',
      recoveryPlan
    };
  }

  return { action: 'monitor', nextCheck: '5min' };
}
```

#### 4.2 不变量提取器

```
新建：scripts/invariant-extractor.mjs
```

**逻辑**：
1. 读取 `context/experience/` 中的经验文档
2. 提取重复出现的失败模式
3. 生成不变量规则（INV-XXX 格式）
4. **人工审核后**注入到相关 skill 的 prompt 中

**初始不变量**（从 harness-lab 已有经验中提取）：
```
INV-001: 模板占位符逃逸 — AI 填充最小内容通过验证
INV-002: 豁免文件遗忘 — 创建豁免后忘记删除
INV-003: 报告形式主义 — 报告存在但无实质内容
INV-004: 范围蠕变 — 实现范围超过 REQ 声明
```

**不变量格式**：
```markdown
# INV-001: 模板占位符逃逸

## 描述
AI 填充模板时只写最小内容，勉强通过验证，实际未解决问题。

## 检测方式
- 检查 REQ 是否仍包含模板占位符（如 `说明为什么要做这件事。`）
- 检查报告是否只有骨架无内容

## 预防措施
- Stop 评估器必须验证 REQ 内容完整性
- 报告必须包含具体数据或结论

## 来源
- REQ-2026-015 失败案例
- REQ-2026-022 失败案例
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

**路由表示例**：
```json
{
  "routes": [
    {
      "pattern": "scripts/*.mjs",
      "context": "context/tech/governance-scripts.md",
      "description": "Hook 脚本开发指南"
    },
    {
      "pattern": "requirements/**/*.md",
      "context": "context/req-writing-guide.md",
      "description": "REQ 写作规范"
    },
    {
      "pattern": ".claude/settings*.json",
      "context": "context/tech/hook-configuration.md",
      "description": "Hook 配置说明"
    }
  ]
}
```

#### 4.4 部署守卫

```
新建：scripts/deploy-guard.mjs
注册：settings.local.json → PreToolUse Bash 阶段
```

**逻辑**：
1. 拦截危险 Bash 命令（rm -rf、force push、drop table 等）
2. 拦截生产环境部署命令
3. autonomous 模式下硬阻断，supervised 模式下警告

**危险命令模式**：
```javascript
const DANGEROUS_PATTERNS = [
  /rm\s+-rf/,
  /git\s+push\s+--force/,
  /git\s+push\s+-f/,
  /drop\s+table/i,
  /truncate\s+table/i,
  /delete\s+from/i,
  /:\(\)\{\s*:\|\:&\s*\}\s*;/, // fork bomb
  />\s*\/dev\/sd/, // 直接写磁盘
  /curl.*\|\s*bash/, // 远程脚本执行
  /wget.*\|\s*bash/
];
```

#### 4.5 同类扫描

```
新建：scripts/similar-scan.mjs
```

**逻辑**：
当发现一个失败案例时，自动扫描全库是否存在同类问题。

```javascript
async function scanSimilarCases(failurePattern) {
  // 1. 提取失败模式特征
  const pattern = extractPattern(failurePattern);

  // 2. 扫描所有已完成的 REQ
  const completedReqs = glob.sync('requirements/completed/*.md');

  // 3. 检查是否存在同类问题
  const suspects = [];
  for (const reqPath of completedReqs) {
    const content = fs.readFileSync(reqPath, 'utf-8');
    if (matchesPattern(content, pattern)) {
      suspects.push({
        req: path.basename(reqPath),
        matchReason: explainMatch(content, pattern)
      });
    }
  }

  // 4. 生成报告
  return {
    pattern: pattern.description,
    suspectCount: suspects.length,
    suspects,
    recommendation: suspects.length > 0
      ? `发现 ${suspects.length} 个可能存在同类问题的 REQ，建议人工复核`
      : '未发现同类问题'
  };
}
```

### 验证方式

1. 启动 autonomous 模式，让 AI 完成 1 个 REQ 全程无人干预
2. 看门狗应检测停滞并注入提醒
3. 不变量提取器应从经验文档中识别重复模式
4. 同类扫描应在发现失败案例时触发

### 退出标准

- [ ] 看门狗能检测停滞、循环，并提供恢复建议
- [ ] 不变量从经验文档中自动提取（需人工审核）
- [ ] 上下文路由根据文件路径自动加载
- [ ] 部署守卫拦截危险命令
- [ ] 同类扫描能在发现失败案例时触发
- [ ] AI 能在 autonomous 模式下完成 1 个完整 REQ（无人干预 > 30 分钟）
- [ ] 元反思检查清单已完成

### 预计新增/修改文件

| 文件 | 操作 | 预计行数 |
|------|------|---------|
| scripts/watchdog.mjs | 新建 | ~150 |
| scripts/invariant-extractor.mjs | 新建 | ~150 |
| scripts/context-router.mjs | 新建 | ~100 |
| scripts/deploy-guard.mjs | 新建 | ~120 |
| scripts/similar-scan.mjs | 新建 | ~100 |
| .claude/context-routes.json | 新建 | ~40 |
| .claude/invariants/ | 新建目录 | - |
| .claude/settings.local.json | 修改 | +30 |

---

## 全局架构演进图

```
                    Phase 0          Phase 1           Phase 2           Phase 3           Phase 4
                 ──────────       ──────────        ──────────        ──────────        ──────────
Hook 覆盖：
  SessionStart   ✅ 状态恢复      ✅ +停滞检测      ✅                ✅                ✅
  PreToolUse     ✅ REQ 强制      ✅                ✅ +范围强制       ✅ +审查隔离      ✅ +部署守卫
  PostToolUse    ✅ 循环检测      ✅ +模式感知      ✅ +风险追踪       ✅                ✅ +上下文路由
  Stop           ❌               ✅ 完成度评估     ✅                ✅                ✅ 硬阻断
  SessionEnd     ❌               ✅ 自动反思       ✅                ✅                ✅
  PreCompact     ❌               ❌                ❌                ❌                ✅ 上下文保留

元架构覆盖：
  Layer 1 认知   -               ✅ 验收标准结构化   ✅ 范围约束       -                ✅ 不变量学习
  Layer 2 意图   -               ⚠️ 兜底策略        ✅ 三重防护       ✅ 审查隔离       -
  Layer 3 执行   -               ✅ 看门狗基础      ✅ 完整性检查     ✅ 自动 QA        ✅ 看门狗增强
  Layer 4 持续   -               -                ✅ 性能基准       -                ✅ 积累飞轮

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

## 元反思检查点模板

**每个 Phase 完成后必须填写**：

```markdown
## Phase X 元反思检查

### 1. 正确性
- **状态**：[✅/⚠️/❌]
- **证据**：[测试结果、lint 输出等]
- **问题**：[如有问题，描述详情]

### 2. 目标达成
- **状态**：[✅/⚠️/❌]
- **验收标准通过率**：[X/Y]
- **未通过项**：[列出未通过的验收标准]

### 3. 完整性
- **状态**：[✅/⚠️/❌]
- **边缘情况覆盖**：[是/否，具体说明]
- **遗漏项**：[如有遗漏，列出]

### 4. 一致性
- **状态**：[✅/⚠️/❌]
- **范围合规**：[是/否]
- **越界情况**：[如有越界，列出]

### 5. 安全性
- **状态**：[✅/⚠️/❌]
- **兜底策略**：[已实现/待实现]
- **风险项**：[列出识别到的风险]

### 6. 优化空间
- **状态**：[✅/⚠️/❌]
- **可优化项**：[列出]
- **技术债**：[如有，记录到 context/experience/]

---

**总体评估**：[通过/有条件通过/不通过]
**下一步**：[进入下一 Phase / 修复问题 / 重新设计]
```

---

## 优先级与节奏建议

| Phase | 预计 REQ 数 | 每个 REQ 预计文件改动 | 建议节奏 |
|-------|------------|---------------------|---------|
| Phase 1 | 2-3 个 REQ | 2-3 个文件/REQ | 完成后立即可用 |
| Phase 2 | 2-3 个 REQ | 2-3 个文件/REQ | Phase 1 验证稳定后开始 |
| Phase 3 | 3-4 个 REQ | 2-3 个文件/REQ | 需要真实项目验证 + 技术可行性验证 |
| Phase 4 | 4-5 个 REQ | 2-3 个文件/REQ | 前三个 Phase 稳定运行后 |

**关键原则**：
- 每个 Phase 完成后必须在真实项目上跑 1-2 个 REQ 验证
- 不要跳 Phase，每个 Phase 都是下一个的前置依赖
- Phase 1-2 可以在当前 harness-lab 仓库自举（用 harness-lab 开发 harness-lab）
- Phase 3-4 建议在真实业务项目上验证
- **每个 Phase 必须完成元反思检查清单**

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 | 相关 Layer |
|------|------|---------|-----------|
| Hook 执行超时影响编辑体验 | 每次 Write/Edit 额外等待 | 所有 hook 设 5-10s 超时，fail-open | Layer 2 |
| 范围声明维护成本高 | 每个 REQ 需要精确列出文件 | 可用 glob 模式简化，如 `src/auth/**` | Layer 1 |
| 审查隔离不够彻底 | AI 可能通过其他方式"作弊" | Schema 级工具限制，不只靠 prompt | Layer 2 |
| 不变量提取质量低 | 生成无用的限制 | 需要人工审核不变量，不自动注入 | Layer 4 |
| 自治模式下 AI 陷入死循环 | 持续操作但无进展 | 看门狗检测 + 自动创建阻塞说明 | Layer 3 |
| 验收标准结构化成本高 | 每条都需要可执行命令 | 提供模板 + 渐进式迁移 | Layer 1 |
| Hook 串联过多导致延迟 | 影响编辑体验 | 合并为统一网关 + 性能基准测试 | Layer 4 |

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1 | 2026-04-10 | 初始版本 |
| v2 | 2026-04-10 | 基于元架构审视修订：补充元反思检查点、看门狗提前、兜底策略、验收标准结构化、三重防护、Hook 性能基准 |

---

## 附录：验收标准结构化指南

### 为什么需要结构化

自然语言的验收标准难以被 AI 自检。例如：

```
❌ "用户登录后跳转到首页"
```

这句话 AI 无法判断是否完成——需要运行测试、检查代码、或人工确认。

结构化的验收标准必须是**可机械验证**的：

```
✅ "测试 `test_login_redirect` 通过"
✅ "登录后跳转路径 = `/dashboard`（硬编码检查）"
```

### 结构化格式

```markdown
## 验收标准

### 功能验证
- [ ] 测试 `<测试名>` 通过
- [ ] 命令 `<命令>` 执行成功
- [ ] 无 `<错误类型>` 错误

### 行为验证
- [ ] `<变量/配置>` = `<期望值>`
- [ ] 文件 `<路径>` 包含 `<内容>`

### 文档验证
- [ ] `<文档路径>` 包含 `<章节名>` 章节
```

### 示例

```markdown
## 验收标准

### 功能验证
- [ ] 测试 `test_login_redirect` 通过
- [ ] 测试 `test_session_persistence` 通过
- [ ] 命令 `npm run lint` 无错误
- [ ] 命令 `tsc --noEmit` 无错误

### 行为验证
- [ ] `src/auth/config.ts` 中 `SESSION_EXPIRY = 604800`（7 天）
- [ ] `src/auth/login.ts` 中 `redirectPath = '/dashboard'`

### 文档验证
- [ ] `docs/auth.md` 包含 "Session Management" 章节
```

### 不允许的格式

```markdown
❌ 提升用户体验
❌ 优化性能
❌ 代码更清晰
❌ 修复已知问题
❌ 改善错误处理
```

这些描述无法被机械验证，必须改写为具体条件。
