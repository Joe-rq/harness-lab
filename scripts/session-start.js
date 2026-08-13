#!/usr/bin/env node

/**
 * Session Start Hook - 跨平台版本
 *
 * 在 Claude Code 会话启动时自动执行，显示当前 REQ 状态
 * 替代原有的 bash 脚本，支持 Windows/macOS/Linux
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getProgressPath, getWorktreeIdentity } from './worktree-utils.mjs';
import { appendEvent, buildProgressProjection } from './event-store.mjs';

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

function readProgressFile(rootDir) {
  const progressPath = getProgressPath(rootDir);
  if (!fs.existsSync(progressPath)) {
    return null;
  }
  return fs.readFileSync(progressPath, 'utf-8');
}

function parseProgress(content) {
  const lines = content.split('\n');
  const result = {
    activeReq: 'none',
    phase: 'idle',
    lastUpdated: '',
    summary: [],
    nextSteps: [],
    blockers: [],
  };

  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse key-value pairs
    if (trimmed.startsWith('Current active REQ:')) {
      result.activeReq = trimmed.split(':')[1]?.trim() || 'none';
    } else if (trimmed.startsWith('Current phase:')) {
      result.phase = trimmed.split(':')[1]?.trim() || 'idle';
    } else if (trimmed.startsWith('Last updated:')) {
      result.lastUpdated = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed === 'Summary:') {
      currentSection = 'summary';
    } else if (trimmed === 'Next steps:') {
      currentSection = 'nextSteps';
    } else if (trimmed === 'Blockers:') {
      currentSection = 'blockers';
    } else if (trimmed.startsWith('- ') && currentSection) {
      result[currentSection].push(trimmed.slice(2));
    } else if (trimmed === '' || trimmed.startsWith('#')) {
      currentSection = null;
    }
  }

  return result;
}

function printBanner() {
  log('════════════════════════════════════════════════════════════', 'cyan');
  log('🔄 Harness Lab 会话启动', 'cyan');
  log('════════════════════════════════════════════════════════════', 'cyan');
}

function printProgress(progress) {
  log('\n📋 当前进度：', 'yellow');
  log(`Current active REQ: ${progress.activeReq}`, 'gray');
  log(`Current phase: ${progress.phase}`, 'gray');
  if (progress.lastUpdated) {
    log(`Last updated: ${progress.lastUpdated}`, 'gray');
  }

  if (progress.summary.length > 0) {
    log('\nSummary:', 'yellow');
    progress.summary.forEach(item => log(`  - ${item}`, 'gray'));
  }

  if (progress.nextSteps.length > 0) {
    log('\nNext steps:', 'yellow');
    progress.nextSteps.forEach(item => log(`  - ${item}`, 'gray'));
  }

  if (progress.blockers.length > 0 && progress.blockers[0] !== 'None.') {
    log('\n⚠️ Blockers:', 'red');
    progress.blockers.forEach(item => log(`  - ${item}`, 'red'));
  }

  if (progress.suspendedReqs?.length > 0) {
    log('\n⏸️ 搁置中的 REQ：', 'yellow');
    progress.suspendedReqs.forEach((item) => log(`  - ${item.reqId} (${item.status} / ${item.phase}): ${item.reason}`, 'yellow'));
  }
}

function printReqIndex(rootDir) {
  const indexPath = path.join(rootDir, 'requirements', 'INDEX.md');
  if (!fs.existsSync(indexPath)) {
    return;
  }

  const content = fs.readFileSync(indexPath, 'utf-8');

  // 提取当前活跃 REQ（允许多个）
  const activeMatch = content.match(/## 当前活跃 REQ\s*\n([\s\S]*?)(?=\n## |$)/);
  if (activeMatch) {
    const activeLines = activeMatch[1].split('\n').filter(l => l.trim().startsWith('- ') && !l.includes('无'));
    if (activeLines.length > 0) {
      log('\n📌 需求索引：', 'yellow');
      log(`## 当前活跃 REQ`, 'gray');
      for (const line of activeLines) {
        log(line.trim(), 'green');
      }
    }
  }

  // 提取搁置 REQ
  const blockedMatch = content.match(/## 当前搁置 REQ\s*\n\s*- (.+)/s);
  if (blockedMatch && blockedMatch[1] && !blockedMatch[1].includes('无')) {
    const blockedSection = blockedMatch[1].split('##')[0];
    if (blockedSection.trim()) {
      log(`\n## 当前搁置 REQ`, 'gray');
      const lines = blockedSection.split('\n').filter(l => l.trim().startsWith('-'));
      lines.forEach(line => log(line, 'yellow'));
    }
  }
}

function recordSessionStarted(rootDir, progress, progressFound) {
  try {
    const identity = getWorktreeIdentity(rootDir);
    appendEvent({
      type: 'session_started',
      source: 'hook',
      reqId: progress?.activeReq && progress.activeReq !== 'none' ? progress.activeReq : undefined,
      phase: progress?.phase && progress.phase !== 'idle' ? progress.phase : undefined,
      payload: {
        progressFound,
        activeReq: progress?.activeReq || 'none',
        phase: progress?.phase || 'idle',
      },
    }, {
      rootDir,
      worktree: identity.id,
    });
  } catch (error) {
    console.warn(`[event-store] session_started event skipped: ${error.message}`);
  }
}

function main() {
  printBanner();

  const rootDir = getGitRoot();
  const progressContent = readProgressFile(rootDir);
  let projection = null;

  try {
    projection = buildProgressProjection({ rootDir, worktree: rootDir });
  } catch (error) {
    console.warn(`[event-store] progress projection skipped: ${error.message}`);
  }

  if (!progressContent && !projection) {
    recordSessionStarted(rootDir, null, false);
    log('\n⚠️ 未找到 .claude/progress.txt', 'yellow');
    log('   运行 harness-setup 初始化治理框架\n', 'gray');
    return;
  }

  const progress = projection || parseProgress(progressContent);
  recordSessionStarted(rootDir, progress, Boolean(progressContent));
  printProgress(progress);
  printReqIndex(rootDir);

  log('\n════════════════════════════════════════════════════════════', 'green');
  log('✅ 请根据上述状态继续工作，或询问用户需要做什么', 'green');
  log('════════════════════════════════════════════════════════════\n', 'green');
}

main();
