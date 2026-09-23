# Code Review: REQ-2026-102

> 本文件在 REQ 的 `## 范围` 未声明路径下写入成功（REQ-2026-100 的交付物自动 allow）。

## 状态

- ✅ Approved（同谱系自审）

## Inputs

- REQ：`requirements/in-progress/REQ-2026-102-p0-required-section-fail-closed.md`
- DESIGN：无独立设计稿（判据为 README/AGENTS 既有承诺 + 路线报告 D2）
- Reviewed：`scripts/req-validation.mjs`（必需章节三类判定、占位符行首匹配、`getSection` 修正、导出 `formatReqIssue`）、`scripts/req-check.js`（消费共享校验器、阻断消息改渲染共享问题列表）、`tests/governance.test.mjs`（2 条新用例）、README 生命周期段

## Findings

### High / Medium

- 无未关闭问题。
- 已关闭：**D2 fail-open**。`getSection()` 在标题缺失时返回空串，占位符检查因此恒空转 → 缺 `## 背景`/`## 目标`/`## 验收标准` 的 REQ 一路绿灯。现按"缺失 / 空内容 / 占位符"三类 fail-closed，并区分"标题不存在"与"标题在但内容为空"（`hasHeading` 独立判定）。
- 已关闭：**判定与渲染各有多份实现**。`req-check.js` 自带占位符正则表（`- 目标 1` 等），阻断消息里还有第三份；现统一消费 `findReqTemplateIssues()` 与 `formatReqIssue()`。
- 已关闭：**占位符子串匹配导致误报**。正文里引用占位符（如反引号包裹、句中提及）会被判为"未替换"——本 REQ 起草时三次被迫改写措辞才能让 PreToolUse 放行（假阳性挡住了修它的 REQ）。现改为"行首（去掉列表标记与复选框后）以占位符开头"才算未填。
- 已关闭：**`getSection()` 空行贪婪**。`\n+` 吃掉标题后的空行，使空章节把下一个标题吞进正文（`## 背景` 紧邻 `## 目标` 时背景正文被判为 `## 目标\n…`），空章节漏判。现标题后只吃一个换行。

### Residual

1. 同谱系自审。
2. `validateDesignDocument` 的设计文档占位符表仍是独立实现（设计文档结构不同，未纳入本 REQ）；已知且记录。
3. 判定收紧后，"想快速起草"的路径依赖既有流程（先填三节再 `req:start`）；`skip-req-validation` 豁免机制未改动。
4. `req-validation.mjs` 仍有一处未使用导入（`formatErrorBlock`）——既有状况，未在本 REQ 内清理（不属本次改动产生的孤儿）。
5. 历史 REQ 不受影响：新判定只作用于启动与写入路径，`req:audit` 基线 125 无 delta。

## Conclusion

- Approved。承诺兑现（缺章节不能启动）、判定单点化（三处门禁共享一份）、误报消除，且两个方向都有可复现证据。
