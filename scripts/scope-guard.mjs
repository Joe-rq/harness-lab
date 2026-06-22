#!/usr/bin/env node

/**
 * Scope Guard — PreToolUse hook for Write/Edit
 *
 * Checks if the target file is within the active REQ's declared scope.
 * Out-of-scope writes → block with reason + log to scope-violations.log
 * No scope declaration in REQ → allow (backward compatible), unless the REQ
 * declares a read-only/no-code-change boundary.
 * No active REQ → allow (req-check.js handles that separately)
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
  let inCannot = false;

  for (const line of reqContent.split('\n')) {
    // Track section boundaries
    if (/^##\s/.test(line)) {
      inScope = false;
      inCan = false;
      inCannot = false;
      if (/^##\s*范围/.test(line)) inScope = true;
      continue;
    }
    if (/^###\s/.test(line) && inScope) {
      inCan = false;
      inCannot = false;
    }

    if (!inScope) continue;

    // Track CAN/CANNOT subsections
    if (/^\*\*允许/.test(line)) { inCan = true; inCannot = false; continue; }
    if (/^\*\*禁止/.test(line)) { inCan = false; inCannot = true; continue; }
    if (/^\*\*/.test(line)) { inCan = false; inCannot = false; }

    // Strip list marker and indentation
    const trimmed = line.replace(/^\s*-\s*/, '').trim();

    // Extract from backtick-wrapped paths anywhere in the line.
    const backtickPatterns = extractBacktickPatterns(trimmed);
    if (backtickPatterns.length > 0) {
      for (const p of backtickPatterns) {
        addPattern(patterns, p, inCannot ? 'deny' : 'allow');
      }
      continue;
    }

    // Extract from CAN list items: "可修改的文件 / 模块：scripts/foo.mjs（新建）"
    if (inCan || inCannot) {
      for (const filePattern of extractFilePatterns(trimmed)) {
        addPattern(patterns, filePattern, inCannot ? 'deny' : 'allow');
      }
      continue;
    }

    // Skip non-file lines in scope section (labels, descriptions, blockquotes)
    if (!trimmed || trimmed.startsWith('>') || trimmed.startsWith('涉及') ||
        trimmed.startsWith('影响') || trimmed.startsWith('**') ||
        trimmed.startsWith('可') || trimmed.startsWith('不可')) continue;

    // Try to extract file patterns from free-form lines
    const filePattern = extractFilePattern(trimmed);
    if (filePattern) {
      addPattern(patterns, filePattern, 'allow');
    }
  }

  return patterns;
}

function addPattern(patterns, pattern, type) {
  if (!pattern) return;
  if (!patterns.some(e => e.pattern === pattern && e.type === type)) {
    patterns.push({ pattern, type });
  }
}

function extractBacktickPatterns(text) {
  const patterns = [];
  const regex = /`([^`]+)`/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const pattern = extractFilePattern(match[1]);
    if (pattern) patterns.push(pattern);
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
  const cleaned = normalizePatternCandidate(text);
  // Check if it looks like a file path or glob pattern
  if (/^[\w./\-*]+$/.test(cleaned) && looksLikeRepoPath(cleaned)) {
    return cleaned;
  }
  return null;
}

function extractFilePatterns(text) {
  const patterns = [];
  const direct = extractFilePattern(text);
  if (direct) patterns.push(direct);

  const pathRegex = /(^|[\s:：,，、])([.\w-]+(?:\/[.\w*{}@+-]+)+\/?)/g;
  let match;
  while ((match = pathRegex.exec(text)) !== null) {
    const pattern = extractFilePattern(match[2]);
    if (pattern) patterns.push(pattern);
  }

  return [...new Set(patterns)];
}

function normalizePatternCandidate(text) {
  let cleaned = text
    .replace(/[（(][^）)]*[）)]\s*$/, '')
    .replace(/^.*[：:]\s*/, '')
    .replace(/^["'`]|["'`]$/g, '')
    .replace(/[，,。；;、]+$/g, '')
    .trim();

  if (cleaned.endsWith('/')) {
    cleaned = `${cleaned}**`;
  }

  return cleaned;
}

function looksLikeRepoPath(value) {
  if (value.startsWith('http://') || value.startsWith('https://')) return false;
  if (value.includes('*') || value.includes('.')) return true;
  return /^(requirements|docs|scripts|app|server|src|tests|context|skills|\.claude|\.codex|\.github)\//.test(value);
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
function evaluateRange(filePath, patterns, { failClosed = false } = {}) {
  const denyPatterns = patterns.filter(p => p.type === 'deny');
  const deniedBy = denyPatterns.find(p => matchGlob(filePath, p.pattern));
  if (deniedBy) {
    return { allowed: false, reason: `denied by ${deniedBy.pattern}` };
  }

  const allowPatterns = patterns.filter(p => p.type === 'allow');
  if (allowPatterns.length === 0) {
    return {
      allowed: !failClosed,
      reason: failClosed ? 'no writable scope declared for read-only REQ' : 'no scope declaration',
    };
  }

  const allowed = allowPatterns.some(p => matchGlob(filePath, p.pattern));
  return {
    allowed,
    reason: allowed ? 'matched allow pattern' : 'not in declared allow scope',
  };
}

function hasReadOnlyBoundary(reqContent) {
  const boundaryText = [
    getMarkdownSection(reqContent, '## 非目标'),
    getMarkdownSection(reqContent, '## 范围'),
    getMarkdownSection(reqContent, '## 风险与回滚'),
  ].join('\n').replace(/\s+/g, ' ');

  const acceptanceText = getMarkdownSection(reqContent, '## 验收标准');
  const cannotText = getCannotSection(getMarkdownSection(reqContent, '## 范围'));

  return /只读分析|无代码改动|只产出报告|仅产出报告|仅做静态分析|不运行应用|无代码风险/.test(boundaryText) ||
    /^-\s*(\[[ xX]\]\s*)?无代码改动/m.test(acceptanceText) ||
    /(修改任何源代码|修改源代码|源代码或测试代码|测试代码|修改任何配置文件|修改配置文件)/i.test(cannotText);
}

function getMarkdownSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`${escaped}\\n+([\\s\\S]*?)(?=\\n## |$)`));
  return match ? match[1] : '';
}

function getCannotSection(scopeText) {
  const match = scopeText.match(/\*\*禁止（CANNOT）\*\*：?\n+([\s\S]*?)(?=\n\*\*|\n### |\n## |$)/);
  return match ? match[1] : '';
}

function isReadOnlyAllowPattern(pattern) {
  return pattern.startsWith('requirements/reports/') ||
    pattern === 'requirements/reports/**' ||
    pattern.startsWith('docs/reports/') ||
    pattern.includes('audit-report');
}

function buildEffectivePatterns(reqContent, patterns) {
  if (!hasReadOnlyBoundary(reqContent)) {
    return { patterns, readOnly: false };
  }

  const denyPatterns = patterns.filter(p => p.type === 'deny');
  const allowPatterns = patterns
    .filter(p => p.type === 'allow' && isReadOnlyAllowPattern(p.pattern));

  if (allowPatterns.length === 0) {
    allowPatterns.push({ pattern: 'requirements/reports/**', type: 'allow' });
  }

  return {
    patterns: [...allowPatterns, ...denyPatterns],
    readOnly: true,
  };
}

/**
 * Log a scope violation.
 */
function logViolation(rootDir, reqId, filePath, patterns) {
  const logFile = path.join(rootDir, '.claude', 'scope-violations.log');
  const timestamp = new Date().toISOString();
  const allowPatterns = patterns.filter(p => p.type === 'allow').map(p => p.pattern).join(', ');
  const denyPatterns = patterns.filter(p => p.type === 'deny').map(p => p.pattern).join(', ');
  const entry = `${timestamp} | ${reqId} | BLOCKED | ${filePath} | allowed: ${allowPatterns || '(none)'} | denied: ${denyPatterns || '(none)'}\n`;
  try {
    fs.appendFileSync(logFile, entry);
  } catch {
    // Best effort — don't fail the hook if logging fails
  }
}

/**
 * Classify a Bash command: does it write to the filesystem?
 * Inlined copy kept in sync with scripts/req-check.js.
 * If they drift, extract to scripts/bash-write-detect.mjs (REQ-2026-086).
 */
function classifyBashCommand(command) {
  if (!command || typeof command !== 'string') {
    return { writes: false, reason: null, targetPath: null };
  }

  const cleaned = command
    .replace(/(?:^|[\s;|&(])2>&1\b/g, ' ')
    .replace(/(?:2>&?|&>)\s*\/dev\/null\b/g, ' ')
    .replace(/>{1,2}\s*\/dev\/null\b/g, ' ')
    .replace(/(?:^|[\s;|&(])2>/g, ' ');

  let m = cleaned.match(/(?:^|[\s;|&(])>{1,2}\s*(?!&[12])([^\s;&|)]+)/);
  if (m) return { writes: true, reason: 'redirect', targetPath: m[1] };

  m = command.match(/\|\s*(?:tee|sponge)\b(?:\s+-a)?\s+([^\s;&|]+)/);
  if (m) return { writes: true, reason: 'pipe-write', targetPath: m[1] };

  if (/\b(?:sed|perl)\s+(?:[^;]*?\s)?-i(?:nplace)?\b/.test(command) ||
      /\bgawk\s+-i\s+inplace\b/.test(command) ||
      /\bawk\s+-i\s+inplace\b/.test(command)) {
    return { writes: true, reason: 'inplace-edit', targetPath: null };
  }

  m = command.match(/(?:^|[\s;|&(])(rm|mv|cp|touch|mkdir|ln)\b((?:\s+-[a-zA-Z-]+)*)(?:\s+([^\s;&|)]))/);
  if (m) {
    const opPart = command.slice(m.index);
    const tokens = opPart.split(/\s+/).filter(Boolean);
    let target = null;
    for (let i = 1; i < tokens.length; i++) {
      if (!tokens[i].startsWith('-')) { target = tokens[i]; break; }
    }
    return { writes: true, reason: 'file-op', targetPath: target };
  }

  if (/\bcat\s+<<.*?>/.test(command) || /\bcat\s*>{1,2}\s+/.test(command)) {
    m = command.match(/\bcat\s*>{1,2}\s+([^\s;&|]+)/);
    return { writes: true, reason: 'heredoc', targetPath: m ? m[1] : null };
  }

  return { writes: false, reason: null, targetPath: null };
}

/**
 * Return the repo write target of a Bash command, or null if not a write
 * or target unextractable. Used to judge scope for Bash writes.
 */
function bashWriteTarget(command) {
  const v = classifyBashCommand(command);
  if (!v.writes) return null;
  return v.targetPath; // null for inplace-edit → caller skips scope judgment
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

  const toolName = event.tool_name || '';

  // Resolve the write target as a repo-relative path.
  let relPath = null;
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'NotebookEdit') {
    const filePath = event.tool_input?.file_path;
    if (!filePath) return; // No file path, can't check
    relPath = path.relative(rootDir, filePath);
    if (!relPath || relPath.startsWith('..')) return; // Outside repo, don't interfere
  } else if (toolName === 'Bash') {
    const target = bashWriteTarget(event.tool_input?.command || '');
    if (!target) return; // Pure read, or unextractable write target → can't judge scope, allow (req-check still enforces REQ)
    relPath = path.isAbsolute(target) ? path.relative(rootDir, target) : target.replace(/^\.\//, '');
    if (!relPath || relPath.startsWith('..')) return; // Outside repo, don't interfere
  } else {
    return; // Other tools not governed by scope
  }

  // 1. Check if there's an active REQ
  const reqId = getActiveReqId(rootDir);
  if (!reqId) return; // No active REQ — req-check.js handles that

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
  const extractedPatterns = extractScopePatterns(reqContent);
  const { patterns, readOnly } = buildEffectivePatterns(reqContent, extractedPatterns);
  if (patterns.length === 0 && !readOnly) return; // No scope declaration = backward compatible, allow

  // 5. Check if target is in range
  const range = evaluateRange(relPath, patterns, { failClosed: readOnly });
  if (range.allowed) return; // In range, allow

  // 6. Out of range — block + log
  const mode = getHarnessMode(rootDir);
  logViolation(rootDir, reqId, relPath, patterns);

  const patternList = patterns
    .filter(p => p.type === 'allow')
    .map(p => `  - ${p.pattern}`)
    .join('\n') || '  - (none)';
  const prefix = readOnly
    ? `[ScopeGuard] 文件 "${relPath}" 被只读 REQ ${reqId} 阻断：${range.reason}。`
    : `[ScopeGuard] 文件 "${relPath}" 不在 REQ ${reqId} 的声明范围内：${range.reason}。`;

  if (mode === 'supervised') {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `${prefix}\n\n允许的范围：\n${patternList}\n\n如需修改此文件，请先更新 REQ 的范围声明。`
    }));
  } else {
    // collaborative 模式：温和提醒
    console.log(JSON.stringify({
      decision: 'block',
      reason: `${prefix}\n\n允许的范围：\n${patternList}\n\n如果确实需要修改此文件，请先更新 REQ 的范围声明，或再次尝试。`
    }));
  }
}

main();
