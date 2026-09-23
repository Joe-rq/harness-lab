# 2026-09-23 P0 heredoc 正文不参与写目标解析

## 场景（来自 REQ 背景）

2026-09-23 提交 REQ-2026-100 时，一条正常的 `git commit -F - <<'MSG' … MSG` 被 `req-check.js` 阻断（exit 2，输出还是误导性的 "No active REQ found"），原因是**提交信息正文里出现了 `<reqId>-*`**。实测诊断（README 命令的形式）：

```json
{ "writes": true, "unresolved": true, "targets": [{ "raw": "-*" }], "operations": ["redirect"] }
```

机制：`scripts/write-target-policy.mjs` 的 `tokenizeShell` 把**整条命令字符串**（含 heredoc 正文）当作命令流分词。正文里的 `<` 是输入重定向（无害），但紧随其后的 `>` 被当成**写重定向**，目标 `-*` 因含 glob 无法解析 → `writes: true` + `unresolved: true` → 无活跃 REQ 时 `req-check` 直接阻断。

这是同一天里第三个"门禁把自己人挡住"的实例（前两个：豁免文件写不进去、CANNOT 段里的路径变 deny）。前两个已由 REQ-2026-100 修；本 REQ 修这一个。

heredoc 正文是**数据**而不是命令文本。对它做写目标扫描既产生假阳性（本次），也不构成真实防线：`bash <<EOF` 这类"把正文喂给解释器"的写法，与已声明的"`perl -e` / `python -c` 等解释器写理论不可封"属于同一类边界（`AGENTS.md` 已记录该不可强制边界）。

## 实施时间线（来自事件账本）

- 2026-09-23T13:36:17.085Z req_created (design)
- 2026-09-23T13:36:39.617Z req_started (implementation)

## 关联提交（来自 git log --grep）

(无关联提交)

## 验证结论（来自报告）

- REQ-2026-101-code-review.md: ✅ Approved（同谱系自审，独立性有限）
- REQ-2026-101-qa.md: ✅ Pass
- REQ-2026-101-ship.md: (无明确状态标记)

## 关键决策（来自 REQ）

- 2026-09-23：**在共享 tokenizer 里剥离 heredoc 正文**，而不是在 `req-check` / `scope-guard` 各自加特例。理由：两者共用 `write-target-policy.mjs`，改一处两个门禁同时受益；且"heredoc 正文不是命令语法的一部分"属分词语义问题。
- 2026-09-23：**不追求"正文喂解释器"的覆盖**。把它记为与 `perl -e` / `python -c` 同类的已声明边界，写进文档，而不是试图扫描正文再引入新的假阳性。
- 2026-09-23：**保持 unresolved 的 fail-closed 语义**。本次问题不是 fail-closed 太严，而是"正文被误当成命令"这一输入错误；修正输入后 fail-closed 行为原样保留。

<!-- Source file: REQ-2026-101-p0-heredoc-bodies-excluded-from-write-target-scan.md -->

## 沉淀要点（人工确认）

### 可复用模式

1. **区分"命令文本"与"命令携带的数据"**。三个同族门禁缺陷（豁免文件不可写、CANNOT 路径变 deny、heredoc 正文被当命令）根因相同：**把非命令文本当命令解析**。可复用检查法：任何命令解析器都要先回答"这段字符串里哪部分是数据"，heredoc 正文、引号字符串、注释、提交信息正文都属于数据。
2. **假阳性比漏报更伤**：一次误拦提交，用户学会的是"绕开这个门禁"，而不是"更规范地写命令"。门禁的可信度来自"拦得准"，不是"拦得多"。
3. **修输入错误，不改 fail-closed 语义**。本次问题不是"太严"，而是"输入错了"——所以只修分词前的输入，`unresolved` 的 fail-closed 行为原样保留。反过来若为绕过假阳性而放宽 fail-closed，会同时降低真实防护。
4. **先取证再修**：修复前把 `classifyBashWrites` 的输出（`writes:true / targets:['-*']`）与 hook 的 exit 2 都留下来，修复后同一命令 exit 0——两个方向都是可复现的命令，不是描述。
5. **活体回归**：修复后刻意在提交信息里再次写入 `<reqId>-*`，让"提交动作本身"成为端到端证据。

### 踩坑

1. **heredoc 是 shell 里最容易被误解析的构造**：`<<`（heredoc）、`<<<`（here-string）、`<<-`（tab 缩进）、引号包裹的定界符、未闭合吞到末尾——五种形态都要覆盖，否则修完一种漏另一种。
2. **`bash <<EOF` 与 `perl -e` 同类**：正文喂解释器属已声明的不可封边界。剥离正文时必须同步把这条取舍写进文档，否则后人会以为"扫描正文"是漏掉的能力而不是刻意的设计。
3. **不要在有活跃 REQ 时用 `<`/`>` 之外还夹带路径的提交信息做回归**：这条坑本身也是本 REQ 的由来——当时的"修复手段"（改写提交信息）应当被记录，否则下一个人会踩同一脚。

## 关联材料

- REQ: `requirements/completed/REQ-2026-101.md`
- Design: `docs/plans/REQ-2026-101-design.md`（如有）
- Code Review: `requirements/reports/REQ-2026-101-code-review.md`
- QA: `requirements/reports/REQ-2026-101-qa.md`
