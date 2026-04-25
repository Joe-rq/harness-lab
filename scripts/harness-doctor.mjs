#!/usr/bin/env node
// harness-doctor.mjs — Harness Lab 健康诊断
// 检查项目接入状态，输出结构化诊断报告 + 修复建议
// 用法：
//   node scripts/harness-doctor.mjs          # 运行全部检查
//   node scripts/harness-doctor.mjs --json   # JSON 格式输出

import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");

function log(msg) {
  process.stderr.write(msg + "\n");
}

function readText(filePath) {
  try { return readFileSync(filePath, "utf-8"); }
  catch { return ""; }
}

function readJson(filePath) {
  try { return JSON.parse(readFileSync(filePath, "utf-8")); }
  catch { return null; }
}

// settings.local.json hooks 结构：
// { hooks: { SessionStart: [{ matcher, hooks: [{ type, command, timeout }] }], ... } }
function getHookCommands(settings) {
  const commands = [];
  const events = settings?.hooks || {};
  for (const [event, entries] of Object.entries(events)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      for (const hook of (entry.hooks || [])) {
        commands.push({ event, command: hook.command || "" });
      }
    }
  }
  return commands;
}

function getHookEvents(settings) {
  const events = settings?.hooks || {};
  return Object.keys(events).filter(k => Array.isArray(events[k]));
}

// ── 检查 1: Hook 配置 ──────────────────────────────────────────

function checkHookConfig() {
  const settingsPath = join(ROOT, ".claude", "settings.local.json");
  const settings = readJson(settingsPath);

  if (!settings) {
    return {
      name: "Hook 配置",
      status: "fail",
      detail: "settings.local.json 不存在或无法解析",
      fix: "运行 /harness-setup 或手动创建 .claude/settings.local.json"
    };
  }

  const configured = getHookEvents(settings);
  const expected = ["SessionStart", "PreToolUse", "PostToolUse"];
  const missing = expected.filter(e => !configured.includes(e));

  if (missing.length === expected.length) {
    return {
      name: "Hook 配置",
      status: "fail",
      detail: `未配置任何 hook（期望 ${expected.join(", ")}）`,
      fix: "运行 /harness-setup 选择安装治理 hooks"
    };
  }

  if (missing.length > 0) {
    return {
      name: "Hook 配置",
      status: "warn",
      detail: `缺少 hook: ${missing.join(", ")}（已配置: ${configured.join(", ")}）`,
      fix: `在 settings.local.json 中添加 ${missing.join(" 和 ")} hook`
    };
  }

  return {
    name: "Hook 配置",
    status: "pass",
    detail: `已配置 ${expected.length} 个 hook: ${expected.join(", ")}`,
    fix: null
  };
}

// ── 检查 2: Hook 脚本存在性 ───────────────────────────────────

function checkHookScripts() {
  const settingsPath = join(ROOT, ".claude", "settings.local.json");
  const settings = readJson(settingsPath);

  if (!settings || !settings.hooks) {
    return {
      name: "Hook 脚本存在性",
      status: "fail",
      detail: "无 hook 配置，无法检查脚本",
      fix: "先运行检查 1 修复 hook 配置"
    };
  }

  const hookCommands = getHookCommands(settings);
  const missing = [];
  const found = [];

  for (const { event, command } of hookCommands) {
    const scriptMatch = command.match(/"([^"]+\.(?:mjs|sh))"/);
    if (scriptMatch) {
      const scriptName = scriptMatch[1].split("/").pop();
      const fullPath = join(ROOT, "scripts", scriptName);
      if (existsSync(fullPath)) {
        found.push(`${event}: ${scriptName}`);
      } else {
        missing.push(`${event}: ${scriptName}`);
      }
    }
  }

  if (missing.length > 0) {
    return {
      name: "Hook 脚本存在性",
      status: "fail",
      detail: `脚本缺失: ${missing.join(", ")}`,
      fix: "确认脚本文件存在，或重新运行 /harness-setup 复制脚本"
    };
  }

  if (found.length === 0) {
    return {
      name: "Hook 脚本存在性",
      status: "warn",
      detail: "hook 命令中未检测到脚本路径（可能使用内联命令）",
      fix: null
    };
  }

  return {
    name: "Hook 脚本存在性",
    status: "pass",
    detail: `${found.length} 个脚本文件均存在`,
    fix: null
  };
}

// ── 检查 3: REQ 模板定制 ─────────────────────────────────────

function checkReqTemplate() {
  const templatePath = join(ROOT, "requirements", "REQ_TEMPLATE.md");
  const content = readText(templatePath);

  if (!content) {
    return {
      name: "REQ 模板",
      status: "fail",
      detail: "requirements/REQ_TEMPLATE.md 不存在",
      fix: "运行 /harness-setup 安装核心模块"
    };
  }

  const placeholders = [
    "说明为什么要做这件事。",
    "目标 1",
    "标准 1",
    "涉及目录 / 模块："
  ];

  const remaining = placeholders.filter(p => content.includes(p));

  if (remaining.length > 2) {
    return {
      name: "REQ 模板",
      status: "warn",
      detail: `模板仍含 ${remaining.length} 个默认占位符，建议根据项目定制`,
      fix: "编辑 REQ_TEMPLATE.md，替换默认占位符为项目特定内容"
    };
  }

  return {
    name: "REQ 模板",
    status: "pass",
    detail: "模板已定制（占位符 ≤ 2）",
    fix: null
  };
}

// ── 检查 4: Experience 内容 ───────────────────────────────────

function checkExperience() {
  const expDir = join(ROOT, "context", "experience");

  if (!existsSync(expDir)) {
    return {
      name: "Experience 目录",
      status: "warn",
      detail: "context/experience/ 目录不存在",
      fix: "运行 /harness-setup 安装 context 模块"
    };
  }

  const files = readdirSync(expDir).filter(f => f.endsWith(".md") && !f.startsWith("README"));

  if (files.length === 0) {
    return {
      name: "Experience 目录",
      status: "warn",
      detail: "无经验文档",
      fix: "完成第一个 REQ 后运行 npm run req:experience 沉淀经验"
    };
  }

  return {
    name: "Experience 目录",
    status: "pass",
    detail: `${files.length} 篇经验文档`,
    fix: null
  };
}

// ── 检查 5: 不变量激活状态 ───────────────────────────────────

function checkInvariants() {
  const invDir = join(ROOT, "context", "invariants");

  if (!existsSync(invDir)) {
    return {
      name: "不变量系统",
      status: "warn",
      detail: "context/invariants/ 目录不存在",
      fix: "运行 /harness-setup 安装 context 模块"
    };
  }

  const files = readdirSync(invDir).filter(f => f.endsWith(".md") && f.startsWith("INV-") && !f.includes("TEMPLATE"));

  if (files.length === 0) {
    return {
      name: "不变量系统",
      status: "warn",
      detail: "无不变量文件",
      fix: "运行 node scripts/invariant-gate.mjs --scan 扫描不变量"
    };
  }

  let active = 0, draft = 0, deprecated = 0;

  for (const f of files) {
    const content = readText(join(invDir, f));
    const statusMatch = content.match(/^status:\s*(\w+)/m);
    const status = statusMatch ? statusMatch[1] : "none";
    if (status === "active") active++;
    else if (status === "deprecated") deprecated++;
    else draft++;
  }

  if (active === 0) {
    return {
      name: "不变量系统",
      status: "warn",
      detail: `${files.length} 条不变量，0 条激活（draft: ${draft}, deprecated: ${deprecated}）`,
      fix: "审核 draft 不变量并激活有价值的条目：编辑 frontmatter 将 status: draft 改为 status: active"
    };
  }

  return {
    name: "不变量系统",
    status: "pass",
    detail: `${files.length} 条不变量（active: ${active}, draft: ${draft}, deprecated: ${deprecated}）`,
    fix: null
  };
}

// ── 主流程 ────────────────────────────────────────────────────

function runAllChecks() {
  return [
    checkHookConfig(),
    checkHookScripts(),
    checkReqTemplate(),
    checkExperience(),
    checkInvariants()
  ];
}

const STATUS_LABEL = { pass: "✅", warn: "⚠️", fail: "❌" };

function printReport(results) {
  log("\n🏥 Harness Lab 诊断报告\n");
  log("─".repeat(50));

  let passCount = 0, warnCount = 0, failCount = 0;

  for (const r of results) {
    const label = STATUS_LABEL[r.status];
    log(`${label} ${r.name}`);
    log(`   ${r.detail}`);
    if (r.fix) {
      log(`   💡 修复: ${r.fix}`);
    }
    log("");

    if (r.status === "pass") passCount++;
    else if (r.status === "warn") warnCount++;
    else failCount++;
  }

  log("─".repeat(50));
  log(`\n📊 汇总: ${passCount} 通过 | ${warnCount} 警告 | ${failCount} 失败\n`);

  return { passCount, warnCount, failCount };
}

// ── 入口 ──────────────────────────────────────────────────────

const results = runAllChecks();

if (jsonMode) {
  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
} else {
  const { failCount } = printReport(results);
  process.exit(failCount > 0 ? 1 : 0);
}
