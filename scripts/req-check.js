#!/usr/bin/env node

/**
 * REQ Check Hook - 跨平台版本
 *
 * 在 Write/Edit 操作前执行，检查 REQ 状态
 * 替代原有的 bash 脚本，支持 Windows/macOS/Linux
 * Exit 0 = allow, Exit 2 = block
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
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
  const progressPath = path.join(rootDir, '.claude', 'progress.txt');
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

function isExempt(rootDir) {
  const exemptPath = path.join(rootDir, '.claude', '.req-exempt');
  return fs.existsSync(exemptPath);
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

function getTargetFileFromEnv() {
  // Claude Code may pass target file via environment variable
  return process.env.CLAUDE_TARGET_FILE || null;
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
    const reqPath = path.join(rootDir, 'requirements', 'in-progress', `${activeReq}.md`);

    if (fs.existsSync(reqPath)) {
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
  log('╚════════════════════════════════════════════════════════════╝\n', 'red');
}

function main() {
  const rootDir = getGitRoot();

  // Check exemption
  if (isExempt(rootDir)) {
    process.exit(0);
  }

  // Get target file if specified
  const targetFile = getTargetFileFromEnv();

  // Allow writes to requirements/, docs/plans/, .claude/ directories
  // This is needed to fill REQ content before starting implementation
  if (targetFile && isRequirementsOrDocsFile(targetFile, rootDir)) {
    process.exit(0);
  }

  // Read progress file
  const progressContent = readProgressFile(rootDir);
  if (!progressContent) {
    log('\n⚠️  Harness Lab: .claude/progress.txt not found', 'yellow');
    log('     Run harness-setup to initialize governance framework.\n', 'gray');
    process.exit(0); // Allow if framework not initialized
  }

  // Parse active REQ
  const activeReq = parseActiveReq(progressContent);

  // Check if there's a valid active REQ
  if (activeReq && activeReq !== 'none' && activeReq !== '无') {
    // Check if REQ file exists and is not in draft state
    const reqPath = path.join(rootDir, 'requirements', 'in-progress', `${activeReq}.md`);

    if (fs.existsSync(reqPath)) {
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

main();
