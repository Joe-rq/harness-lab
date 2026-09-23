# REQ-2026-100: P0 门禁自举——豁免文件免检与 REQ 交付物自动 allow

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

2026-09-23 实施 REQ-2026-098 时，`scope-guard` 连续两次把用户自己堵死，两次都只能靠人工在会话外 `touch` 解扣：

1. **豁免文件写不进去（自举死锁）**。`scripts/scope-guard.mjs:352` 用 `isExempt(rootDir)`（检查 `.claude/.req-exempt` 是否存在）作为唯一豁免开关；但**创建该文件本身要过同一条 scope 检查**。当活跃 REQ 声明的范围不含 `.claude/` 时——这是常态，因为范围通常只列源码与文档——`touch .claude/.req-exempt` 会被拦，于是"豁免"这条官方出路不可达。实测：REQ-2026-098 与 REQ-2026-099 的 `req:create` 会自动生成豁免文件，所以创建期没问题；一旦 `req:start` 删掉它，**范围改不动、豁免也建不了**，REQ 进入死锁。
2. **REQ 改不动自己的范围**。同一 REQ 想把 `README.md` 加进范围（`docs-sync` 门禁强制要求），但 REQ 文件自身不在范围里 → 改 REQ 的写入被拦 → 无法通过正规途径扩范围。
3. **约定交付物全靠手写声明**。REQ 自身、`requirements/reports/REQ-xxx-*.md`、`context/experience/REQ-xxx-*.md` 是**每个 REQ 都必然要写**的产物，但当前必须逐个列进范围，漏一个就在收尾阶段卡住。
4. **范围段里的反引号路径一律被解析为作用域声明**，包括出现在否定/说明语句里的：REQ-2026-099 在 CANNOT 段写"测试只允许改 `tests/governance.test.mjs`…"，该路径立刻变成 **deny**；反过来，REQ-2026-098 在豁免项里顺手提到 `docs/plans/REQ-2026-098-design.md`，它被解析成 **allow**（纯属意外）。同一机制两个方向都咬人。

第 1、2 条是**功能缺失**（人闸不可自举），本 REQ 修；第 3 条是同类缺失（约定交付物不该靠人记得声明），一并修；第 4 条不改语义，只在 `AGENTS.md` 写清规则并给出正确写法。

## 目标

- 让豁免文件写入免于 scope 检查：`.claude/.req-exempt` 与 worktree-local 同义路径永远可写。
- 让活跃 REQ 的约定交付物自动进入 allow：REQ 自身、`requirements/reports/<reqId>-*`、`context/experience/<reqId>-*`、`docs/plans/<reqId>-*`。
- 把"范围段里的反引号路径会被解析为作用域声明"写进 `AGENTS.md`，并给出"目录级禁止 + 单文件例外"的正确写法。

## 非目标

- 不翻转 allow/deny 优先级：`## 范围` 的 CANNOT 与 allow 冲突时仍以 deny 为准（语义不变，只补文档）。
- 不放宽只读边界 REQ 的语义：`buildEffectivePatterns` 的 readOnly 分支保持"只允许 reports + 尊重 deny"。
- 不改 `write-target-policy.mjs` 的 canonical path 判定，不改 `req-check.js` 的治理目录白名单。
- 不引入"按目录豁免""正则豁免"等新语法。

## 颗粒度自检

- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（4 个：`scripts/scope-guard.mjs`、`tests/governance.test.mjs`、`AGENTS.md`、`README.md`。README 由 `docs-sync` 的 `governance-automation` 规则强制——改 `tests/` 必须同步 README/CONTRIBUTING，且 README:105/:320 本就描述豁免机制）
- [x] 涉及模块/目录 ≤ 4？（门禁脚本、门禁契约测试、治理文档）
- [x] 能否用一句话描述"解决了什么问题"？（让人闸在它自己规定的流程里可用：豁免可创建、范围可修订、交付物不被误拦）
- [x] 如果失败，能否干净回滚？（改动集中在 scope-guard 的两个判定点与测试，`git revert` 即可；无数据迁移）

## 范围

- 涉及文件：
  - `scripts/scope-guard.mjs`
  - `tests/governance.test.mjs`
  - `AGENTS.md`
  - `README.md`（`docs-sync` 的 `governance-automation` 规则要求改 tests 时同步 README；README:105 与 :320 本就描述豁免机制，属真实需要更新的段落）
- 说明：REQ 自身、`requirements/reports/REQ-2026-100-*`、`context/experience/REQ-2026-100-*` **刻意不在此声明**——它们由本 REQ 新增的"约定交付物自动 allow"覆盖，是 dogfood 验证的一部分（见 QA 报告"实测"行）
- 涉及目录 / 模块：PreToolUse 写入门禁、门禁契约测试、治理契约文档
- 影响接口 / 页面 / 脚本：`scope-guard.mjs` 的 allow 集合构造与 target 过滤；对已有 REQ 的判定结果只增不减（原先被拦的豁免/交付物写入转为放行，其余不变）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（判据是三条已知死锁 + 既有测试骨架，设计内容即"关键决策"段）
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：`scope-guard.mjs` 的豁免判定与 allow 集合构造；`tests/governance.test.mjs` 新增用例；`AGENTS.md` 的规则说明段
- 可新增的测试 / 脚本：本 REQ 新增测试用例（不加新测试文件）

**禁止（CANNOT）**：
- 不得放宽范围判定：`## 范围` 之外的源码/文档目标仍必须被拦；不得改动 readOnly 分支语义
- 不得修改 `write-target-policy` 的 canonicalization、`req-check` 的白名单、capability manifest 与 `package.json`

**边界条件**：
- 判据来源：三条死锁均为本次实施中的实测（REQ-2026-098 两次 `[ScopeGuard]` 拦截记录、REQ-2026-099 的 CANNOT 反噬）
- 证据规格：新增测试必须先复现当前行为（放行=空输出、拦截=带 decision 的 JSON），再在新实现下通过

## 验收标准

- [x] 活跃 REQ 范围不含 `.claude/` 时，`touch .claude/.req-exempt` 必须放行（当前：block）
- [x] worktree-local 豁免路径（`.claude/worktrees/<id>/.req-exempt`）同样免检
- [x] 活跃 REQ 的约定交付物自动 allow：`requirements/in-progress/<reqId>-*.md`、`requirements/reports/<reqId>-*.md`、`context/experience/<reqId>-*.md`、`docs/plans/<reqId>-*.md`（当前：全部 block）
- [x] **不放宽**：范围外的 `scripts/**` 目标仍必须 block；只读边界 REQ 仍只允许 `requirements/reports/**` 且尊重其 deny（既有测试保持通过）
- [x] `AGENTS.md` 写明：`## 范围` 段内（含 CANNOT 与豁免项说明）的反引号路径会被解析为作用域声明；"目录级禁止 + 单文件例外"应改用 CAN 段显式列举，不要写进 CANNOT
- [x] 四道门禁全绿（`npm test`、`docs:verify`、`check:governance`、`harness:doctor`），`req:audit` 保持基线内无 delta

## 设计与实现链接
- 设计稿：不另建；设计内容即本 REQ"关键决策"段
- 相关规范：`AGENTS.md`（PreToolUse 章节）、`requirements/observations/2026-09-23-invariant-auto-deprecate-side-effect.md` 里的同类"隐式副作用"教训

## 报告链接
- Code Review：`requirements/reports/REQ-2026-100-code-review.md`
- QA：`requirements/reports/REQ-2026-100-qa.md`
- Ship：`requirements/reports/REQ-2026-100-ship.md`

## 验证计划
- 计划执行的命令：
  - `node tests/governance.test.mjs`（新增 4 条用例：豁免放行、worktree 豁免放行、交付物放行、范围外仍拦截）
  - `npm test`、`npm run docs:verify`、`npm run check:governance`、`npm run harness:doctor`、`npm run req:audit`
  - 人工复现：在一个临时 fixture 里对旧实现跑新增用例，确认它们先失败（复现死锁）
- 需要的环境：macOS + Node ≥20；测试用临时目录 fixture，不写真实仓库
- 需要的人工验证：核对新增用例的"拦截"断言没有被误放宽（范围外目标仍 block）

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：3 个目标全部达成——豁免文件免检（含 worktree-local 与 rm）、四类约定交付物自动 allow、解析规则进 `AGENTS.md`；真实仓库实测与 fixture 用例两条路径都有证据。
- [x] 旧功能保护：governance 71 项（69 既有全通过）· status 12 · audit 11 · event-store 25；只读边界与 legacy 无范围 REQ 的行为未变；`req:audit` 基线 125 无 delta。
- [x] 逻辑正确性：免检判定放在"已解析且在仓内"之后，未解析/仓外目标仍 fail closed；自动 allow 只按 `reqId` 前缀匹配，写其他 REQ 的交付物仍被拦（用例断言）。已知边界：`matchGlob` 不处理 `?` 的 glob 语义（既有行为，未动）。
- [x] 完整性：6 项验收全部完成；无半成品；未做项（allow/deny 优先级、`?` 语义）已显式记录为 Residual。
- [x] 可维护性：新增两个小函数各司一职（`isExemptionFileTarget` 与 `conventionalDeliverablePatterns`），判定点集中在 target 循环与 pattern 注入两处；规则同时写进 `AGENTS.md` 与 README，避免只存在于代码里。

#### 对齐检查（record 阶段）
- [x] 目标对齐：修的是"人闸在它自己规定的流程里不可用"，直接服务于后续所有 REQ 的可执行性。
- [x] 设计对齐：无独立设计稿（已声明豁免）；实现与 4 条关键决策一致，其中"README 纳入范围"为实施中因 docs-sync 门禁产生，已记入范围与颗粒度自检。
- [x] 验收标准对齐：逐条有实现与证据；"不放宽"一条同时由新用例（范围外源码/其他 REQ/其他 .claude 文件）与既有只读用例共同保证。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务

- 无

## 风险与回滚
- 风险：豁免文件"永远可写"会不会被滥用？——它是**人闸载体**：`AGENTS.md` 已规定"完成后立即删除"，且有审计记录（`.claude/scope-violations.log` 之外，`req:create`/`req:start` 的生命周期本身也留痕）。真正需要防的是 AI 静默改源码，而不是创建一个人自己规定的开关文件
- 风险：交付物自动 allow 是否等于给 REQ 开了后门？——范围限于**以 reqId 命名**的四个位置；写其他 REQ 的文件、写源码都不受影响
- 回滚方式：`git revert` 本 REQ 提交；无数据迁移、无外部副作用

## 关键决策
- 2026-09-23：**豁免文件写入绕过 scope 检查，而不是给 `## 范围` 加默认 allow**。理由：前者是"人闸必须可自举"的最小修复，与 REQ 范围内容无关；后者会让每个 REQ 隐式多出一片可写区域，语义更糊。
- 2026-09-23：**交付物 allow 只按 `reqId` 前缀匹配，且只在非只读分支注入**。理由：一次修死锁，一次修"漏声明"；只读边界 REQ 的语义（只写 reports）保持不变，避免放宽。
- 2026-09-23：**不改 allow/deny 优先级**。`## 范围` 内 CANNOT 与 allow 冲突时维持 deny 胜——改优先级会让"禁止"失效，风险大于收益；改为在 `AGENTS.md` 写清解析规则并提供正确写法。
- 2026-09-23：**编号说明**——REQ-2026-098 的关键决策曾把门禁升级预留为 REQ-2026-099，后被承诺收敛占用；本 REQ 由计数器分配为 100。投影 ↔ INDEX 一致性门禁仍待开。

<!-- Source file: REQ-2026-100-p0-scope-guard-bootstrap-and-deliverables-allowance.md -->
