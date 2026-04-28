#!/usr/bin/env node
// invariant-gate.mjs — 不变量质量门禁
// 检查不变量是否满足结构化字段要求
// 用法：
//   node scripts/invariant-gate.mjs --scan              # 扫描所有不变量，报告质量不达标条目
//   node scripts/invariant-gate.mjs --mark-draft         # 将缺失字段的不变量标记为 draft
//   node scripts/invariant-gate.mjs --deprecate-stale    # 将 90 天未触发的 draft 标记为 deprecated
//   node scripts/invariant-gate.mjs --upgrade-frequent   # 将高频触发的 INV 升级 severity

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const INVARIANTS_DIR = join(ROOT, "context", "invariants");
const USAGE_FILE = join(ROOT, ".claude", ".inv-usage.json");

const REQUIRED_FIELDS = ["status", "severity"];
const VALID_STATUSES = ["draft", "active", "deprecated"];
const VALID_SEVERITIES = ["low", "medium", "high", "critical"];

const DEPRECATION_THRESHOLD_DAYS = 90;
const HIGH_FREQ_THRESHOLD = 10;

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

function readUsage() {
  try {
    return JSON.parse(readFileSync(USAGE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// ── 质量扫描 ──────────────────────────────────────────────

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
    if (inv.fm.status) continue;

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

// ── 自动废弃 ──────────────────────────────────────────────

function deprecateStale() {
  const usage = readUsage();
  const invariants = loadInvariants().filter(inv => inv.fm.status === "draft");
  const now = Date.now();
  const threshold = DEPRECATION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  let count = 0;

  for (const inv of invariants) {
    const invId = inv.fm.id;
    const lastTriggered = usage[invId]?.lastTriggered;

    let lastActivity;
    if (lastTriggered) {
      lastActivity = new Date(lastTriggered).getTime();
    } else {
      try {
        lastActivity = statSync(inv.path).mtimeMs;
      } catch {
        lastActivity = now;
      }
    }

    if (now - lastActivity > threshold) {
      const updated = inv.content.replace(/^status:\s*\w+/m, "status: deprecated");
      if (updated !== inv.content) {
        writeFileSync(inv.path, updated, "utf-8");
        log(`  🏷️ ${invId || inv.file} → deprecated (超过 ${DEPRECATION_THRESHOLD_DAYS} 天未触发)`);
        count++;
      }
    }
  }

  log(`📋 自动废弃完成: ${count} 条`);
  return count;
}

// ── 高频升级 ──────────────────────────────────────────────

function upgradeFrequent() {
  const usage = readUsage();
  const invariants = loadInvariants().filter(inv => inv.fm.status !== "deprecated");
  let count = 0;

  for (const inv of invariants) {
    const invId = inv.fm.id;
    const triggerCount = usage[invId]?.count || 0;

    if (triggerCount >= HIGH_FREQ_THRESHOLD && inv.fm.severity === "medium") {
      const updated = inv.content.replace(/^severity:\s*medium/m, "severity: high");
      if (updated !== inv.content) {
        writeFileSync(inv.path, updated, "utf-8");
        log(`  ⬆️ ${invId || inv.file} → severity: high (${triggerCount} 次触发)`);
        count++;
      }
    }
  }

  log(`📋 高频升级完成: ${count} 条`);
  return count;
}

// ── CLI 入口 ──────────────────────────────────────────────

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
} else if (args.includes("--deprecate-stale")) {
  log(`🏷️ 将超过 ${DEPRECATION_THRESHOLD_DAYS} 天未触发的 draft 标记为 deprecated...`);
  deprecateStale();
} else if (args.includes("--upgrade-frequent")) {
  log("⬆️ 将高频触发的 INV 升级 severity...");
  upgradeFrequent();
} else {
  log("用法:");
  log("  node scripts/invariant-gate.mjs --scan              # 扫描质量");
  log("  node scripts/invariant-gate.mjs --mark-draft         # 标记缺失字段为 draft");
  log("  node scripts/invariant-gate.mjs --deprecate-stale    # 自动废弃 90 天未触发的 draft");
  log("  node scripts/invariant-gate.mjs --upgrade-frequent   # 高频 INV 升级 severity");
  process.exit(1);
}
