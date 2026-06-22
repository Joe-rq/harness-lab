# REQ-2026-085 设计稿：OPT-1A — req-check stdin 契约 + Bash 写入门禁

> 关联 REQ：`requirements/in-progress/REQ-2026-085-opt1a-req-check-stdin-bash.md`
> 关联路线：`docs/plans/optimization-roadmap-2026-06.md` OPT-1

## 1. 问题陈述

两个并发的地基裂缝，合起来架空"REQ 强制门禁"承诺：

### 1.1 env-var 死代码（过度阻断）

`scripts/req-check.js:85-88` `getTargetFileFromEnv()` 读 `process.env.CLAUDE_TARGET_FILE`。Claude Code 的 PreToolUse 实际通过 **stdin JSON**（`tool_input.file_path`）传参，该 env 恒空。后果：`isRequirementsOrDocsFile()`（:69-83）的白名单 `requirements/` | `docs/plans/` | `.claude/` 从未生效 → 无活跃 REQ 时，填 REQ 内容、写设计稿被误拦（`main()` :159-165 拿不到 targetFile，跳过白名单直奔 :205 阻断）。

对照：`scripts/scope-guard.mjs:326-337` 已正确从 stdin 读取（`for await (chunk of process.stdin)` + `JSON.parse`）。**两个同职责 hook 输入契约不一致**，req-check 是早期实现未统一。

### 1.2 Bash 写绕过（漏阻断）

`.claude/settings.example.json:17` matcher 仅 `Write|Edit`。下列 Bash 写路径完全不经 `req-check.js`：

```
echo "x" > src/a.c        # 重定向
tee src/a.c <<< "x"       # 管道写
sed -i 's/a/b/' src/a.ts  # 原地改
cat <<EOF > src/a.ts      # heredoc
EOF
```

boucle.sh "190 个 hooks 失效场景"的头号模式：封工具路径 ≠ 封策略。

## 2. 方案

### 2.1 req-check.js 重写（对齐 scope-guard 的 stdin 契约）

主逻辑由同步 env-based 改为异步 stdin-based + `tool_name` 分流：

```js
async function main() {
  // 1. 从 stdin 读 hook event（对齐 scope-guard.mjs:326-337）
  const event = await readStdinJson();  // 解析失败 → exit 0（不阻断）
  if (!event) return;

  const rootDir = getGitRoot();
  if (isExempt(rootDir)) process.exit(0);

  const toolName = event.tool_name || '';
  const toolInput = event.tool_input || {};

  // 2. 按 tool_name 分流
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'NotebookEdit') {
    handleFileWrite(toolInput.file_path, rootDir);   // 过白名单 + REQ 检查
  } else if (toolName === 'Bash') {
    handleBash(toolInput.command, rootDir);          // 写检测 + REQ 检查
  }
  // 其他 tool_name → 放行
}
```

- `handleFileWrite(filePath)`：复用现有 `isRequirementsOrDocsFile()` 白名单（现终于拿到真路径）；命中白名单 → `exit 0`；否则走原 REQ 校验逻辑（progress / active REQ / 占位符 / draft）。
- `handleBash(command)`：先 `classifyBashCommand(command)` 判读写；**纯读 → `exit 0`**（零摩擦，避免误杀 ls/grep）；识别为写 → 等同 Write 走 REQ 校验。

### 2.2 Bash 写模式启发式（classifyBashCommand）

命中任一即视为"写"，需经 REQ 检查；**未命中任何模式 → 放行（读命令）**：

| 类别 | 模式 | 备注 |
|------|------|------|
| 重定向 | `(?<!2|&)>`、`>>` | 排除 `2>`、`&>` 到 /dev/null 等噪音 |
| 管道写 | `\|\s*(tee\|sponge)\b` | |
| 原地改 | `\b(sed\|perl\|gawk)\s+(-i|--inplace)\b` | `sed -i` / `perl -i` / `gawk -i inplace` |
| 文件操作 | `\b(rm\|mv\|cp\|touch\|mkdir\|ln)\b` + 目标在 repo 内 | repo 外（`/tmp` 等）放行 |
| heredoc | `cat\s*<<.*>\s*\S` / `cat\s*>\s*\S` | |

实现为单一函数返回 `{ writes: bool, reason?: string }`，集中维护、便于 REQ-2026-086 doctor 自检与后续扩展。

### 2.3 scope-guard.mjs 扩 Bash（范围判定）

`scope-guard.mjs:342-343` 当前 `if (toolName !== 'Write' && toolName !== 'Edit') return;`。改为三分支：

```js
let relPath = null;
if (toolName === 'Write' || toolName === 'Edit' || toolName === 'NotebookEdit') {
  relPath = toRelPath(event.tool_input?.file_path, rootDir);
} else if (toolName === 'Bash') {
  relPath = bashWriteTarget(event.tool_input?.command, rootDir);  // 复用 2.2 启发式，返回写目标 relPath 或 null
}
if (!relPath) return;  // 非写、或写目标在 repo 外 → 放行
```

`bashWriteTarget` 复用 req-check 的启发式（抽到共享模块或两边一致实现），从写命令提取目标路径转 `relPath`，再走现有 `evaluateRange()`（:236）。范围内放行、范围外走现有 `logViolation` + 阻断输出。

> 共享考量：req-check 与 scope-guard 都需要 Bash 启发式。优先内联两份一致实现（避免新增共享模块扩大 diff）；若 REQ-2026-086 阶段发现漂移再抽 `scripts/bash-write-detect.mjs`。

### 2.4 matcher 扩面

`.claude/settings.example.json:17`：

```json
"matcher": "Write|Edit|NotebookEdit|Bash"
```

两 hook（req-check + scope-guard）同在该 matcher 内，自动获得 Bash 触发。

## 3. 测试矩阵（tests/governance.test.mjs 新增）

| # | 场景 | 输入（stdin JSON） | 期望 |
|---|------|---------------------|------|
| T1 | Bash 写绕过被拦 | 无活跃 REQ + `{tool_name:'Bash', tool_input:{command:'echo x > src/a.ts'}}` | req-check `exit 2` |
| T2 | Bash 纯读放行 | 无活跃 REQ + `{tool_name:'Bash', tool_input:{command:'ls -la'}}` | req-check `exit 0` |
| T3 | Bash 纯读放行（grep） | 无活跃 REQ + `{tool_name:'Bash', tool_input:{command:'grep foo src/a.ts'}}` | req-check `exit 0` |
| T4 | 白名单恢复（requirements/） | 无活跃 REQ + `{tool_name:'Write', tool_input:{file_path:'.../requirements/in-progress/REQ-x.md'}}` | req-check `exit 0` |
| T5 | 白名单恢复（docs/plans/） | 无活跃 REQ + Write `docs/plans/x.md` | req-check `exit 0` |
| T6 | 写绕过变体（sed -i） | 无活跃 REQ + Bash `sed -i 's/a/b/' src/a.ts` | req-check `exit 2` |
| T7 | scope-guard Bash 范围外 | 有活跃 REQ（范围 scripts/foo.mjs）+ Bash `echo > scripts/bar.mjs` | scope-guard 阻断 + 记 log |
| T8 | scope-guard Bash 范围内 | 有活跃 REQ（范围 scripts/**）+ Bash `echo > scripts/foo.mjs` | scope-guard 放行 |

测试通过构造 stdin JSON 字符串、`child_process` 调脚本、断言 exit code / stdout 实现（对齐现有 governance.test.mjs 的 hook 测试风格）。

## 4. 边界与非目标（重申）

- 不封 `perl -e 'print...'` / `python -c 'open().write()'`（理论不可封）→ REQ-2026-086 文档声明 + OS 级兜底建议
- 不处理 subagent 绕过（GitHub #21460/#34692）、`claude -p` 不触发（#40506）→ 平台缺口，文档声明
- 不改模块类型 / hook 输出格式 / doctor / 文档 → 全归 REQ-2026-086

## 5. 风险与回滚

- **误杀**：Bash 启发式拦合法写（如 repo 内 `npm install` 生成文件）。对冲：rm/mv/cp 等仅对显式 repo 内路径目标触发；`supervised` 模式可整体降级为提醒。
- **回滚**：matcher 还原 `Write|Edit` + req-check 还原 env-var 读取，单 commit 可逆。

## 6. 实施顺序

1. `req-check.js` 重写（stdin + 分流 + 启发式）→ 自测 T1-T6
2. `scope-guard.mjs` 扩 Bash 分支 → 自测 T7-T8
3. `settings.example.json` matcher 扩面
4. `tests/governance.test.mjs` 加 T1-T8
5. `npm test` + `docs:verify` + `check:governance` 全绿
