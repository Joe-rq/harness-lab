import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

function markdownFiles(root, relDir, prefix = '') {
  const fullDir = path.join(root, relDir);
  if (!existsSync(fullDir)) return [];
  return readdirSync(fullDir)
    .filter((name) => name.endsWith('.md') && (!prefix || name.startsWith(prefix)))
    .map((name) => ({ name, relPath: `${relDir}/${name}`, content: readFileSync(path.join(fullDir, name), 'utf8') }));
}

function reqIdFrom(value) {
  return value.match(/REQ-\d{4}-\d{3}/)?.[0] || null;
}

export function parseReqLifecycle(content) {
  const raw = content.match(/^- 当前状态：(.+)$/m)?.[1]?.trim().toLowerCase() || 'unknown';
  const phase = content.match(/^- 当前阶段：(.+)$/m)?.[1]?.trim() || 'unknown';
  const operational = raw === 'in-progress' ? 'active'
    : (raw === 'blocked' || raw === 'suspended' ? 'suspended'
      : (raw === 'draft' ? 'draft' : (raw === 'completed' ? 'completed' : 'invalid')));
  return { raw, phase, operational };
}

function isPublicExample(file) {
  return /公开脱敏示例|仅用于演示/.test(file.content) || /(?:^|-)example(?:-|\.)/.test(file.name);
}

export function inventoryRequirements(root) {
  const inProgress = markdownFiles(root, 'requirements/in-progress', 'REQ-').map((file) => ({
    reqId: reqIdFrom(file.name),
    file: file.relPath,
    example: isPublicExample(file),
    ...parseReqLifecycle(file.content),
  }));
  const completedFiles = markdownFiles(root, 'requirements/completed', 'REQ-');
  const operational = inProgress.filter((item) => !item.example);
  const count = (state) => operational.filter((item) => item.operational === state).length;
  return {
    active: count('active'),
    suspended: count('suspended'),
    draft: count('draft'),
    invalid: count('invalid'),
    completed: completedFiles.length,
    examples: inProgress.filter((item) => item.example).length,
    items: inProgress,
  };
}

function frontMatterValue(content, key) {
  return content.match(new RegExp(`^${key}:\\s*["']?([^\\n"']+)`, 'm'))?.[1]?.trim() || null;
}

function invariantSource(content) {
  const match = content.match(/(?:来源|Source):\s*(?:context\/)?(experience\/[A-Za-z0-9._/-]+\.md)/i)
    || content.match(/<!--\s*来源:\s*(?:context\/)?(experience\/[A-Za-z0-9._/-]+\.md)\s*-->/i);
  return match?.[1] || null;
}

function isInvariantTemplate(file) {
  return file.name === 'TEMPLATE.md' || file.name.includes('TEMPLATE') ||
    /id:\s*INV-NNN|\{DATE\}|experience\/TEMPLATE\.md/.test(file.content);
}

export function inventoryInvariants(root) {
  const files = markdownFiles(root, 'context/invariants')
    .filter((file) => file.name.endsWith('.md'));
  const templates = files.filter(isInvariantTemplate);
  const records = files.filter((file) => !isInvariantTemplate(file)).map((file) => ({
    file: file.relPath,
    id: frontMatterValue(file.content, 'id'),
    title: frontMatterValue(file.content, 'title'),
    status: frontMatterValue(file.content, 'status') || 'draft',
    source: invariantSource(file.content),
  }));
  const duplicateFiles = new Set();
  const duplicateGroups = [];
  for (const field of ['source', 'id']) {
    const groups = new Map();
    for (const record of records) {
      if (!record[field]) continue;
      const items = groups.get(record[field]) || [];
      items.push(record);
      groups.set(record[field], items);
    }
    for (const [value, items] of groups) {
      if (items.length < 2) continue;
      const sorted = [...items].sort((left, right) => left.file.localeCompare(right.file));
      for (const duplicate of sorted.slice(1)) duplicateFiles.add(duplicate.file);
      duplicateGroups.push({ field, value, files: sorted.map((item) => item.file) });
    }
  }
  const unique = records.filter((record) => !duplicateFiles.has(record.file));
  const statusCount = (status) => unique.filter((record) => record.status === status).length;
  return {
    total_files: files.length,
    templates: templates.length,
    duplicate_files: duplicateFiles.size,
    unique: unique.length,
    active: statusCount('active'),
    draft: statusCount('draft'),
    deprecated: statusCount('deprecated'),
    invalid: unique.filter((record) => !['active', 'draft', 'deprecated'].includes(record.status)).length,
    duplicate_groups: duplicateGroups,
    records,
  };
}

export function classifyAuditSignals(audit) {
  const baseline = audit.baseline || { found: false, over_baseline: [], improved: [] };
  const warningRegressions = (baseline.over_baseline || []).reduce((sum, item) => sum + item.delta, 0);
  const errors = audit.summary?.by_severity?.error || 0;
  const totalWarnings = audit.summary?.by_severity?.warning || 0;
  return {
    regressions: {
      errors,
      warnings_over_baseline: warningRegressions,
      total: errors + warningRegressions,
      by_code: baseline.over_baseline || [],
    },
    debt: {
      known_warnings: Math.max(0, totalWarnings - warningRegressions),
      baseline_warnings: baseline.warnings || 0,
      within_baseline: baseline.within_baseline ?? null,
    },
    improvements: baseline.improved || [],
  };
}

export function buildRepositoryState(root) {
  return {
    requirements: inventoryRequirements(root),
    invariants: inventoryInvariants(root),
  };
}
