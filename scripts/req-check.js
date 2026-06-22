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
import { execSync } from 'child_process';
import { getExemptPath, getProgressPath } from './worktree-utils.mjs';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
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

function isRequirementsOrDocsFile(targetFile, rootDir) {
  if (!targetFile) return false;

  // Normalize path separators for Windows
  const normalizedTarget = targetFile.replace(/\\/g, '/');
  const normalizedRoot = rootDir.replace(/\\/g, '/');

  const relPath = normalizedTarget.startsWith(normalizedRoot)
    ? normalizedTarget.slice(normalizedRoot.length + 1)
    : normalizedTarget;

  return relPath.startsWith('requirements/') ||
         relPath.startsWith('docs/plans/') ||
         relPath.startsWith('.claude/');
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

/**
 * Classify a Bash command: does it write to the filesystem?
 * High-frequency write patterns only; unmatched → reads (allow).
 * Returns { writes: bool, reason: string|null, targetPath: string|null }.
 *
 * targetPath is best-effort (the suspected write target) for whitelist/scope checks.
 * Theory: cannot be 100% complete (perl -e / python -c etc.) — strategy is
 * cover common patterns + document residual gaps (see REQ-2026-086).
 */
function classifyBashCommand(command) {
  if (!command || typeof command !== 'string') {
    return { writes: false, reason: null, targetPath: null };
  }

  // Strip non-governed noise: stderr redirections, discarded output.
  // (2> / &> to /dev/null, 2>&1, bare 2> are not "governed writes".)
  const cleaned = command
    .replace(/(?:^|[\s;|&(])2>&1\b/g, ' ')
    .replace(/(?:2>&?|&>)\s*\/dev\/null\b/g, ' ')
    .replace(/>{1,2}\s*\/dev\/null\b/g, ' ')
    .replace(/(?:^|[\s;|&(])2>/g, ' ');

  // 1. File write redirection: > or >> (to a real path, not &1/&2)
  let m = cleaned.match(/(?:^|[\s;|&(])>{1,2}\s*(?!&[12])([^\s;&|)]+)/);
  if (m) {
    return { writes: true, reason: 'redirect', targetPath: m[1] };
  }

  // 2. Pipe write: | tee / | sponge
  m = command.match(/\|\s*(?:tee|sponge)\b(?:\s+-a)?\s+([^\s;&|]+)/);
  if (m) {
    return { writes: true, reason: 'pipe-write', targetPath: m[1] };
  }

  // 3. In-place edit: sed -i / perl -i / gawk -i inplace / awk -i inplace
  if (/\b(?:sed|perl)\s+(?:[^;]*?\s)?-i(?:nplace)?\b/.test(command) ||
      /\bgawk\s+-i\s+inplace\b/.test(command) ||
      /\bawk\s+-i\s+inplace\b/.test(command)) {
    return { writes: true, reason: 'inplace-edit', targetPath: null };
  }

  // 4. File ops: rm/mv/cp/touch/mkdir/ln (first non-flag arg = target)
  m = command.match(/(?:^|[\s;|&(])(rm|mv|cp|touch|mkdir|ln)\b((?:\s+-[a-zA-Z-]+)*)(?:\s+([^\s;&|)]))/);
  if (m) {
    // Re-extract the first non-flag operand for targetPath
    const opPart = command.slice(m.index);
    const tokens = opPart.split(/\s+/).filter(Boolean);
    let target = null;
    for (let i = 1; i < tokens.length; i++) {
      if (!tokens[i].startsWith('-')) { target = tokens[i]; break; }
    }
    return { writes: true, reason: 'file-op', targetPath: target };
  }

  // 5. Heredoc / cat redirection write
  if (/\bcat\s+<<.*?>/.test(command) || /\bcat\s*>{1,2}\s+/.test(command)) {
    m = command.match(/\bcat\s*>{1,2}\s+([^\s;&|]+)/);
    return { writes: true, reason: 'heredoc', targetPath: m ? m[1] : null };
  }

  return { writes: false, reason: null, targetPath: null };
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

  const rootDir = event.cwd ? event.cwd.replace(/\/+$/, '') : getGitRoot();

  // Check exemption
  if (isExempt(rootDir)) {
    process.exit(0);
  }

  const toolName = event.tool_name || '';
  const toolInput = event.tool_input || {};

  // 2. Dispatch by tool_name
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'NotebookEdit') {
    const filePath = toolInput.file_path;

    // Whitelist: allow writing to requirements/ docs/plans/ .claude/ without a REQ
    // (needed to fill REQ content before starting implementation)
    if (filePath && isRequirementsOrDocsFile(filePath, rootDir)) {
      process.exit(0);
    }

    enforceReqOrBlock(rootDir);
    return; // enforceReqOrBlock always exits
  }

  if (toolName === 'Bash') {
    const cmd = toolInput.command || '';
    const verdict = classifyBashCommand(cmd);

    // Pure read commands → allow (zero friction for ls/grep/cat/find/etc.)
    if (!verdict.writes) {
      process.exit(0);
    }

    // Write command: whitelist by target path (e.g. writing into .claude/)
    if (verdict.targetPath && isRequirementsOrDocsFile(verdict.targetPath, rootDir)) {
      process.exit(0);
    }

    enforceReqOrBlock(rootDir);
    return;
  }

  // Other tool_name (not in matcher in practice) → allow
  process.exit(0);
}

main();
