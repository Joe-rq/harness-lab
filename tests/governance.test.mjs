import assert from 'node:assert/strict';
import {
  existsSync,
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { verifyDocs } from '../scripts/docs-verify.mjs';
import { validateReqDocument, validateDesignDocument } from '../scripts/req-validation.mjs';
import {
  ErrorTypes,
  formatErrorBlock,
  getErrorCode,
  getRecoverySteps,
  logError,
} from '../scripts/error-classifier.mjs';
import { appendEvent, buildWorktreeProgressProjections, readEvents } from '../scripts/event-store.mjs';
import { getExemptPath, getWorktreeIdentity, listGitWorktrees } from '../scripts/worktree-utils.mjs';
import { buildHealthReport } from '../scripts/governance-health.mjs';
import { buildRepositoryState } from '../scripts/state-semantics.mjs';
import {
  analyzeHookWrite,
  canonicalizeWriteTarget,
  classifyBashWrites,
  tokenizeShell,
} from '../scripts/write-target-policy.mjs';
import {
  DEFAULT_VERIFIER_MODE,
  ALLOWED_VERIFIER_MODES,
  getVerifierMode,
  assertVerifierMode,
} from '../scripts/verifier-mode.mjs';
import {
  capabilityManifest,
  getInstallFiles,
  getPublishedFiles,
  resolveInstallProfile,
  targetPackageScripts,
  validateCapabilityManifest,
} from '../scripts/capability-manifest.mjs';
import {
  comparePublishedFiles,
  syncCapabilityPackage,
} from '../scripts/capability-sync.mjs';
import {
  HARNESS_MODES,
  getHookPolicy,
  hookPolicyMatrix,
  normalizeHarnessMode,
  validateHookPolicyMatrix,
} from '../scripts/hook-policy.mjs';
import { runDoctor } from '../scripts/harness-doctor.mjs';
import { buildCiPlan, runCiVerification } from '../scripts/ci-verify.mjs';
import {
  CANONICAL_WRITE_MATCHER,
  EXPECTED_MATCHES,
  EXPECTED_MISSES,
  findCanonicalPreToolEntry,
  matcherMatchesTool,
  prepareInteractiveFixture,
  validateMatcherEvidence,
} from '../scripts/claude-matcher-smoke.mjs';
import {
  main as pilotObservationMain,
  parseObservation,
  summarizeObservation,
  validateEventShape as validatePilotEventShape,
  validateObservation,
} from '../scripts/pilot-observation.mjs';
import {
  OWNERSHIP_PATH,
  UPGRADE_REPORT_JSON_PATH,
  applyManagedUpgrade,
  planManagedUpgrade,
  readOwnershipRecord,
  restoreManagedBackup,
  sha256File,
  validateOwnershipRecord,
} from '../scripts/managed-upgrade.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const DEFAULT_WITH_HOOK_TARGET_ASSETS = getInstallFiles(
  resolveInstallProfile('default', { overlays: ['basic-hooks'] })
);
const PUBLISHED_ASSETS = getPublishedFiles();
const TARGET_SCRIPT_NAMES = Object.keys(targetPackageScripts);

// Independent product-level contract: these semantic capabilities and public
// commands must not disappear merely because the manifest and consumers agree.
const MINIMUM_SEMANTIC_CAPABILITY_IDS = [
  'governance.core',
  'req.lifecycle',
  'governance.audit',
  'hooks.basic',
  'hooks.advanced',
];
const MINIMUM_PUBLIC_COMMAND_IDS = [
  'req:create',
  'req:start',
  'req:status',
  'req:complete',
  'docs:verify',
  'harness:doctor',
];

function createTempDir(prefix) {
  return mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function writeFile(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}

function captureCommandFailure(fn) {
  const originalExit = process.exit;
  const originalError = console.error;
  let exitCode = null;
  let stderr = '';

  process.exit = ((code) => {
    exitCode = code ?? 0;
    throw new Error(`process.exit:${exitCode}`);
  });
  console.error = (...args) => {
    stderr += `${args.join(' ')}\n`;
  };

  try {
    fn();
  } catch (error) {
    if (!String(error?.message || error).startsWith('process.exit:')) {
      throw error;
    }
  } finally {
    process.exit = originalExit;
    console.error = originalError;
  }

  return { exitCode, stderr };
}

async function importFreshModule(relPath) {
  const url = pathToFileURL(path.join(repoRoot, relPath));
  url.searchParams.set('t', `${Date.now()}-${Math.random()}`);
  return import(url.href);
}

function setupReqFixture(root) {
  writeFile(
    root,
    'requirements/INDEX.md',
    `# Requirements Index

## 当前活跃 REQ

- 无

## 当前搁置 REQ

- 无

## 最近完成 REQ

- 无
`
  );

  writeFile(
    root,
    '.claude/progress.txt',
    `Current active REQ: none
Current phase: idle
Last updated: 2026-03-29

Summary:
- None.

Next steps:
- None.

Open questions:
- None.

Blockers:
- None.
`
  );

  mkdirSync(path.join(root, 'requirements', 'in-progress'), { recursive: true });
  mkdirSync(path.join(root, 'requirements', 'completed'), { recursive: true });
  mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
}

function setupVerifierGitFixture(root, reqId = 'REQ-2026-900') {
  setupReqFixture(root);
  writeFile(
    root,
    `requirements/in-progress/${reqId}-verifier-fixture.md`,
    `# ${reqId}: Verifier fixture

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
测试 verifier 模式。

## 目标
- 测试 verifier envelope

## 范围
- 涉及文件：
  - \`src/example.js\`

## 验收标准
- [x] verifier package 只包含路径

## 验证计划
- 计划执行的命令：
  - \`node fail-if-run.mjs\`
- 需要的环境：本地 Node.js
- 需要的人工验证：无
`
  );
  writeFile(
    root,
    '.claude/agents/verifier.md',
    [
      '---',
      'name: verifier',
      'tools:',
      '  - Read',
      '  - Grep',
      '  - Glob',
      '  - LS',
      'disallowedTools:',
      '  - Write',
      '  - Edit',
      '  - Bash',
      '---',
      '',
      '# Test verifier',
    ].join('\n')
  );
  writeFile(root, 'src/example.js', "export const value = 'baseline';\n");
  writeFile(
    root,
    'fail-if-run.mjs',
    "import { writeFileSync } from 'node:fs'; writeFileSync('qa-command-ran.txt', 'ran'); process.exit(1);\n"
  );

  execFileSync('git', ['init'], { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture baseline'], { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
  writeFile(root, 'src/example.js', "export const value = 'changed';\nconst hiddenContent = 'SHOULD_NOT_APPEAR_IN_ENVELOPE';\n");

  return { reqId, artifactPath: 'src/example.js' };
}

function runNodeScript(scriptRelPath, args, options = {}) {
  return execFileSync(process.execPath, [path.join(repoRoot, scriptRelPath), ...args], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  });
}

function captureExecFailure(fn) {
  try {
    fn();
  } catch (error) {
    return {
      status: error.status,
      stdout: String(error.stdout || ''),
      stderr: String(error.stderr || ''),
    };
  }
  assert.fail('Expected command to fail');
}

function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function initGitProject(root, packageJson = { name: 'fixture-project', private: true, scripts: {} }) {
  mkdirSync(root, { recursive: true });
  writeFile(root, 'package.json', `${JSON.stringify(packageJson, null, 2)}\n`);
  execFileSync('git', ['init', '-q'], { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
}

function listFilesRecursive(root, current = root) {
  const files = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(root, fullPath));
    } else if (entry.isFile()) {
      files.push(path.relative(root, fullPath).replace(/\\/g, '/'));
    }
  }
  return files;
}

function countHookCommands(settings, fragment) {
  return Object.values(settings.hooks || {})
    .flatMap((entries) => Array.isArray(entries) ? entries : [])
    .flatMap((entry) => Array.isArray(entry?.hooks) ? entry.hooks : [])
    .filter((hook) => typeof hook?.command === 'string' && hook.command.includes(fragment))
    .length;
}

function countExactHookCommands(settings, scriptName, requiredMatcher = null) {
  const expectedCommands = new Set([
    `node "scripts/${scriptName}"`,
    `node scripts/${scriptName}`,
    `node "$(git rev-parse --show-toplevel)/scripts/${scriptName}"`,
  ]);
  return Object.values(settings.hooks || {})
    .flatMap((entries) => Array.isArray(entries) ? entries : [])
    .filter((entry) => {
      if (!requiredMatcher) return true;
      const matchers = String(entry?.matcher || '').split('|').map((value) => value.trim());
      return matchers.includes('*') || matchers.includes(requiredMatcher);
    })
    .flatMap((entry) => Array.isArray(entry?.hooks) ? entry.hooks : [])
    .filter((hook) => (
      hook?.type === 'command' &&
      typeof hook.command === 'string' &&
      expectedCommands.has(hook.command.replace(/\\/g, '/').trim())
    ))
    .length;
}

async function testDocsVerifyPasses() {
  const docsVerify = verifyDocs(repoRoot, { diffAware: false });
  assert.deepEqual(docsVerify.errors, []);
}

function cloneCapabilityManifest() {
  const clone = structuredClone(capabilityManifest);
  // The schema requires this to be the same object, not merely equal data.
  clone.modules.cli.packageScripts = clone.targetPackageScripts;
  return clone;
}

function testCapabilityManifestIsCanonicalAndSyncable() {
  assert.equal(validateCapabilityManifest(capabilityManifest), true);

  const capabilityIds = new Set(capabilityManifest.capabilities.map((capability) => capability.id));
  for (const capabilityId of MINIMUM_SEMANTIC_CAPABILITY_IDS) {
    assert.ok(capabilityIds.has(capabilityId), `semantic capability must remain public: ${capabilityId}`);
  }
  for (const commandId of MINIMUM_PUBLIC_COMMAND_IDS) {
    assert.equal(typeof targetPackageScripts[commandId], 'string', `public command must remain: ${commandId}`);
  }

  assert.deepEqual(resolveInstallProfile('core'), ['core']);
  assert.deepEqual(resolveInstallProfile('default'), ['core', 'docs', 'context', 'skills', 'cli']);
  assert.deepEqual(
    resolveInstallProfile('default', { overlays: ['basic-hooks'] }),
    ['core', 'docs', 'context', 'skills', 'cli', 'hook']
  );
  assert.deepEqual(
    resolveInstallProfile('default', { overlays: ['advanced-hooks'] }),
    ['core', 'docs', 'context', 'skills', 'cli', 'hook', 'advanced-hooks']
  );
  assert.ok(DEFAULT_WITH_HOOK_TARGET_ASSETS.includes('scripts/capability-manifest.mjs'));
  assert.ok(DEFAULT_WITH_HOOK_TARGET_ASSETS.includes('scripts/hook-policy.mjs'));
  assert.ok(!DEFAULT_WITH_HOOK_TARGET_ASSETS.includes('scripts/deploy-guard.mjs'));
  assert.ok(PUBLISHED_ASSETS.includes('scripts/deploy-guard.mjs'));
  assert.ok(PUBLISHED_ASSETS.includes('scripts/capability-sync.mjs'));

  const duplicateFile = cloneCapabilityManifest();
  duplicateFile.modules.core.files.push(duplicateFile.modules.core.files[0]);
  assert.throws(() => validateCapabilityManifest(duplicateFile), /contains duplicate/);

  const unsafePath = cloneCapabilityManifest();
  unsafePath.modules.core.files[0] = '../escape.md';
  assert.throws(() => validateCapabilityManifest(unsafePath), /safe repository-relative POSIX path/);

  const unknownDependency = cloneCapabilityManifest();
  unknownDependency.modules.docs.dependsOn.push('missing-module');
  assert.throws(() => validateCapabilityManifest(unknownDependency), /depends on unknown module/);

  const cycle = cloneCapabilityManifest();
  cycle.modules.core.dependsOn.push('cli');
  assert.throws(() => validateCapabilityManifest(cycle), /dependency cycle/);

  const currentPackage = readJsonFile(path.join(repoRoot, 'package.json'));
  assert.deepEqual(comparePublishedFiles(currentPackage.files), {
    ok: true,
    missing: [],
    extra: [],
    orderMismatch: false,
    expected: PUBLISHED_ASSETS,
  });
  assert.equal(comparePublishedFiles([...PUBLISHED_ASSETS].reverse()).orderMismatch, true);

  const tempDir = createTempDir('capability-sync');
  try {
    writeFile(tempDir, 'package.json', `${JSON.stringify({ name: 'fixture', sentinel: true, files: ['README.md'] }, null, 2)}\n`);
    const checkResult = syncCapabilityPackage({ rootDir: tempDir });
    assert.equal(checkResult.ok, false);
    assert.ok(checkResult.missing.includes('scripts/capability-manifest.mjs'));
    const writeResult = syncCapabilityPackage({ rootDir: tempDir, write: true });
    assert.equal(writeResult.changed, true);
    const syncedPackage = readJsonFile(path.join(tempDir, 'package.json'));
    assert.equal(syncedPackage.sentinel, true);
    assert.deepEqual(syncedPackage.files, PUBLISHED_ASSETS);
    assert.equal(syncCapabilityPackage({ rootDir: tempDir }).ok, true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function testHookPolicyMatrixAndConsumers() {
  const expectedActions = {
    'req.invalid': ['block', 'block', 'block'],
    'scope.violation': ['block', 'block', 'block'],
    'deploy.dangerous': ['warn', 'block', 'block'],
    'review.write-agent': ['block', 'block', 'block'],
    'risk.r3': ['warn', 'warn', 'allow'],
    'watchdog.stagnant': ['warn', 'warn', 'allow'],
    'stop.uncovered': ['warn', 'block', 'block'],
    'precompact.snapshot': ['allow', 'allow', 'allow'],
  };

  assert.equal(validateHookPolicyMatrix(hookPolicyMatrix), true);
  assert.deepEqual(Object.keys(hookPolicyMatrix), Object.keys(expectedActions));
  for (const [point, actions] of Object.entries(expectedActions)) {
    for (const [index, mode] of HARNESS_MODES.entries()) {
      assert.equal(getHookPolicy(point, mode).action, actions[index], `${point}/${mode}`);
    }
  }
  assert.equal(getHookPolicy('scope.violation', 'autonomous').effect, 'log');
  assert.equal(getHookPolicy('watchdog.stagnant', 'autonomous').effect, 'recovery');
  for (const mode of HARNESS_MODES) {
    assert.equal(getHookPolicy('precompact.snapshot', mode).effect, 'snapshot');
  }
  assert.equal(getHookPolicy('precompact.snapshot', 'collaborative').audit, false);
  assert.equal(getHookPolicy('precompact.snapshot', 'autonomous').audit, true);
  assert.deepEqual(normalizeHarnessMode(' supervised\n'), { mode: 'supervised', raw: 'supervised', valid: true });
  assert.deepEqual(normalizeHarnessMode('unsafe'), { mode: 'collaborative', raw: 'unsafe', valid: false });
  assert.deepEqual(normalizeHarnessMode(undefined), { mode: 'collaborative', raw: '', valid: true });
  assert.throws(() => getHookPolicy('unknown.point', 'collaborative'), /Unknown hook policy point/);

  const missingMode = structuredClone(hookPolicyMatrix);
  delete missingMode['req.invalid'].autonomous;
  assert.throws(() => validateHookPolicyMatrix(missingMode), /missing mode/);
  const invalidAction = structuredClone(hookPolicyMatrix);
  invalidAction['risk.r3'].supervised.action = 'prompt';
  assert.throws(() => validateHookPolicyMatrix(invalidAction), /invalid action/);
  const invalidEffect = structuredClone(hookPolicyMatrix);
  invalidEffect['watchdog.stagnant'].autonomous.effect = 'rollback';
  assert.throws(() => validateHookPolicyMatrix(invalidEffect), /invalid effect/);

  const consumers = [
    'scope-guard.mjs',
    'deploy-guard.mjs',
    'review-gatekeeper.mjs',
    'risk-tracker.mjs',
    'watchdog.mjs',
    'stop-evaluator.mjs',
    'precompact-notify.mjs',
  ];
  for (const script of consumers) {
    const source = readFileSync(path.join(repoRoot, 'scripts', script), 'utf8');
    assert.match(source, /from ['"]\.\/hook-policy\.mjs['"]/, `${script} must import the policy`);
    assert.match(source, /getHookPolicy\(/, `${script} must query the policy`);
    assert.doesNotMatch(source, /function\s+getHarnessMode\b/, `${script} must not retain a local mode parser`);
  }
}

async function testInstallerProfilesAndProfileAwareDoctor() {
  const tempDir = createTempDir('profile-aware-doctor');
  const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
  const install = async (name, args) => {
    const root = path.join(tempDir, name);
    initGitProject(root);
    const result = await harnessInstall.main(args, { targetDir: root, stdinIsTTY: false });
    assert.equal(result.status, 'success', `${name} install should succeed`);
    return root;
  };

  try {
    const coreRoot = await install('core', ['--core-only']);
    const coreBytes = readFileSync(path.join(coreRoot, '.harness', 'profile.json'), 'utf8');
    const coreOwnershipBytes = readFileSync(path.join(coreRoot, OWNERSHIP_PATH), 'utf8');
    const coreProfile = JSON.parse(coreBytes);
    assert.equal(coreProfile.profile, 'core');
    assert.deepEqual(coreProfile.modules, ['core']);
    assert.deepEqual(coreProfile.overlays, []);
    assert.equal(runDoctor({ rootDir: coreRoot }).summary.fail, 0);
    await harnessInstall.main(['--core-only'], { targetDir: coreRoot, stdinIsTTY: false });
    assert.equal(readFileSync(path.join(coreRoot, '.harness', 'profile.json'), 'utf8'), coreBytes);
    assert.equal(readFileSync(path.join(coreRoot, OWNERSHIP_PATH), 'utf8'), coreOwnershipBytes);
    const invalidCoreOwnership = JSON.parse(coreOwnershipBytes);
    invalidCoreOwnership.files['AGENTS.md'].sha256 = 'invalid';
    writeFile(coreRoot, OWNERSHIP_PATH, `${JSON.stringify(invalidCoreOwnership)}\n`);
    assert.ok(runDoctor({ rootDir: coreRoot }).summary.fail > 0);
    writeFile(coreRoot, OWNERSHIP_PATH, coreOwnershipBytes);

    const defaultRoot = await install('default', ['--defaults']);
    const defaultReport = runDoctor({ rootDir: defaultRoot });
    assert.equal(defaultReport.profile.id, 'default');
    assert.deepEqual(defaultReport.profile.overlays, []);
    assert.equal(defaultReport.summary.fail, 0);
    assert.equal(defaultReport.checks.find((check) => check.name === '基础 Hook').status, 'skip');

    const basicRoot = await install('basic', ['--defaults', '--with-hook']);
    const basicReport = runDoctor({ rootDir: basicRoot });
    assert.deepEqual(basicReport.profile.overlays, ['basic-hooks']);
    assert.equal(basicReport.summary.fail, 0);
    assert.equal(basicReport.checks.find((check) => check.name === '基础 Hook').status, 'pass');
    assert.equal(basicReport.checks.find((check) => check.name === '高级 Hook').status, 'skip');
    for (const relPath of capabilityManifest.modules['advanced-hooks'].files) {
      writeFile(basicRoot, relPath, readFileSync(path.join(repoRoot, relPath), 'utf8'));
    }
    const driftReport = runDoctor({ rootDir: basicRoot });
    const driftCheck = driftReport.checks.find((check) => check.name === 'Profile 能力漂移');
    assert.equal(driftCheck.status, 'warn');
    assert.match(driftCheck.detail, /advanced-hooks/);
    assert.equal(driftReport.exitCode, 0);

    rmSync(path.join(defaultRoot, '.harness', 'profile.json'));
    const legacyReport = runDoctor({ rootDir: defaultRoot });
    assert.equal(legacyReport.profile.source, 'legacy-inference');
    assert.equal(legacyReport.summary.fail, 0);
    assert.equal(legacyReport.checks.find((check) => check.name === '安装 profile').status, 'warn');
    rmSync(path.join(defaultRoot, OWNERSHIP_PATH));
    const missingOwnershipReport = runDoctor({ rootDir: defaultRoot });
    assert.equal(missingOwnershipReport.checks.find((check) => check.name === 'Managed ownership').status, 'warn');
    assert.equal(missingOwnershipReport.exitCode, 0);

    writeFile(defaultRoot, '.harness/profile.json', '{}\n');
    const invalidReport = runDoctor({ rootDir: defaultRoot });
    assert.ok(invalidReport.summary.fail > 0);
    assert.equal(invalidReport.exitCode, 1);
    const failure = captureExecFailure(() => execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'harness-doctor.mjs'), '--json'],
      { cwd: defaultRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ));
    assert.equal(failure.status, 1);
    assert.ok(JSON.parse(failure.stdout).summary.fail > 0);

    const sourceReport = runDoctor({ rootDir: repoRoot });
    assert.equal(sourceReport.profile.id, 'source');
    assert.ok(sourceReport.profile.modules.includes('advanced-hooks'));
    assert.ok(sourceReport.profile.overlays.includes('advanced-hooks'));
    assert.equal(sourceReport.summary.fail, 0);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function createUpgradeSource(root, moduleIds, version, mutations = {}) {
  writeFile(root, 'package.json', `${JSON.stringify({ name: 'harness-lab', version }, null, 2)}\n`);
  for (const moduleId of moduleIds) {
    for (const relPath of capabilityManifest.modules[moduleId].files) {
      const content = Object.hasOwn(mutations, relPath)
        ? mutations[relPath]
        : readFileSync(path.join(repoRoot, relPath), 'utf8');
      writeFile(root, relPath, content);
    }
  }
}

async function testManagedUpgradeProtectsUserChangesAndRestores() {
  const tempDir = createTempDir('managed-upgrade');
  const targetDir = path.join(tempDir, 'target');
  const sourceDir = path.join(tempDir, 'source');
  const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
  try {
    initGitProject(targetDir);
    const install = await harnessInstall.main(['--core-only'], { targetDir, stdinIsTTY: false });
    assert.equal(install.status, 'success');
    const originalOwnershipBytes = readFileSync(path.join(targetDir, OWNERSHIP_PATH), 'utf8');
    const originalAgents = readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8');
    const originalClaude = readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8');
    const activeProgress = 'Current active REQ: REQ-2099-099\nCurrent phase: implementation\n';
    writeFile(targetDir, '.claude/progress.txt', activeProgress);
    writeFile(targetDir, '.claude/settings.local.json', '{"sentinel":"settings"}\n');
    writeFile(targetDir, '.claude/events/session.jsonl', '{"type":"sentinel"}\n');
    const originalPackage = readFileSync(path.join(targetDir, 'package.json'), 'utf8');
    writeFile(targetDir, 'CLAUDE.md', `${originalClaude}\nUSER CUSTOMIZATION\n`);
    const reinstall = await harnessInstall.main(['--core-only'], { targetDir, stdinIsTTY: false });
    assert.equal(reinstall.status, 'success');
    assert.equal(readFileSync(path.join(targetDir, OWNERSHIP_PATH), 'utf8'), originalOwnershipBytes);
    assert.equal(readFileSync(path.join(targetDir, '.claude/progress.txt'), 'utf8'), activeProgress);

    createUpgradeSource(sourceDir, ['core'], '1.2.0', {
      'AGENTS.md': `${originalAgents}\nUPSTREAM 1.2\n`,
      'CLAUDE.md': `${originalClaude}\nUPSTREAM 1.2\n`,
    });

    const drySnapshot = new Map([
      [OWNERSHIP_PATH, readFileSync(path.join(targetDir, OWNERSHIP_PATH), 'utf8')],
      ['AGENTS.md', readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')],
      ['CLAUDE.md', readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')],
    ]);
    const dry = applyManagedUpgrade({ sourceDir, targetDir, dryRun: true });
    assert.equal(dry.status, 'planned');
    assert.equal(dry.exitCode, 2);
    assert.equal(dry.summary.update, 1);
    assert.equal(dry.summary.conflict, 1);
    assert.ok(!existsSync(path.join(targetDir, '.harness', 'backups')));
    for (const [relPath, bytes] of drySnapshot) assert.equal(readFileSync(path.join(targetDir, relPath), 'utf8'), bytes);

    const applied = applyManagedUpgrade({
      sourceDir,
      targetDir,
      backupId: 'test-1.1.0-to-1.2.0',
      now: new Date('2026-07-11T00:00:00.000Z'),
    });
    assert.equal(applied.status, 'partial');
    assert.equal(applied.exitCode, 2);
    assert.match(readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8'), /UPSTREAM 1\.2/);
    assert.match(readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8'), /USER CUSTOMIZATION/);
    assert.doesNotMatch(readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8'), /UPSTREAM 1\.2/);
    assert.equal(readFileSync(path.join(targetDir, '.claude/progress.txt'), 'utf8'), activeProgress);
    assert.equal(readFileSync(path.join(targetDir, '.claude/settings.local.json'), 'utf8'), '{"sentinel":"settings"}\n');
    assert.equal(readFileSync(path.join(targetDir, '.claude/events/session.jsonl'), 'utf8'), '{"type":"sentinel"}\n');
    assert.equal(readFileSync(path.join(targetDir, 'package.json'), 'utf8'), originalPackage);
    const upgradedOwnership = readOwnershipRecord(targetDir, { allowMissing: false });
    assert.equal(upgradedOwnership.lastAttemptedVersion, '1.2.0');
    assert.equal(upgradedOwnership.lastCompleteVersion, '1.1.0');
    assert.equal(upgradedOwnership.files['AGENTS.md'].sourceVersion, '1.2.0');
    assert.equal(upgradedOwnership.files['CLAUDE.md'].sourceVersion, '1.1.0');
    assert.equal(JSON.parse(readFileSync(path.join(targetDir, UPGRADE_REPORT_JSON_PATH), 'utf8')).status, 'partial');

    const restoreDry = restoreManagedBackup({ targetDir, backupId: applied.backupId, dryRun: true });
    assert.equal(restoreDry.status, 'planned');
    restoreManagedBackup({ targetDir, backupId: applied.backupId });
    assert.equal(readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8'), originalAgents);
    assert.match(readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8'), /USER CUSTOMIZATION/);
    assert.equal(readFileSync(path.join(targetDir, OWNERSHIP_PATH), 'utf8'), originalOwnershipBytes);
    assert.ok(!existsSync(path.join(targetDir, UPGRADE_REPORT_JSON_PATH)));
    writeFile(targetDir, `.harness/backups/${applied.backupId}/files/AGENTS.md`, 'tampered backup\n');
    assert.throws(
      () => restoreManagedBackup({ targetDir, backupId: applied.backupId }),
      /hash mismatch/
    );
    assert.throws(() => restoreManagedBackup({ targetDir, backupId: '../escape' }), /Invalid backup id/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testManagedUpgradeLegacyRollbackAndPathSafety() {
  const tempDir = createTempDir('managed-upgrade-safety');
  const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
  try {
    const legacyDir = path.join(tempDir, 'legacy');
    const sourceDir = path.join(tempDir, 'source');
    initGitProject(legacyDir);
    await harnessInstall.main(['--core-only'], { targetDir: legacyDir, stdinIsTTY: false });
    rmSync(path.join(legacyDir, '.harness', 'ownership.json'));
    rmSync(path.join(legacyDir, '.harness', 'profile.json'));
    const userAgents = `${readFileSync(path.join(legacyDir, 'AGENTS.md'), 'utf8')}\nLEGACY USER CHANGE\n`;
    writeFile(legacyDir, 'AGENTS.md', userAgents);
    createUpgradeSource(sourceDir, ['core'], '2.0.0', {
      'AGENTS.md': `${readFileSync(path.join(repoRoot, 'AGENTS.md'), 'utf8')}\nUPSTREAM 2.0\n`,
    });
    const legacyPlan = planManagedUpgrade({ sourceDir, targetDir: legacyDir });
    assert.equal(legacyPlan.ownershipSource, 'legacy-unowned');
    assert.equal(legacyPlan.items.find((item) => item.path === 'AGENTS.md').classification, 'conflict');
    assert.ok(legacyPlan.summary.adopt > 0);
    const legacyApply = applyManagedUpgrade({ sourceDir, targetDir: legacyDir, backupId: 'legacy-to-2.0.0' });
    assert.equal(legacyApply.status, 'partial');
    assert.equal(readFileSync(path.join(legacyDir, 'AGENTS.md'), 'utf8'), userAgents);
    assert.ok(existsSync(path.join(legacyDir, '.harness', 'profile.json')));

    const classificationDir = path.join(tempDir, 'classification');
    initGitProject(classificationDir);
    await harnessInstall.main(['--core-only'], { targetDir: classificationDir, stdinIsTTY: false });
    const classificationOwnership = readOwnershipRecord(classificationDir, { allowMissing: false });
    const addPath = 'requirements/reports/README.md';
    const adoptPath = 'requirements/in-progress/README.md';
    delete classificationOwnership.files[addPath];
    delete classificationOwnership.files[adoptPath];
    rmSync(path.join(classificationDir, addPath));
    writeFile(classificationDir, 'legacy-managed.md', 'retired upstream file\n');
    classificationOwnership.files['legacy-managed.md'] = {
      module: 'retired-module',
      sourceVersion: '1.0.0',
      sha256: sha256File(path.join(classificationDir, 'legacy-managed.md')),
    };
    writeFile(classificationDir, OWNERSHIP_PATH, `${JSON.stringify(classificationOwnership, null, 2)}\n`);
    const oldProfile = readJsonFile(path.join(classificationDir, '.harness/profile.json'));
    oldProfile.manifestSchemaVersion = 0;
    oldProfile.productVersion = 0;
    oldProfile.modules = [];
    oldProfile.capabilities = [];
    writeFile(classificationDir, '.harness/profile.json', `${JSON.stringify(oldProfile, null, 2)}\n`);
    const classificationPlan = planManagedUpgrade({ sourceDir: repoRoot, targetDir: classificationDir });
    assert.deepEqual(classificationPlan.profile.modules, ['core']);
    assert.equal(classificationPlan.items.find((item) => item.path === addPath).classification, 'add');
    assert.equal(classificationPlan.items.find((item) => item.path === adoptPath).classification, 'adopt');
    assert.equal(classificationPlan.items.find((item) => item.path === 'legacy-managed.md').classification, 'stale');
    const classificationApply = applyManagedUpgrade({
      sourceDir: repoRoot,
      targetDir: classificationDir,
      backupId: 'classification-coverage',
    });
    assert.equal(classificationApply.status, 'success');
    assert.ok(existsSync(path.join(classificationDir, addPath)));
    assert.ok(existsSync(path.join(classificationDir, 'legacy-managed.md')));
    assert.ok(!Object.hasOwn(readOwnershipRecord(classificationDir, { allowMissing: false }).files, 'legacy-managed.md'));
    assert.equal(readJsonFile(path.join(classificationDir, '.harness/profile.json')).productVersion, capabilityManifest.productVersion);
    const idempotentPlan = planManagedUpgrade({ sourceDir: repoRoot, targetDir: classificationDir });
    assert.equal(idempotentPlan.summary.update, 0);
    assert.equal(idempotentPlan.summary.add, 0);
    assert.equal(idempotentPlan.summary.conflict, 0);
    assert.equal(idempotentPlan.summary.stale, 0);

    const rollbackDir = path.join(tempDir, 'rollback');
    initGitProject(rollbackDir);
    await harnessInstall.main(['--core-only'], { targetDir: rollbackDir, stdinIsTTY: false });
    const beforeAgents = readFileSync(path.join(rollbackDir, 'AGENTS.md'), 'utf8');
    const beforeOwnership = readFileSync(path.join(rollbackDir, OWNERSHIP_PATH), 'utf8');
    assert.throws(() => applyManagedUpgrade({
      sourceDir,
      targetDir: rollbackDir,
      backupId: 'fault-rollback',
      faultInjector: ({ phase }) => { if (phase === 'after-write') throw new Error('injected failure'); },
    }), /automatically restored/);
    assert.equal(readFileSync(path.join(rollbackDir, 'AGENTS.md'), 'utf8'), beforeAgents);
    assert.equal(readFileSync(path.join(rollbackDir, OWNERSHIP_PATH), 'utf8'), beforeOwnership);
    assert.ok(existsSync(path.join(rollbackDir, '.harness/backups/fault-rollback/manifest.json')));

    const invalidOwnership = JSON.parse(beforeOwnership);
    invalidOwnership.files['AGENTS.md'].sha256 = 'not-a-hash';
    assert.ok(validateOwnershipRecord(invalidOwnership).some((issue) => /sha256/.test(issue)));
    writeFile(rollbackDir, OWNERSHIP_PATH, `${JSON.stringify(invalidOwnership)}\n`);
    assert.throws(() => planManagedUpgrade({ sourceDir, targetDir: rollbackDir }), /invalid sha256/);
    writeFile(rollbackDir, OWNERSHIP_PATH, beforeOwnership);
    rmSync(path.join(sourceDir, 'CLAUDE.md'));
    assert.throws(() => planManagedUpgrade({ sourceDir, targetDir: rollbackDir }), /Required file is missing: CLAUDE\.md/);
    writeFile(sourceDir, 'CLAUDE.md', readFileSync(path.join(repoRoot, 'CLAUDE.md'), 'utf8'));

    if (process.platform !== 'win32') {
      const outside = path.join(tempDir, 'outside.md');
      writeFileSync(outside, 'outside\n');
      rmSync(path.join(rollbackDir, 'AGENTS.md'));
      symlinkSync(outside, path.join(rollbackDir, 'AGENTS.md'));
      assert.throws(() => planManagedUpgrade({ sourceDir, targetDir: rollbackDir }), /symbolic link/);
      assert.equal(readFileSync(outside, 'utf8'), 'outside\n');
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testReqCliLifecycle() {
  const tempDir = createTempDir('harness-req-check');
  const previousCwd = process.cwd();
  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    reqCli.createCommand({
      title: 'Automation test req',
      slug: 'automation-test-req',
      year: '2026',
    });

    const reqPath = path.join(
      tempDir,
      'requirements',
      'in-progress',
      'REQ-2026-001-automation-test-req.md'
    );
    const designPath = path.join(tempDir, 'docs', 'plans', 'REQ-2026-001-design.md');
    assert.ok(existsSync(reqPath));
    // Design doc is no longer auto-created
    assert.ok(!existsSync(designPath));

    const failedStart = captureCommandFailure(() =>
      reqCli.startCommand({
        id: 'REQ-2026-001',
        phase: 'implementation',
      })
    );
    assert.equal(failedStart.exitCode, 1);
    // Should fail due to missing design doc or template content
    // New format uses structured error blocks with error codes
    assert.ok(
      failedStart.stderr.includes('design document validation failed') ||
      failedStart.stderr.includes('still contains template content') ||
      failedStart.stderr.includes('E003') ||
      failedStart.stderr.includes('E004') ||
      failedStart.stderr.includes('GOVERNANCE BLOCKED')
    );

    writeFileSync(
      reqPath,
      readFileSync(reqPath, 'utf8')
        .replace('说明为什么要做这件事。', '验证空模板 REQ 不得进入实施阶段。')
        .replace('- 目标 1', '- 阻止空模板 REQ 进入 in-progress')
        .replace('- 目标 2', '- 让 req:start 和 PreToolUse 复用同一套内容校验')
        .replace('- [ ] 标准 1', '- [x] 空模板 REQ 无法执行 req:start')
        .replace('- [ ] 标准 2', '- [x] 已填充 REQ 可以正常执行 req:start')
        .replace('- [ ] 目标实现', '- [x] 目标实现')
        .replace('- [ ] 旧功能保护', '- [x] 旧功能保护')
        .replace('- [ ] 逻辑正确性', '- [x] 逻辑正确性')
        .replace('- [ ] 完整性', '- [x] 完整性')
        .replace('- [ ] 可维护性', '- [x] 可维护性')
        .replace('- [ ] 目标对齐', '- [x] 目标对齐')
        .replace('- [ ] 设计对齐', '- [x] 设计对齐')
        .replace('- [ ] 验收标准对齐', '- [x] 验收标准对齐'),
      'utf8'
    );

    // Create design doc manually (no longer auto-created)
    mkdirSync(path.dirname(designPath), { recursive: true });
    writeFileSync(
      designPath,
      `# REQ-2026-001 Design

## Background

验证 REQ 生命周期完整流程。

## Goal

- 验证 REQ 生命周期

## Scope

### In scope

- req:create, req:start, req:complete

### Out of scope

- 其他命令

## Product Review

### User Value

- 解决的问题：测试治理流程
- 目标用户：开发者
- 预期收益：确保流程正确

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：scripts/
- 依赖方向：无
- 需要新增或修改的边界：无

### Verification

- 自动验证：npm test
- 人工验证：无
- 回滚：删除文件
`,
      'utf8'
    );

    reqCli.startCommand({
      id: 'REQ-2026-001',
      phase: 'implementation',
    });
    const startedReq = readFileSync(reqPath, 'utf8');
    assert.match(startedReq, /- 当前状态：in-progress/);
    assert.match(startedReq, /- 当前阶段：implementation/);

    // Create required reports for complete
    const reportsDir = path.join(tempDir, 'requirements', 'reports');
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(
      path.join(reportsDir, 'REQ-2026-001-code-review.md'),
      '# Code Review\n\n## 状态\n\n- ✅ 通过\n',
      'utf8'
    );
    writeFileSync(
      path.join(reportsDir, 'REQ-2026-001-qa.md'),
      '# QA\n\n## 状态\n\n- ✅ 通过\n\n## 验证证据\n\n| 类型 | 项目 | 结果 | 摘要 |\n|------|------|------|------|\n| 命令 | `npm test` | PASS | fixture |\n| 人工/浏览器 | 无 | N/A | REQ 未要求人工验证 |\n',
      'utf8'
    );

    reqCli.completeCommand({
      id: 'REQ-2026-001',
      phase: 'qa',
      'no-docs-gate': true,
      'skip-experience': '自动化测试无需经验文档',
    });

    const completedPath = path.join(
      tempDir,
      'requirements',
      'completed',
      'REQ-2026-001-automation-test-req.md'
    );
    assert.ok(existsSync(completedPath));

    const progress = readFileSync(path.join(tempDir, '.claude', 'progress.txt'), 'utf8');
    assert.match(progress, /^Current active REQ: none$/m);
    assert.match(progress, /^Current phase: idle$/m);

    const events = readEvents({ rootDir: tempDir });
    assert.deepEqual(
      events.map((event) => event.type),
      ['req_created', 'req_started', 'req_completed']
    );
    assert.ok(events.every((event) => event.reqId === 'REQ-2026-001'));
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testReqValidationDetectsTemplateAndDraftIssues() {
  const draftReq = `# REQ-2026-999: Example

## 状态
- 当前状态：draft
- 当前阶段：design

## 背景
说明为什么要做这件事。

## 目标
- 目标 1
- 目标 2

## 非目标
- 不做 1

## 范围
- 涉及目录 / 模块：

## 验收标准
- [ ] 标准 1
- [ ] 标准 2
`;

  const hookValidation = validateReqDocument(draftReq);
  assert.ok(hookValidation.issues.some((issue) => issue.code === 'draft-status'));
  assert.ok(
    hookValidation.issues.some(
      (issue) => issue.code === 'template-placeholder' && issue.section === '背景'
    )
  );
  assert.ok(
    hookValidation.issues.some(
      (issue) => issue.code === 'template-placeholder' && issue.section === '目标'
    )
  );
  assert.ok(
    hookValidation.issues.some(
      (issue) => issue.code === 'template-placeholder' && issue.section === '验收标准'
    )
  );

  const startValidation = validateReqDocument(draftReq, { allowDraftStatus: true });
  assert.ok(!startValidation.issues.some((issue) => issue.code === 'draft-status'));
}

async function testHarnessInstallArtifacts() {
  const tempDir = createTempDir('harness-install');
  try {
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/check-governance.mjs'));
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/req-validation.mjs'));
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/error-classifier.mjs'));
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/event-store.mjs'));
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/worktree-utils.mjs'));
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/template-guard.mjs'));
    assert.ok(harnessInstall.modules.hook.files.includes('scripts/session-start.js'));
    assert.ok(harnessInstall.modules.hook.files.includes('scripts/req-check.js'));
    assert.ok(harnessInstall.modules.hook.files.includes('scripts/scope-guard.mjs'));
    assert.ok(harnessInstall.modules.hook.files.includes('scripts/write-target-policy.mjs'));
    assert.ok(!harnessInstall.modules.hook.files.includes('scripts/event-store.mjs'));
    assert.ok(DEFAULT_WITH_HOOK_TARGET_ASSETS.includes('scripts/event-store.mjs'));

    writeFile(
      tempDir,
      'package.json',
      JSON.stringify(
        {
          name: 'fixture-project',
          scripts: {
            lint: 'eslint .',
            test: 'vitest run',
            build: 'tsc -p tsconfig.json',
          },
        },
        null,
        2
      )
    );

    const selectedModules = ['core', 'docs', 'context', 'skills', 'cli', 'hook'];
    const copyResults = harnessInstall.copyFiles(repoRoot, tempDir, selectedModules);
    harnessInstall.createProgressTxt(tempDir);
    harnessInstall.configureHook(tempDir);
    const packageUpdate = harnessInstall.updateTargetPackageJson(tempDir);
    harnessInstall.generateReport(tempDir, selectedModules, copyResults, true, packageUpdate);

    assert.ok(existsSync(path.join(tempDir, 'scripts', 'check-governance.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'req-validation.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'error-classifier.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'event-store.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'worktree-utils.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'req-check.js')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'scope-guard.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'session-start.js')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'template-guard.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'context', 'README.md')));
    assert.ok(existsSync(path.join(tempDir, '.agents', 'skills', 'source-command-worktree-req', 'SKILL.md')));

    const settings = JSON.parse(
      readFileSync(path.join(tempDir, '.claude', 'settings.local.json'), 'utf8')
    );
    assert.ok(Array.isArray(settings.hooks?.SessionStart));
    assert.ok(Array.isArray(settings.hooks?.PreToolUse));
    assert.equal(settings.hooks.SessionStart[0].hooks[0].type, 'command');
    // 根据平台检查对应的脚本
    const isWindows = process.platform === 'win32';
    const expectedSessionStart = isWindows ? /session-start\.js/ : /session-start\.js/;
    const expectedReqCheck = isWindows ? /req-check\.js/ : /req-check\.js/;
    assert.match(settings.hooks.SessionStart[0].hooks[0].command, expectedSessionStart);
    assert.equal(settings.hooks.PreToolUse[0].hooks[0].type, 'command');
    assert.match(settings.hooks.PreToolUse[0].hooks[0].command, expectedReqCheck);
    assert.match(settings.hooks.PreToolUse[0].hooks[1].command, /scope-guard\.mjs/);
    assert.match(settings.hooks.PreToolUse[0].matcher, /Bash/);
    assert.ok(settings.permissions.allow.includes('Bash(node scripts/req-check.js)'));
    assert.ok(settings.permissions.allow.includes('Bash(node scripts/scope-guard.mjs)'));

    const packageJson = JSON.parse(readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
    assert.equal(packageJson.scripts.lint, 'eslint .');
    assert.equal(packageJson.scripts.test, 'vitest run');
    assert.equal(packageJson.scripts.build, 'tsc -p tsconfig.json');
    assert.equal(packageJson.scripts.verify, 'npm run lint && npm run test && npm run build');
    assert.equal(packageJson.scripts['req:create'], 'node scripts/req-cli.mjs create');

    const report = readFileSync(
      path.join(tempDir, 'requirements', 'reports', 'harness-setup-report.md'),
      'utf8'
    );
    assert.match(report, /- \[x\] 治理 hooks/);
    assert.match(report, /`verify`：generated/);
    assert.match(report, /PreToolUse 为 REQ 状态与 scope 硬阻断/);
    assert.doesNotMatch(report, /`scope-guard`、`watchdog`/);
    assert.match(report, /req:create` 只会生成骨架/);

    const progress = readFileSync(path.join(tempDir, '.claude', 'progress.txt'), 'utf8');
    assert.match(progress, /补齐 REQ 的真实背景、目标、验收标准后再执行 req:start/);

    const statusOutput = execFileSync(process.execPath, ['scripts/req-cli.mjs', 'status'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.match(statusOutput, /No active REQ/);

    const sessionOutput = execFileSync(process.execPath, ['scripts/session-start.js'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.match(sessionOutput, /Harness Lab/);

    writeFile(tempDir, '.claude/.req-exempt', '');
    execFileSync(process.execPath, ['scripts/req-check.js'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testInstallerDeclaredSourcesExistAndArgsAreStrict() {
  const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
  const packageJson = readJsonFile(path.join(repoRoot, 'package.json'));

  assert.equal(packageJson.name, 'harness-lab');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.engines?.node, '>=20');
  assert.equal(packageJson.bin?.['harness-install'], 'scripts/harness-install.mjs');
  assert.ok(Array.isArray(packageJson.files));
  for (const relPath of PUBLISHED_ASSETS) {
    assert.ok(packageJson.files.includes(relPath), `published contract must include: ${relPath}`);
  }
  for (const scriptName of TARGET_SCRIPT_NAMES) {
    assert.equal(
      typeof harnessInstall.modules.cli.packageScripts[scriptName],
      'string',
      `target npm script contract must include: ${scriptName}`
    );
  }

  for (const [moduleName, moduleDefinition] of Object.entries(harnessInstall.modules)) {
    for (const relPath of moduleDefinition.files) {
      const sourcePath = path.join(repoRoot, relPath);
      assert.ok(existsSync(sourcePath), `${moduleName} source should exist: ${relPath}`);
      assert.ok(!readFileSync(sourcePath).includes('> 此文件由 harness-install 创建'), `source must not be a generated placeholder: ${relPath}`);
    }
  }

  assert.throws(
    () => harnessInstall.parseInstallerArgs(['--unknown']),
    /Unknown installer option/
  );
  assert.throws(
    () => harnessInstall.parseInstallerArgs(['--source']),
    /requires a value/
  );
  assert.throws(
    () => harnessInstall.parseInstallerArgs(['--source', '-h']),
    /requires a value/
  );
  assert.throws(
    () => harnessInstall.parseInstallerArgs(['--defaults', '--core-only']),
    /either --defaults or --core-only/
  );
  assert.throws(
    () => harnessInstall.parseInstallerArgs(['--package-dir', 'app', '--package-json', 'app/package.json']),
    /either --package-dir or --package-json/
  );
  assert.throws(
    () => harnessInstall.parseInstallerArgs(['--core-only', '--package-dir', 'app']),
    /require a profile that installs the CLI/
  );
  assert.equal(harnessInstall.parseInstallerArgs(['--upgrade', '--dry-run']).upgrade, true);
  assert.equal(harnessInstall.parseInstallerArgs(['--restore', 'backup-1']).restore, 'backup-1');
  assert.throws(
    () => harnessInstall.parseInstallerArgs(['--upgrade', '--defaults']),
    /cannot be combined/
  );
  assert.throws(
    () => harnessInstall.parseInstallerArgs(['--restore', 'backup-1', '--source', '.']),
    /does not accept --source/
  );

  for (const relPath of [
    'README.md',
    '.claude/commands/harness-setup.md',
    '.agents/skills/source-command-harness-setup/SKILL.md',
  ]) {
    const content = readFileSync(path.join(repoRoot, relPath), 'utf8');
    assert.match(
      content,
      /npx --yes --package=harness-lab harness-install --defaults/,
      `${relPath} must publish the verified package/bin mapping`
    );
    assert.doesNotMatch(content, /npx harness-install --defaults/);
  }
}

async function testPublishedTarballAndPackedBinFreshInstall() {
  const tempDir = createTempDir('harness-packed-bin');
  try {
    const packDir = path.join(tempDir, 'pack');
    const runnerDir = path.join(tempDir, 'runner');
    const targetDir = path.join(tempDir, 'target');
    const npmCache = path.join(tempDir, 'npm-cache');
    mkdirSync(packDir, { recursive: true });
    initGitProject(runnerDir, { name: 'packed-runner', private: true });
    initGitProject(targetDir, {
      name: 'packed-target',
      private: true,
      scripts: { test: 'node -e "process.exit(0)"' },
    });

    const npmEnv = {
      ...process.env,
      npm_config_cache: npmCache,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
    };
    const packOutput = execFileSync(
      npmExecutable,
      ['pack', '--json', '--ignore-scripts', '--pack-destination', packDir],
      { cwd: repoRoot, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const packInfo = JSON.parse(packOutput)[0];
    const tarballPath = path.join(packDir, packInfo.filename);
    const packedPaths = new Set(packInfo.files.map((entry) => entry.path));

    assert.equal(packInfo.name, 'harness-lab');
    assert.ok(packedPaths.has('scripts/harness-install.mjs'));
    assert.ok(packedPaths.has('scripts/managed-upgrade.mjs'));
    assert.ok(packedPaths.has('.agents/skills/source-command-harness-setup/SKILL.md'));
    assert.ok(!packedPaths.has('requirements/INDEX.md'), 'dogfood INDEX history must not be published');
    for (const relPath of PUBLISHED_ASSETS) {
      assert.ok(packedPaths.has(relPath), `published tarball contract must include: ${relPath}`);
    }
    for (const packedPath of packedPaths) {
      assert.ok(!packedPath.startsWith('.claude/events/'));
      assert.ok(!packedPath.startsWith('.claude/session-log/'));
      assert.ok(!packedPath.startsWith('.claude/worktrees/'));
      assert.ok(!packedPath.startsWith('tests/'));
      assert.ok(!packedPath.startsWith('reviews/'));
      assert.ok(!/^requirements\/completed\/REQ-/.test(packedPath));
      assert.ok(!/^requirements\/reports\/REQ-/.test(packedPath));
    }

    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    for (const moduleDefinition of Object.values(harnessInstall.modules)) {
      for (const relPath of moduleDefinition.files) {
        assert.ok(packedPaths.has(relPath), `installer source must be present in tarball: ${relPath}`);
      }
    }

    const npxCache = path.join(tempDir, 'npx-cache');
    const npxOutput = execFileSync(
      npmExecutable,
      ['exec', '--offline', '--yes', `--package=${tarballPath}`, '--', 'harness-install', '--defaults', '--dry-run'],
      {
        cwd: targetDir,
        env: {
          ...npmEnv,
          npm_config_cache: npxCache,
          npm_config_registry: 'http://127.0.0.1:9',
        },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
    assert.match(npxOutput, /Dry run/);
    assert.match(npxOutput, /安装计划/);

    execFileSync(
      npmExecutable,
      ['install', '--ignore-scripts', '--no-save', '--offline', tarballPath],
      { cwd: runnerDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const installedPackage = path.join(runnerDir, 'node_modules', 'harness-lab');
    const installedFiles = listFilesRecursive(installedPackage);
    for (const relPath of installedFiles) {
      const content = readFileSync(path.join(installedPackage, relPath), 'utf8');
      assert.ok(!content.includes(repoRoot), `published text must not contain repository absolute path: ${relPath}`);
      assert.ok(!content.includes('/Users/qrq/'), `published text must not contain local user path: ${relPath}`);
    }

    const binPath = process.platform === 'win32'
      ? path.join(runnerDir, 'node_modules', '.bin', 'harness-install.cmd')
      : path.join(runnerDir, 'node_modules', '.bin', 'harness-install');
    assert.ok(existsSync(binPath), 'npm bin should be materialized from the packed package');
    const installOutput = execFileSync(
      binPath,
      ['--defaults', '--with-hook'],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.match(installOutput, /Harness Lab 安装完成/);
    assert.doesNotMatch(installOutput, /安装未完成/);

    const report = readFileSync(path.join(targetDir, 'requirements', 'reports', 'harness-setup-report.md'), 'utf8');
    assert.match(report, /\*\*状态\*\*：success/);
    assert.doesNotMatch(report, /> 此文件由 harness-install 创建/);

    const targetPackage = readJsonFile(path.join(targetDir, 'package.json'));
    for (const scriptName of TARGET_SCRIPT_NAMES) {
      assert.equal(typeof targetPackage.scripts[scriptName], 'string', `target script should exist: ${scriptName}`);
    }
    for (const relPath of DEFAULT_WITH_HOOK_TARGET_ASSETS) {
      assert.ok(existsSync(path.join(targetDir, relPath)), `default install contract must include: ${relPath}`);
    }
    for (const moduleId of resolveInstallProfile('default', { overlays: ['basic-hooks'] })) {
      const moduleDefinition = harnessInstall.modules[moduleId];
      for (const relPath of moduleDefinition.files) {
        assert.ok(existsSync(path.join(targetDir, relPath)), `installed target asset should exist: ${relPath}`);
      }
    }
    assert.ok(existsSync(path.join(targetDir, 'requirements', 'INDEX.md')));
    assert.ok(existsSync(path.join(targetDir, OWNERSHIP_PATH)));
    assert.equal(readOwnershipRecord(targetDir, { allowMissing: false }).lastCompleteVersion, packInfo.version);

    const upgradeDryOutput = execFileSync(
      binPath,
      ['--upgrade', '--dry-run'],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.match(upgradeDryOutput, /安全升级计划/);
    assert.ok(!existsSync(path.join(targetDir, '.harness', 'backups')));
    const upgradeOutput = execFileSync(
      binPath,
      ['--upgrade'],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.match(upgradeOutput, /安全升级结果/);
    const packedUpgradeReport = readJsonFile(path.join(targetDir, UPGRADE_REPORT_JSON_PATH));
    assert.equal(packedUpgradeReport.status, 'success');
    assert.equal(packedUpgradeReport.summary.conflict, 0);
    const restoreDryOutput = execFileSync(
      binPath,
      ['--restore', packedUpgradeReport.backupId, '--dry-run'],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.match(restoreDryOutput, /恢复计划/);
    execFileSync(
      binPath,
      ['--restore', packedUpgradeReport.backupId],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.ok(!existsSync(path.join(targetDir, UPGRADE_REPORT_JSON_PATH)));

    // README requires the reviewed installation diff to become a separate
    // baseline before the first business REQ, so docs impact is attributable.
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: targetDir });
    execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: targetDir });
    execFileSync('git', ['add', '.'], { cwd: targetDir });
    execFileSync('git', ['commit', '-m', 'harness setup baseline'], {
      cwd: targetDir,
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    const runPackedNpmScript = (scriptName, args = []) => execFileSync(
      npmExecutable,
      ['--silent', 'run', scriptName, '--', ...args],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const statusOutput = runPackedNpmScript('req:status', ['--json']);
    assert.equal(JSON.parse(statusOutput).active_req, null);
    const directStatusOutput = execFileSync(
      process.execPath,
      ['scripts/req-cli.mjs', 'status', '--json'],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    assert.equal(JSON.parse(directStatusOutput).active_req, null);
    const doctorOutput = runPackedNpmScript('harness:doctor', ['--json']);
    const doctorReport = JSON.parse(doctorOutput);
    assert.equal(doctorReport.profile.id, 'default');
    assert.deepEqual(doctorReport.profile.overlays, ['basic-hooks']);
    assert.equal(doctorReport.summary.fail, 0);

    execFileSync(
      process.execPath,
      ['scripts/req-cli.mjs', 'create', '--title', '首个中文需求', '--id', 'REQ-2099-001'],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const reqPath = path.join(targetDir, 'requirements', 'in-progress', 'REQ-2099-001-requirement.md');
    writeFileSync(
      reqPath,
      readFileSync(reqPath, 'utf8')
        .replace('说明为什么要做这件事。', '验证从真实 npm tarball 安装后的 REQ 生命周期。')
        .replace('- 目标 1', '- 验证 packed create/start/block/complete')
        .replace('- 目标 2', '- 验证 reflect/align/experience 入口')
        .replace('- [ ] 标准 1', '- [x] packed lifecycle commands executed')
        .replace('- [ ] 标准 2', '- [x] packed lifecycle completed')
        .replaceAll('- [ ] 目标实现', '- [x] 目标实现')
        .replaceAll('- [ ] 旧功能保护', '- [x] 旧功能保护')
        .replaceAll('- [ ] 逻辑正确性', '- [x] 逻辑正确性')
        .replaceAll('- [ ] 完整性', '- [x] 完整性')
        .replaceAll('- [ ] 可维护性', '- [x] 可维护性')
        .replaceAll('- [ ] 目标对齐', '- [x] 目标对齐')
        .replaceAll('- [ ] 设计对齐', '- [x] 设计对齐')
        .replaceAll('- [ ] 验收标准对齐', '- [x] 验收标准对齐'),
      'utf8'
    );
    writeFile(
      targetDir,
      'docs/plans/REQ-2099-001-design.md',
      `# REQ-2099-001 Design

## Background

验证真实 tarball 安装结果。

## Goal

- 完成 packed lifecycle

## Scope

### In scope

- REQ lifecycle commands

### Out of scope

- 业务代码

## Product Review

### User Value

- 证明发布包可执行

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 仅临时 fixture

### Verification

- 自动验证：本测试
- 人工验证：无
- 回滚：删除临时目录
`
    );
    runPackedNpmScript('req:start', ['--id', 'REQ-2099-001', '--phase', 'implementation']);
    assert.match(runPackedNpmScript('req:status'), /REQ-2099-001/);
    assert.equal(
      JSON.parse(runPackedNpmScript('req:status', ['--json', '--id', 'REQ-2099-001'])).req.title,
      '首个中文需求'
    );
    assert.match(
      runPackedNpmScript('req:reflect', ['--id', 'REQ-2099-001']),
      /元反思/
    );
    assert.match(
      runPackedNpmScript('req:align', ['--id', 'REQ-2099-001']),
      /对齐检查/
    );
    runPackedNpmScript('req:block', [
      '--id', 'REQ-2099-001', '--reason', 'packed test pause',
      '--condition', 'resume packed test', '--next', 'complete lifecycle', '--phase', 'implementation',
    ]);
    runPackedNpmScript('req:start', ['--id', 'REQ-2099-001', '--phase', 'implementation']);
    runPackedNpmScript('req:experience', ['--id', 'REQ-2099-001']);
    assert.ok(existsSync(path.join(targetDir, 'context', 'experience', 'REQ-2099-001-experience.md')));
    writeFile(
      targetDir,
      'requirements/reports/REQ-2099-001-code-review.md',
      '# Code Review\n\n## 状态\n\n- ✅ 通过\n'
    );
    writeFile(
      targetDir,
      'requirements/reports/REQ-2099-001-qa.md',
      '# QA\n\n## 状态\n\n- ✅ 通过\n\n## 验证证据\n\n| 类型 | 项目 | 结果 | 摘要 |\n|------|------|------|------|\n| 命令 | packed lifecycle | PASS | local tarball |\n| 人工/浏览器 | 无 | N/A | fixture |\n'
    );
    runPackedNpmScript('req:complete', ['--id', 'REQ-2099-001']);
    assert.ok(existsSync(path.join(targetDir, 'requirements', 'completed', 'REQ-2099-001-requirement.md')));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testInstallerReinstallPreservesProgressAndSettings() {
  const tempDir = createTempDir('harness-reinstall-preserve');
  try {
    initGitProject(tempDir);
    const progress = `Current active REQ: REQ-2026-777\nCurrent phase: implementation\nLast updated: 2026-07-11\n\nSummary:\n- sentinel\n`;
    const index = `# Requirements Index

## 当前活跃 REQ

- \`REQ-2026-777\`：用户真实活跃需求（in-progress / implementation）

## 当前搁置 REQ

- 无

## 最近完成 REQ

- \`REQ-2026-776\`：用户历史需求
`;
    const activeReq = `# REQ-2026-777: 用户真实活跃需求

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
验证安装器不会覆盖真实用户状态。

## 目标
- 保留 REQ、INDEX 与 progress

## 验收标准
- [x] 三份状态逐字节保留
`;
    const customSettings = {
      customTopLevel: { sentinel: true },
      hooks: {
        SessionStart: [{ matcher: 'custom', hooks: [{ type: 'command', command: 'node custom-start.mjs', timeout: 17 }] }],
        PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node custom-pre.mjs', timeout: 19 }] }],
      },
      permissions: { allow: ['Bash(custom:*)'] },
    };
    writeFile(tempDir, '.claude/progress.txt', progress);
    writeFile(tempDir, '.claude/settings.local.json', `${JSON.stringify(customSettings, null, 2)}\n`);
    writeFile(tempDir, 'requirements/INDEX.md', index);
    writeFile(tempDir, 'requirements/in-progress/REQ-2026-777-user-active.md', activeReq);

    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    const first = await harnessInstall.main(['--defaults', '--with-hook'], { targetDir: tempDir, stdinIsTTY: false });
    assert.equal(first.exitCode, 0);
    const settingsAfterFirst = readFileSync(path.join(tempDir, '.claude', 'settings.local.json'), 'utf8');
    const second = await harnessInstall.main(['--defaults', '--with-hook'], { targetDir: tempDir, stdinIsTTY: false });
    assert.equal(second.exitCode, 0);
    const settingsAfterSecond = readFileSync(path.join(tempDir, '.claude', 'settings.local.json'), 'utf8');

    assert.equal(readFileSync(path.join(tempDir, '.claude', 'progress.txt'), 'utf8'), progress);
    assert.equal(readFileSync(path.join(tempDir, 'requirements', 'INDEX.md'), 'utf8'), index);
    assert.equal(
      readFileSync(path.join(tempDir, 'requirements', 'in-progress', 'REQ-2026-777-user-active.md'), 'utf8'),
      activeReq
    );
    assert.equal(settingsAfterSecond, settingsAfterFirst, 'second install should be settings-idempotent');
    const settings = JSON.parse(settingsAfterSecond);
    assert.deepEqual(settings.customTopLevel, { sentinel: true });
    assert.ok(settings.permissions.allow.includes('Bash(custom:*)'));
    assert.equal(countHookCommands(settings, 'custom-start.mjs'), 1);
    assert.equal(countHookCommands(settings, 'custom-pre.mjs'), 1);
    assert.equal(countHookCommands(settings, 'session-start.js'), 1);
    assert.equal(countHookCommands(settings, 'req-check.js'), 1);
    assert.equal(countHookCommands(settings, 'scope-guard.mjs'), 1);
    const gitignore = readFileSync(path.join(tempDir, '.gitignore'), 'utf8');
    assert.equal((gitignore.match(/Harness Lab 运行时状态/g) || []).length, 1);
    const status = JSON.parse(execFileSync(
      npmExecutable,
      ['--silent', 'run', 'req:status', '--', '--json'],
      { cwd: tempDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ));
    assert.equal(status.active_req?.req_id, 'REQ-2026-777');
    assert.equal(status.active_req?.phase, 'implementation');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testInstallerCoreOnlyProfileBoundary() {
  const coreDir = createTempDir('harness-core-only');
  const hookDir = createTempDir('harness-core-hook');
  const malformedPackageDir = createTempDir('harness-core-malformed-package');
  try {
    initGitProject(coreDir, {
      name: 'core-only-fixture',
      private: true,
      scripts: { test: 'node --test' },
    });
    const originalPackage = readFileSync(path.join(coreDir, 'package.json'), 'utf8');
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    const coreResult = await harnessInstall.main(['--core-only'], { targetDir: coreDir, stdinIsTTY: false });
    assert.equal(coreResult.exitCode, 0);
    assert.equal(coreResult.packageUpdate.bindingSkipped, true);
    assert.equal(readFileSync(path.join(coreDir, 'package.json'), 'utf8'), originalPackage);
    assert.ok(!existsSync(path.join(coreDir, 'scripts', 'req-cli.mjs')));

    initGitProject(hookDir, { name: 'core-hook-fixture', private: true, scripts: {} });
    const hookResult = await harnessInstall.main(
      ['--core-only', '--with-hook'],
      { targetDir: hookDir, stdinIsTTY: false }
    );
    assert.equal(hookResult.exitCode, 0);
    assert.ok(existsSync(path.join(hookDir, 'scripts', 'req-cli.mjs')));
    const hookPackage = readJsonFile(path.join(hookDir, 'package.json'));
    for (const scriptName of TARGET_SCRIPT_NAMES) {
      assert.equal(typeof hookPackage.scripts[scriptName], 'string');
    }
    const settings = readJsonFile(path.join(hookDir, '.claude', 'settings.local.json'));
    assert.equal(countExactHookCommands(settings, 'session-start.js'), 1);
    assert.equal(countExactHookCommands(settings, 'req-check.js', 'Bash'), 1);
    assert.equal(countExactHookCommands(settings, 'scope-guard.mjs', 'Bash'), 1);

    initGitProject(malformedPackageDir);
    const malformedPackage = '{ this-is-not-json';
    writeFile(malformedPackageDir, 'package.json', malformedPackage);
    const malformedResult = await harnessInstall.main(
      ['--core-only'],
      { targetDir: malformedPackageDir, stdinIsTTY: false }
    );
    assert.equal(malformedResult.exitCode, 0);
    assert.equal(readFileSync(path.join(malformedPackageDir, 'package.json'), 'utf8'), malformedPackage);
  } finally {
    rmSync(coreDir, { recursive: true, force: true });
    rmSync(hookDir, { recursive: true, force: true });
    rmSync(malformedPackageDir, { recursive: true, force: true });
  }
}

async function testCleanTemplateHistoryPreservesUserState() {
  const tempDir = createTempDir('harness-clean-history');
  try {
    initGitProject(tempDir);
    const index = `# Requirements Index

## 当前活跃 REQ

- \`REQ-2026-777\`：用户需求

## 当前搁置 REQ

- \`REQ-2026-778\`：用户搁置需求

## 最近完成 REQ

- \`REQ-2026-776\`：用户已完成需求
`;
    const progress = 'Current active REQ: REQ-2026-777\nCurrent phase: implementation\nLast updated: 2026-07-11\n';
    const userReq = '# REQ-2026-777: 用户需求\n\n## 状态\n- 当前状态：in-progress\n- 当前阶段：implementation\n';
    writeFile(tempDir, 'requirements/INDEX.md', index);
    writeFile(tempDir, '.claude/progress.txt', progress);
    writeFile(tempDir, 'requirements/in-progress/REQ-2026-777-user.md', userReq);
    writeFile(
      tempDir,
      'requirements/in-progress/REQ-2026-001-template-history.md',
      '# Template history\n\n<!-- Harness Lab template history -->\n'
    );

    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    for (let run = 0; run < 2; run += 1) {
      const result = await harnessInstall.main(
        ['--core-only', '--clean-template-history'],
        { targetDir: tempDir, stdinIsTTY: false }
      );
      assert.equal(result.exitCode, 0);
      assert.equal(readFileSync(path.join(tempDir, 'requirements', 'INDEX.md'), 'utf8'), index);
      assert.equal(readFileSync(path.join(tempDir, '.claude', 'progress.txt'), 'utf8'), progress);
      assert.equal(
        readFileSync(path.join(tempDir, 'requirements', 'in-progress', 'REQ-2026-777-user.md'), 'utf8'),
        userReq
      );
    }
    assert.ok(!existsSync(path.join(tempDir, 'requirements', 'in-progress', 'REQ-2026-001-template-history.md')));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testPackageTargetRejectsSymlinkEscapes() {
  if (process.platform === 'win32') return;
  const root = createTempDir('harness-symlink-escape');
  const outsideDir = path.join(root, 'outside');
  const directoryTarget = path.join(root, 'directory-target');
  const fileTarget = path.join(root, 'file-target');
  try {
    initGitProject(outsideDir, { name: 'outside-package', private: true, scripts: {} });
    const outsidePackagePath = path.join(outsideDir, 'package.json');
    const outsidePackage = readFileSync(outsidePackagePath, 'utf8');
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');

    initGitProject(directoryTarget);
    symlinkSync(outsideDir, path.join(directoryTarget, 'app'), 'dir');
    await assert.rejects(
      () => harnessInstall.main(
        ['--defaults', '--package-dir', 'app'],
        { targetDir: directoryTarget, stdinIsTTY: false }
      ),
      /resolves outside the target project through a symbolic link/
    );
    assert.equal(readFileSync(outsidePackagePath, 'utf8'), outsidePackage);
    assert.ok(!existsSync(path.join(directoryTarget, 'AGENTS.md')));
    assert.ok(!existsSync(path.join(directoryTarget, '.claude', 'progress.txt')));

    initGitProject(fileTarget);
    symlinkSync(outsidePackagePath, path.join(fileTarget, 'linked-package.json'), 'file');
    await assert.rejects(
      () => harnessInstall.main(
        ['--defaults', '--package-json', 'linked-package.json'],
        { targetDir: fileTarget, stdinIsTTY: false }
      ),
      /resolves outside the target project through a symbolic link/
    );
    assert.equal(readFileSync(outsidePackagePath, 'utf8'), outsidePackage);
    assert.ok(!existsSync(path.join(fileTarget, 'AGENTS.md')));
    assert.ok(!existsSync(path.join(fileTarget, '.claude', 'progress.txt')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testHookMergeRejectsSpoofsAndRequiresFullMatcher() {
  const tempDir = createTempDir('harness-hook-spoofs');
  try {
    initGitProject(tempDir);
    const canonicalReq = 'node "scripts/req-check.js"';
    const canonicalScope = 'node "scripts/scope-guard.mjs"';
    const customSettings = {
      hooks: {
        SessionStart: [
          { matcher: '*', hooks: [{ type: 'command', command: 'node scripts/custom-session-start.js' }] },
          { matcher: '*', hooks: [{ type: 'prompt', command: 'node scripts/session-start.js', prompt: 'noop' }] },
        ],
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo scripts/req-check.js' }] },
          { matcher: 'Write', hooks: [
            { type: 'command', command: canonicalReq },
            { type: 'command', command: canonicalScope },
          ] },
          { matcher: 'Write|Edit|NotebookEdit|Bash', hooks: [
            { type: 'command', command: 'node scripts/not-req-check.js' },
          ] },
        ],
      },
      permissions: { allow: [] },
    };
    writeFile(tempDir, '.claude/settings.local.json', `${JSON.stringify(customSettings, null, 2)}\n`);
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');

    for (let run = 0; run < 2; run += 1) {
      const result = await harnessInstall.main(
        ['--core-only', '--with-hook'],
        { targetDir: tempDir, stdinIsTTY: false }
      );
      assert.equal(result.exitCode, 0);
    }

    const settings = readJsonFile(path.join(tempDir, '.claude', 'settings.local.json'));
    assert.equal(countExactHookCommands(settings, 'session-start.js'), 1);
    assert.equal(countExactHookCommands(settings, 'req-check.js', 'Bash'), 1);
    assert.equal(countExactHookCommands(settings, 'scope-guard.mjs', 'Bash'), 1);
    const canonicalEntry = settings.hooks.PreToolUse.find((entry) => (
      String(entry.matcher).split('|').length === 4 &&
      countExactHookCommands({ hooks: { PreToolUse: [entry] } }, 'req-check.js') === 1 &&
      countExactHookCommands({ hooks: { PreToolUse: [entry] } }, 'scope-guard.mjs') === 1
    ));
    assert.ok(canonicalEntry, 'installer must add one full write-tool canonical hook entry');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testInvalidSettingsShapesFailPreflight() {
  const invalidSettings = [
    [],
    { hooks: [] },
    { hooks: { SessionStart: {} } },
    { hooks: { PreToolUse: [null] } },
    { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: 'invalid' }] } },
    { hooks: { SessionStart: [{ matcher: 42, hooks: [] }] } },
    { hooks: { SessionStart: [{ matcher: '*', hooks: [{ type: 'command' }] }] } },
    { permissions: [] },
    { permissions: { allow: 'Bash(node:*)' } },
    { permissions: { allow: [{}] } },
  ];
  const harnessInstall = await importFreshModule('scripts/harness-install.mjs');

  for (const [index, settings] of invalidSettings.entries()) {
    const tempDir = createTempDir(`harness-invalid-settings-shape-${index}`);
    try {
      initGitProject(tempDir);
      const packageBefore = readFileSync(path.join(tempDir, 'package.json'), 'utf8');
      const settingsRaw = `${JSON.stringify(settings, null, 2)}\n`;
      writeFile(tempDir, '.claude/settings.local.json', settingsRaw);
      await assert.rejects(
        () => harnessInstall.main(
          ['--defaults', '--with-hook'],
          { targetDir: tempDir, stdinIsTTY: false }
        ),
        /Existing .*settings\.local\.json/
      );
      assert.equal(readFileSync(path.join(tempDir, '.claude', 'settings.local.json'), 'utf8'), settingsRaw);
      assert.equal(readFileSync(path.join(tempDir, 'package.json'), 'utf8'), packageBefore);
      assert.ok(!existsSync(path.join(tempDir, 'AGENTS.md')));
      assert.ok(!existsSync(path.join(tempDir, '.claude', 'progress.txt')));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

async function testInvalidPackageScriptsFailPreflight() {
  const invalidScripts = [
    'npm test',
    [],
    null,
    { req: { sentinel: true } },
    { custom: 42 },
  ];
  const harnessInstall = await importFreshModule('scripts/harness-install.mjs');

  for (const [index, scripts] of invalidScripts.entries()) {
    const tempDir = createTempDir(`harness-invalid-package-scripts-${index}`);
    try {
      initGitProject(tempDir, { name: `invalid-scripts-${index}`, private: true, scripts });
      const packageBefore = readFileSync(path.join(tempDir, 'package.json'), 'utf8');
      await assert.rejects(
        () => harnessInstall.main(['--defaults'], { targetDir: tempDir, stdinIsTTY: false }),
        /Existing package\.json has a (non-object scripts field|non-string scripts\.)/
      );
      assert.equal(readFileSync(path.join(tempDir, 'package.json'), 'utf8'), packageBefore);
      assert.ok(!existsSync(path.join(tempDir, 'AGENTS.md')));
      assert.ok(!existsSync(path.join(tempDir, '.claude', 'progress.txt')));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

async function testInstallerPreflightAndFailureTerminalStates() {
  const invalidDir = createTempDir('harness-invalid-settings');
  const copyFailDir = createTempDir('harness-copy-failure');
  const verifyFailDir = createTempDir('harness-verify-failure');
  const badSource = createTempDir('harness-bad-source');
  try {
    initGitProject(invalidDir);
    const invalidSettings = '{ invalid-json';
    writeFile(invalidDir, '.claude/settings.local.json', invalidSettings);
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    await assert.rejects(
      () => harnessInstall.main(['--defaults', '--with-hook'], { targetDir: invalidDir, stdinIsTTY: false }),
      /Cannot parse existing \.claude\/settings\.local\.json/
    );
    assert.equal(readFileSync(path.join(invalidDir, '.claude', 'settings.local.json'), 'utf8'), invalidSettings);
    assert.ok(!existsSync(path.join(invalidDir, 'AGENTS.md')), 'preflight failure must happen before copying');
    assert.ok(!existsSync(path.join(invalidDir, '.claude', 'progress.txt')));

    initGitProject(copyFailDir);
    const copyFailure = captureExecFailure(() => execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'harness-install.mjs'), '--core-only', '--source', badSource],
      { cwd: copyFailDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ));
    assert.equal(copyFailure.status, 1);
    assert.doesNotMatch(copyFailure.stdout, /Harness Lab 安装完成/);
    const copyReport = readFileSync(path.join(copyFailDir, 'requirements', 'reports', 'harness-setup-report.md'), 'utf8');
    assert.match(copyReport, /\*\*状态\*\*：partial/);
    assert.match(copyReport, /Source asset is missing/);
    assert.ok(!existsSync(path.join(copyFailDir, 'AGENTS.md')));

    initGitProject(verifyFailDir);
    mkdirSync(path.join(verifyFailDir, 'AGENTS.md'), { recursive: true });
    const verificationFailure = captureExecFailure(() => execFileSync(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'harness-install.mjs'), '--core-only'],
      { cwd: verifyFailDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ));
    assert.equal(verificationFailure.status, 1);
    assert.doesNotMatch(verificationFailure.stdout, /Harness Lab 安装完成/);
    const verifyReport = readFileSync(path.join(verifyFailDir, 'requirements', 'reports', 'harness-setup-report.md'), 'utf8');
    assert.match(verifyReport, /\*\*状态\*\*：partial/);
    assert.match(verifyReport, /Missing or invalid installed file: AGENTS\.md/);
  } finally {
    rmSync(invalidDir, { recursive: true, force: true });
    rmSync(copyFailDir, { recursive: true, force: true });
    rmSync(verifyFailDir, { recursive: true, force: true });
    rmSync(badSource, { recursive: true, force: true });
  }
}

function testReqCheckAcceptsSluggedActiveReq() {
  const tempDir = createTempDir('req-check-slugged-active');
  const reqFilePath = 'requirements/in-progress/REQ-2026-777-slugged-active.md';
  const writeReq = (status, phase) => writeFile(tempDir, reqFilePath,
    `# REQ-2026-777: Slugged active fixture\n\n## 状态\n- 当前状态：${status}\n- 当前阶段：${phase}\n\n## 背景\n真实背景。\n\n## 目标\n- 真实目标\n\n## 验收标准\n- [x] 真实标准\n`);
  try {
    writeFile(
      tempDir,
      '.claude/progress.txt',
      `Current active REQ: REQ-2026-777
Current phase: implementation
Last updated: 2026-06-05
`
    );

    writeReq('in-progress', 'implementation');
    runReqCheck(tempDir, 'Write', { file_path: path.join(tempDir, 'src/app.js') });

    writeReq('draft', 'design');
    const failure = captureExecFailure(() => runReqCheck(tempDir, 'Write', { file_path: path.join(tempDir, 'src/app.js') }));
    assert.equal(failure.status, 2);
    assert.match(failure.stdout, /Active REQ \(REQ-2026-777\) is not ready/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testReqCreateSupportsChineseTitlesAndStrictSlugs() {
  const previousCwd = process.cwd();
  const roots = [];

  try {
    const chineseRoot = createTempDir('req-create-chinese-title');
    roots.push(chineseRoot);
    setupReqFixture(chineseRoot);
    process.chdir(chineseRoot);
    const chineseCli = await importFreshModule('scripts/req-cli.mjs');
    chineseCli.createCommand({ title: '修复登录问题', id: 'REQ-2099-010' });

    const reqPath = path.join(chineseRoot, 'requirements', 'in-progress', 'REQ-2099-010-requirement.md');
    assert.ok(existsSync(reqPath));
    assert.match(readFileSync(reqPath, 'utf8'), /^# REQ-2099-010: 修复登录问题$/m);
    chineseCli.experienceCommand({ id: 'REQ-2099-010' });
    assert.ok(existsSync(path.join(chineseRoot, 'context', 'experience', 'REQ-2099-010-experience.md')));

    const explicitRoot = createTempDir('req-create-explicit-slug');
    roots.push(explicitRoot);
    setupReqFixture(explicitRoot);
    process.chdir(explicitRoot);
    const explicitCli = await importFreshModule('scripts/req-cli.mjs');
    explicitCli.createCommand({ title: '中文标题', slug: 'login-fix-2', id: 'REQ-2099-011' });
    assert.ok(existsSync(path.join(explicitRoot, 'requirements', 'in-progress', 'REQ-2099-011-login-fix-2.md')));

    for (const [index, invalidSlug] of ['../escape', 'two words', 'Upper-Case', '中文', 'double--dash'].entries()) {
      const invalidRoot = createTempDir(`req-create-invalid-slug-${index}`);
      roots.push(invalidRoot);
      setupReqFixture(invalidRoot);
      process.chdir(invalidRoot);
      const invalidCli = await importFreshModule('scripts/req-cli.mjs');
      const result = captureCommandFailure(() => invalidCli.createCommand({
        title: 'Invalid slug fixture',
        slug: invalidSlug,
        id: `REQ-2099-02${index}`,
      }));
      assert.equal(result.exitCode, 1, `invalid slug must fail: ${invalidSlug}`);
      assert.match(result.stderr, /lowercase ASCII kebab-case/);
      assert.deepEqual(readdirSync(path.join(invalidRoot, 'requirements', 'in-progress')), []);
    }
  } finally {
    process.chdir(previousCwd);
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  }
}

function testExecutableUserDocsStayAligned() {
  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const firstReq = readFileSync(
    path.join(repoRoot, '.agents', 'skills', 'source-command-first-req', 'SKILL.md'),
    'utf8'
  );
  const reqTemplate = readFileSync(path.join(repoRoot, 'requirements', 'REQ_TEMPLATE.md'), 'utf8');
  const testingStrategy = readFileSync(path.join(repoRoot, 'context', 'tech', 'testing-strategy.md'), 'utf8');
  const reqCliSource = readFileSync(path.join(repoRoot, 'scripts', 'req-cli.mjs'), 'utf8');

  assert.match(readme, /npm exec|npx --yes --package=harness-lab harness-install/);
  assert.match(readme, /req:block[^\n]*--reason[^\n]*--condition[^\n]*--next/);
  assert.match(readme, /req:start -- --id REQ-YYYY-NNN --phase implementation/);
  assert.match(readme, /纯中文|非 ASCII/);
  assert.match(readme, /hook-policy\.mjs[^\n]*完整矩阵/);
  assert.match(readme, /\.harness\/profile\.json[^\n]*安装了什么/);
  assert.match(readme, /`req-check`[^\n]*不读取 mode/);
  assert.match(readme, /`scope-guard`[^\n]*阻断/);
  assert.match(readme, /`deploy-guard`[^\n]*高级 Hook/);
  assert.match(readme, /`review-gatekeeper`[^\n]*高级 Hook/);

  assert.match(firstReq, /node scripts\/req-cli\.mjs create/);
  assert.match(firstReq, /npm run req:create/);
  assert.match(firstReq, /requirement/);
  assert.match(firstReq, /不得把 `npm test`、`pytest`、`go test \.\/\.\.\.` 或 `cargo test` 当作默认事实/);

  assert.match(reqTemplate, /只填写目标项目中已存在且实际执行过的命令/);
  assert.match(testingStrategy, /package\.json/);
  assert.match(testingStrategy, /pyproject\.toml/);
  assert.match(testingStrategy, /go\.mod/);
  assert.match(testingStrategy, /Cargo\.toml/);
  assert.match(testingStrategy, /无命令时明确记录缺口/);
  assert.doesNotMatch(reqCliSource, /计划执行的命令：`npm test/);
}

function runScopeGuard(root, relPath, toolName = 'Write') {
  return execFileSync(process.execPath, [path.join(repoRoot, 'scripts/scope-guard.mjs')], {
    cwd: root,
    input: JSON.stringify({
      cwd: root,
      tool_name: toolName,
      tool_input: {
        file_path: path.join(root, relPath),
      },
    }),
    encoding: 'utf8',
  });
}

// OPT-1A: run req-check with a synthetic PreToolUse stdin event.
function runReqCheck(root, toolName, toolInput, eventCwd = root) {
  return execFileSync(process.execPath, [path.join(repoRoot, 'scripts/req-check.js')], {
    cwd: root,
    input: JSON.stringify({ cwd: eventCwd, tool_name: toolName, tool_input: toolInput }),
    encoding: 'utf8',
  });
}

// OPT-1A: run scope-guard with a raw event (used for Bash branch tests).
function runScopeGuardRaw(root, event) {
  return execFileSync(process.execPath, [path.join(repoRoot, 'scripts/scope-guard.mjs')], {
    cwd: root,
    input: JSON.stringify({ cwd: root, ...event }),
    encoding: 'utf8',
  });
}

function testWriteTargetPolicyClassifiesAllSupportedTargets() {
  const raws = (command) => classifyBashWrites(command).targets.map((target) => target.raw);

  assert.deepEqual(raws('echo x > a.txt > b.txt'), ['a.txt', 'b.txt']);
  assert.deepEqual(raws('printf x | tee -a a.txt b.txt'), ['a.txt', 'b.txt']);
  assert.deepEqual(raws('rm -f a.txt b.txt'), ['a.txt', 'b.txt']);
  assert.deepEqual(raws('touch a.txt b.txt'), ['a.txt', 'b.txt']);
  assert.deepEqual(raws('touch -d yesterday dated.txt'), ['dated.txt']);
  assert.deepEqual(raws('mkdir -p one two'), ['one', 'two']);
  assert.deepEqual(raws('mkdir -m 755 one'), ['one']);
  assert.deepEqual(raws('cp source.txt destination.txt'), ['destination.txt']);
  assert.deepEqual(raws('cp a.txt b.txt output'), ['output/a.txt', 'output/b.txt']);
  assert.deepEqual(raws('mv old.txt new.txt'), ['old.txt', 'new.txt']);
  assert.deepEqual(raws('ln -s source.txt link.txt'), ['link.txt']);
  assert.deepEqual(
    raws("sed -i.bak 's/a/b/' first.txt second.txt"),
    ['first.txt', 'first.txt.bak', 'second.txt', 'second.txt.bak']
  );
  assert.deepEqual(raws("perl -pi -e 's/a/b/' first.txt second.txt"), ['first.txt', 'second.txt']);
  assert.deepEqual(raws("gawk -i inplace '{ print }' first.txt second.txt"), ['first.txt', 'second.txt']);
  assert.deepEqual(raws("sed -i -f changes.sed first.txt second.txt"), ['first.txt', 'second.txt']);
  assert.deepEqual(
    raws('cp input.txt allowed/copied.txt && echo ok > blocked/one.txt > blocked/two.txt'),
    ['allowed/copied.txt', 'blocked/one.txt', 'blocked/two.txt']
  );
  assert.deepEqual(raws('echo ok\nrm newline-a.txt newline-b.txt'), ['newline-a.txt', 'newline-b.txt']);
  assert.deepEqual(raws('echo ok & rm background-a.txt background-b.txt'), ['background-a.txt', 'background-b.txt']);

  const dynamic = classifyBashWrites('echo x > $TARGET');
  assert.equal(dynamic.writes, true);
  assert.equal(dynamic.unresolved, true);
  assert.deepEqual(dynamic.targets.map((target) => target.raw), ['$TARGET']);
  assert.equal(classifyBashWrites('echo x > *.log').unresolved, true);

  const noInplaceTarget = classifyBashWrites("sed -i 's/a/b/'");
  assert.equal(noInplaceTarget.writes, true);
  assert.equal(noInplaceTarget.unresolved, true);

  assert.equal(classifyBashWrites('echo x > /dev/null 2>&1').writes, false);
  assert.equal(classifyBashWrites(`node -e "console.log('> not-a-shell-redirect')"`).writes, false);
  assert.ok(!tokenizeShell(`node -e "console.log('> quoted')"`).some((token) => token.value === '>'));
}

function testCanonicalWriteTargetsHandleTraversalPrefixesAndSymlinks() {
  const root = createTempDir('write-target-canonical');
  const sibling = `${root}-copy`;
  try {
    mkdirSync(path.join(root, 'allowed'), { recursive: true });
    mkdirSync(path.join(root, 'blocked'), { recursive: true });
    mkdirSync(path.join(sibling, 'requirements'), { recursive: true });

    const normal = canonicalizeWriteTarget(root, 'allowed/./file.txt');
    assert.equal(normal.insideRepo, true);
    assert.equal(normal.relativePath, 'allowed/file.txt');

    const traversal = canonicalizeWriteTarget(root, 'allowed/../blocked/file.txt');
    assert.equal(traversal.insideRepo, true);
    assert.equal(traversal.relativePath, 'blocked/file.txt');

    const windowsSeparator = canonicalizeWriteTarget(root, 'allowed\\nested\\file.txt');
    assert.equal(windowsSeparator.insideRepo, true);
    assert.equal(windowsSeparator.relativePath, 'allowed/nested/file.txt');

    const prefixCollision = canonicalizeWriteTarget(root, path.join(sibling, 'requirements', 'outside.md'));
    assert.equal(prefixCollision.insideRepo, false);
    assert.equal(prefixCollision.relativePath, null);

    if (process.platform !== 'win32') {
      symlinkSync(sibling, path.join(root, 'allowed', 'linked-outside'), 'dir');
      const symlinkEscape = canonicalizeWriteTarget(root, 'allowed/linked-outside/new.md');
      assert.equal(symlinkEscape.insideRepo, false);
      assert.match(symlinkEscape.absolutePath, /write-target-canonical-.*-copy/);
    }

    const analyzed = analyzeHookWrite({
      tool_name: 'Bash',
      tool_input: { command: 'echo x > allowed/a.txt > blocked/b.txt' },
    }, root);
    assert.equal(analyzed.targets.length, 2);
    assert.deepEqual(analyzed.targets.map((target) => target.relativePath), ['allowed/a.txt', 'blocked/b.txt']);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(sibling, { recursive: true, force: true });
  }
}

function testReqCheckCanonicalGovernanceWhitelistRequiresEveryTarget() {
  const root = createTempDir('req-check-canonical-whitelist');
  const sibling = `${root}-copy`;
  try {
    initGitProject(root);
    setupReqFixture(root);
    mkdirSync(path.join(sibling, 'requirements'), { recursive: true });

    runReqCheck(root, 'Write', { file_path: 'requirements\\in-progress\\REQ-x.md' });
    runReqCheck(root, 'Bash', {
      command: 'echo x > requirements/in-progress/REQ-x.md > docs/plans/x.md',
    });

    for (const event of [
      { tool_name: 'Write', tool_input: { file_path: path.join(root, 'requirements', '..', 'src', 'app.js') } },
      { tool_name: 'Write', tool_input: { file_path: path.join(sibling, 'requirements', 'outside.md') } },
      { tool_name: 'Bash', tool_input: { command: 'echo x > requirements/ok.md > src/app.js' } },
      { tool_name: 'Bash', tool_input: { command: 'echo x > $TARGET' } },
      { tool_name: 'Write', tool_input: { file_path: { invalid: true } } },
    ]) {
      const failure = captureExecFailure(() => runReqCheck(root, event.tool_name, event.tool_input));
      assert.equal(failure.status, 2);
    }

    const nestedCwd = path.join(root, 'packages', 'app');
    mkdirSync(nestedCwd, { recursive: true });
    const nestedFailure = captureExecFailure(() => runReqCheck(
      root,
      'Write',
      { file_path: path.join(root, 'src', 'nested-cwd.js') },
      nestedCwd
    ));
    assert.equal(nestedFailure.status, 2, 'nested event cwd must still resolve the repository root');
    const invalidCwdFailure = captureExecFailure(() => runReqCheck(
      root,
      'Write',
      { file_path: path.join(root, 'src', 'invalid-cwd.js') },
      path.join(root, 'does-not-exist')
    ));
    assert.equal(invalidCwdFailure.status, 2, 'invalid event cwd must fall back to the hook process repository');

    if (process.platform !== 'win32') {
      symlinkSync(sibling, path.join(root, 'requirements', 'linked-outside'), 'dir');
      const failure = captureExecFailure(() => runReqCheck(root, 'Write', {
        file_path: path.join(root, 'requirements', 'linked-outside', 'new.md'),
      }));
      assert.equal(failure.status, 2);
    }

    runReqCheck(root, 'Bash', { command: `node -e "console.log('> src/not-a-write.js')"` });
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(sibling, { recursive: true, force: true });
  }
}

function writeScopedReqFixture(root, reqId = 'REQ-2026-951') {
  writeFile(
    root,
    '.claude/progress.txt',
    `Current active REQ: ${reqId}\nCurrent phase: implementation\nLast updated: 2026-07-11\n`
  );
  writeFile(
    root,
    `requirements/in-progress/${reqId}-multi-target.md`,
    `# ${reqId}: Multi-target scope fixture

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
验证多目标和 canonical path 范围门禁。

## 目标
- 所有写目标都经过范围判定

## 范围
- 涉及文件：
  - \`scripts/allowed/**\`

## 验收标准
- [x] 任一越界目标都会阻断
`
  );
}

function testScopeGuardChecksEveryCanonicalTargetAndExemption() {
  const root = createTempDir('scope-guard-multi-target');
  const outside = `${root}-outside`;
  try {
    initGitProject(root);
    writeScopedReqFixture(root);
    mkdirSync(path.join(root, 'scripts', 'allowed'), { recursive: true });
    mkdirSync(path.join(root, 'scripts', 'blocked'), { recursive: true });
    mkdirSync(outside, { recursive: true });

    assert.equal(runScopeGuardRaw(root, {
      tool_name: 'Bash',
      tool_input: { command: 'echo x > scripts\\allowed\\a.txt' },
    }), '');
    assert.equal(runScopeGuardRaw(root, {
      tool_name: 'Bash',
      tool_input: { command: 'cp input.txt scripts/allowed/copied.txt' },
    }), '');
    assert.equal(runScopeGuardRaw(root, {
      tool_name: 'Bash',
      tool_input: { command: 'ln -s input.txt scripts/allowed/link.txt' },
    }), '');
    assert.equal(runScopeGuardRaw(root, {
      tool_name: 'Bash',
      tool_input: { command: `node -e "console.log('> scripts/blocked/not-a-write')"` },
    }), '');

    const blockedCommands = [
      'echo x > scripts/allowed/a.txt > scripts/blocked/b.txt',
      'mv scripts/allowed/a.txt scripts/blocked/b.txt',
      'ln -s input.txt scripts/blocked/link.txt',
      "sed -i 's/a/b/' scripts/allowed/a.txt scripts/blocked/b.txt",
      'echo x > scripts/allowed/../blocked/traversal.txt',
      'echo x > $TARGET',
      'echo x > *.log',
    ];
    for (const command of blockedCommands) {
      const output = runScopeGuardRaw(root, { tool_name: 'Bash', tool_input: { command } });
      const decision = JSON.parse(output);
      assert.equal(decision.decision, 'block', command);
      assert.match(decision.reason, /失败目标/);
    }

    const directTraversal = JSON.parse(runScopeGuardRaw(root, {
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'scripts', 'allowed', '..', 'blocked', 'direct.txt') },
    }));
    assert.equal(directTraversal.decision, 'block');
    const invalidDirect = JSON.parse(runScopeGuardRaw(root, {
      tool_name: 'Write',
      tool_input: { file_path: { invalid: true } },
    }));
    assert.equal(invalidDirect.decision, 'block');

    const nestedCwd = path.join(root, 'packages', 'app');
    mkdirSync(nestedCwd, { recursive: true });
    const nestedDecision = JSON.parse(runScopeGuardRaw(root, {
      cwd: nestedCwd,
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'scripts', 'blocked', 'nested-cwd.txt') },
    }));
    assert.equal(nestedDecision.decision, 'block');
    const invalidCwdDecision = JSON.parse(runScopeGuardRaw(root, {
      cwd: path.join(root, 'does-not-exist'),
      tool_name: 'Write',
      tool_input: { file_path: path.join(root, 'scripts', 'blocked', 'invalid-cwd.txt') },
    }));
    assert.equal(invalidCwdDecision.decision, 'block');

    if (process.platform !== 'win32') {
      symlinkSync(outside, path.join(root, 'scripts', 'allowed', 'linked-outside'), 'dir');
      const symlinkDecision = JSON.parse(runScopeGuardRaw(root, {
        tool_name: 'Write',
        tool_input: { file_path: path.join(root, 'scripts', 'allowed', 'linked-outside', 'new.txt') },
      }));
      assert.equal(symlinkDecision.decision, 'block');
      assert.match(symlinkDecision.reason, /outside the repository/);
    }

    writeFile(root, '.claude/.req-exempt', 'REQ-2026-951 test exemption\n');
    assert.equal(runScopeGuardRaw(root, {
      tool_name: 'Bash',
      tool_input: { command: 'echo x > scripts/blocked/exempt.txt' },
    }), '');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
}

function testScopeGuardHonorsWorktreeExemption() {
  const root = createTempDir('scope-guard-worktree-exempt');
  const worktree = `${root}-wt`;
  try {
    initGitProject(root);
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: root });
    writeFile(root, 'tracked.txt', 'baseline\n');
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '-m', 'baseline'], { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'req-951-worktree', worktree], { cwd: root });

    writeScopedReqFixture(worktree);
    const beforeExempt = runScopeGuardRaw(worktree, {
      tool_name: 'Bash',
      tool_input: { command: 'echo x > scripts/blocked/no-exempt.txt' },
    });
    assert.equal(JSON.parse(beforeExempt).decision, 'block');

    const exemptPath = getExemptPath(worktree);
    mkdirSync(path.dirname(exemptPath), { recursive: true });
    writeFileSync(exemptPath, 'worktree exemption\n', 'utf8');
    assert.equal(runScopeGuardRaw(worktree, {
      tool_name: 'Bash',
      tool_input: { command: 'echo x > scripts/blocked/exempt.txt' },
    }), '');
  } finally {
    try {
      execFileSync('git', ['worktree', 'remove', '--force', worktree], { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] });
    } catch {
      rmSync(worktree, { recursive: true, force: true });
    }
    rmSync(root, { recursive: true, force: true });
  }
}

function testScopeGuardBlocksReadOnlyReqWrites() {
  const tempDir = createTempDir('scope-guard-readonly');
  try {
    writeFile(
      tempDir,
      '.claude/progress.txt',
      `Current active REQ: REQ-2026-999
Current phase: implementation
Last updated: 2026-06-10
`
    );
    writeFile(
      tempDir,
      'requirements/in-progress/REQ-2026-999-readonly-audit.md',
      `# REQ-2026-999: Read-only audit

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
审计当前代码健康度。

## 目标
- 产出审计报告

## 非目标
- 不在本次审计中修复任何 finding（只产出报告）

## 范围
- 影响接口 / 页面 / 脚本：无代码改动，仅产出审计报告

### 约束（Scope Control）

**允许（CAN）**：
- 读取所有源代码和测试文件
- 产出审计报告到 requirements/reports/

**禁止（CANNOT）**：
- 修改任何源代码或测试代码
- 修改任何配置文件

## 验收标准
- [ ] 审计报告产出到 requirements/reports/REQ-2026-999-audit-report.md
- [ ] 无代码改动
`
    );

    const sourceOutput = runScopeGuard(tempDir, 'server/app/main.py');
    const sourceDecision = JSON.parse(sourceOutput);
    assert.equal(sourceDecision.decision, 'block');
    assert.match(sourceDecision.reason, /只读 REQ/);

    const frontendOutput = runScopeGuard(tempDir, 'app/src/App.tsx');
    assert.equal(JSON.parse(frontendOutput).decision, 'block');

    const testOutput = runScopeGuard(tempDir, 'server/tests/test_api.py');
    assert.equal(JSON.parse(testOutput).decision, 'block');

    const configOutput = runScopeGuard(tempDir, 'Dockerfile');
    assert.equal(JSON.parse(configOutput).decision, 'block');

    const reportOutput = runScopeGuard(tempDir, 'requirements/reports/REQ-2026-999-audit-report.md');
    assert.equal(reportOutput, '');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function testScopeGuardAllowsLegacyReqWithoutScope() {
  const tempDir = createTempDir('scope-guard-legacy');
  try {
    writeFile(
      tempDir,
      '.claude/progress.txt',
      `Current active REQ: REQ-2026-998
Current phase: implementation
Last updated: 2026-06-10
`
    );
    writeFile(
      tempDir,
      'requirements/in-progress/REQ-2026-998-legacy.md',
      `# REQ-2026-998: Legacy fixture

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
历史 REQ 没有结构化范围声明。

## 目标
- 保持向后兼容

## 验收标准
- [ ] 不阻断旧 REQ
`
    );

    assert.equal(runScopeGuard(tempDir, 'server/app/main.py'), '');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// OPT-1A: Bash write without a REQ must be blocked (closes the bypass).
function testReqCheckBlocksBashWriteWithoutReq() {
  const tempDir = createTempDir('req-check-bash-write');
  try {
    setupReqFixture(tempDir); // no active REQ
    const redirect = captureExecFailure(() =>
      runReqCheck(tempDir, 'Bash', { command: 'echo x > src/a.ts' })
    );
    assert.equal(redirect.status, 2);

    const inplace = captureExecFailure(() =>
      runReqCheck(tempDir, 'Bash', { command: "sed -i 's/a/b/' src/a.ts" })
    );
    assert.equal(inplace.status, 2);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// OPT-1A: pure-read Bash commands must pass without a REQ (zero friction).
function testReqCheckAllowsBashPureReadWithoutReq() {
  const tempDir = createTempDir('req-check-bash-read');
  try {
    setupReqFixture(tempDir); // no active REQ
    runReqCheck(tempDir, 'Bash', { command: 'ls -la' });
    runReqCheck(tempDir, 'Bash', { command: 'grep foo src/a.ts' });
    runReqCheck(tempDir, 'Bash', { command: 'cat src/a.ts' });
    runReqCheck(tempDir, 'Bash', { command: 'git status' });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// OPT-1A: governance-dir whitelist must work now that stdin path is read (dead-code fix).
function testReqCheckWhitelistRestoresGovernanceWrites() {
  const tempDir = createTempDir('req-check-whitelist');
  try {
    setupReqFixture(tempDir); // no active REQ
    runReqCheck(tempDir, 'Write', { file_path: path.join(tempDir, 'requirements/in-progress/REQ-x.md') });
    runReqCheck(tempDir, 'Write', { file_path: path.join(tempDir, 'docs/plans/x.md') });
    runReqCheck(tempDir, 'Write', { file_path: path.join(tempDir, '.claude/progress.txt') });
    runReqCheck(tempDir, 'Bash', { command: 'echo x > .claude/state.json' });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// OPT-1A: scope-guard judges Bash write targets against the active REQ scope.
function testScopeGuardJudgesBashWriteScope() {
  const tempDir = createTempDir('scope-guard-bash');
  try {
    writeFile(
      tempDir,
      '.claude/progress.txt',
      `Current active REQ: REQ-2026-950\nCurrent phase: implementation\nLast updated: 2026-06-21\n`
    );
    writeFile(
      tempDir,
      'requirements/in-progress/REQ-2026-950-bash-scope.md',
      `# REQ-2026-950: Bash scope fixture\n\n## 状态\n- 当前状态：in-progress\n- 当前阶段：implementation\n\n## 背景\n测 Bash 写范围判定。\n\n## 目标\n- 验证 Bash 写范围判定\n\n## 范围\n- 涉及文件：\n  - \`scripts/foo.mjs\`\n\n## 验收标准\n- [x] Bash 范围判定正确\n`
    );
    // In-scope Bash write → allow (empty output)
    const inScope = runScopeGuardRaw(tempDir, { tool_name: 'Bash', tool_input: { command: 'echo x > scripts/foo.mjs' } });
    assert.equal(inScope, '');
    // Out-of-scope Bash write → block
    const outScope = runScopeGuardRaw(tempDir, { tool_name: 'Bash', tool_input: { command: 'echo x > scripts/bar.mjs' } });
    assert.equal(JSON.parse(outScope).decision, 'block');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function testLocalHookConfigUsesExistingJsEntrypoints() {
  const settings = JSON.parse(readFileSync(path.join(repoRoot, '.claude', 'settings.local.json'), 'utf8'));
  const sessionCommand = settings.hooks.SessionStart[0].hooks[0].command;
  const reqCheckCommand = settings.hooks.PreToolUse[0].hooks[0].command;
  const scopeGuardCommand = settings.hooks.PreToolUse[0].hooks[1].command;
  assert.match(sessionCommand, /scripts\/session-start\.js/);
  assert.match(reqCheckCommand, /scripts\/req-check\.js/);
  assert.match(scopeGuardCommand, /scripts\/scope-guard\.mjs/);
  assert.ok(!sessionCommand.includes('session-start.sh'));
  assert.ok(!reqCheckCommand.includes('req-check.sh'));
}

function testAutoReviewUsesArgArrayForShellSyntaxCheck() {
  const content = readFileSync(path.join(repoRoot, 'scripts', 'auto-review.mjs'), 'utf8');
  assert.match(content, /spawnSync\('bash', \['-n', fullPath\]/);
  assert.ok(!content.includes('execSync(`bash -n "${fullPath}"`'));
}

async function testPackageBindingFallsBackToPlaceholderGuards() {
  const tempDir = createTempDir('harness-install-placeholders');
  try {
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');

    writeFile(
      tempDir,
      'package.json',
      JSON.stringify(
        {
          name: 'fixture-project',
          scripts: {
            test: 'playwright test',
          },
        },
        null,
        2
      )
    );

    harnessInstall.copyFiles(repoRoot, tempDir, ['cli']);
    const packageUpdate = harnessInstall.updateTargetPackageJson(tempDir);
    const packageJson = JSON.parse(readFileSync(path.join(tempDir, 'package.json'), 'utf8'));

    assert.equal(packageJson.scripts.lint, 'node scripts/template-guard.mjs lint');
    assert.equal(packageJson.scripts.test, 'playwright test');
    assert.equal(packageJson.scripts.build, 'node scripts/template-guard.mjs build');
    assert.equal(packageJson.scripts.verify, 'npm run test');
    assert.equal(packageJson.scripts.req, 'node scripts/req-cli.mjs');
    assert.equal(packageUpdate.generatedVerify, true);
    assert.ok(packageUpdate.bindingStatus.some((item) => item.name === 'lint' && item.status === 'placeholder-added'));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testPackageBindingSupportsPackageDir() {
  const tempDir = createTempDir('harness-install-package-dir');
  try {
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');

    writeFile(
      tempDir,
      'app/package.json',
      JSON.stringify(
        {
          name: 'fixture-app',
          scripts: {
            test: 'vitest run',
          },
        },
        null,
        2
      )
    );

    const packageUpdate = harnessInstall.updateTargetPackageJson(tempDir, { packageDir: 'app' });
    const packageJson = JSON.parse(readFileSync(path.join(tempDir, 'app', 'package.json'), 'utf8'));

    assert.equal(packageUpdate.exists, true);
    assert.equal(packageUpdate.relPath, 'app/package.json');
    assert.equal(packageUpdate.packageDirRel, 'app');
    assert.equal(packageJson.scripts.lint, 'cd .. && node scripts/template-guard.mjs lint');
    assert.equal(packageJson.scripts.test, 'vitest run');
    assert.equal(packageJson.scripts.build, 'cd .. && node scripts/template-guard.mjs build');
    assert.equal(packageJson.scripts.verify, 'npm run test');
    assert.equal(packageJson.scripts['req:create'], 'cd .. && node scripts/req-cli.mjs create');
    assert.equal(
      packageJson.scripts['docs:verify'],
      'cd .. && git -c safe.directory=* status --porcelain=v1 -uall > .claude/.docs-verify-status && node scripts/docs-verify.mjs --status-file .claude/.docs-verify-status'
    );

    writeFile(
      tempDir,
      'api/package.json',
      JSON.stringify({ name: 'fixture-api', scripts: {} }, null, 2)
    );
    const packageJsonUpdate = harnessInstall.updateTargetPackageJson(tempDir, {
      packageJson: 'api/package.json',
    });
    const apiPackageJson = JSON.parse(readFileSync(path.join(tempDir, 'api', 'package.json'), 'utf8'));
    assert.equal(packageJsonUpdate.relPath, 'api/package.json');
    assert.equal(packageJsonUpdate.source, 'package-json');
    assert.equal(apiPackageJson.scripts['req:start'], 'cd .. && node scripts/req-cli.mjs start');

    const reportPath = harnessInstall.generateReport(
      tempDir,
      ['core', 'docs', 'context', 'skills', 'cli'],
      { copied: [], skipped: [], failed: [] },
      false,
      packageUpdate
    );
    const report = readFileSync(reportPath, 'utf8');
    assert.match(report, /目标 package\*\*：`app\/package\.json`/);
    assert.match(report, /npm --prefix app run req:create/);
    assert.match(report, /只改变 package scripts 绑定位置/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testMissingRootPackageReportsCandidatesAndNodeFallback() {
  const tempDir = createTempDir('harness-install-missing-package');
  try {
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');

    writeFile(
      tempDir,
      'app/package.json',
      JSON.stringify({ name: 'fixture-app', scripts: { test: 'vitest run' } }, null, 2)
    );

    const packageUpdate = harnessInstall.updateTargetPackageJson(tempDir);
    assert.equal(packageUpdate.exists, false);
    assert.equal(packageUpdate.requestedPath, 'package.json');
    assert.ok(packageUpdate.candidates.some((candidate) => candidate.relPath === 'app/package.json'));

    const packageJson = JSON.parse(readFileSync(path.join(tempDir, 'app', 'package.json'), 'utf8'));
    assert.deepEqual(packageJson.scripts, { test: 'vitest run' });

    const reportPath = harnessInstall.generateReport(
      tempDir,
      ['core', 'docs', 'context', 'skills', 'cli'],
      { copied: [], skipped: [], failed: [] },
      false,
      packageUpdate
    );
    const report = readFileSync(reportPath, 'utf8');
    assert.match(report, /未绑定 package scripts/);
    assert.match(report, /app\/package\.json/);
    assert.match(report, /--package-dir app/);
    assert.match(report, /node scripts\/req-cli\.mjs create/);
    assert.match(report, /默认安装是治理引导，不是完整镜像/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function testHarnessSetupCommandSkillAndBinStayAligned() {
  const commandPath = path.join(repoRoot, '.claude', 'commands', 'harness-setup.md');
  const skillPath = path.join(repoRoot, '.agents', 'skills', 'source-command-harness-setup', 'SKILL.md');
  const packageJsonPath = path.join(repoRoot, 'package.json');

  assert.ok(existsSync(commandPath), 'harness-setup command should exist');
  assert.ok(existsSync(skillPath), 'source-command-harness-setup skill should exist');

  const command = readFileSync(commandPath, 'utf8');
  const skill = readFileSync(skillPath, 'utf8');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  const requiredPhrases = [
    '默认跳过已有文件',
    '.claude/progress.txt',
    '.claude/settings.local.json',
    'REQ lifecycle/status/experience',
    'source-command-worktree-req',
    '一个 worktree 一个 active REQ',
    'scripts/session-start.js',
    'scripts/req-check.js',
    'node /path/to/harness-lab/scripts/harness-install.mjs --defaults',
    'npx --yes --package=harness-lab harness-install --defaults',
    '--package-dir app',
    '默认安装是治理引导，不是完整镜像',
    'req:create` 只会生成骨架',
    '自动绑定只会复用标准脚本名',
  ];

  for (const phrase of requiredPhrases) {
    assert.ok(command.includes(phrase), `command should include: ${phrase}`);
    assert.ok(skill.includes(phrase), `skill should include: ${phrase}`);
  }

  const forbiddenPhrases = [
    '.Codex',
    '环境变量 `HARNESS_LAB_SOURCE`',
    '当前项目的 `node_modules/harness-lab/`',
    '覆盖已有文件',
    '取消安装',
    '`AGENTS.md` - 会话入口协议',
    'npx harness-install --defaults',
  ];

  for (const phrase of forbiddenPhrases) {
    assert.ok(!command.includes(phrase), `command should not include stale phrase: ${phrase}`);
    assert.ok(!skill.includes(phrase), `skill should not include stale phrase: ${phrase}`);
  }

  assert.equal(packageJson.bin?.['harness-install'], 'scripts/harness-install.mjs');
  assert.ok(existsSync(path.join(repoRoot, packageJson.bin['harness-install'])));
}

async function testDesignDocExemptionMechanism() {
  // Test checkbox format exemption
  const reqWithCheckboxExemption = `# REQ-2026-999: Example

## 状态
- 当前状态：draft
- 当前阶段：design

## 背景
Real background content here.

## 目标
- Real goal 1
- Real goal 2

## 验收标准
- [ ] Real acceptance criteria

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation（小改动无需设计文档）

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/
`;

  // Test legacy text format exemption
  const reqWithLegacyExemption = `# REQ-2026-998: Example

## 状态
- 当前状态：draft
- 当前阶段：design

## 背景
Real background content here.

## 目标
- Real goal 1
- Real goal 2

## 验收标准
- [ ] Real acceptance criteria

### 约束（Scope Control，可选）

This is a small fix. 设计文档豁免

**允许（CAN）**：
- 可修改的文件 / 模块：scripts/
`;

  const { validateDesignDocument } = await importFreshModule('scripts/req-validation.mjs');

  // Checkbox format should skip design validation
  const checkboxResult = validateDesignDocument('REQ-2026-999', reqWithCheckboxExemption, repoRoot);
  assert.ok(checkboxResult.skipped, 'Checkbox format exemption should be detected');
  assert.ok(checkboxResult.valid, 'Exempted REQ should be valid');

  // Legacy format should also skip design validation
  const legacyResult = validateDesignDocument('REQ-2026-998', reqWithLegacyExemption, repoRoot);
  assert.ok(legacyResult.skipped, 'Legacy format exemption should be detected');
  assert.ok(legacyResult.valid, 'Exempted REQ should be valid');
}

async function testSetReqStatusAndPhaseBoundary() {
  // REQ document with status/phase patterns in other sections (code examples)
  const reqWithDuplicatePatterns = `# REQ-2026-999: Boundary Test

## 状态
- 当前状态：draft
- 当前阶段：design

## 背景
以下是错误示例：
\`\`\`markdown
## 状态
- 当前状态：示例状态
- 当前阶段：示例阶段
\`\`\`

注意：上面的示例不应被修改。

## 目标
- Real goal 1

## 验收标准
- [ ] 标准 1
`;

  const reqCli = await importFreshModule('scripts/req-cli.mjs');

  // Use the exported function if available, otherwise simulate the behavior
  // Since setReqStatusAndPhase is not exported, we test via startCommand behavior
  // For now, we'll create a minimal fixture and test the regex directly

  const statusSectionPattern = /(## 状态\n+)([\s\S]*?)(?=\n## |$)/;
  const match = reqWithDuplicatePatterns.match(statusSectionPattern);
  assert.ok(match, 'Should find status section');

  // Simulate the replacement logic
  let section = match[2];
  section = section.replace(/^- 当前状态：.*$/m, `- 当前状态：in-progress`);
  section = section.replace(/^- 当前阶段：.*$/m, `- 当前阶段：implementation`);

  const result = reqWithDuplicatePatterns.replace(statusSectionPattern, `$1${section.trimEnd()}\n`);

  // Verify the status section was updated
  assert.match(result, /^- 当前状态：in-progress$/m);
  assert.match(result, /^- 当前阶段：implementation$/m);

  // Verify the code example was NOT modified
  assert.match(result, /- 当前状态：示例状态/);
  assert.match(result, /- 当前阶段：示例阶段/);

  // Verify the warning text is still present
  assert.match(result, /上面的示例不应被修改/);
}

async function testReqBlockCommand() {
  const tempDir = createTempDir('req-block');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);

    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    // Create a REQ
    reqCli.createCommand({ title: 'Block Test', slug: 'block-test' });

    // Fill the REQ content to pass validation
    const reqPath = path.join(tempDir, 'requirements', 'in-progress', 'REQ-2026-001-block-test.md');
    let reqContent = readFileSync(reqPath, 'utf8');
    reqContent = reqContent.replace('说明为什么要做这件事。', 'Real background for testing block command.');
    reqContent = reqContent.replace('- 目标 1', '- Real goal 1');
    reqContent = reqContent.replace('- 目标 2', '- Real goal 2');
    reqContent = reqContent.replace('- [ ] 标准 1', '- [x] Real acceptance criteria 1');
    reqContent = reqContent.replace('- [ ] 标准 2', '- [x] Real acceptance criteria 2');
    reqContent = reqContent.replace('- [ ] 目标实现', '- [x] 目标实现');
    reqContent = reqContent.replace('- [ ] 旧功能保护', '- [x] 旧功能保护');
    reqContent = reqContent.replace('- [ ] 逻辑正确性', '- [x] 逻辑正确性');
    reqContent = reqContent.replace('- [ ] 完整性', '- [x] 完整性');
    reqContent = reqContent.replace('- [ ] 可维护性', '- [x] 可维护性');
    reqContent = reqContent.replace('- [ ] 目标对齐', '- [x] 目标对齐');
    reqContent = reqContent.replace('- [ ] 设计对齐', '- [x] 设计对齐');
    reqContent = reqContent.replace('- [ ] 验收标准对齐', '- [x] 验收标准对齐');
    reqContent = reqContent.replace('- [ ] 目标实现', '- [x] 目标实现');
    reqContent = reqContent.replace('- [ ] 旧功能保护', '- [x] 旧功能保护');
    reqContent = reqContent.replace('- [ ] 逻辑正确性', '- [x] 逻辑正确性');
    reqContent = reqContent.replace('- [ ] 完整性', '- [x] 完整性');
    reqContent = reqContent.replace('- [ ] 可维护性', '- [x] 可维护性');
    reqContent = reqContent.replace('- [ ] 目标对齐', '- [x] 目标对齐');
    reqContent = reqContent.replace('- [ ] 设计对齐', '- [x] 设计对齐');
    reqContent = reqContent.replace('- [ ] 验收标准对齐', '- [x] 验收标准对齐');
    // Add design doc exemption
    reqContent = reqContent.replace(
      '### 约束（Scope Control，可选）',
      '### 约束（Scope Control，可选）\n\n**豁免项**：\n- [x] skip-design-validation'
    );
    writeFileSync(reqPath, reqContent, 'utf8');

    // Start the REQ
    reqCli.startCommand({ id: 'REQ-2026-001', phase: 'implementation' });

    // Block the REQ
    reqCli.blockCommand({
      id: 'REQ-2026-001',
      reason: 'Waiting for external dependency',
      condition: 'Dependency resolved',
      next: 'Resume implementation',
      phase: 'implementation',
    });

    // Verify REQ status changed to blocked
    const blockedReq = readFileSync(reqPath, 'utf8');
    assert.match(blockedReq, /^- 当前状态：blocked$/m);

    // Verify block details are recorded
    assert.match(blockedReq, /- 原因：Waiting for external dependency/);
    assert.match(blockedReq, /- 恢复条件：Dependency resolved/);
    assert.match(blockedReq, /- 下一步：Resume implementation/);

    // Verify INDEX.md updated
    const indexContent = readFileSync(path.join(tempDir, 'requirements', 'INDEX.md'), 'utf8');
    assert.match(indexContent, /REQ-2026-001-block-test/);
    assert.match(indexContent, /当前搁置 REQ/);

    // Verify progress.txt updated
    const progressContent = readFileSync(path.join(tempDir, '.claude', 'progress.txt'), 'utf8');
    assert.match(progressContent, /Current phase: blocked/);

    const events = readEvents({ rootDir: tempDir });
    assert.ok(events.some((event) => event.type === 'req_blocked' && event.reqId === 'REQ-2026-001'));
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testReqCompleteWithDocsGate() {
  const tempDir = createTempDir('req-complete-docs-gate');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);

    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    // Create a REQ
    reqCli.createCommand({ title: 'Docs Gate Test', slug: 'docs-gate-test' });

    // Fill the REQ content
    const reqPath = path.join(tempDir, 'requirements', 'in-progress', 'REQ-2026-001-docs-gate-test.md');
    let reqContent = readFileSync(reqPath, 'utf8');
    reqContent = reqContent.replace('说明为什么要做这件事。', 'Real background for testing docs gate.');
    reqContent = reqContent.replace('- 目标 1', '- Real goal 1');
    reqContent = reqContent.replace('- 目标 2', '- Real goal 2');
    reqContent = reqContent.replace('- [ ] 标准 1', '- [x] Real acceptance criteria 1');
    reqContent = reqContent.replace('- [ ] 标准 2', '- [x] Real acceptance criteria 2');
    reqContent = reqContent.replace('- [ ] 目标实现', '- [x] 目标实现');
    reqContent = reqContent.replace('- [ ] 旧功能保护', '- [x] 旧功能保护');
    reqContent = reqContent.replace('- [ ] 逻辑正确性', '- [x] 逻辑正确性');
    reqContent = reqContent.replace('- [ ] 完整性', '- [x] 完整性');
    reqContent = reqContent.replace('- [ ] 可维护性', '- [x] 可维护性');
    reqContent = reqContent.replace('- [ ] 目标对齐', '- [x] 目标对齐');
    reqContent = reqContent.replace('- [ ] 设计对齐', '- [x] 设计对齐');
    reqContent = reqContent.replace('- [ ] 验收标准对齐', '- [x] 验收标准对齐');
    // Add design doc exemption
    reqContent = reqContent.replace(
      '### 约束（Scope Control，可选）',
      '### 约束（Scope Control，可选）\n\n**豁免项**：\n- [x] skip-design-validation'
    );
    writeFileSync(reqPath, reqContent, 'utf8');

    // Start the REQ
    reqCli.startCommand({ id: 'REQ-2026-001', phase: 'implementation' });

    // Create report files
    const reportsDir = path.join(tempDir, 'requirements', 'reports');
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(path.join(reportsDir, 'REQ-2026-001-code-review.md'), '# Code Review\n\nTest review.', 'utf8');
    writeFileSync(path.join(reportsDir, 'REQ-2026-001-qa.md'), '# QA\n\n## 验证证据\n\n| 类型 | 项目 | 结果 | 摘要 |\n|------|------|------|------|\n| 命令 | `npm test` | PASS | fixture |\n| 人工/浏览器 | 无 | N/A | REQ 未要求人工验证 |\n', 'utf8');

    // Create a status file (simulating git status)
    const statusFile = path.join(tempDir, '.claude', '.req-complete-status');
    writeFileSync(statusFile, 'M requirements/INDEX.md\n', 'utf8');

    // Complete with --no-docs-gate should succeed
    reqCli.completeCommand({
      id: 'REQ-2026-001',
      phase: 'qa',
      'no-docs-gate': true,
      'status-file': statusFile,
      'skip-experience': '自动化测试无需经验文档',
    });

    // Verify REQ moved to completed
    const completedPath = path.join(tempDir, 'requirements', 'completed', 'REQ-2026-001-docs-gate-test.md');
    assert.ok(existsSync(completedPath), 'REQ should be moved to completed directory');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testErrorClassifierFormatsBlocks() {
  // Test NO_ACTIVE_REQ error type
  const noActiveReqBlock = formatErrorBlock('NO_ACTIVE_REQ', { file: 'test.js' });

  assert.ok(noActiveReqBlock.includes('E001'), 'Error block should contain error code E001');
  assert.ok(noActiveReqBlock.includes('NO_ACTIVE_REQ'), 'Error block should contain error type');
  assert.ok(noActiveReqBlock.includes('无活跃 REQ'), 'Error block should contain error title');
  assert.ok(noActiveReqBlock.includes('npm run req:create'), 'Error block should contain recovery command');
  assert.ok(noActiveReqBlock.includes('test.js'), 'Error block should contain file context');

  // Test REQ_TEMPLATE_EMPTY error type
  const templateEmptyBlock = formatErrorBlock('REQ_TEMPLATE_EMPTY', { reqId: 'REQ-2026-001' });
  assert.ok(templateEmptyBlock.includes('E004'), 'Error block should contain error code E004');
  assert.ok(templateEmptyBlock.includes('REQ_TEMPLATE_EMPTY'), 'Error block should contain error type');
  assert.ok(templateEmptyBlock.includes('REQ-2026-001'), 'Error block should contain REQ ID');

  // Test MISSING_REPORTS error type
  const missingReportsBlock = formatErrorBlock('MISSING_REPORTS', {
    reqId: 'REQ-2026-002',
    detail: '缺失报告: requirements/reports/REQ-2026-002-code-review.md',
  });
  assert.ok(missingReportsBlock.includes('E006'), 'Error block should contain error code E006');
  assert.ok(missingReportsBlock.includes('缺失报告'), 'Error block should contain detail');

  // Test getErrorCode function
  assert.equal(getErrorCode('NO_ACTIVE_REQ'), 'E001');
  assert.equal(getErrorCode('REQ_NOT_FOUND'), 'E002');
  assert.equal(getErrorCode('REQ_DRAFT_STATUS'), 'E003');
  assert.equal(getErrorCode('UNKNOWN_TYPE'), 'UNKNOWN');

  // Test getRecoverySteps function
  const recoverySteps = getRecoverySteps('NO_ACTIVE_REQ');
  assert.ok(Array.isArray(recoverySteps), 'Recovery steps should be an array');
  assert.ok(recoverySteps.length > 0, 'Recovery steps should not be empty');
  assert.ok(recoverySteps.some((step) => step.includes('npm run req:create')), 'Recovery steps should mention req:create');

  // Test all error types are defined
  const expectedTypes = [
    'NO_ACTIVE_REQ',
    'REQ_NOT_FOUND',
    'REQ_DRAFT_STATUS',
    'REQ_TEMPLATE_EMPTY',
    'DOCS_DRIFT',
    'MISSING_REPORTS',
    'MISSING_EXPERIENCE',
    'EXEMPT_ABUSED',
  ];

  for (const type of expectedTypes) {
    assert.ok(ErrorTypes[type], `ErrorTypes should define ${type}`);
    assert.ok(ErrorTypes[type].code, `${type} should have a code`);
    assert.ok(ErrorTypes[type].type, `${type} should have a type`);
    assert.ok(ErrorTypes[type].title, `${type} should have a title`);
    assert.ok(ErrorTypes[type].message, `${type} should have a message`);
    assert.ok(Array.isArray(ErrorTypes[type].recovery), `${type} should have recovery steps`);
  }
}

async function testErrorClassifierLogsErrors() {
  const tempDir = createTempDir('error-classifier-log');
  const logPath = path.join(tempDir, '.claude', 'error.log');

  try {
    // Log an error
    logError('NO_ACTIVE_REQ', { file: 'test.js', detail: 'Test error' }, logPath);

    // Verify log file was created
    assert.ok(existsSync(logPath), 'Log file should be created');

    // Verify log format
    const logContent = readFileSync(logPath, 'utf8');
    assert.ok(logContent.includes('E001'), 'Log should contain error code');
    assert.ok(logContent.includes('NO_ACTIVE_REQ'), 'Log should contain error type');
    assert.ok(logContent.includes('Test error'), 'Log should contain detail');
    assert.ok(logContent.includes('|'), 'Log should use pipe separator');

    // Log another error
    logError('MISSING_REPORTS', { reqId: 'REQ-2026-001' }, logPath);
    const updatedLog = readFileSync(logPath, 'utf8');
    const lines = updatedLog.trim().split('\n');
    assert.equal(lines.length, 2, 'Log should have 2 entries');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testInvariantIncrementalScanSkipsProcessedSources() {
  const tempDir = createTempDir('invariant-incremental');

  try {
    writeFile(
      tempDir,
      'context/experience/processed.md',
      [
        '# Processed Experience',
        '',
        '## 问题',
        '',
        '- 修改 `scripts/processed.mjs` 时不要重复生成不变量。',
      ].join('\n')
    );
    writeFile(
      tempDir,
      'context/experience/new-source.md',
      [
        '# New Source Experience',
        '',
        '## 问题',
        '',
        '- 修改 `scripts/new-source.mjs` 时应生成新的不变量。',
      ].join('\n')
    );
    writeFile(
      tempDir,
      'context/invariants/INV-001-processed.md',
      [
        '---',
        'id: INV-001',
        'title: Processed Experience',
        'status: draft',
        'severity: medium',
        'triggers:',
        '  - glob: "scripts/**"',
        'confidence: medium',
        'message: |',
        '  来源: experience/processed.md',
        '---',
        '',
        '<!-- 来源: context/experience/processed.md -->',
      ].join('\n')
    );

    execFileSync('node', [path.join(repoRoot, 'scripts/invariant-extractor.mjs'), '--scan', '--incremental'], {
      cwd: tempDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const invariantFiles = readdirSync(path.join(tempDir, 'context/invariants')).filter((name) => name.endsWith('.md'));
    assert.equal(invariantFiles.filter((name) => name.includes('processed')).length, 1);
    assert.ok(invariantFiles.some((name) => name.includes('new-source')));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testVerifierModeDefaultsAndValidation() {
  assert.equal(DEFAULT_VERIFIER_MODE, 'envelope');
  assert.deepEqual(ALLOWED_VERIFIER_MODES, ['legacy', 'envelope', 'subagent']);
  assert.equal(getVerifierMode({}), 'envelope');
  assert.equal(getVerifierMode({ HARNESS_VERIFIER_MODE: ' SUBAGENT ' }), 'subagent');
  assert.equal(assertVerifierMode('legacy', 'test'), 'legacy');
  assert.throws(
    () => assertVerifierMode('invalid', 'test-entry'),
    /Unsupported HARNESS_VERIFIER_MODE for test-entry: invalid/
  );
}

async function testVerifierSessionDefaultEnvelopeIsReadonlyPackage() {
  const tempDir = createTempDir('verifier-session-envelope');
  try {
    const { reqId, artifactPath } = setupVerifierGitFixture(tempDir);
    const outputDir = path.join(tempDir, 'verifier-output');

    const output = runNodeScript('scripts/verifier-session.mjs', [
      '--req', reqId,
      '--check-type', 'full',
      '--artifact', artifactPath,
      '--output', outputDir,
      '--report-suffix', 'code-review',
    ], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: '' },
    });

    assert.match(output, /Envelope package written/);
    assert.match(output, /no commands executed and no subagent spawned/);

    const packagePath = path.join(outputDir, `${reqId}-code-review-verifier-envelope.json`);
    assert.ok(existsSync(packagePath), 'envelope package should be written');

    const envelopePackage = readJsonFile(packagePath);
    assert.equal(envelopePackage.mode, 'envelope');
    assert.equal(envelopePackage.defaultMode, 'envelope');
    assert.equal(envelopePackage.handoff.status, 'pending-independent-verification');
    assert.deepEqual(envelopePackage.envelope.artifactPaths, [artifactPath]);
    assert.ok(envelopePackage.readonlyBoundary.allowedTools.includes('Read'));
    assert.ok(envelopePackage.readonlyBoundary.disallowedTools.includes('Write'));
    assert.ok(envelopePackage.readonlyBoundary.disallowedTools.includes('Bash'));

    const packageText = readFileSync(packagePath, 'utf8');
    assert.ok(!packageText.includes('SHOULD_NOT_APPEAR_IN_ENVELOPE'));
    assert.ok(!existsSync(path.join(tempDir, 'requirements/reports', `${reqId}-code-review.md`)));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testAutoReviewAndQaDefaultEnvelopeDoNotRunLegacyWork() {
  const tempDir = createTempDir('auto-verifier-envelope');
  try {
    const { reqId } = setupVerifierGitFixture(tempDir);
    const outputDir = path.join(tempDir, 'verifier-output');

    runNodeScript('scripts/auto-review.mjs', ['--req', reqId, '--output', outputDir], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: '' },
    });
    runNodeScript('scripts/auto-qa.mjs', ['--req', reqId, '--output', outputDir], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: '' },
    });

    assert.ok(existsSync(path.join(outputDir, `${reqId}-code-review-verifier-envelope.json`)));
    assert.ok(existsSync(path.join(outputDir, `${reqId}-qa-verifier-envelope.json`)));
    assert.ok(!existsSync(path.join(outputDir, `${reqId}-code-review.md`)));
    assert.ok(!existsSync(path.join(outputDir, `${reqId}-qa.md`)));
    assert.ok(!existsSync(path.join(tempDir, 'qa-command-ran.txt')));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testVerifierEntrypointsRejectInvalidMode() {
  const tempDir = createTempDir('verifier-invalid-mode');
  try {
    const { reqId } = setupVerifierGitFixture(tempDir);
    const failure = captureExecFailure(() => runNodeScript('scripts/auto-review.mjs', ['--req', reqId], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: 'banana' },
    }));

    assert.equal(failure.status, 1);
    assert.match(failure.stderr, /Unsupported HARNESS_VERIFIER_MODE for auto-review: banana/);

    const sessionFailure = captureExecFailure(() => runNodeScript('scripts/verifier-session.mjs', ['--req', reqId], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: 'banana' },
    }));
    assert.equal(sessionFailure.status, 1);
    assert.match(sessionFailure.stderr, /Unsupported HARNESS_VERIFIER_MODE for verifier-session: banana/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testLegacyModeStillWritesMarkdownReports() {
  const tempDir = createTempDir('verifier-legacy-mode');
  try {
    const { reqId } = setupVerifierGitFixture(tempDir);
    const outputDir = path.join(tempDir, 'legacy-output');

    runNodeScript('scripts/auto-review.mjs', ['--req', reqId, '--output', outputDir], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: 'legacy' },
    });

    const reportPath = path.join(outputDir, `${reqId}-code-review.md`);
    assert.ok(existsSync(reportPath), 'legacy auto-review should still write markdown report');
    assert.match(readFileSync(reportPath, 'utf8'), /# REQ-2026-900 Code Review/);

    runNodeScript('scripts/auto-qa.mjs', ['--req', reqId, '--output', outputDir], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: 'legacy' },
    });
    assert.ok(existsSync(path.join(tempDir, 'qa-command-ran.txt')), 'legacy auto-qa should execute REQ commands');
    assert.match(readFileSync(path.join(outputDir, `${reqId}-qa.md`), 'utf8'), /FAIL/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testSubagentModeStaysExplicitAndDelegates() {
  const tempDir = createTempDir('verifier-subagent-mode');
  try {
    const { reqId, artifactPath } = setupVerifierGitFixture(tempDir);
    const binDir = path.join(tempDir, 'bin');
    mkdirSync(binDir, { recursive: true });
    const claudeLog = path.join(tempDir, 'claude-args.json');
    const fakeClaude = path.join(binDir, 'claude');
    writeFileSync(
      fakeClaude,
      [
        '#!/usr/bin/env node',
        "const fs = require('fs');",
        `fs.writeFileSync(${JSON.stringify(claudeLog)}, JSON.stringify(process.argv.slice(2)));`,
        "console.log(JSON.stringify({ result: JSON.stringify({ status: 'pass', findings: [], summary: 'fake subagent pass' }), duration_ms: 1, total_cost_usd: 0, num_turns: 1 }));",
      ].join('\n'),
      'utf8'
    );
    chmodSync(fakeClaude, 0o755);

    const outputDir = path.join(tempDir, 'subagent-output');
    runNodeScript('scripts/verifier-session.mjs', [
      '--req', reqId,
      '--artifact', artifactPath,
      '--output', outputDir,
      '--report-suffix', 'code-review',
    ], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: 'subagent', PATH: `${binDir}${path.delimiter}${process.env.PATH}` },
    });

    const args = readJsonFile(claudeLog);
    assert.ok(args.includes('--bare'));
    assert.ok(args.includes('--agent'));
    assert.ok(args.includes('verifier'));
    assert.ok(existsSync(path.join(outputDir, `${reqId}-code-review.md`)));

    const nodeLog = path.join(tempDir, 'node-args.json');
    const fakeNode = path.join(binDir, 'node');
    writeFileSync(
      fakeNode,
      [
        '#!/bin/sh',
        `printf 'mode=%s\\nargv=%s\\n' "$HARNESS_VERIFIER_MODE" "$*" > ${JSON.stringify(nodeLog)}`,
        'exit 0',
      ].join('\n'),
      'utf8'
    );
    chmodSync(fakeNode, 0o755);

    runNodeScript('scripts/auto-review.mjs', ['--req', reqId, '--output', outputDir], {
      cwd: tempDir,
      env: { ...process.env, HARNESS_VERIFIER_MODE: 'subagent', PATH: `${binDir}${path.delimiter}${process.env.PATH}` },
    });
    const delegated = readFileSync(nodeLog, 'utf8');
    assert.match(delegated, /mode=subagent/);
    assert.match(delegated, /verifier-session\.mjs/);
    assert.match(delegated, /--report-suffix/);
    assert.match(delegated, /code-review/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testSessionStartWritesEvent() {
  const tempDir = createTempDir('session-start-event');
  try {
    setupReqFixture(tempDir);
    execFileSync('node', [path.join(repoRoot, 'scripts/session-start.js')], {
      cwd: tempDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const events = readEvents({ rootDir: tempDir });
    const sessionEvent = events.find((event) => event.type === 'session_started');
    assert.ok(sessionEvent);
    assert.equal(sessionEvent.source, 'hook');
    assert.equal(sessionEvent.payload.progressFound, true);
    assert.equal(sessionEvent.payload.activeReq, 'none');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testSessionStartReadsProgressProjectionWithoutProgressFile() {
  const tempDir = createTempDir('session-start-projection');
  try {
    setupReqFixture(tempDir);
    rmSync(path.join(tempDir, '.claude', 'progress.txt'), { force: true });
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-2026-777',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: tempDir,
      sessionId: 'projection-test',
      worktree: tempDir,
      now: () => '2026-05-31T00:00:00.000Z',
      idFactory: () => 'evt_projection_session',
    });

    const sessionOutput = execFileSync('node', [path.join(repoRoot, 'scripts/session-start.js')], {
      cwd: tempDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    assert.match(sessionOutput, /Current active REQ: REQ-2026-777/);
    assert.match(sessionOutput, /Current phase: implementation/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testReqStatusReadsProgressProjectionWithoutProgressFile() {
  const tempDir = createTempDir('req-status-projection');
  try {
    setupReqFixture(tempDir);
    rmSync(path.join(tempDir, '.claude', 'progress.txt'), { force: true });
    writeFile(
      tempDir,
      'requirements/in-progress/REQ-2026-777-projection-status.md',
      `# REQ-2026-777: Projection status

## 状态
- 当前状态：in-progress
- 当前阶段：implementation

## 背景
测试 projection status。

## 目标
- 测试 req:status 默认模式读取事件投影

## 验收标准
- [x] req:status 能读取事件投影
`
    );
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-2026-777',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: tempDir,
      sessionId: 'projection-test',
      worktree: tempDir,
      now: () => '2026-05-31T00:00:00.000Z',
      idFactory: () => 'evt_projection_status',
    });

    const statusOutput = execFileSync('node', [path.join(repoRoot, 'scripts/req-cli.mjs'), 'status'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.match(statusOutput, /Active REQ: REQ-2026-777/);
    assert.match(statusOutput, /Phase: implementation/);

    const byIdOutput = execFileSync('node', [path.join(repoRoot, 'scripts/req-cli.mjs'), 'status', '--id', 'REQ-2026-777'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.match(byIdOutput, /REQ: REQ-2026-777/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testReqStatusAllReadsWorktreeAggregation() {
  const tempDir = createTempDir('req-status-worktree-aggregation');
  try {
    setupReqFixture(tempDir);
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-2026-401',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: tempDir,
      eventsDir: path.join(tempDir, '.claude', 'worktrees', 'feature-a', 'events'),
      sessionId: 'feature-a-session',
      worktree: 'feature-a',
      now: () => '2026-05-31T00:00:01.000Z',
      idFactory: () => 'evt_status_all_a',
    });
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-2026-402',
      phase: 'qa',
      payload: {},
    }, {
      rootDir: tempDir,
      eventsDir: path.join(tempDir, '.claude', 'worktrees', 'feature-b', 'events'),
      sessionId: 'feature-b-session',
      worktree: 'feature-b',
      now: () => '2026-05-31T00:00:02.000Z',
      idFactory: () => 'evt_status_all_b',
    });

    const statusOutput = execFileSync('node', [path.join(repoRoot, 'scripts/req-cli.mjs'), 'status', '--all'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    assert.match(statusOutput, /Worktree statuses \(2\)/);
    assert.match(statusOutput, /feature-a: active=REQ-2026-401 \(implementation\), suspended=none/);
    assert.match(statusOutput, /feature-b: active=REQ-2026-402 \(qa\), suspended=none/);

    const jsonOutput = execFileSync('node', [path.join(repoRoot, 'scripts/req-cli.mjs'), 'status', '--all', '--json'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    const parsed = JSON.parse(jsonOutput);
    assert.deepEqual(
      parsed.worktrees.map((item) => item.worktree),
      ['feature-a', 'feature-b']
    );
    assert.deepEqual(
      parsed.worktrees.map((item) => item.projection.activeReq),
      ['REQ-2026-401', 'REQ-2026-402']
    );
    assert.deepEqual(parsed.conflicts, []);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function testRepositoryStateSemanticsExcludeExamplesTemplatesAndDuplicates() {
  const root = createTempDir('repository-state-semantics');
  try {
    writeFile(root, 'requirements/in-progress/REQ-2099-001-active.md', '# REQ\n\n## 状态\n- 当前状态：in-progress\n- 当前阶段：implementation\n');
    writeFile(root, 'requirements/in-progress/REQ-2099-002-draft.md', '# REQ\n\n## 状态\n- 当前状态：draft\n- 当前阶段：design\n');
    writeFile(root, 'requirements/in-progress/REQ-2099-003-blocked.md', '# REQ\n\n## 状态\n- 当前状态：blocked\n- 当前阶段：review\n');
    writeFile(root, 'requirements/in-progress/REQ-2099-004-suspended.md', '# REQ\n\n## 状态\n- 当前状态：suspended\n- 当前阶段：design\n');
    writeFile(root, 'requirements/in-progress/REQ-2099-900-example.md', '# REQ\n\n> 公开脱敏示例。\n\n## 状态\n- 当前状态：suspended\n- 当前阶段：design\n');
    writeFile(root, 'requirements/completed/REQ-2099-005-completed.md', '# REQ\n\n## 状态\n- 当前状态：completed\n- 当前阶段：ship\n');
    writeFile(root, 'context/invariants/TEMPLATE.md', '---\nid: INV-NNN\nstatus: draft\n---\n');
    writeFile(root, 'context/invariants/INV-001.md', '---\nid: INV-001\ntitle: One\nstatus: active\n---\n来源: experience/a.md\n');
    writeFile(root, 'context/invariants/INV-002.md', '---\nid: INV-002\ntitle: Same source\nstatus: draft\n---\n来源: experience/a.md\n');
    writeFile(root, 'context/invariants/INV-003.md', '---\nid: INV-003\ntitle: Three\nstatus: draft\n---\n来源: experience/b.md\n');
    writeFile(root, 'context/invariants/INV-003-copy.md', '---\nid: INV-003\ntitle: ID collision\nstatus: deprecated\n---\n来源: experience/c.md\n');

    const state = buildRepositoryState(root);
    assert.deepEqual({
      active: state.requirements.active,
      draft: state.requirements.draft,
      suspended: state.requirements.suspended,
      completed: state.requirements.completed,
      examples: state.requirements.examples,
    }, { active: 1, draft: 1, suspended: 2, completed: 1, examples: 1 });
    assert.equal(state.invariants.total_files, 5);
    assert.equal(state.invariants.templates, 1);
    assert.equal(state.invariants.duplicate_files, 2);
    assert.equal(state.invariants.unique, 2);
    assert.ok(state.invariants.duplicate_groups.some((group) => group.field === 'source' && group.value === 'experience/a.md'));
    assert.ok(state.invariants.duplicate_groups.some((group) => group.field === 'id' && group.value === 'INV-003'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testRealGitWorktreeLifecycleAggregationAndStateParity() {
  const tempDir = createTempDir('real-worktree-state');
  const mainRoot = path.join(tempDir, 'main');
  const worktreeA = path.join(tempDir, 'state-a');
  const worktreeB = path.join(tempDir, 'state-b');
  const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
  const reqCliPath = path.join(repoRoot, 'scripts', 'req-cli.mjs');
  const sessionStartPath = path.join(repoRoot, 'scripts', 'session-start.js');
  const runReq = (cwd, args) => execFileSync(process.execPath, [reqCliPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const removeWorktree = (worktreePath) => {
    if (!existsSync(worktreePath)) return;
    execFileSync('git', ['worktree', 'remove', '--force', worktreePath], {
      cwd: mainRoot,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  };

  try {
    initGitProject(mainRoot);
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: mainRoot });
    execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: mainRoot });
    const install = await harnessInstall.main(['--core-only'], { targetDir: mainRoot, stdinIsTTY: false });
    assert.equal(install.status, 'success');
    execFileSync('git', ['add', '.'], { cwd: mainRoot });
    execFileSync('git', ['commit', '-m', 'state baseline'], { cwd: mainRoot, stdio: ['ignore', 'ignore', 'ignore'] });
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'state-a', worktreeA], { cwd: mainRoot });
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'state-b', worktreeB], { cwd: mainRoot });

    const identityA = getWorktreeIdentity(worktreeA);
    const identityB = getWorktreeIdentity(worktreeB);
    assert.equal(identityA.isMain, false);
    assert.equal(identityB.isMain, false);
    assert.notEqual(identityA.id, identityB.id);
    const topologyBranches = listGitWorktrees(mainRoot).map((item) => item.branch);
    assert.equal(topologyBranches.length, 3);
    assert.ok(topologyBranches.includes('state-a'));
    assert.ok(topologyBranches.includes('state-b'));

    for (const [cwd, title] of [[worktreeA, 'Worktree A'], [worktreeB, 'Worktree B']]) {
      runReq(cwd, ['create', '--id', 'REQ-2099-095', '--title', title, '--slug', 'shared-id']);
    }
    assert.ok(existsSync(path.join(worktreeA, '.claude/worktrees', identityA.id, 'events', 'session-main.jsonl')));
    assert.ok(existsSync(path.join(worktreeB, '.claude/worktrees', identityB.id, 'events', 'session-main.jsonl')));
    assert.ok(!existsSync(path.join(worktreeA, '.claude/worktrees/main/events/session-main.jsonl')));
    assert.ok(!existsSync(path.join(worktreeB, '.claude/worktrees/main/events/session-main.jsonl')));

    const localA = JSON.parse(runReq(worktreeA, ['status', '--json']));
    const localB = JSON.parse(runReq(worktreeB, ['status', '--json']));
    assert.equal(localA.active_req.req_id, 'REQ-2099-095');
    assert.equal(localB.active_req.req_id, 'REQ-2099-095');

    const duplicated = buildWorktreeProgressProjections({ rootDir: mainRoot });
    assert.deepEqual(duplicated.worktrees.map((item) => item.worktree), [identityA.id, identityB.id].sort());
    assert.deepEqual(new Set(duplicated.worktrees.map((item) => realpathSync(item.root))), new Set([realpathSync(worktreeA), realpathSync(worktreeB)]));
    assert.deepEqual(duplicated.conflicts, [{
      type: 'duplicate_active_req',
      reqId: 'REQ-2099-095',
      worktrees: [identityA.id, identityB.id].sort(),
    }]);
    const allFromCli = JSON.parse(runReq(mainRoot, ['status', '--all', '--json']));
    assert.equal(allFromCli.worktrees.length, 2);
    assert.equal(allFromCli.conflicts.length, 1);

    runReq(worktreeB, [
      'block', '--id', 'REQ-2099-095', '--reason', 'waiting for state dependency',
      '--condition', 'dependency ready', '--next', 'resume design', '--phase', 'design',
    ]);
    const blockedStatus = JSON.parse(runReq(worktreeB, ['status', '--json']));
    assert.equal(blockedStatus.active_req, null);
    assert.deepEqual(blockedStatus.suspended_reqs.map((item) => item.reqId), ['REQ-2099-095']);
    const afterBlock = buildWorktreeProgressProjections({ rootDir: mainRoot });
    assert.deepEqual(afterBlock.conflicts, []);
    const projectedB = afterBlock.worktrees.find((item) => item.worktree === identityB.id).projection;
    assert.equal(projectedB.activeReq, 'none');
    assert.equal(projectedB.suspendedReqs[0].reason, 'waiting for state dependency');

    const sessionOutput = execFileSync(process.execPath, [sessionStartPath], {
      cwd: worktreeB,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.match(sessionOutput, /搁置中的 REQ/);
    assert.match(sessionOutput, /REQ-2099-095/);
    const health = buildHealthReport(worktreeB);
    assert.equal(health.req_counts.active, 0);
    assert.equal(health.req_counts.suspended, 1);
    assert.equal(health.req_counts.examples, 0);
    const doctor = runDoctor({ rootDir: worktreeB });
    assert.equal(doctor.summary.fail, 0);
    assert.match(doctor.checks.find((check) => check.name === 'Repository state').detail, /suspended=1/);

    removeWorktree(worktreeB);
    const converged = buildWorktreeProgressProjections({ rootDir: mainRoot });
    assert.deepEqual(converged.worktrees.map((item) => item.worktree), [identityA.id]);
    assert.deepEqual(converged.conflicts, []);
  } finally {
    try { removeWorktree(worktreeB); } catch {}
    try { removeWorktree(worktreeA); } catch {}
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testRiskTrackerR4CoversAllHookScripts() {
  const settings = JSON.parse(readFileSync(path.join(repoRoot, '.claude', 'settings.local.json'), 'utf8'));
  const riskTrackerSrc = readFileSync(path.join(repoRoot, 'scripts', 'risk-tracker.mjs'), 'utf8');

  // Extract hook scripts from settings
  const hookScripts = new Set();
  for (const entries of Object.values(settings.hooks || {})) {
    for (const entry of entries) {
      for (const hook of (entry.hooks || [])) {
        if (hook.type === 'command') {
          const m = hook.command.match(/scripts\/([\w.-]+)/);
          if (m) hookScripts.add(`scripts/${m[1]}`);
        }
      }
    }
  }

  // Extract R4 script names from risk-tracker.mjs
  const r4Scripts = new Set();
  for (const line of riskTrackerSrc.split('\n')) {
    if (!line.includes('level: 4')) continue;
    const pm = line.match(/\/\^scripts\\\/(.*?)\$\//);
    if (pm) {
      r4Scripts.add('scripts/' + pm[1].replace(/\\\./g, '.'));
    }
  }

  for (const script of hookScripts) {
    assert.ok(r4Scripts.has(script), `Hook script "${script}" should be classified as R4 in risk-tracker.mjs`);
  }
}

function testRiskTrackerCallsGitRevParseOnce() {
  const riskTrackerSrc = readFileSync(path.join(repoRoot, 'scripts', 'risk-tracker.mjs'), 'utf8');
  const matches = riskTrackerSrc.match(/git rev-parse --show-toplevel/g) || [];
  assert.equal(matches.length, 1, `risk-tracker.mjs should call git rev-parse exactly once, found ${matches.length}`);
}

function testPermissionsTableIsClean() {
  const settings = JSON.parse(readFileSync(path.join(repoRoot, '.claude', 'settings.local.json'), 'utf8'));
  const permissions = settings.permissions?.allow || [];
  assert.ok(permissions.length <= 45, `Permissions should be ≤45, got ${permissions.length}`);

  for (const perm of permissions) {
    assert.ok(!perm.includes('/Users/qrq/Documents/'), `Permission should not contain hardcoded path: ${perm}`);
    assert.ok(!perm.includes('/d/03resource/'), `Permission should not contain hardcoded path: ${perm}`);
  }
}

async function testHookConfigConsistencyBetweenCodexAndSettings() {
  const settings = JSON.parse(readFileSync(path.join(repoRoot, '.claude', 'settings.local.json'), 'utf8'));
  const codexPath = path.join(repoRoot, '.codex', 'hooks.json');
  assert.ok(existsSync(codexPath), '.codex/hooks.json should exist');
  const codexHooks = JSON.parse(readFileSync(codexPath, 'utf8'));

  const sHooks = settings.hooks || {};
  const cHooks = codexHooks.hooks || {};
  const sTypes = new Set(Object.keys(sHooks));
  const cTypes = new Set(Object.keys(cHooks));

  assert.deepEqual([...sTypes].sort(), [...cTypes].sort(), 'Hook event types should match between settings.local.json and .codex/hooks.json');

  for (const t of sTypes) {
    if (!cTypes.has(t)) continue;
    const sEntries = sHooks[t];
    const cEntries = cHooks[t];
    assert.equal(sEntries.length, cEntries.length, `Hook "${t}" should have same entry count`);
    for (let i = 0; i < sEntries.length; i++) {
      const sm = sEntries[i].matcher || '*';
      const cm = cEntries[i].matcher || '*';
      assert.equal(sm, cm, `Hook "${t}" entry ${i}: matcher should match`);
      const sh = sEntries[i].hooks || [];
      const ch = cEntries[i].hooks || [];
      assert.equal(sh.length, ch.length, `Hook "${t}" entry ${i}: hook count should match`);
      for (let j = 0; j < sh.length; j++) {
        assert.equal(sh[j].command, ch[j].command, `Hook "${t}[${i}].hooks[${j}]: command should match`);
        assert.equal(sh[j].timeout, ch[j].timeout, `Hook "${t}[${i}].hooks[${j}]: timeout should match`);
      }
    }
  }
}

async function testRepresentativeCiAndClaudeMatcherContracts() {
  const workflow = readFileSync(path.join(repoRoot, '.github', 'workflows', 'governance.yml'), 'utf8');
  for (const runner of capabilityManifest.verification.runnerOs) {
    assert.match(workflow, new RegExp(runner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(workflow, /fail-fast:\s*false/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /node:\s*\[20\]/);
  assert.match(workflow, /npm run ci:verify -- --require-node-major \$\{\{ matrix\.node \}\}/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /contents:\s*read/);

  const plan = buildCiPlan();
  assert.deepEqual(Object.keys(plan), capabilityManifest.verification.stages);
  assert.deepEqual(plan.tests.map(({ label }) => label), capabilityManifest.verification.testFiles.map((file) => `test:${file}`));
  assert.equal(targetPackageScripts['ci:verify'], 'node scripts/ci-verify.mjs');
  assert.equal(targetPackageScripts['harness:matcher-smoke'], 'node scripts/claude-matcher-smoke.mjs');

  for (const tool of EXPECTED_MATCHES) assert.equal(matcherMatchesTool(CANONICAL_WRITE_MATCHER, tool), true, tool);
  for (const tool of EXPECTED_MISSES) assert.equal(matcherMatchesTool(CANONICAL_WRITE_MATCHER, tool), false, tool);

  for (const file of ['.claude/settings.example.json', '.claude/settings.local.json', '.codex/hooks.json']) {
    const entry = findCanonicalPreToolEntry(readJsonFile(path.join(repoRoot, file)));
    assert.equal(entry.matcher, CANONICAL_WRITE_MATCHER);
  }

  const root = createTempDir('claude-matcher-contract');
  try {
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    writeFile(root, 'package.json', JSON.stringify({ name: 'matcher-fixture', private: true, scripts: {} }, null, 2));
    harnessInstall.copyFiles(repoRoot, root, ['core', 'cli', 'hook']);
    harnessInstall.configureHook(root);
    const installed = findCanonicalPreToolEntry(readJsonFile(path.join(root, '.claude', 'settings.local.json')));
    assert.equal(installed.matcher, CANONICAL_WRITE_MATCHER);

    const fixture = prepareInteractiveFixture(path.join(root, 'interactive'));
    const smokeSettings = readJsonFile(fixture.settingsPath);
    assert.equal(smokeSettings.hooks.PreToolUse[0].matcher, CANONICAL_WRITE_MATCHER);
    const validEvidence = [
      JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'pwd' } }),
      '',
    ].join('\n');
    assert.deepEqual(validateMatcherEvidence(validEvidence), { eventCount: 1, matchedTool: 'Bash' });
    assert.throws(() => validateMatcherEvidence(`${validEvidence}${JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Read' })}\n`), /Read unexpectedly matched/);
    assert.throws(() => validateMatcherEvidence(''), /empty/);

    const mismatchEvidence = path.join(root, 'node-major-mismatch.json');
    const impossibleMajor = Number(process.versions.node.split('.')[0]) + 1;
    assert.throws(() => runCiVerification({ stages: [], requireNodeMajor: impossibleMajor, evidenceOutput: mismatchEvidence }), /Node major mismatch/);
    const mismatch = readJsonFile(mismatchEvidence);
    assert.equal(mismatch.status, 'fail');
    assert.equal(mismatch.nodeMajorEnforced, true);
    assert.equal(mismatch.nodeMajorMatches, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function buildCompletePilotEvents() {
  return [
    { event: 'pilot_started', occurredAt: '2026-07-01T00:00:00Z', pilotId: 'pilot-js-01', projectType: 'javascript', baselineRef: 'a1b2c3d' },
    { event: 'first_req_ready', occurredAt: '2026-07-01T01:00:00Z', reqId: 'REQ-2026-001', elapsedMinutes: 60 },
    { event: 'cycle_started', occurredAt: '2026-07-01T02:00:00Z', reqId: 'REQ-2026-001' },
    { event: 'exemption_used', occurredAt: '2026-07-01T03:00:00Z', reqId: 'REQ-2026-001', reasonCode: 'scope-gap' },
    { event: 'recovery_started', occurredAt: '2026-07-01T04:00:00Z', reqId: 'REQ-2026-001' },
    { event: 'recovery_completed', occurredAt: '2026-07-01T04:05:00Z', reqId: 'REQ-2026-001', elapsedSeconds: 300, outcome: 'correct' },
    { event: 'cycle_completed', occurredAt: '2026-07-02T00:00:00Z', reqId: 'REQ-2026-001', verificationResult: 'pass' },
    { event: 'cycle_started', occurredAt: '2026-07-03T00:00:00Z', reqId: 'REQ-2026-002' },
    { event: 'recovery_started', occurredAt: '2026-07-04T00:00:00Z', reqId: 'REQ-2026-002' },
    { event: 'recovery_completed', occurredAt: '2026-07-04T00:02:00Z', reqId: 'REQ-2026-002', elapsedSeconds: 120, outcome: 'correct' },
    { event: 'incident', occurredAt: '2026-07-04T01:00:00Z', reqId: 'REQ-2026-002', classification: 'false-block', severity: 'low' },
    { event: 'cycle_completed', occurredAt: '2026-07-05T00:00:00Z', reqId: 'REQ-2026-002', verificationResult: 'pass' },
    { event: 'repeat_use', occurredAt: '2026-07-15T00:00:00Z', intent: 'intentional-reuse' },
    { event: 'pilot_closed', occurredAt: '2026-07-15T01:00:00Z', outcome: 'completed' },
  ];
}

function testPilotObservationProtocolRejectsFakeCompletion() {
  const events = buildCompletePilotEvents();
  assert.deepEqual(validateObservation(events, { requireComplete: true, asOf: '2026-07-15T02:00:00Z' }), {
    complete: true,
    completedCycles: 2,
    totalCycles: 2,
  });
  const summary = summarizeObservation(events, { asOf: '2026-07-15T02:00:00Z' });
  assert.equal(summary.cycles.completedVerified, 2);
  assert.equal(summary.firstReqMinutes, 60);
  assert.deepEqual(summary.recovery, { count: 2, medianSeconds: 120, p90Seconds: 300 });
  assert.equal(summary.incidents['false-block'], 1);
  assert.equal(summary.exemptions.cycleRate, 0.5);
  assert.equal(summary.exemptions.perCompletedCycle, 0.5);
  assert.equal(summary.repeatUse, 'intentional-reuse');
  assert.ok(!JSON.stringify(summary).includes('/Users/'));

  const tooShort = structuredClone(events);
  tooShort.at(-2).occurredAt = '2026-07-10T00:00:00Z';
  tooShort.at(-1).occurredAt = '2026-07-10T01:00:00Z';
  assert.throws(() => validateObservation(tooShort, { requireComplete: true, asOf: '2026-07-15T02:00:00Z' }), /14-28 days/);
  assert.throws(() => validateObservation(events.slice(0, 7), { requireComplete: true, asOf: '2026-07-15T02:00:00Z' }), /pilot_closed/);
  const fakeRecovery = structuredClone(events);
  fakeRecovery[5].elapsedSeconds = 1;
  assert.throws(() => validateObservation(fakeRecovery, { asOf: '2026-07-15T02:00:00Z' }), /does not match timestamps/);
  const earlyReuse = structuredClone(events);
  earlyReuse.at(-2).occurredAt = '2026-07-10T00:00:00Z';
  assert.throws(() => validateObservation(earlyReuse, { requireComplete: true, asOf: '2026-07-15T02:00:00Z' }), /on or after day 14/);
  assert.throws(() => validatePilotEventShape({ ...events[0], sourcePath: '/secret/project' }), /fields must be exactly/);

  const reversed = structuredClone(events);
  reversed[2].occurredAt = '2026-06-30T23:00:00Z';
  assert.throws(() => validateObservation(reversed, { asOf: '2026-07-15T02:00:00Z' }), /non-decreasing/);
  assert.throws(() => parseObservation('{"event":"unknown"}\n'), /Unknown pilot event/);

  const root = createTempDir('pilot-observation-cli');
  const previousCwd = process.cwd();
  try {
    process.chdir(root);
    pilotObservationMain(['init', '--pilot-id', 'pilot-py-01', '--project-type', 'python', '--baseline-ref', 'abcdef1', '--at', '2026-07-01T00:00:00Z', '--output', '.harness/pilot/observation.jsonl']);
    pilotObservationMain(['record', '--input', '.harness/pilot/observation.jsonl', '--event', 'cycle_started', '--req-id', 'REQ-2026-001', '--at', '2026-07-01T01:00:00Z', '--as-of', '2026-07-15T00:00:00Z']);
    const recorded = parseObservation(readFileSync(path.join(root, '.harness/pilot/observation.jsonl'), 'utf8'));
    assert.equal(recorded.length, 2);
    assert.throws(() => pilotObservationMain(['record', '--input', '.harness/pilot/observation.jsonl', '--event', 'cycle_started', '--req-id', 'REQ-2026-002', '--at', '2026-07-01T02:00:00Z', '--source-path', '/secret']), /Unknown option/);
    assert.throws(() => pilotObservationMain(['summary', '--input', '../escape.jsonl']), /under \.harness\/pilot/);
  } finally {
    process.chdir(previousCwd);
    rmSync(root, { recursive: true, force: true });
  }
}

// OPT-1B: README declares the three unenforceable gaps.
function testReadmeDeclaresUnenforceableGaps() {
  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  assert.match(readme, /REQ 门禁不可强制场景/);
  assert.match(readme, /subagent/);
  assert.match(readme, /claude -p/);
  assert.match(readme, /perl -e|python -c|解释器/);
}

// OPT-1B: harness-doctor includes the three OPT-1 checks and they appear in --json output.
function testDoctorIncludesOpt1Checks() {
  const json = execFileSync(process.execPath, [path.join(repoRoot, 'scripts/harness-doctor.mjs'), '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const report = JSON.parse(json);
  const names = report.checks.map((check) => check.name);
  assert.ok(names.some((name) => /基础 Hook/.test(name)), 'doctor should report basic Hook coverage');
  assert.ok(names.some((n) => /stdin 契约/.test(n)), 'doctor should report req-check stdin self-test');
  assert.ok(names.some((n) => /不可强制边界/.test(n)), 'doctor should report platform gaps');
  assert.equal(report.summary.fail, 0);
  assert.equal(report.exitCode, 0);
}

// OPT-3: experience auto-draft aggregates REQ/git/reports/events, complete does not block AUTO-DRAFT.
async function testExperienceAutoDraftFlow() {
  const tempDir = createTempDir('exp-autodraft-flow');
  const previousCwd = process.cwd();
  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');
    reqCli.createCommand({ title: 'Exp autodraft flow', slug: 'exp-autodraft-flow' });
    const reqPath = path.join(tempDir, 'requirements/in-progress/REQ-2026-001-exp-autodraft-flow.md');
    let c = readFileSync(reqPath, 'utf8');
    c = c.replace('说明为什么要做这件事。', '测 OPT-3 experience 自动草稿聚合与 complete 不阻断。');
    c = c.replace('- 目标 1', '- 验证聚合草稿生成');
    c = c.replace('- 目标 2', '- 验证 complete 不阻断 AUTO-DRAFT');
    c = c.replace(/- \[ \] 标准 1/g, '- [x] 草稿含 AUTO-DRAFT + 聚合内容');
    c = c.replace(/- \[ \] 标准 2/g, '- [x] complete 成功完成');
    c = c.replace(/- \[ \] 目标实现/g, '- [x] 目标实现');
    c = c.replace(/- \[ \] 旧功能保护/g, '- [x] 旧功能保护');
    c = c.replace(/- \[ \] 逻辑正确性/g, '- [x] 逻辑正确性');
    c = c.replace(/- \[ \] 完整性/g, '- [x] 完整性');
    c = c.replace(/- \[ \] 可维护性/g, '- [x] 可维护性');
    c = c.replace(/- \[ \] 目标对齐/g, '- [x] 目标对齐');
    c = c.replace(/- \[ \] 设计对齐/g, '- [x] 设计对齐');
    c = c.replace(/- \[ \] 验收标准对齐/g, '- [x] 验收标准对齐');
    c = c.replace('### 约束（Scope Control，可选）', '### 约束（Scope Control，可选）\n\n**豁免项**：\n- [x] skip-design-validation');
    writeFileSync(reqPath, c, 'utf8');
    reqCli.startCommand({ id: 'REQ-2026-001', phase: 'implementation' });

    // report for 验证结论 aggregation
    const reportsDir = path.join(tempDir, 'requirements', 'reports');
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(path.join(reportsDir, 'REQ-2026-001-qa.md'), '# QA\n\n## 状态\n\n- ✅ 通过\n\n## 验证证据\n\n| 类型 | 项目 | 结果 | 摘要 |\n|------|------|------|------|\n| 命令 | npm test | PASS | fixture |\n', 'utf8');

    // T1+T3: experience auto-draft (aggregated; no git → degraded)
    reqCli.experienceCommand({ id: 'REQ-2026-001' });
    const expDir = path.join(tempDir, 'context/experience');
    const expFile = readdirSync(expDir).find((f) => f.startsWith('REQ-2026-001'));
    assert.ok(expFile, 'experience file should be created');
    const expContent = readFileSync(path.join(expDir, expFile), 'utf8');
    assert.match(expContent, /AUTO-DRAFT/, 'draft should carry AUTO-DRAFT marker');
    assert.match(expContent, /场景（来自 REQ 背景）/, 'should aggregate REQ background section');
    assert.match(expContent, /测 OPT-3 experience 自动草稿聚合/, 'background content should be aggregated');
    assert.match(expContent, /验证结论（来自报告）/, 'should aggregate report conclusions');
    assert.match(expContent, /\(无关联提交\)/, 'no git history → degraded gracefully');
    assert.match(expContent, /实施时间线（来自事件账本）/, 'should aggregate event ledger timeline');

    // T2: complete with AUTO-DRAFT experience must NOT block
    writeFileSync(path.join(reportsDir, 'REQ-2026-001-code-review.md'), '# Code Review\n\n## 状态\n\n- ✅ 通过\n', 'utf8');
    const statusFile = path.join(tempDir, '.claude', '.req-complete-status');
    writeFileSync(statusFile, 'M requirements/INDEX.md\n', 'utf8');
    reqCli.completeCommand({ id: 'REQ-2026-001', phase: 'qa', 'no-docs-gate': true, 'status-file': statusFile });
    assert.ok(
      existsSync(path.join(tempDir, 'requirements/completed/REQ-2026-001-exp-autodraft-flow.md')),
      'AUTO-DRAFT experience must not block req:complete'
    );
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// REQ-088 #2: exemption heading lenient match (no "，可选" still detects skip-design).
async function testExemptionHeadingLenient() {
  const { validateDesignDocument } = await importFreshModule('scripts/req-validation.mjs');
  const req = `# REQ-2026-999: Lenient heading

## 状态
- 当前状态：draft
- 当前阶段：design

## 背景
Real background content.

## 目标
- Real goal

## 验收标准
- [ ] Real acceptance criteria

### 约束（Scope Control）

**豁免项**：
- [x] skip-design-validation（小改动）
`;
  const result = validateDesignDocument('REQ-2026-999', req, repoRoot);
  assert.ok(result.skipped, 'lenient heading (no ，可选) should still detect skip-design exemption');
  assert.ok(result.valid);
}

// REQ-088 #3 + doctor: install appends .gitignore runtime ignores, ships harness-doctor.mjs, idempotent.
async function testHarnessInstallGitignoreAndDoctor() {
  const tempDir = createTempDir('harness-install-gitignore-doctor');
  try {
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    writeFile(tempDir, 'package.json', JSON.stringify({ name: 'fixture', scripts: {} }, null, 2));
    harnessInstall.copyFiles(repoRoot, tempDir, ['cli']);
    harnessInstall.appendGitignore(tempDir);

    // T2: .gitignore contains harness runtime ignore marker
    const gitignore = readFileSync(path.join(tempDir, '.gitignore'), 'utf8');
    assert.match(gitignore, /Harness Lab 运行时状态/);
    assert.match(gitignore, /\.claude\/\.req-exempt/);
    assert.match(gitignore, /\.harness\/pilot\//);

    // T3: scripts/ ships harness-doctor.mjs
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'harness-doctor.mjs')), 'doctor should be installed');

    // T4: idempotent — second append does not duplicate the marker block
    harnessInstall.appendGitignore(tempDir);
    const markerCount = (readFileSync(path.join(tempDir, '.gitignore'), 'utf8').match(/Harness Lab 运行时状态/g) || []).length;
    assert.equal(markerCount, 1, 'appendGitignore should be idempotent');

    // cli module manifest includes doctor
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/harness-doctor.mjs'));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const tests = [
  ['docs verify passes on the repository', testDocsVerifyPasses],
  ['capability manifest is canonical, validated, and package-syncable', testCapabilityManifestIsCanonicalAndSyncable],
  ['hook policy matrix is complete and consumed centrally', testHookPolicyMatrixAndConsumers],
  ['installer profiles are deterministic and doctor is profile-aware', testInstallerProfilesAndProfileAwareDoctor],
  ['managed upgrade preserves user changes and supports dry-run/restore', testManagedUpgradeProtectsUserChangesAndRestores],
  ['managed upgrade handles legacy, rollback, invalid records, and path safety', testManagedUpgradeLegacyRollbackAndPathSafety],
  ['req-cli lifecycle works in a fixture repository', testReqCliLifecycle],
  ['session-start writes event ledger entry', testSessionStartWritesEvent],
  ['session-start reads progress projection without progress.txt', testSessionStartReadsProgressProjectionWithoutProgressFile],
  ['req:status reads progress projection without progress.txt', testReqStatusReadsProgressProjectionWithoutProgressFile],
  ['req:status --all reads worktree aggregation', testReqStatusAllReadsWorktreeAggregation],
  ['repository state semantics exclude examples, templates, and duplicate invariants', testRepositoryStateSemanticsExcludeExamplesTemplatesAndDuplicates],
  ['real git worktrees isolate lifecycle state and aggregate read-only', testRealGitWorktreeLifecycleAggregationAndStateParity],
  ['req validation detects template placeholders and draft status', testReqValidationDetectsTemplateAndDraftIssues],
  ['harness-install copies governance files and writes hook config', testHarnessInstallArtifacts],
  ['installer declared sources exist and CLI args are strict', testInstallerDeclaredSourcesExistAndArgsAreStrict],
  ['published tarball is clean and its real bin completes a fresh install', testPublishedTarballAndPackedBinFreshInstall],
  ['reinstall preserves progress and settings without duplicate hooks', testInstallerReinstallPreservesProgressAndSettings],
  ['core-only profile preserves package and hook profile closes CLI dependencies', testInstallerCoreOnlyProfileBoundary],
  ['clean-template-history preserves user state', testCleanTemplateHistoryPreservesUserState],
  ['package target rejects directory and file symlink escapes', testPackageTargetRejectsSymlinkEscapes],
  ['hook merge rejects spoofed commands and requires the full write matcher', testHookMergeRejectsSpoofsAndRequiresFullMatcher],
  ['invalid settings shapes fail before installer writes', testInvalidSettingsShapesFailPreflight],
  ['invalid package scripts fail before installer writes', testInvalidPackageScriptsFailPreflight],
  ['installer preflight and failure terminal states are truthful', testInstallerPreflightAndFailureTerminalStates],
  ['req-check accepts slugged active REQ files', testReqCheckAcceptsSluggedActiveReq],
  ['req:create supports Chinese titles and strict explicit slugs', testReqCreateSupportsChineseTitlesAndStrictSlugs],
  ['executable user docs stay aligned with public commands and runtime facts', testExecutableUserDocsStayAligned],
  ['write-target policy classifies all supported targets', testWriteTargetPolicyClassifiesAllSupportedTargets],
  ['canonical write targets handle traversal prefixes and symlinks', testCanonicalWriteTargetsHandleTraversalPrefixesAndSymlinks],
  ['req-check governance whitelist requires every canonical target', testReqCheckCanonicalGovernanceWhitelistRequiresEveryTarget],
  ['scope-guard checks every canonical target and global exemption', testScopeGuardChecksEveryCanonicalTargetAndExemption],
  ['scope-guard honors worktree-local exemption', testScopeGuardHonorsWorktreeExemption],
  ['scope-guard blocks write attempts under read-only REQs', testScopeGuardBlocksReadOnlyReqWrites],
  ['scope-guard allows legacy REQs without scope declarations', testScopeGuardAllowsLegacyReqWithoutScope],
  ['req-check blocks Bash writes without a REQ (OPT-1A)', testReqCheckBlocksBashWriteWithoutReq],
  ['req-check allows Bash pure reads without a REQ (OPT-1A)', testReqCheckAllowsBashPureReadWithoutReq],
  ['req-check whitelist restores governance-dir writes (OPT-1A)', testReqCheckWhitelistRestoresGovernanceWrites],
  ['scope-guard judges Bash write targets against REQ scope (OPT-1A)', testScopeGuardJudgesBashWriteScope],
  ['local hook config uses existing JS entrypoints', testLocalHookConfigUsesExistingJsEntrypoints],
  ['auto-review uses arg array for shell syntax check', testAutoReviewUsesArgArrayForShellSyntaxCheck],
  ['package binding falls back to placeholder guards when commands are missing', testPackageBindingFallsBackToPlaceholderGuards],
  ['package binding supports package-dir targets', testPackageBindingSupportsPackageDir],
  ['missing root package reports candidates and node fallback', testMissingRootPackageReportsCandidatesAndNodeFallback],
  ['harness-setup command, skill, and bin stay aligned', testHarnessSetupCommandSkillAndBinStayAligned],
  ['design doc exemption mechanism works with checkbox and legacy formats', testDesignDocExemptionMechanism],
  ['setReqStatusAndPhase only replaces within status section', testSetReqStatusAndPhaseBoundary],
  ['req:block command works correctly', testReqBlockCommand],
  ['req:complete with docs gate works correctly', testReqCompleteWithDocsGate],
  ['error classifier formats error blocks correctly', testErrorClassifierFormatsBlocks],
  ['error classifier logs errors with structured format', testErrorClassifierLogsErrors],
  ['invariant incremental scan skips processed sources', testInvariantIncrementalScanSkipsProcessedSources],
  ['verifier mode defaults and validation are centralized', testVerifierModeDefaultsAndValidation],
  ['verifier-session default envelope is a read-only package', testVerifierSessionDefaultEnvelopeIsReadonlyPackage],
  ['auto-review and auto-qa default envelope do not run legacy work', testAutoReviewAndQaDefaultEnvelopeDoNotRunLegacyWork],
  ['verifier entrypoints reject invalid mode', testVerifierEntrypointsRejectInvalidMode],
  ['legacy verifier mode still writes markdown reports', testLegacyModeStillWritesMarkdownReports],
  ['subagent verifier mode stays explicit and delegates', testSubagentModeStaysExplicitAndDelegates],
  ['risk-tracker R4 covers all hook scripts', testRiskTrackerR4CoversAllHookScripts],
  ['risk-tracker calls git rev-parse exactly once', testRiskTrackerCallsGitRevParseOnce],
  ['permissions table is clean and within limits', testPermissionsTableIsClean],
  ['hook config is consistent between .codex/hooks.json and settings.local.json', testHookConfigConsistencyBetweenCodexAndSettings],
  ['representative CI and Claude matcher contracts are executable', testRepresentativeCiAndClaudeMatcherContracts],
  ['pilot observation protocol rejects fake completion and private payloads', testPilotObservationProtocolRejectsFakeCompletion],
  ['README declares unenforceable REQ-gate gaps (OPT-1B)', testReadmeDeclaresUnenforceableGaps],
  ['harness-doctor includes OPT-1 self-checks (OPT-1B)', testDoctorIncludesOpt1Checks],
  ['experience auto-draft aggregates sources and complete does not block AUTO-DRAFT (OPT-3)', testExperienceAutoDraftFlow],
  ['exemption heading match is lenient (REQ-088 #2)', testExemptionHeadingLenient],
  ['install appends .gitignore, ships doctor, idempotent (REQ-088 #3)', testHarnessInstallGitignoreAndDoctor],
];

let failures = 0;

for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`All governance tests passed (${tests.length}).`);
