#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  capabilityManifest,
  doctorExpectations,
  getCapabilitiesForModules,
  modules,
  resolveInstallProfile,
  resolveModuleClosure,
  targetPackageScripts,
} from './capability-manifest.mjs';
import { readHarnessMode } from './hook-policy.mjs';
import { buildRepositoryState } from './state-semantics.mjs';

function readText(filePath) {
  try { return readFileSync(filePath, 'utf8'); } catch { return ''; }
}

function readJson(filePath) {
  try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch { return null; }
}

function sameArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => value === right[index]);
}

function getHookCommands(settings) {
  const commands = [];
  for (const [event, entries] of Object.entries(settings?.hooks || {})) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      for (const hook of Array.isArray(entry?.hooks) ? entry.hooks : []) {
        commands.push({ event, matcher: String(entry.matcher || ''), command: String(hook?.command || '') });
      }
    }
  }
  return commands;
}

function commandScriptName(command) {
  const extensions = doctorExpectations.scriptExtensions.join('|');
  const match = command.match(new RegExp(`(?:^|[/\\\\])([^/\\\\"'\\s]+\\.(?:${extensions}))(?:["'\\s]|$)`));
  return match?.[1] || null;
}

function validateProfileRecord(record) {
  const issues = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return ['record must be an object'];
  if (record.schemaVersion !== 1) issues.push('unsupported profile schemaVersion');
  if (record.manifestSchemaVersion !== capabilityManifest.schemaVersion) issues.push('manifest schema version mismatch');
  if (record.productVersion !== capabilityManifest.productVersion) issues.push('manifest product version mismatch');
  if (!['core', 'default', 'custom'].includes(record.profile)) issues.push('unknown profile id');
  if (!Array.isArray(record.modules) || record.modules.some((id) => !(id in modules))) {
    issues.push('modules contain unknown values');
  } else {
    try {
      const closure = resolveModuleClosure(record.modules);
      if (!sameArray(record.modules, closure)) issues.push('modules are not a deterministic dependency closure');
      const expectedCapabilities = getCapabilitiesForModules(record.modules);
      if (!sameArray(record.capabilities, expectedCapabilities)) issues.push('capabilities do not match modules');
    } catch (error) {
      issues.push(error.message);
    }
  }
  if (!Array.isArray(record.overlays) || record.overlays.some((id) => !(id in capabilityManifest.overlays))) {
    issues.push('overlays contain unknown values');
  } else if (Array.isArray(record.modules)) {
    for (const [overlayId, definition] of Object.entries(capabilityManifest.overlays)) {
      const selected = definition.modules.every((moduleId) => record.modules.includes(moduleId));
      if (record.overlays.includes(overlayId) !== selected) {
        issues.push(`overlay ${overlayId} does not match selected modules`);
      }
    }
    if (['core', 'default'].includes(record.profile)) {
      try {
        const expectedModules = resolveInstallProfile(record.profile, { overlays: record.overlays });
        if (!sameArray(record.modules, expectedModules)) issues.push(`modules do not match ${record.profile} profile`);
      } catch (error) {
        issues.push(error.message);
      }
    }
  }
  return issues;
}

function inferModules(rootDir) {
  return resolveModuleClosure(Object.entries(modules)
    .filter(([, definition]) => (definition.detectionFiles || definition.files).every((file) => existsSync(path.join(rootDir, file))))
    .map(([moduleId]) => moduleId));
}

function inferredProfileId(moduleIds) {
  if (sameArray(moduleIds, resolveInstallProfile('core'))) return 'core';
  if (sameArray(moduleIds, resolveInstallProfile('default'))) return 'default';
  return 'custom';
}

export function resolveDoctorProfile(rootDir) {
  const recordPath = path.join(rootDir, '.harness', 'profile.json');
  if (existsSync(recordPath)) {
    const record = readJson(recordPath);
    const issues = validateProfileRecord(record);
    return {
      source: 'record',
      path: recordPath,
      valid: issues.length === 0,
      issues,
      profile: record?.profile || 'unknown',
      modules: Array.isArray(record?.modules) ? record.modules.filter((id) => id in modules) : [],
      overlays: Array.isArray(record?.overlays) ? record.overlays.filter((id) => id in capabilityManifest.overlays) : [],
      capabilities: Array.isArray(record?.capabilities) ? record.capabilities : [],
    };
  }

  const packageJson = readJson(path.join(rootDir, 'package.json'));
  const sourceCheckout = packageJson?.name === 'harness-lab';
  const inferredModules = sourceCheckout ? resolveModuleClosure(Object.keys(modules)) : inferModules(rootDir);
  const settings = readJson(path.join(rootDir, '.claude', 'settings.local.json'));
  const configuredScripts = new Set(getHookCommands(settings).map(({ command }) => commandScriptName(command)).filter(Boolean));
  const overlays = [];
  if (inferredModules.includes('hook')) overlays.push('basic-hooks');
  if (
    inferredModules.includes('advanced-hooks') &&
    doctorExpectations.advancedHookScripts.some((script) => configuredScripts.has(script))
  ) overlays.push('advanced-hooks');

  return {
    source: sourceCheckout ? 'source-inference' : 'legacy-inference',
    path: recordPath,
    valid: inferredModules.includes('core'),
    issues: inferredModules.includes('core') ? [] : ['could not infer the core module'],
    profile: sourceCheckout ? 'source' : inferredProfileId(inferredModules),
    modules: inferredModules,
    overlays,
    capabilities: getCapabilitiesForModules(inferredModules),
  };
}

function profileCheck(profile) {
  if (!profile.valid) {
    return { name: '安装 profile', status: 'fail', detail: profile.issues.join('; '), fix: '重新运行 harness-install，或修复 .harness/profile.json' };
  }
  if (profile.source === 'record') {
    return { name: '安装 profile', status: 'pass', detail: `${profile.profile}${profile.overlays.length ? ` + ${profile.overlays.join(', ')}` : ''}（record）`, fix: null };
  }
  return {
    name: '安装 profile',
    status: 'warn',
    detail: `${profile.profile}${profile.overlays.length ? ` + ${profile.overlays.join(', ')}` : ''}（${profile.source}）`,
    fix: profile.source === 'legacy-inference' ? '重新运行 harness-install 生成确定性 profile record' : null,
  };
}

function capabilityFilesCheck(rootDir, profile) {
  const missing = [];
  for (const moduleId of profile.modules) {
    for (const file of modules[moduleId].files) {
      if (!existsSync(path.join(rootDir, file))) missing.push(`${moduleId}: ${file}`);
    }
  }
  return missing.length
    ? { name: 'Profile 文件完整性', status: 'fail', detail: `缺失 ${missing.join(', ')}`, fix: '按当前 profile 重新运行 harness-install' }
    : { name: 'Profile 文件完整性', status: 'pass', detail: `${profile.modules.length} modules / ${profile.capabilities.length} capabilities`, fix: null };
}

function capabilityDriftCheck(rootDir, profile) {
  const extras = Object.entries(modules)
    .filter(([moduleId, definition]) => (
      !profile.modules.includes(moduleId) &&
      definition.files.length > 0 &&
      definition.files.every((file) => existsSync(path.join(rootDir, file)))
    ))
    .map(([moduleId]) => moduleId);
  return extras.length
    ? { name: 'Profile 能力漂移', status: 'warn', detail: `发现 record 外完整模块: ${extras.join(', ')}`, fix: '重新运行 installer 更新 profile，或移除未纳管模块' }
    : { name: 'Profile 能力漂移', status: 'pass', detail: '未发现 record 外完整模块', fix: null };
}

function ownershipCheck(rootDir, profile) {
  if (profile.source === 'source-inference') {
    return { name: 'Managed ownership', status: 'skip', detail: '模板源码仓库不是目标安装，不要求 ownership record', fix: null };
  }
  const ownershipPath = path.join(rootDir, '.harness', 'ownership.json');
  if (!existsSync(ownershipPath)) {
    return { name: 'Managed ownership', status: 'warn', detail: 'ownership record 缺失；legacy 文件升级时将以冲突优先', fix: '重新运行 installer 建立 ownership baseline' };
  }
  const record = readJson(ownershipPath);
  if (!record) return { name: 'Managed ownership', status: 'fail', detail: 'ownership record 无法解析', fix: '从备份恢复或重新运行 installer' };
  const entries = record.files && typeof record.files === 'object' && !Array.isArray(record.files)
    ? Object.entries(record.files) : [];
  const invalid = record.schemaVersion !== 1 || record.profile !== profile.profile || !record.lastAttemptedVersion ||
    entries.some(([relPath, entry]) => !/^[a-f0-9]{64}$/.test(String(entry?.sha256 || '')) || !entry?.sourceVersion || !relPath);
  if (invalid) return { name: 'Managed ownership', status: 'fail', detail: 'ownership schema/profile/hash 不合法', fix: '从 upgrade backup 恢复，或审阅后重建 ownership record' };
  const versions = new Set(entries.map(([, entry]) => entry.sourceVersion));
  const selectedCount = profile.modules.reduce((count, moduleId) => count + modules[moduleId].files.length, 0);
  if (versions.size > 1 || record.lastCompleteVersion !== record.lastAttemptedVersion || entries.length < selectedCount) {
    return {
      name: 'Managed ownership',
      status: 'warn',
      detail: `${entries.length}/${selectedCount} owned；file versions=${[...versions].join(', ') || 'none'}；complete=${record.lastCompleteVersion || 'none'} attempted=${record.lastAttemptedVersion}`,
      fix: '运行 harness-install --upgrade --dry-run 查看冲突并完成升级',
    };
  }
  return { name: 'Managed ownership', status: 'pass', detail: `${entries.length} files / version ${record.lastCompleteVersion}`, fix: null };
}

function packageScriptsCheck(rootDir, profile) {
  if (!profile.modules.includes('cli')) return { name: 'CLI scripts', status: 'skip', detail: '当前 profile 未选择 CLI', fix: null };
  const packageJson = readJson(path.join(rootDir, 'package.json'));
  if (!packageJson) return { name: 'CLI scripts', status: 'warn', detail: '无可读 package.json；使用 direct Node 入口', fix: null };
  const missing = Object.keys(targetPackageScripts).filter((name) => typeof packageJson.scripts?.[name] !== 'string');
  return missing.length
    ? { name: 'CLI scripts', status: 'fail', detail: `缺失 aliases: ${missing.join(', ')}`, fix: '重新运行 harness-install 绑定 package scripts' }
    : { name: 'CLI scripts', status: 'pass', detail: `${Object.keys(targetPackageScripts).length} 个 aliases 已配置`, fix: null };
}

function hookChecks(rootDir, profile) {
  if (!profile.modules.includes('hook')) {
    return [{ name: '基础 Hook', status: 'skip', detail: '当前 profile 未选择 basic-hooks', fix: null }];
  }
  const settings = readJson(path.join(rootDir, '.claude', 'settings.local.json'));
  if (!settings) return [{ name: '基础 Hook', status: 'fail', detail: 'settings.local.json 不存在或无法解析', fix: '使用 --with-hook 重新安装' }];
  const commands = getHookCommands(settings);
  const events = new Set(commands.map(({ event }) => event));
  const scriptNames = new Set(commands.map(({ command }) => commandScriptName(command)).filter(Boolean));
  const missingEvents = doctorExpectations.basicHookEvents.filter((event) => !events.has(event));
  const missingScripts = doctorExpectations.basicHookScripts.filter((script) => !scriptNames.has(script));
  const preToolBash = commands.some(({ event, matcher }) => event === 'PreToolUse' && /(^|\|)Bash(\||$)/.test(matcher));
  const checks = [{
    name: '基础 Hook',
    status: missingEvents.length || missingScripts.length || !preToolBash ? 'fail' : 'pass',
    detail: missingEvents.length || missingScripts.length || !preToolBash
      ? `missing events=[${missingEvents}] scripts=[${missingScripts}] Bash=${preToolBash}`
      : `${doctorExpectations.basicHookEvents.join(', ')} / ${doctorExpectations.basicHookScripts.join(', ')}`,
    fix: missingEvents.length || missingScripts.length || !preToolBash ? '使用 --with-hook 重新安装基础 Hook' : null,
  }];

  if (profile.modules.includes('advanced-hooks') || profile.overlays.includes('advanced-hooks')) {
    const missingAdvanced = doctorExpectations.advancedHookScripts.filter((script) => !scriptNames.has(script));
    checks.push({
      name: '高级 Hook',
      status: missingAdvanced.length ? 'fail' : 'pass',
      detail: missingAdvanced.length ? `缺失 ${missingAdvanced.join(', ')}` : `${missingAdvanced.length || doctorExpectations.advancedHookScripts.length} 个高级脚本已配置`,
      fix: missingAdvanced.length ? '按 advanced-hooks profile 补齐配置' : null,
    });
  } else {
    checks.push({ name: '高级 Hook', status: 'skip', detail: '当前 profile 未选择 advanced-hooks', fix: null });
  }

  const reqCheckPath = path.join(rootDir, 'scripts', 'req-check.js');
  if (existsSync(reqCheckPath)) {
    const result = spawnSync(process.execPath, [reqCheckPath], {
      input: JSON.stringify({ cwd: rootDir, tool_name: 'Bash', tool_input: { command: 'ls -la' } }),
      encoding: 'utf8',
    });
    checks.push(result.status === 0
      ? { name: 'req-check stdin 契约', status: 'pass', detail: '纯读 Bash 正确放行', fix: null }
      : { name: 'req-check stdin 契约', status: 'fail', detail: `exit ${result.status}`, fix: '检查 req-check stdin 入口' });
  }
  return checks;
}

function modeCheck(rootDir, profile) {
  if (!profile.modules.includes('hook')) return { name: 'Harness mode', status: 'skip', detail: '无 mode-aware Hook', fix: null };
  const mode = readHarnessMode(rootDir);
  return mode.valid
    ? { name: 'Harness mode', status: 'pass', detail: `${mode.mode}${mode.exists ? '' : '（默认）'}`, fix: null }
    : { name: 'Harness mode', status: 'warn', detail: `非法值 ${JSON.stringify(mode.raw)}，运行时回退 collaborative`, fix: '改为 collaborative / supervised / autonomous' };
}

function reqTemplateCheck(rootDir, profile) {
  if (!profile.modules.includes('core')) return { name: 'REQ 模板', status: 'skip', detail: 'core 未选择', fix: null };
  const content = readText(path.join(rootDir, 'requirements', 'REQ_TEMPLATE.md'));
  if (!content) return { name: 'REQ 模板', status: 'fail', detail: '模板缺失', fix: '重新安装 core' };
  const placeholders = ['说明为什么要做这件事。', '目标 1', '标准 1', '涉及目录 / 模块：'].filter((value) => content.includes(value));
  return placeholders.length > 2
    ? { name: 'REQ 模板', status: 'warn', detail: `仍含 ${placeholders.length} 个默认占位符`, fix: '按项目定制模板' }
    : { name: 'REQ 模板', status: 'pass', detail: '模板已定制', fix: null };
}

function contextChecks(rootDir, profile) {
  if (!profile.modules.includes('context')) return [{ name: 'Context 沉淀', status: 'skip', detail: 'context 未选择', fix: null }];
  const experienceDir = path.join(rootDir, 'context', 'experience');
  const invariantDir = path.join(rootDir, 'context', 'invariants');
  const experienceCount = existsSync(experienceDir)
    ? readdirSync(experienceDir).filter((file) => file.endsWith('.md') && !file.startsWith('README')).length : 0;
  const invariantFiles = existsSync(invariantDir)
    ? readdirSync(invariantDir).filter((file) => /^INV-.*\.md$/.test(file) && !file.includes('TEMPLATE')) : [];
  const active = invariantFiles.filter((file) => /^status:\s*active/m.test(readText(path.join(invariantDir, file)))).length;
  return [
    experienceCount > 0
      ? { name: 'Experience 目录', status: 'pass', detail: `${experienceCount} 篇`, fix: null }
      : { name: 'Experience 目录', status: 'warn', detail: '尚无经验文档', fix: '完成 REQ 后沉淀经验' },
    invariantFiles.length === 0 || active === 0
      ? { name: '不变量系统', status: 'warn', detail: `${invariantFiles.length} 条 / ${active} active`, fix: '审核并激活有价值不变量' }
      : { name: '不变量系统', status: 'pass', detail: `${invariantFiles.length} 条 / ${active} active`, fix: null },
  ];
}

function repositoryStateCheck(rootDir, profile) {
  if (!profile.modules.includes('core')) return { name: 'Repository state', status: 'skip', detail: 'core 未选择', fix: null };
  const state = buildRepositoryState(rootDir);
  const req = state.requirements;
  const inv = state.invariants;
  const status = req.invalid > 0 || inv.invalid > 0 ? 'fail'
    : (inv.duplicate_files > 0 ? 'warn' : 'pass');
  return {
    name: 'Repository state',
    status,
    detail: `REQ active=${req.active} draft=${req.draft} suspended=${req.suspended} examples=${req.examples}; invariants unique=${inv.unique} templates=${inv.templates} duplicates=${inv.duplicate_files}`,
    fix: status === 'fail' ? '修复非法 REQ/invariant 状态' : (status === 'warn' ? '审阅并去重 invariant source/id' : null),
  };
}

function summarize(checks) {
  const summary = { pass: 0, warn: 0, fail: 0, skip: 0 };
  for (const check of checks) summary[check.status] += 1;
  return summary;
}

export function runDoctor({ rootDir = process.cwd() } = {}) {
  const profile = resolveDoctorProfile(rootDir);
  const checks = [
    profileCheck(profile),
    capabilityFilesCheck(rootDir, profile),
    capabilityDriftCheck(rootDir, profile),
    ownershipCheck(rootDir, profile),
    packageScriptsCheck(rootDir, profile),
    modeCheck(rootDir, profile),
    ...hookChecks(rootDir, profile),
    reqTemplateCheck(rootDir, profile),
    repositoryStateCheck(rootDir, profile),
    ...contextChecks(rootDir, profile),
    {
      name: '不可强制边界（平台缺口）',
      status: 'pass',
      detail: 'subagent / claude -p 不触发 PreToolUse；任意解释器写不可封，需 OS/容器/CI 兜底',
      fix: null,
    },
  ];
  const summary = summarize(checks);
  return {
    profile: {
      id: profile.profile,
      source: profile.source,
      modules: profile.modules,
      overlays: profile.overlays,
      capabilities: profile.capabilities,
    },
    summary,
    checks,
    exitCode: summary.fail > 0 ? 1 : 0,
  };
}

function printText(report) {
  const icon = { pass: '✅', warn: '⚠️', fail: '❌', skip: '⏭️' };
  process.stderr.write(`\n🏥 Harness Lab 诊断报告\n\n`);
  process.stderr.write(`Profile: ${report.profile.id} (${report.profile.source})\n`);
  process.stderr.write(`Modules: ${report.profile.modules.join(', ') || 'none'}\n\n`);
  for (const check of report.checks) {
    process.stderr.write(`${icon[check.status]} ${check.name}\n   ${check.detail}\n`);
    if (check.fix) process.stderr.write(`   💡 修复: ${check.fix}\n`);
    process.stderr.write('\n');
  }
  process.stderr.write(`📊 ${report.summary.pass} 通过 | ${report.summary.warn} 警告 | ${report.summary.fail} 失败 | ${report.summary.skip} 跳过\n\n`);
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  const args = process.argv.slice(2);
  const unknown = args.find((arg) => arg !== '--json' && arg !== '--help' && arg !== '-h');
  if (unknown) {
    process.stderr.write(`Unknown option: ${unknown}\n`);
    process.exitCode = 1;
  } else if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Usage: harness-doctor [--json]\n');
  } else {
    const report = runDoctor();
    if (args.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else printText(report);
    process.exitCode = report.exitCode;
  }
}
