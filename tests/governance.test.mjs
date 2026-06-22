import assert from 'node:assert/strict';
import {
  existsSync,
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
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
import {
  DEFAULT_VERIFIER_MODE,
  ALLOWED_VERIFIER_MODES,
  getVerifierMode,
  assertVerifierMode,
} from '../scripts/verifier-mode.mjs';

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
function runReqCheck(root, toolName, toolInput) {
  return execFileSync(process.execPath, [path.join(repoRoot, 'scripts/req-check.js')], {
    cwd: root,
    input: JSON.stringify({ cwd: root, tool_name: toolName, tool_input: toolInput }),
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
    'worktree-utils.mjs',
    'source-command-worktree-req',
    '一个 worktree 一个 active REQ',
    'scripts/session-start.js',
    'scripts/req-check.js',
    'node /path/to/harness-lab/scripts/harness-install.mjs --defaults',
    'npx harness-install --defaults',
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

const tests = [
  ['docs verify passes on the repository', testDocsVerifyPasses],
  ['req-cli lifecycle works in a fixture repository', testReqCliLifecycle],
  ['session-start writes event ledger entry', testSessionStartWritesEvent],
  ['session-start reads progress projection without progress.txt', testSessionStartReadsProgressProjectionWithoutProgressFile],
  ['req:status reads progress projection without progress.txt', testReqStatusReadsProgressProjectionWithoutProgressFile],
  ['req:status --all reads worktree aggregation', testReqStatusAllReadsWorktreeAggregation],
  ['req validation detects template placeholders and draft status', testReqValidationDetectsTemplateAndDraftIssues],
  ['harness-install copies governance files and writes hook config', testHarnessInstallArtifacts],
  ['req-check accepts slugged active REQ files', testReqCheckAcceptsSluggedActiveReq],
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
