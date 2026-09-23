import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatErrorBlock, logError, ErrorTypes } from './error-classifier.mjs';

const reqTemplateChecks = [
  {
    heading: '## 背景',
    label: '背景',
    placeholders: ['说明为什么要做这件事。'],
  },
  {
    heading: '## 目标',
    label: '目标',
    placeholders: ['- 目标 1', '- 目标 2'],
  },
  {
    heading: '## 验收标准',
    label: '验收标准',
    placeholders: ['- [ ] 标准 1', '- [ ] 标准 2'],
  },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSection(text, heading) {
  // 标题后只吃一个换行：`\n+` 会把标题与正文之间的空行吃掉，导致"空章节"把下一个标题吞进正文
  const pattern = new RegExp(`(?:^|\\n)${escapeRegExp(heading)}[ \\t]*\\n([\\s\\S]*?)(?=\\n## |[ \\t]*$)`);
  const match = text.match(pattern);
  return match ? match[1].trimEnd() : '';
}

function parseReqStatus(content) {
  const match = content.match(/^- 当前状态：(.+)$/m);
  return match ? match[1].trim() : null;
}

// 标题是否存在（与"标题在但内容为空"区分开：getSection 两种情况都返回空串）
function hasHeading(text, heading) {
  return new RegExp(`(?:^|\\n)${escapeRegExp(heading)}\\s*(?:\\n|$)`).test(text);
}

function isSectionEmpty(section) {
  return section.replace(/<!--[\s\S]*?-->/g, '').trim() === '';
}

// 去掉行首列表标记与复选框，便于按"行首内容"比较（占位符与正文两侧用同一归一化）
function normalizeBullet(text) {
  return text.trim().replace(/^[-*]\s*(?:\[[ xX]\]\s*)?/, '');
}

// 占位符只在行首（去掉列表标记与复选框后）出现才算未填：
// 正文里引用占位符（如反引号包裹、句中提及）不算——判定必须区分"内容"与"提及"（REQ-2026-102）。
function hasLeadingPlaceholder(section, placeholder) {
  const target = normalizeBullet(placeholder);
  return section.split('\n').some((line) => normalizeBullet(line).startsWith(target));
}

export function findReqTemplateIssues(content) {
  const issues = [];

  for (const check of reqTemplateChecks) {
    if (!hasHeading(content, check.heading)) {
      issues.push({
        code: 'missing-section',
        section: check.label,
        heading: check.heading,
      });
      continue;
    }

    const section = getSection(content, check.heading);
    if (isSectionEmpty(section)) {
      issues.push({
        code: 'empty-section',
        section: check.label,
      });
      continue;
    }

    for (const placeholder of check.placeholders) {
      if (hasLeadingPlaceholder(section, placeholder)) {
        issues.push({
          code: 'template-placeholder',
          section: check.label,
          placeholder,
        });
      }
    }
  }

  return issues;
}

export function validateReqDocument(content, options = {}) {
  const allowDraftStatus = options.allowDraftStatus === true;
  const issues = [...findReqTemplateIssues(content)];
  const status = parseReqStatus(content);

  if (!allowDraftStatus && status?.toLowerCase() === 'draft') {
    issues.push({
      code: 'draft-status',
      status,
    });
  }

  return {
    status,
    issues,
  };
}

export function formatReqIssue(issue) {
  return renderIssue(issue);
}

function renderIssue(issue) {
  if (issue.code === 'missing-section') {
    return `- missing required section: ${issue.section} (expected heading: ${issue.heading})`;
  }

  if (issue.code === 'empty-section') {
    return `- required section is empty: ${issue.section}`;
  }

  if (issue.code === 'template-placeholder') {
    return `- ${issue.section} still contains template placeholder: ${issue.placeholder}`;
  }

  if (issue.code === 'draft-status') {
    return '- REQ status is still draft';
  }

  return `- Unknown validation issue: ${JSON.stringify(issue)}`;
}

/**
 * 确定错误类型
 */
function classifyValidationIssues(validation) {
  const templateCodes = new Set(['template-placeholder', 'missing-section', 'empty-section']);
  const hasTemplateIssues = validation.issues.some((issue) => templateCodes.has(issue.code));
  const hasDraftStatus = validation.issues.some((issue) => issue.code === 'draft-status');

  if (hasDraftStatus && hasTemplateIssues) {
    return 'REQ_DRAFT_STATUS';
  }
  if (hasTemplateIssues) {
    return 'REQ_TEMPLATE_EMPTY';
  }
  if (hasDraftStatus) {
    return 'REQ_DRAFT_STATUS';
  }
  return 'REQ_TEMPLATE_EMPTY';
}

/**
 * 获取错误详情列表
 */
function buildIssueDetail(validation) {
  return validation.issues.map(renderIssue).join('\n');
}

export function buildHookBlockMessage({ reqId, reqFile, validation }) {
  const errorTypeKey = classifyValidationIssues(validation);
  const errorType = ErrorTypes[errorTypeKey];

  const lines = [
    '╔══════════════════════════════════════════════════════════════╗',
    '║              🚫 GOVERNANCE BLOCKED                          ║',
    '╠══════════════════════════════════════════════════════════════╣',
    `║  错误代码: ${errorType.code.padEnd(48)}║`,
    `║  错误类型: ${errorType.type.padEnd(48)}║`,
    `║  描述: ${errorType.message.padEnd(52)}║`,
    `║  REQ: ${reqId.padEnd(54)}║`,
    '╠══════════════════════════════════════════════════════════════╣',
    '║  具体问题:                                                   ║',
    ...validation.issues.map((issue) => `║    ${renderIssue(issue).padEnd(58)}║`),
    `║  文件: ${reqFile.padEnd(52)}║`,
    '╠══════════════════════════════════════════════════════════════╣',
    '║  恢复策略:                                                   ║',
  ];

  for (const step of errorType.recovery) {
    lines.push(`║    ${step.padEnd(58)}║`);
  }

  lines.push('╚══════════════════════════════════════════════════════════════╝');

  // 记录错误日志
  logError(errorTypeKey, { reqId, file: reqFile, detail: buildIssueDetail(validation) });

  return lines.join('\n');
}

export function buildStartBlockMessage({ reqId, reqFile, validation }) {
  const errorTypeKey = classifyValidationIssues(validation);
  const errorType = ErrorTypes[errorTypeKey];

  const lines = [
    '╔══════════════════════════════════════════════════════════════╗',
    '║              🚫 GOVERNANCE BLOCKED                          ║',
    '╠══════════════════════════════════════════════════════════════╣',
    `║  错误代码: ${errorType.code.padEnd(48)}║`,
    `║  错误类型: ${errorType.type.padEnd(48)}║`,
    `║  描述: 无法启动 ${reqId} - REQ 内容不完整                     ║`,
    '╠══════════════════════════════════════════════════════════════╣',
    '║  具体问题:                                                   ║',
    ...validation.issues.map((issue) => `║    ${renderIssue(issue).padEnd(58)}║`),
    `║  文件: ${reqFile.padEnd(52)}║`,
    '╠══════════════════════════════════════════════════════════════╣',
    '║  恢复策略:                                                   ║',
  ];

  for (const step of errorType.recovery) {
    lines.push(`║    ${step.padEnd(58)}║`);
  }

  lines.push('╚══════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}

export function validateReqFile(reqFile, options = {}) {
  const content = readFileSync(reqFile, 'utf8').replace(/\r\n/g, '\n');
  return validateReqDocument(content, options);
}

// Design document validation
// Each placeholder is a pattern that indicates an unfilled section
// Format: [placeholder text, isListItem]
// isListItem=true means it's a list item like "- 解决的问题：" and we check if there's content after the colon
const designPlaceholderPatterns = [
  ['- 补充本次需求的目标', true],
  ['- 补充本次需求包含的内容', true],
  ['- 补充本次需求不包含的内容', true],
  ['- 解决的问题：', true],
  ['- 目标用户：', true],
  ['- 预期收益：', true],
  ['- Proceed / Revise / Defer', false],
  ['- 影响模块：', true],
  ['- 依赖方向：', true],
  ['- 需要新增或修改的边界：', true],
  ['- 自动验证：', true],
  ['- 人工验证：', true],
  ['- 回滚：', true],
];

// Check if a specific exemption is marked (checkbox [x] format or legacy text format)
function hasExemption(reqContent, exemptionId) {
  // Use the full heading from REQ_TEMPLATE.md
  let constraintSection = getSection(reqContent, '### 约束（Scope Control，可选）');
  if (!constraintSection) {
    // 宽松回退（REQ-088 #2）：匹配 ### 约束 前缀，兼容漏写"，可选"的标题
    const m = reqContent.match(/(?:^|\n)(### 约束[^\n]*)\n+([\s\S]*?)(?=\n## |$)/);
    constraintSection = m ? m[2].trimEnd() : '';
  }
  // New format: - [x] skip-design-validation
  const checkboxPattern = new RegExp(`- \\[x\\]\\s*${exemptionId}`, 'i');
  if (checkboxPattern.test(constraintSection)) {
    return true;
  }
  // Legacy format: explicit text mention (backward compatibility)
  // For design doc: "设计文档豁免" or "skip-design-validation"
  if (exemptionId === 'skip-design-validation') {
    return constraintSection.includes('设计文档豁免');
  }
  return false;
}

function hasDesignExemption(reqContent) {
  return hasExemption(reqContent, 'skip-design-validation');
}

export function validateDesignDocument(reqId, reqContent, rootDir) {
  const issues = [];
  const designPath = rootDir ? path.join(rootDir, `docs/plans/${reqId}-design.md`) : `docs/plans/${reqId}-design.md`;

  // Check exemption
  if (hasDesignExemption(reqContent)) {
    return { valid: true, issues: [], skipped: true };
  }

  // Check file exists
  if (!existsSync(designPath)) {
    issues.push({
      code: 'missing-design-doc',
      path: `docs/plans/${reqId}-design.md`,
    });
    return { valid: false, issues, skipped: false };
  }

  // Check placeholders - detect if lines end with placeholder (no actual content)
  const content = readFileSync(designPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = content.split('\n');

  for (const [placeholder, isListItem] of designPlaceholderPatterns) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (isListItem) {
        // For list items like "- 解决的问题：", check if line equals the placeholder
        // (no content after the colon) or ends with just the placeholder part
        if (trimmed === placeholder) {
          issues.push({
            code: 'design-placeholder',
            placeholder,
          });
          break; // Only report once per placeholder type
        }
      } else {
        // For non-list items like "- Proceed / Revise / Defer", check exact match
        if (trimmed === placeholder) {
          issues.push({
            code: 'design-placeholder',
            placeholder,
          });
          break;
        }
      }
    }
  }

  return { valid: issues.length === 0, issues, skipped: false };
}

export function buildDesignBlockMessage({ reqId, validation }) {
  const lines = [
    `Cannot start ${reqId}: design document validation failed`,
    '',
  ];

  const hasMissingDoc = validation.issues.some((issue) => issue.code === 'missing-design-doc');

  for (const issue of validation.issues) {
    if (issue.code === 'missing-design-doc') {
      lines.push(`  - Missing design document: ${issue.path}`);
    } else if (issue.code === 'design-placeholder') {
      lines.push(`  - Design doc still has placeholder: "${issue.placeholder}"`);
    }
  }

  if (hasMissingDoc) {
    lines.push(
      '',
      'To create a design document:',
      `  1. Create file: docs/plans/${reqId}-design.md`,
      '  2. Fill in the design details',
      '  3. Run req:start again',
      '',
      'For small changes that don\'t need design documentation:',
      '  Add "skip-design-validation" exemption in the REQ\'s Scope Control section.',
    );
  } else {
    lines.push(
      '',
      'Please fill in the design doc before starting implementation.',
      'For small changes, add "skip-design-validation" in the Scope Control section of the REQ.',
    );
  }

  return lines.join('\n');
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = value;
    index += 1;
  }

  return options;
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const options = parseArgs(process.argv.slice(2));
  const reqFile = options.file;
  const reqId = options['req-id'] || 'REQ';
  const allowDraftStatus = options['allow-draft'] === true;

  if (!reqFile) {
    console.error('req-validation requires --file');
    process.exit(1);
  }

  const validation = validateReqFile(reqFile, { allowDraftStatus });
  if (validation.issues.length > 0) {
    console.error(buildHookBlockMessage({ reqId, reqFile, validation }));
    process.exit(2);
  }
}
