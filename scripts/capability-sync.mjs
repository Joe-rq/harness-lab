#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPublishedFiles } from './capability-manifest.mjs';

export function comparePublishedFiles(actualFiles, expectedFiles = getPublishedFiles()) {
  const actual = Array.isArray(actualFiles) ? actualFiles : [];
  return {
    ok: actual.length === expectedFiles.length && actual.every((file, index) => file === expectedFiles[index]),
    missing: expectedFiles.filter((file) => !actual.includes(file)),
    extra: actual.filter((file) => !expectedFiles.includes(file)),
    orderMismatch: actual.length === expectedFiles.length &&
      actual.every((file) => expectedFiles.includes(file)) &&
      actual.some((file, index) => file !== expectedFiles[index]),
    expected: expectedFiles,
  };
}

export function syncCapabilityPackage({ rootDir = process.cwd(), write = false } = {}) {
  const packagePath = path.join(rootDir, 'package.json');
  if (!existsSync(packagePath)) throw new Error(`package.json not found: ${packagePath}`);
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const comparison = comparePublishedFiles(packageJson.files);
  if (comparison.ok) return { ...comparison, changed: false, packagePath };

  if (write) {
    packageJson.files = comparison.expected;
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
    return { ...comparison, ok: true, changed: true, packagePath };
  }
  return { ...comparison, changed: false, packagePath };
}

function formatDifference(result) {
  const lines = ['Capability publication manifest is out of sync with package.json files.'];
  if (result.missing.length > 0) lines.push(`Missing: ${result.missing.join(', ')}`);
  if (result.extra.length > 0) lines.push(`Extra: ${result.extra.join(', ')}`);
  if (result.orderMismatch) lines.push('Order differs from the deterministic manifest order.');
  lines.push('Run: npm run capabilities:sync');
  return lines.join('\n');
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  const args = process.argv.slice(2);
  const allowed = new Set(['--check', '--write', '--help', '-h']);
  const unknown = args.find((arg) => !allowed.has(arg));
  if (unknown) {
    process.stderr.write(`Unknown option: ${unknown}\n`);
    process.exitCode = 1;
  } else if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Usage: capability-sync [--check|--write]\n');
  } else {
    try {
      const write = args.includes('--write');
      const result = syncCapabilityPackage({ write });
      if (!result.ok) {
        process.stderr.write(`${formatDifference(result)}\n`);
        process.exitCode = 1;
      } else {
        process.stdout.write(result.changed
          ? `Updated ${path.relative(process.cwd(), result.packagePath)} files from capability manifest.\n`
          : 'Capability publication manifest is in sync.\n');
      }
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
