/**
 * Governance Error Classifier
 * 结构化错误分类与恢复策略
 */

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * 错误类型定义
 * 每种错误包含：代码、类型、描述、恢复策略
 */
export const ErrorTypes = {
  NO_ACTIVE_REQ: {
    code: 'E001',
    type: 'NO_ACTIVE_REQ',
    title: '无活跃 REQ',
    message: '无活跃 REQ，代码修改需要 REQ。',
    recovery: [
      '创建 REQ:',
      '  npm run req:create -- --title "Your feature"',
      '或临时豁免（仅限小改动）:',
      '  touch .claude/.req-exempt',
      '  echo "$(date -Iseconds) | CREATE | manual | <reason>" >> .claude/exempt-audit.log',
    ],
  },
  REQ_NOT_FOUND: {
    code: 'E002',
    type: 'REQ_NOT_FOUND',
    title: 'REQ 文件不存在',
    message: '活跃 REQ 的文件未找到。',
    recovery: ['检查 requirements/ 目录下是否存在对应的 REQ 文件', '或更新 .claude/progress.txt 中的活跃 REQ 引用'],
  },
  REQ_DRAFT_STATUS: {
    code: 'E003',
    type: 'REQ_DRAFT_STATUS',
    title: 'REQ 仍为 draft 状态',
    message: 'REQ 状态为 draft，需要先启动才能修改代码。',
    recovery: ['填充 REQ 内容（背景、目标、验收标准等）', '然后运行:', '  npm run req:start -- --id REQ-xxx'],
  },
  REQ_TEMPLATE_EMPTY: {
    code: 'E004',
    type: 'REQ_TEMPLATE_EMPTY',
    title: 'REQ 模板未填充',
    message: 'REQ 包含未填充的模板占位符。',
    recovery: ['编辑 REQ 文件，填充以下章节:', '  - 背景', '  - 目标', '  - 验收标准'],
  },
  DOCS_DRIFT: {
    code: 'E005',
    type: 'DOCS_DRIFT',
    title: '文档同步缺失',
    message: '代码修改触发了文档同步义务，但相关文档未更新。',
    recovery: ['运行以下命令查看文档影响:', '  npm run docs:impact', '更新相关文档后重新尝试。'],
  },
  MISSING_REPORTS: {
    code: 'E006',
    type: 'MISSING_REPORTS',
    title: '缺少必需报告',
    message: '完成 REQ 需要提交 code-review 和 qa 报告。',
    recovery: [
      '创建缺失的报告文件:',
      '  requirements/reports/REQ-xxx-code-review.md',
      '  requirements/reports/REQ-xxx-qa.md',
      '如果某类报告不适用，创建文件并说明原因。',
    ],
  },
  MISSING_EXPERIENCE: {
    code: 'E007',
    type: 'MISSING_EXPERIENCE',
    title: '缺少经验文档',
    message: '完成 REQ 需要提交经验文档。',
    recovery: ['创建经验文档:', '  npm run req:experience -- --id REQ-xxx', '如果无复用价值，可使用 --skip-experience 豁免。'],
  },
  EXEMPT_ABUSED: {
    code: 'E008',
    type: 'EXEMPT_ABUSED',
    title: '豁免机制滥用',
    message: '检测到频繁使用豁免机制，可能违反治理规范。',
    recovery: ['检查 .claude/exempt-audit.log 了解豁免历史', '如果豁免合理，可忽略此警告。'],
  },
};

/**
 * 格式化错误块
 * @param {keyof typeof ErrorTypes} errorTypeKey - 错误类型键
 * @param {Object} context - 上下文信息
 * @returns {string} 格式化的错误块
 */
export function formatErrorBlock(errorTypeKey, context = {}) {
  const errorType = ErrorTypes[errorTypeKey];
  if (!errorType) {
    return formatUnknownError(errorTypeKey, context);
  }

  const lines = [
    '╔══════════════════════════════════════════════════════════════╗',
    '║              🚫 GOVERNANCE BLOCKED                          ║',
    '╠══════════════════════════════════════════════════════════════╣',
    `║  错误代码: ${errorType.code.padEnd(48)}║`,
    `║  错误类型: ${errorType.type.padEnd(48)}║`,
    `║  描述: ${errorType.message.padEnd(52)}║`,
  ];

  // 添加上下文信息
  if (context.file) {
    lines.push(`║  文件: ${context.file.padEnd(52)}║`);
  }
  if (context.reqId) {
    lines.push(`║  REQ: ${context.reqId.padEnd(54)}║`);
  }
  if (context.detail) {
    const detailLines = wrapText(context.detail, 50);
    for (const line of detailLines) {
      lines.push(`║  ${line.padEnd(60)}║`);
    }
  }

  lines.push('╠══════════════════════════════════════════════════════════════╣');
  lines.push('║  恢复策略:                                                   ║');

  for (const step of errorType.recovery) {
    const wrappedLines = wrapText(step, 56);
    for (const line of wrappedLines) {
      lines.push(`║    ${line.padEnd(58)}║`);
    }
  }

  lines.push('╚══════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}

/**
 * 格式化未知错误
 */
function formatUnknownError(errorKey, context) {
  return [
    '╔══════════════════════════════════════════════════════════════╗',
    '║              🚫 GOVERNANCE BLOCKED                          ║',
    '╠══════════════════════════════════════════════════════════════╣',
    `║  错误代码: UNKNOWN                                           ║`,
    `║  错误类型: ${String(errorKey).padEnd(48)}║`,
    '╚══════════════════════════════════════════════════════════════╝',
  ].join('\n');
}

/**
 * 文本换行辅助函数
 */
function wrapText(text, maxWidth) {
  if (text.length <= maxWidth) {
    return [text];
  }

  const lines = [];
  let remaining = text;
  while (remaining.length > maxWidth) {
    lines.push(remaining.slice(0, maxWidth));
    remaining = remaining.slice(maxWidth);
  }
  if (remaining.length > 0) {
    lines.push(remaining);
  }
  return lines;
}

/**
 * 记录错误到日志文件
 * @param {keyof typeof ErrorTypes} errorTypeKey - 错误类型键
 * @param {Object} context - 上下文信息
 * @param {string} logPath - 日志文件路径
 */
export function logError(errorTypeKey, context = {}, logPath = '.claude/error.log') {
  const errorType = ErrorTypes[errorTypeKey] || { code: 'UNKNOWN', type: String(errorTypeKey) };
  const timestamp = new Date().toISOString();
  const code = errorType.code;
  const type = errorType.type;
  const detail = context.detail || context.file || '';

  const entry = `${timestamp} | ${code} | ${type} | ${detail}\n`;

  try {
    // 确保目录存在
    const dir = path.dirname(logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(logPath, entry, 'utf8');
  } catch {
    // 静默忽略日志写入失败
  }
}

/**
 * 获取错误代码
 * @param {keyof typeof ErrorTypes} errorTypeKey - 错误类型键
 * @returns {string} 错误代码
 */
export function getErrorCode(errorTypeKey) {
  const errorType = ErrorTypes[errorTypeKey];
  return errorType ? errorType.code : 'UNKNOWN';
}

/**
 * 获取恢复策略
 * @param {keyof typeof ErrorTypes} errorTypeKey - 错误类型键
 * @returns {string[]} 恢复步骤列表
 */
export function getRecoverySteps(errorTypeKey) {
  const errorType = ErrorTypes[errorTypeKey];
  return errorType ? errorType.recovery : [];
}

// CLI 支持
const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  const args = process.argv.slice(2);
  const typeIndex = args.indexOf('--type');
  const contextIndex = args.indexOf('--context');

  if (typeIndex === -1) {
    console.error('Usage: error-classifier.mjs --type <ERROR_TYPE> [--context "key=value"]');
    console.error('');
    console.error('Available error types:');
    for (const [key, value] of Object.entries(ErrorTypes)) {
      console.error(`  ${key}: ${value.code} - ${value.title}`);
    }
    process.exit(1);
  }

  const errorTypeKey = args[typeIndex + 1];
  const context = {};

  if (contextIndex !== -1) {
    const contextStr = args[contextIndex + 1];
    if (contextStr) {
      for (const pair of contextStr.split(',')) {
        const [key, value] = pair.split('=');
        if (key && value) {
          context[key] = value;
        }
      }
    }
  }

  console.error(formatErrorBlock(errorTypeKey, context));
  logError(errorTypeKey, context);
  process.exit(2);
}
