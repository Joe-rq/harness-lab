import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const __filename = import.meta.url;
const repoRoot = path.resolve(path.dirname(new URL(__filename).pathname), '..');

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
Last updated: 2026-05-01

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
  mkdirSync(path.join(root, 'requirements', 'reports'), { recursive: true });
  mkdirSync(path.join(root, 'docs', 'plans'), { recursive: true });
}

function captureOutput(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  let stdout = '';
  let stderr = '';

  console.log = (...args) => { stdout += `${args.join(' ')}\n`; };
  console.error = (...args) => { stderr += `${args.join(' ')}\n`; };

  try {
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  return { stdout, stderr };
}

async function testStatusJsonNoActiveReq() {
  const tempDir = createTempDir('req-status-no-active');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true }));
    const result = JSON.parse(stdout.trim());

    assert.equal(result.active_req, null, 'Should return null when no active REQ');
    assert.equal(result.warnings, undefined, 'No warnings without mapping file');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusJsonWithActiveReq() {
  const tempDir = createTempDir('req-status-active');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    reqCli.createCommand({ title: 'Status Test', slug: 'status-test' });

    // Fill REQ content
    const reqPath = path.join(tempDir, 'requirements', 'in-progress', 'REQ-2026-001-status-test.md');
    let content = readFileSync(reqPath, 'utf8');
    content = content.replace('说明为什么要做这件事。', 'Testing req status JSON output.');
    content = content.replace('- 目标 1', '- Real goal 1');
    content = content.replace('- 目标 2', '- Real goal 2');
    content = content.replace('- [ ] 标准 1', '- [x] Criteria 1');
    content = content.replace('- [ ] 标准 2', '- [x] Criteria 2');
    content = content.replace(
      '### 约束（Scope Control，可选）',
      '### 约束（Scope Control，可选）\n\n**豁免项**：\n- [x] skip-design-validation'
    );
    writeFileSync(reqPath, content, 'utf8');

    reqCli.startCommand({ id: 'REQ-2026-001', phase: 'implementation' });

    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true }));
    const result = JSON.parse(stdout.trim());

    assert.ok(result.active_req, 'Should have active_req');
    assert.equal(result.active_req.req_id, 'REQ-2026-001');
    assert.equal(result.active_req.title, 'Status Test');
    assert.equal(result.active_req.status, 'in-progress');
    assert.equal(result.active_req.phase, 'implementation');
    assert.equal(result.active_req.readiness, 'in_progress');
    assert.equal(result.external, null, 'No mapping file');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusJsonWithExternalMapping() {
  const tempDir = createTempDir('req-status-mapping');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    reqCli.createCommand({ title: 'Mapping Test', slug: 'mapping-test' });

    const reqPath = path.join(tempDir, 'requirements', 'in-progress', 'REQ-2026-001-mapping-test.md');
    let content = readFileSync(reqPath, 'utf8');
    content = content.replace('说明为什么要做这件事。', 'Testing external mapping.');
    content = content.replace('- 目标 1', '- Real goal 1');
    content = content.replace('- 目标 2', '- Real goal 2');
    content = content.replace('- [ ] 标准 1', '- [x] Criteria 1');
    content = content.replace('- [ ] 标准 2', '- [x] Criteria 2');
    content = content.replace(
      '### 约束（Scope Control，可选）',
      '### 约束（Scope Control，可选）\n\n**豁免项**：\n- [x] skip-design-validation'
    );
    writeFileSync(reqPath, content, 'utf8');

    reqCli.startCommand({ id: 'REQ-2026-001', phase: 'implementation' });

    // Create external-mappings.json
    writeFile(tempDir, 'requirements/external-mappings.json', JSON.stringify({
      version: 1,
      mappings: [
        {
          req_id: 'REQ-2026-001',
          external_source: 'linear',
          external_id: 'ABC-123',
          external_url: 'https://linear.app/example/ABC-123',
          created_at: '2026-05-01T00:00:00.000Z',
          updated_at: '2026-05-01T00:00:00.000Z',
        },
      ],
    }, null, 2));

    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true }));
    const result = JSON.parse(stdout.trim());

    assert.ok(result.external, 'Should have external mapping');
    assert.equal(result.external.external_source, 'linear');
    assert.equal(result.external.external_id, 'ABC-123');
    assert.equal(result.external.external_url, 'https://linear.app/example/ABC-123');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusJsonWithCorruptedMapping() {
  const tempDir = createTempDir('req-status-corrupted');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);

    writeFile(tempDir, 'requirements/external-mappings.json', '{invalid json');

    const reqCli = await importFreshModule('scripts/req-cli.mjs');
    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true }));
    const result = JSON.parse(stdout.trim());

    assert.equal(result.active_req, null);
    assert.equal(result.external, null);
    assert.ok(result.warnings, 'Should have warnings');
    assert.ok(result.warnings.some((w) => w.includes('not valid JSON')), 'Warning should mention invalid JSON');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusJsonWithInvalidMappingStructure() {
  const tempDir = createTempDir('req-status-invalid-struct');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);

    writeFile(tempDir, 'requirements/external-mappings.json', JSON.stringify({
      version: 1,
      items: [],
    }));

    const reqCli = await importFreshModule('scripts/req-cli.mjs');
    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true }));
    const result = JSON.parse(stdout.trim());

    assert.equal(result.external, null);
    assert.ok(result.warnings, 'Should have warnings for invalid structure');
    assert.ok(result.warnings.some((w) => w.includes('invalid format')), 'Warning should mention invalid format');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusTextMode() {
  const tempDir = createTempDir('req-status-text');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    // No active REQ
    const { stdout: noActive } = captureOutput(() => reqCli.statusCommand({}));
    assert.ok(noActive.includes('No active REQ'), 'Text mode should show no active REQ');

    reqCli.createCommand({ title: 'Text Mode Test', slug: 'text-mode-test' });

    const reqPath = path.join(tempDir, 'requirements', 'in-progress', 'REQ-2026-001-text-mode-test.md');
    let content = readFileSync(reqPath, 'utf8');
    content = content.replace('说明为什么要做这件事。', 'Testing text output.');
    content = content.replace('- 目标 1', '- Real goal 1');
    content = content.replace('- 目标 2', '- Real goal 2');
    content = content.replace('- [ ] 标准 1', '- [x] Criteria 1');
    content = content.replace('- [ ] 标准 2', '- [x] Criteria 2');
    content = content.replace(
      '### 约束（Scope Control，可选）',
      '### 约束（Scope Control，可选）\n\n**豁免项**：\n- [x] skip-design-validation'
    );
    writeFileSync(reqPath, content, 'utf8');

    reqCli.startCommand({ id: 'REQ-2026-001', phase: 'implementation' });

    const { stdout: active } = captureOutput(() => reqCli.statusCommand({}));
    assert.ok(active.includes('REQ-2026-001'), 'Text mode should show REQ ID');
    assert.ok(active.includes('Text Mode Test'), 'Text mode should show title');
    assert.ok(active.includes('in-progress'), 'Text mode should show status');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusJsonWithDuplicateMappings() {
  const tempDir = createTempDir('req-status-dup-mapping');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);

    writeFile(tempDir, 'requirements/external-mappings.json', JSON.stringify({
      version: 1,
      mappings: [
        { req_id: 'REQ-2026-001', external_source: 'linear', external_id: 'A-1', external_url: 'https://a/1' },
        { req_id: 'REQ-2026-001', external_source: 'linear', external_id: 'A-2', external_url: 'https://a/2' },
      ],
    }));

    const reqCli = await importFreshModule('scripts/req-cli.mjs');
    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true }));
    const result = JSON.parse(stdout.trim());

    assert.ok(result.warnings, 'Should warn about duplicate req_id');
    assert.ok(result.warnings.some((w) => w.includes('duplicate req_id')), 'Warning should mention duplicate req_id');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function setupCompletedReqFixture(root) {
  writeFile(
    root,
    'requirements/completed/REQ-2026-001-completed-test.md',
    `# REQ-2026-001: Completed Test

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
Testing --id query on completed REQ.

## 目标
- Test completed REQ query

## 非目标
- None

## 颗粒度自检
- [x] 目标数 ≤ 4？
- [x] 涉及文件数 ≤ 4？
- [x] 涉及模块/目录 ≤ 4？
- [x] 能否用一句话描述"解决了什么问题"？
- [x] 如果失败，能否干净回滚？

## 范围
- 涉及目录 / 模块：tests

### 约束（Scope Control，可选）

**豁免项**：
- [x] skip-design-validation

**允许（CAN）**：
- 可修改的文件 / 模块：tests

**禁止（CANNOT）**：
- 不可修改其他 files

**边界条件**：
- None

## 验收标准
- [x] Completed REQ can be queried by ID

## 设计与实现链接
- 设计稿：豁免

## 报告链接
- Code Review：\`requirements/reports/REQ-2026-001-code-review.md\`
- QA：\`requirements/reports/REQ-2026-001-qa.md\`
- Ship：\`requirements/reports/REQ-2026-001-ship.md\`

## 验证计划
- 计划执行的命令：npm test
- 需要的环境：本仓库
- 需要的人工验证：无

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现
- [x] 旧功能保护
- [x] 逻辑正确性
- [x] 完整性
- [x] 可维护性

#### 对齐检查（record 阶段）
- [x] 目标对齐
- [x] 设计对齐
- [x] 验收标准对齐

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：None
- 回滚方式：git revert

## 关键决策
- 2026-05-01：Test fixture for --id query

<!-- Source file: REQ-2026-001-completed-test.md -->
`
  );

  writeFile(root, 'requirements/reports/REQ-2026-001-code-review.md', '# Code Review\n');
  writeFile(root, 'requirements/reports/REQ-2026-001-qa.md', '# QA\n');
}

async function testStatusByIdCompletedReq() {
  const tempDir = createTempDir('req-status-by-id-completed');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    setupCompletedReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true, id: 'REQ-2026-001' }));
    const result = JSON.parse(stdout.trim());

    assert.ok(result.req, 'Should have req object');
    assert.equal(result.req.req_id, 'REQ-2026-001');
    assert.equal(result.req.status, 'completed');
    assert.equal(result.req.readiness, 'completed');
    assert.equal(result.req.title, 'Completed Test');
    assert.equal(result.external, null);
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusByIdNotFound() {
  const tempDir = createTempDir('req-status-by-id-notfound');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true, id: 'REQ-9999-999' }));
    const result = JSON.parse(stdout.trim());

    assert.equal(result.req, null, 'Should return null for not found');
    assert.equal(result.error, 'not_found');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusByIdTextMode() {
  const tempDir = createTempDir('req-status-by-id-text');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    setupCompletedReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    const { stdout } = captureOutput(() => reqCli.statusCommand({ id: 'REQ-2026-001' }));

    assert.ok(stdout.includes('REQ-2026-001'), 'Text mode should show REQ ID');
    assert.ok(stdout.includes('Completed Test'), 'Text mode should show title');
    assert.ok(stdout.includes('completed'), 'Text mode should show status');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusByIdNotFoundTextMode() {
  const tempDir = createTempDir('req-status-by-id-notfound-text');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    const { stdout } = captureOutput(() => reqCli.statusCommand({ id: 'REQ-9999-999' }));

    assert.ok(stdout.includes('not found'), 'Text mode should show not found message');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function testStatusByIdDoesNotAffectDefault() {
  const tempDir = createTempDir('req-status-default-unchanged');
  const previousCwd = process.cwd();

  try {
    setupReqFixture(tempDir);
    process.chdir(tempDir);
    const reqCli = await importFreshModule('scripts/req-cli.mjs');

    // Default mode (no --id) should still work
    const { stdout } = captureOutput(() => reqCli.statusCommand({ json: true }));
    const result = JSON.parse(stdout.trim());

    assert.equal(result.active_req, null, 'Default mode should return null when no active REQ');
    assert.equal(result.external, null);
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const tests = [
  ['req:status --json returns null when no active REQ', testStatusJsonNoActiveReq],
  ['req:status --json returns active REQ status', testStatusJsonWithActiveReq],
  ['req:status --json includes external mapping', testStatusJsonWithExternalMapping],
  ['req:status --json handles corrupted mapping file', testStatusJsonWithCorruptedMapping],
  ['req:status --json handles invalid mapping structure', testStatusJsonWithInvalidMappingStructure],
  ['req:status text mode works', testStatusTextMode],
  ['req:status --json warns on duplicate mappings', testStatusJsonWithDuplicateMappings],
  ['req:status --json --id returns completed REQ', testStatusByIdCompletedReq],
  ['req:status --json --id returns not_found for missing REQ', testStatusByIdNotFound],
  ['req:status --id text mode works', testStatusByIdTextMode],
  ['req:status --id text mode shows not found', testStatusByIdNotFoundTextMode],
  ['req:status default mode unchanged by --id', testStatusByIdDoesNotAffectDefault],
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

console.log(`All req:status --json tests passed (${tests.length}).`);
