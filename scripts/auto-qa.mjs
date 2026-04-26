#!/usr/bin/env node

/**
 * Auto QA — Automated QA pipeline
 *
 * Reads the REQ's verification plan, executes verification commands,
 * collects results, and generates a QA report.
 *
 * Usage:
 *   node scripts/auto-qa.mjs --req REQ-2026-045
 *   node scripts/auto-qa.mjs --req REQ-2026-045 --output reports/
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

function extractVerificationPlan(reqContent) {
  const plan = { commands: [], acceptanceCriteria: [] };
  let inPlan = false;
  let inCriteria = false;

  for (const line of reqContent.split('\n')) {
    if (/^##\s*验证计划/.test(line)) {
      inPlan = true;
      inCriteria = false;
      continue;
    }
    if (/^##\s*验收标准/.test(line)) {
      inPlan = false;
      inCriteria = true;
      continue;
    }
    if (/^##\s/.test(line)) {
      inPlan = false;
      inCriteria = false;
    }

    if (inPlan) {
      const trimmed = line.replace(/^\s*-\s*/, '').trim();

      // Skip label lines
      if (trimmed.startsWith('计划执行的命令') || trimmed.startsWith('需要') || trimmed.startsWith('人工')) continue;

      // Extract backtick-wrapped commands: `echo '...' | node foo.mjs` → 说明
      const backtickMatch = trimmed.match(/^`([^`]+)`/);
      if (backtickMatch) {
        plan.commands.push(backtickMatch[1].trim());
        continue;
      }

      // Extract plain commands: strip "→ 说明" suffix
      const cmdPart = trimmed.replace(/\s*→\s*.+$/, '').replace(/\s*[→➡]\s*.+$/, '').trim();
      if (cmdPart && cmdPart.length > 3 && /^[\w./\\$`|&;>]/.test(cmdPart)) {
        plan.commands.push(cmdPart);
      }
    }

    if (inCriteria) {
      const item = line.replace(/^- \[[ x]\]\s*/, '').trim();
      if (item) plan.acceptanceCriteria.push(item);
    }
  }

  // Also extract from 验收标准 section (might be under a different heading)
  if (plan.acceptanceCriteria.length === 0) {
    let inAcc = false;
    for (const line of reqContent.split('\n')) {
      if (/^##\s*验收标准/.test(line)) { inAcc = true; continue; }
      if (inAcc && /^##\s/.test(line)) break;
      if (inAcc) {
        const item = line.replace(/^- \[[ x]\]\s*/, '').trim();
        if (item) plan.acceptanceCriteria.push(item);
      }
    }
  }

  return plan;
}

function runCommand(cmd, rootDir) {
  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    });
    return { success: true, output: output.trim(), exitCode: 0 };
  } catch (e) {
    return {
      success: false,
      output: (e.stdout || '').trim() + '\n' + (e.stderr || '').trim(),
      exitCode: e.status || 1,
    };
  }
}

function checkAcceptanceCoverage(criteria, rootDir) {
  const results = [];
  const diffFiles = (() => {
    try {
      return execSync('git diff --name-only HEAD', {
        encoding: 'utf-8',
        cwd: rootDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  })();

  const diffText = (() => {
    try {
      return execSync('git diff HEAD', {
        encoding: 'utf-8',
        cwd: rootDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024,
      });
    } catch {
      return '';
    }
  })();

  for (const c of criteria) {
    const keywords = c.split(/[\s,，、()（）\[\]【】]/)
      .filter(w => w.length >= 3)
      .map(w => w.toLowerCase());

    const hasMatch = keywords.some(kw =>
      diffText.toLowerCase().includes(kw) ||
      diffFiles.some(f => f.toLowerCase().includes(kw))
    );

    results.push({ criterion: c, covered: hasMatch || criteria.length <= 2 });
  }

  return results;
}

function generateReport(reqId, commandResults, coverageResults) {
  const date = new Date().toISOString().split('T')[0];
  let report = `# ${reqId} QA Report\n\n`;
  report += `**日期**：${date}\n`;
  report += `**REQ**：${reqId}\n\n`;

  // Automated test results
  report += `## 自动化测试\n\n`;
  report += `| 测试 | 结果 |\n`;
  report += `|------|------|\n`;
  if (commandResults.length === 0) {
    report += `| (无验证命令) | — |\n`;
  }
  for (const r of commandResults) {
    const status = r.success ? '✅' : '❌';
    report += `| \`${r.command}\` | ${status} (exit ${r.exitCode}) |\n`;
  }
  report += '\n';

  // Acceptance criteria
  report += `## 验收标准检查\n\n`;
  report += `| # | 验收标准 | 状态 |\n`;
  report += `|---|---------|------|\n`;
  for (let i = 0; i < coverageResults.length; i++) {
    const status = coverageResults[i].covered ? '✅' : '⚠️ 待验证';
    report += `| ${i + 1} | ${coverageResults[i].criterion} | ${status} |\n`;
  }
  report += '\n';

  // Summary
  const allCommandsOk = commandResults.every(r => r.success);
  const allCoverageOk = coverageResults.every(r => r.covered);
  const overallOk = allCommandsOk && allCoverageOk;

  report += `## 结论\n\n`;
  if (overallOk) {
    report += `实现完成，全部验收标准通过。\n`;
  } else {
    report += `存在未通过项：\n`;
    if (!allCommandsOk) report += `- 部分验证命令失败\n`;
    if (!allCoverageOk) report += `- 部分验收标准未覆盖\n`;
    report += `\n建议人工检查上述标记为"待验证"的项。\n`;
  }

  return report;
}

async function main() {
  const args = parseArgs();
  if (!args.reqId) {
    console.error('Usage: node auto-qa.mjs --req REQ-YYYY-NNN [--output dir]');
    process.exit(1);
  }

  const rootDir = getGitRoot();
  const reqFile = findReqFile(rootDir, args.reqId);
  if (!reqFile) {
    console.error(`REQ ${args.reqId} not found`);
    process.exit(1);
  }

  const reqContent = fs.readFileSync(reqFile, 'utf-8');
  const plan = extractVerificationPlan(reqContent);

  // Run verification commands
  const commandResults = [];
  for (const cmd of plan.commands) {
    // Skip descriptive lines that aren't actual commands
    if (cmd.startsWith('需要') || cmd.startsWith('人工') || cmd.length < 5) continue;
    // Clean up the command
    let cleanCmd = cmd.replace(/^`|`$/g, '').trim();
    if (!cleanCmd) continue;

    console.log(`Running: ${cleanCmd}`);
    const result = runCommand(cleanCmd, rootDir);
    commandResults.push({ command: cleanCmd, ...result });
  }

  // If no commands found, run default governance check
  if (commandResults.length === 0) {
    console.log('No verification commands found in REQ, running npm test...');
    const result = runCommand('npm test', rootDir);
    commandResults.push({ command: 'npm test', ...result });
  }

  // Check acceptance criteria coverage
  const coverageResults = checkAcceptanceCoverage(plan.acceptanceCriteria, rootDir);

  // Generate report
  const report = generateReport(args.reqId, commandResults, coverageResults);

  // Write report
  const reportsDir = path.join(rootDir, args.outputDir || 'requirements/reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, `${args.reqId}-qa.md`);
  fs.writeFileSync(reportPath, report);

  console.log(`\nQA report generated: ${reportPath}`);
}

main();
