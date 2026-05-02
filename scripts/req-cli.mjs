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
import { formatErrorBlock, logError } from './error-classifier.mjs';
import { execSync } from 'node:child_process';

const root = process.cwd();
const today = new Date().toISOString().slice(0, 10);
const progressLabels = ['Summary:', 'Next steps:', 'Open questions:', 'Blockers:'];
const allowedPhases = new Set(['design', 'implementation', 'review', 'qa', 'ship', 'blocked', 'idle']);

// Experience document template placeholder checks
// These placeholders indicate the document hasn't been filled in
const experiencePlaceholderChecks = [
  { pattern: '{DATE}', description: '日期' },
  { pattern: '{TITLE}', description: '标题' },
  { pattern: '{REQ_ID}', description: 'REQ ID' },
  { pattern: '{描述这个 REQ 解决的核心问题或场景}', description: '场景描述' },
  { pattern: '{遇到的关键问题或重复模式}', description: '问题/模式' },
  { pattern: '{踩过的坑}', description: '踩坑记录' },
  { pattern: '{决策 1：为什么这样做，而不是那样做}', description: '关键决策' },
  { pattern: '{具体步骤或方法}', description: '解决方案' },
  { pattern: '{下次遇到类似场景如何直接套用}', description: '复用建议' },
];

/**
 * Validate experience document content
 * @param {string} content - The document content
 * @returns {{ valid: boolean, issues: string[] }}
 */
function validateExperienceContent(content) {
  const issues = [];
  const normalizedContent = content.replace(/\r\n/g, '\n');

  for (const check of experiencePlaceholderChecks) {
    if (normalizedContent.includes(check.pattern)) {
      issues.push(check.description);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Find experience documents for a REQ
 * Supports both REQ ID filename prefix and content-based REQ link
 * @param {string} reqId - The REQ ID (e.g., REQ-2026-032)
 * @returns {{ files: string[], hasValidContent: boolean, contentIssues: string[] }}
 */
function findExperienceDocs(reqId) {
  const experienceDir = toFullPath('context/experience');
  const result = { files: [], hasValidContent: false, contentIssues: [] };

  if (!existsSync(experienceDir)) {
    return result;
  }

  const allMdFiles = readdirSync(experienceDir).filter((name) => name.endsWith('.md'));

  // Find files that match by filename prefix or content link
  const matchingFiles = [];
  for (const fileName of allMdFiles) {
    const filePath = path.join(experienceDir, fileName);
    const content = readFileSync(filePath, 'utf8');

    // Match by filename prefix (REQ-xxx-slug.md)
    const matchesByName = fileName.startsWith(reqId);
    // Match by content link (supports date-named files)
    const matchesByContent = content.includes(`requirements/completed/${reqId}.md`)
      || content.includes(`requirements/in-progress/${reqId}.md`);

    if (matchesByName || matchesByContent) {
      matchingFiles.push(fileName);

      // Validate content
      const validation = validateExperienceContent(content);
      if (validation.valid) {
        result.hasValidContent = true;
      } else {
        result.contentIssues = validation.issues;
      }
    }
  }

  result.files = matchingFiles;
  return result;
}

/**
 * Write an error entry to the error log file
 * @param {string} message - Error message
 * @param {string} type - Error type (e.g., 'REQ_BLOCK', 'VALIDATION_FAIL')
 */
function appendErrorLog(message, type = 'ERROR') {
  try {
    const logPath = toFullPath('.claude/error.log');
    const timestamp = new Date().toISOString();
    // Truncate message to first line for log readability
    const firstLine = message.split('\n')[0].slice(0, 200);
    const entry = `${timestamp} | ${type} | ${firstLine}\n`;
    mkdirSync(path.dirname(logPath), { recursive: true });
    appendFileSync(logPath, entry, 'utf8');
  } catch {
    // Silently ignore log write failures to avoid masking the original error
  }
}

function fail(message) {
  console.error(message);
  appendErrorLog(message, 'FAIL');
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

function buildReqContent(reqId, title, slug, type) {
  const builders = { bugfix: buildBugfixReqContent, feature: buildFeatureReqContent, refactor: buildRefactorReqContent };
  const builder = builders[type];
  if (builder) return builder(reqId, title, slug);
  return buildGenericReqContent(reqId, title, slug);
}

function buildCommonSections(reqId) {
  return {
    reports: [
      '## 报告链接',
      `- Code Review：\`requirements/reports/${reqId}-code-review.md\``,
      `- QA：\`requirements/reports/${reqId}-qa.md\``,
      `- Ship：\`requirements/reports/${reqId}-ship.md\`（需要发布时填写；否则在 REQ 中说明不适用）`,
    ],
    block: [
      '## 阻塞 / 搁置说明（可选）',
      '- 原因：无',
      '- 恢复条件：无',
      '- 下一步：无',
    ],
  };
}

function buildGenericReqContent(reqId, title, slug) {
  const reqFile = `${reqId}-${slug}.md`;
  const { reports, block } = buildCommonSections(reqId);
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
    '## 颗粒度自检',
    '- [ ] 目标数 ≤ 4？',
    '- [ ] 涉及文件数 ≤ 4？',
    '- [ ] 涉及模块/目录 ≤ 4？',
    '- [ ] 能否用一句话描述"解决了什么问题"？',
    '- [ ] 如果失败，能否干净回滚？',
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
    ...reports,
    '',
    '## 验证计划',
    '- 计划执行的命令：',
    '- 需要的环境：',
    '- 需要的人工验证：',
    '',
    '### 反馈与质量检查',
    '',
    '#### 元反思检查（verify 阶段）',
    '- [ ] 目标实现',
    '- [ ] 旧功能保护',
    '- [ ] 逻辑正确性',
    '- [ ] 完整性',
    '- [ ] 可维护性',
    '',
    '#### 对齐检查（record 阶段）',
    '- [ ] 目标对齐',
    '- [ ] 设计对齐',
    '- [ ] 验收标准对齐',
    '',
    ...block,
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

function buildBugfixReqContent(reqId, title, slug) {
  const reqFile = `${reqId}-${slug}.md`;
  const { reports, block } = buildCommonSections(reqId);
  return [
    `# ${reqId}: ${title}`,
    '',
    '## 状态',
    '- 当前状态：draft',
    '- 当前阶段：design',
    '',
    '## 背景',
    'Bug 现象：[请描述]',
    '影响范围：[请描述]',
    '',
    '## 目标',
    '- 定位 Bug 根因',
    '- 实现修复',
    '- 添加回归测试防止复发',
    '',
    '## 非目标',
    '- 不做影响范围外的改动',
    '- 不重构相关代码（除非 Bug 本身由代码质量问题引起）',
    '',
    '## 颗粒度自检',
    '- [ ] 目标数 ≤ 4？',
    '- [ ] 涉及文件数 ≤ 4？',
    '- [ ] 涉及模块/目录 ≤ 4？',
    '- [ ] 能否用一句话描述"解决了什么问题"？',
    '- [ ] 如果失败，能否干净回滚？',
    '',
    '## 范围',
    '- 涉及目录 / 模块：待定位',
    '- 影响接口 / 页面 / 脚本：待定位',
    '',
    '### 约束（Scope Control，可选）',
    '',
    '**豁免项**：',
    '- [x] skip-design-validation（Bug 修复通常无需设计文档）',
    '',
    '**允许（CAN）**：',
    '- 可修改的文件 / 模块：待定位（Bug 根因确定后补充）',
    '- 可新增的测试 / 脚本：回归测试',
    '',
    '**禁止（CANNOT）**：',
    '- 不可修改与 Bug 无关的文件',
    '- 不可引入新依赖',
    '',
    '**边界条件**：',
    '- 修复应最小化，只改必要的代码',
    '',
    '## 验收标准',
    '- [ ] Bug 不再复现',
    '- [ ] 回归测试通过',
    '- [ ] 相关功能不受影响',
    '- [ ] 现有测试全部通过',
    '',
    '## 设计与实现链接',
    '- 设计稿：豁免（Bug 修复无需设计文档）',
    '- 相关规范：',
    '',
    ...reports,
    '',
    '## 验证计划',
    '- 计划执行的命令：`npm test`',
    '- 需要的环境：本仓库',
    '- 需要的人工验证：手动复现确认 Bug 已修复',
    '',
    '### 反馈与质量检查',
    '',
    '#### 元反思检查（verify 阶段）',
    '- [ ] 目标实现：Bug 是否已修复？回归测试是否已添加？',
    '- [ ] 旧功能保护：修复是否引入新问题？',
    '- [ ] 逻辑正确性：修复是否针对根因而非症状？',
    '- [ ] 完整性：是否处理了相关边界情况？',
    '- [ ] 可维护性：修复代码是否清晰？',
    '',
    '#### 对齐检查（record 阶段）',
    '- [ ] 目标对齐：修复是否只针对声明的 Bug？',
    '- [ ] 验收标准对齐：所有验收标准是否满足？',
    '',
    ...block,
    '',
    '## 风险与回滚',
    '- 风险：低风险，Bug 修复范围小',
    '- 回滚方式：`git revert`',
    '',
    '## 关键决策',
    `- ${today}：Bug 修复 REQ，skip-design-validation 已预勾选`,
    '',
    `<!-- Source file: ${reqFile} -->`,
  ].join('\n');
}

function buildFeatureReqContent(reqId, title, slug) {
  const reqFile = `${reqId}-${slug}.md`;
  const { reports, block } = buildCommonSections(reqId);
  return [
    `# ${reqId}: ${title}`,
    '',
    '## 状态',
    '- 当前状态：draft',
    '- 当前阶段：design',
    '',
    '## 背景',
    '用户痛点：[请描述]',
    '业务背景：[请描述]',
    '',
    '## 目标',
    `- 实现 [功能名称]`,
    '- 补充相关测试',
    '- 更新相关文档',
    '',
    '## 非目标',
    '- 不做超出本次范围的功能',
    '- 不做 UI/UX 重设计（除非本功能需要）',
    '',
    '## 颗粒度自检',
    '- [ ] 目标数 ≤ 4？',
    '- [ ] 涉及文件数 ≤ 4？',
    '- [ ] 涉及模块/目录 ≤ 4？',
    '- [ ] 能否用一句话描述"解决了什么问题"？',
    '- [ ] 如果失败，能否干净回滚？',
    '',
    '## 范围',
    '- 涉及目录 / 模块：待确认',
    '- 影响接口 / 页面 / 脚本：待确认',
    '',
    '### 约束（Scope Control，可选）',
    '',
    '> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。',
    '',
    '**豁免项**：',
    '- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）',
    '',
    '**允许（CAN）**：',
    '- 可修改的文件 / 模块：[请列出本次可修改的范围]',
    '- 可新增的测试 / 脚本：[请列出]',
    '',
    '**禁止（CANNOT）**：',
    '- 不可修改的文件 / 模块：[请列出不在范围内的部分]',
    '- 不可引入的依赖 / 操作：[请列出]',
    '',
    '**边界条件**：',
    '- 时间 / 环境 / 数据约束：[如有]',
    '- 改动规模或发布边界：[如有]',
    '',
    '## 验收标准',
    '- [ ] 功能按设计实现',
    '- [ ] 相关测试通过',
    '- [ ] 文档已更新',
    '- [ ] 现有功能不受影响',
    '',
    '## 设计与实现链接',
    `- 设计稿：\`docs/plans/${reqId}-design.md\`（Feature 建议创建设计文档）`,
    '- 相关规范：',
    '',
    ...reports,
    '',
    '## 验证计划',
    '- 计划执行的命令：`npm test && npm run docs:verify`',
    '- 需要的环境：本仓库',
    '- 需要的人工验证：手动验证功能行为符合预期',
    '',
    '### 反馈与质量检查',
    '',
    '#### 元反思检查（verify 阶段）',
    '- [ ] 目标实现：功能是否完整实现？是否覆盖了核心场景？',
    '- [ ] 旧功能保护：新功能是否破坏了现有功能？',
    '- [ ] 逻辑正确性：边界情况是否处理？错误处理是否完备？',
    '- [ ] 完整性：是否有遗漏的子功能？',
    '- [ ] 可维护性：代码是否清晰？接口是否合理？',
    '',
    '#### 对齐检查（record 阶段）',
    '- [ ] 目标对齐：实现是否服务于最初的用户痛点？',
    '- [ ] 设计对齐：实现是否符合设计文档？',
    '- [ ] 验收标准对齐：所有验收标准是否满足？',
    '',
    ...block,
    '',
    '## 风险与回滚',
    '- 风险：功能遗漏（对照验收标准检查）、与现有功能冲突',
    '- 回滚方式：`git revert` 或功能开关关闭',
    '',
    '## 关键决策',
    `- ${today}：Feature 型 REQ，建议创建设计文档`,
    '',
    `<!-- Source file: ${reqFile} -->`,
  ].join('\n');
}

function buildRefactorReqContent(reqId, title, slug) {
  const reqFile = `${reqId}-${slug}.md`;
  const { reports, block } = buildCommonSections(reqId);
  return [
    `# ${reqId}: ${title}`,
    '',
    '## 状态',
    '- 当前状态：draft',
    '- 当前阶段：design',
    '',
    '## 背景',
    '当前问题：[请描述技术债或流程缺口]',
    '为什么现在做：[请描述触发原因]',
    '',
    '## 目标',
    '- 重构 [模块/流程]',
    '- 保持功能行为不变',
    '- 改善代码可维护性',
    '',
    '## 非目标',
    '- 不做功能行为变更（重构 ≠ 新功能）',
    '- 不做后续 Phase 的内容',
    '- 不做相关但超出本次范围的重构',
    '',
    '## 颗粒度自检',
    '- [ ] 目标数 ≤ 4？',
    '- [ ] 涉及文件数 ≤ 4？（如超 4 文件，考虑拆分或说明为何需要）',
    '- [ ] 涉及模块/目录 ≤ 4？',
    '- [ ] 能否用一句话描述"解决了什么问题"？',
    '- [ ] 如果失败，能否干净回滚？',
    '',
    '## 范围',
    '- 涉及目录 / 模块：待确认',
    '- 影响接口 / 页面 / 脚本：待确认',
    '',
    '### 约束（Scope Control，可选）',
    '',
    '**豁免项**：',
    '- [x] skip-design-validation（重构通常无需设计文档，除非涉及架构变更）',
    '',
    '**允许（CAN）**：',
    '- 可修改的文件 / 模块：[请列出本次可修改的范围]',
    '- 可新增的测试 / 脚本：[如需新增测试来保护重构]',
    '',
    '**禁止（CANNOT）**：',
    '- 不可修改公共 API 签名（除非是重构的核心目标）',
    '- 不可修改与重构无关的文件',
    '',
    '**边界条件**：',
    '- 重构后所有现有测试必须通过（行为不变保证）',
    '',
    '## 验收标准',
    '- [ ] 重构后所有测试通过',
    '- [ ] 无功能行为变化',
    '- [ ] 代码质量指标改善（如：重复代码减少、依赖关系清晰）',
    '- [ ] 现有功能不受影响',
    '',
    '## 设计与实现链接',
    '- 设计稿：豁免（重构通常无需设计文档）',
    '- 相关规范：',
    '',
    ...reports,
    '',
    '## 验证计划',
    '- 计划执行的命令：`npm test && npm run check:governance`',
    '- 需要的环境：本仓库',
    '- 需要的人工验证：对比重构前后功能行为是否一致',
    '',
    '### 反馈与质量检查',
    '',
    '#### 元反思检查（verify 阶段）',
    '- [ ] 目标实现：重构是否完成？代码质量是否改善？',
    '- [ ] 旧功能保护：所有现有测试是否通过？行为是否一致？',
    '- [ ] 逻辑正确性：重构是否引入了隐含的行为变化？',
    '- [ ] 完整性：是否遗漏了需要同步修改的地方？',
    '- [ ] 可维护性：重构后的结构是否更清晰？',
    '',
    '#### 对齐检查（record 阶段）',
    '- [ ] 目标对齐：重构是否只改了结构没改行为？',
    '- [ ] 验收标准对齐：所有验收标准是否满足？',
    '',
    ...block,
    '',
    '## 风险与回滚',
    '- 风险：重构引入行为变化（通过对比测试检测）、遗漏同步修改点',
    '- 回滚方式：`git revert`',
    '',
    '## 关键决策',
    `- ${today}：Refactor 型 REQ，skip-design-validation 已预勾选`,
    '',
    `<!-- Source file: ${reqFile} -->`,
  ].join('\n');
}

/**
 * Read and parse requirements/external-mappings.json
 * Returns { mappings: array | null, warnings: string[] }
 */
function readExternalMappings() {
  const mappingPath = toFullPath('requirements/external-mappings.json');
  const warnings = [];

  if (!existsSync(mappingPath)) {
    return { mappings: null, warnings };
  }

  try {
    const raw = readFileSync(mappingPath, 'utf8');
    const data = JSON.parse(raw);

    if (!data || typeof data !== 'object' || !Array.isArray(data.mappings)) {
      warnings.push('external-mappings.json: invalid format, expected { "version": 1, "mappings": [...] }');
      return { mappings: null, warnings };
    }

    // Validate unique constraints
    const reqIdSet = new Set();
    const externalKeySet = new Set();
    for (const mapping of data.mappings) {
      if (mapping.req_id) {
        if (reqIdSet.has(mapping.req_id)) {
          warnings.push(`external-mappings.json: duplicate req_id "${mapping.req_id}"`);
        }
        reqIdSet.add(mapping.req_id);
      }
      if (mapping.external_source && mapping.external_id) {
        const key = `${mapping.external_source}:${mapping.external_id}`;
        if (externalKeySet.has(key)) {
          warnings.push(`external-mappings.json: duplicate external key "${key}"`);
        }
        externalKeySet.add(key);
      }
    }

    return { mappings: data.mappings, warnings };
  } catch {
    warnings.push('external-mappings.json: file exists but is not valid JSON');
    return { mappings: null, warnings };
  }
}

/**
 * Find external mapping for a specific REQ ID
 */
function findExternalMapping(mappings, reqId) {
  if (!mappings) return null;
  return mappings.find((m) => m.req_id === reqId) || null;
}

function buildReqStatusObject(req) {
  const content = req.content;

  const blockSection = content.match(/## 阻塞 \/ 搁置说明（可选）\n+([\s\S]*?)(?=\n## |$)/);
  const blockReason = blockSection
    ? (blockSection[1].match(/^- 原因：(.+)$/m)?.[1]?.trim() || '无')
    : '无';

  const criteriaSection = content.match(/## 验收标准\n+([\s\S]*?)(?=\n## |$)/);
  const criteria = criteriaSection
    ? parseBulletLines(criteriaSection[1])
    : [];

  const createdAtMatch = content.match(/^## 关键决策\n+- (\d{4}-\d{2}-\d{2})/m);
  const createdAt = createdAtMatch ? createdAtMatch[1] : null;

  const priorityMatch = content.match(/^- 优先级：(.+)$/m);
  const priority = priorityMatch ? priorityMatch[1].trim() : null;

  let readiness = 'unknown';
  if (req.status === 'in-progress') {
    readiness = 'in_progress';
  } else if (req.status === 'blocked') {
    readiness = 'blocked';
  } else if (req.status === 'draft') {
    const validation = validateReqDocument(req.content, { allowDraftStatus: true });
    readiness = validation.issues.length > 0 ? 'not_ready' : 'ready_to_start';
  } else if (req.status === 'completed') {
    readiness = 'completed';
  }

  const missingReports = [];
  const reportTypes = ['code-review', 'qa'];
  for (const reportType of reportTypes) {
    const reportPath = `requirements/reports/${req.reqId}-${reportType}.md`;
    if (!existsSync(toFullPath(reportPath))) {
      missingReports.push(reportType);
    }
  }

  return {
    req_id: req.reqId,
    title: req.title,
    status: req.status,
    phase: req.phase,
    readiness,
    priority,
    created_at: createdAt,
    updated_at: null,
    file: req.relPath,
    block_reason: blockReason !== '无' ? blockReason : null,
    missing_reports: missingReports.length > 0 ? missingReports : [],
    verification_criteria: criteria.length > 0 ? criteria : [],
  };
}

export function statusCommand(options) {
  const jsonMode = options.json === true;
  const targetId = options.id || null;

  // --id mode: query specific REQ regardless of active status
  if (targetId) {
    const relPath = getReqPathById(targetId);
    if (!relPath) {
      if (jsonMode) {
        console.log(JSON.stringify({ req: null, error: 'not_found' }, null, 2));
      } else {
        console.log(`REQ not found: ${targetId}`);
      }
      return;
    }

    const req = readReq(targetId);

    if (!jsonMode) {
      console.log(`REQ: ${req.reqId}`);
      console.log(`  Title: ${req.title}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Phase: ${req.phase}`);
      console.log(`  File: ${req.relPath}`);
      return;
    }

    const { mappings, warnings } = readExternalMappings();
    const external = findExternalMapping(mappings, targetId);
    const reqStatus = buildReqStatusObject(req);

    const result = {
      req: reqStatus,
      external,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Default mode: show current active REQ
  const index = read('requirements/INDEX.md');
  const activeLines = parseBulletLines(getSection(index, '## 当前活跃 REQ')).filter((line) => line !== '- 无');

  if (!jsonMode) {
    if (activeLines.length === 0) {
      console.log('No active REQ.');
    } else {
      const reqId = extractReqId(activeLines[0]);
      if (reqId) {
        const req = readReq(reqId);
        console.log(`Active REQ: ${req.reqId}`);
        console.log(`  Title: ${req.title}`);
        console.log(`  Status: ${req.status}`);
        console.log(`  Phase: ${req.phase}`);
        console.log(`  File: ${req.relPath}`);
      } else {
        console.log(activeLines[0]);
      }
    }
    return;
  }

  const { mappings, warnings } = readExternalMappings();

  if (activeLines.length === 0) {
    const result = { active_req: null, external: null, warnings: warnings.length > 0 ? warnings : undefined };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const reqId = extractReqId(activeLines[0]);
  if (!reqId) {
    const result = {
      active_req: null,
      external: null,
      error: 'Could not extract REQ ID from index',
      warnings: warnings.length > 0 ? warnings : undefined,
    };
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const req = readReq(reqId);
  const external = findExternalMapping(mappings, reqId);
  const reqStatus = buildReqStatusObject(req);

  const result = {
    active_req: reqStatus,
    external,
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  console.log(JSON.stringify(result, null, 2));
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
  if (existsSync(toFullPath(reqPath))) {
    fail(`Target file already exists for ${reqId}`);
  }

  write(reqPath, buildReqContent(reqId, title, slug, options.type));
  updateIndex({ active: parseIndexItem(reqFileName, title) });
  updateProgress('active', reqId, 'design');

  // Create exempt file to allow filling REQ content
  writeFileSync(toFullPath('.claude/.req-exempt'), '', 'utf8');
  appendExemptAuditLog('CREATE', reqId, 'req:create command');

  console.log(`Created ${reqId}`);
  console.log(`- ${reqPath}`);
  console.log('- .claude/.req-exempt (fill REQ content, then run req:start)');
  console.log('');
  console.log('Note: Design document is not created automatically.');
  console.log('If this REQ requires design documentation, create it manually:');
  console.log(`  docs/plans/${reqId}-design.md`);
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
      const detail = missingFindings
        .map((f) => `${f.id}: missing ${f.missing.join(', ')}`)
        .join('; ');
      console.error(formatErrorBlock('DOCS_DRIFT', { reqId, detail }));
      logError('DOCS_DRIFT', { reqId, detail });
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
    const detail = `缺失报告: ${missingReports.join(', ')}`;
    console.error(formatErrorBlock('MISSING_REPORTS', { reqId, detail }));
    logError('MISSING_REPORTS', { reqId, detail });
    process.exit(1);
  }

  // Check experience document exists and has valid content (unless skipped)
  const skipExperience = options['skip-experience'];
  if (!skipExperience) {
    const expResult = findExperienceDocs(reqId);

    if (expResult.files.length === 0) {
      console.error(formatErrorBlock('MISSING_EXPERIENCE', { reqId }));
      logError('MISSING_EXPERIENCE', { reqId });
      process.exit(1);
    }

    if (!expResult.hasValidContent) {
      const detail = `未填充章节: ${expResult.contentIssues.join(', ')}`;
      console.error(formatErrorBlock('MISSING_EXPERIENCE', { reqId, detail }));
      logError('MISSING_EXPERIENCE', { reqId, detail });
      process.exit(1);
    }

    console.log(`Experience document check passed: ${expResult.files.join(', ')}`);
  } else if (typeof skipExperience === 'string') {
    // Log the skip reason for audit purposes
    console.log(`Experience document check skipped: ${skipExperience}`);
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

  // Trigger invariant re-scan (experience → invariants feedback loop)
  const invariantExtractor = toFullPath('scripts/invariant-extractor.mjs');
  if (existsSync(invariantExtractor)) {
    try {
      const result = execSync(`node "${invariantExtractor}" --scan --incremental`, {
        cwd: root,
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (result) console.log(result.trim());
    } catch {
      // Non-critical: invariant scan failure should not block completion
    }
  }
}

export function experienceCommand(options) {
  const reqId = options.id;
  if (!reqId || typeof reqId !== 'string') {
    fail('experience requires --id');
  }

  const req = readReq(reqId);

  // Determine the experience file name
  const date = today;
  const titleSlug = slugify(req.title);
  const expFileName = `${reqId}-${titleSlug}.md`;
  const expPath = `context/experience/${expFileName}`;

  if (existsSync(toFullPath(expPath))) {
    fail(`Experience document already exists: ${expPath}`);
  }

  // Build experience content from template
  const content = buildExperienceContent(reqId, req.title, date);
  write(expPath, content);

  console.log(`Created experience document for ${reqId}`);
  console.log(`- ${expPath}`);
  console.log('');
  console.log('Fill in the template with:');
  console.log('  - The problem/scenario this REQ addressed');
  console.log('  - Key decisions and their rationale');
  console.log('  - Pitfalls encountered');
  console.log('  - Patterns worth reusing in future projects');
}

function buildExperienceContent(reqId, title, date) {
  return [
    `# ${date} ${title}`,
    '',
    '## 场景',
    '',
    `{描述 ${reqId} 解决的核心问题或场景}`,
    '',
    '## 关联材料',
    '',
    `- REQ: \`requirements/completed/${reqId}.md\``,
    `- Design: \`docs/plans/${reqId}-design.md\`（如有）`,
    `- Code Review: \`requirements/reports/${reqId}-code-review.md\``,
    `- QA: \`requirements/reports/${reqId}-qa.md\``,
    '',
    '## 问题 / 模式',
    '',
    '- {遇到的关键问题或重复模式}',
    '- {踩过的坑}',
    '- {意外的复杂度}',
    '',
    '## 关键决策',
    '',
    `- {决策 1：为什么这样做，而不是那样做}`,
    `- {决策 2：权衡了哪些因素}`,
    '',
    '## 解决方案',
    '',
    '1. {具体步骤或方法}',
    '2. {工具或技术的使用方式}',
    '3. {验证手段}',
    '',
    '## 复用建议',
    '',
    '- {下次遇到类似场景如何直接套用}',
    '- {需要调整的边界条件}',
    '- {相关的其他经验文档}',
  ].join('\n');
}

export function printHelp() {
  console.log('Harness Lab REQ lifecycle CLI');
  console.log('');
  console.log('Commands:');
  console.log('  create --title "Title" [--slug ascii-slug] [--year 2026] [--type bugfix|feature|refactor]');
  console.log('  start --id REQ-2026-002 [--phase implementation]');
  console.log('  block --id REQ-2026-002 --reason "..." --condition "..." --next "..." [--phase implementation]');
  console.log('  complete --id REQ-2026-002 [--phase qa] [--status-file .claude/.req-complete-status] [--no-docs-gate] [--skip-experience "reason"]');
  console.log('  status [--json] [--id REQ-ID]');
  console.log('  experience --id REQ-2026-002');
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
    case 'status':
      statusCommand(options);
      break;
    case 'complete':
      completeCommand(options);
      break;
    case 'experience':
      experienceCommand(options);
      break;
    default:
      fail(`Unknown command: ${command}`);
  }
}
