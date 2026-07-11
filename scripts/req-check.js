#!/usr/bin/env node

/**
 * REQ Check Hook - 跨平台版本 (OPT-1A: stdin 契约 + Bash 写入门禁)
 *
 * PreToolUse hook，matcher: Write|Edit|NotebookEdit|Bash
 *   - Write/Edit/NotebookEdit: 取 tool_input.file_path 过白名单 + REQ 检查
 *   - Bash: 启发式判写命令；纯读放行，写命令等同 Write 走 REQ 检查
 *
 * 输入契约：Claude Code 通过 stdin JSON 传 {tool_name, tool_input, cwd}。
 * Exit 0 = allow, Exit 2 = block
 *
 * 历史背景：原版通过 process.env.CLAUDE_TARGET_FILE 读路径（恒空，白名单死代码），
 * 且 matcher 仅 Write|Edit（Bash 写完全绕过）。OPT-1A 修复这两处。
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { getExemptPath, getProgressPath } from './worktree-utils.mjs';
import { analyzeHookWrite, allTargetsAreGovernanceWrites } from './write-target-policy.mjs';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function getGitRoot(startDir = process.cwd()) {
  let candidate = process.cwd();
  try {
    if (typeof startDir === 'string' && fs.statSync(startDir).isDirectory()) candidate = path.resolve(startDir);
  } catch {
    // Invalid/unreadable event cwd falls back to the hook process cwd.
  }
  try {
    return execFileSync('git', ['-C', candidate, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return candidate;
  }
}

function readProgressFile(rootDir) {
  const progressPath = getProgressPath(rootDir);
  if (!fs.existsSync(progressPath)) {
    return null;
  }
  return fs.readFileSync(progressPath, 'utf-8');
}

function parseActiveReq(content) {
  const match = content.match(/Current active REQ:\s*(.+)/);
  if (!match) return null;
  return match[1].trim();
}

function findActiveReqPath(rootDir, reqId) {
  const reqDir = path.join(rootDir, 'requirements', 'in-progress');
  if (!fs.existsSync(reqDir)) return null;

  const exactPath = path.join(reqDir, `${reqId}.md`);
  if (fs.existsSync(exactPath)) return exactPath;

  if (!/^REQ-\d{4}-\d{3}$/.test(reqId)) return null;

  const fileName = fs.readdirSync(reqDir)
    .find((name) => name.startsWith(`${reqId}-`) && name.endsWith('.md'));
  return fileName ? path.join(reqDir, fileName) : null;
}

function isExempt(rootDir) {
  const exemptPath = getExemptPath(rootDir);
  const globalExemptPath = path.join(rootDir, '.claude', '.req-exempt');
  return fs.existsSync(exemptPath) || fs.existsSync(globalExemptPath);
}

/**
 * Read PreToolUse hook event from stdin (Claude Code passes JSON via stdin).
 * Returns null on missing/invalid input → allow (don't block on parse failure).
 */
async function readHookEvent() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    if (chunks.length === 0) return null;
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return null;
  }
}

function printBlockMessage(activeReq) {
  log('\n╔════════════════════════════════════════════════════════════╗', 'red');
  log('║              🚫 REQ ENFORCEMENT: BLOCKED                   ║', 'red');
  log('╠════════════════════════════════════════════════════════════╣', 'red');

  if (activeReq && activeReq !== 'none' && activeReq !== '无') {
    log(`║  Active REQ (${activeReq}) is not ready for implementation.`, 'yellow');
    log('║', 'red');
    log('║  Blocking issues:', 'yellow');

    // Try to read REQ file for more details
    const rootDir = getGitRoot();
    const reqPath = findActiveReqPath(rootDir, activeReq);

    if (reqPath && fs.existsSync(reqPath)) {
      const content = fs.readFileSync(reqPath, 'utf-8');

      // Check for template placeholders
      const placeholders = [
        { pattern: /说明为什么要做这件事。/, text: '背景 still contains template placeholder' },
        { pattern: /- 目标 1/, text: '目标 still contains template placeholder' },
        { pattern: /- 目标 2/, text: '目标 still contains template placeholder' },
        { pattern: /- 标准 1/, text: '验收标准 still contains template placeholder' },
        { pattern: /- 标准 2/, text: '验收标准 still contains template placeholder' },
      ];

      placeholders.forEach(({ pattern, text }) => {
        if (pattern.test(content)) {
          log(`║  - ${text}`, 'yellow');
        }
      });

      // Check status
      if (content.includes('当前状态：draft')) {
        log('║  - REQ status is "draft" (run req:start first)', 'yellow');
      }
    } else {
      log('║  - REQ file not found in requirements/in-progress/', 'yellow');
    }
  } else {
    log('║  No active REQ found.', 'yellow');
    log('║', 'red');
    log('║  File modifications require a REQ for:', 'yellow');
    log('║    - 3+ file changes', 'yellow');
    log('║    - New feature development', 'yellow');
    log('║    - Architecture/flow changes', 'yellow');
  }

  log('║', 'red');
  log('║  To proceed:', 'cyan');
  log('║    1. Create a REQ: npm run req:create -- --title "..."', 'cyan');
  log('║    2. Fill in the REQ content (background, goals, acceptance criteria)', 'cyan');
  log('║    3. Start the REQ: npm run req:start -- --id REQ-XXXX-NNN', 'cyan');
  log('║', 'red');
  log('║  For emergency fixes, create exemption:', 'cyan');
  log('║    touch .claude/.req-exempt', 'cyan');
  log('║    echo "$(date -Iseconds) | CREATE | manual | <reason>" >> .claude/exempt-audit.log', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'red');
}

/**
 * Core REQ enforcement: if there is no compliant active REQ, block (exit 2).
 * Preserves the original main() validation logic.
 */
function enforceReqOrBlock(rootDir) {
  // Read progress file
  const progressContent = readProgressFile(rootDir);
  if (!progressContent) {
    log('\n⚠️  Harness Lab: .claude/progress.txt not found', 'yellow');
    log('     Run harness-setup to initialize governance framework.\n', 'yellow');
    process.exit(0); // Allow if framework not initialized
  }

  // Parse active REQ
  const activeReq = parseActiveReq(progressContent);

  // Check if there's a valid active REQ
  if (activeReq && activeReq !== 'none' && activeReq !== '无') {
    // Check if REQ file exists and is not in draft state
    const reqPath = findActiveReqPath(rootDir, activeReq);

    if (reqPath && fs.existsSync(reqPath)) {
      const reqContent = fs.readFileSync(reqPath, 'utf-8');

      // Check for draft status
      if (!reqContent.includes('当前状态：draft')) {
        // Check for template placeholders
        const hasPlaceholders =
          reqContent.includes('说明为什么要做这件事。') ||
          reqContent.includes('- 目标 1') ||
          reqContent.includes('- 目标 2') ||
          reqContent.includes('- 标准 1') ||
          reqContent.includes('- 标准 2');

        if (!hasPlaceholders) {
          // REQ is valid and ready
          process.exit(0);
        }
      }
    }
  }

  // Block the operation
  printBlockMessage(activeReq);
  process.exit(2);
}

async function main() {
  // 1. Read hook event from stdin (Claude Code contract).
  const event = await readHookEvent();
  if (!event) {
    // No stdin / direct invocation → allow (don't block on parse failure)
    process.exit(0);
  }

  const eventCwd = typeof event.cwd === 'string'
    ? path.resolve(event.cwd)
    : process.cwd();
  const rootDir = getGitRoot(eventCwd);

  // Check exemption
  if (isExempt(rootDir)) {
    process.exit(0);
  }

  const toolName = event.tool_name || '';
  const toolInput = event.tool_input || {};

  // 2. Resolve every supported write target through the shared policy.
  const analysis = analyzeHookWrite({ tool_name: toolName, tool_input: toolInput }, rootDir);
  if (analysis.writes) {
    // Governance bootstrap is allowed only when every canonical target is a
    // governance artifact. A mixed or unresolved write must pass normal REQ enforcement.
    if (allTargetsAreGovernanceWrites(analysis)) process.exit(0);
    enforceReqOrBlock(rootDir);
    return; // enforceReqOrBlock always exits
  }

  if (toolName === 'Bash') process.exit(0); // Pure read Bash command.

  // Other tool_name (not in matcher in practice) → allow
  process.exit(0);
}

main();
