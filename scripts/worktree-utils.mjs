import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function resolveGitPath(root, value) {
  return path.resolve(root, value);
}

export function getWorktreeIdentity(root) {
  const checkoutRoot = path.resolve(root);
  try {
    const topLevel = path.resolve(git(checkoutRoot, ['rev-parse', '--show-toplevel']));
    const gitDir = resolveGitPath(topLevel, git(topLevel, ['rev-parse', '--git-dir']));
    const commonDir = resolveGitPath(topLevel, git(topLevel, ['rev-parse', '--git-common-dir']));
    const isMain = path.resolve(gitDir) === path.resolve(commonDir);
    let branchRef = '';
    try { branchRef = git(topLevel, ['symbolic-ref', '-q', 'HEAD']); } catch { branchRef = ''; }
    const branch = branchRef ? branchRef.replace(/^refs\/heads\//, '') : null;
    return {
      id: isMain ? 'main' : safeBranchName(path.basename(gitDir)),
      branch,
      root: topLevel,
      gitDir,
      commonDir,
      isMain,
    };
  } catch {
    return {
      id: 'main',
      branch: null,
      root: checkoutRoot,
      gitDir: null,
      commonDir: null,
      isMain: true,
    };
  }
}

export function listGitWorktrees(root) {
  const fallback = getWorktreeIdentity(root);
  try {
    const output = git(root, ['worktree', 'list', '--porcelain']);
    const records = output.split(/\n\s*\n/).map((block) => {
      const fields = {};
      for (const line of block.split('\n')) {
        const separator = line.indexOf(' ');
        if (separator === -1) fields[line] = true;
        else fields[line.slice(0, separator)] = line.slice(separator + 1);
      }
      return fields;
    }).filter((fields) => fields.worktree);
    return records.map((fields) => {
      const identity = getWorktreeIdentity(fields.worktree);
      return {
        ...identity,
        root: path.resolve(fields.worktree),
        branch: fields.branch ? fields.branch.replace(/^refs\/heads\//, '') : identity.branch,
        head: fields.HEAD || null,
        detached: fields.detached === true,
        prunable: fields.prunable === true,
      };
    }).sort((left, right) => Number(left.isMain) === Number(right.isMain)
      ? left.root.localeCompare(right.root)
      : (left.isMain ? -1 : 1));
  } catch {
    return [fallback];
  }
}

/**
 * 检测当前是否在 git worktree 中
 * @param {string} root - 仓库根目录
 * @returns {string|null} - worktree ID（通常是分支名）或 null（主仓库）
 */
export function getWorktreeId(root) {
  const identity = getWorktreeIdentity(root);
  return identity.isMain ? null : identity.id;
}

/**
 * 获取当前分支名（用于 worktree 标识回退）
 * @param {string} root - 仓库根目录
 * @returns {string|null}
 */
export function getCurrentBranch(root) {
  return getWorktreeIdentity(root).branch;
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
 * 获取当前环境对应的 .req-exempt 豁免文件路径
 * @param {string} root - 仓库根目录
 * @returns {string}
 */
export function getExemptPath(root) {
  const progressPath = getProgressPath(root);
  return progressPath.replace(/progress\.txt$/, '.req-exempt');
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
