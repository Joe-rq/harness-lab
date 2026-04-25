#!/usr/bin/env node
// invariant-extractor.mjs — 经验回流：不变量提取器 + 匹配器
// 用法：
//   node scripts/invariant-extractor.mjs --scan [--incremental]
//   node scripts/invariant-extractor.mjs --check --file <path>
//   node scripts/invariant-extractor.mjs --inject

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from "fs";
import { join, relative, basename } from "path";

const ROOT = process.cwd();
const EXPERIENCE_DIR = join(ROOT, "context", "experience");
const INVARIANTS_DIR = join(ROOT, "context", "invariants");

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
  // 简单的 glob 匹配：将 glob 转为正则
  const rel = filePath.replace(/\\/g, "/");
  const re = new RegExp(
    "^" + pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "$"
  );
  return re.test(rel);
}

// ── 不变量规则解析 ──────────────────────────────────────────

function parseInvariant(filePath) {
  const content = readText(filePath);
  if (!content) return null;

  // 解析 frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const id = fm.match(/id:\s*(INV-\d+)/)?.[1];
  const title = fm.match(/^title:\s*(.+)/m)?.[1]?.trim();
  const status = fm.match(/status:\s*(\w+)/)?.[1] || "draft";
  const severity = fm.match(/severity:\s*(\w+)/)?.[1] || "medium";
  const confidence = fm.match(/confidence:\s*(\w+)/)?.[1] || "medium";

  // 解析 message 块：message: | 后的缩进内容，直到非缩进行或下一个键
  let messageText = "";
  const msgBlockMatch = fm.match(/message:\s*\|\n((?:  .*\n)*)/);
  if (msgBlockMatch) {
    messageText = msgBlockMatch[1].replace(/^  /gm, "").trim();
  }
  if (!messageText) {
    messageText = fm.match(/message:\s*"([\s\S]*?)"/)?.[1] ||
                  fm.match(/^message:\s*(.+)/m)?.[1]?.trim() || "";
  }

  // 解析 triggers
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

// ── 模式 1: --scan（提取不变量候选） ──────────────────────────

// 从 experience 文档中提取失败模式关键词
const FAILURE_SIGNALS = [
  /##\s*问题/, /##\s*错误/, /##\s*坑/, /##\s*Bug/i,
  /##\s*故障/, /##\s*风险/, /##\s*避免/, /##\s*注意/,
  /##\s*复用建议/, /##\s*预防/, /##\s*解决/,
  /错误做法/, /问题/, /坑/, /避免/, /注意/,
  /失[败误效]/, /漂移/, /分叉/, /退化/, /断裂/,
  /静默成功/, /占位符/, /模板残留/,
];

// 从 experience 内容提取涉及的路径模式
const PATH_PATTERNS = [
  /`([^`]*\/[^`]*)`/g,  // 反引号包裹的路径
  /(?:scripts|requirements|docs|context|\.claude)\/[\w.*-]+/g,
];

function extractPathPatterns(content) {
  const paths = new Set();
  for (const re of PATH_PATTERNS) {
    const matches = content.matchAll(re);
    for (const m of matches) {
      let p = m[1] || m[0];
      // 简化为 glob 模式
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

  const expFiles = readdirSync(EXPERIENCE_DIR)
    .filter(f => f.endsWith(".md") && f !== "README.md")
    .map(f => join(EXPERIENCE_DIR, f));

  // 增量模式：只处理新增的 experience
  const processedSources = new Set(
    existingInvariants.flatMap(inv => {
      const srcMatch = readText(inv.file).match(/来源:\s*(.+)/);
      return srcMatch ? [srcMatch[1].trim()] : [];
    })
  );

  let newCount = 0;

  for (const expFile of expFiles) {
    const expName = basename(expFile);
    if (incremental && processedSources.has(expName)) continue;

    const content = readText(expFile);
    if (!content) continue;

    const failureSections = extractFailureSections(content);
    if (failureSections.length === 0) continue;

    const pathPatterns = extractPathPatterns(content);
    const title = content.match(/^#\s+(.+)$/m)?.[1]?.substring(0, 60) || expName;

    // 只对有明显失败信号且涉及明确路径的文档生成候选
    if (pathPatterns.length === 0) continue;

    const invId = `INV-${String(nextId + newCount).padStart(3, "0")}`;
    const slug = expName.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "").substring(0, 40);
    const invFile = join(INVARIANTS_DIR, `${invId}-${slug}.md`);

    // 提取摘要作为 message
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
  }

  if (newCount === 0) {
    log("📋 未发现新的可提取模式");
  } else {
    log(`📋 提取完成: ${newCount} 条新候选 → context/invariants/`);
  }
}

// ── 模式 2: --check（匹配不变量并输出提醒） ──────────────────

function checkInvariants(targetFile) {
  const invariants = loadAllInvariants();
  const relPath = targetFile ? relative(ROOT, targetFile).replace(/\\/g, "/") : "";
  let matched = 0;

  for (const inv of invariants) {
    if (!relPath) continue;
    if (inv.status === "deprecated") continue; // deprecated 不触发提醒

    // glob 匹配：任一 glob 模式命中即触发
    const globHit = inv.triggerGlobs.some(g => globMatch(g, relPath));

    if (globHit) {
      matched++;
      log(inv.message || `⚠️ ${inv.id}: ${inv.title}`);
    }
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

  // 写入注入文件供 hook 消费
  const injectDir = join(ROOT, ".claude", ".invariant-injections");
  ensureDir(injectDir);
  writeFileSync(join(injectDir, "active-invariants.txt"), output, "utf-8");

  // 也输出到 stdout（供直接消费）
  console.log(output);
  log(`📋 注入完成: ${invariants.length} 条 active 不变量 → .claude/.invariant-injections/active-invariants.txt`);
}

// ── CLI 入口 ────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--scan")) {
  const incremental = args.includes("--incremental");
  log("🔍 扫描 experience 文档，提取不变量候选...");
  scanExperience(incremental);
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
  log("  node scripts/invariant-extractor.mjs --scan [--incremental]");
  log("  node scripts/invariant-extractor.mjs --check --file <path>");
  log("  node scripts/invariant-extractor.mjs --inject");
  process.exit(1);
}
