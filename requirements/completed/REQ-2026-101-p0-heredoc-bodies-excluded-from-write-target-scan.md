# REQ-2026-101: P0 heredoc 正文不参与写目标解析

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

2026-09-23 提交 REQ-2026-100 时，一条正常的 `git commit -F - <<'MSG' … MSG` 被 `req-check.js` 阻断（exit 2，输出还是误导性的 "No active REQ found"），原因是**提交信息正文里出现了 `<reqId>-*`**。实测诊断（README 命令的形式）：

```json
{ "writes": true, "unresolved": true, "targets": [{ "raw": "-*" }], "operations": ["redirect"] }
```

机制：`scripts/write-target-policy.mjs` 的 `tokenizeShell` 把**整条命令字符串**（含 heredoc 正文）当作命令流分词。正文里的 `<` 是输入重定向（无害），但紧随其后的 `>` 被当成**写重定向**，目标 `-*` 因含 glob 无法解析 → `writes: true` + `unresolved: true` → 无活跃 REQ 时 `req-check` 直接阻断。

这是同一天里第三个"门禁把自己人挡住"的实例（前两个：豁免文件写不进去、CANNOT 段里的路径变 deny）。前两个已由 REQ-2026-100 修；本 REQ 修这一个。

heredoc 正文是**数据**而不是命令文本。对它做写目标扫描既产生假阳性（本次），也不构成真实防线：`bash <<EOF` 这类"把正文喂给解释器"的写法，与已声明的"`perl -e` / `python -c` 等解释器写理论不可封"属于同一类边界（`AGENTS.md` 已记录该不可强制边界）。

## 目标

- heredoc 正文不参与分词与写目标判定：`git commit -F - <<'MSG' … MSG` 这类命令不再因正文内容被阻断。
- 不误伤真写入：heredoc 头部之外的 `>` / `>>` / `tee` / `cp` 等既有识别能力保持不变。
- 把该边界写进 `AGENTS.md` 与 README 的已知限制，说明 heredoc 正文属"不扫描"范围及其理由。

## 非目标

- 不做完整 shell 语义解析（不引入 heredoc 变量展开、嵌套 heredoc 求值）。
- 不改变"解释器写不可封"的既有结论：`bash <<EOF`、`sh -c '…'`、`node -e` 等仍属已声明边界。
- 不改 `scope-guard.mjs` / `req-check.js` 的判定流程，只改共享的 tokenizer 与文档。
- 不新增 CLI 参数或配置开关。

## 颗粒度自检

- [x] 目标数 ≤ 4？（3 个目标）
- [x] 涉及文件数 ≤ 4？（4 个：`scripts/write-target-policy.mjs`、`tests/governance.test.mjs`、`AGENTS.md`、`README.md`——README 由 `docs-sync` 的 `governance-automation` 规则强制，且其"已知限制"段本就描述不可强制边界）
- [x] 涉及模块/目录 ≤ 4？（共享写目标策略、门禁契约测试、治理文档与公开说明）
- [x] 能否用一句话描述"解决了什么问题"？（让 heredoc 正文不再是写目标判定的输入，消除提交信息/脚本正文导致的假阻断）
- [x] 如果失败，能否干净回滚？（改动集中在 tokenizer 的一个前置步骤与文档，`git revert` 即可）

## 范围

- 涉及文件：
  - `scripts/write-target-policy.mjs`
  - `tests/governance.test.mjs`
  - `AGENTS.md`
  - `README.md`
  - （REQ 自身、`requirements/reports/REQ-2026-101-*`、`context/experience/REQ-2026-101-*` 不在此声明，由 REQ-2026-100 的"约定交付物自动 allow"覆盖）
- 涉及目录 / 模块：PreToolUse 写目标分类、门禁契约测试、治理文档
- 影响接口 / 页面 / 脚本：`classifyBashWrites()` 的输入预处理；`tokenizeShell()` 的分词结果变化（heredoc 正文不再产生 token）

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（判据是一条可复现的实测命令 + 既有测试骨架，设计即"关键决策"段）
- [ ] skip-experience

**允许（CAN）**：
- 可修改的文件 / 模块：`write-target-policy.mjs` 的 heredoc 预处理与 `tokenizeShell`；`tests/governance.test.mjs` 新增用例；`AGENTS.md` / README 的边界说明段
- 可新增的测试 / 脚本：本 REQ 新增测试用例（不加新测试文件）

**禁止（CANNOT）**：
- 不得放宽既有写目标识别：`>`、`>>`、`tee`、`cp`/`mv`/`ln`、`sed -i`、`rm`/`touch`/`mkdir` 的识别与 unresolved fail-closed 行为必须保持
- 不得改动 `scope-guard.mjs` 的豁免/交付物判定（REQ-2026-100 刚落地）、`req-check.js` 的 REQ 门禁流程、capability manifest 与 `package.json`

**边界条件**：
- 证据规格：修复前必须有可复现的 `classifyBashWrites` 输出（`writes:true / targets:['-*']`），修复后为 `writes:false`
- 未闭合 heredoc（无终止符）按"吞到末尾"处理，不得抛错（当前 tokenizer 遇到异常输入置 `unresolved`，本 REQ 保持不崩）

## 验收标准

- [x] `git commit -F - <<'MSG'` + 正文含 `<reqId>-*` + `MSG` → `classifyBashWrites` 返回 `writes: false`（当前：`writes: true`，targets `['-*']`）
- [x] 不误伤真写入：`cat > out.txt <<'EOF' … EOF` 仍识别 target `out.txt`；`echo x > a.txt <<'EOF' … EOF` 同理
- [x] heredoc 正文里的 `>` / `>>` / `rm -rf` 等不产生 target，也不置 `unresolved`
- [x] 边界稳健：引号包裹的定界符（`<<'EOF'` / `<<"EOF"`）、`<<-EOF`（tab 缩进）、未闭合 heredoc 均不抛错；`<<<`（here-string）不被误当 heredoc
- [x] 既有 policy 断言全部保持通过（`write-target policy classifies all supported targets` 等 24+ 项不降强度）
- [x] `AGENTS.md` 与 README 写明：heredoc 正文不参与写目标解析；`bash <<EOF` 等"正文喂解释器"写法与既有的"解释器写不可封"同属 best-effort 边界
- [x] 四道门禁全绿（`npm test`、`docs:verify`、`check:governance`、`harness:doctor`），`req:audit` 保持基线内无 delta

## 设计与实现链接
- 设计稿：不另建；设计内容即"关键决策"段
- 相关规范：`AGENTS.md` 的"不可强制边界"；同日第三个同族缺陷见 REQ-2026-100 的 QA 报告（不在此重复链接路径）

## 报告链接
- Code Review：`requirements/reports/REQ-2026-101-code-review.md`
- QA：`requirements/reports/REQ-2026-101-qa.md`
- Ship：`requirements/reports/REQ-2026-101-ship.md`

## 验证计划
- 计划执行的命令：
  - `node -e "… classifyBashWrites(heredoc 命令) …"`（修复前后各跑一次，留输出）
  - `node tests/governance.test.mjs`（新增 heredoc 用例：正文含 `>`/`<` 不产生 target、头部 `>` 仍识别、多形态定界符、未闭合）
  - `npm test`、`npm run docs:verify`、`npm run check:governance`、`npm run harness:doctor`、`npm run req:audit`
  - 端到端：用含 `<reqId>-*` 的 `git commit -F -` 复现一次（修复前阻断、修复后放行）
- 需要的环境：macOS + Node ≥20
- 需要的人工验证：确认既有写目标识别用例（`tee` / `cp` / `sed -i` / 复合重定向）未被削弱

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：3 个目标全部达成——heredoc 正文剥离（分类器与 hook 双层证据）、真写入识别不变、边界写入 `AGENTS.md` 与 README。
- [x] 旧功能保护：governance 72 项（71 既有全通过，含 24+ 条写目标断言）· status 12 · audit 11 · event-store 25；`req:audit` 基线 125 无 delta。
- [x] 逻辑正确性：剥离按行进行、多定界符按序消费、未闭合吞到末尾、`<<<` 显式排除；`tokenizeShell` 下游逻辑未改，改动集中在入口一行调用。已知边界：同行多个 heredoc 未单独立用例；跨行/续行拼接头不在支持范围（tokenizer 本就不求值）。
- [x] 完整性：7 项验收全部完成；无半成品；取舍（`bash <<EOF` 不扫描）已文档化而非留白。
- [x] 可维护性：两个内部函数职责单一（找定界符 / 剥离正文），注释写明"正文是数据不是命令文本"的理由与 REQ 编号；文档两处同步避免规则只存在于代码。

#### 对齐检查（record 阶段）
- [x] 目标对齐：消除的是"门禁把自己人挡住"的第三例，与前两例同族（把非命令文本当命令解析），直接提升日常提交的可用性。
- [x] 设计对齐：无独立设计稿（已声明豁免）；实现与 3 条关键决策一致，未触碰 `scope-guard` / `req-check` 判定流程。
- [x] 验收标准对齐：逐条有实现与证据；"不降强度"一条由既有 policy 用例全通过 + `req:audit` 无 delta 共同保证。

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务

- 无

## 风险与回滚
- 风险：heredoc 正文不再扫描，是否会漏掉真实写入？——`sh/bash <<EOF` 这类正文喂解释器的写法本就是已声明的不可封边界（与 `perl -e` 同类）；把正文当命令扫描只是"顺带命中"，且代价是假阻断正常提交。取舍已在文档写明
- 风险：定界符解析出错会吞掉后续命令——缓解：只吞到匹配的终止行；未闭合时吞到末尾（与 bash 行为一致：bash 也会把剩余内容当正文），并有未闭合用例
- 回滚方式：`git revert` 本 REQ 提交；无数据迁移、无外部副作用

## 关键决策
- 2026-09-23：**在共享 tokenizer 里剥离 heredoc 正文**，而不是在 `req-check` / `scope-guard` 各自加特例。理由：两者共用 `write-target-policy.mjs`，改一处两个门禁同时受益；且"heredoc 正文不是命令语法的一部分"属分词语义问题。
- 2026-09-23：**不追求"正文喂解释器"的覆盖**。把它记为与 `perl -e` / `python -c` 同类的已声明边界，写进文档，而不是试图扫描正文再引入新的假阳性。
- 2026-09-23：**保持 unresolved 的 fail-closed 语义**。本次问题不是 fail-closed 太严，而是"正文被误当成命令"这一输入错误；修正输入后 fail-closed 行为原样保留。

<!-- Source file: REQ-2026-101-p0-heredoc-bodies-excluded-from-write-target-scan.md -->
