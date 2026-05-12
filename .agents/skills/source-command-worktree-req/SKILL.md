---
name: "source-command-worktree-req"
description: "为 Claude Code 用户通过 claude --worktree 或手动 git worktree 启动并行 REQ。适用于已有活跃 REQ 时需要另开一条独立工作线。"
---

# source-command-worktree-req

Use this skill when the user wants to run a second or parallel REQ using Claude Code worktrees.

## Command Template

# /worktree-req

## 目标

引导 Claude Code 用户按“一个 worktree 一个 active REQ”的方式创建并启动并行 REQ。优先使用 Claude Code 官方 `claude --worktree` / `-w` 入口；需要自定义目录、分支或复用已有分支时再使用手动 `git worktree`。

参考：Claude Code worktree 文档 https://code.claude.com/docs/en/worktrees

## 前置检查

1. 确认当前目录在 Git 仓库内：`git rev-parse --show-toplevel`
2. 确认 `requirements/` 目录存在；不存在 → 提示先运行 `/harness-setup`
3. 确认 `package.json` 中有 `req:create` / `req:status` 脚本；不存在 → 提示先运行 `/harness-setup`
4. 如首次在该仓库使用 Claude Code，先在仓库根目录运行一次 `claude` 并完成 workspace trust，再使用 `--worktree`
5. 运行 `npm run req:status -- --all` 查看全局活跃 REQ，提醒用户 worktree 并行只隔离 active 状态，不解决多人并发写同一文件的问题
6. 如新 worktree 需要 `.env`、`.env.local` 等 gitignored 文件，建议在仓库根目录维护 `.worktreeinclude`

## 执行步骤

### Step 1: 收集并行 REQ 信息

询问用户：

1. **REQ 主题**（必填）：一句话说明要做什么
2. **REQ 类型**（必填）：`feature` / `bugfix` / `refactor`
3. **创建方式**（默认 Claude Code 原生）：`claude --worktree` / 手动 `git worktree`
4. **worktree 名称**（可选）：默认用 `{slug}`
5. **分支名**（手动模式可选）：默认用 `codex/{slug}`

### Step 2: 创建 worktree（推荐）

优先使用 Claude Code 原生入口：

```bash
claude --worktree {slug}
```

也可以使用短参数：

```bash
claude -w {slug}
```

Claude Code 默认会在仓库根目录下创建 `.claude/worktrees/{slug}/`，并使用独立分支启动会话。未指定名称时，Claude Code 会自动生成一个名称。

### Step 2b: 手动创建 worktree（高级）

如果需要自定义目录、分支名、复用已有分支，使用 Git 手动创建：

```bash
git worktree add ../{repo-name}-{slug} -b codex/{slug}
```

如需从已有分支创建：

```bash
git worktree add ../{repo-name}-{slug} {branch-name}
```

然后进入该目录并启动 Claude Code：

```bash
cd ../{repo-name}-{slug}
claude
```

### Step 3: 在新 worktree 中检查状态

```bash
npm run req:status
npm run req:status -- --all
```

`npm run req:status` 应显示当前 worktree 无活跃 REQ。`--all` 用于确认全局已有并行 REQ。

### Step 4: 创建并启动 REQ

按用户选择的类型创建：

```bash
npm run req:create -- --title "feat: {REQ 主题}" --type feature
npm run req:create -- --title "fix: {REQ 主题}" --type bugfix
npm run req:create -- --title "refactor: {REQ 主题}" --type refactor
```

然后补齐 REQ 的真实背景、目标、验收标准和必要设计稿，再运行：

```bash
npm run req:start -- --id REQ-YYYY-NNN --phase implementation
```

### Step 5: 收尾

完成后：

1. 运行验证命令并生成 review / QA / ship 报告
2. 合并或 cherry-pick 该 worktree 分支
3. 确认不再需要后清理 worktree：

```bash
git worktree remove ../{repo-name}-{slug}
```

## 注意事项

- 一个 worktree 只能有一个 active REQ；多个 active REQ 需要多个 worktree
- 多个 worktree 同时 `req:create` 可能产生 REQ 编号撞号；并行前尽量从最新主线创建 worktree，或先在主线预留 REQ
- Claude Code `--worktree` 默认从远端默认分支创建；如需从本地当前 `HEAD` 创建，在 Claude Code settings 中配置 `worktree.baseRef: "head"`
- `.worktreeinclude` 可复制被 gitignore 的本地配置文件到 Claude Code 创建的 worktree，例如 `.env` 和 `.env.local`
- Claude Code 退出 worktree 会根据是否有改动提示清理；非交互运行和手动 Git worktree 需要自行用 `git worktree remove` 清理
- Harness Lab 隔离的是每个 worktree 的 `progress.txt` 和 `.req-exempt`；Git/Claude Code worktree 隔离的是文件编辑目录
- 不要在未确认的情况下删除 worktree 或强制覆盖分支

## 输出

1. 新 worktree 名称、路径和分支名
2. 创建的 REQ ID 和文件路径
3. 当前 worktree 的 `req:status`
4. 全局 `req:status -- --all` 摘要
5. 下一步：补齐 REQ 内容并执行 `req:start`
