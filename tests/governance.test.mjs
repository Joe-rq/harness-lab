import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyDocs } from '../scripts/docs-verify.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function createTempDir(prefix) {
  return mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function writeFile(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
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

async function testDocsVerifyPasses() {
  const docsVerify = verifyDocs(repoRoot, { diffAware: false });
  assert.deepEqual(docsVerify.errors, []);
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
    assert.ok(existsSync(designPath));

    reqCli.startCommand({
      id: 'REQ-2026-001',
      phase: 'implementation',
    });
    const startedReq = readFileSync(reqPath, 'utf8');
    assert.match(startedReq, /- 当前状态：in-progress/);
    assert.match(startedReq, /- 当前阶段：implementation/);

    reqCli.completeCommand({
      id: 'REQ-2026-001',
      phase: 'qa',
      'no-docs-gate': true,
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
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testHarnessInstallArtifacts() {
  const tempDir = createTempDir('harness-install');
  try {
    const harnessInstall = await importFreshModule('scripts/harness-install.mjs');
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/check-governance.mjs'));
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/template-guard.mjs'));
    assert.ok(harnessInstall.modules.hook.files.includes('scripts/session-start.sh'));

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
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'session-start.sh')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'template-guard.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'context', 'tech', 'README.md')));

    const settings = JSON.parse(
      readFileSync(path.join(tempDir, '.claude', 'settings.local.json'), 'utf8')
    );
    assert.ok(Array.isArray(settings.hooks?.PreToolUse));

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
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
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

const tests = [
  ['docs verify passes on the repository', testDocsVerifyPasses],
  ['req-cli lifecycle works in a fixture repository', testReqCliLifecycle],
  ['harness-install copies governance files and writes hook config', testHarnessInstallArtifacts],
  ['package binding falls back to placeholder guards when commands are missing', testPackageBindingFallsBackToPlaceholderGuards],
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
