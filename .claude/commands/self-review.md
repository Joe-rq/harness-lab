# /self-review — 自动审查当前 REQ

对当前活跃 REQ 执行自动化 QA 和 Code Review，生成报告到 requirements/reports/。

## 执行步骤

1. 读取 `.claude/progress.txt` 获取当前活跃 REQ 编号
2. 运行 `node scripts/auto-qa.mjs --req $REQ_ID`
3. 运行 `node scripts/auto-review.mjs --req $REQ_ID`
4. 读取生成的两份报告，向用户呈现摘要
5. 如有安全发现或范围违规，高亮提醒

## 参数

无。自动从 progress.txt 读取当前 REQ。

## 输出

- `requirements/reports/REQ-XXXX-XXX-qa.md`
- `requirements/reports/REQ-XXXX-XXX-code-review.md`
