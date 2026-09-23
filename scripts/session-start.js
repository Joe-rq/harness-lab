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

function readProgressMtime(progressPath) {
  try {
    return fs.statSync(progressPath).mtime.toISOString().slice(0, 10);
  } catch {
    return 'unknown';
  }
}

function printBanner() {
  log('════════════════════════════════════════════════════════════', 'cyan');
  log('🔄 Harness Lab 会话启动', 'cyan');
  log('════════════════════════════════════════════════════════════', 'cyan');
}

// 机器状态：唯一真相源是事件账本投影（.claude/**/events/*.jsonl）。
function printMachineState(projection) {
  log('\n📊 机器状态（唯一真相源：事件账本投影）', 'yellow');
  if (!projection) {
    log('Current active REQ: none', 'gray');
    log('Current phase: idle', 'gray');
    log('（无事件记录：新项目或事件账本为空）', 'gray');
    return;
  }

  log(`Current active REQ: ${projection.activeReq}`, 'gray');
  log(`Current phase: ${projection.phase}`, 'gray');
  if (projection.lastUpdated) {
    log(`Last updated: ${projection.lastUpdated}`, 'gray');
  }

  if (projection.nextSteps.length > 0) {
    log('\nNext steps:', 'yellow');
    projection.nextSteps.forEach(item => log(`  - ${item}`, 'gray'));
  }

  if (projection.suspendedReqs?.length > 0) {
    log('\n⏸️ 搁置中的 REQ：', 'yellow');
    projection.suspendedReqs.forEach((item) => log(`  - ${item.reqId} (${item.status} / ${item.phase}): ${item.reason}`, 'yellow'));
  }
}

// 事件流水窗口：只是“最近发生了什么”，不是当前状态。
function printRecentEvents(projection) {
  if (!projection || projection.summary.length === 0) {
    return;
  }
  log(`\n🕘 最近事件（显示 ${projection.summary.length} 条 / 共 ${projection.eventCount} 条）`, 'yellow');
  projection.summary.forEach(item => log(`  - ${item}`, 'gray'));
}

// 人的笔记：progress.txt 原文照登，不参与状态判定，也不做结构化改写。
function printHumanNotes(content, progressPath) {
  log('\n📝 人的笔记（.claude/progress.txt 原文，不参与状态判定）', 'yellow');
  if (!content) {
    log('（无 progress.txt）', 'gray');
    return;
  }
  log(`最后修改：${readProgressMtime(progressPath)} ｜ CLI 会在 create/start/block/complete 时改写头部字段`, 'gray');
  content.trimEnd().split('\n').forEach(line => log(line, 'gray'));
}

function isEmptyIndexItem(item) {
  const content = item.replace(/^-\s*/, '').replace(/[`。\s]/g, '');
  return content === '' || content === '无';
}

function readIndexSection(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return [];
  }
  const items = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('## ')) {
      break;
    }
    if (trimmed.startsWith('- ')) {
      items.push(trimmed);
    }
  }
  return items.filter((item) => !isEmptyIndexItem(item));
}

function printReqIndex(rootDir) {
  const indexPath = path.join(rootDir, 'requirements', 'INDEX.md');
  if (!fs.existsSync(indexPath)) {
    return;
  }

  const lines = fs.readFileSync(indexPath, 'utf-8').split('\n');

  // 逐行扫描章节内的 `- ` 条目：正则捕获组会把列表首项吃进捕获组，导致首项被丢弃。
  const activeItems = readIndexSection(lines, '## 当前活跃 REQ');
  const suspendedItems = readIndexSection(lines, '## 当前搁置 REQ');

  if (activeItems.length > 0) {
    log('\n📌 需求索引：', 'yellow');
    log('## 当前活跃 REQ', 'gray');
    activeItems.forEach((item) => log(item, 'green'));
  }

  if (suspendedItems.length > 0) {
    log('\n## 当前搁置 REQ', 'gray');
    suspendedItems.forEach((item) => log(item, 'yellow'));
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
  const progressPath = getProgressPath(rootDir);
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

  recordSessionStarted(rootDir, projection, Boolean(progressContent));
  printMachineState(projection);
  printRecentEvents(projection);
  printHumanNotes(progressContent, progressPath);
  printReqIndex(rootDir);

  log('\n════════════════════════════════════════════════════════════', 'green');
  log('✅ 请根据上述状态继续工作，或询问用户需要做什么', 'green');
  log('════════════════════════════════════════════════════════════\n', 'green');
}

main();
