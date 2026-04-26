#!/usr/bin/env node

/**
 * SessionEnd Hook: 会话结束时自动反思
 *
 * 1. 读取本次会话改动的文件列表
 * 2. 检查 REQ 进度（目标 vs 完成）
 * 3. 生成摘要写入 .claude/session-log/
 * 4. REQ 未完成时自动更新 progress.txt
 *
 * SessionEnd hook 无决策控制能力，只能产生副作用。
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

function getActiveReqId(rootDir) {
  const progress = path.join(rootDir, '.claude', 'progress.txt');
  try {
    const content = fs.readFileSync(progress, 'utf-8');
    const match = content.match(/^Current active REQ:\s*(.+)/m);
    const val = match ? match[1].trim() : '';
    if (!val || val === 'none' || val === '无') return null;
    return val;
  } catch {
    return null;
  }
}

function getChangedFiles(rootDir) {
  try {
    const diff = execSync('git diff --name-only HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (!diff) return [];
    return diff.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getDiffStat(rootDir) {
  try {
    return execSync('git diff --stat HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return '';
  }
}

function getSessionLogDir(rootDir) {
  return path.join(rootDir, '.claude', 'session-log');
}

function updateProgressTxt(rootDir, _reqId, summary) {
  const progressFile = path.join(rootDir, '.claude', 'progress.txt');
  let content = '';
  try {
    content = fs.readFileSync(progressFile, 'utf-8');
  } catch {
    content = 'Current active REQ: none\nCurrent phase: idle\nLast updated: \n';
  }

  const now = new Date().toISOString().slice(0, 10);
  const lines = content.split('\n');
  const updated = lines.map(line => {
    if (line.startsWith('Last updated:')) {
      return `Last updated: ${now}`;
    }
    if (line.startsWith('Summary:')) {
      return `Summary: ${summary}`;
    }
    return line;
  });

  try {
    fs.writeFileSync(progressFile, updated.join('\n'));
  } catch {
    // progress.txt 写入失败不影响会话结束
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

  const rootDir = event.cwd ? event.cwd.replace(/\/+$/, '') : getGitRoot();

  // 1. 获取改动文件
  const changedFiles = getChangedFiles(rootDir);
  if (changedFiles.length === 0) return; // 无改动，跳过

  // 2. 获取 REQ 状态
  const reqId = getActiveReqId(rootDir);
  const diffStat = getDiffStat(rootDir);
  const now = new Date().toISOString();

  // 3. 生成会话摘要
  const summary = reqId
    ? `${reqId} 进行中，${changedFiles.length} 个文件改动`
    : `无活跃 REQ，${changedFiles.length} 个文件改动`;

  // 4. 写入 session-log
  const logDir = getSessionLogDir(rootDir);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logFile = path.join(logDir, `session-${dateStr}.md`);

  const logContent = [
    `# 会话摘要 ${dateStr}`,
    ``,
    `- 时间: ${now}`,
    `- 活跃 REQ: ${reqId || '无'}`,
    `- 改动文件数: ${changedFiles.length}`,
    ``,
    `## 改动文件`,
    ...changedFiles.map(f => `- ${f}`),
    ``,
    `## Diff 统计`,
    diffStat || '(无)',
    ``,
    `## 状态`,
    reqId ? `- ${reqId} 未完成，需下次会话继续` : '- 无活跃 REQ',
    ``
  ].join('\n');

  try {
    fs.writeFileSync(logFile, logContent);
  } catch {
    // 日志写入失败不影响
  }

  // 5. 更新 progress.txt
  if (reqId) {
    updateProgressTxt(rootDir, reqId, summary);
  }
}

main();
