#!/usr/bin/env node
// invariant-extractor.mjs — 经验回流：不变量提取器 + 匹配器
// 用法：
//   node scripts/invariant-extractor.mjs --scan [--incremental] [--dedup]
//   node scripts/invariant-extractor.mjs --check --file <path>
//   node scripts/invariant-extractor.mjs --inject

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, unlinkSync, statSync } from "fs";
import { join, relative, basename } from "path";

const ROOT = process.cwd();
const EXPERIENCE_DIR = join(ROOT, "context", "experience");
const INVARIANTS_DIR = join(ROOT, "context", "invariants");
const USAGE_FILE = join(ROOT, ".claude", ".inv-usage.json");

const DEPRECATION_THRESHOLD_DAYS = 90;
const HIGH_FREQ_THRESHOLD = 10;

// ── 工具函数 ──────────────────────────────────────────────

function log(msg) {
  process.stderr.write(msg + "\n");
}

function readText(filePath) {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function globMatch(pattern, filePath) {
  const rel = filePath.replace(/\\/g, "/");
  const re = new RegExp(
    "^" + pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "$"
  );
  return re.test(rel);
}

function readUsage() {
  try {
    return JSON.parse(readFileSync(USAGE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeUsage(data) {
  ensureDir(join(ROOT, ".claude"));
  writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ── 不变量规则解析 ──────────────────────────────────────────

function parseInvariant(filePath) {
  const content = readText(filePath);
  if (!content) return null;

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const id = fm.match(/id:\s*(INV-\d+)/)?.[1];
  const title = fm.match(/^title:\s*(.+)/m)?.[1]?.trim();
  const status = fm.match(/status:\s*(\w+)/)?.[1] || "draft";
  const severity = fm.match(/severity:\s*(\w+)/)?.[1] || "medium";
  const confidence = fm.match(/confidence:\s*(\w+)/)?.[1] || "medium";

  let messageText = "";
  const msgBlockMatch = fm.match(/message:\s*\|\n((?:  .*\n)*)/);
  if (msgBlockMatch) {
    messageText = msgBlockMatch[1].replace(/^  /gm, "").trim();
  }
  if (!messageText) {
    messageText = fm.match(/message:\s*"([\s\S]*?)"/)?.[1] ||
                  fm.match(/^message:\s*(.+)/m)?.[1]?.trim() || "";
  }

  const triggerGlobs = [];
  const triggerPatterns = [];
  const globMatches = fm.matchAll(/-\s*glob:\s*["']?(.+?)["']?\s*$/gm);
  for (const m of globMatches) triggerGlobs.push(m[1].trim());
  const patternMatches = fm.matchAll(/-\s*pattern:\s*["']?(.+?)["']?\s*$/gm);
  for (const m of patternMatches) triggerPatterns.push(m[1].trim());

  return { id, title, status, severity, confidence, message: messageText, triggerGlobs, triggerPatterns, file: filePath };
}

function loadAllInvariants() {
  ensureDir(INVARIANTS_DIR);
  const files = readdirSync(INVARIANTS_DIR).filter(f => f.endsWith(".md"));
  return files.map(f => parseInvariant(join(INVARIANTS_DIR, f))).filter(Boolean);
}

// ── 去重：标题+触发路径相同的 INV 合并 ──────────────────────

function dedupKey(inv) {
  const sortedGlobs = [...inv.triggerGlobs].sort().join(",");
  return `${inv.title}||${sortedGlobs}`;
}

function dedupInvariants() {
  const invariants = loadAllInvariants();
  const byKey = new Map();

  for (const inv of invariants) {
    const key = dedupKey(inv);
    if (!byKey.has(key)) {
      byKey.set(key, []);
    }
    byKey.get(key).push(inv);
  }

  let removedCount = 0;

  for (const [, group] of byKey) {
    if (group.length <= 1) continue;

    // 保留 ID 最小的（最早的），删除其余
    group.sort((a, b) => {
      const numA = parseInt(a.id?.replace("INV-", "") || "999");
      const numB = parseInt(b.id?.replace("INV-", "") || "999");
      return numA - numB;
    });

    const keeper = group[0];
    const duplicates = group.slice(1);

    for (const dup of duplicates) {
      try {
        unlinkSync(dup.file);
        log(`  🗑️ 删除重复: ${dup.id} (保留 ${keeper.id})`);
        removedCount++;
      } catch (e) {
        log(`  ⚠️ 无法删除 ${dup.file}: ${e.message}`);
      }
    }
  }

  return removedCount;
}

// ── 自动废弃：90 天未触发的 draft INV 标记为 deprecated ──────

function autoDeprecate() {
  const usage = readUsage();
  const invariants = loadAllInvariants().filter(inv => inv.status === "draft");
  const now = Date.now();
  const threshold = DEPRECATION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  let deprecatedCount = 0;

  for (const inv of invariants) {
    const lastTriggered = usage[inv.id]?.lastTriggered;
    // 无触发记录：用文件修改时间
    let lastActivity;
    if (lastTriggered) {
      lastActivity = new Date(lastTriggered).getTime();
    } else {
      try {
        lastActivity = statSync(inv.file).mtimeMs;
      } catch {
        lastActivity = now; // 无法获取时间，跳过
      }
    }

    if (now - lastActivity > threshold) {
      const content = readText(inv.file);
      const updated = content.replace(/^status:\s*\w+/m, "status: deprecated");
      if (updated !== content) {
        writeFileSync(inv.file, updated, "utf-8");
        log(`  🏷️ 自动废弃: ${inv.id} — 超过 ${DEPRECATION_THRESHOLD_DAYS} 天未触发`);
        deprecatedCount++;
      }
    }
  }

  return deprecatedCount;
}

// ── 高频升级：触发次数 ≥10 的 INV 升级 severity ──────────────

function upgradeHighFreq() {
  const usage = readUsage();
  const invariants = loadAllInvariants().filter(inv => inv.status !== "deprecated");
  let upgradedCount = 0;

  for (const inv of invariants) {
    const count = usage[inv.id]?.count || 0;
    if (count >= HIGH_FREQ_THRESHOLD && inv.severity === "medium") {
      const content = readText(inv.file);
      const updated = content.replace(/^severity:\s*medium/m, "severity: high");
      if (updated !== content) {
        writeFileSync(inv.file, updated, "utf-8");
        log(`  ⬆️ 高频升级: ${inv.id} — medium → high (${count} 次触发)`);
        upgradedCount++;
      }
    }
  }

  return upgradedCount;
}

// ── 模式 1: --scan（提取不变量候选） ──────────────────────────

const FAILURE_SIGNALS = [
  /##\s*问题/, /##\s*错误/, /##\s*坑/, /##\s*Bug/i,
  /##\s*故障/, /##\s*风险/, /##\s*避免/, /##\s*注意/,
  /##\s*复用建议/, /##\s*预防/, /##\s*解决/,
  /错误做法/, /问题/, /坑/, /避免/, /注意/,
  /失[败误效]/, /漂移/, /分叉/, /退化/, /断裂/,
  /静默成功/, /占位符/, /模板残留/,
];

const PATH_PATTERNS = [
  /`([^`]*\/[^`]*)`/g,
  /(?:scripts|requirements|docs|context|\.claude)\/[\w.*-]+/g,
];

function extractPathPatterns(content) {
  const paths = new Set();
  for (const re of PATH_PATTERNS) {
    const matches = content.matchAll(re);
    for (const m of matches) {
      let p = m[1] || m[0];
      if (p.includes(".")) {
        const dir = p.substring(0, p.lastIndexOf("/"));
        if (dir) paths.add(dir + "/**");
      } else {
        paths.add(p.replace(/\/$/, "") + "/**");
      }
    }
  }
  return [...paths];
}

function extractFailureSections(content) {
  const sections = [];
  const lines = content.split("\n");
  let capturing = false;
  let currentSection = [];

  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (capturing && currentSection.length > 0) {
        sections.push(currentSection.join("\n"));
      }
      capturing = FAILURE_SIGNALS.some(re => re.test(line));
      currentSection = capturing ? [line] : [];
    } else if (capturing) {
      currentSection.push(line);
    }
  }
  if (capturing && currentSection.length > 0) {
    sections.push(currentSection.join("\n"));
  }
  return sections;
}

function scanExperience(incremental = false) {
  ensureDir(INVARIANTS_DIR);
  ensureDir(EXPERIENCE_DIR);

  const existingInvariants = loadAllInvariants();
  const nextId = existingInvariants.length + 1;

  // 构建去重索引：标题+触发路径 → 已存在的 INV
  const existingByKey = new Map();
  for (const inv of existingInvariants) {
    const key = dedupKey(inv);
    existingByKey.set(key, inv);
  }

  const expFiles = readdirSync(EXPERIENCE_DIR)
    .filter(f => f.endsWith(".md") && f !== "README.md")
    .map(f => join(EXPERIENCE_DIR, f));

  const processedSources = new Set(
    existingInvariants.flatMap(inv => {
      const srcMatch = readText(inv.file).match(/来源:\s*(.+)/);
      return srcMatch ? [srcMatch[1].trim()] : [];
    })
  );

  let newCount = 0;
  let skippedCount = 0;

  for (const expFile of expFiles) {
    const expName = basename(expFile);
    if (incremental && processedSources.has(expName)) continue;

    const content = readText(expFile);
    if (!content) continue;

    const failureSections = extractFailureSections(content);
    if (failureSections.length === 0) continue;

    const pathPatterns = extractPathPatterns(content);
    const title = content.match(/^#\s+(.+)$/m)?.[1]?.substring(0, 60) || expName;

    if (pathPatterns.length === 0) continue;

    // 去重检查：标题+触发路径组合已存在则跳过
    const sortedGlobs = pathPatterns.slice(0, 4).sort().join(",");
    const key = `${(title || expName).replace(/[#*]/g, "").trim()}||${sortedGlobs}`;
    if (existingByKey.has(key)) {
      skippedCount++;
      log(`  ⏭️ 跳过重复: ${expName} (已存在 ${existingByKey.get(key).id})`);
      continue;
    }

    const invId = `INV-${String(nextId + newCount).padStart(3, "0")}`;
    const slug = expName.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "").substring(0, 40);
    const invFile = join(INVARIANTS_DIR, `${invId}-${slug}.md`);

    const summary = failureSections[0].split("\n").slice(0, 5).join("\n").trim();

    const invContent = [
      "---",
      `id: ${invId}`,
      `title: ${(title || slug).replace(/[#*]/g, "").trim()}`,
      "status: draft",
      "severity: medium",
      "triggers:",
      ...pathPatterns.slice(0, 4).map(p => `  - glob: "${p}"`),
      `confidence: medium`,
      `message: |`,
      `  ⚠️ ${invId}: ${(title || slug).replace(/[#*]/g, "").trim().substring(0, 80)}`,
      `  来源: experience/${expName}`,
      "---",
      "",
      "## 详细说明",
      "",
      summary,
      "",
      `<!-- 来源: context/experience/${expName} -->`,
    ].join("\n");

    writeFileSync(invFile, invContent, "utf-8");
    log(`  ✅ 提取候选: ${invId} ← ${expName}`);
    newCount++;

    // 加入索引，防止同一次 scan 重复
    existingByKey.set(key, { id: invId });
  }

  if (skippedCount > 0) {
    log(`📋 跳过 ${skippedCount} 条重复候选`);
  }
  if (newCount === 0) {
    log("📋 未发现新的可提取模式");
  } else {
    log(`📋 提取完成: ${newCount} 条新候选 → context/invariants/`);
  }
}

// ── 模式 2: --check（匹配不变量并输出提醒 + 频率追踪） ──────

function checkInvariants(targetFile) {
  const invariants = loadAllInvariants();
  const relPath = targetFile ? relative(ROOT, targetFile).replace(/\\/g, "/") : "";
  let matched = 0;
  const usage = readUsage();
  const now = new Date().toISOString();

  for (const inv of invariants) {
    if (!relPath) continue;
    if (inv.status === "deprecated") continue;

    const globHit = inv.triggerGlobs.some(g => globMatch(g, relPath));

    if (globHit) {
      matched++;
      log(inv.message || `⚠️ ${inv.id}: ${inv.title}`);

      // 频率追踪
      if (inv.id) {
        if (!usage[inv.id]) {
          usage[inv.id] = { count: 0, lastTriggered: "" };
        }
        usage[inv.id].count++;
        usage[inv.id].lastTriggered = now;
      }
    }
  }

  if (matched > 0) {
    writeUsage(usage);
  }

  return matched;
}

// ── 模式 3: --inject（生成注入文本） ───────────────────────────

function injectInvariants() {
  const invariants = loadAllInvariants().filter(inv => inv.status === "active");
  if (invariants.length === 0) {
    log("📋 无 active 不变量，跳过注入");
    return;
  }

  const lines = [];
  lines.push("⚠️ 不变量提醒（编辑相关文件时请遵守）：\n");

  for (const inv of invariants) {
    const globs = inv.triggerGlobs.length > 0 ? `触发: ${inv.triggerGlobs.join(", ")}` : "";
    lines.push(`- ${inv.id} [${inv.severity}]: ${inv.title}`);
    if (globs) lines.push(`  ${globs}`);
    if (inv.message) {
      const msgLines = inv.message.split("\n").filter(l => l.trim());
      for (const ml of msgLines.slice(0, 2)) {
        lines.push(`  ${ml.replace(/^⚠️\s*/, "")}`);
      }
    }
    lines.push("");
  }

  const output = lines.join("\n");

  const injectDir = join(ROOT, ".claude", ".invariant-injections");
  ensureDir(injectDir);
  writeFileSync(join(injectDir, "active-invariants.txt"), output, "utf-8");

  console.log(output);
  log(`📋 注入完成: ${invariants.length} 条 active 不变量 → .claude/.invariant-injections/active-invariants.txt`);
}

// ── CLI 入口 ────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--scan")) {
  const incremental = args.includes("--incremental");
  const dedup = args.includes("--dedup");

  log("🔍 扫描 experience 文档，提取不变量候选...");

  if (dedup) {
    log("🧹 去重模式：清理重复不变量...");
    const removed = dedupInvariants();
    log(`🧹 去重完成: 删除 ${removed} 条重复`);
  }

  scanExperience(incremental);

  // 自动废弃
  log(`🏷️ 检查超过 ${DEPRECATION_THRESHOLD_DAYS} 天未触发的 draft 不变量...`);
  const deprecated = autoDeprecate();
  if (deprecated > 0) {
    log(`🏷️ 自动废弃: ${deprecated} 条`);
  } else {
    log("🏷️ 无需自动废弃");
  }

  // 高频升级
  log("⬆️ 检查高频触发的 INV...");
  const upgraded = upgradeHighFreq();
  if (upgraded > 0) {
    log(`⬆️ 高频升级: ${upgraded} 条`);
  } else {
    log("⬆️ 无需升级");
  }

} else if (args.includes("--inject")) {
  log("💉 生成 active 不变量注入文本...");
  injectInvariants();
} else if (args.includes("--check")) {
  const fileIdx = args.indexOf("--file");
  const targetFile = fileIdx >= 0 ? args[fileIdx + 1] : "";
  if (!targetFile) {
    log("用法: --check --file <path>");
    process.exit(1);
  }
  checkInvariants(targetFile);
} else {
  log("用法:");
  log("  node scripts/invariant-extractor.mjs --scan [--incremental] [--dedup]");
  log("  node scripts/invariant-extractor.mjs --check --file <path>");
  log("  node scripts/invariant-extractor.mjs --inject");
  process.exit(1);
}
