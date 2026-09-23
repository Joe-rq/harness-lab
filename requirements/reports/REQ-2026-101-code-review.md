# Code Review: REQ-2026-101

## 状态

- ✅ Approved（同谱系自审，独立性有限）

## Inputs

- REQ：`requirements/in-progress/REQ-2026-101-p0-heredoc-bodies-excluded-from-write-target-scan.md`
- DESIGN：无独立设计稿（`skip-design-validation`，设计即"关键决策"段）
- Reviewed：`scripts/write-target-policy.mjs`（新增 `findHeredocDelimiters` / `stripHeredocBodies`，`tokenizeShell` 前置剥离）、`tests/governance.test.mjs`（1 条新用例，含 12 项断言）、`AGENTS.md` 与 README 的边界说明

## Findings

### High / Medium

- 无未关闭问题。
- 已关闭：**heredoc 正文被当作命令文本分词**。`git commit -F - <<'MSG' … <reqId>-* … MSG` 修复前被判为 `writes:true / unresolved:true / targets:['-*']`，无活跃 REQ 时 `req-check` 阻断（exit 2）。现在正文整段剥离，同一条命令 `tokenizeShell` 只看到 `git commit -F - MSG`。
- 已关闭：真写入未被误伤——`cat > out.txt <<'EOF'`（头部重定向）与 `echo x > real.txt <<'EOF'`（同行重定向）仍识别目标；终止行之后的命令照旧解析。
- 已关闭：边界形态——引号定界符（`<<'EOF'` / `<<"EOF"`）、tab 缩进（`<<-EOF`，终止行前导 tab 被剥离后比较）、未闭合 heredoc（吞到末尾、不抛错）均有断言；`<<<` here-string 被显式排除，不吞后续行。

### Residual

1. 同谱系自审。
2. **`bash <<EOF` 的正文执行不再被扫描**：与已声明的"`perl -e` / `python -c` 等解释器写不可封"同类，已在 `AGENTS.md` 与 README「已知限制」写明取舍。这不是新增缺口，而是把原先"顺带命中"的假阳性换成显式边界。
3. 同一行出现多个 heredoc（`cat <<A <<B`）时按出现顺序依次消费正文——已实现但未单独立用例覆盖；属罕见形态。
4. `stripHeredocBodies` 按行切分：若定界符跨行（bash 不允许）或使用 `\` 续行拼接 heredoc 头部，不在支持范围（tokenizer 本就"不求解值"）。
5. 既有 24+ 条写目标断言全部保持通过，未降低识别强度；`req:audit` 基线内无 delta。

## Conclusion

- Approved。假阻断消除、真写入识别不变、边界与取舍写入两份文档，均有"先复现后修复"的断言覆盖。
