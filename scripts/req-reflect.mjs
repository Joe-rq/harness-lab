#!/usr/bin/env node
/**
 * REQ 元反思工具
 *
 * 为指定 REQ 生成元反思检查清单和报告模板
 * 用法: npm run req:reflect -- --id REQ-2026-xxx
 */

import { existsSync, readFileSync } from 'fs';
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

// Use dynamic import for fs promises
import { readdirSync } from 'fs';

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

function extractTitle(content) {
  const match = content.match(/^#\s+REQ-\d+[^:]*:\s*(.+)$/m);
  return match ? match[1].trim() : 'Unknown';
}

function printMetaReflectionPrompts(reqId, title) {
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`🤔 元反思检查清单: ${reqId}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`需求标题: ${title}`);
  console.log('');
  console.log('实施完成后，请认真回答以下问题：');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log('1️⃣  目标实现');
  console.log('────────────────────────────────────────────────────────────');
  console.log('   最初的目标是否全部达成？');
  console.log('   是否有遗漏或未完全实现的目标？');
  console.log('   是否有超出范围的新增功能？');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log('2️⃣  旧功能保护');
  console.log('────────────────────────────────────────────────────────────');
  console.log('   是否破坏了现有功能？');
  console.log('   相关测试是否全部通过？');
  console.log('   是否检查了对其他模块的副作用？');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log('3️⃣  逻辑正确性');
  console.log('────────────────────────────────────────────────────────────');
  console.log('   实现中是否存在重大逻辑错误？');
  console.log('   是否有隐含的性能或安全缺陷？');
  console.log('   边界条件处理是否完整？');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log('4️⃣  完整性');
  console.log('────────────────────────────────────────────────────────────');
  console.log('   是否处理了所有边界情况？');
  console.log('   是否有半成品或未完成的代码？');
  console.log('   文档是否同步更新？');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log('5️⃣  可维护性');
  console.log('────────────────────────────────────────────────────────────');
  console.log('   代码/文档是否清晰易懂？');
  console.log('   是否易于后续维护和扩展？');
  console.log('   是否有需要重构的债务？');
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
}

function printReportTemplate(reqId, title) {
  const today = new Date().toISOString().split('T')[0];

  console.log('');
  console.log('📄 元反思报告模板（可复制到 QA 报告）：');
  console.log('');
  console.log('```markdown');
  console.log(`# ${reqId} 元反思报告`);
  console.log('');
  console.log(`- REQ: ${reqId}`);
  console.log(`- 标题: ${title}`);
  console.log(`- 日期: ${today}`);
  console.log('');
  console.log('## 1. 目标实现');
  console.log('');
  console.log('- [ ] 最初目标全部达成');
  console.log('- [ ] 无遗漏目标');
  console.log('- [ ] 无超出范围的新增');
  console.log('');
  console.log('**说明**: {填写具体说明}');
  console.log('');
  console.log('## 2. 旧功能保护');
  console.log('');
  console.log('- [ ] 未破坏现有功能');
  console.log('- [ ] 相关测试全部通过');
  console.log('- [ ] 无副作用');
  console.log('');
  console.log('**说明**: {填写具体说明}');
  console.log('');
  console.log('## 3. 逻辑正确性');
  console.log('');
  console.log('- [ ] 无重大逻辑错误');
  console.log('- [ ] 无性能/安全缺陷');
  console.log('- [ ] 边界条件完整');
  console.log('');
  console.log('**说明**: {填写具体说明}');
  console.log('');
  console.log('## 4. 完整性');
  console.log('');
  console.log('- [ ] 所有边界情况已处理');
  console.log('- [ ] 无半成品代码');
  console.log('- [ ] 文档已同步更新');
  console.log('');
  console.log('**说明**: {填写具体说明}');
  console.log('');
  console.log('## 5. 可维护性');
  console.log('');
  console.log('- [ ] 代码/文档清晰易懂');
  console.log('- [ ] 易于维护和扩展');
  console.log('- [ ] 技术债务已记录');
  console.log('');
  console.log('**说明**: {填写具体说明}');
  console.log('');
  console.log('## 发现的问题');
  console.log('');
  console.log('{列出元反思过程中发现的问题}');
  console.log('');
  console.log('## 改进建议');
  console.log('');
  console.log('{列出针对发现问题的改进建议}');
  console.log('```');
  console.log('');
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.id) {
    console.log('Usage: npm run req:reflect -- --id REQ-2026-xxx');
    process.exit(1);
  }

  const reqId = options.id;
  const reqPath = findReqFileSync(reqId);

  if (!reqPath) {
    fail(`REQ not found: ${reqId}`);
  }

  const content = readReq(reqPath);
  const title = extractTitle(content);

  printMetaReflectionPrompts(reqId, title);
  printReportTemplate(reqId, title);

  console.log(`✅ 建议将元反思报告保存到: requirements/reports/${reqId}-meta-reflection.md`);
  console.log('   或合并到 QA 报告中。');
  console.log('');
}

main();
