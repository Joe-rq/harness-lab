# REQ-2026-057 设计文档：worktree 本地隔离模式

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

### 4.2 路径选择逻辑（伪代码）

```js
function getWorktreeId() {
  const gitDir = execSync('git rev-parse --git-dir', { cwd: root }).toString().trim();
  // gitDir 可能是绝对路径或相对路径
  if (path.basename(gitDir) === '.git') {
    return null; // 主仓库
  }
  // worktree: .git/worktrees/{name}
  return path.basename(gitDir);
}

function getProgressPath(root) {
  const worktreeId = getWorktreeId();
  if (!worktreeId) {
    return path.join(root, '.claude', 'progress.txt');
  }
  const safeId = worktreeId.replace(/\//g, '--');
  return path.join(root, '.claude', 'worktrees', safeId, 'progress.txt');
}
```

### 4.3 .claude/worktrees/ 不加入 git

`.claude/worktrees/` 目录下的所有内容均为工作目录本地状态，**不加入 git 跟踪**（通过 .gitignore 或在文件创建逻辑中保证）。

## 5. 组件改造点

### 5.1 scripts/req-cli.mjs

**新增**：
- `getWorktreeId()` 函数
- `getProgressPath(root)` 函数
- `ensureWorktreeDir(root, worktreeId)` 函数

**改造**：
- `updateProgress()`：用 `getProgressPath(root)` 代替硬编码路径
- `readProgress()`：同
- `startCommand()`：移除"已有活跃 REQ 时阻止启动"的限制，改为"同一 worktree 内已有活跃 REQ 时阻止"
- `createCommand()`：同上，改为同一 worktree 内检查
- `statusCommand()`：默认显示当前 worktree 的活跃 REQ（`--all` 选项显示全部）

**INDEX.md 改造**：
- `## 当前活跃 REQ` 允许多个条目
- `updateIndex()` 的 `active` 参数从单条改为列表追加
- 新增 `removeActiveId` 参数用于 complete 时移除

### 5.2 scripts/session-start.js

**改造**：
- 读取 progress 路径改为 `getProgressPath(root)`
- 恢复上下文时基于当前 worktree 的进度

### 5.3 scripts/precompact-notify.mjs

**改造**：
- 读取 progress 路径改为 `getProgressPath(root)`

### 5.4 scripts/session-reflect.mjs

**改造**：
- 读取/写入 progress 路径改为 `getProgressPath(root)`

### 5.5 .claude/commands/resume.md

**改造**：
- 读取 progress 路径逻辑更新（指向 worktree 本地）
- 文案保持简洁

### 5.6 .claude/commands/self-review.md

**改造**：
- 读取 progress 路径逻辑更新

## 6. 向后兼容

| 场景 | 行为 |
|------|------|
| 主仓库（非 worktree） | 100% 不变，仍用 `.claude/progress.txt` |
| 旧版 progress.txt 存在 | 主仓库继续读取，不受影响 |
| worktree 中首次启动 | 自动创建 `.claude/worktrees/{id}/` 目录和 progress.txt |

## 7. 测试策略

### 7.1 单元测试（新增）

- `getWorktreeId()`：模拟不同 git-dir 返回值
- `getProgressPath()`：验证主仓库和 worktree 路径正确
- `safeBranchName()`：验证特殊字符替换

### 7.2 集成测试（新增）

- 在主仓库执行 req:start → 进度写入 `.claude/progress.txt`
- 在 worktree 执行 req:start → 进度写入 `.claude/worktrees/{id}/progress.txt`
- 两个 worktree 同时启动 REQ → INDEX.md 显示两个活跃 REQ

### 7.3 手动验证

```bash
# 创建 worktree
git worktree add ../harness-lab-wt1 -b req-057-test
cd ../harness-lab-wt1

# 在该 worktree 中启动 REQ
npm run req -- start --id REQ-2026-057

# 验证进度隔离
cat .claude/worktrees/req-057-test/progress.txt

# 回到主仓库，验证主仓库进度不变
cd ../harness-lab
cat .claude/progress.txt
```

## 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 遗漏某个读 progress.txt 的入口 | 全局搜索所有引用点，逐一改造 |
| worktree 检测失败（如 git 不可用） | 回退到主仓库行为 |
| 分支名含非法文件名字符 | 安全化：替换 `/`，保留其他（如 `.` `-` `_`）|
| INDEX.md 并发写入冲突 | 允许多个活跃 REQ 列表，complete 时只移除自己的 |
