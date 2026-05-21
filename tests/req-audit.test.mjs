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
import { auditRepository, main as reqAuditMain } from '../scripts/req-audit.mjs';
import { sanitizeFrameworkData, updateTargetPackageJson } from '../scripts/harness-install.mjs';
import { buildHealthReport } from '../scripts/governance-health.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function tempDir(prefix) {
  return mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function write(root, relPath, content) {
  const fullPath = path.join(root, relPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}

function setup(root) {
  write(root, 'requirements/INDEX.md', '# REQ 索引\n\n## 当前活跃 REQ\n\n- 无\n\n## 当前搁置 REQ\n\n- 无\n\n## 最近完成 REQ\n\n- 无\n');
  write(root, '.claude/progress.txt', 'Current active REQ: none\nCurrent phase: idle\nLast updated: 2026-05-17\n\nSummary:\n\nNext steps:\n\nOpen questions:\n\nBlockers:\n- None.\n');
  mkdirSync(path.join(root, 'requirements/in-progress'), { recursive: true });
  mkdirSync(path.join(root, 'requirements/completed'), { recursive: true });
  mkdirSync(path.join(root, 'requirements/reports'), { recursive: true });
}

function goodReq(reqId, title = 'audit fixture') {
  return `# ${reqId}: ${title}

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Real background.

## 目标
- Real goal

## 非目标
- None

## 验收标准
- [x] Works

## 报告链接
- Code Review：\`requirements/reports/${reqId}-code-review.md\`
- QA：\`requirements/reports/${reqId}-qa.md\`

## 验证计划
- 计划执行的命令：\`npm test\`
- 需要的环境：本仓库
- 需要的人工验证：无

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现

#### 对齐检查（record 阶段）
- [x] 验收标准对齐

## 临时实现与债务
- 无

<!-- Source file: ${reqId}-${title}.md -->
`;
}

function writeReports(root, reqId, qaExtra = '') {
  write(root, `requirements/reports/${reqId}-code-review.md`, '# Code Review\n\nPASS\n');
  write(root, `requirements/reports/${reqId}-qa.md`, `# QA\n\n## 验证证据\n\n| 类型 | 项目 | 结果 | 摘要 |\n|------|------|------|------|\n| 命令 | \`npm test\` | PASS | fixture |\n| 人工/浏览器 | 无 | N/A | REQ 未要求人工验证 |\n${qaExtra}`);
}

async function importReqCli() {
  const url = pathToFileURL(path.join(repoRoot, 'scripts/req-cli.mjs'));
  url.searchParams.set('t', `${Date.now()}-${Math.random()}`);
  return import(url.href);
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

function captureStdout(fn) {
  const originalLog = console.log;
  let stdout = '';
  console.log = (...args) => {
    stdout += `${args.join(' ')}\n`;
  };
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return stdout;
}

async function testAuditFindsIdMismatch() {
  const root = tempDir('req-audit-id');
  try {
    setup(root);
    write(root, 'requirements/completed/REQ-2026-022-operation-logs.md', goodReq('REQ-2026-021', 'operation-logs'));
    writeReports(root, 'REQ-2026-021');
    const result = auditRepository(root, { id: 'REQ-2026-022' });
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.code === 'req-id-mismatch'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testAuditFindsIncompleteCompletedReq() {
  const root = tempDir('req-audit-status');
  try {
    setup(root);
    const reqId = 'REQ-2026-062';
    write(root, `requirements/completed/${reqId}-fixture.md`, goodReq(reqId).replace('当前状态：completed', '当前状态：in-progress'));
    writeReports(root, reqId);
    const result = auditRepository(root, { id: reqId });
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.code === 'status-mismatch'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testAuditFindsUncheckedItems() {
  const root = tempDir('req-audit-unchecked');
  try {
    setup(root);
    const reqId = 'REQ-2026-062';
    write(root, `requirements/completed/${reqId}-fixture.md`, goodReq(reqId).replace('- [x] Works', '- [ ] Works'));
    writeReports(root, reqId);
    const result = auditRepository(root, { id: reqId });
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.code === 'unchecked-items'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testAuditFindsMissingQaEvidence() {
  const root = tempDir('req-audit-qa');
  try {
    setup(root);
    const reqId = 'REQ-2026-062';
    write(root, `requirements/completed/${reqId}-fixture.md`, goodReq(reqId));
    write(root, `requirements/reports/${reqId}-code-review.md`, '# Code Review\n');
    write(root, `requirements/reports/${reqId}-qa.md`, '# QA\n\nPASS\n');
    const result = auditRepository(root, { id: reqId });
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.code === 'missing-qa-evidence'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testAuditSummaryAndVerboseOutput() {
  const root = tempDir('req-audit-summary');
  try {
    setup(root);
    const reqId = 'REQ-2026-061';
    write(root, `requirements/completed/${reqId}-fixture.md`, goodReq(reqId));
    write(root, `requirements/reports/${reqId}-code-review.md`, '# Code Review\n');
    write(root, `requirements/reports/${reqId}-qa.md`, '# QA\n\nPASS\n');

    const result = auditRepository(root, { all: true });
    assert.equal(result.ok, true);
    assert.equal(result.summary.by_severity.warning, 1);
    assert.equal(result.summary.legacy_warnings, 1);
    assert.equal(result.summary.by_code['missing-qa-evidence'], 1);

    const summaryOutput = captureStdout(() => reqAuditMain(['--all'], root));
    assert.match(summaryOutput, /REQ audit passed with warnings/);
    assert.match(summaryOutput, /Warning age: 1 legacy, 0 current/);
    assert.match(summaryOutput, /missing-qa-evidence: 1/);
    assert.doesNotMatch(summaryOutput, /QA 报告缺少 ## 验证证据/);

    const verboseOutput = captureStdout(() => reqAuditMain(['--all', '--verbose'], root));
    assert.match(verboseOutput, /QA 报告缺少 ## 验证证据/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testAuditMaxFindingsOutput() {
  const root = tempDir('req-audit-max');
  try {
    setup(root);
    for (const reqId of ['REQ-2026-060', 'REQ-2026-061']) {
      write(root, `requirements/completed/${reqId}-fixture.md`, goodReq(reqId));
      write(root, `requirements/reports/${reqId}-code-review.md`, '# Code Review\n');
      write(root, `requirements/reports/${reqId}-qa.md`, '# QA\n\nPASS\n');
    }

    const output = captureStdout(() => reqAuditMain(['--all', '--max-findings', '1'], root));
    assert.match(output, /Details truncated: showing 1 of 2/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testAuditBaselineReportsDeltaWithoutSuppressingFindings() {
  const root = tempDir('req-audit-baseline');
  try {
    setup(root);
    const reqId = 'REQ-2026-061';
    write(root, `requirements/completed/${reqId}-fixture.md`, goodReq(reqId));
    write(root, `requirements/reports/${reqId}-code-review.md`, '# Code Review\n');
    write(root, `requirements/reports/${reqId}-qa.md`, '# QA\n\nPASS\n');
    write(root, 'requirements/audit-baseline.json', JSON.stringify({
      version: 1,
      summary: {
        warnings: 1,
        by_code: {
          'missing-qa-evidence': 1,
        },
      },
    }, null, 2));

    const result = auditRepository(root, { all: true });
    assert.equal(result.findings.length, 1);
    assert.equal(result.baseline.found, true);
    assert.equal(result.baseline.within_baseline, true);
    assert.equal(result.baseline.delta_warnings, 0);

    const output = captureStdout(() => reqAuditMain(['--all'], root));
    assert.match(output, /Baseline: within baseline \(1\/1 warnings, no delta\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testAuditBaselineDetectsOverBudgetWarnings() {
  const root = tempDir('req-audit-over-baseline');
  try {
    setup(root);
    for (const reqId of ['REQ-2026-060', 'REQ-2026-061']) {
      write(root, `requirements/completed/${reqId}-fixture.md`, goodReq(reqId));
      write(root, `requirements/reports/${reqId}-code-review.md`, '# Code Review\n');
      write(root, `requirements/reports/${reqId}-qa.md`, '# QA\n\nPASS\n');
    }
    write(root, 'requirements/audit-baseline.json', JSON.stringify({
      version: 1,
      summary: {
        warnings: 1,
        by_code: {
          'missing-qa-evidence': 1,
        },
      },
    }, null, 2));

    const result = auditRepository(root, { all: true });
    assert.equal(result.baseline.within_baseline, false);
    assert.deepEqual(result.baseline.over_baseline, [
      { code: 'missing-qa-evidence', baseline: 1, current: 2, delta: 1 },
    ]);

    const health = buildHealthReport(root);
    assert.equal(health.req_audit.baseline.within_baseline, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testExplicitReqIdCreate() {
  const root = tempDir('req-create-id');
  const previousCwd = process.cwd();
  try {
    setup(root);
    process.chdir(root);
    const reqCli = await importReqCli();
    reqCli.createCommand({ id: 'REQ-2026-123', title: 'Reserved ID', slug: 'reserved-id' });
    assert.ok(existsSync(path.join(root, 'requirements/in-progress/REQ-2026-123-reserved-id.md')));
    const duplicate = captureCommandFailure(() =>
      reqCli.createCommand({ id: 'REQ-2026-123', title: 'Duplicate', slug: 'duplicate' })
    );
    assert.equal(duplicate.exitCode, 1);
    assert.match(duplicate.stderr, /REQ ID already exists: REQ-2026-123/);
  } finally {
    process.chdir(previousCwd);
    rmSync(root, { recursive: true, force: true });
  }
}

async function testInstallerPreservesTargetHistoryByDefault() {
  const root = tempDir('install-preserve');
  try {
    setup(root);
    const relPath = 'requirements/completed/REQ-2026-001-real-project.md';
    write(root, relPath, '# REQ-2026-001: Real project\n\n真实项目历史。\n');
    const result = sanitizeFrameworkData(root);
    assert.ok(existsSync(path.join(root, relPath)));
    assert.ok(result.preserved.includes('completed/REQ-2026-001-real-project.md'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function testTargetScriptsUseGitStatusBackedCommands() {
  const root = tempDir('install-scripts');
  try {
    write(root, 'package.json', JSON.stringify({ scripts: {} }, null, 2));
    const result = updateTargetPackageJson(root);
    assert.equal(result.updated, true);
    const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.match(packageJson.scripts['req:complete'], /status --porcelain=v1 -uall/);
    assert.match(packageJson.scripts['docs:verify'], /--status-file \.claude\/\.docs-verify-status/);
    assert.match(packageJson.scripts['check:governance'], /--status-file \.claude\/\.check-governance-status/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const tests = [
  ['audit finds filename/title ID mismatch', testAuditFindsIdMismatch],
  ['audit finds completed REQ with non-completed status', testAuditFindsIncompleteCompletedReq],
  ['audit finds unchecked completed items', testAuditFindsUncheckedItems],
  ['audit finds missing QA evidence', testAuditFindsMissingQaEvidence],
  ['audit summary hides details by default and verbose expands them', testAuditSummaryAndVerboseOutput],
  ['audit max-findings limits text details', testAuditMaxFindingsOutput],
  ['audit baseline reports delta without suppressing findings', testAuditBaselineReportsDeltaWithoutSuppressingFindings],
  ['audit baseline detects over-budget warnings', testAuditBaselineDetectsOverBudgetWarnings],
  ['req:create supports explicit IDs and rejects duplicates', testExplicitReqIdCreate],
  ['installer preserves target project history by default', testInstallerPreservesTargetHistoryByDefault],
  ['installer package scripts use git-status-backed commands', testTargetScriptsUseGitStatusBackedCommands],
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

console.log(`All req-audit tests passed (${tests.length}).`);
