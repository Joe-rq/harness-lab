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
import { validateReqDocument, validateDesignDocument } from '../scripts/req-validation.mjs';

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

    const failedStart = captureCommandFailure(() =>
      reqCli.startCommand({
        id: 'REQ-2026-001',
        phase: 'implementation',
      })
    );
    assert.equal(failedStart.exitCode, 1);
    assert.match(failedStart.stderr, /still contains template content/);

    writeFileSync(
      reqPath,
      readFileSync(reqPath, 'utf8')
        .replace('说明为什么要做这件事。', '验证空模板 REQ 不得进入实施阶段。')
        .replace('- 目标 1', '- 阻止空模板 REQ 进入 in-progress')
        .replace('- 目标 2', '- 让 req:start 和 PreToolUse 复用同一套内容校验')
        .replace('- [ ] 标准 1', '- [ ] 空模板 REQ 无法执行 req:start')
        .replace('- [ ] 标准 2', '- [ ] 已填充 REQ 可以正常执行 req:start'),
      'utf8'
    );

    // Fill design doc content - rewrite completely to avoid placeholder issues
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
      '# QA\n\n## 状态\n\n- ✅ 通过\n',
      'utf8'
    );

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
    assert.ok(harnessInstall.modules.cli.files.includes('scripts/template-guard.mjs'));
    assert.ok(harnessInstall.modules.hook.files.includes('scripts/session-start.sh'));
    assert.ok(harnessInstall.modules.hook.files.includes('scripts/req-check.sh'));

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
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'req-check.sh')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'session-start.sh')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'req-check.js')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'session-start.js')));
    assert.ok(existsSync(path.join(tempDir, 'scripts', 'template-guard.mjs')));
    assert.ok(existsSync(path.join(tempDir, 'context', 'README.md')));

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
    assert.ok(settings.permissions.allow.includes('Bash(node scripts/req-check.js)'));

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
    assert.match(report, /PreToolUse 为硬阻断/);
    assert.match(report, /req:create` 只会生成骨架/);

    const progress = readFileSync(path.join(tempDir, '.claude', 'progress.txt'), 'utf8');
    assert.match(progress, /补齐 REQ 的真实背景、目标、验收标准后再执行 req:start/);
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

const tests = [
  ['docs verify passes on the repository', testDocsVerifyPasses],
  ['req-cli lifecycle works in a fixture repository', testReqCliLifecycle],
  ['req validation detects template placeholders and draft status', testReqValidationDetectsTemplateAndDraftIssues],
  ['harness-install copies governance files and writes hook config', testHarnessInstallArtifacts],
  ['package binding falls back to placeholder guards when commands are missing', testPackageBindingFallsBackToPlaceholderGuards],
  ['design doc exemption mechanism works with checkbox and legacy formats', testDesignDocExemptionMechanism],
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
