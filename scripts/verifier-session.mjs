#!/usr/bin/env node

/**
 * Verifier Session Runner
 *
 * Spawns an independent verifier agent via `claude --bare --agent verifier`
 * to review artifacts against REQ acceptance criteria in an isolated context.
 *
 * Usage:
 *   node scripts/verifier-session.mjs --req REQ-2026-066
 *   node scripts/verifier-session.mjs --req REQ-2026-066 --check-type security
 *   node scripts/verifier-session.mjs --req REQ-2026-066 --artifact scripts/foo.mjs
 *   node scripts/verifier-session.mjs --req REQ-2026-066 --output reports/
 *   node scripts/verifier-session.mjs --req REQ-2026-066 --report-suffix code-review
 *
 * Environment:
 *   HARNESS_VERIFIER_MODE=legacy|subagent  (default: subagent)
 *   HARNESS_VERIFIER_MAX_TURNS=N           (default: 10)
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

// --- Config ---

const AGENT_NAME = 'verifier';
const AGENT_FILE = `.claude/agents/${AGENT_NAME}.md`;
const DEFAULT_CHECK_TYPE = 'full';
const DEFAULT_MAX_TURNS = 10;
const CLI_TIMEOUT_MS = 120_000; // 2 minutes

// --- Helpers ---

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { checkType: DEFAULT_CHECK_TYPE, artifactPaths: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--req' && args[i + 1]) parsed.reqId = args[++i];
    if (args[i] === '--check-type' && args[i + 1]) parsed.checkType = args[++i];
    if (args[i] === '--output' && args[i + 1]) parsed.outputDir = args[++i];
    if (args[i] === '--report-suffix' && args[i + 1]) parsed.reportSuffix = args[++i];
    if (args[i] === '--artifact' && args[i + 1]) parsed.artifactPaths.push(args[++i]);
    if (args[i] === '--artifacts' && args[i + 1]) {
      parsed.artifactPaths.push(...args[++i].split(',').map(s => s.trim()).filter(Boolean));
    }
    if (args[i] === '--max-turns' && args[i + 1]) parsed.maxTurns = parseInt(args[++i], 10);
  }
  return parsed;
}

function getMode() {
  return process.env.HARNESS_VERIFIER_MODE || 'subagent';
}

function getMaxTurns(args) {
  if (args.maxTurns) return args.maxTurns;
  const envVal = process.env.HARNESS_VERIFIER_MAX_TURNS;
  if (envVal) return parseInt(envVal, 10);
  return DEFAULT_MAX_TURNS;
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

function getGitDiffFiles(rootDir) {
  try {
    return execSync('git diff --name-only HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function resolveArtifactPaths(rootDir, explicitPaths) {
  if (explicitPaths.length === 0) return getGitDiffFiles(rootDir);

  const normalized = [];
  for (const artifactPath of explicitPaths) {
    const relPath = artifactPath.replace(/^\.\//, '');
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Artifact not found: ${artifactPath}`);
      process.exit(1);
    }
    normalized.push(relPath);
  }
  return [...new Set(normalized)];
}

function validateCheckType(type) {
  const valid = ['scope', 'security', 'compliance', 'full'];
  if (!valid.includes(type)) {
    console.error(`Invalid check-type: "${type}". Must be one of: ${valid.join(', ')}`);
    process.exit(1);
  }
}

/**
 * Validate agent definition file exists to prevent silent fallback.
 */
function validateAgentExists(rootDir) {
  const agentPath = path.join(rootDir, AGENT_FILE);
  if (!fs.existsSync(agentPath)) {
    console.error(`Agent definition not found: ${AGENT_FILE}`);
    console.error(`Without this file, claude --agent ${AGENT_NAME} silently falls back to the default agent.`);
    console.error('Create the file or check the path.');
    process.exit(1);
  }
  return agentPath;
}

/**
 * Build the JSON envelope passed to the verifier agent.
 */
function buildEnvelope(reqId, checkType, artifactPaths, rootDir) {
  return JSON.stringify({
    reqId,
    checkType,
    artifactPaths,
    rootDir,
  });
}

/**
 * Build the prompt for the verifier agent.
 */
function buildPrompt(envelope) {
  return [
    'You received a verification envelope:',
    '',
    '```json',
    envelope,
    '```',
    '',
    'Execute the verification task as described in your instructions.',
    'Read the REQ file first, then examine each artifact.',
    'Return your findings in the structured JSON format.',
  ].join('\n');
}

/**
 * Extract the JSON findings from the verifier's text result.
 * The verifier may wrap JSON in a code block.
 */
function extractFindings(resultText) {
  // Try to find a JSON code block first
  const codeBlockMatch = resultText.match(/```json\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try {
      return normalizeFindings(JSON.parse(codeBlockMatch[1]));
    } catch {
      // Fall through
    }
  }

  // Try to parse a bare JSON object in the result
  const firstBrace = resultText.indexOf('{');
  const lastBrace = resultText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return normalizeFindings(JSON.parse(resultText.slice(firstBrace, lastBrace + 1)));
    } catch {
      // Fall through
    }
  }

  // Could not parse structured output
  return {
    status: 'error',
    findings: [],
    summary: 'Could not parse structured findings from verifier output',
    rawResult: resultText.substring(0, 2000),
  };
}

function normalizeFindings(parsed) {
  if (parsed.status) return parsed;

  const nested = parsed.verifierResult || parsed.result || null;
  if (nested && typeof nested === 'object') {
    const verdict = String(nested.status || nested.verdict || '').toLowerCase();
    const status = verdict === 'pass' ? 'pass' : verdict === 'fail' ? 'fail' : verdict === 'error' ? 'error' : 'error';
    const artifact = nested.artifact || null;
    const details = Array.isArray(nested.details) ? nested.details : [];
    return {
      status,
      checkType: nested.checkType || parsed.checkType,
      reqId: nested.reqId || parsed.reqId,
      findings: details.map((detail) => ({
        severity: detail.severity || 'info',
        category: detail.category || 'quality',
        description: detail.finding || detail.description || String(detail),
        file: detail.file || artifact,
        line: detail.line ?? null,
        evidence: detail.evidence || detail.rule || '',
      })),
      acceptanceCoverage: nested.acceptanceCoverage || [],
      summary: nested.summary || parsed.summary || 'Verifier returned a non-standard result shape; normalized by runner.',
      rawResult: parsed,
    };
  }

  return {
    status: 'error',
    findings: [],
    summary: 'Verifier returned JSON without a recognized status field',
    rawResult: parsed,
  };
}

// --- Subagent invocation ---

/**
 * Invoke the verifier agent via `claude --bare --agent verifier`.
 */
function invokeVerifier(rootDir, prompt, maxTurns) {
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', [
      '--bare',
      '--agent', AGENT_NAME,
      '-p', prompt,
      '--output-format', 'json',
      '--max-turns', String(maxTurns),
    ], {
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Verifier timed out after ${CLI_TIMEOUT_MS}ms`));
    }, CLI_TIMEOUT_MS);

    proc.on('close', () => {
      clearTimeout(timer);

      if (!stdout.trim()) {
        reject(new Error('Verifier returned no output (empty stdout)'));
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (e) {
        reject(new Error(`Failed to parse verifier output as JSON: ${e.message}\nStdout: ${stdout.substring(0, 500)}`));
        return;
      }

      // Check for error states
      if (parsed.is_error) {
        const reason = parsed.terminal_reason || 'unknown';
        reject(new Error(`Verifier session ended with error (reason: ${reason})`));
        return;
      }

      resolve(parsed);
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn verifier process: ${err.message}`));
    });

    // Close stdin to prevent --bare warning
    proc.stdin.end();
  });
}

// --- Report generation ---

function generateReport(reqId, findings, cliResult) {
  const date = new Date().toISOString().split('T')[0];
  let report = `# ${reqId} Independent Verifier Report\n\n`;
  report += `**日期**：${date}\n`;
  report += `**REQ**：${reqId}\n`;
  report += `**验证模式**：subagent (--bare --agent verifier)\n`;
  report += `**耗时**：${cliResult.duration_ms || 'N/A'}ms\n`;
  report += `**费用**：$${(cliResult.total_cost_usd || 0).toFixed(4)}\n\n`;

  // Status
  const statusIcon = findings.status === 'pass' ? '✅' : findings.status === 'error' ? '❌' : '⚠️';
  report += `## 结论: ${statusIcon} ${findings.status || 'unknown'}\n\n`;
  report += `> ${(findings.summary || 'No summary provided.')}\n\n`;

  // Findings
  if (findings.findings && findings.findings.length > 0) {
    report += `## 发现\n\n`;
    report += `| # | 严重度 | 类别 | 描述 | 文件 |\n`;
    report += `|---|--------|------|------|------|\n`;
    findings.findings.forEach((f, i) => {
      const icon = f.severity === 'high' ? '🔴' : f.severity === 'medium' ? '🟡' : f.severity === 'low' ? '🔵' : '⚪';
      report += `| ${i + 1} | ${icon} ${f.severity} | ${f.category || '-'} | ${f.description} | ${f.file || '-'} |\n`;
    });
    report += '\n';
  }

  // Acceptance coverage
  if (findings.acceptanceCoverage && findings.acceptanceCoverage.length > 0) {
    report += `## 验收标准覆盖\n\n`;
    report += `| # | 验收标准 | 覆盖 | 证据 |\n`;
    report += `|---|---------|------|------|\n`;
    findings.acceptanceCoverage.forEach((c, i) => {
      const icon = c.covered ? '✅' : '⚠️';
      report += `| ${i + 1} | ${c.criterion} | ${icon} | ${(c.evidence || '-').substring(0, 100)} |\n`;
    });
    report += '\n';
  }

  // Metadata
  report += `## 元数据\n\n`;
  report += `- Session ID: ${cliResult.session_id || 'N/A'}\n`;
  report += `- Permission denials: ${(cliResult.permission_denials || []).length}\n`;
  report += `- Turns: ${cliResult.num_turns || 'N/A'}\n`;

  return report;
}

function getReportSuffix(args) {
  const suffix = args.reportSuffix || 'verifier';
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(suffix)) {
    console.error(`Invalid report suffix: ${suffix}`);
    process.exit(1);
  }
  return suffix;
}

// --- Legacy fallback ---

function runLegacyCheck(rootDir, reqId) {
  // Delegate to existing auto-review for legacy mode
  console.log(`[verifier-session] Running in legacy mode for ${reqId}`);
  try {
    const output = execSync(`node scripts/auto-review.mjs --req ${reqId}`, {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000,
    });
    console.log(output);
  } catch (e) {
    console.error(`Legacy auto-review failed: ${e.message}`);
    process.exit(1);
  }
}

// --- Main ---

async function main() {
  const args = parseArgs();
  if (!args.reqId) {
    console.error('Usage: node verifier-session.mjs --req REQ-YYYY-NNN [--check-type scope|security|compliance|full] [--artifact path] [--output dir] [--report-suffix suffix]');
    process.exit(1);
  }

  validateCheckType(args.checkType);

  const rootDir = getGitRoot();
  const mode = getMode();

  // Legacy mode: delegate to auto-review
  if (mode === 'legacy') {
    runLegacyCheck(rootDir, args.reqId);
    return;
  }

  // Subagent mode: validate prerequisites
  validateAgentExists(rootDir);

  const reqFile = findReqFile(rootDir, args.reqId);
  if (!reqFile) {
    console.error(`REQ file not found: ${args.reqId}`);
    process.exit(1);
  }

  const changedFiles = resolveArtifactPaths(rootDir, args.artifactPaths);
  if (changedFiles.length === 0) {
    console.log('No uncommitted changes to verify.');
    process.exit(0);
  }

  // Build envelope and prompt
  const envelope = buildEnvelope(args.reqId, args.checkType, changedFiles, rootDir);
  const prompt = buildPrompt(envelope);
  const maxTurns = getMaxTurns(args);

  console.log(`[verifier-session] Spawning verifier for ${args.reqId} (${args.checkType})...`);
  console.log(`[verifier-session] Artifacts: ${changedFiles.length} file(s), max-turns: ${maxTurns}`);

  // Invoke verifier
  let cliResult;
  try {
    cliResult = await invokeVerifier(rootDir, prompt, maxTurns);
  } catch (e) {
    console.error(`[verifier-session] Verifier invocation failed: ${e.message}`);
    process.exit(1);
  }

  // Extract structured findings from the result text
  const resultText = cliResult.result || '';
  const findings = extractFindings(resultText);

  // Output results
  if (args.outputDir) {
    const reportsDir = path.join(rootDir, args.outputDir);
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, `${args.reqId}-${getReportSuffix(args)}.md`);
    const report = generateReport(args.reqId, findings, cliResult);
    fs.writeFileSync(reportPath, report);
    console.log(`[verifier-session] Report written: ${reportPath}`);
  } else {
    // Print structured output to stdout
    console.log('\n--- Verifier Findings ---');
    console.log(JSON.stringify(findings, null, 2));
    console.log(`\n--- Session Stats ---`);
    console.log(`Duration: ${cliResult.duration_ms}ms, Cost: $${(cliResult.total_cost_usd || 0).toFixed(4)}, Turns: ${cliResult.num_turns}`);
  }
}

main().catch((e) => {
  console.error(`[verifier-session] Fatal: ${e.message}`);
  process.exit(1);
});
