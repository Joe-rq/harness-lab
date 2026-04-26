#!/usr/bin/env node

/**
 * Scope Guard — PreToolUse hook for Write/Edit
 *
 * Checks if the target file is within the active REQ's declared scope.
 * Out-of-scope writes → block with reason + log to scope-violations.log
 * No scope declaration in REQ → allow (backward compatible)
 * No active REQ → allow (req-check.sh handles that separately)
 *
 * Output format (exit 0 always):
 *   - Allow: no output
 *   - Block: { "decision": "block", "reason": "..." }
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

function findReqFile(rootDir, reqId) {
  for (const dir of ['in-progress']) {
    const reqDir = path.join(rootDir, 'requirements', dir);
    if (!fs.existsSync(reqDir)) continue;
    const files = fs.readdirSync(reqDir);
    const match = files.find(f => f.startsWith(reqId) && f.endsWith('.md'));
    if (match) return path.join(reqDir, match);
  }
  return null;
}

/**
 * Extract scope patterns from REQ content.
 * Looks for the "范围" section and parses glob-like file patterns.
 *
 * Supported formats:
 *   - `scripts/*.mjs`
 *   - `requirements/**`
 *   - scripts/scope-guard.mjs
 *   - .claude/settings.local.json
 *
 * Also reads CAN section for explicit allow lists.
 */
function extractScopePatterns(reqContent) {
  const patterns = [];
  let inScope = false;
  let inCan = false;

  for (const line of reqContent.split('\n')) {
    // Track section boundaries
    if (/^##\s/.test(line)) {
      inScope = false;
      inCan = false;
      if (/^##\s*范围/.test(line)) inScope = true;
      continue;
    }
    if (/^###\s/.test(line) && inScope) {
      inCan = false;
    }

    if (!inScope) continue;

    // Track CAN/CANNOT subsections
    if (/^\*\*允许/.test(line)) { inCan = true; continue; }
    if (/^\*\*禁止/.test(line)) { inCan = false; continue; }
    if (/^\*\*/.test(line)) { inCan = false; }

    // Strip list marker and indentation
    const trimmed = line.replace(/^\s*-\s*/, '').trim();

    // Extract from backtick-wrapped paths: `scripts/foo.mjs`
    const backtickMatch = trimmed.match(/^`([^`]+)`$/);
    if (backtickMatch) {
      const p = backtickMatch[1];
      if (!patterns.some(e => e.pattern === p)) {
        patterns.push({ pattern: p, type: 'allow' });
      }
      continue;
    }

    // Extract from CAN list items: "可修改的文件 / 模块：scripts/foo.mjs（新建）"
    if (inCan) {
      const filePattern = extractFilePattern(trimmed);
      if (filePattern && !patterns.some(e => e.pattern === filePattern)) {
        patterns.push({ pattern: filePattern, type: 'allow' });
      }
      continue;
    }

    // Skip non-file lines in scope section (labels, descriptions, blockquotes)
    if (!trimmed || trimmed.startsWith('>') || trimmed.startsWith('涉及') ||
        trimmed.startsWith('影响') || trimmed.startsWith('**') ||
        trimmed.startsWith('可') || trimmed.startsWith('不可')) continue;

    // Try to extract file patterns from free-form lines
    const filePattern = extractFilePattern(trimmed);
    if (filePattern && !patterns.some(e => e.pattern === filePattern)) {
      patterns.push({ pattern: filePattern, type: 'allow' });
    }
  }

  return patterns;
}

/**
 * Extract a file pattern from a line item.
 * Handles: "scripts/scope-guard.mjs（新建）" → "scripts/scope-guard.mjs"
 * Handles: "scripts/*.mjs" → "scripts/*.mjs"
 * Handles: "requirements/**" → "requirements/**"
 */
function extractFilePattern(text) {
  // Remove trailing parenthetical annotations like （新建）、（修改）
  const cleaned = text.replace(/[（(][^）)]*[）)]\s*$/, '').trim();
  // Check if it looks like a file path or glob pattern
  if (/^[\w./\-*]+$/.test(cleaned) && (cleaned.includes('/') || cleaned.includes('*') || cleaned.includes('.'))) {
    return cleaned;
  }
  return null;
}

/**
 * Match a file path against a glob-like pattern.
 * Supports: exact match, * (single segment), ** (any depth)
 */
function matchGlob(filePath, pattern) {
  // Normalize: strip leading ./
  const normFile = filePath.replace(/^\.\//, '');
  const normPattern = pattern.replace(/^\.\//, '');

  // Exact match
  if (normFile === normPattern) return true;

  // Convert glob to regex
  const regexStr = normPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex specials (except * and ?)
    .replace(/\*\*/g, '{{GLOBSTAR}}')      // Preserve **
    .replace(/\*/g, '[^/]*')                // * matches within single segment
    .replace(/\{{GLOBSTAR}}/g, '.*');       // ** matches any depth

  try {
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(normFile);
  } catch {
    return false;
  }
}

/**
 * Check if a file path matches any of the scope patterns.
 */
function isInRange(filePath, patterns) {
  if (patterns.length === 0) return true; // No patterns = no restriction
  return patterns.some(p => p.type === 'allow' && matchGlob(filePath, p.pattern));
}

/**
 * Log a scope violation.
 */
function logViolation(rootDir, reqId, filePath, patterns) {
  const logFile = path.join(rootDir, '.claude', 'scope-violations.log');
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} | ${reqId} | BLOCKED | ${filePath} | allowed: ${patterns.map(p => p.pattern).join(', ')}\n`;
  try {
    fs.appendFileSync(logFile, entry);
  } catch {
    // Best effort — don't fail the hook if logging fails
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
    // No valid input, allow
    return;
  }

  const rootDir = event.cwd ? event.cwd.replace(/\/+$/, '') : getGitRoot();

  // Only intercept Write and Edit
  const toolName = event.tool_name || '';
  if (toolName !== 'Write' && toolName !== 'Edit') return;

  // Extract target file path from tool input
  const filePath = event.tool_input?.file_path;
  if (!filePath) return; // No file path, can't check

  // Get relative path from repo root
  const relPath = path.relative(rootDir, filePath);
  if (!relPath || relPath.startsWith('..')) return; // Outside repo, don't interfere

  // 1. Check if there's an active REQ
  const reqId = getActiveReqId(rootDir);
  if (!reqId) return; // No active REQ — req-check.sh handles that

  // 2. Find the REQ file
  const reqFile = findReqFile(rootDir, reqId);
  if (!reqFile) return; // Can't find REQ file, allow

  // 3. Read REQ content
  let reqContent;
  try {
    reqContent = fs.readFileSync(reqFile, 'utf-8');
  } catch {
    return;
  }

  // 4. Extract scope patterns
  const patterns = extractScopePatterns(reqContent);
  if (patterns.length === 0) return; // No scope declaration = backward compatible, allow

  // 5. Check if target is in range
  if (isInRange(relPath, patterns)) return; // In range, allow

  // 6. Out of range — block + log
  const mode = getHarnessMode(rootDir);
  logViolation(rootDir, reqId, relPath, patterns);

  const patternList = patterns.map(p => `  - ${p.pattern}`).join('\n');

  if (mode === 'supervised') {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `[ScopeGuard] 文件 "${relPath}" 不在 REQ ${reqId} 的声明范围内。\n\n允许的范围：\n${patternList}\n\n如需修改此文件，请先更新 REQ 的范围声明。`
    }));
  } else {
    // collaborative 模式：温和提醒
    console.log(JSON.stringify({
      decision: 'block',
      reason: `[ScopeGuard] 提醒：文件 "${relPath}" 不在 REQ ${reqId} 的声明范围内。\n\n允许的范围：\n${patternList}\n\n如果确实需要修改此文件，请先更新 REQ 的范围声明，或再次尝试。`
    }));
  }
}

main();
