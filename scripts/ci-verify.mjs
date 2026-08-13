#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capabilityManifest } from './capability-manifest.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmInvocation = process.env.npm_execpath
  ? { command: process.execPath, args: [process.env.npm_execpath] }
  : { command: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: [] };

export function buildCiPlan(manifest = capabilityManifest) {
  const tests = manifest.verification.testFiles.map((file) => ({
    label: `test:${file}`,
    command: process.execPath,
    args: [file],
  }));
  return {
    tests,
    capabilities: [{ label: 'capabilities', command: process.execPath, args: ['scripts/capability-sync.mjs', '--check'] }],
    docs: [{ label: 'docs', command: process.execPath, args: ['scripts/docs-verify.mjs', '--status-file', '.claude/.docs-verify-status'], statusFile: '.claude/.docs-verify-status' }],
    governance: [{ label: 'governance', command: process.execPath, args: ['scripts/check-governance.mjs', '--status-file', '.claude/.check-governance-status'], statusFile: '.claude/.check-governance-status' }],
    doctor: [{ label: 'doctor', command: process.execPath, args: ['scripts/harness-doctor.mjs', '--json'], validate: validateDoctorOutput }],
    pack: [{
      label: 'pack',
      command: npmInvocation.command,
      args: [...npmInvocation.args, 'pack', '--dry-run', '--json', '--cache', path.join(os.tmpdir(), 'harness-lab-ci-npm-cache')],
      validate: validatePackOutput,
      echoStdout: false,
    }],
  };
}

function validateDoctorOutput(stdout) {
  const report = JSON.parse(stdout);
  if (report.exitCode !== 0 || report.summary?.fail !== 0) {
    throw new Error(`Doctor reported fail=${report.summary?.fail ?? 'unknown'} exitCode=${report.exitCode ?? 'unknown'}`);
  }
  return { pass: report.summary.pass, warn: report.summary.warn, fail: report.summary.fail, skip: report.summary.skip };
}

function validatePackOutput(stdout) {
  const [pack] = JSON.parse(stdout);
  if (!pack || !Array.isArray(pack.files)) throw new Error('npm pack did not return a file inventory');
  const forbidden = pack.files.map(({ path: file }) => file).filter((file) => (
    file.startsWith('.claude/events/') ||
    file.startsWith('.claude/worktrees/') ||
    file.startsWith('.claude/session-log/') ||
    file.startsWith('.claude/.npm-cache/')
  ));
  if (forbidden.length > 0) throw new Error(`Candidate package contains runtime files: ${forbidden.join(', ')}`);
  return { entryCount: pack.entryCount, size: pack.size, unpackedSize: pack.unpackedSize };
}

function captureGitStatus(statusFile) {
  const result = spawnSync('git', ['-c', 'safe.directory=*', 'status', '--porcelain=v1', '-uall'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`git status failed: ${(result.stderr || '').trim()}`);
  const target = path.join(rootDir, statusFile);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, result.stdout, 'utf8');
}

function writeEvidence(outputPath, evidence) {
  if (!outputPath) return;
  const absolute = path.resolve(outputPath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

export function runCiVerification({
  stages = capabilityManifest.verification.stages,
  evidenceOutput = process.env.HARNESS_CI_EVIDENCE,
  requireNodeMajor,
} = {}) {
  const plan = buildCiPlan();
  const unknown = stages.filter((stage) => !(stage in plan));
  if (unknown.length > 0) throw new Error(`Unknown CI stage(s): ${unknown.join(', ')}`);

  const evidence = {
    schemaVersion: 1,
    platform: process.platform,
    arch: process.arch,
    node: process.versions.node,
    expectedNodeMajor: requireNodeMajor ?? capabilityManifest.verification.nodeMajor,
    nodeMajorMatches: Number(process.versions.node.split('.')[0]) === (requireNodeMajor ?? capabilityManifest.verification.nodeMajor),
    nodeMajorEnforced: requireNodeMajor !== undefined,
    status: 'running',
    stages: [],
  };

  try {
    if (requireNodeMajor !== undefined && Number(process.versions.node.split('.')[0]) !== requireNodeMajor) {
      throw new Error(`Node major mismatch: expected ${requireNodeMajor}, got ${process.versions.node}`);
    }
    for (const stage of stages) {
      for (const item of plan[stage]) {
        process.stdout.write(`\n[ci:${item.label}] ${item.command} ${item.args.join(' ')}\n`);
        if (item.statusFile) captureGitStatus(item.statusFile);
        const result = spawnSync(item.command, item.args, { cwd: rootDir, encoding: 'utf8', env: process.env });
        if (result.stdout && item.echoStdout !== false) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`${item.label} exited with ${result.status}`);
        const detail = item.validate ? item.validate(result.stdout) : undefined;
        evidence.stages.push({ name: item.label, status: 'pass', ...(detail ? { detail } : {}) });
      }
    }
    evidence.status = 'pass';
    writeEvidence(evidenceOutput, evidence);
    process.stdout.write(`\nCI verification passed (${evidence.stages.length} checks).\n`);
    return evidence;
  } catch (error) {
    evidence.status = 'fail';
    evidence.failure = String(error?.message || error);
    writeEvidence(evidenceOutput, evidence);
    throw error;
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--list') options.list = true;
    else if (arg === '--stages' && argv[index + 1]) options.stages = argv[++index].split(',').filter(Boolean);
    else if (arg === '--evidence-output' && argv[index + 1]) options.evidenceOutput = argv[++index];
    else if (arg === '--require-node-major' && argv[index + 1]) {
      options.requireNodeMajor = Number(argv[++index]);
      if (!Number.isInteger(options.requireNodeMajor)) throw new Error('--require-node-major must be an integer');
    }
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.list) {
    console.log(JSON.stringify({
      nodeMajor: capabilityManifest.verification.nodeMajor,
      runnerOs: capabilityManifest.verification.runnerOs,
      stages: capabilityManifest.verification.stages,
      tests: capabilityManifest.verification.testFiles,
    }, null, 2));
    return;
  }
  runCiVerification(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error?.stack || error);
    process.exitCode = 1;
  }
}
