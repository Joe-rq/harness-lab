#!/usr/bin/env node

/**
 * Risk Tracker — PostToolUse hook for Write/Edit
 *
 * Evaluates risk level (R0-R4) based on file path patterns.
 * Ratchet mechanism: risk only goes up within a session.
 * R3+ operations trigger additional check reminders via stderr.
 *
 * Risk levels:
 *   R0 = No risk (Read operations)
 *   R1 = Low (docs, tests, requirements)
 *   R2 = Medium (ordinary source code)
 *   R3 = High (hook scripts, settings, config)
 *   R4 = Critical (governance-core scripts: req-check, stop-evaluator, scope-guard, etc.)
 *
 * Output: stderr text reminders (not JSON, not stdout — coexists with loop-detection)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Session-level ratchet state
const RATCHET_FILE = () => {
  try {
    const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    return path.join(root, '.claude', '.risk-ratchet');
  } catch {
    return null;
  }
};

// Risk classification rules (ordered: first match wins)
const RISK_RULES = [
  // R4: Governance-core scripts (the scripts that enforce the rules themselves)
  { pattern: /^scripts\/req-check\.sh$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/req-validation\.mjs$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/stop-evaluator\.mjs$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/scope-guard\.mjs$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/loop-detection\.mjs$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/error-classifier\.mjs$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/session-reflect\.mjs$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/commit-msg-check\.sh$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/invariant-extractor\.mjs$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/invariant-gate\.mjs$/, level: 4, label: '治理核心脚本' },
  { pattern: /^scripts\/req-cli\.mjs$/, level: 4, label: '治理核心脚本' },

  // R3: Hook-adjacent scripts and configuration
  { pattern: /^scripts\/.*\.mjs$/, level: 3, label: 'Hook 脚本' },
  { pattern: /^scripts\/.*\.sh$/, level: 3, label: 'Hook 脚本' },
  { pattern: /^\.claude\/settings\.local\.json$/, level: 3, label: 'Hook 配置' },
  { pattern: /^\.claude\/harness-mode$/, level: 3, label: '模式配置' },
  { pattern: /^\.claude\/commands\//, level: 3, label: 'Slash commands' },
  { pattern: /^CLAUDE\.md$/, level: 3, label: '项目指令' },

  // R2: Ordinary source code
  { pattern: /^scripts\/.*\.js$/, level: 2, label: '源码' },
  { pattern: /^src\//, level: 2, label: '源码' },
  { pattern: /^lib\//, level: 2, label: '源码' },
  { pattern: /^tests\//, level: 2, label: '测试代码' },

  // R1: Low-risk files
  { pattern: /^requirements\//, level: 1, label: '需求文档' },
  { pattern: /^docs\//, level: 1, label: '项目文档' },
  { pattern: /^context\//, level: 1, label: '经验文档' },
  { pattern: /\.md$/, level: 1, label: 'Markdown 文档' },
  { pattern: /^\.claude\/progress\.txt$/, level: 1, label: '进度文件' },
  { pattern: /^\.claude\/roadmap-status\.md$/, level: 1, label: '路线图状态' },
  { pattern: /^\.claude\/session-log\//, level: 1, label: '会话日志' },
];

function classifyRisk(relPath) {
  for (const rule of RISK_RULES) {
    if (rule.pattern.test(relPath)) {
      return { level: rule.level, label: rule.label };
    }
  }
  // Default: R2 (unknown file is medium risk)
  return { level: 2, label: '未知文件' };
}

function readRatchet() {
  const file = RATCHET_FILE();
  if (!file) return 0;
  try {
    return parseInt(fs.readFileSync(file, 'utf-8').trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function writeRatchet(level) {
  const file = RATCHET_FILE();
  if (!file) return;
  try {
    fs.writeFileSync(file, String(level));
  } catch {
    // Best effort
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
  if (toolName !== 'Write' && toolName !== 'Edit') return;

  const filePath = event.tool_input?.file_path;
  if (!filePath) return;

  // Get relative path
  let rootDir;
  try {
    rootDir = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return;
  }
  const relPath = path.relative(rootDir, filePath);
  if (!relPath || relPath.startsWith('..')) return;

  // Classify risk
  const { level, label } = classifyRisk(relPath);

  // Ratchet: only go up
  const currentMax = readRatchet();
  if (level > currentMax) {
    writeRatchet(level);
  }

  // R3+ reminder
  if (level >= 3) {
    const ratchetLevel = Math.max(level, currentMax);
    const warning = `[RiskTracker] ⚠️ R${level} ${label}: ${relPath}\n` +
      `当前会话最高风险: R${ratchetLevel}\n` +
      `提醒: 修改此文件后，请务必运行 \`npm test\` 验证治理系统完整性。`;
    process.stderr.write(warning + '\n');
  }
}

main();
