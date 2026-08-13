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
import { execFileSync } from 'child_process';
import { getExemptPath } from './worktree-utils.mjs';
import { analyzeHookWrite } from './write-target-policy.mjs';
import { getHookPolicy, readHarnessMode } from './hook-policy.mjs';

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

function isExempt(rootDir) {
  const worktreeExempt = getExemptPath(rootDir);
  const globalExempt = path.join(rootDir, '.claude', '.req-exempt');
  return fs.existsSync(worktreeExempt) || fs.existsSync(globalExempt);
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

  const eventCwd = typeof event.cwd === 'string'
    ? path.resolve(event.cwd)
    : process.cwd();
  const rootDir = getGitRoot(eventCwd);
  if (isExempt(rootDir)) return;

  const analysis = analyzeHookWrite(event, rootDir);
  if (!analysis.writes) return;

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

  // 5. Check every canonical target. One valid target cannot hide a later
  // out-of-scope target. Unresolved writes fail closed only once scope exists.
  const failures = [];
  for (const target of analysis.targets) {
    if (!target.resolved) {
      failures.push({ path: target.raw || '<unresolved>', reason: target.reason || 'unresolved write target' });
      continue;
    }
    if (!target.insideRepo || !target.relativePath) {
      failures.push({ path: target.raw, reason: 'target resolves outside the repository' });
      continue;
    }
    const range = evaluateRange(target.relativePath, patterns, { failClosed: readOnly });
    if (!range.allowed) failures.push({ path: target.relativePath, reason: range.reason });
  }
  if (analysis.unresolved && failures.length === 0) {
    failures.push({ path: '<unresolved>', reason: 'write command has unresolved targets' });
  }
  if (failures.length === 0) return;

  // 6. Out of range — block + log
  const { mode } = readHarnessMode(rootDir);
  const policy = getHookPolicy('scope.violation', mode);
  for (const failure of failures) {
    const safePath = String(failure.path).replace(/[\r\n\t]+/g, ' ');
    logViolation(rootDir, reqId, `${safePath} (${failure.reason})`, patterns);
  }

  const patternList = patterns
    .filter(p => p.type === 'allow')
    .map(p => `  - ${p.pattern}`)
    .join('\n') || '  - (none)';
  const failureList = failures
    .map((failure) => `  - ${String(failure.path).replace(/[\r\n\t]+/g, ' ')}: ${failure.reason}`)
    .join('\n');
  const prefix = readOnly
    ? `[ScopeGuard] 写入被只读 REQ ${reqId} 阻断。`
    : `[ScopeGuard] 写入包含 REQ ${reqId} 声明范围外或无法解析的目标。`;

  if (policy.action === 'block' && mode === 'supervised') {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `${prefix}\n\n失败目标：\n${failureList}\n\n允许的范围：\n${patternList}\n\n如需修改这些目标，请先更新 REQ 的范围声明。`
    }));
  } else if (policy.action === 'block') {
    // collaborative 模式：温和提醒
    console.log(JSON.stringify({
      decision: 'block',
      reason: `${prefix}\n\n失败目标：\n${failureList}\n\n允许的范围：\n${patternList}\n\n如果确实需要修改这些目标，请先更新 REQ 的范围声明，或使用有审计记录的临时豁免。`
    }));
  } else {
    console.log(JSON.stringify({
      decision: 'allow',
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: `${prefix}\n失败目标：\n${failureList}`,
      },
    }));
  }
}

main();
