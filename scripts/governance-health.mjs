#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditRepository } from './req-audit.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');

function countFiles(root, relDir, predicate = () => true) {
  const fullDir = path.join(root, relDir);
  if (!existsSync(fullDir)) return 0;
  return readdirSync(fullDir).filter(predicate).length;
}

function packageScriptStatus(root) {
  const packagePath = path.join(root, 'package.json');
  if (!existsSync(packagePath)) return { ok: false, message: 'package.json missing' };
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const scripts = packageJson.scripts || {};
  const required = ['req:audit', 'governance:health', 'req:complete', 'docs:verify', 'check:governance'];
  const missing = required.filter((name) => !scripts[name]);
  return {
    ok: missing.length === 0,
    missing,
  };
}

export function buildHealthReport(root = DEFAULT_ROOT) {
  const audit = auditRepository(root, { all: true });
  const errorCount = audit.findings.filter((finding) => finding.severity === 'error').length;
  const warningCount = audit.findings.filter((finding) => finding.severity === 'warning').length;
  const invariantsDir = path.join(root, 'context/invariants');
  let invariants = { total: 0, active: 0, draft: 0, deprecated: 0 };
  if (existsSync(invariantsDir)) {
    for (const name of readdirSync(invariantsDir).filter((item) => item.endsWith('.md'))) {
      const content = readFileSync(path.join(invariantsDir, name), 'utf8');
      invariants.total += 1;
      if (/status:\s*active/.test(content)) invariants.active += 1;
      else if (/status:\s*deprecated/.test(content)) invariants.deprecated += 1;
      else invariants.draft += 1;
    }
  }

  return {
    ok: audit.ok,
    req_audit: {
      errors: errorCount,
      warnings: warningCount,
    },
    req_counts: {
      in_progress: countFiles(root, 'requirements/in-progress', (name) => name.startsWith('REQ-') && name.endsWith('.md')),
      completed: countFiles(root, 'requirements/completed', (name) => name.startsWith('REQ-') && name.endsWith('.md')),
      reports: countFiles(root, 'requirements/reports', (name) => name.endsWith('.md') && name !== 'README.md'),
      experience: countFiles(root, 'context/experience', (name) => name.endsWith('.md') && name !== 'README.md'),
    },
    invariants,
    package_scripts: packageScriptStatus(root),
  };
}

function parseArgs(argv) {
  const options = { format: 'text' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--format') {
      options.format = argv[index + 1] || 'text';
      index += 1;
    }
  }
  return options;
}

function printText(report) {
  console.log(report.ok ? 'Governance health: OK' : 'Governance health: attention needed');
  console.log(`- REQ audit: ${report.req_audit.errors} errors, ${report.req_audit.warnings} warnings`);
  console.log(`- REQ counts: ${report.req_counts.in_progress} in progress, ${report.req_counts.completed} completed`);
  console.log(`- Reports: ${report.req_counts.reports}`);
  console.log(`- Experience docs: ${report.req_counts.experience}`);
  console.log(`- Invariants: ${report.invariants.total} total (${report.invariants.active} active / ${report.invariants.draft} draft / ${report.invariants.deprecated} deprecated)`);
  if (!report.package_scripts.ok) {
    console.log(`- Package scripts missing: ${report.package_scripts.missing.join(', ')}`);
  } else {
    console.log('- Package scripts: OK');
  }
}

export function main(argv = process.argv.slice(2), root = process.cwd()) {
  const options = parseArgs(argv);
  const report = buildHealthReport(root);
  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printText(report);
  }
  if (!report.ok) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
