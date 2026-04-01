import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeDocsImpact } from './docs-verify.mjs';
import {
  buildDesignBlockMessage,
  buildStartBlockMessage,
  validateDesignDocument,
  validateReqDocument,
} from './req-validation.mjs';

const root = process.cwd();
const today = new Date().toISOString().slice(0, 10);
const progressLabels = ['Summary:', 'Next steps:', 'Open questions:', 'Blockers:'];
const allowedPhases = new Set(['design', 'implementation', 'review', 'qa', 'ship', 'blocked', 'idle']);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toFullPath(relPath) {
  return path.join(root, relPath);
}

function read(relPath) {
  return readFileSync(toFullPath(relPath), 'utf8').replace(/\r\n/g, '\n');
}

function write(relPath, content) {
  const fullPath = toFullPath(relPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

/**
 * Append an audit log entry for exempt file operations
 * @param {string} action - 'CREATE' or 'DELETE'
 * @param {string} reqId - REQ ID if applicable, or 'manual'
 * @param {string} reason - Reason for the exemption
 */
function appendExemptAuditLog(action, reqId, reason) {
  const auditPath = toFullPath('.claude/exempt-audit.log');
  const timestamp = new Date().toISOString();
  const entry = `${timestamp} | ${action} | ${reqId || 'manual'} | ${reason}\n`;
  mkdirSync(path.dirname(auditPath), { recursive: true });
  appendFileSync(auditPath, entry, 'utf8');
}

function replaceSection(text, heading, body) {
  const pattern = new RegExp(`(${escapeRegExp(heading)}\\n+)([\\s\\S]*?)(?=\\n## |$)`);
  if (!pattern.test(text)) {
    fail(`Missing section: ${heading}`);
  }
  return text.replace(pattern, `$1${body.trimEnd()}\n`);
}

function getSection(text, heading) {
  const pattern = new RegExp(`${escapeRegExp(heading)}\\n+([\\s\\S]*?)(?=\\n## |$)`);
  const match = text.match(pattern);
  if (!match) {
    fail(`Missing section: ${heading}`);
  }
  return match[1].trimEnd();
}

function getProgressSection(text, label) {
  const labels = progressLabels.map(escapeRegExp).join('|');
  const pattern = new RegExp(`${escapeRegExp(label)}\\n([\\s\\S]*?)(?=\\n(?:${labels})|$)`);
  const match = text.match(pattern);
  if (!match) {
    fail(`Missing progress section: ${label}`);
  }
  return match[1].trimEnd();
}

function replaceProgressSection(text, label, body) {
  const labels = progressLabels.map(escapeRegExp).join('|');
  const pattern = new RegExp(`(${escapeRegExp(label)}\\n)([\\s\\S]*?)(?=\\n(?:${labels})|$)`);
  if (!pattern.test(text)) {
    fail(`Missing progress section: ${label}`);
  }
  return text.replace(pattern, `$1${body.trimEnd()}\n`);
}

function setLine(text, label, value) {
  const pattern = new RegExp(`^${escapeRegExp(label)}.*$`, 'm');
  if (!pattern.test(text)) {
    fail(`Missing line starting with: ${label}`);
  }
  return text.replace(pattern, `${label}${value}`);
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith('--')) {
      fail(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { command, options };
}

function slugify(title) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function padSequence(sequence) {
  return String(sequence).padStart(3, '0');
}

function listReqFiles(relDir) {
  const fullPath = toFullPath(relDir);
  if (!existsSync(fullPath)) {
    return [];
  }
  return readdirSync(fullPath).filter((name) => name.endsWith('.md') && name.startsWith('REQ-'));
}

function nextReqId(year) {
  const matcher = new RegExp(`^REQ-${year}-(\\d{3})-`);
  const sequences = [...listReqFiles('requirements/in-progress'), ...listReqFiles('requirements/completed')]
    .map((name) => {
      const match = name.match(matcher);
      return match ? Number(match[1]) : null;
    })
    .filter((value) => value !== null && value < 900);

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `REQ-${year}-${padSequence(next)}`;
}

function extractReqId(line) {
  const match = line.match(/REQ-\d{4}-\d{3}/);
  return match ? match[0] : null;
}

function extractFileName(line) {
  const match = line.match(/`([^`]+)`/);
  return match ? match[1] : null;
}

function parseBulletLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '));
}

function parseIndexItem(fileName, title) {
  return `- \`${fileName}\`（真实整改：${title}）`;
}

function getReqPathById(reqId) {
  for (const relDir of ['requirements/in-progress', 'requirements/completed']) {
    const fileName = listReqFiles(relDir).find((name) => name.startsWith(`${reqId}-`));
    if (fileName) {
      return `${relDir}/${fileName}`.replace(/\\/g, '/');
    }
  }
  return null;
}

function readReq(reqId) {
  const relPath = getReqPathById(reqId);
  if (!relPath) {
    fail(`REQ not found: ${reqId}`);
  }
  const content = read(relPath);
  const titleMatch = content.match(/^# (REQ-\d{4}-\d{3}): (.+)$/m);
  if (!titleMatch) {
    fail(`Failed to parse REQ title from: ${relPath}`);
  }

  const statusMatch = content.match(/^- 当前状态：(.+)$/m);
  const phaseMatch = content.match(/^- 当前阶段：(.+)$/m);
  if (!statusMatch || !phaseMatch) {
    fail(`Failed to parse REQ status/phase from: ${relPath}`);
  }

  return {
    reqId: titleMatch[1],
    title: titleMatch[2].trim(),
    relPath,
    fileName: path.basename(relPath),
    content,
    status: statusMatch[1].trim(),
    phase: phaseMatch[1].trim(),
  };
}

function setReqStatusAndPhase(content, status, phase) {
  // Extract the ## 状态 section and replace only within it
  const statusSectionPattern = /(## 状态\n+)([\s\S]*?)(?=\n## |$)/;
  const match = content.match(statusSectionPattern);
  if (!match) {
    fail('Missing ## 状态 section in REQ document');
  }

  // Replace status and phase lines only within the section
  let section = match[2];
  section = section.replace(/^- 当前状态：.*$/m, `- 当前状态：${status}`);
  section = section.replace(/^- 当前阶段：.*$/m, `- 当前阶段：${phase}`);

  // Reconstruct the document
  return content.replace(statusSectionPattern, `$1${section.trimEnd()}\n`);
}

function setBlockDetails(content, reason, condition, nextStep) {
  const body = [
    `- 原因：${reason ?? '无'}`,
    `- 恢复条件：${condition ?? '无'}`,
    `- 下一步：${nextStep ?? '无'}`,
  ].join('\n');
  return replaceSection(content, '## 阻塞 / 搁置说明（可选）', body);
}

function updateProgress(mode, reqId, phase) {
  let progress = read('.claude/progress.txt');
  const summaryLines = parseBulletLines(getProgressSection(progress, 'Summary:')).filter(
    (line) => !line.startsWith('- Active REQ:') && !line.startsWith('- Blocked REQ:')
  );
  const nextLines = parseBulletLines(getProgressSection(progress, 'Next steps:')).filter(
    (line) => !line.startsWith('- Continue active REQ:') && !line.startsWith('- Resolve blocked REQ:')
  );

  if (mode === 'active') {
    summaryLines.unshift(`- Active REQ: ${reqId} (${phase})`);
    nextLines.unshift(`- Continue active REQ: ${reqId}`);
    progress = setLine(progress, 'Current active REQ: ', reqId);
    progress = setLine(progress, 'Current phase: ', phase);
  } else if (mode === 'blocked') {
    summaryLines.unshift(`- Blocked REQ: ${reqId} (${phase})`);
    nextLines.unshift(`- Resolve blocked REQ: ${reqId}`);
    progress = setLine(progress, 'Current active REQ: ', 'none');
    progress = setLine(progress, 'Current phase: ', 'blocked');
  } else {
    progress = setLine(progress, 'Current active REQ: ', 'none');
    progress = setLine(progress, 'Current phase: ', 'idle');
  }

  progress = setLine(progress, 'Last updated: ', today);
  progress = replaceProgressSection(progress, 'Summary:', summaryLines.join('\n'));
  progress = replaceProgressSection(progress, 'Next steps:', nextLines.join('\n'));
  write('.claude/progress.txt', progress);
}

function updateIndex({ active, removeBlockedId, addBlocked, addCompleted }) {
  let index = read('requirements/INDEX.md');
  const blockedLines = parseBulletLines(getSection(index, '## 当前搁置 REQ')).filter((line) => line !== '- 无');
  const completedLines = parseBulletLines(getSection(index, '## 最近完成 REQ')).filter((line) => line !== '- 无');

  let nextBlocked = blockedLines;
  if (removeBlockedId) {
    nextBlocked = nextBlocked.filter((line) => extractReqId(line) !== removeBlockedId);
  }
  if (addBlocked) {
    const fileName = extractFileName(addBlocked);
    nextBlocked = [addBlocked, ...nextBlocked.filter((line) => extractFileName(line) !== fileName)];
  }

  let nextCompleted = completedLines;
  if (addCompleted) {
    const fileName = extractFileName(addCompleted);
    nextCompleted = [addCompleted, ...nextCompleted.filter((line) => extractFileName(line) !== fileName)];
  }

  const activeBody = active ? active : '- 无';
  const blockedBody = nextBlocked.length > 0 ? nextBlocked.join('\n') : '- 无';
  const completedBody = nextCompleted.length > 0 ? nextCompleted.join('\n') : '- 无';

  index = replaceSection(index, '## 当前活跃 REQ', activeBody);
  index = replaceSection(index, '## 当前搁置 REQ', blockedBody);
  index = replaceSection(index, '## 最近完成 REQ', completedBody);
  write('requirements/INDEX.md', index);
}

function assertAllowedPhase(phase) {
  if (!allowedPhases.has(phase)) {
    fail(`Unsupported phase: ${phase}`);
  }
}

function buildReqContent(reqId, title, slug) {
  const reqFile = `${reqId}-${slug}.md`;
  return [
    `# ${reqId}: ${title}`,
    '',
    '## 状态',
    '- 当前状态：draft',
    '- 当前阶段：design',
    '',
    '## 背景',
    '说明为什么要做这件事。',
    '',
    '## 目标',
    '- 目标 1',
    '- 目标 2',
    '',
    '## 非目标',
    '- 不做 1',
    '- 不做 2',
    '',
    '## 范围',
    '- 涉及目录 / 模块：',
    '- 影响接口 / 页面 / 脚本：',
    '',
    '### 约束（Scope Control，可选）',
    '> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。',
    '',
    '**允许（CAN）**：',
    '- 可修改的文件 / 模块：',
    '- 可新增的测试 / 脚本：',
    '',
    '**禁止（CANNOT）**：',
    '- 不可修改的文件 / 模块：',
    '- 不可引入的依赖 / 操作：',
    '',
    '**边界条件**：',
    '- 时间 / 环境 / 数据约束：',
    '- 改动规模或发布边界：',
    '',
    '## 验收标准',
    '- [ ] 标准 1',
    '- [ ] 标准 2',
    '',
    '## 设计与实现链接',
    `- 设计稿：\`docs/plans/${reqId}-design.md\``,
    '- 相关规范：',
    '',
    '## 报告链接',
    `- Code Review：\`requirements/reports/${reqId}-code-review.md\``,
    `- QA：\`requirements/reports/${reqId}-qa.md\``,
    `- Ship：\`requirements/reports/${reqId}-ship.md\`（需要发布时填写；否则在 REQ 中说明不适用）`,
    '',
    '## 验证计划',
    '- 计划执行的命令：',
    '- 需要的环境：',
    '- 需要的人工验证：',
    '',
    '## 阻塞 / 搁置说明（可选）',
    '- 原因：无',
    '- 恢复条件：无',
    '- 下一步：无',
    '',
    '## 风险与回滚',
    '- 风险：',
    '- 回滚方式：',
    '',
    '## 关键决策',
    `- ${today}：由 \`req:create\` 自动生成骨架，待补充具体内容`,
    '',
    `<!-- Source file: ${reqFile} -->`,
  ].join('\n');
}

function buildDesignContent(reqId, title) {
  return [
    `# ${reqId} Design`,
    '',
    '## Background',
    '',
    title,
    '',
    '## Goal',
    '',
    '- 补充本次需求的目标',
    '',
    '## Scope',
    '',
    '### In scope',
    '',
    '- 补充本次需求包含的内容',
    '',
    '### Out of scope',
    '',
    '- 补充本次需求不包含的内容',
    '',
    '## Product Review',
    '',
    '### User Value',
    '',
    '- 解决的问题：',
    '- 目标用户：',
    '- 预期收益：',
    '',
    '### Recommendation',
    '',
    '- Proceed / Revise / Defer',
    '',
    '## Engineering Review',
    '',
    '### Architecture Impact',
    '',
    '- 影响模块：',
    '- 依赖方向：',
    '- 需要新增或修改的边界：',
    '',
    '### Verification',
    '',
    '- 自动验证：',
    '- 人工验证：',
    '- 回滚：',
  ].join('\n');
}

export function createCommand(options) {
  const title = options.title;
  if (!title || typeof title !== 'string') {
    fail('create requires --title');
  }

  const index = read('requirements/INDEX.md');
  const activeReqs = parseBulletLines(getSection(index, '## 当前活跃 REQ')).filter((line) => line !== '- 无');
  if (activeReqs.length > 0) {
    fail(`Cannot create a new active REQ while another active REQ exists: ${activeReqs[0]}`);
  }

  const year = String(options.year ?? new Date().getFullYear());
  if (!/^\d{4}$/.test(year)) {
    fail('year must be a 4-digit number');
  }

  const reqId = nextReqId(year);
  const slug = options.slug || slugify(title);
  if (!slug) {
    fail('Could not derive an ASCII slug from --title. Pass --slug explicitly.');
  }

  const reqFileName = `${reqId}-${slug}.md`;
  const reqPath = `requirements/in-progress/${reqFileName}`;
  const designPath = `docs/plans/${reqId}-design.md`;
  if (existsSync(toFullPath(reqPath)) || existsSync(toFullPath(designPath))) {
    fail(`Target files already exist for ${reqId}`);
  }

  write(reqPath, buildReqContent(reqId, title, slug));
  write(designPath, buildDesignContent(reqId, title));
  updateIndex({ active: parseIndexItem(reqFileName, title) });
  updateProgress('active', reqId, 'design');

  // Create exempt file to allow filling REQ content
  writeFileSync(toFullPath('.claude/.req-exempt'), '', 'utf8');
  appendExemptAuditLog('CREATE', reqId, 'req:create command');

  console.log(`Created ${reqId}`);
  console.log(`- ${reqPath}`);
  console.log(`- ${designPath}`);
  console.log('- .claude/.req-exempt (fill REQ content, then run req:start)');
}

export function startCommand(options) {
  const reqId = options.id;
  if (!reqId || typeof reqId !== 'string') {
    fail('start requires --id');
  }

  const phase = options.phase || 'implementation';
  assertAllowedPhase(phase);

  const req = readReq(reqId);
  if (!req.relPath.startsWith('requirements/in-progress/')) {
    fail(`REQ must be in requirements/in-progress before start: ${req.relPath}`);
  }

  const validation = validateReqDocument(req.content, { allowDraftStatus: true });
  if (validation.issues.length > 0) {
    fail(
      buildStartBlockMessage({
        reqId,
        reqFile: req.relPath,
        validation,
      })
    );
  }

  // Validate design document
  const designValidation = validateDesignDocument(reqId, req.content, root);
  if (!designValidation.valid) {
    fail(buildDesignBlockMessage({ reqId, validation: designValidation }));
  }
  if (designValidation.skipped) {
    console.log('Design document validation skipped (exemption marked).');
  }

  const index = read('requirements/INDEX.md');
  const activeReqs = parseBulletLines(getSection(index, '## 当前活跃 REQ')).filter((line) => line !== '- 无');
  const activeId = activeReqs.length > 0 ? extractReqId(activeReqs[0]) : null;
  if (activeId && activeId !== reqId) {
    fail(`Another active REQ already exists: ${activeId}`);
  }

  let nextReq = setReqStatusAndPhase(req.content, 'in-progress', phase);
  nextReq = setBlockDetails(nextReq, '无', '无', '无');
  write(req.relPath, nextReq);
  updateIndex({
    active: parseIndexItem(req.fileName, req.title),
    removeBlockedId: reqId,
  });
  updateProgress('active', reqId, phase);

  // Remove exempt file after successful start
  const exemptPath = toFullPath('.claude/.req-exempt');
  if (existsSync(exemptPath)) {
    unlinkSync(exemptPath);
    appendExemptAuditLog('DELETE', reqId, 'req:start success');
  }

  console.log(`Started ${reqId} -> ${phase}`);
}

export function blockCommand(options) {
  const reqId = options.id;
  if (!reqId || typeof reqId !== 'string') {
    fail('block requires --id');
  }
  if (!options.reason || !options.condition || !options.next) {
    fail('block requires --reason, --condition, and --next');
  }

  const req = readReq(reqId);
  if (!req.relPath.startsWith('requirements/in-progress/')) {
    fail(`REQ must be in requirements/in-progress before block: ${req.relPath}`);
  }

  const phase = options.phase || req.phase;
  assertAllowedPhase(phase);

  let nextReq = setReqStatusAndPhase(req.content, 'blocked', phase);
  nextReq = setBlockDetails(nextReq, options.reason, options.condition, options.next);
  write(req.relPath, nextReq);
  updateIndex({
    active: null,
    removeBlockedId: reqId,
    addBlocked: parseIndexItem(req.fileName, req.title),
  });
  updateProgress('blocked', reqId, phase);

  console.log(`Blocked ${reqId} -> ${phase}`);
}

export function completeCommand(options) {
  const reqId = options.id;
  if (!reqId || typeof reqId !== 'string') {
    fail('complete requires --id');
  }

  const phase = options.phase || 'qa';
  assertAllowedPhase(phase);

  const req = readReq(reqId);
  if (!req.relPath.startsWith('requirements/in-progress/')) {
    fail(`REQ must be in requirements/in-progress before complete: ${req.relPath}`);
  }

  const docsGateDisabled = options['no-docs-gate'] === true;
  if (!docsGateDisabled && options['status-file']) {
    const docsImpact = analyzeDocsImpact(root, {
      diffAware: true,
      statusFile: options['status-file'],
    });

    const missingFindings = docsImpact.findings.filter((finding) => finding.status === 'missing');
    if (missingFindings.length > 0) {
      console.error(`Cannot complete ${reqId} because docs drift obligations are still open:`);
      for (const finding of missingFindings) {
        console.error(`- ${finding.id}: triggered by ${finding.triggeredFiles.join(', ')}`);
        console.error(`  missing docs: ${finding.missing.join(', ')}`);
      }
      console.error('Run `npm run docs:impact` to inspect the current document obligations before completing the REQ.');
      process.exit(1);
    }
  }

  // Check required reports exist
  const requiredReports = ['code-review', 'qa'];
  const missingReports = [];
  for (const reportType of requiredReports) {
    const reportPath = `requirements/reports/${reqId}-${reportType}.md`;
    if (!existsSync(toFullPath(reportPath))) {
      missingReports.push(reportPath);
    }
  }
  if (missingReports.length > 0) {
    console.error(`Cannot complete ${reqId} because required reports are missing:`);
    for (const report of missingReports) {
      console.error(`  - ${report}`);
    }
    console.error('');
    console.error('Create the missing reports before completing the REQ.');
    console.error('If a report type is not applicable, create the file and explain why.');
    process.exit(1);
  }

  const completedPath = `requirements/completed/${req.fileName}`;
  if (existsSync(toFullPath(completedPath))) {
    fail(`Completed REQ already exists: ${completedPath}`);
  }

  let nextReq = setReqStatusAndPhase(req.content, 'completed', phase);
  nextReq = setBlockDetails(nextReq, '无', '无', '无');
  write(req.relPath, nextReq);
  renameSync(toFullPath(req.relPath), toFullPath(completedPath));
  updateIndex({
    active: null,
    removeBlockedId: reqId,
    addCompleted: parseIndexItem(req.fileName, req.title),
  });
  updateProgress('idle');

  console.log(`Completed ${reqId} -> ${completedPath}`);
}

export function printHelp() {
  console.log('Harness Lab REQ lifecycle CLI');
  console.log('');
  console.log('Commands:');
  console.log('  create --title "Title" [--slug ascii-slug] [--year 2026]');
  console.log('  start --id REQ-2026-002 [--phase implementation]');
  console.log('  block --id REQ-2026-002 --reason "..." --condition "..." --next "..." [--phase implementation]');
  console.log('  complete --id REQ-2026-002 [--phase qa] [--status-file .claude/.req-complete-status] [--no-docs-gate]');
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (!command || command === '--help' || command === 'help') {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'create':
      createCommand(options);
      break;
    case 'start':
      startCommand(options);
      break;
    case 'block':
      blockCommand(options);
      break;
    case 'complete':
      completeCommand(options);
      break;
    default:
      fail(`Unknown command: ${command}`);
  }
}
