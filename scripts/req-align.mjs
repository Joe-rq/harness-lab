#!/usr/bin/env node
/**
 * REQ 对齐检查工具
 *
 * 为指定 REQ 生成对齐检查清单和报告模板
 * 用法: npm run req:align -- --id REQ-2026-xxx
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function toFullPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--id' && i + 1 < argv.length) {
      options.id = argv[++i];
    }
  }
  return options;
}

function findReqFileSync(reqId) {
  const dirs = ['requirements/in-progress', 'requirements/completed'];
  for (const dir of dirs) {
    const dirPath = toFullPath(dir);
    if (!existsSync(dirPath)) continue;

    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      if (entry.startsWith(reqId) && entry.endsWith('.md')) {
        return `${dir}/${entry}`;
      }
    }
  }
  return null;
}

function readReq(reqPath) {
  const fullPath = toFullPath(reqPath);
  if (!existsSync(fullPath)) {
    fail(`REQ file not found: ${reqPath}`);
  }
  return readFileSync(fullPath, 'utf-8');
}

function findDesignDocSync(reqId) {
  const designPath = `docs/plans/${reqId}-design.md`;
  if (existsSync(toFullPath(designPath))) {
    return designPath;
  }
  // Try to find any file starting with reqId in docs/plans
  const plansDir = toFullPath('docs/plans');
  if (!existsSync(plansDir)) return null;

  const entries = readdirSync(plansDir);
  for (const entry of entries) {
    if (entry.startsWith(reqId) && entry.endsWith('.md')) {
      return `docs/plans/${entry}`;
    }
  }
  return null;
}

function extractTitle(content) {
  const match = content.match(/^#\s+REQ-\d+[^:]*:\s*(.+)$/m);
  return match ? match[1].trim() : 'Unknown';
}

function printAlignmentChecklist(reqId, title, hasDesignDoc) {
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`🎯 对齐检查清单: ${reqId}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`需求标题: ${title}`);
  console.log(`设计文档: ${hasDesignDoc ? '✅ 已找到' : '⚠️  未找到'}`);
  console.log('');
  console.log('修复完成后，请检查以下对齐维度：');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log('1️⃣  目标对齐');
  console.log('────────────────────────────────────────────────────────────');
  console.log('   实现是否服务于最初的目标？');
  console.log('   是否有偏离初衷的设计决策？');
  console.log('   如有变更，是否记录了变更原因？');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log('2️⃣  设计对齐');
  console.log('────────────────────────────────────────────────────────────');
  console.log('   实现是否符合设计文档？');
  console.log('   架构和接口是否按设计实现？');
  console.log('   如有偏差，是否经过 intentional 的权衡？');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log('3️⃣  验收标准对齐');
  console.log('────────────────────────────────────────────────────────────');
  console.log('   所有验收标准是否都有对应实现？');
  console.log('   每项标准是否都有验证手段？');
  console.log('   未达标项是否有明确说明和后续计划？');
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
}

function printReportTemplate(reqId, title, hasDesignDoc) {
  const today = new Date().toISOString().split('T')[0];

  console.log('');
  console.log('📄 对齐检查报告模板（可复制到 QA 报告或独立保存）：');
  console.log('');
  console.log('```markdown');
  console.log(`# ${reqId} 对齐检查报告`);
  console.log('');
  console.log(`- REQ: ${reqId}`);
  console.log(`- 标题: ${title}`);
  console.log(`- 日期: ${today}`);
  console.log(`- 设计文档: ${hasDesignDoc ? `docs/plans/${reqId}-design.md` : 'N/A'}`);
  console.log('');
  console.log('## 1. 目标对齐');
  console.log('');
  console.log('- [ ] 实现服务于最初目标');
  console.log('- [ ] 无偏离初衷的决策');
  console.log('- [ ] 变更原因已记录');
  console.log('');
  console.log('**说明**: {填写具体说明}');
  console.log('');
  console.log('## 2. 设计对齐');
  console.log('');
  console.log('- [ ] 实现符合设计文档');
  console.log('- [ ] 架构和接口按设计实现');
  console.log('- [ ] 偏差经过 intentional 权衡');
  console.log('');
  console.log('**说明**: {填写具体说明}');
  console.log('');
  console.log('## 3. 验收标准对齐');
  console.log('');
  console.log('- [ ] 所有标准都有对应实现');
  console.log('- [ ] 每项标准都有验证手段');
  console.log('- [ ] 未达标项有说明和后续计划');
  console.log('');
  console.log('**说明**: {填写具体说明}');
  console.log('');
  console.log('## 偏差记录');
  console.log('');
  console.log('| 项目 | 原计划 | 实际实现 | 偏差原因 |');
  console.log('|------|--------|----------|----------|');
  console.log('| {项1} | {原} | {实} | {因} |');
  console.log('| {项2} | {原} | {实} | {因} |');
  console.log('');
  console.log('## 对齐结论');
  console.log('');
  console.log('- [ ] 完全对齐');
  console.log('- [ ] 基本对齐，存在记录内的偏差');
  console.log('- [ ] 未对齐，需要进一步调整');
  console.log('');
  console.log('```');
  console.log('');
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.id) {
    console.log('Usage: npm run req:align -- --id REQ-2026-xxx');
    process.exit(1);
  }

  const reqId = options.id;
  const reqPath = findReqFileSync(reqId);

  if (!reqPath) {
    fail(`REQ not found: ${reqId}`);
  }

  const content = readReq(reqPath);
  const title = extractTitle(content);
  const designPath = findDesignDocSync(reqId);
  const hasDesignDoc = !!designPath;

  printAlignmentChecklist(reqId, title, hasDesignDoc);
  printReportTemplate(reqId, title, hasDesignDoc);

  console.log(`✅ 建议将对齐报告保存到: requirements/reports/${reqId}-alignment.md`);
  console.log('   或合并到 QA 报告中。');
  console.log('');
}

main();
