import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

function read(relPath) {
  const fullPath = path.join(root, relPath);
  return readFileSync(fullPath, 'utf8');
}

function requireFile(relPath) {
  const fullPath = path.join(root, relPath);
  if (!existsSync(fullPath)) {
    errors.push(`Missing required file: ${relPath}`);
  }
}

function requireText(relPath, expectedSnippets) {
  const content = read(relPath);
  for (const snippet of expectedSnippets) {
    if (!content.includes(snippet)) {
      errors.push(`Expected "${snippet}" in ${relPath}`);
    }
  }
}

function getSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = markdown.match(regex);
  return match ? match[1] : '';
}

const requiredFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  'package.json',
  '.claude/settings.local.json',
  '.claude/progress.txt',
  'skills/README.md',
  'context/business/README.md',
  'context/business/product-overview.md',
  'context/experience/README.md',
  'docs/plans/REQ-2026-001-design.md',
  'docs/plans/REQ-2026-900-design.md',
  'requirements/INDEX.md',
  'requirements/REQ_TEMPLATE.md',
  'requirements/completed/REQ-2026-001-template-hardening.md',
  'requirements/completed/REQ-2026-900-example-status-filter.md',
  'requirements/in-progress/REQ-2026-901-suspended-example.md',
  'requirements/reports/REQ-2026-001-code-review.md',
  'requirements/reports/REQ-2026-001-qa.md',
  'requirements/reports/REQ-2026-900-code-review.md',
  'requirements/reports/REQ-2026-900-qa.md',
  'requirements/reports/REQ-2026-900-ship.md',
];

for (const relPath of requiredFiles) {
  requireFile(relPath);
}

const experienceDocs = readdirSync(path.join(root, 'context/experience'))
  .filter((name) => name.endsWith('.md') && name !== 'README.md');

if (experienceDocs.length === 0) {
  errors.push('context/experience must contain at least one experience document besides README.md');
}

requireText('README.md', [
  'npm run check:governance',
  '人类维护者最短路径',
  'AI agent / Codex 完整路径',
  'REQ-2026-901-suspended-example.md',
]);

requireText('CLAUDE.md', ['npm run check:governance']);
requireText('requirements/INDEX.md', [
  '## 当前搁置 REQ',
  'REQ-2026-001-template-hardening.md',
  'REQ-2026-901-suspended-example.md',
]);
requireText('requirements/REQ_TEMPLATE.md', ['## 阻塞 / 搁置说明（可选）']);
requireText('skills/README.md', [
  'plan/ceo-review.md',
  'review/code-review.md',
  'qa/qa.md',
  'ship/ship.md',
]);
requireText('.claude/settings.local.json', ['node scripts/check-governance.mjs']);

const packageJson = JSON.parse(read('package.json'));
if (packageJson.scripts?.['check:governance'] !== 'node scripts/check-governance.mjs') {
  errors.push('package.json must expose "check:governance": "node scripts/check-governance.mjs"');
}

const indexText = read('requirements/INDEX.md');
const progressText = read('.claude/progress.txt');

const activeSection = getSection(indexText, '## 当前活跃 REQ').trim();
const activeItems = activeSection
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('- ') && line !== '- 无');

const progressMatch = progressText.match(/^Current active REQ:\s*(.+)$/m);
if (!progressMatch) {
  errors.push('progress.txt must include "Current active REQ"');
} else {
  const progressActive = progressMatch[1].trim();
  if (activeItems.length === 0 && progressActive !== 'none') {
    errors.push('requirements/INDEX.md says there is no active REQ, but progress.txt does not say "none"');
  }

  if (activeItems.length > 0 && progressActive === 'none') {
    errors.push('requirements/INDEX.md lists an active REQ, but progress.txt says "none"');
  }

  if (activeItems.length > 0 && !activeItems.some((item) => item.includes(progressActive))) {
    errors.push('Active REQ in progress.txt must appear in requirements/INDEX.md');
  }
}

if (errors.length > 0) {
  console.error('Governance check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Governance check passed.');
console.log('- Required files are present.');
console.log('- README and CLAUDE entry points are aligned.');
console.log('- requirements/INDEX.md and .claude/progress.txt are consistent.');
