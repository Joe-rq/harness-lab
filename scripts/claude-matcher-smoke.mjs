#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANONICAL_WRITE_MATCHER = 'Write|Edit|NotebookEdit|Bash';
export const EXPECTED_MATCHES = ['Write', 'Edit', 'NotebookEdit', 'Bash'];
export const EXPECTED_MISSES = ['Read', 'Glob', 'Grep', 'Agent', 'WebFetch'];

export function matcherMatchesTool(matcher, toolName) {
  return new RegExp(`^(?:${matcher})$`).test(toolName);
}

export function validateCanonicalMatcher(matcher) {
  const positives = EXPECTED_MATCHES.filter((tool) => matcherMatchesTool(matcher, tool));
  const negatives = EXPECTED_MISSES.filter((tool) => matcherMatchesTool(matcher, tool));
  if (positives.length !== EXPECTED_MATCHES.length || negatives.length > 0) {
    throw new Error(`Matcher coverage mismatch: positives=${positives.join(',')} negatives=${negatives.join(',')}`);
  }
  return { matcher, positives, negatives: EXPECTED_MISSES };
}

export function findCanonicalPreToolEntry(settings) {
  const entries = settings?.hooks?.PreToolUse;
  if (!Array.isArray(entries)) throw new Error('hooks.PreToolUse must be an array');
  const entry = entries.find(({ matcher }) => matcher === CANONICAL_WRITE_MATCHER);
  if (!entry || !Array.isArray(entry.hooks)) throw new Error(`Missing canonical PreToolUse matcher: ${CANONICAL_WRITE_MATCHER}`);
  const commands = entry.hooks.filter(({ type }) => type === 'command').map(({ command }) => String(command));
  if (!commands.some((command) => command.includes('req-check.js'))) throw new Error('Canonical matcher is missing req-check.js');
  if (!commands.some((command) => command.includes('scope-guard.mjs'))) throw new Error('Canonical matcher is missing scope-guard.mjs');
  return { matcher: entry.matcher, commands };
}

export function validateMatcherEvidence(content, { expectedTool = 'Bash' } = {}) {
  const events = content.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`Invalid evidence JSONL line ${index + 1}: ${error.message}`); }
  });
  if (events.length === 0) throw new Error('Matcher evidence is empty');
  if (events.some(({ tool_name: toolName }) => toolName === 'Read')) throw new Error('Read unexpectedly matched the write matcher');
  const matches = events.filter(({ hook_event_name: event, tool_name: tool }) => event === 'PreToolUse' && tool === expectedTool);
  if (matches.length !== 1) throw new Error(`Expected exactly one ${expectedTool} PreToolUse event, got ${matches.length}`);
  return { eventCount: events.length, matchedTool: expectedTool };
}

export function prepareInteractiveFixture(targetDir) {
  const absolute = path.resolve(targetDir);
  mkdirSync(absolute, { recursive: true });
  const evidencePath = path.join(absolute, 'matcher-events.jsonl');
  const loggerPath = path.join(absolute, 'hook-logger.mjs');
  const fixturePath = path.join(absolute, 'fixture.txt');
  writeFileSync(fixturePath, 'matcher smoke fixture\n', 'utf8');
  writeFileSync(loggerPath, [
    "import { appendFileSync } from 'node:fs';",
    "let input = '';",
    "process.stdin.setEncoding('utf8');",
    "process.stdin.on('data', (chunk) => { input += chunk; });",
    `process.stdin.on('end', () => appendFileSync(${JSON.stringify(evidencePath)}, input.trim() + '\\n', 'utf8'));`,
    '',
  ].join('\n'), 'utf8');
  const settings = {
    hooks: {
      PreToolUse: [{
        matcher: CANONICAL_WRITE_MATCHER,
        hooks: [{ type: 'command', command: `node ${JSON.stringify(loggerPath)}`, timeout: 10 }],
      }],
    },
  };
  const settingsPath = path.join(absolute, 'settings.json');
  writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return { targetDir: absolute, evidencePath, fixturePath, loggerPath, settingsPath };
}

export function runClaudeDoctor() {
  const version = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (version.status !== 0) throw new Error('Claude Code is not available');
  const doctor = spawnSync('claude', ['doctor'], { encoding: 'utf8' });
  if (doctor.status !== 0) throw new Error(`claude doctor failed: ${(doctor.stderr || doctor.stdout || '').trim()}`);
  return { version: version.stdout.trim(), doctor: 'pass' };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--doctor') options.doctor = true;
    else if (arg === '--prepare' && argv[index + 1]) options.prepare = argv[++index];
    else if (arg === '--evidence' && argv[index + 1]) options.evidence = argv[++index];
    else if (arg === '--config' && argv[index + 1]) options.configs = [...(options.configs || []), argv[++index]];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const report = { schemaVersion: 1, matcher: validateCanonicalMatcher(CANONICAL_WRITE_MATCHER) };
  if (options.configs) {
    report.configs = options.configs.map((file) => ({ file, ...findCanonicalPreToolEntry(JSON.parse(readFileSync(file, 'utf8'))) }));
  }
  if (options.prepare) report.fixture = prepareInteractiveFixture(options.prepare);
  if (options.evidence) report.evidence = validateMatcherEvidence(readFileSync(options.evidence, 'utf8'));
  if (options.doctor) report.claude = runClaudeDoctor();
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error?.stack || error); process.exitCode = 1; }
}
