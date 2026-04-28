#!/usr/bin/env node

/**
 * PreCompact Hook: 上下文压缩前保存关键状态
 *
 * 在上下文压缩前：
 * 1. 读取当前活跃 REQ 和进度
 * 2. 写入快照文件 (.claude/.compact-snapshot.md)
 * 3. 通过 systemMessage 提醒 AI 压缩后读取快照
 *
 * 运行方式：PreToolUse hook（Claude Code 自动调用）
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

function getHarnessMode(rootDir) {
  const modeFile = path.join(rootDir, '.claude', 'harness-mode');
  try {
    return fs.readFileSync(modeFile, 'utf-8').trim() || 'collaborative';
  } catch {
    return 'collaborative';
  }
}

function readProgress(rootDir) {
  const file = path.join(rootDir, '.claude', 'progress.txt');
  try {
    return fs.readFileSync(file, 'utf-8').trim();
  } catch {
    return null;
  }
}

function readActiveReq(rootDir) {
  const progress = readProgress(rootDir);
  if (!progress) return null;
  const match = progress.match(/Current active REQ:\s*(\S+)/);
  if (!match || match[1] === 'none' || match[1] === '无') return null;
  return match[1];
}

function readReqStatus(rootDir, reqId) {
  const dir = path.join(rootDir, 'requirements', 'in-progress');
  try {
    const files = fs.readdirSync(dir).filter(f => f.startsWith(reqId));
    if (files.length === 0) return null;
    const content = fs.readFileSync(path.join(dir, files[0]), 'utf-8');
    const statusMatch = content.match(/^- 当前状态：(.+)$/m);
    const phaseMatch = content.match(/^- 当前阶段：(.+)$/m);
    return {
      status: statusMatch ? statusMatch[1].trim() : 'unknown',
      phase: phaseMatch ? phaseMatch[1].trim() : 'unknown',
    };
  } catch {
    return null;
  }
}

function readRiskLevel(rootDir) {
  const file = path.join(rootDir, '.claude', '.risk-ratchet');
  try {
    return fs.readFileSync(file, 'utf-8').trim();
  } catch {
    return '0';
  }
}

function writeSnapshot(rootDir, activeReq, progress, reqStatus, riskLevel) {
  const snapshotFile = path.join(rootDir, '.claude', '.compact-snapshot.md');
  const lines = [
    '# Compact Snapshot',
    '',
    `生成时间: ${new Date().toISOString()}`,
    `活跃 REQ: ${activeReq || 'none'}`,
    `风险等级: R${riskLevel}`,
  ];

  if (reqStatus) {
    lines.push(`REQ 状态: ${reqStatus.status}`);
    lines.push(`REQ 阶段: ${reqStatus.phase}`);
  }

  if (progress) {
    lines.push('');
    lines.push('## 进度摘要');
    lines.push(progress);
  }

  fs.writeFileSync(snapshotFile, lines.join('\n'));
}

function logCompactEvent(rootDir, mode, activeReq) {
  if (mode !== 'autonomous') return;
  const logFile = path.join(rootDir, '.claude', '.compact-events.log');
  const entry = `${new Date().toISOString()} | compact | mode=${mode} | req=${activeReq || 'none'}`;
  fs.appendFileSync(logFile, entry + '\n');
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    const rootDir = getGitRoot();
    const mode = getHarnessMode(rootDir);
    const activeReq = readActiveReq(rootDir);
    const riskLevel = readRiskLevel(rootDir);

    logCompactEvent(rootDir, mode, activeReq);

    if (!activeReq) {
      console.log(JSON.stringify({}));
      return;
    }

    const progress = readProgress(rootDir);
    const reqStatus = readReqStatus(rootDir, activeReq);

    writeSnapshot(rootDir, activeReq, progress, reqStatus, riskLevel);

    let message = `📋 上下文压缩：当前活跃 REQ = ${activeReq}`;
    if (reqStatus) {
      message += `（${reqStatus.status} / ${reqStatus.phase}）`;
    }
    message += `，风险 R${riskLevel}。状态快照已保存到 .claude/.compact-snapshot.md，压缩后请读取恢复上下文。`;

    console.log(JSON.stringify({ systemMessage: message }));
  });
}

main();
