#!/usr/bin/env node

/**
 * Stop Hook: 防止 AI 假完成
 *
 * 当 AI 试图停止时，交叉检查 REQ 验收标准 vs git diff。
 * 未覆盖的验收标准 → collaborative 提醒 / supervised 阻断
 *
 * 输出格式：
 *   - 放行: exit 0, 无输出
 *   - 阻断: exit 0, { "decision": "block", "reason": "..." }
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    return process.cwd();
  }
}

function getHarnessMode(rootDir) {
  const modeFile = path.join(rootDir, '.claude', 'harness-mode');
  try {
    return fs.readFileSync(modeFile, 'utf-8').trim() || 'collaborative';
  } catch {
    return 'collaborative';
  }
}

function getActiveReqId(rootDir) {
  const progress = path.join(rootDir, '.claude', 'progress.txt');
  try {
    const content = fs.readFileSync(progress, 'utf-8');
    const match = content.match(/^Current active REQ:\s*(.+)/m);
    const val = match ? match[1].trim() : '';
    if (!val || val === 'none' || val === '无') return null;
    return val;
  } catch {
    return null;
  }
}

function findReqFile(rootDir, reqId) {
  const dirs = ['in-progress'];
  for (const dir of dirs) {
    const reqDir = path.join(rootDir, 'requirements', dir);
    if (!fs.existsSync(reqDir)) continue;
    const files = fs.readdirSync(reqDir);
    const match = files.find(f => f.startsWith(reqId) && f.endsWith('.md'));
    if (match) return path.join(reqDir, match);
  }
  return null;
}

function extractAcceptanceCriteria(reqContent) {
  const criteria = [];
  let inSection = false;
  for (const line of reqContent.split('\n')) {
    if (/^##\s*验收标准/.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^##\s/.test(line)) break;
    if (inSection) {
      const item = line.replace(/^- \[[ x]\]\s*/, '').trim();
      if (item) criteria.push(item);
    }
  }
  return criteria;
}

function getGitDiffFiles(rootDir) {
  try {
    const diff = execSync('git diff --name-only HEAD', {
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (!diff) return [];
    return diff.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  let event;
  try {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    event = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    // No valid input, allow stop
    return;
  }

  const rootDir = event.cwd ? event.cwd.replace(/\/+$/, '') : getGitRoot();

  // 1. 检查是否有活跃 REQ
  const reqId = getActiveReqId(rootDir);
  if (!reqId) return; // 无活跃 REQ，放行

  // 2. 检查是否有未提交的改动
  const changedFiles = getGitDiffFiles(rootDir);
  if (changedFiles.length === 0) return; // 无改动，放行（可能是纯对话）

  // 3. 读取 REQ 验收标准
  const reqFile = findReqFile(rootDir, reqId);
  if (!reqFile) return; // 找不到 REQ 文件，放行

  let reqContent;
  try {
    reqContent = fs.readFileSync(reqFile, 'utf-8');
  } catch {
    return;
  }

  const criteria = extractAcceptanceCriteria(reqContent);
  if (criteria.length === 0) return; // 无验收标准，放行

  // 4. 简单交叉检查：验收标准是否有对应的文件改动
  //    启发式：检查验收标准中的关键词是否出现在改动文件路径中
  const diffText = (() => {
    try {
      return execSync('git diff HEAD', {
        encoding: 'utf-8',
        cwd: rootDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024
      });
    } catch {
      return '';
    }
  })();

  // 找出可能未覆盖的验收标准
  const uncovered = [];
  for (const c of criteria) {
    // 验收标准中提到的文件名或关键词是否出现在 diff 中
    const keywords = c.split(/[\s,，、()（）\[\]【】]/)
      .filter(w => w.length >= 3)
      .map(w => w.toLowerCase());

    const hasMatch = keywords.some(kw =>
      diffText.toLowerCase().includes(kw) ||
      changedFiles.some(f => f.toLowerCase().includes(kw))
    );

    if (!hasMatch) {
      uncovered.push(c);
    }
  }

  if (uncovered.length === 0) return; // 全部覆盖，放行

  // 5. 根据模式输出
  const mode = getHarnessMode(rootDir);
  const uncoveredList = uncovered.map((c, i) => `${i + 1}. ${c}`).join('\n');

  if (mode === 'supervised' || mode === 'autonomous') {
    // supervised 和 autonomous 模式：阻断（安全边界）
    console.log(JSON.stringify({
      decision: 'block',
      reason: `[StopEvaluator] 以下验收标准可能未覆盖：\n${uncoveredList}\n\n请继续工作覆盖这些标准，或在 REQ 中标记为已完成。`
    }));
  } else {
    // collaborative 模式：提醒不阻断
    console.log(JSON.stringify({
      decision: 'allow',
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext: `[StopEvaluator] 💡 提醒：以下验收标准可能未覆盖：\n${uncoveredList}\n\n如果确实已完成，可以继续停止。`
      }
    }));
  }
}

main();
