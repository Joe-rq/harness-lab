#!/usr/bin/env node

/**
 * PostToolUse Hook: 循环检测
 *
 * 追踪 per-file edit count。当同一文件被编辑超过阈值次数时，
 * 通过 additionalContext 注入提醒让 agent 考虑换方法。
 *
 * 借鉴自 wow-harness loop-detection.py，用 Node.js 重写。
 * 来源: ADR-038 D4.5, LangChain — 52.8%→66.5% 提升
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const LOOP_THRESHOLD = 5; // 同一文件编辑超过此次数则提醒
const TTL_SECONDS = 3600; // 1 小时后重置计数

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

function getStateDir(rootDir) {
  return path.join(rootDir, '.claude', '.loop-state');
}

function getStateFile(rootDir) {
  // 用 PPID 区分不同会话
  const ppid = process.ppid;
  return path.join(getStateDir(rootDir), `loop-${ppid}.json`);
}

function loadState(stateFile) {
  if (!fs.existsSync(stateFile)) {
    return {};
  }
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    // 检查 TTL
    if (Date.now() / 1000 - (data._ts || 0) > TTL_SECONDS) {
      return {};
    }
    return data;
  } catch {
    return {};
  }
}

function saveState(stateFile, state) {
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  state._ts = Date.now() / 1000;
  fs.writeFileSync(stateFile, JSON.stringify(state));
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
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const toolName = event.tool_name || '';
  const toolInput = event.tool_input || {};

  // 只追踪 Write 和 Edit 操作
  if (toolName !== 'Write' && toolName !== 'Edit') {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const filePath = toolInput.file_path || '';
  if (!filePath) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  // 获取项目根目录
  const rootDir = getGitRoot();
  const stateFile = getStateFile(rootDir);

  // 更新计数
  const state = loadState(stateFile);
  const counts = state.counts || {};
  counts[filePath] = (counts[filePath] || 0) + 1;
  state.counts = counts;
  saveState(stateFile, state);

  const count = counts[filePath];

  if (count >= LOOP_THRESHOLD) {
    console.log(JSON.stringify({
      decision: 'allow',
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: (
          `[LoopDetection] 你已经编辑 ${path.basename(filePath)} ${count} 次了。` +
          `考虑换一个方法或退一步重新思考整体方案。`
        )
      }
    }));
  } else {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
}

main();
