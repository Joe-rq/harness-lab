import assert from 'node:assert/strict';
import {
  existsSync,
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
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
import { appendEvent, readEvents } from '../scripts/event-store.mjs';
import { getExemptPath } from '../scripts/worktree-utils.mjs';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const REQUIRED_DEFAULT_TARGET_ASSETS = [
  'AGENTS.md',
  'CLAUDE.md',
  '.claude/settings.example.json',
  '.agents/skills/source-command-bugfix/SKILL.md',
  '.agents/skills/source-command-feature/SKILL.md',
  '.agents/skills/source-command-first-req/SKILL.md',
  '.agents/skills/source-command-harness-setup/SKILL.md',
  '.agents/skills/source-command-refactor/SKILL.md',
  '.agents/skills/source-command-worktree-req/SKILL.md',
  'requirements/REQ_TEMPLATE.md',
  'requirements/in-progress/README.md',
  'requirements/completed/README.md',
  'requirements/reports/README.md',
  'docs/plans/README.md',
  'docs/specs/README.md',
  'context/README.md',
  'context/business/README.md',
  'context/experience/README.md',
  'context/experience/TEMPLATE.md',
  'context/invariants/TEMPLATE.md',
  'context/references/README.md',
  'context/tech/README.md',
  'context/tech/architecture.md',
  'context/tech/deployment-runbook.md',
  'context/tech/env-contract.md',
  'context/tech/tech-stack.md',
  'context/tech/testing-strategy.md',
  'skills/README.md',
  'skills/plan/ceo-review.md',
  'skills/plan/design-review.md',
  'skills/plan/eng-review.md',
  'skills/review/code-review.md',
  'skills/qa/qa.md',
  'skills/ship/ship.md',
  'scripts/check-governance.mjs',
  'scripts/docs-sync-rules.json',
  'scripts/docs-verify.mjs',
  'scripts/error-classifier.mjs',
  'scripts/event-store.mjs',
  'scripts/governance-health.mjs',
  'scripts/harness-doctor.mjs',
  'scripts/invariant-extractor.mjs',
  'scripts/invariant-gate.mjs',
  'scripts/req-align.mjs',
  'scripts/req-audit.mjs',
  'scripts/req-check.js',
  'scripts/req-cli.mjs',
  'scripts/req-reflect.mjs',
  'scripts/req-validation.mjs',
  'scripts/scope-guard.mjs',
  'scripts/session-start.js',
  'scripts/template-guard.mjs',
  'scripts/write-target-policy.mjs',
  'scripts/worktree-utils.mjs',
];

const REQUIRED_PUBLISHED_ASSETS = [
  ...REQUIRED_DEFAULT_TARGET_ASSETS,
  'README.md',
  '.claude/commands/harness-setup.md',
  'scripts/harness-install.mjs',
];

const REQUIRED_TARGET_SCRIPTS = [
  'req',
  'req:create',
  'req:start',
  'req:block',
  'req:complete',
  'req:status',
  'req:audit',
  'req:experience',
  'req:reflect',
  'req:align',
  'governance:health',
  'docs:verify',
  'docs:impact',
  'docs:impact:json',
  'check:governance',
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
    assert.ok(harnessInstall.modules.hook.files.includes('scripts/event-store.mjs'));

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
  for (const relPath of REQUIRED_PUBLISHED_ASSETS) {
    assert.ok(packageJson.files.includes(relPath), `published contract must include: ${relPath}`);
  }
  for (const scriptName of REQUIRED_TARGET_SCRIPTS) {
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
    assert.ok(packedPaths.has('.agents/skills/source-command-harness-setup/SKILL.md'));
    assert.ok(!packedPaths.has('requirements/INDEX.md'), 'dogfood INDEX history must not be published');
    for (const relPath of REQUIRED_PUBLISHED_ASSETS) {
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
    for (const scriptName of REQUIRED_TARGET_SCRIPTS) {
      assert.equal(typeof targetPackage.scripts[scriptName], 'string', `target script should exist: ${scriptName}`);
    }
    for (const relPath of REQUIRED_DEFAULT_TARGET_ASSETS) {
      assert.ok(existsSync(path.join(targetDir, relPath)), `default install contract must include: ${relPath}`);
    }
    for (const moduleDefinition of Object.values(harnessInstall.modules)) {
      for (const relPath of moduleDefinition.files) {
        assert.ok(existsSync(path.join(targetDir, relPath)), `installed target asset should exist: ${relPath}`);
      }
    }
    assert.ok(existsSync(path.join(targetDir, 'requirements', 'INDEX.md')));

    const runPackedNpmScript = (scriptName, args = []) => execFileSync(
      npmExecutable,
      ['--silent', 'run', scriptName, '--', ...args],
      { cwd: targetDir, env: npmEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const statusOutput = runPackedNpmScript('req:status', ['--json']);
    assert.equal(JSON.parse(statusOutput).active_req, null);
    const doctorOutput = runPackedNpmScript('harness:doctor', ['--json']);
    assert.ok(Array.isArray(JSON.parse(doctorOutput)));

    runPackedNpmScript('req:create', ['--title', 'Packed lifecycle', '--slug', 'packed-lifecycle', '--id', 'REQ-2099-001']);
    const reqPath = path.join(targetDir, 'requirements', 'in-progress', 'REQ-2099-001-packed-lifecycle.md');
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
    runPackedNpmScript('req:complete', ['--id', 'REQ-2099-001', '--phase', 'qa', '--no-docs-gate']);
    assert.ok(existsSync(path.join(targetDir, 'requirements', 'completed', 'REQ-2099-001-packed-lifecycle.md')));
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
    for (const scriptName of REQUIRED_TARGET_SCRIPTS) {
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
    assert.match(statusOutput, /feature-a: REQ-2026-401 \(implementation\)/);
    assert.match(statusOutput, /feature-b: REQ-2026-402 \(qa\)/);

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
  const src = readFileSync(path.join(repoRoot, 'scripts', 'harness-doctor.mjs'), 'utf8');
  assert.match(src, /checkPreToolUseBashMatcher/);
  assert.match(src, /checkReqCheckStdinSelfTest/);
  assert.match(src, /checkPlatformGaps/);

  const json = execFileSync(process.execPath, [path.join(repoRoot, 'scripts/harness-doctor.mjs'), '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const results = JSON.parse(json);
  const names = results.map((r) => r.name);
  assert.ok(names.some((n) => /Bash 覆盖/.test(n)), 'doctor should report PreToolUse Bash coverage');
  assert.ok(names.some((n) => /stdin 契约/.test(n)), 'doctor should report req-check stdin self-test');
  assert.ok(names.some((n) => /不可强制边界/.test(n)), 'doctor should report platform gaps');
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
  ['req-cli lifecycle works in a fixture repository', testReqCliLifecycle],
  ['session-start writes event ledger entry', testSessionStartWritesEvent],
  ['session-start reads progress projection without progress.txt', testSessionStartReadsProgressProjectionWithoutProgressFile],
  ['req:status reads progress projection without progress.txt', testReqStatusReadsProgressProjectionWithoutProgressFile],
  ['req:status --all reads worktree aggregation', testReqStatusAllReadsWorktreeAggregation],
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
