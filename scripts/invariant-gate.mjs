#!/usr/bin/env node
// invariant-gate.mjs — 不变量质量门禁
// 检查不变量是否满足结构化字段要求
// 用法：
//   node scripts/invariant-gate.mjs --scan          # 扫描所有不变量，报告质量不达标条目
//   node scripts/invariant-gate.mjs --mark-draft     # 将缺失字段的不变量标记为 draft

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const INVARIANTS_DIR = join(ROOT, "context", "invariants");

const REQUIRED_FIELDS = ["status", "severity"];
const VALID_STATUSES = ["draft", "active", "deprecated"];
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];

function log(msg) {
  process.stderr.write(msg + "\n");
}

function readText(filePath) {
  try { return readFileSync(filePath, "utf-8"); }
  catch { return ""; }
}

function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return {};
  const fm = fmMatch[1];
  const result = {};
  for (const line of fm.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return result;
}

function loadInvariants() {
  if (!existsSync(INVARIANTS_DIR)) return [];
  return readdirSync(INVARIANTS_DIR)
    .filter(f => f.endsWith(".md") && f.startsWith("INV-") && !f.includes("TEMPLATE"))
    .map(f => {
      const filePath = join(INVARIANTS_DIR, f);
      const content = readText(filePath);
      const fm = parseFrontmatter(content);
      return { file: f, path: filePath, fm, content };
    });
}

function scanInvariants() {
  const invariants = loadInvariants();
  const issues = [];

  for (const inv of invariants) {
    const invIssues = [];

    for (const field of REQUIRED_FIELDS) {
      if (!inv.fm[field]) {
        invIssues.push(`缺少字段: ${field}`);
      }
    }

    if (inv.fm.status && !VALID_STATUSES.includes(inv.fm.status)) {
      invIssues.push(`status 值无效: "${inv.fm.status}" (应为 ${VALID_STATUSES.join("/")})`);
    }

    if (inv.fm.severity && !VALID_SEVERITIES.includes(inv.fm.severity)) {
      invIssues.push(`severity 值无效: "${inv.fm.severity}" (应为 ${VALID_SEVERITIES.join("/")})`);
    }

    if (!inv.fm.title || inv.fm.title.startsWith("20")) {
      invIssues.push("title 带日期前缀或为空（自动扫描候选特征）");
    }

    if (!inv.fm.message || inv.fm.message.includes("来源: experience/")) {
      invIssues.push("message 只是来源复读，缺少实质提醒内容");
    }

    if (invIssues.length > 0) {
      issues.push({ file: inv.file, id: inv.fm.id || "?", issues: invIssues });
    }
  }

  return issues;
}

function markDraft() {
  const invariants = loadInvariants();
  let count = 0;

  for (const inv of invariants) {
    if (inv.fm.status) continue; // 已有 status，跳过

    // 在 confidence 行前插入 status: draft
    const updated = inv.content.replace(
      /^(confidence:)/m,
      "status: draft\n$1"
    );
    writeFileSync(inv.path, updated, "utf-8");
    count++;
    log(`  ✅ ${inv.file} → draft`);
  }

  log(`📋 标记完成: ${count} 条不变量设为 draft`);
}

const args = process.argv.slice(2);

if (args.includes("--scan")) {
  log("🔍 扫描不变量质量...");
  const issues = scanInvariants();
  if (issues.length === 0) {
    log("✅ 所有不变量质量达标");
  } else {
    log(`⚠️ ${issues.length} 条不变量存在质量问题：\n`);
    for (const item of issues) {
      log(`  ${item.id} (${item.file}):`);
      for (const issue of item.issues) {
        log(`    - ${issue}`);
      }
    }
  }

  // 输出汇总
  const invariants = loadInvariants();
  const byStatus = { active: 0, draft: 0, deprecated: 0, none: 0 };
  for (const inv of invariants) {
    byStatus[inv.fm.status || "none"]++;
  }
  log(`\n📊 汇总: ${invariants.length} 条 | active: ${byStatus.active} | draft: ${byStatus.draft} | deprecated: ${byStatus.deprecated} | 无状态: ${byStatus.none}`);

  process.exit(issues.length > 0 ? 1 : 0);
} else if (args.includes("--mark-draft")) {
  log("🏷️ 将缺失 status 的不变量标记为 draft...");
  markDraft();
} else {
  log("用法:");
  log("  node scripts/invariant-gate.mjs --scan         # 扫描质量");
  log("  node scripts/invariant-gate.mjs --mark-draft   # 标记缺失字段为 draft");
  process.exit(1);
}
