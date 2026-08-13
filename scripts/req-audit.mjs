#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProgressPath } from './worktree-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..');
const FUTURE_STRICT_REQ = 62;
const DEFAULT_BASELINE_PATH = 'requirements/audit-baseline.json';

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function read(root, relPath) {
  return readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n');
}

function listReqFiles(root, relDir) {
  const fullDir = path.join(root, relDir);
  if (!existsSync(fullDir)) return [];
  return readdirSync(fullDir)
    .filter((name) => name.endsWith('.md') && name.startsWith('REQ-'))
    .map((name) => `${relDir}/${name}`);
}

function extractReqId(value) {
  const match = value.match(/REQ-\d{4}-\d{3}/);
  return match ? match[0] : null;
}

function reqSequence(reqId) {
  const match = reqId?.match(/^REQ-\d{4}-(\d{3})$/);
  return match ? Number(match[1]) : 0;
}

function getSection(content, heading) {
  const headingMatch = heading.match(/^(#{1,6})\s+/);
  const headingLevel = headingMatch ? headingMatch[1].length : 2;
  const lines = content.split('\n');
  const startIndex = lines.findIndex((line) => line.trimEnd() === heading);
  if (startIndex === -1) return '';

  const sectionLines = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const nextHeading = line.match(/^(#{1,6})\s+/);
    if (nextHeading && nextHeading[1].length <= headingLevel) {
      break;
    }
    sectionLines.push(line);
  }
  return sectionLines.join('\n').trimEnd();
}

function addFinding(findings, severity, code, reqId, file, message) {
  findings.push({
    severity,
    code,
    req_id: reqId || null,
    file: file || null,
    message,
  });
}

function severityFor(reqId, strict) {
  if (strict) return 'error';
  return reqSequence(reqId) >= FUTURE_STRICT_REQ ? 'error' : 'warning';
}

function incrementCount(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function isLegacyWarning(finding) {
  if (finding.severity !== 'warning') return false;
  const sequence = reqSequence(finding.req_id);
  return sequence > 0 && sequence < FUTURE_STRICT_REQ;
}

export function summarizeFindings(findings) {
  const bySeverity = { error: 0, warning: 0 };
  const byCode = {};
  const byCodeSeverity = {};
  let legacyWarnings = 0;
  let currentWarnings = 0;

  for (const finding of findings) {
    incrementCount(bySeverity, finding.severity);
    incrementCount(byCode, finding.code);
    const severityBucket = byCodeSeverity[finding.code] || { error: 0, warning: 0 };
    incrementCount(severityBucket, finding.severity);
    byCodeSeverity[finding.code] = severityBucket;

    if (finding.severity === 'warning') {
      if (isLegacyWarning(finding)) legacyWarnings += 1;
      else currentWarnings += 1;
    }
  }

  const topCodes = Object.entries(byCode)
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));

  return {
    total: findings.length,
    by_severity: bySeverity,
    by_code: byCode,
    by_code_severity: byCodeSeverity,
    legacy_warnings: legacyWarnings,
    current_warnings: currentWarnings,
    strict_from_req_sequence: FUTURE_STRICT_REQ,
    top_codes: topCodes,
  };
}

function normalizeBaseline(rawBaseline, baselinePath) {
  const summary = rawBaseline.summary || rawBaseline;
  const byCode = summary.by_code || rawBaseline.by_code || {};
  const warningCount =
    summary.warnings ??
    summary.warning_count ??
    summary.by_severity?.warning ??
    rawBaseline.warnings ??
    0;

  return {
    path: baselinePath,
    version: rawBaseline.version || 1,
    description: rawBaseline.description || rawBaseline.scope || '',
    warnings: warningCount,
    by_code: byCode,
  };
}

function readBaseline(root, baselinePath = DEFAULT_BASELINE_PATH) {
  const fullPath = path.isAbsolute(baselinePath) ? baselinePath : path.join(root, baselinePath);
  if (!existsSync(fullPath)) {
    return { found: false, path: baselinePath };
  }
  try {
    const raw = JSON.parse(readFileSync(fullPath, 'utf8'));
    return {
      found: true,
      ...normalizeBaseline(raw, baselinePath),
    };
  } catch (error) {
    return {
      found: true,
      path: baselinePath,
      error: `Invalid audit baseline JSON: ${error.message}`,
      warnings: 0,
      by_code: {},
    };
  }
}

function compareBaseline(summary, baseline) {
  if (!baseline || !baseline.found) return baseline || { found: false, path: DEFAULT_BASELINE_PATH };
  if (baseline.error) return baseline;

  const currentByCode = Object.fromEntries(Object.entries(summary.by_code_severity || {})
    .map(([code, counts]) => [code, counts.warning || 0]));
  const baselineByCode = baseline.by_code || {};
  const codes = [...new Set([...Object.keys(currentByCode), ...Object.keys(baselineByCode)])].sort();
  const deltas = codes.map((code) => {
    const current = currentByCode[code] || 0;
    const expected = baselineByCode[code] || 0;
    return {
      code,
      baseline: expected,
      current,
      delta: current - expected,
    };
  });
  const overBaseline = deltas.filter((item) => item.delta > 0);
  const improved = deltas.filter((item) => item.delta < 0);

  return {
    ...baseline,
    current_warnings: summary.by_severity.warning,
    delta_warnings: summary.by_severity.warning - baseline.warnings,
    within_baseline: overBaseline.length === 0 && summary.by_severity.warning <= baseline.warnings,
    over_baseline: overBaseline,
    improved,
  };
}

function parseReportLinks(content) {
  const links = [];
  const regex = /requirements\/reports\/(REQ-\d{4}-\d{3})-(code-review|qa|ship)\.md/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push({ reqId: match[1], type: match[2], path: match[0] });
  }
  return links;
}

function hasUncheckedItems(content) {
  const relevantSections = [
    getSection(content, '## 验收标准'),
    getSection(content, '#### 元反思检查（verify 阶段）'),
    getSection(content, '#### 对齐检查（record 阶段）'),
  ].join('\n');

  return relevantSections
    .split('\n')
    .some((line) => /^- \[ \]/.test(line.trim()) && !/\bN\/A\b|不适用/.test(line));
}

function tempDebtFinding(content) {
  const section = getSection(content, '## 临时实现与债务');
  if (!section) return null;
  if (/^- 无\s*$/m.test(section.trim())) return null;
  const hasExit = /退出条件|清理触发|后续清理|移除条件/.test(section);
  if (!hasExit) {
    return '临时实现与债务已声明，但缺少退出条件或清理触发点';
  }
  return null;
}

function humanVerificationRequired(content) {
  const section = getSection(content, '## 验证计划');
  const match = section.match(/^- 需要的人工验证：(.+)$/m);
  if (!match) return false;
  const value = match[1].trim();
  return value !== '' && value !== '无' && !/不需要|无需|N\/A|不适用/.test(value);
}

function auditQaEvidence(root, reqId, qaPath, reqContent, findings, strict) {
  const fullPath = path.join(root, qaPath);
  const severity = severityFor(reqId, strict);
  if (!existsSync(fullPath)) {
    addFinding(findings, severity, 'missing-report', reqId, qaPath, 'QA 报告不存在');
    return;
  }

  const qaContent = readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  if (!qaContent.includes('## 验证证据')) {
    addFinding(findings, severity, 'missing-qa-evidence', reqId, qaPath, 'QA 报告缺少 ## 验证证据');
  }

  if (humanVerificationRequired(reqContent) && !/(人工|浏览器|Computer Use|手动验证|manual|browser)/i.test(qaContent)) {
    addFinding(
      findings,
      severity,
      'missing-human-evidence',
      reqId,
      qaPath,
      'REQ 需要人工验证，但 QA 报告缺少人工/浏览器/Computer Use 证据'
    );
  }

  const debt = tempDebtFinding(reqContent);
  if (debt && !/临时实现|债务|mock|fallback|兼容/.test(qaContent)) {
    addFinding(findings, 'warning', 'missing-debt-qa-note', reqId, qaPath, 'QA 报告未说明临时债务是否影响验收');
  }
}

function auditReqFile(root, relPath, options = {}) {
  const findings = [];
  const strict = options.strict === true;
  const expectedState = options.expectedState || null;
  const content = read(root, relPath);
  const fileName = path.basename(relPath);
  const fileReqId = extractReqId(fileName);
  const titleReqId = content.match(/^# (REQ-\d{4}-\d{3}):/m)?.[1] || null;
  const sourceReqId = content.match(/<!-- Source file: (REQ-\d{4}-\d{3})-[^>]+ -->/)?.[1] || null;
  const reqId = fileReqId || titleReqId || sourceReqId;
  const severity = severityFor(reqId, strict);

  if (!fileReqId || !titleReqId) {
    addFinding(findings, severity, 'missing-req-id', reqId, relPath, '文件名或标题缺少 REQ ID');
  } else if (fileReqId !== titleReqId) {
    addFinding(findings, severity, 'req-id-mismatch', reqId, relPath, `文件名 ID ${fileReqId} 与标题 ID ${titleReqId} 不一致`);
  }

  if (sourceReqId && fileReqId && sourceReqId !== fileReqId) {
    addFinding(findings, severity, 'source-id-mismatch', reqId, relPath, `Source file ID ${sourceReqId} 与文件名 ID ${fileReqId} 不一致`);
  }

  const state = content.match(/^- 当前状态：(.+)$/m)?.[1]?.trim() || null;
  if (expectedState && state !== expectedState) {
    addFinding(findings, severity, 'status-mismatch', reqId, relPath, `期望状态 ${expectedState}，实际状态 ${state || '缺失'}`);
  }

  for (const link of parseReportLinks(content)) {
    if (reqId && link.reqId !== reqId) {
      addFinding(findings, severity, 'report-link-id-mismatch', reqId, relPath, `报告链接 ${link.path} 指向了 ${link.reqId}`);
    }
    if (!existsSync(path.join(root, link.path)) && link.type !== 'ship') {
      addFinding(findings, severity, 'missing-report', reqId, link.path, '必需报告不存在');
    }
  }

  const requiredReports = ['code-review', 'qa'];
  for (const type of requiredReports) {
    const reportPath = `requirements/reports/${reqId}-${type}.md`;
    if (reqId && !existsSync(path.join(root, reportPath))) {
      addFinding(findings, severity, 'missing-report', reqId, reportPath, `缺少 ${type} 报告`);
    }
  }

  if (hasUncheckedItems(content)) {
    addFinding(findings, severity, 'unchecked-items', reqId, relPath, '验收标准、元反思或对齐检查存在未处理复选框');
  }

  const debt = tempDebtFinding(content);
  if (debt) {
    addFinding(findings, 'warning', 'temporary-debt-missing-exit', reqId, relPath, debt);
  }

  if (reqId) {
    auditQaEvidence(root, reqId, `requirements/reports/${reqId}-qa.md`, content, findings, strict);
  }

  return findings;
}

function auditDuplicates(root, findings) {
  const seen = new Map();
  for (const relPath of [...listReqFiles(root, 'requirements/in-progress'), ...listReqFiles(root, 'requirements/completed')]) {
    const reqId = extractReqId(path.basename(relPath));
    if (!reqId) continue;
    if (!seen.has(reqId)) {
      seen.set(reqId, []);
    }
    seen.get(reqId).push(relPath);
  }

  for (const [reqId, files] of seen.entries()) {
    if (files.length > 1) {
      addFinding(findings, severityFor(reqId, false), 'duplicate-req-id', reqId, files.join(', '), '同一 REQ ID 存在多个文件');
    }
  }
}

function parseIndexActive(root) {
  const indexPath = path.join(root, 'requirements/INDEX.md');
  if (!existsSync(indexPath)) return [];
  const content = readFileSync(indexPath, 'utf8').replace(/\r\n/g, '\n');
  const section = getSection(content, '## 当前活跃 REQ');
  return section
    .split('\n')
    .map((line) => extractReqId(line))
    .filter(Boolean);
}

function parseProgressActive(root) {
  const progressPath = getProgressPath(root);
  if (!existsSync(progressPath)) return null;
  const content = readFileSync(progressPath, 'utf8').replace(/\r\n/g, '\n');
  const value = content.match(/^Current active REQ:\s*(.+)$/m)?.[1]?.trim() || null;
  if (!value || value === 'none' || value === '无') return null;
  return value;
}

function auditIndexProgress(root, findings) {
  const activeItems = parseIndexActive(root);
  const progressActive = parseProgressActive(root);

  if (activeItems.length === 0 && progressActive) {
    addFinding(findings, 'error', 'index-progress-mismatch', progressActive, path.relative(root, getProgressPath(root)), 'progress 有活跃 REQ，但 INDEX 显示无活跃 REQ');
  }

  if (activeItems.length > 0 && !progressActive) {
    addFinding(findings, 'error', 'index-progress-mismatch', activeItems[0], 'requirements/INDEX.md', 'INDEX 有活跃 REQ，但 progress 显示 none');
  }

  if (activeItems.length > 0 && progressActive && !activeItems.includes(progressActive)) {
    addFinding(findings, 'error', 'index-progress-mismatch', progressActive, 'requirements/INDEX.md', 'progress 活跃 REQ 未出现在 INDEX 当前活跃 REQ 中');
  }
}

export function auditRepository(root = DEFAULT_ROOT, options = {}) {
  const findings = [];
  const allMode = options.all === true;
  const targetId = options.id || null;

  if (targetId) {
    const candidates = [...listReqFiles(root, 'requirements/in-progress'), ...listReqFiles(root, 'requirements/completed')];
    const relPath = candidates.find((file) => path.basename(file).startsWith(`${targetId}-`));
    if (!relPath) {
      addFinding(findings, 'error', 'req-not-found', targetId, null, 'REQ 文件不存在');
    } else {
      const expectedState = relPath.startsWith('requirements/completed/') ? 'completed' : options.expectedState || null;
      findings.push(...auditReqFile(root, relPath, { strict: options.strict !== false, expectedState }));
    }
  } else if (allMode) {
    for (const relPath of listReqFiles(root, 'requirements/completed')) {
      findings.push(...auditReqFile(root, relPath, { strict: false, expectedState: 'completed' }));
    }
    auditDuplicates(root, findings);
    auditIndexProgress(root, findings);
  } else {
    auditIndexProgress(root, findings);
  }

  const summary = summarizeFindings(findings);
  const baseline = !allMode || options.baseline === false
    ? null
    : compareBaseline(summary, readBaseline(root, options.baselinePath || DEFAULT_BASELINE_PATH));

  return {
    ok: !findings.some((finding) => finding.severity === 'error'),
    findings,
    summary,
    baseline,
  };
}

export function auditReqClosure(root, reqId) {
  return auditRepository(root, { id: reqId, strict: true });
}

export function auditReqPostComplete(root, reqId) {
  return auditRepository(root, { id: reqId, strict: true, expectedState: 'completed' });
}

function parseArgs(argv) {
  const options = { all: false, id: null, format: 'text', verbose: false, maxFindings: null, baseline: true, baselinePath: DEFAULT_BASELINE_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') options.all = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg === '--summary') options.verbose = false;
    else if (arg === '--no-baseline') options.baseline = false;
    else if (arg === '--baseline') {
      options.baselinePath = argv[index + 1] || DEFAULT_BASELINE_PATH;
      index += 1;
    }
    else if (arg === '--max-findings') {
      const value = Number(argv[index + 1]);
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('--max-findings must be a non-negative integer');
      }
      options.maxFindings = value;
      index += 1;
    }
    else if (arg === '--id') {
      options.id = argv[index + 1];
      index += 1;
    } else if (arg === '--format') {
      options.format = argv[index + 1] || 'text';
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printFinding(finding) {
  const loc = finding.file ? ` ${toPosix(finding.file)}` : '';
  console.log(`- [${finding.severity}] ${finding.code}${loc}: ${finding.message}`);
}

function printSummary(summary) {
  console.log(`- Findings: ${summary.by_severity.error} errors, ${summary.by_severity.warning} warnings`);
  if (summary.by_severity.warning > 0) {
    console.log(`- Warning age: ${summary.legacy_warnings} legacy, ${summary.current_warnings} current`);
  }

  const topCodes = summary.top_codes.slice(0, 8);
  if (topCodes.length > 0) {
    console.log('- Top finding codes:');
    for (const item of topCodes) {
      const severity = summary.by_code_severity[item.code] || {};
      const parts = [];
      if (severity.error) parts.push(`${severity.error} error`);
      if (severity.warning) parts.push(`${severity.warning} warning`);
      console.log(`  - ${item.code}: ${item.count}${parts.length ? ` (${parts.join(', ')})` : ''}`);
    }
  }
}

function printBaseline(baseline) {
  if (!baseline) return;
  if (!baseline.found) {
    console.log(`- Baseline: none (${baseline.path})`);
    return;
  }
  if (baseline.error) {
    console.log(`- Baseline: invalid (${baseline.path}) - ${baseline.error}`);
    return;
  }

  const status = baseline.within_baseline ? 'within baseline' : 'over baseline';
  const delta = baseline.delta_warnings === 0 ? 'no delta' : `${baseline.delta_warnings > 0 ? '+' : ''}${baseline.delta_warnings}`;
  console.log(`- Baseline: ${status} (${baseline.current_warnings}/${baseline.warnings} warnings, ${delta})`);
  if (baseline.over_baseline.length > 0) {
    console.log(`  - Over baseline: ${baseline.over_baseline.map((item) => `${item.code}=+${item.delta}`).join(', ')}`);
  }
  if (baseline.improved.length > 0) {
    console.log(`  - Improved: ${baseline.improved.map((item) => `${item.code}=${item.delta}`).join(', ')}`);
  }
}

function shouldShowDefaultDetails(result, options) {
  if (options.verbose) return true;
  if (options.maxFindings !== null) return true;
  if (options.id) return true;
  return !result.ok && result.summary.by_severity.error > 0;
}

function selectTextFindings(result, options) {
  if (options.verbose || options.id || options.maxFindings !== null) {
    return result.findings;
  }
  return result.findings.filter((finding) => finding.severity === 'error');
}

function printText(result, options) {
  if (result.findings.length === 0) {
    console.log('REQ audit passed.');
    return;
  }

  console.log(result.ok ? 'REQ audit passed with warnings.' : 'REQ audit failed.');
  printSummary(result.summary);
  printBaseline(result.baseline);

  if (!shouldShowDefaultDetails(result, options)) {
    console.log('- Details: hidden by default for all-mode audit; rerun with --verbose or --max-findings N.');
    return;
  }

  const selected = selectTextFindings(result, options);
  const limit = options.maxFindings ?? selected.length;
  const visible = selected.slice(0, limit);
  if (visible.length > 0) {
    console.log('- Details:');
    for (const finding of visible) {
      printFinding(finding);
    }
  }
  if (selected.length > visible.length) {
    console.log(`- Details truncated: showing ${visible.length} of ${selected.length}; rerun with --verbose for all findings.`);
  }
}

export function main(argv = process.argv.slice(2), root = process.cwd()) {
  const options = parseArgs(argv);
  const result = auditRepository(root, options);
  if (options.format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printText(result, options);
  }
  if (!result.ok) {
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
