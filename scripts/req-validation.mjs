import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const pattern = new RegExp(`${escapeRegExp(heading)}\\n+([\\s\\S]*?)(?=\\n## |$)`);
  const match = text.match(pattern);
  return match ? match[1].trimEnd() : '';
}

function parseReqStatus(content) {
  const match = content.match(/^- 当前状态：(.+)$/m);
  return match ? match[1].trim() : null;
}

export function findReqTemplateIssues(content) {
  const issues = [];

  for (const check of reqTemplateChecks) {
    const section = getSection(content, check.heading);
    for (const placeholder of check.placeholders) {
      if (section.includes(placeholder)) {
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

function renderIssue(issue) {
  if (issue.code === 'template-placeholder') {
    return `- ${issue.section} still contains template placeholder: ${issue.placeholder}`;
  }

  if (issue.code === 'draft-status') {
    return '- REQ status is still draft';
  }

  return `- Unknown validation issue: ${JSON.stringify(issue)}`;
}

export function buildHookBlockMessage({ reqId, reqFile, validation }) {
  const lines = [
    '╔══════════════════════════════════════════════════════════════╗',
    '║              🚫 REQ ENFORCEMENT: BLOCKED                    ║',
    '╠══════════════════════════════════════════════════════════════╣',
    '',
    `  Active REQ (${reqId}) is not ready for implementation.`,
    '',
    '  Blocking issues:',
    ...validation.issues.map((issue) => `  ${renderIssue(issue)}`),
    '',
    `  REQ file: ${reqFile}`,
  ];

  if (validation.issues.some((issue) => issue.code === 'template-placeholder')) {
    lines.push('', '  Fill the REQ with real background, goals, and acceptance criteria.');
  }

  if (validation.issues.some((issue) => issue.code === 'draft-status')) {
    lines.push('', "  Run 'npm run req:start -- --id REQ-YYYY-NNN --phase implementation' after filling the REQ.");
  }

  lines.push('', '╚══════════════════════════════════════════════════════════════╝');
  return lines.join('\n');
}

export function buildStartBlockMessage({ reqId, reqFile, validation }) {
  const lines = [
    `Cannot start ${reqId} because the REQ still contains template content:`,
    ...validation.issues.map(renderIssue),
    '',
    'Fill the REQ with real background, goals, and acceptance criteria before running req:start.',
    `REQ file: ${reqFile}`,
  ];

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
  const constraintSection = getSection(reqContent, '### 约束（Scope Control，可选）');
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
