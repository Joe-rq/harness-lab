#!/usr/bin/env node

/**
 * PostToolUse Hook / CLI: 看门狗
 *
 * 检测 REQ 级别的停滞和循环：
 * - 停滞：同一 REQ 阶段长时间不变
 * - 循环：同一 REQ 反复切换状态
 *
 * 运行方式：
 *   1. PostToolUse hook（每次 Write|Edit 后被动检查）
 *   2. CLI 诊断模式：`node scripts/watchdog.mjs --diagnose`
 *
 * 状态持久化到 .claude/.watchdog-state，支持跨会话续传。
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const STAGNATION_THRESHOLD = 10; // 同一 REQ 编辑操作超过此次数无阶段推进则提醒
const LOOP_THRESHOLD = 3; // 同一 REQ 状态切换超过此次数则提醒

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

function getStateFile(rootDir) {
  return path.join(rootDir, '.claude', '.watchdog-state');
}

function loadState(rootDir) {
  const file = getStateFile(rootDir);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { reqs: {}, lastUpdate: null };
  }
}

function saveState(rootDir, state) {
  const file = getStateFile(rootDir);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  state.lastUpdate = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
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

function getReqPhase(rootDir, reqId) {
  // 从 REQ 文件中读取当前阶段
  const dirs = ['in-progress', 'completed', 'on-hold'];
  for (const dir of dirs) {
    const reqDir = path.join(rootDir, 'requirements', dir);
    if (!fs.existsSync(reqDir)) continue;
    const files = fs.readdirSync(reqDir);
    const match = files.find(f => f.startsWith(reqId) && f.endsWith('.md'));
    if (match) {
      try {
        const content = fs.readFileSync(path.join(reqDir, match), 'utf-8');
        const phaseMatch = content.match(/当前阶段[：:]\s*(\S+)/);
        return phaseMatch ? phaseMatch[1] : dir;
      } catch {
        return dir;
      }
    }
  }
  return null;
}

function getHarnessMode(rootDir) {
  const modeFile = path.join(rootDir, '.claude', 'harness-mode');
  try {
    return fs.readFileSync(modeFile, 'utf-8').trim() || 'collaborative';
  } catch {
    return 'collaborative';
  }
}

function logAction(rootDir, action) {
  const logFile = path.join(rootDir, '.claude', '.watchdog-actions.log');
  const line = `${new Date().toISOString()} | ${action}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {
    // 日志写入失败不影响主流程
  }
}

function updateReqState(state, reqId, currentPhase) {
  if (!state.reqs[reqId]) {
    state.reqs[reqId] = {
      phase: currentPhase,
      editCount: 0,
      phaseChanges: [],
      transitions: [],
      firstSeen: new Date().toISOString()
    };
  }

  const req = state.reqs[reqId];
  req.editCount = (req.editCount || 0) + 1;

  if (currentPhase && currentPhase !== req.phase) {
    req.transitions.push({ from: req.phase, to: currentPhase, at: new Date().toISOString() });
    req.phase = currentPhase;
    req.editCount = 0; // 阶段变化，重置停滞计数
  }

  return req;
}

function detectStagnation(req) {
  return req.editCount >= STAGNATION_THRESHOLD && req.phase !== 'completed';
}

function detectLoop(req) {
  // 检测是否有状态来回切换
  if (req.transitions.length < LOOP_THRESHOLD * 2) return null;

  const recent = req.transitions.slice(-6);
  const pairs = {};
  for (const t of recent) {
    const key = `${t.from}<->${t.to}`;
    const reverseKey = `${t.to}<->${t.from}`;
    pairs[key] = (pairs[key] || 0) + 1;
    if (pairs[reverseKey]) pairs[key] += pairs[reverseKey];
  }

  for (const [pair, count] of Object.entries(pairs)) {
    if (count >= LOOP_THRESHOLD) return pair;
  }
  return null;
}

function formatDiagnosis(state, reqId) {
  const req = state.reqs[reqId];
  if (!req) return `REQ ${reqId}: 无追踪数据`;

  const lines = [`REQ ${reqId}:`];
  lines.push(`  当前阶段: ${req.phase}`);
  lines.push(`  编辑次数: ${req.editCount}`);
  lines.push(`  首次追踪: ${req.firstSeen}`);
  lines.push(`  状态切换: ${req.transitions.length} 次`);

  if (detectStagnation(req)) {
    lines.push(`  ⚠️ 停滞检测: 编辑 ${req.editCount} 次未推进阶段 (阈值: ${STAGNATION_THRESHOLD})`);
  }

  const loop = detectLoop(req);
  if (loop) {
    lines.push(`  ⚠️ 循环检测: 状态 ${loop} 反复切换 (阈值: ${LOOP_THRESHOLD})`);
  }

  return lines.join('\n');
}

async function runAsHook(rootDir) {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const reqId = getActiveReqId(rootDir);
  if (!reqId) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  const currentPhase = getReqPhase(rootDir, reqId);
  const state = loadState(rootDir);
  const req = updateReqState(state, reqId, currentPhase);

  const isStagnant = detectStagnation(req);
  const loopPair = detectLoop(req);

  saveState(rootDir, state);

  if (!isStagnant && !loopPair) {
    console.log(JSON.stringify({ decision: 'allow' }));
    return;
  }

  // 构建提醒消息
  const warnings = [];
  if (isStagnant) {
    warnings.push(`REQ ${reqId} 在 "${req.phase}" 阶段已编辑 ${req.editCount} 次未推进。考虑：拆分子任务、请求帮助、或标记为 blocked。`);
  }
  if (loopPair) {
    warnings.push(`REQ ${reqId} 状态 ${loopPair} 反复切换。考虑：确认阻塞原因并记录到 REQ 的"阻塞/搁置说明"章节。`);
  }

  const mode = getHarnessMode(rootDir);

  if (mode === 'autonomous') {
    // 静默执行恢复策略 + 记录到日志
    const action = isStagnant
      ? `停滞恢复：REQ ${reqId} 在 "${req.phase}" 阶段已编辑 ${req.editCount} 次未推进，执行拆分或标记 blocked`
      : `循环恢复：REQ ${reqId} 状态 ${loopPair} 反复切换，记录根因到 REQ 阻塞说明`;
    logAction(rootDir, action);
    console.log(JSON.stringify({
      decision: 'allow',
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[Watchdog] 🔄 ${isStagnant ? `停滞恢复：拆分 REQ ${reqId} 或标记 blocked` : `循环恢复：记录 ${loopPair} 根因到 REQ 阻塞说明`}`
      }
    }));
  } else if (mode === 'supervised') {
    // 强制选择恢复策略
    console.log(JSON.stringify({
      decision: 'allow',
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[Watchdog] ⚠️ 必须选择恢复策略：${warnings.join(' ')}`
      }
    }));
  } else {
    // collaborative：友好提醒
    console.log(JSON.stringify({
      decision: 'allow',
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[Watchdog] 💡 ${warnings.join(' ')}`
      }
    }));
  }
}

function runDiagnose(rootDir) {
  const state = loadState(rootDir);
  const reqId = getActiveReqId(rootDir);

  console.log('═══ Watchdog 诊断 ═══');
  console.log(`活跃 REQ: ${reqId || '无'}`);
  console.log(`最后更新: ${state.lastUpdate || '无'}`);
  console.log('');

  if (reqId && state.reqs[reqId]) {
    console.log(formatDiagnosis(state, reqId));
  } else if (reqId) {
    console.log(`REQ ${reqId}: 尚无追踪数据（刚启动）`);
  }

  // 显示所有追踪的 REQ
  const trackedReqs = Object.keys(state.reqs).filter(id => id !== reqId);
  if (trackedReqs.length > 0) {
    console.log('\n--- 历史追踪 ---');
    for (const id of trackedReqs) {
      const req = state.reqs[id];
      console.log(`${id}: ${req.phase} (编辑 ${req.editCount}, 切换 ${req.transitions.length} 次)`);
    }
  }

  if (!reqId && trackedReqs.length === 0) {
    console.log('无追踪数据。Watchdog 在有活跃 REQ 时自动记录。');
  }
}

// 入口
const args = process.argv.slice(2);
const rootDir = getGitRoot();

if (args.includes('--diagnose')) {
  runDiagnose(rootDir);
} else {
  runAsHook(rootDir);
}
