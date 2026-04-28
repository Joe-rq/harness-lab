# REQ-2026-051 Code Review

**日期**：2026-04-28
**REQ**：REQ-2026-051 Phase 5.5 部署守卫

## 变更范围

| 文件 | 变更类型 | 改动说明 |
|------|---------|---------|
| scripts/deploy-guard.mjs | 新建 | PreToolUse Bash hook，17 种危险命令模式，三模式分化 |
| .claude/settings.local.json | 修改 | 新增 PreToolUse Bash matcher |

## 代码审查

| 维度 | 结论 |
|------|------|
| 危险命令覆盖 | ✅ 17 种模式覆盖 rm -rf/r、force push、git reset --hard、git clean -f、git checkout .、drop/truncate table、delete from、fork bomb、磁盘写入、远程脚本执行、chmod 777、npm publish、docker rm -f/rmi -f |
| 安全命令放行 | ✅ rm -f（单文件删除）、ls、git status 等正常放行 |
| 模式分化 | ✅ collaborative=allow+提醒，supervised=block，autonomous=block |
| 日志记录 | ✅ supervised/autonomous 阻断时记录到 .claude/.deploy-guard.log |
| Hook 注册 | ✅ PreToolUse Bash matcher，timeout 5s |
| 与现有 hook 共存 | ✅ req-check/scope-guard 是 Write|Edit matcher，deploy-guard 是 Bash matcher，无冲突 |

## 设计决策

1. **autonomous 也阻断**：与路线图一致——"自恢复能力越强，刹车越重要"。危险命令在任何模式下都不可自动执行
2. **rm -f 放行**：单文件删除（如 `.req-exempt`）是合法操作，只有递归删除（-r/-rf）才拦截
3. **git checkout . 拦截**：丢弃所有工作区改动等价于 `git reset --hard`，属于不可逆操作
4. **17 种模式**：覆盖了早期路线图定义的所有模式 + 补充了 npm publish / docker 操作

## 延后项

- 无
