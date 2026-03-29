import { readFileSync } from 'node:fs';
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
