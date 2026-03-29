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
      'context/business/README.md',
      'context/business/product-overview.md',
      'context/tech/README.md',
      'context/tech/architecture.md',
      'context/tech/tech-stack.md',
      'context/tech/testing-strategy.md',
      'context/tech/env-contract.md',
      'context/tech/deployment-runbook.md',
      'context/experience/README.md',
    ],
  },
  skills: {
    name: 'skills/ 目录',
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
    ],
  },
  cli: {
    name: 'CLI 脚本',
    required: false,
    default: true,
    files: [
      'scripts/req-cli.mjs',
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
      'scripts/session-start.sh',
    ],
    hook: true,
  },
};

const targetProjectScripts = {
  req: 'node scripts/req-cli.mjs',
  'req:create': 'node scripts/req-cli.mjs create',
  'req:start': 'node scripts/req-cli.mjs start',
  'req:block': 'node scripts/req-cli.mjs block',
  'req:complete': 'node scripts/req-cli.mjs complete',
  'docs:verify': 'node scripts/docs-verify.mjs',
  'docs:impact': 'node scripts/docs-verify.mjs --impact-only',
  'docs:impact:json': 'node scripts/docs-verify.mjs --impact-only --format json',
  'check:governance': 'node scripts/check-governance.mjs',
};

function guardScript(name) {
  return `node scripts/template-guard.mjs ${name}`;
}

function isPlaceholderScript(command) {
  if (!command || typeof command !== 'string') {
    return false;
  }

  return (
    command.startsWith('node scripts/template-guard.mjs ') ||
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

export function updateTargetPackageJson(targetDir) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return {
      updated: false,
      exists: false,
      path: null,
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

  for (const name of ['lint', 'test', 'build']) {
    const current = scripts[name];
    if (typeof current === 'string' && current.trim() !== '' && !isPlaceholderScript(current)) {
      preservedScripts.push(name);
      bindingStatus.push({ name, status: 'preserved', command: current });
      continue;
    }

    const placeholder = guardScript(name);
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
      const placeholder = guardScript('verify');
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

Blockers:
- None.
`;

  fs.writeFileSync(progressPath, content);
  return progressPath;
}

// 配置 PreToolUse hook
export function configureHook(targetDir) {
  const settingsPath = path.join(targetDir, '.claude', 'settings.local.json');
  const settingsDir = path.dirname(settingsPath);

  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  const hookConfig = [
    {
      matcher: "Write|Edit",
      hooks: [
        {
          type: "prompt",
          prompt: `REQ ENFORCEMENT CHECK

在执行 Write/Edit 操作前，检查是否需要 REQ：

## 检查步骤

1. 读取 requirements/INDEX.md 确认当前活跃 REQ
2. 判断本次改动是否需要 REQ：
   | 改动类型 | 需要 REQ |
   |----------|----------|
   | 3+ 文件改动 | ✅ 是 |
   | 新功能开发 | ✅ 是 |
   | 架构/流程变更 | ✅ 是 |
   | 单文件小改动 | ❌ 否 |
   | typo/小 bug 修复 | ❌ 否 |

3. 如果需要 REQ 但没有活跃 REQ：
   输出警告，建议创建 REQ，然后返回 'approve'

4. 如果不需要 REQ 或有活跃 REQ：
   静默返回 'approve'

## 豁免机制

如果存在 .claude/.req-exempt 文件，跳过检查。

返回 'approve' 继续操作。`
        }
      ]
    }
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

  settings.hooks.PreToolUse = hookConfig;
  delete settings.PreToolUse;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

  return settingsPath;
}

// 生成接入报告
export function generateReport(targetDir, selectedModules, results, hookEnabled, packageUpdate = null) {
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

${hookEnabled ? '✅ 已配置' : '❌ 未配置'}

## 命令绑定状态

${!packageUpdate || !packageUpdate.exists
    ? '⚠️ 未检测到 `package.json`，未自动绑定 `lint / test / build / verify`。'
    : packageUpdate.parseError
      ? `❌ 读取 \`package.json\` 失败：${packageUpdate.parseError}`
      : packageUpdate.bindingStatus.length === 0
        ? 'ℹ️ 未修改标准命令绑定。'
        : packageUpdate.bindingStatus
            .map((item) => `- \`${item.name}\`：${item.status} -> \`${item.command}\``)
            .join('\n')}

${packageUpdate && packageUpdate.exists && !packageUpdate.parseError
    ? `${packageUpdate.generatedVerify ? '\n已根据目标项目已有真实命令自动生成 `verify`。\n' : ''}${
        packageUpdate.bindingStatus.some((item) => item.status.startsWith('placeholder'))
          ? '\n仍有 placeholder guard，说明这些命令需要目标项目后续替换为真实链路。\n'
          : ''
      }`
    : ''}

## 后续步骤

1. 检查 \`package.json\` 中自动绑定的命令，必要时替换 placeholder guard：
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
   npm run req:create -- --title "Your first requirement"
   \`\`\`

3. 开始使用治理流程

## 注意事项

- 如果选择了 PreToolUse hook，每次修改文件前会检查 REQ 状态
- 小改动（<3 个文件）不会触发警告
- 可以使用 \`.claude/.req-exempt\` 临时豁免检查
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

// 主函数
export async function main() {
  const args = process.argv.slice(2);
  const options = {
    defaults: args.includes('--defaults'),
    coreOnly: args.includes('--core-only'),
    withHook: args.includes('--with-hook'),
    source: null,
  };

  // 解析 --source 参数
  const sourceIndex = args.indexOf('--source');
  if (sourceIndex !== -1 && args[sourceIndex + 1]) {
    options.source = args[sourceIndex + 1];
  }

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

  const packageUpdate = updateTargetPackageJson(targetDir);

  // 生成报告
  log('\n📄 生成接入报告...', 'blue');
  const reportPath = generateReport(targetDir, selectedModules, results, hookEnabled, packageUpdate);
  log(`   ✅ ${path.relative(targetDir, reportPath)}`, 'green');

  // 完成
  log('\n═══════════════════════════════════════════════════════════', 'green');
  log('  ✅ Harness Lab 安装完成！', 'green');
  log('═══════════════════════════════════════════════════════════\n', 'green');

  log('📚 后续步骤：\n');
  log('   1. 在 package.json 中绑定真实命令 (lint, test, build)');
  log('   2. 创建第一个 REQ: npm run req:create -- --title "..."');
  log('   3. 查看接入报告: requirements/reports/harness-setup-report.md\n');
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMainModule) {
  main().catch((err) => {
    log(`\n❌ 安装失败: ${err.message}`, 'red');
    process.exit(1);
  });
}
