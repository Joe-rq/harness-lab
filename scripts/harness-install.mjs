#!/usr/bin/env node

/**
 * Harness Lab 安装脚本
 *
 * 将 harness-lab 治理框架接入到目标项目
 *
 * 用法:
 *   node harness-install.mjs                    # 交互模式
 *   node harness-install.mjs --defaults         # 使用默认选项
 *   node harness-install.mjs --core-only        # 仅安装核心模块
 *   node harness-install.mjs --with-hook        # 包含 PreToolUse hook
 *   node harness-install.mjs --source ./path    # 指定源目录
 *   node harness-install.mjs --package-dir app  # 绑定 app/package.json
 *   node harness-install.mjs --dry-run          # 只输出安装计划，不写文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI 颜色
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 模块定义
export const modules = {
  core: {
    name: '核心模块',
    required: true,
    files: [
      'AGENTS.md',
      'CLAUDE.md',
      'requirements/INDEX.md',
      'requirements/REQ_TEMPLATE.md',
      'requirements/in-progress/.gitkeep',
      'requirements/completed/README.md',
      'requirements/reports/README.md',
    ],
  },
  docs: {
    name: 'docs/ 目录',
    required: false,
    default: true,
    files: [
      'docs/plans/README.md',
      'docs/specs/README.md',
    ],
  },
  context: {
    name: 'context/ 目录',
    required: false,
    default: true,
    files: [
      'context/README.md',
      'context/business/.gitkeep',
      'context/tech/.gitkeep',
      'context/experience/.gitkeep',
    ],
  },
  skills: {
    name: 'skills/ 与 source-command skills',
    required: false,
    default: true,
    files: [
      'skills/README.md',
      'skills/review/code-review.md',
      'skills/qa/qa.md',
      'skills/ship/ship.md',
      'skills/plan/ceo-review.md',
      'skills/plan/design-review.md',
      'skills/plan/eng-review.md',
      '.agents/skills/source-command-bugfix/SKILL.md',
      '.agents/skills/source-command-feature/SKILL.md',
      '.agents/skills/source-command-first-req/SKILL.md',
      '.agents/skills/source-command-harness-setup/SKILL.md',
      '.agents/skills/source-command-refactor/SKILL.md',
      '.agents/skills/source-command-worktree-req/SKILL.md',
    ],
  },
  cli: {
    name: 'CLI 脚本',
    required: false,
    default: true,
    files: [
      'scripts/req-cli.mjs',
      'scripts/req-audit.mjs',
      'scripts/governance-health.mjs',
      'scripts/req-validation.mjs',
      'scripts/error-classifier.mjs',
      'scripts/event-store.mjs',
      'scripts/worktree-utils.mjs',
      'scripts/docs-verify.mjs',
      'scripts/check-governance.mjs',
      'scripts/docs-sync-rules.json',
      'scripts/template-guard.mjs',
    ],
    packageScripts: {
      'req:create': 'node scripts/req-cli.mjs create',
      'req:start': 'node scripts/req-cli.mjs start',
      'req:block': 'node scripts/req-cli.mjs block',
      'req:complete': 'node scripts/req-cli.mjs complete',
      'req:audit': 'node scripts/req-audit.mjs --all',
      'governance:health': 'node scripts/governance-health.mjs',
      'docs:verify': 'node scripts/docs-verify.mjs',
      'docs:impact': 'node scripts/docs-verify.mjs --impact-only',
      'docs:impact:json': 'node scripts/docs-verify.mjs --impact-only --format json',
      'check:governance': 'node scripts/check-governance.mjs',
    },
  },
  hook: {
    name: '治理 hooks',
    required: false,
    default: false,
    files: [
      '.claude/settings.example.json',
      'scripts/session-start.js',
      'scripts/req-check.js',
      'scripts/scope-guard.mjs',
      'scripts/event-store.mjs',
    ],
    hook: true,
  },
};

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function formatNpmPath(value) {
  const normalized = toPosixPath(value);
  return /\s/.test(normalized) ? `"${normalized}"` : normalized;
}

function isWithinDir(parentDir, childPath) {
  const relative = path.relative(parentDir, childPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveFromTarget(targetDir, inputPath) {
  return path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(targetDir, inputPath);
}

function governanceCommand(targetDir, packageDir, command) {
  const rootFromPackage = path.relative(packageDir, targetDir);
  if (!rootFromPackage) {
    return command;
  }

  return `cd ${formatNpmPath(rootFromPackage)} && ${command}`;
}

function buildTargetProjectScripts(targetDir, packageDir) {
  return {
    req: governanceCommand(targetDir, packageDir, 'node scripts/req-cli.mjs'),
    'req:create': governanceCommand(targetDir, packageDir, 'node scripts/req-cli.mjs create'),
    'req:start': governanceCommand(targetDir, packageDir, 'node scripts/req-cli.mjs start'),
    'req:block': governanceCommand(targetDir, packageDir, 'node scripts/req-cli.mjs block'),
    'req:complete': governanceCommand(targetDir, packageDir, 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.req-complete-status && node scripts/req-cli.mjs complete --status-file .claude/.req-complete-status'),
    'req:audit': governanceCommand(targetDir, packageDir, 'node scripts/req-audit.mjs --all'),
    'governance:health': governanceCommand(targetDir, packageDir, 'node scripts/governance-health.mjs'),
    'docs:verify': governanceCommand(targetDir, packageDir, 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.docs-verify-status && node scripts/docs-verify.mjs --status-file .claude/.docs-verify-status'),
    'docs:impact': governanceCommand(targetDir, packageDir, 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.docs-impact-status && node scripts/docs-verify.mjs --status-file .claude/.docs-impact-status --impact-only'),
    'docs:impact:json': governanceCommand(targetDir, packageDir, 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.docs-impact-json-status && node scripts/docs-verify.mjs --status-file .claude/.docs-impact-json-status --impact-only --format json'),
    'check:governance': governanceCommand(targetDir, packageDir, 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.check-governance-status && node scripts/check-governance.mjs --status-file .claude/.check-governance-status'),
  };
}

function guardScript(name, targetDir, packageDir) {
  return governanceCommand(targetDir, packageDir, `node scripts/template-guard.mjs ${name}`);
}

function isPlaceholderScript(command) {
  if (!command || typeof command !== 'string') {
    return false;
  }

  return (
    command.includes('template-guard.mjs ') ||
    command.includes('Harness Lab keeps') ||
    command.includes('template guard')
  );
}

function inferVerifyScript(scripts) {
  const realScripts = ['lint', 'test', 'build'].filter((name) => {
    const command = scripts[name];
    return typeof command === 'string' && command.trim() !== '' && !isPlaceholderScript(command);
  });

  if (realScripts.length === 0) {
    return null;
  }

  return realScripts.map((name) => `npm run ${name}`).join(' && ');
}

export function detectPackageJsonCandidates(targetDir) {
  const ignoredDirs = new Set([
    '.git',
    '.claude',
    '.agents',
    'node_modules',
    'requirements',
    'docs',
    'context',
    'scripts',
    'skills',
    'tests',
  ]);
  const candidates = [];

  const rootPackageJson = path.join(targetDir, 'package.json');
  if (fs.existsSync(rootPackageJson)) {
    candidates.push({ path: rootPackageJson, relPath: 'package.json' });
  }

  let entries = [];
  try {
    entries = fs.readdirSync(targetDir, { withFileTypes: true });
  } catch {
    return candidates;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || ignoredDirs.has(entry.name)) {
      continue;
    }

    const candidatePath = path.join(targetDir, entry.name, 'package.json');
    if (fs.existsSync(candidatePath)) {
      candidates.push({
        path: candidatePath,
        relPath: toPosixPath(path.relative(targetDir, candidatePath)),
      });
    }
  }

  return candidates;
}

export function resolvePackageJsonTarget(targetDir, options = {}) {
  const packageDir = options.packageDir || null;
  const packageJson = options.packageJson || null;

  if (packageDir && packageJson) {
    throw new Error('Use either --package-dir or --package-json, not both');
  }

  let packageJsonPath;
  let source = 'root';
  if (packageJson) {
    packageJsonPath = resolveFromTarget(targetDir, packageJson);
    source = 'package-json';
  } else if (packageDir) {
    packageJsonPath = path.join(resolveFromTarget(targetDir, packageDir), 'package.json');
    source = 'package-dir';
  } else {
    packageJsonPath = path.join(targetDir, 'package.json');
  }

  if (!isWithinDir(targetDir, packageJsonPath)) {
    throw new Error('The selected package.json must stay inside the target project');
  }

  const packageDirPath = path.dirname(packageJsonPath);
  const relPath = toPosixPath(path.relative(targetDir, packageJsonPath)) || 'package.json';
  const relDir = toPosixPath(path.relative(targetDir, packageDirPath)) || '.';

  return {
    path: packageJsonPath,
    relPath,
    packageDir: packageDirPath,
    packageDirRel: relDir,
    source,
    explicit: Boolean(packageDir || packageJson),
  };
}

export function updateTargetPackageJson(targetDir, options = {}) {
  const packageTarget = resolvePackageJsonTarget(targetDir, options);
  const packageJsonPath = packageTarget.path;
  const candidates = detectPackageJsonCandidates(targetDir)
    .filter((candidate) => candidate.relPath !== packageTarget.relPath);

  if (!fs.existsSync(packageJsonPath)) {
    return {
      updated: false,
      exists: false,
      path: null,
      requestedPath: packageTarget.relPath,
      packageDirRel: packageTarget.packageDirRel,
      source: packageTarget.source,
      explicit: packageTarget.explicit,
      candidates,
      bindingStatus: [],
      addedScripts: [],
      preservedScripts: [],
      generatedVerify: false,
    };
  }

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  } catch (error) {
    return {
      updated: false,
      exists: true,
      path: packageJsonPath,
      relPath: packageTarget.relPath,
      packageDirRel: packageTarget.packageDirRel,
      source: packageTarget.source,
      explicit: packageTarget.explicit,
      candidates,
      parseError: error.message,
      bindingStatus: [],
      addedScripts: [],
      preservedScripts: [],
      generatedVerify: false,
    };
  }

  if (!packageJson.scripts || typeof packageJson.scripts !== 'object' || Array.isArray(packageJson.scripts)) {
    packageJson.scripts = {};
  }

  const scripts = packageJson.scripts;
  const addedScripts = [];
  const preservedScripts = [];
  const bindingStatus = [];
  let generatedVerify = false;
  const targetProjectScripts = buildTargetProjectScripts(targetDir, packageTarget.packageDir);

  for (const name of ['lint', 'test', 'build']) {
    const current = scripts[name];
    if (typeof current === 'string' && current.trim() !== '' && !isPlaceholderScript(current)) {
      preservedScripts.push(name);
      bindingStatus.push({ name, status: 'preserved', command: current });
      continue;
    }

    const placeholder = guardScript(name, targetDir, packageTarget.packageDir);
    scripts[name] = placeholder;
    addedScripts.push(name);
    bindingStatus.push({
      name,
      status: current ? 'placeholder-refreshed' : 'placeholder-added',
      command: placeholder,
    });
  }

  const currentVerify = scripts.verify;
  if (typeof currentVerify === 'string' && currentVerify.trim() !== '' && !isPlaceholderScript(currentVerify)) {
    preservedScripts.push('verify');
    bindingStatus.push({ name: 'verify', status: 'preserved', command: currentVerify });
  } else {
    const inferredVerify = inferVerifyScript(scripts);
    if (inferredVerify) {
      scripts.verify = inferredVerify;
      addedScripts.push('verify');
      generatedVerify = true;
      bindingStatus.push({ name: 'verify', status: 'generated', command: inferredVerify });
    } else {
      const placeholder = guardScript('verify', targetDir, packageTarget.packageDir);
      scripts.verify = placeholder;
      addedScripts.push('verify');
      bindingStatus.push({
        name: 'verify',
        status: currentVerify ? 'placeholder-refreshed' : 'placeholder-added',
        command: placeholder,
      });
    }
  }

  for (const [name, command] of Object.entries(targetProjectScripts)) {
    if (typeof scripts[name] === 'string' && scripts[name].trim() !== '') {
      preservedScripts.push(name);
      continue;
    }

    scripts[name] = command;
    addedScripts.push(name);
  }

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  return {
    updated: true,
    exists: true,
    path: packageJsonPath,
    relPath: packageTarget.relPath,
    packageDirRel: packageTarget.packageDirRel,
    source: packageTarget.source,
    explicit: packageTarget.explicit,
    candidates,
    bindingStatus,
    addedScripts,
    preservedScripts,
    generatedVerify,
  };
}

// 检测 Git 仓库
export function isGitRepo(dir) {
  return fs.existsSync(path.join(dir, '.git'));
}

// 检测现有文件
export function detectExistingFiles(targetDir, selectedModules) {
  const existing = [];
  for (const [key, module] of Object.entries(modules)) {
    if (!selectedModules.includes(key)) continue;
    for (const file of module.files) {
      const targetPath = path.join(targetDir, file);
      if (fs.existsSync(targetPath)) {
        existing.push(file);
      }
    }
  }
  return existing;
}

// 清理框架自身的 REQ 数据
function isTemplateHistoryFile(targetDir, relPath) {
  const fullPath = path.join(targetDir, relPath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, 'utf-8');
  return (
    content.includes('Harness Lab 是一个 `研发治理层模板`') ||
    content.includes('模板加固') ||
    content.includes('example-status-filter') ||
    content.includes('suspended-example') ||
    content.includes('<!-- Harness Lab template history -->')
  );
}

export function sanitizeFrameworkData(targetDir, options = {}) {
  const cleanTemplateHistory = options.cleanTemplateHistory === true;
  const copiedFiles = new Set(options.copiedFiles || []);
  const results = {
    removed: [],
    reset: [],
    preserved: [],
  };

  // 1. 清理 completed/ 目录 - 删除所有 REQ-2026-00x 和 REQ-2026-01x 文件
  const completedDir = path.join(targetDir, 'requirements', 'completed');
  if (fs.existsSync(completedDir)) {
    const files = fs.readdirSync(completedDir);
    for (const file of files) {
      // 保留 .gitkeep 和 README.md
      if (file === '.gitkeep' || file === 'README.md') {
        continue;
      }
      if (/^REQ-2026-\d{3}/.test(file)) {
        const relPath = `requirements/completed/${file}`;
        if (cleanTemplateHistory && isTemplateHistoryFile(targetDir, relPath)) {
          fs.unlinkSync(path.join(completedDir, file));
          results.removed.push(`completed/${file}`);
        } else {
          results.preserved.push(`completed/${file}`);
        }
      }
    }
  }

  // 2. 清理 in-progress/ 目录 - 删除非示例 REQ
  const inProgressDir = path.join(targetDir, 'requirements', 'in-progress');
  if (fs.existsSync(inProgressDir)) {
    const files = fs.readdirSync(inProgressDir);
    for (const file of files) {
      // 保留 .gitkeep 和示例 REQ (900+ 编号)
      if (file === '.gitkeep') {
        continue;
      }
      if (/^REQ-2026-\d{3}/.test(file)) {
        const relPath = `requirements/in-progress/${file}`;
        if (cleanTemplateHistory && isTemplateHistoryFile(targetDir, relPath)) {
          fs.unlinkSync(path.join(inProgressDir, file));
          results.removed.push(`in-progress/${file}`);
        } else {
          results.preserved.push(`in-progress/${file}`);
        }
      }
    }
  }

  // 3. 清理 reports/ 目录 - 删除所有框架历史报告
  const reportsDir = path.join(targetDir, 'requirements', 'reports');
  if (fs.existsSync(reportsDir)) {
    const files = fs.readdirSync(reportsDir);
    for (const file of files) {
      // 保留 .gitkeep 和 README.md
      if (file === '.gitkeep' || file === 'README.md') {
        continue;
      }
      if (/^REQ-2026-\d{3}-/.test(file) || file === 'harness-setup-report.md') {
        const relPath = `requirements/reports/${file}`;
        if (cleanTemplateHistory && isTemplateHistoryFile(targetDir, relPath)) {
          fs.unlinkSync(path.join(reportsDir, file));
          results.removed.push(`reports/${file}`);
        } else {
          results.preserved.push(`reports/${file}`);
        }
      }
    }
  }

  // 4. 重置 INDEX.md - 清空"最近完成"列表
  const indexPath = path.join(targetDir, 'requirements', 'INDEX.md');
  if (fs.existsSync(indexPath) && (copiedFiles.has('requirements/INDEX.md') || cleanTemplateHistory)) {
    let content = fs.readFileSync(indexPath, 'utf-8');

    // 重置当前活跃 REQ 为无
    content = content.replace(
      /## 当前活跃 REQ\s*\n\s*- .*/,
      '## 当前活跃 REQ\n\n- 无'
    );

    // 重置当前搁置 REQ 为无
    content = content.replace(
      /## 当前搁置 REQ\s*\n\s*- .*/,
      '## 当前搁置 REQ\n\n- 无'
    );

    // 清空"最近完成 REQ"列表，替换为说明
    content = content.replace(
      /## 最近完成 REQ\s*\n(?:- `REQ-[^`]+`.*\n)*/,
      `## 最近完成 REQ\n\n> 新项目暂无已完成 REQ。随着项目推进，已完成的 REQ 将显示在这里。\n`
    );

    fs.writeFileSync(indexPath, content);
    results.reset.push('requirements/INDEX.md');
  }

  return results;
}

// 复制文件
export function copyFiles(sourceDir, targetDir, selectedModules, skipExisting = true, existingFiles = []) {
  const copied = [];
  const skipped = [];
  const failed = [];

  for (const [key, module] of Object.entries(modules)) {
    if (!selectedModules.includes(key)) continue;

    for (const file of module.files) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);

      // 检查是否需要跳过
      if (skipExisting && existingFiles.includes(file)) {
        skipped.push(file);
        continue;
      }

      // 创建目录
      const targetDirPath = path.dirname(targetPath);
      if (!fs.existsSync(targetDirPath)) {
        fs.mkdirSync(targetDirPath, { recursive: true });
      }

      // 复制文件
      try {
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          copied.push(file);
        } else {
          // 创建占位文件
          fs.writeFileSync(targetPath, `# ${path.basename(file)}\n\n> 此文件由 harness-install 创建\n`);
          copied.push(file + ' (created)');
        }
      } catch (err) {
        failed.push({ file, error: err.message });
      }
    }
  }

  return { copied, skipped, failed };
}

// 创建 progress.txt
export function createProgressTxt(targetDir) {
  const progressPath = path.join(targetDir, '.claude', 'progress.txt');
  const progressDir = path.dirname(progressPath);

  if (!fs.existsSync(progressDir)) {
    fs.mkdirSync(progressDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const content = `Current active REQ: none
Current phase: idle
Last updated: ${date}

Summary:
- Harness Lab 治理框架已接入

Next steps:
- 创建第一个 REQ: npm run req:create -- --title "Your first requirement"
- 补齐 REQ 的真实背景、目标、验收标准后再执行 req:start

Blockers:
- None.
`;

  fs.writeFileSync(progressPath, content);
  return progressPath;
}

// 检测当前平台
function getPlatform() {
  return process.platform;
}

// 判断是否为 Harness Lab 配置的 hook
function isHarnessHook(hook) {
  if (!hook || !hook.hooks || !Array.isArray(hook.hooks)) return false;
  return hook.hooks.some(h =>
      h.command && (
        h.command.includes('session-start') ||
        h.command.includes('req-check') ||
        h.command.includes('scope-guard')
      )
  );
}

// 检测是否为 Windows 平台
function isWindows() {
  return getPlatform() === 'win32';
}

// 配置 PreToolUse hook
export function configureHook(targetDir) {
  const settingsPath = path.join(targetDir, '.claude', 'settings.local.json');
  const settingsDir = path.dirname(settingsPath);

  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  // 使用跨平台 Node.js 脚本替代 bash 脚本
  const sessionStartCommand = isWindows()
    ? 'node "scripts/session-start.js"'
    : 'node "$(git rev-parse --show-toplevel)/scripts/session-start.js"';

  const reqCheckCommand = isWindows()
    ? 'node "scripts/req-check.js"'
    : 'node "$(git rev-parse --show-toplevel)/scripts/req-check.js"';

  const scopeGuardCommand = isWindows()
    ? 'node "scripts/scope-guard.mjs"'
    : 'node "$(git rev-parse --show-toplevel)/scripts/scope-guard.mjs"';

  const sessionStartHooks = [
    {
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: sessionStartCommand,
          timeout: 10,
        },
      ],
    },
  ];

  const preToolUseHooks = [
    {
      matcher: 'Write|Edit|NotebookEdit|Bash',
      hooks: [
        {
          type: 'command',
          command: reqCheckCommand,
          timeout: 10,
        },
        {
          type: 'command',
          command: scopeGuardCommand,
          timeout: 10,
        },
      ],
    },
  ];

  const requiredPermissions = [
    'Bash(git add:*)',
    'Bash(git commit:*)',
    'Bash(git push:*)',
    'Bash(git rev-parse:*)',
    'Bash(node scripts/session-start.js)',
    'Bash(node scripts/req-check.js)',
    'Bash(node scripts/scope-guard.mjs)',
    'Bash(npm run:*)',
  ];

  let settings = {};
  if (fs.existsSync(settingsPath)) {
    const existing = fs.readFileSync(settingsPath, 'utf-8');
    try {
      settings = JSON.parse(existing);
    } catch (e) {
      // 忽略解析错误
    }
  }

  if (!settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }

  // 深度合并 hooks：保留用户已有的同类型 hook，追加到数组中
  // SessionStart hooks 合并
  const existingSessionStart = Array.isArray(settings.hooks.SessionStart) ? settings.hooks.SessionStart : [];
  settings.hooks.SessionStart = [...existingSessionStart.filter(h => !isHarnessHook(h)), ...sessionStartHooks];

  // PreToolUse hooks 合并
  const existingPreToolUse = Array.isArray(settings.hooks.PreToolUse) ? settings.hooks.PreToolUse : [];
  settings.hooks.PreToolUse = [...existingPreToolUse.filter(h => !isHarnessHook(h)), ...preToolUseHooks];
  if (!settings.permissions || typeof settings.permissions !== 'object' || Array.isArray(settings.permissions)) {
    settings.permissions = {};
  }
  if (!Array.isArray(settings.permissions.allow)) {
    settings.permissions.allow = [];
  }
  settings.permissions.allow = [...new Set([...settings.permissions.allow, ...requiredPermissions])];

  delete settings.PreToolUse;
  delete settings.SessionStart;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  return settingsPath;
}

// 安装后验证
export function verifyInstallation(targetDir, selectedModules, hookEnabled, packageUpdate = null) {
  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  // 1. 验证核心文件存在
  const coreFiles = [
    'AGENTS.md',
    'CLAUDE.md',
    'requirements/INDEX.md',
    'requirements/REQ_TEMPLATE.md',
    '.claude/progress.txt',
  ];

  for (const file of coreFiles) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      results.passed.push(`Core file exists: ${file}`);
    } else {
      results.failed.push(`Missing core file: ${file}`);
    }
  }

  // 2. 验证 package.json 脚本
  const packageJsonPath = packageUpdate?.exists && packageUpdate.path
    ? packageUpdate.path
    : path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const scripts = packageJson.scripts || {};

      const requiredScripts = ['req:create', 'req:start', 'req:complete', 'req:audit', 'governance:health'];
      for (const script of requiredScripts) {
        if (scripts[script]) {
          results.passed.push(`Script configured: ${script}`);
        } else {
          results.warnings.push(`Script not configured: ${script}`);
        }
      }
    } catch (e) {
      results.warnings.push(`Could not verify package.json scripts: ${e.message}`);
    }
  }

  // 3. 验证 hook 配置
  if (hookEnabled) {
    const settingsPath = path.join(targetDir, '.claude', 'settings.local.json');
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.hooks?.SessionStart) {
          results.passed.push('Hook: SessionStart configured');
        } else {
          results.failed.push('Hook: SessionStart not configured');
        }
        if (settings.hooks?.PreToolUse) {
          results.passed.push('Hook: PreToolUse configured');
        } else {
          results.failed.push('Hook: PreToolUse not configured');
        }
      } catch (e) {
        results.failed.push(`Could not verify hook configuration: ${e.message}`);
      }
    } else {
      results.failed.push('Hook: settings.local.json not found');
    }

    // 4. 验证跨平台脚本存在
    const crossPlatformScripts = [
      'scripts/session-start.js',
      'scripts/req-check.js',
    ];
    for (const script of crossPlatformScripts) {
      const scriptPath = path.join(targetDir, script);
      if (fs.existsSync(scriptPath)) {
        results.passed.push(`Cross-platform script exists: ${script}`);
      } else {
        results.warnings.push(`Cross-platform script missing: ${script}`);
      }
    }
  }

  // 5. 验证 progress.txt 可读
  const progressPath = path.join(targetDir, '.claude', 'progress.txt');
  if (fs.existsSync(progressPath)) {
    try {
      const content = fs.readFileSync(progressPath, 'utf-8');
      if (content.includes('Current active REQ:') && content.includes('Current phase:')) {
        results.passed.push('Progress file is valid');
      } else {
        results.warnings.push('Progress file may be incomplete');
      }
    } catch (e) {
      results.warnings.push(`Could not read progress file: ${e.message}`);
    }
  }

  return results;
}

function packageRunPrefix(packageUpdate) {
  if (!packageUpdate?.exists || packageUpdate.parseError) {
    return null;
  }

  if (!packageUpdate.packageDirRel || packageUpdate.packageDirRel === '.') {
    return 'npm run';
  }

  return `npm --prefix ${formatNpmPath(packageUpdate.packageDirRel)} run`;
}

function reqCreateCommand(packageUpdate) {
  const runPrefix = packageRunPrefix(packageUpdate);
  if (runPrefix) {
    return `${runPrefix} req:create -- --title "Your first requirement"`;
  }

  return 'node scripts/req-cli.mjs create --title "Your first requirement"';
}

function reqStartCommand(packageUpdate) {
  const runPrefix = packageRunPrefix(packageUpdate);
  if (runPrefix) {
    return `${runPrefix} req:start -- --id REQ-YYYY-NNN --phase implementation`;
  }

  return 'node scripts/req-cli.mjs start --id REQ-YYYY-NNN --phase implementation';
}

function packageReviewStep(packageUpdate) {
  if (!packageUpdate?.exists || packageUpdate.parseError) {
    return '未绑定 package scripts；如需 npm scripts，请使用 `--package-dir` / `--package-json` 重新运行安装器。';
  }

  return `检查 \`${packageUpdate.relPath}\` 中自动绑定的命令，必要时替换 placeholder guard：`;
}

function formatPackageCandidates(packageUpdate) {
  const candidates = packageUpdate?.candidates || [];
  if (candidates.length === 0) {
    return '';
  }

  return `\n检测到可选 package：\n${candidates.map((candidate) => `- \`${candidate.relPath}\``).join('\n')}\n\n如需绑定其中一个 package，可重新运行：\n\n\`\`\`bash\nnode /path/to/harness-lab/scripts/harness-install.mjs --defaults --package-dir ${path.dirname(candidates[0].relPath)}\n\`\`\`\n`;
}

function formatPackageBindingStatus(packageUpdate) {
  if (!packageUpdate || !packageUpdate.exists) {
    const requestedPath = packageUpdate?.requestedPath || 'package.json';
    return `**目标 package**：\`${requestedPath}\`\n\n⚠️ 未绑定 package scripts：未检测到目标 \`package.json\`。\n${formatPackageCandidates(packageUpdate)}`;
  }

  if (packageUpdate.parseError) {
    return `**目标 package**：\`${packageUpdate.relPath}\`\n\n❌ 读取 \`package.json\` 失败：${packageUpdate.parseError}`;
  }

  const statusLines = packageUpdate.bindingStatus.length === 0
    ? 'ℹ️ 未修改标准命令绑定。'
    : packageUpdate.bindingStatus
        .map((item) => `- \`${item.name}\`：${item.status} -> \`${item.command}\``)
        .join('\n');

  const generatedVerify = packageUpdate.generatedVerify
    ? '\n已根据目标项目已有真实命令自动生成 `verify`。\n'
    : '';
  const placeholderNotice = packageUpdate.bindingStatus.some((item) => item.status.startsWith('placeholder'))
    ? '\n仍有 placeholder guard，说明这些命令需要目标项目后续替换为真实链路。\n'
    : '';
  const packageDirNotice = packageUpdate.packageDirRel && packageUpdate.packageDirRel !== '.'
    ? `\n注意：治理文件安装在当前 Git 项目根目录，只有 npm scripts 绑定到了 \`${packageUpdate.relPath}\`。\n`
    : '';

  return `**目标 package**：\`${packageUpdate.relPath}\`\n\n${statusLines}\n${generatedVerify}${placeholderNotice}${packageDirNotice}`;
}

function formatCapabilityGaps(selectedModules, packageUpdate) {
  const gaps = [];

  if (!selectedModules.includes('hook')) {
    gaps.push('- 治理 hooks 未安装：默认安装不启用硬阻断；需要时使用 `--with-hook`。');
  }

  if (!packageUpdate?.exists || packageUpdate.parseError) {
    gaps.push('- package scripts 未绑定：当前只能直接运行 `node scripts/req-cli.mjs ...`，或指定 `--package-dir` / `--package-json` 后重新安装。');
  }

  gaps.push('- 高级治理脚本未安装：`watchdog`、`risk-tracker`、`auto-review` 等不属于默认迁移模块，需后续按需迁移。');
  gaps.push('- 测试、CI、`.claude/commands/` 不属于默认安装清单；默认安装是治理引导，不是完整镜像。');

  return gaps.join('\n');
}

// 生成接入报告
export function generateReport(targetDir, selectedModules, results, hookEnabled, packageUpdate = null, verifyResults = null) {
  const reportDir = path.join(targetDir, 'requirements', 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const reportPath = path.join(reportDir, 'harness-setup-report.md');

  const moduleList = Object.entries(modules)
    .filter(([key]) => selectedModules.includes(key))
    .map(([key, mod]) => `- [x] ${mod.name}`)
    .join('\n');

  const notInstalled = Object.entries(modules)
    .filter(([key]) => !selectedModules.includes(key))
    .map(([key, mod]) => `- [ ] ${mod.name}`)
    .join('\n');

  const content = `# Harness Lab 接入报告

**日期**：${date}
**安装方式**：CLI 脚本

## 已安装模块

${moduleList}

${notInstalled ? `## 未安装模块\n\n${notInstalled}\n` : ''}

## 文件清单

### 已复制 (${results.copied.length} 个文件)

${results.copied.map(f => `- ${f}`).join('\n')}

${results.skipped.length > 0 ? `### 已跳过 (${results.skipped.length} 个文件)\n\n${results.skipped.map(f => `- ${f}`).join('\n')}\n` : ''}

${results.failed.length > 0 ? `### 失败 (${results.failed.length} 个文件)\n\n${results.failed.map(f => `- ${f.file}: ${f.error}`).join('\n')}\n` : ''}

## PreToolUse Hook

${hookEnabled ? '✅ 已配置（SessionStart + PreToolUse command hooks，PreToolUse 为 REQ 状态与 scope 硬阻断）' : '❌ 未配置'}

## 命令绑定状态

${formatPackageBindingStatus(packageUpdate)}

## 能力差距与未安装项说明

${formatCapabilityGaps(selectedModules, packageUpdate)}

${verifyResults ? `## 安装验证结果

${verifyResults.failed.length > 0 ? `### ❌ 失败 (${verifyResults.failed.length} 项)

${verifyResults.failed.map(item => `- ${item}`).join('\n')}

` : ''}${verifyResults.warnings.length > 0 ? `### ⚠️ 警告 (${verifyResults.warnings.length} 项)

${verifyResults.warnings.map(item => `- ${item}`).join('\n')}

` : ''}${verifyResults.passed.length > 0 ? `### ✅ 通过 (${verifyResults.passed.length} 项)

${verifyResults.passed.slice(0, 10).map(item => `- ${item}`).join('\n')}${verifyResults.passed.length > 10 ? `\n- ... 还有 ${verifyResults.passed.length - 10} 项通过` : ''}

` : ''}` : ''}

## 后续步骤

1. ${packageReviewStep(packageUpdate)}
   \`\`\`json
   {
     "scripts": {
       "lint": "eslint .",
       "test": "vitest run",
       "build": "next build",
       "verify": "npm run lint && npm run test && npm run build"
     }
   }
   \`\`\`

2. 创建第一个 REQ：
   \`\`\`bash
   ${reqCreateCommand(packageUpdate)}
   \`\`\`

3. 补齐 REQ 的真实背景、目标、验收标准，再执行：
   \`\`\`bash
   ${reqStartCommand(packageUpdate)}
   \`\`\`

4. 开始使用治理流程

## 注意事项

- 如果选择了 PreToolUse hook，无活跃 REQ、空模板 REQ、draft REQ 或 REQ scope 越界都会阻断 Write/Edit
- \`req:create\` 只会生成骨架，不代表 REQ 已经可以直接实施
- 可以使用 \`.claude/.req-exempt\` 临时豁免检查
- 自动绑定只会复用目标项目已存在的标准脚本名，不会猜测非标准脚本语义
- \`--package-dir\` / \`--package-json\` 只改变 package scripts 绑定位置，不改变治理文件安装位置
`;

  fs.writeFileSync(reportPath, content);
  return reportPath;
}

// 交互式输入
export async function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function getArgValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }

  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }

  return value;
}

// 主函数
export async function main() {
  const args = process.argv.slice(2);
  const options = {
    defaults: args.includes('--defaults'),
    coreOnly: args.includes('--core-only'),
    withHook: args.includes('--with-hook'),
    source: null,
    packageDir: null,
    packageJson: null,
    dryRun: args.includes('--dry-run'),
    cleanTemplateHistory: args.includes('--clean-template-history'),
  };

  // 解析 --source 参数
  options.source = getArgValue(args, '--source');
  options.packageDir = getArgValue(args, '--package-dir');
  options.packageJson = getArgValue(args, '--package-json');

  const targetDir = process.cwd();
  const sourceDir = options.source || path.resolve(__dirname, '..');

  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('  Harness Lab 安装向导', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  // 检测 Git 仓库
  if (!isGitRepo(targetDir)) {
    log('❌ 错误：当前目录不是 Git 仓库', 'red');
    log('   请先运行 git init 初始化仓库\n', 'yellow');
    process.exit(1);
  }

  log(`📁 目标目录: ${targetDir}`, 'blue');
  log(`📦 源目录: ${sourceDir}\n`, 'blue');
  if (options.dryRun) {
    log('🧪 Dry run: 只输出安装计划，不写入文件\n', 'yellow');
  }

  // 确定要安装的模块
  let selectedModules = ['core'];
  let hookEnabled = false;

  if (options.coreOnly) {
    log('📦 仅安装核心模块\n', 'yellow');
  } else if (options.defaults) {
    log('📦 使用默认选项\n', 'yellow');
    selectedModules = ['core', 'docs', 'context', 'skills', 'cli'];
    if (options.withHook) {
      selectedModules.push('hook');
      hookEnabled = true;
    }
  } else {
    // 交互模式
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    log('请选择要安装的模块：\n', 'cyan');

    for (const [key, mod] of Object.entries(modules)) {
      if (key === 'hook') {
        continue;
      }

      if (mod.required) {
        log(`  [x] ${mod.name} (必须)`, 'green');
        continue;
      }

      const defaultVal = mod.default ? 'Y' : 'N';
      const answer = await question(rl, `  安装 ${mod.name}? [${defaultVal}/n] `);

      if (answer.toLowerCase() === 'n') {
        log(`  [ ] ${mod.name}`, 'yellow');
      } else {
        selectedModules.push(key);
        log(`  [x] ${mod.name}`, 'green');
      }
    }

    // 询问 hook
    const hookAnswer = await question(rl, '\n  安装治理 hooks（settings.example + SessionStart/PreToolUse）? [y/N] ');
    hookEnabled = hookAnswer.toLowerCase() === 'y';
    if (hookEnabled) {
      selectedModules.push('hook');
      if (!selectedModules.includes('cli')) {
        selectedModules.push('cli');
        log('  [x] CLI 脚本（治理 hooks 依赖 req-check / req-validation）', 'green');
      }
    }
    log(hookEnabled ? '  [x] 治理 hooks' : '  [ ] 治理 hooks', hookEnabled ? 'green' : 'yellow');

    rl.close();
  }

  // 检测现有文件
  log('\n🔍 检测现有文件...', 'blue');
  const existingFiles = detectExistingFiles(targetDir, selectedModules);

  if (existingFiles.length > 0) {
    log(`\n⚠️  检测到 ${existingFiles.length} 个文件已存在：`, 'yellow');
    existingFiles.slice(0, 5).forEach(f => log(`   - ${f}`));
    if (existingFiles.length > 5) {
      log(`   ... 还有 ${existingFiles.length - 5} 个文件`);
    }
    log('\n   将跳过这些文件，避免覆盖。\n', 'yellow');
  }

  if (options.dryRun) {
    const plannedFiles = selectedModules.flatMap((key) => modules[key].files);
    const plannedCopy = plannedFiles.filter((file) => !existingFiles.includes(file));
    const plannedSkip = plannedFiles.filter((file) => existingFiles.includes(file));
    log('📋 安装计划:', 'cyan');
    log(`   将复制: ${plannedCopy.length} 个文件`);
    plannedCopy.slice(0, 10).forEach((file) => log(`   + ${file}`));
    if (plannedCopy.length > 10) log(`   ... 还有 ${plannedCopy.length - 10} 个文件`);
    log(`   将跳过: ${plannedSkip.length} 个已有文件`);
    if (plannedSkip.length > 0) plannedSkip.slice(0, 10).forEach((file) => log(`   = ${file}`));
    log(`   模板历史清理: ${options.cleanTemplateHistory ? '显式启用（仅 marker 匹配）' : '禁用'}`);
    log('   package scripts: 将按 git-status-backed 命令绑定（dry-run 未写入）');
    return;
  }

  // 复制文件
  log('📦 复制文件...', 'blue');
  const results = copyFiles(sourceDir, targetDir, selectedModules, true, existingFiles);

  log(`   ✅ 已复制: ${results.copied.length} 个文件`, 'green');
  if (results.skipped.length > 0) {
    log(`   ⏭️  已跳过: ${results.skipped.length} 个文件`, 'yellow');
  }
  if (results.failed.length > 0) {
    log(`   ❌ 失败: ${results.failed.length} 个文件`, 'red');
  }

  // 清理框架自身数据
  log('\n🧹 清理框架数据...', 'blue');
  const sanitizeResults = sanitizeFrameworkData(targetDir, {
    cleanTemplateHistory: options.cleanTemplateHistory,
    copiedFiles: results.copied,
  });
  if (sanitizeResults.removed.length > 0) {
    log(`   ✅ 已移除: ${sanitizeResults.removed.length} 个框架文件`, 'green');
  }
  if (sanitizeResults.preserved.length > 0) {
    log(`   ℹ️  保留示例: ${sanitizeResults.preserved.length} 个文件`, 'blue');
  }
  if (sanitizeResults.reset.length > 0) {
    log(`   ✅ 已重置: ${sanitizeResults.reset.join(', ' )}`, 'green');
  }

  // 创建 progress.txt
  log('\n📝 创建 progress.txt...', 'blue');
  createProgressTxt(targetDir);
  log('   ✅ 已创建', 'green');

  // 配置 hook
  if (hookEnabled || selectedModules.includes('hook')) {
    log('\n⚙️  配置 PreToolUse hook...', 'blue');
    configureHook(targetDir);
    hookEnabled = true;
    log('   ✅ 已配置', 'green');
  }

  const packageUpdate = updateTargetPackageJson(targetDir, {
    packageDir: options.packageDir,
    packageJson: options.packageJson,
  });

  // 安装后验证
  log('\n🔍 安装后验证...', 'blue');
  const verifyResults = verifyInstallation(targetDir, selectedModules, hookEnabled, packageUpdate);
  log(`   ✅ 通过: ${verifyResults.passed.length} 项`, 'green');
  if (verifyResults.warnings.length > 0) {
    log(`   ⚠️  警告: ${verifyResults.warnings.length} 项`, 'yellow');
  }
  if (verifyResults.failed.length > 0) {
    log(`   ❌ 失败: ${verifyResults.failed.length} 项`, 'red');
  }

  // 生成报告
  log('\n📄 生成接入报告...', 'blue');
  const reportPath = generateReport(targetDir, selectedModules, results, hookEnabled, packageUpdate, verifyResults);
  log(`   ✅ ${path.relative(targetDir, reportPath)}`, 'green');

  // 完成
  log('\n═══════════════════════════════════════════════════════════', 'green');
  log('  ✅ Harness Lab 安装完成！', 'green');
  log('═══════════════════════════════════════════════════════════\n', 'green');

  log('📚 后续步骤：\n');
  if (!packageUpdate.exists || packageUpdate.parseError) {
    log('   1. 未绑定 package scripts；可直接使用 node scripts/req-cli.mjs，或用 --package-dir/--package-json 重新绑定');
  } else {
    log(`   1. 检查 ${packageUpdate.relPath} 中自动绑定的命令，必要时替换 placeholder guard`);
  }
  log(`   2. 创建第一个 REQ: ${reqCreateCommand(packageUpdate)}`);
  log(`   3. 补齐 REQ 内容后再执行: ${reqStartCommand(packageUpdate)}`);
  log('   4. 查看接入报告: requirements/reports/harness-setup-report.md\n');
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMainModule) {
  main().catch((err) => {
    log(`\n❌ 安装失败: ${err.message}`, 'red');
    process.exit(1);
  });
}
