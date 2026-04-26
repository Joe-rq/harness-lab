#!/usr/bin/env node

/**
 * Auto Review — Automated code review
 *
 * Reads git diff, checks against REQ scope, runs basic checks
 * (syntax, imports, security patterns), generates a Code Review report.
 *
 * Usage:
 *   node scripts/auto-review.mjs --req REQ-2026-045
 *   node scripts/auto-review.mjs --req REQ-2026-045 --output reports/
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SECURITY_PATTERNS = [
  { pattern: /eval\s*\(/, desc: 'eval() usage — potential code injection', severity: 'high' },
  { pattern: /innerHTML\s*[+=]/, desc: 'innerHTML assignment — potential XSS', severity: 'high' },
  { pattern: /exec\s*\(\s*[`"'].*\$\{/, desc: 'exec with template literal — potential command injection', severity: 'high' },
  { pattern: /password|secret|token|api[_-]?key/i, desc: 'Hardcoded credential reference', severity: 'medium' },
  { pattern: /console\.log\(/, desc: 'console.log — may be debug leftover', severity: 'low' },
  { pattern: /TODO|FIXME|HACK/i, desc: 'TODO/FIXME/HACK marker', severity: 'info' },
];

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--req' && args[i + 1]) parsed.reqId = args[++i];
    if (args[i] === '--output' && args[i + 1]) parsed.outputDir = args[++i];
  }
  return parsed;
}

function findReqFile(rootDir, reqId) {
  for (const dir of ['in-progress', 'completed']) {
    const reqDir = path.join(rootDir, 'requirements', dir);
    if (!fs.existsSync(reqDir)) continue;
    const files = fs.readdirSync(reqDir);
    const match = files.find(f => f.startsWith(reqId) && f.endsWith('.md'));
    if (match) return path.join(reqDir, match);
  }
  return null;
}

function getGitDiffStat(rootDir) {
  try {
    return execSync('git diff --stat HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function getGitDiffFiles(rootDir) {
  try {
    const diff = execSync('git diff --name-only HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!diff) return [];
    return diff.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function getGitDiffContent(rootDir) {
  try {
    return execSync('git diff HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 2 * 1024 * 1024,
    });
  } catch {
    return '';
  }
}

function extractScopePatterns(reqContent) {
  const patterns = [];
  let inScope = false;

  for (const line of reqContent.split('\n')) {
    if (/^##\s/.test(line)) {
      inScope = /^##\s*范围/.test(line);
      continue;
    }
    if (!inScope) continue;

    const trimmed = line.replace(/^\s*-\s*/, '').trim();
    const backtickMatch = trimmed.match(/^`([^`]+)`$/);
    if (backtickMatch) {
      patterns.push(backtickMatch[1]);
      continue;
    }

    const cleaned = trimmed.replace(/[（(][^）)]*[）)]\s*$/, '').trim();
    if (/^[\w./\-*]+$/.test(cleaned) && (cleaned.includes('/') || cleaned.includes('*') || cleaned.includes('.'))) {
      patterns.push(cleaned);
    }
  }

  return patterns;
}

function matchGlob(filePath, pattern) {
  const normFile = filePath.replace(/^\.\//, '');
  const normPattern = pattern.replace(/^\.\//, '');
  if (normFile === normPattern) return true;

  const regexStr = normPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{{GLOBSTAR}}/g, '.*');

  try {
    return new RegExp(`^${regexStr}$`).test(normFile);
  } catch {
    return false;
  }
}

function checkScopeCompliance(changedFiles, scopePatterns) {
  if (scopePatterns.length === 0) return { compliant: true, outOfScope: [] };

  const outOfScope = [];
  for (const file of changedFiles) {
    const inScope = scopePatterns.some(p => matchGlob(file, p));
    if (!inScope) outOfScope.push(file);
  }

  return { compliant: outOfScope.length === 0, outOfScope };
}

function checkSecurityPatterns(diffContent) {
  const findings = [];
  for (const { pattern, desc, severity } of SECURITY_PATTERNS) {
    const lines = diffContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      // Only check added lines (starting with +)
      if (!lines[i].startsWith('+') || lines[i].startsWith('+++')) continue;
      if (pattern.test(lines[i])) {
        findings.push({ desc, severity, line: lines[i].trim().replace(/^\+\s*/, '') });
      }
    }
  }
  return findings;
}

function checkFileBasics(rootDir, changedFiles) {
  const results = [];

  for (const file of changedFiles) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;

    // Check .mjs files for syntax
    if (file.endsWith('.mjs') || file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Check for common issues
        if (content.includes('process.exit(1)') && !file.includes('cli')) {
          results.push({ file, issue: 'process.exit(1) found — may not be appropriate for a library module', severity: 'info' });
        }
        if (/require\s*\(/.test(content) && file.endsWith('.mjs')) {
          results.push({ file, issue: 'require() in .mjs file — should use import', severity: 'medium' });
        }
      } catch {
        // Skip unreadable files
      }
    }

    // Check .sh files
    if (file.endsWith('.sh')) {
      try {
        execSync(`bash -n "${fullPath}"`, { stdio: 'pipe' });
      } catch {
        results.push({ file, issue: 'Shell syntax error', severity: 'high' });
      }
    }
  }

  return results;
}

function generateReport(reqId, diffStat, scopeCompliance, securityFindings, basicChecks) {
  const date = new Date().toISOString().split('T')[0];
  let report = `# ${reqId} Code Review\n\n`;
  report += `**日期**：${date}\n`;
  report += `**REQ**：${reqId}\n\n`;

  // Change scope
  report += `## 变更范围\n\n`;
  report += `| 文件 | 变更类型 | 行数 |\n`;
  report += `|------|---------|------|\n`;
  for (const line of diffStat.split('\n')) {
    if (!line.trim()) continue;
    const match = line.match(/^(\S+)\s+\|\s+(\d+)/);
    if (match) {
      const file = match[1];
      const lines = match[2];
      report += `| ${file} | 修改 | ${lines} |\n`;
    }
  }
  report += '\n';

  // Code review
  report += `## 代码审查\n\n`;
  report += `| 维度 | 结论 |\n`;
  report += `|------|------|\n`;

  // Scope compliance
  report += `| 范围合规 | ${scopeCompliance.compliant ? '✅ 所有文件在 REQ 范围内' : '⚠️ 有文件超出 REQ 范围'} |\n`;

  // Security
  const highSeverity = securityFindings.filter(f => f.severity === 'high').length;
  const medSeverity = securityFindings.filter(f => f.severity === 'medium').length;
  if (highSeverity > 0) {
    report += `| 安全检查 | ❌ ${highSeverity} 个高危、${medSeverity} 个中危 |\n`;
  } else if (medSeverity > 0) {
    report += `| 安全检查 | ⚠️ ${medSeverity} 个中危 |\n`;
  } else {
    report += `| 安全检查 | ✅ 无高危/中危安全发现 |\n`;
  }

  // Basic checks
  const highBasics = basicChecks.filter(b => b.severity === 'high').length;
  if (highBasics > 0) {
    report += `| 基础检查 | ❌ ${highBasics} 个问题 |\n`;
  } else {
    report += `| 基础检查 | ✅ 无问题 |\n`;
  }

  report += '\n';

  // Detailed findings
  if (securityFindings.length > 0) {
    report += `## 安全发现\n\n`;
    for (const f of securityFindings) {
      const icon = f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : '🔵';
      report += `- ${icon} **[${f.severity}]** ${f.desc}\n  > \`${f.line}\`\n\n`;
    }
  }

  if (basicChecks.length > 0) {
    report += `## 基础检查发现\n\n`;
    for (const b of basicChecks) {
      const icon = b.severity === 'high' ? '🔴' : b.severity === 'medium' ? '🟡' : '🔵';
      report += `- ${icon} **[${b.severity}]** ${b.file}: ${b.issue}\n`;
    }
    report += '\n';
  }

  if (!scopeCompliance.compliant) {
    report += `## 超出范围的文件\n\n`;
    for (const f of scopeCompliance.outOfScope) {
      report += `- \`${f}\`\n`;
    }
    report += '\n';
  }

  // Design decisions placeholder
  report += `## 设计决策\n\n`;
  report += `（由审查 Agent 或开发者补充）\n\n`;

  // Deferred items
  report += `## 延后项\n\n`;
  report += `（由审查 Agent 或开发者补充）\n`;

  return report;
}

async function main() {
  const args = parseArgs();
  if (!args.reqId) {
    console.error('Usage: node auto-review.mjs --req REQ-YYYY-NNN [--output dir]');
    process.exit(1);
  }

  const rootDir = getGitRoot();

  // Get git diff info
  const diffStat = getGitDiffStat(rootDir);
  const changedFiles = getGitDiffFiles(rootDir);
  const diffContent = getGitDiffContent(rootDir);

  if (changedFiles.length === 0) {
    console.log('No uncommitted changes found.');
    process.exit(0);
  }

  // Get REQ scope
  let scopePatterns = [];
  const reqFile = findReqFile(rootDir, args.reqId);
  if (reqFile) {
    const reqContent = fs.readFileSync(reqFile, 'utf-8');
    scopePatterns = extractScopePatterns(reqContent);
  }

  // Run checks
  const scopeCompliance = checkScopeCompliance(changedFiles, scopePatterns);
  const securityFindings = checkSecurityPatterns(diffContent);
  const basicChecks = checkFileBasics(rootDir, changedFiles);

  // Generate report
  const report = generateReport(args.reqId, diffStat, scopeCompliance, securityFindings, basicChecks);

  // Write report
  const reportsDir = path.join(rootDir, args.outputDir || 'requirements/reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, `${args.reqId}-code-review.md`);
  fs.writeFileSync(reportPath, report);

  console.log(`Code review report generated: ${reportPath}`);
}

main();
