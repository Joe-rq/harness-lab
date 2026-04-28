#!/usr/bin/env node

/**
 * Deploy Guard — PreToolUse hook for Bash
 *
 * Intercepts dangerous Bash commands before execution.
 * Prevents self-recovery from becoming self-destruction.
 *
 * Dangerous commands: rm -rf, force push, git reset --hard, drop table, fork bombs, etc.
 *
 * Mode behavior:
 *   collaborative → remind (allow + additionalContext)
 *   supervised    → block
 *   autonomous    → block (more self-recovery power = harder brakes)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*|--recursive\s+--force)/, label: '递归强制删除 (rm -rf)', severity: 'critical' },
  { pattern: /rm\s+-[a-zA-Z]*r/, label: '递归删除 (rm -r)', severity: 'high' },
  { pattern: /git\s+push\s+(-[a-zA-Z]*f[a-zA-Z]*|--force)/, label: '强制推送 (git push --force)', severity: 'critical' },
  { pattern: /git\s+reset\s+--hard/, label: '硬重置 (git reset --hard)', severity: 'critical' },
  { pattern: /git\s+clean\s+(-[a-zA-Z]*f[a-zA-Z]*|--force)/, label: '强制清理 (git clean -f)', severity: 'high' },
  { pattern: /git\s+checkout\s+\.\s*$/, label: '丢弃所有工作区改动 (git checkout .)', severity: 'high' },
  { pattern: /drop\s+table/i, label: '删除数据库表 (DROP TABLE)', severity: 'critical' },
  { pattern: /truncate\s+table/i, label: '清空数据库表 (TRUNCATE TABLE)', severity: 'critical' },
  { pattern: /delete\s+from\s+\w+\s*;?\s*$/i, label: '无条件删除 (DELETE FROM without WHERE)', severity: 'high' },
  { pattern: /\:\(\)\{\s*\:\|\:\&\s*\}\s*\;/, label: 'Fork 炸弹', severity: 'critical' },
  { pattern: />\s*\/dev\/sd/, label: '直接写磁盘', severity: 'critical' },
  { pattern: /curl.*\|\s*(ba)?sh/, label: '远程脚本执行 (curl | sh)', severity: 'high' },
  { pattern: /wget.*\|\s*(ba)?sh/, label: '远程脚本执行 (wget | sh)', severity: 'high' },
  { pattern: /chmod\s+(-R\s+)?777/, label: '全权限 (chmod 777)', severity: 'medium' },
  { pattern: /npm\s+publish/, label: 'NPM 发布 (npm publish)', severity: 'high' },
  { pattern: /docker\s+rm\s+(-[a-zA-Z]*f[a-zA-Z]*|--force)/, label: '强制删除容器 (docker rm -f)', severity: 'medium' },
  { pattern: /docker\s+(rmi|image\s+rm)\s+(-[a-zA-Z]*f[a-zA-Z]*|--force)/, label: '强制删除镜像 (docker rmi -f)', severity: 'medium' },
];

function getRootDir() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function getHarnessMode(rootDir) {
  const modeFile = path.join(rootDir, '.claude', 'harness-mode');
  try {
    return fs.readFileSync(modeFile, 'utf-8').trim() || 'collaborative';
  } catch {
    return 'collaborative';
  }
}

function logBlocked(rootDir, command, match, mode) {
  const logFile = path.join(rootDir, '.claude', '.deploy-guard.log');
  const line = `${new Date().toISOString()} | BLOCKED | ${match.label} | mode=${mode} | cmd="${command.substring(0, 200)}"\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {
    // 日志写入失败不影响主流程
  }
}

async function main() {
  let event;
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    event = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return;
  }

  const toolName = event.tool_name || '';
  if (toolName !== 'Bash') return;

  const command = event.tool_input?.command;
  if (!command || typeof command !== 'string') return;

  const rootDir = getRootDir();
  if (!rootDir) return;

  // Check against dangerous patterns
  const match = DANGEROUS_PATTERNS.find(p => p.pattern.test(command));
  if (!match) return; // Safe command, allow

  const mode = getHarnessMode(rootDir);

  if (mode === 'collaborative') {
    // 提醒不阻断
    console.log(JSON.stringify({
      decision: 'allow',
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: `[DeployGuard] ⚠️ 检测到危险命令：${match.label}\n命令：${command.substring(0, 100)}\n此操作不可逆，请确认是否真的需要执行。`
      }
    }));
  } else {
    // supervised + autonomous：阻断
    logBlocked(rootDir, command, match, mode);
    console.log(JSON.stringify({
      decision: 'block',
      reason: `[DeployGuard] 🚫 已拦截危险命令：${match.label}\n命令：${command.substring(0, 100)}\n${mode} 模式下禁止执行此操作。如确需执行，请切换到 collaborative 模式或手动操作。`
    }));
  }
}

main();
