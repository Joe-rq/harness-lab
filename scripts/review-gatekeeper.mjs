#!/usr/bin/env node

/**
 * Review Gatekeeper — PreToolUse hook for Agent tool
 *
 * Ensures review/audit sub-agents use read-only subagent_types (Explore/Plan).
 * Blocks general-purpose agents with review-related names/descriptions.
 *
 * Output format (exit 0 always):
 *   - Allow: no output
 *   - Block: { "decision": "block", "reason": "..." }
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const REVIEW_KEYWORDS = [
  'review', 'audit', 'inspect', '审查', '复核', '代码审查',
  'code-review', 'code review', 'qa', 'quality',
];

const READONLY_TYPES = ['Explore', 'Plan', '42plugin-eval-grader', '42plugin-eval-comparator', '42plugin-eval-classifier'];

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

function isReviewAgent(toolInput) {
  const name = (toolInput.name || '').toLowerCase();
  const description = (toolInput.description || '').toLowerCase();
  const combined = `${name} ${description}`;
  return REVIEW_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));
}

function isReadonlyType(subagentType) {
  if (!subagentType) return false;
  return READONLY_TYPES.includes(subagentType);
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
  if (toolName !== 'Agent') return;

  const toolInput = event.tool_input || {};
  const subagentType = toolInput.subagent_type || '';

  // Not a review agent → allow
  if (!isReviewAgent(toolInput)) return;

  // Review agent using read-only type → allow
  if (isReadonlyType(subagentType)) return;

  // Review agent using write-capable type → block
  const rootDir = event.cwd ? event.cwd.replace(/\/+$/, '') : getGitRoot();
  const mode = getHarnessMode(rootDir);
  const readonlyList = READONLY_TYPES.join(', ');

  if (mode === 'supervised') {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `[ReviewGatekeeper] 审查 Agent 必须使用只读类型。\n\n当前类型: "${subagentType || '未指定'}"\n允许的只读类型: ${readonlyList}\n\n请将 subagent_type 改为 Explore 或 Plan。`
    }));
  } else {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `[ReviewGatekeeper] 提醒：审查 Agent 应使用只读类型以确保审查独立性。\n\n当前类型: "${subagentType || '未指定'}"\n建议改为: Explore 或 Plan\n\n如果确实需要写入能力，请重新审视审查流程设计。`
    }));
  }
}

main();
