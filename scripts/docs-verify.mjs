import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function walk(dir, markdownFiles, ignoredDirs) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(path.join(dir, entry.name), markdownFiles, ignoredDirs);
      }
      continue;
    }

    if (entry.name.endsWith('.md')) {
      markdownFiles.push(path.join(dir, entry.name));
    }
  }
}

function toRepoPath(fullPath) {
  return path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
}

export function parseDocsVerifyArgs(argv) {
  const options = {
    diffAware: true,
    impactOnly: false,
    format: 'text',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--no-diff-aware') {
      options.diffAware = false;
      continue;
    }

    if (arg === '--status-file') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value`);
      }
      options.statusFile = value;
      index += 1;
      continue;
    }

    if (arg === '--impact-only') {
      options.impactOnly = true;
      continue;
    }

    if (arg === '--format') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--format requires a value');
      }
      if (!['text', 'json'].includes(value)) {
        throw new Error(`Unsupported format: ${value}`);
      }
      options.format = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.impactOnly && options.format !== 'text') {
    throw new Error('--format is only supported together with --impact-only');
  }

  return options;
}

function isIgnoredTarget(target) {
  return (
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('#') ||
    target.includes('*') ||
    target.includes('REQ-YYYY-')
  );
}

function resolveTarget(baseDir, target, root) {
  const [withoutAnchor] = target.split('#');
  if (!withoutAnchor) {
    return null;
  }

  if (withoutAnchor.startsWith('/')) {
    return path.join(root, withoutAnchor.slice(1));
  }

  return path.resolve(baseDir, withoutAnchor);
}

function validateMarkdownLinks(fullPath, content, errors, root) {
  const dir = path.dirname(fullPath);
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const match of content.matchAll(linkPattern)) {
    const target = match[1].trim();
    if (isIgnoredTarget(target)) {
      continue;
    }

    const resolved = resolveTarget(dir, target, root);
    if (!resolved || !existsSync(resolved)) {
      errors.push(`${toRepoPath(fullPath)} links to missing target: ${target}`);
    }
  }
}

function validateCommandMentions(fullPath, content, errors, packageJson, coreDocs) {
  const repoPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
  if (!coreDocs.has(repoPath)) {
    return;
  }

  const commandPattern = /npm run ([a-zA-Z0-9:_-]+)/g;

  for (const match of content.matchAll(commandPattern)) {
    const scriptName = match[1];
    if (!packageJson.scripts?.[scriptName]) {
      errors.push(`${toRepoPath(fullPath)} references missing npm script: ${scriptName}`);
    }
  }
}

function validateCodePathMentions(fullPath, content, errors, root, coreDocs) {
  const repoPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
  if (!coreDocs.has(repoPath)) {
    return;
  }

  const codePattern = /`([^`]+)`/g;
  const repoPrefixes = [
    'AGENTS.md',
    'CLAUDE.md',
    'README.md',
    'CONTRIBUTING.md',
    'LICENSE',
    'package.json',
    '.claude/',
    'context/',
    'docs/',
    'requirements/',
    'scripts/',
    'skills/',
  ];

  for (const match of content.matchAll(codePattern)) {
    const value = match[1].trim().split('#')[0];
    if (!value || !repoPrefixes.some((prefix) => value.startsWith(prefix))) {
      continue;
    }

    if (value.includes('*') || value.includes('REQ-YYYY-')) {
      continue;
    }

    if (!existsSync(path.join(root, value))) {
      errors.push(`${toRepoPath(fullPath)} references missing path: ${value}`);
    }
  }
}

function readSyncRules(root) {
  const relPath = 'scripts/docs-sync-rules.json';
  const fullPath = path.join(root, relPath);
  const raw = JSON.parse(readFileSync(fullPath, 'utf8'));
  if (!Array.isArray(raw.rules)) {
    throw new Error(`${relPath} must contain a "rules" array`);
  }

  for (const rule of raw.rules) {
    if (
      !rule ||
      typeof rule.id !== 'string' ||
      !Array.isArray(rule.triggers) ||
      rule.triggers.length === 0 ||
      !Array.isArray(rule.requireAny) ||
      rule.requireAny.length === 0
    ) {
      throw new Error(`${relPath} contains an invalid rule definition`);
    }
  }

  return raw.rules;
}

function normalizeRepoFile(relPath) {
  return relPath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function parseGitStatusLine(line) {
  if (!line) {
    return null;
  }

  const status = line.slice(0, 2);
  if (status.includes('D')) {
    return null;
  }

  let relPath = line.slice(3).trim();
  if (!relPath) {
    return null;
  }

  if (relPath.includes(' -> ')) {
    relPath = relPath.split(' -> ').at(-1);
  }

  return normalizeRepoFile(relPath.replace(/^"(.*)"$/, '$1'));
}

function collectChangedFiles(root, options) {
  if (!options.statusFile) {
    return {
      skipped: true,
      reason: 'no --status-file provided',
      files: [],
    };
  }

  const statusPath = path.resolve(root, options.statusFile);
  if (!existsSync(statusPath)) {
    throw new Error(`status file not found: ${options.statusFile}`);
  }

  const files = new Set();
  const statusText = readFileSync(statusPath, 'utf8');
  for (const line of statusText.split(/\r?\n/)) {
    const relPath = parseGitStatusLine(line.trimEnd());
    if (relPath) {
      files.add(relPath);
    }
  }

  return {
    skipped: false,
    reason: null,
    files: [...files].sort(),
  };
}

function matchesRulePattern(relPath, pattern) {
  return pattern.endsWith('/') ? relPath.startsWith(pattern) : relPath === pattern;
}

function matchesAnyRulePattern(relPath, patterns) {
  return patterns.some((pattern) => matchesRulePattern(relPath, pattern));
}

export function analyzeDocsImpact(root = process.cwd(), options = {}) {
  if (!options.diffAware) {
    return {
      errors: [],
      findings: [],
      skipped: true,
      reason: 'disabled by --no-diff-aware',
      changedFiles: [],
      evaluatedRules: 0,
    };
  }

  const changed = collectChangedFiles(root, options);
  if (changed.skipped) {
    return {
      errors: [],
      findings: [],
      skipped: true,
      reason: changed.reason,
      changedFiles: [],
      evaluatedRules: 0,
    };
  }

  const changedFiles = changed.files;
  if (changedFiles.length === 0) {
    return {
      errors: [],
      findings: [],
      skipped: false,
      reason: null,
      changedFiles,
      evaluatedRules: 0,
    };
  }

  const rules = readSyncRules(root);
  const findings = [];
  let evaluatedRules = 0;

  for (const rule of rules) {
    const triggeredFiles = changedFiles.filter((relPath) => matchesAnyRulePattern(relPath, rule.triggers));
    if (triggeredFiles.length === 0) {
      continue;
    }

    evaluatedRules += 1;
    const syncedDocs = changedFiles.filter((relPath) => matchesAnyRulePattern(relPath, rule.requireAny));
    const missing = syncedDocs.length > 0 ? [] : [...rule.requireAny];

    findings.push({
      id: rule.id,
      description: rule.description,
      triggeredFiles,
      satisfiedBy: syncedDocs,
      missing,
      status: missing.length > 0 ? 'missing' : 'satisfied',
    });
  }

  const errors = findings
    .filter((finding) => finding.status === 'missing')
    .map((finding) =>
      [
        `Diff-aware doc sync missing for rule "${finding.id}"`,
        `triggered by: ${finding.triggeredFiles.join(', ')}`,
        `expected one of: ${finding.missing.join(', ')}`,
      ].join(' | ')
    );

  return {
    errors,
    skipped: false,
    reason: null,
    changedFiles,
    evaluatedRules,
    findings,
  };
}

function printImpactReport(impact) {
  if (impact.skipped) {
    console.log(`Docs impact skipped: ${impact.reason}`);
    return;
  }

  console.log(`Docs impact summary (${impact.changedFiles.length} changed files).`);
  if (impact.findings.length === 0) {
    console.log('- No diff-aware rules were triggered.');
    return;
  }

  console.log(`- Triggered rules: ${impact.evaluatedRules}`);
  for (const finding of impact.findings) {
    console.log(`- Rule ${finding.id}: ${finding.status}`);
    console.log(`  triggered by: ${finding.triggeredFiles.join(', ')}`);
    if (finding.satisfiedBy.length > 0) {
      console.log(`  satisfied by: ${finding.satisfiedBy.join(', ')}`);
    }
    if (finding.missing.length > 0) {
      console.log(`  missing docs: ${finding.missing.join(', ')}`);
    }
  }
}

function buildImpactPayload(impact) {
  return {
    schema_version: 1,
    skipped: impact.skipped,
    reason: impact.reason,
    changed_files: impact.changedFiles,
    evaluated_rules: impact.evaluatedRules,
    missing_rules: impact.findings.filter((finding) => finding.status === 'missing').length,
    findings: impact.findings.map((finding) => ({
      id: finding.id,
      description: finding.description,
      status: finding.status,
      triggered_files: finding.triggeredFiles,
      satisfied_by: finding.satisfiedBy,
      missing_docs: finding.missing,
    })),
    errors: impact.errors,
  };
}

export function verifyDocs(root = process.cwd(), options = {}) {
  const errors = [];
  const markdownFiles = [];
  const ignoredDirs = new Set(['.git', 'node_modules', 'tmp']);
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const coreDocs = new Set(['AGENTS.md', 'CLAUDE.md', 'README.md', 'CONTRIBUTING.md']);

  function repoPath(fullPath) {
    return path.relative(root, fullPath).replace(/\\/g, '/');
  }

  const originalCwd = process.cwd();
  process.chdir(root);
  try {
    walk(root, markdownFiles, ignoredDirs);

    for (const fullPath of markdownFiles) {
      const content = readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
      validateMarkdownLinks(fullPath, content, errors, root);
      validateCommandMentions(fullPath, content, errors, packageJson, coreDocs);
      validateCodePathMentions(fullPath, content, errors, root, coreDocs);
    }

    const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
    for (const scriptName of ['docs:verify', 'check:governance']) {
      if (!readme.includes(`npm run ${scriptName}`)) {
        errors.push(`README.md must document npm run ${scriptName}`);
      }
    }
  } finally {
    process.chdir(originalCwd);
  }

  const diffAware = analyzeDocsImpact(root, options);
  errors.push(...diffAware.errors);

  return {
    errors,
    markdownFileCount: markdownFiles.length,
    toRepoPath: repoPath,
    diffAware,
  };
}

const isMainModule = process.argv[1] && path.basename(process.argv[1]) === path.basename(fileURLToPath(import.meta.url));

if (isMainModule) {
  let options;
  try {
    options = parseDocsVerifyArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Docs verify failed: ${error.message}`);
    process.exit(1);
  }

  if (options.impactOnly) {
    const impact = analyzeDocsImpact(process.cwd(), options);
    if (options.format === 'json') {
      console.log(JSON.stringify(buildImpactPayload(impact), null, 2));
    } else {
      printImpactReport(impact);
    }
    process.exit(impact.errors.length > 0 ? 1 : 0);
  }

  const result = verifyDocs(process.cwd(), options);

  if (result.errors.length > 0) {
    console.error('Docs verify failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const diffSummary = result.diffAware.skipped
    ? `diff-aware skipped: ${result.diffAware.reason}`
    : `diff-aware checked ${result.diffAware.changedFiles.length} changed files across ${result.diffAware.evaluatedRules} triggered rules`;

  console.log(`Docs verify passed (${result.markdownFileCount} markdown files checked; ${diffSummary}).`);
}
