import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * 检测当前是否在 git worktree 中
 * @param {string} root - 仓库根目录
 * @returns {string|null} - worktree ID（通常是分支名）或 null（主仓库）
 */
export function getWorktreeId(root) {
  try {
    const gitDir = execSync('git rev-parse --git-dir', {
      cwd: root,
      encoding: 'utf-8',
    }).trim();
    // gitDir 可能是绝对路径或相对路径
    const basename = path.basename(gitDir);
    // 主仓库: .git；worktree: .git/worktrees/{name}
    if (basename === '.git') {
      return null;
    }
    return basename;
  } catch {
    return null;
  }
}

/**
 * 获取当前分支名（用于 worktree 标识回退）
 * @param {string} root - 仓库根目录
 * @returns {string|null}
 */
export function getCurrentBranch(root) {
  try {
    return execSync('git branch --show-current', {
      cwd: root,
      encoding: 'utf-8',
    }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * 安全化分支名，使其适合作为目录名
 * @param {string} name - 原始分支名/worktree ID
 * @returns {string}
 */
export function safeBranchName(name) {
  // 将路径分隔符 / 替换为 --，避免意外创建嵌套目录
  return name.replace(/\//g, '--');
}

/**
 * 获取当前环境（主仓库或 worktree）对应的 progress.txt 路径
 * @param {string} root - 仓库根目录
 * @returns {string} - progress.txt 的绝对路径
 */
export function getProgressPath(root) {
  let worktreeId = getWorktreeId(root);
  if (!worktreeId) {
    return path.join(root, '.claude', 'progress.txt');
  }
  // worktree ID 有时可能是分支名，安全化处理
  worktreeId = safeBranchName(worktreeId);
  return path.join(root, '.claude', 'worktrees', worktreeId, 'progress.txt');
}

/**
 * 确保 worktree 本地状态目录存在
 * @param {string} root - 仓库根目录
 * @param {string} worktreeId - worktree ID
 * @returns {string} - 创建的目录路径
 */
export function ensureWorktreeDir(root, worktreeId) {
  const safeId = safeBranchName(worktreeId);
  const dir = path.join(root, '.claude', 'worktrees', safeId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 读取 progress.txt 内容，如果不存在则返回 null
 * @param {string} root - 仓库根目录
 * @returns {string|null}
 */
export function readProgressContent(root) {
  const file = getProgressPath(root);
  if (!existsSync(file)) {
    return null;
  }
  return readFileSync(file, 'utf-8');
}

/**
 * 从 progress.txt 内容中提取活跃 REQ ID
 * @param {string} content - progress.txt 内容
 * @returns {string|null}
 */
export function extractActiveReq(content) {
  if (!content) return null;
  const match = content.match(/^Current active REQ:\s*(.+)/m);
  const val = match ? match[1].trim() : '';
  if (!val || val === 'none' || val === '无') return null;
  return val;
}

/**
 * 获取默认的 progress.txt 模板内容
 * @returns {string}
 */
export function getDefaultProgressContent() {
  return [
    'Current active REQ: none',
    'Current phase: idle',
    'Last updated: ',
    '',
    'Summary:',
    '',
    'Next steps:',
    '',
    'Open questions:',
    '',
    'Blockers:',
    '- None.',
  ].join('\n');
}
