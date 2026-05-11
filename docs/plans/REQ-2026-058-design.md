# REQ-2026-058 设计文档：worktree 本地隔离模式

## 1. 问题定义

当前 Harness Lab 的状态文件（progress.txt、.req-exempt）是全局单例：
- 多个 git worktree 共用同一套状态，互相覆盖
- req:start 阻止第二个 REQ 启动
- session-start / hooks 无法恢复各 worktree 的独立上下文

## 2. 方案概述（方案 A）

**核心原则**：状态文件随 worktree 走，物理隔离，向后兼容。

## 3. worktree 检测

### 3.1 检测方法

```bash
git rev-parse --is-inside-work-tree  # 确认在 git 仓库内
git rev-parse --git-dir              # 返回 .git 或 .git/worktrees/{name}
```

- 主仓库：`--git-dir` → `.git`
- worktree：`--git-dir` → `.git/worktrees/{branch-name}`

### 3.2 分支名获取

```bash
git branch --show-current
```

### 3.3 安全化分支名

分支名可能含 `/`（如 `feature/abc`），直接用作目录名会创建嵌套目录。策略：
- 将 `/` 替换为 `--`
- 例：`feature/abc` → `feature--abc`

## 4. 本地进度路径

### 4.1 目录结构

```
.claude/
  progress.txt                    # 主仓库（非 worktree）进度，保持现有行为
  worktrees/
    feature--abc/
      progress.txt                # worktree "feature/abc" 的进度
      .req-exempt                 # worktree 的专属豁免（按需创建）
```

### 4.2 路径选择逻辑

```js
function getWorktreeId(root) {
  const gitDir = execSync('git rev-parse --git-dir', { cwd: root }).toString().trim();
  if (path.basename(gitDir) === '.git') {
    return null; // 主仓库
  }
  return path.basename(gitDir);
}

function getProgressPath(root) {
  const worktreeId = getWorktreeId(root);
  if (!worktreeId) {
    return path.join(root, '.claude', 'progress.txt');
  }
  const safeId = worktreeId.replace(/\//g, '--');
  return path.join(root, '.claude', 'worktrees', safeId, 'progress.txt');
}
```

### 4.3 .claude/worktrees/ 不加入 git

`.claude/worktrees/` 目录下的所有内容均为工作目录本地状态，**不加入 git 跟踪**。

## 5. 组件改造点

### 5.1 scripts/req-cli.mjs

- `updateProgress()`：用 `getProgressPath(root)` 代替硬编码路径
- `startCommand()` / `createCommand()`：同一 worktree 内检查活跃 REQ（不再全局阻止）
- `statusCommand()`：默认显示当前 worktree 的活跃 REQ，`--all` 显示全部
- `updateIndex()`：活跃 REQ 从单条改为列表追加

### 5.2 scripts/session-start.js / precompact-notify.mjs / session-reflect.mjs

- 读取 progress 路径改为 `getProgressPath(root)`

### 5.3 .claude/commands/resume.md / self-review.md

- 使用 `npm run req -- status` 获取活跃 REQ（req-cli 自动处理 worktree 逻辑）

## 6. 向后兼容

| 场景 | 行为 |
|------|------|
| 主仓库（非 worktree） | 100% 不变，仍用 `.claude/progress.txt` |
| worktree 中首次启动 | 自动创建 `.claude/worktrees/{id}/` 目录和 progress.txt |

## 7. 测试策略

- 单元测试：`getWorktreeId()`、`getProgressPath()`、`safeBranchName()`
- 集成测试：主仓库 vs worktree 进度写入路径验证
- 手动验证：创建 worktree、启动 REQ、验证进度隔离
