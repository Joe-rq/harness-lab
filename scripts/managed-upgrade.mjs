import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  capabilityManifest,
  getCapabilitiesForModules,
  modules,
  resolveInstallProfile,
  resolveModuleClosure,
} from './capability-manifest.mjs';
import { resolveDoctorProfile } from './harness-doctor.mjs';

export const OWNERSHIP_PATH = '.harness/ownership.json';
export const UPGRADE_REPORT_JSON_PATH = '.harness/upgrade-report.json';
export const UPGRADE_REPORT_MD_PATH = 'requirements/reports/harness-upgrade-report.md';
const PROFILE_PATH = '.harness/profile.json';
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const BACKUP_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function assertSafeRelativePath(value, label = 'path') {
  if (
    typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\') ||
    value.startsWith('/') || /^[A-Za-z]:\//.test(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  ) throw new Error(`${label} must be a safe repository-relative POSIX path: ${String(value)}`);
  return value;
}

function isWithin(rootDir, candidate) {
  const relative = path.relative(rootDir, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertNoSymlinkPath(rootDir, relPath, { allowMissing = true } = {}) {
  assertSafeRelativePath(relPath);
  const absoluteRoot = fs.realpathSync(rootDir);
  let current = rootDir;
  for (const part of relPath.split('/')) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) {
      if (!allowMissing) throw new Error(`Required file is missing: ${relPath}`);
      continue;
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Managed path may not traverse a symbolic link: ${relPath}`);
    const resolved = fs.realpathSync(current);
    if (!isWithin(absoluteRoot, resolved)) throw new Error(`Managed path resolves outside target: ${relPath}`);
  }
  return path.join(rootDir, ...relPath.split('/'));
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

export function readSourceVersion(sourceDir) {
  const packagePath = path.join(sourceDir, 'package.json');
  let value;
  try { value = JSON.parse(fs.readFileSync(packagePath, 'utf8')); } catch (error) {
    throw new Error(`Cannot read source package version: ${error.message}`);
  }
  if (typeof value?.version !== 'string' || !value.version.trim()) {
    throw new Error('Source package.json has no valid version');
  }
  return value.version.trim();
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right)));
}

function atomicWrite(filePath, content, mode = 0o644) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.harness-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
  try {
    fs.writeFileSync(tempPath, content, { mode });
    try {
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      if (!['EEXIST', 'EPERM'].includes(error.code)) throw error;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
    }
    fs.chmodSync(filePath, mode & 0o777);
  } finally {
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true });
  }
}

function writeJsonAtomic(filePath, value) {
  atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function validateOwnershipRecord(record) {
  const issues = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return ['record must be an object'];
  if (record.schemaVersion !== 1) issues.push('unsupported ownership schemaVersion');
  if (
    !Number.isInteger(record.manifestSchemaVersion) || record.manifestSchemaVersion < 1 ||
    record.manifestSchemaVersion > capabilityManifest.schemaVersion
  ) issues.push('unsupported future or invalid manifest schema version');
  if (!['core', 'default', 'custom'].includes(record.profile)) issues.push('unknown ownership profile');
  if (typeof record.lastAttemptedVersion !== 'string' || !record.lastAttemptedVersion) issues.push('missing lastAttemptedVersion');
  if (record.lastCompleteVersion !== null && (typeof record.lastCompleteVersion !== 'string' || !record.lastCompleteVersion)) {
    issues.push('invalid lastCompleteVersion');
  }
  if (!record.files || typeof record.files !== 'object' || Array.isArray(record.files)) {
    issues.push('files must be an object');
  } else {
    for (const [relPath, entry] of Object.entries(record.files)) {
      try { assertSafeRelativePath(relPath, 'ownership file'); } catch (error) { issues.push(error.message); }
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        issues.push(`invalid ownership entry: ${relPath}`);
        continue;
      }
      if (typeof entry.module !== 'string' || !/^[a-z][a-z0-9-]*$/.test(entry.module)) {
        issues.push(`ownership entry has invalid module: ${relPath}`);
      }
      if (typeof entry.sourceVersion !== 'string' || !entry.sourceVersion) issues.push(`ownership entry missing sourceVersion: ${relPath}`);
      if (typeof entry.sha256 !== 'string' || !HASH_PATTERN.test(entry.sha256)) issues.push(`ownership entry has invalid sha256: ${relPath}`);
    }
  }
  return issues;
}

export function readOwnershipRecord(targetDir, { allowMissing = true } = {}) {
  const ownershipPath = path.join(targetDir, OWNERSHIP_PATH);
  if (!fs.existsSync(ownershipPath)) {
    if (allowMissing) return null;
    throw new Error(`Ownership record is missing: ${OWNERSHIP_PATH}`);
  }
  let record;
  try { record = JSON.parse(fs.readFileSync(ownershipPath, 'utf8')); } catch (error) {
    throw new Error(`Cannot parse ${OWNERSHIP_PATH}: ${error.message}`);
  }
  const issues = validateOwnershipRecord(record);
  if (issues.length) throw new Error(`Invalid ${OWNERSHIP_PATH}: ${issues.join('; ')}`);
  return record;
}

function managedFiles(moduleIds) {
  const closure = resolveModuleClosure(moduleIds);
  return closure.flatMap((moduleId) => modules[moduleId].files.map((relPath) => ({ relPath, moduleId })));
}

function sourceFileInfo(sourceDir, relPath) {
  const filePath = assertNoSymlinkPath(sourceDir, relPath, { allowMissing: false });
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) throw new Error(`Source asset is not a regular file: ${relPath}`);
  return { filePath, sha256: sha256File(filePath), mode: stat.mode & 0o777 };
}

function buildProfileRecord(profile) {
  return {
    schemaVersion: 1,
    manifestSchemaVersion: capabilityManifest.schemaVersion,
    productVersion: capabilityManifest.productVersion,
    profile: ['core', 'default'].includes(profile.profile) ? profile.profile : 'custom',
    modules: [...profile.modules],
    overlays: [...profile.overlays],
    capabilities: getCapabilitiesForModules(profile.modules),
  };
}

function resolveManagedProfile(targetDir) {
  const profilePath = path.join(targetDir, PROFILE_PATH);
  if (!fs.existsSync(profilePath)) return resolveDoctorProfile(targetDir);
  let record;
  try { record = JSON.parse(fs.readFileSync(profilePath, 'utf8')); } catch (error) {
    throw new Error(`Cannot parse ${PROFILE_PATH}: ${error.message}`);
  }
  if (record?.schemaVersion !== 1 || !['core', 'default', 'custom'].includes(record.profile)) {
    throw new Error(`Invalid ${PROFILE_PATH}: unsupported schema or profile`);
  }
  if (!Array.isArray(record.overlays) || record.overlays.some((id) => !(id in capabilityManifest.overlays))) {
    throw new Error(`Invalid ${PROFILE_PATH}: unknown overlays`);
  }
  let moduleIds;
  if (record.profile === 'core' || record.profile === 'default') {
    moduleIds = resolveInstallProfile(record.profile, { overlays: record.overlays });
  } else {
    if (!Array.isArray(record.modules) || record.modules.some((id) => !(id in modules))) {
      throw new Error(`Invalid ${PROFILE_PATH}: custom modules contain unknown values`);
    }
    moduleIds = resolveModuleClosure(record.modules);
  }
  return {
    source: 'record-upgrade',
    valid: true,
    issues: [],
    profile: record.profile,
    modules: moduleIds,
    overlays: [...record.overlays],
    capabilities: getCapabilitiesForModules(moduleIds),
  };
}

export function refreshInstallationOwnership({ sourceDir, targetDir, profileRecord }) {
  const sourceVersion = readSourceVersion(sourceDir);
  const previous = readOwnershipRecord(targetDir);
  const entries = [];
  let complete = true;
  for (const { relPath, moduleId } of managedFiles(profileRecord.modules)) {
    const source = sourceFileInfo(sourceDir, relPath);
    const targetPath = assertNoSymlinkPath(targetDir, relPath);
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      const targetHash = sha256File(targetPath);
      if (targetHash === source.sha256) {
        entries.push([relPath, { module: moduleId, sourceVersion, sha256: source.sha256 }]);
        continue;
      }
      const old = previous?.files?.[relPath];
      if (old) entries.push([relPath, old]);
    }
    complete = false;
  }
  const record = {
    schemaVersion: 1,
    manifestSchemaVersion: capabilityManifest.schemaVersion,
    profile: profileRecord.profile,
    lastAttemptedVersion: sourceVersion,
    lastCompleteVersion: complete ? sourceVersion : (previous?.lastCompleteVersion || null),
    files: sortedObject(entries),
  };
  writeJsonAtomic(path.join(targetDir, OWNERSHIP_PATH), record);
  return record;
}

export function planManagedUpgrade({ sourceDir, targetDir }) {
  const profile = resolveManagedProfile(targetDir);
  if (!profile.valid) throw new Error(`Cannot resolve upgrade profile: ${profile.issues.join('; ')}`);
  if (!profile.modules.includes('core')) throw new Error('Upgrade profile does not include core');
  const sourceVersion = readSourceVersion(sourceDir);
  const ownership = readOwnershipRecord(targetDir);
  const resolvedProfileId = ['core', 'default'].includes(profile.profile) ? profile.profile : 'custom';
  if (ownership && ownership.profile !== resolvedProfileId) {
    throw new Error(`Ownership profile ${ownership.profile} does not match installation profile ${resolvedProfileId}`);
  }
  const items = [];
  const nextEntries = [];
  const currentPaths = new Set();

  for (const { relPath, moduleId } of managedFiles(profile.modules)) {
    currentPaths.add(relPath);
    const source = sourceFileInfo(sourceDir, relPath);
    const targetPath = assertNoSymlinkPath(targetDir, relPath);
    const targetExists = fs.existsSync(targetPath);
    if (targetExists && !fs.statSync(targetPath).isFile()) throw new Error(`Managed target is not a regular file: ${relPath}`);
    const targetHash = targetExists ? sha256File(targetPath) : null;
    const baseline = ownership?.files?.[relPath] || null;
    let classification;
    let reason;

    if (!baseline) {
      if (!targetExists) {
        classification = 'add';
        reason = 'new managed file';
      } else if (targetHash === source.sha256) {
        classification = 'adopt';
        reason = 'target already matches source';
      } else {
        classification = 'conflict';
        reason = 'existing file has no trusted baseline';
      }
    } else if (targetHash === baseline.sha256) {
      classification = targetHash === source.sha256 ? 'unchanged' : 'update';
      reason = classification === 'update' ? 'target is unchanged from trusted baseline' : 'already current';
    } else if (targetHash === source.sha256) {
      classification = 'adopt';
      reason = 'target already matches new source';
    } else {
      classification = 'conflict';
      reason = targetExists ? 'target differs from trusted baseline and new source' : 'owned target was deleted locally';
    }

    const item = {
      path: relPath,
      module: moduleId,
      classification,
      reason,
      baselineHash: baseline?.sha256 || null,
      targetHash,
      sourceHash: source.sha256,
      sourceMode: source.mode,
    };
    items.push(item);
    if (classification === 'conflict') {
      if (baseline) nextEntries.push([relPath, baseline]);
    } else {
      nextEntries.push([relPath, { module: moduleId, sourceVersion, sha256: source.sha256 }]);
    }
  }

  for (const [relPath, entry] of Object.entries(ownership?.files || {})) {
    if (currentPaths.has(relPath)) continue;
    assertNoSymlinkPath(targetDir, relPath);
    items.push({
      path: relPath,
      module: entry.module,
      classification: 'stale',
      reason: 'no longer declared by the selected capability profile; preserved without ownership',
      baselineHash: entry.sha256,
      targetHash: fs.existsSync(path.join(targetDir, relPath)) ? sha256File(path.join(targetDir, relPath)) : null,
      sourceHash: null,
      sourceMode: null,
    });
  }

  items.sort((left, right) => left.path.localeCompare(right.path));
  const summary = Object.fromEntries(['unchanged', 'adopt', 'update', 'add', 'conflict', 'stale'].map((key) => [key, 0]));
  for (const item of items) summary[item.classification] += 1;
  const nextOwnership = {
    schemaVersion: 1,
    manifestSchemaVersion: capabilityManifest.schemaVersion,
    profile: resolvedProfileId,
    lastAttemptedVersion: sourceVersion,
    lastCompleteVersion: summary.conflict === 0 ? sourceVersion : (ownership?.lastCompleteVersion || null),
    files: sortedObject(nextEntries),
  };
  const nextProfile = buildProfileRecord(profile);
  const gitignore = fs.existsSync(path.join(targetDir, '.gitignore'))
    ? fs.readFileSync(path.join(targetDir, '.gitignore'), 'utf8') : '';
  const warnings = /^\.harness\/backups\/$/m.test(gitignore)
    ? [] : ['.harness/backups/ is not ignored; add it to .gitignore before committing'];

  return {
    sourceVersion,
    previousCompleteVersion: ownership?.lastCompleteVersion || null,
    profile: { id: nextProfile.profile, source: profile.source, modules: [...profile.modules], overlays: [...profile.overlays] },
    ownershipSource: ownership ? 'record' : 'legacy-unowned',
    warnings,
    summary,
    items,
    nextOwnership,
    nextProfile,
  };
}

function sanitizeVersion(value) {
  return String(value || 'unknown').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 40) || 'unknown';
}

function defaultBackupId(plan, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 17);
  const from = plan.previousCompleteVersion || 'legacy';
  return `${stamp}-${sanitizeVersion(from)}-to-${sanitizeVersion(plan.sourceVersion)}`;
}

function backupEntry(targetDir, relPath) {
  const targetPath = assertNoSymlinkPath(targetDir, relPath);
  const existed = fs.existsSync(targetPath);
  if (existed && !fs.statSync(targetPath).isFile()) throw new Error(`Backup target is not a regular file: ${relPath}`);
  return { path: relPath, existed, mode: existed ? (fs.statSync(targetPath).mode & 0o777) : null };
}

function createBackup(targetDir, backupId, relPaths) {
  if (!BACKUP_ID_PATTERN.test(backupId)) throw new Error(`Invalid backup id: ${backupId}`);
  assertNoSymlinkPath(targetDir, `.harness/backups/${backupId}`);
  const backupRoot = path.join(targetDir, '.harness', 'backups', backupId);
  if (fs.existsSync(backupRoot)) throw new Error(`Backup already exists: ${backupId}`);
  const entries = [...new Set(relPaths)].sort().map((relPath) => backupEntry(targetDir, relPath));
  try {
    for (const entry of entries) {
      if (!entry.existed) continue;
      const destination = path.join(backupRoot, 'files', ...entry.path.split('/'));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(targetDir, ...entry.path.split('/')), destination);
      entry.backupSha256 = sha256File(destination);
    }
    writeJsonAtomic(path.join(backupRoot, 'manifest.json'), { schemaVersion: 1, backupId, entries });
  } catch (error) {
    fs.rmSync(backupRoot, { recursive: true, force: true });
    throw error;
  }
  return backupRoot;
}

function readBackupManifest(targetDir, backupId) {
  if (!BACKUP_ID_PATTERN.test(backupId)) throw new Error(`Invalid backup id: ${backupId}`);
  assertNoSymlinkPath(targetDir, `.harness/backups/${backupId}/manifest.json`, { allowMissing: false });
  const backupRoot = path.join(targetDir, '.harness', 'backups', backupId);
  const manifestPath = path.join(backupRoot, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (error) {
    throw new Error(`Cannot read backup ${backupId}: ${error.message}`);
  }
  if (manifest?.schemaVersion !== 1 || manifest.backupId !== backupId || !Array.isArray(manifest.entries)) {
    throw new Error(`Invalid backup manifest: ${backupId}`);
  }
  const seenPaths = new Set();
  for (const entry of manifest.entries) {
    assertSafeRelativePath(entry?.path, 'backup entry');
    if (entry.path.startsWith('.harness/backups/')) throw new Error(`Backup entry may not target backup storage: ${entry.path}`);
    if (seenPaths.has(entry.path)) throw new Error(`Duplicate backup entry: ${entry.path}`);
    seenPaths.add(entry.path);
    if (typeof entry.existed !== 'boolean') throw new Error(`Invalid backup entry: ${entry?.path}`);
    if (entry.existed && (!Number.isInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o777)) {
      throw new Error(`Invalid backup mode: ${entry.path}`);
    }
    assertNoSymlinkPath(targetDir, entry.path);
    if (entry.existed) {
      const storedRelPath = `.harness/backups/${backupId}/files/${entry.path}`;
      const stored = assertNoSymlinkPath(targetDir, storedRelPath, { allowMissing: false });
      if (!fs.existsSync(stored) || !fs.statSync(stored).isFile()) throw new Error(`Backup payload is missing: ${entry.path}`);
      if (!HASH_PATTERN.test(String(entry.backupSha256 || '')) || sha256File(stored) !== entry.backupSha256) {
        throw new Error(`Backup payload hash mismatch: ${entry.path}`);
      }
    }
  }
  return { backupRoot, manifest };
}

export function restoreManagedBackup({ targetDir, backupId, dryRun = false }) {
  const { backupRoot, manifest } = readBackupManifest(targetDir, backupId);
  if (dryRun) return { status: 'planned', backupId, entries: manifest.entries };
  const ordered = [...manifest.entries].reverse();
  const current = ordered.map((entry) => {
    const targetPath = path.join(targetDir, ...entry.path.split('/'));
    const existed = fs.existsSync(targetPath);
    if (existed && !fs.statSync(targetPath).isFile()) throw new Error(`Restore refuses non-file target: ${entry.path}`);
    return {
      path: entry.path,
      existed,
      content: existed ? fs.readFileSync(targetPath) : null,
      mode: existed ? (fs.statSync(targetPath).mode & 0o777) : null,
    };
  });
  try {
    for (const entry of ordered) {
      const targetPath = path.join(targetDir, ...entry.path.split('/'));
      if (entry.existed) {
        const stored = path.join(backupRoot, 'files', ...entry.path.split('/'));
        atomicWrite(targetPath, fs.readFileSync(stored), entry.mode || 0o644);
      } else if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    }
  } catch (error) {
    try {
      for (const snapshot of current) {
        const targetPath = path.join(targetDir, ...snapshot.path.split('/'));
        if (snapshot.existed) atomicWrite(targetPath, snapshot.content, snapshot.mode || 0o644);
        else if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      }
    } catch (rollbackError) {
      throw new Error(`Restore failed: ${error.message}; restore rollback failed: ${rollbackError.message}`);
    }
    throw new Error(`Restore failed and current files were rolled back: ${error.message}`);
  }
  return { status: 'restored', backupId, entries: manifest.entries };
}

function formatUpgradeMarkdown(report) {
  const conflicts = report.items.filter((item) => item.classification === 'conflict');
  const stale = report.items.filter((item) => item.classification === 'stale');
  return `# Harness Lab 升级报告

**目标版本**：${report.sourceVersion}
**状态**：${report.status}
**Backup**：${report.backupId || 'none'}

## Summary

${Object.entries(report.summary).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

## Warnings

${report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join('\n') : '- 无'}

## Conflicts

${conflicts.length ? conflicts.map((item) => `- \`${item.path}\`：${item.reason}`).join('\n') : '- 无'}

## Preserved stale files

${stale.length ? stale.map((item) => `- \`${item.path}\``).join('\n') : '- 无'}

## Restore

${report.backupId ? `\`harness-install --restore ${report.backupId}\`` : '本次未写入，无需恢复。'}
`;
}

export function applyManagedUpgrade({ sourceDir, targetDir, dryRun = false, backupId = null, now = new Date(), faultInjector = null }) {
  const plan = planManagedUpgrade({ sourceDir, targetDir });
  if (dryRun) return { ...plan, status: 'planned', exitCode: plan.summary.conflict ? 2 : 0, backupId: null };
  const writes = plan.items.filter((item) => ['update', 'add'].includes(item.classification));
  const id = backupId || defaultBackupId(plan, now);
  const metadataPaths = [OWNERSHIP_PATH, PROFILE_PATH, UPGRADE_REPORT_JSON_PATH, UPGRADE_REPORT_MD_PATH];
  createBackup(targetDir, id, [...writes.map((item) => item.path), ...metadataPaths]);
  const status = plan.summary.conflict ? 'partial' : 'success';
  const report = {
    schemaVersion: 1,
    sourceVersion: plan.sourceVersion,
    status,
    backupId: id,
    profile: plan.profile,
    ownershipSource: plan.ownershipSource,
    warnings: plan.warnings,
    summary: plan.summary,
    items: plan.items.map(({ sourceMode, ...item }) => item),
  };

  try {
    for (const [index, item] of writes.entries()) {
      const source = sourceFileInfo(sourceDir, item.path);
      if (source.sha256 !== item.sourceHash) throw new Error(`Source changed after planning: ${item.path}`);
      const targetPath = path.join(targetDir, ...item.path.split('/'));
      const currentTargetHash = fs.existsSync(targetPath) ? sha256File(targetPath) : null;
      if (currentTargetHash !== item.targetHash) throw new Error(`Target changed after planning: ${item.path}`);
      atomicWrite(targetPath, fs.readFileSync(source.filePath), source.mode);
      if (faultInjector) faultInjector({ phase: 'after-write', index, item });
    }
    writeJsonAtomic(path.join(targetDir, PROFILE_PATH), plan.nextProfile);
    writeJsonAtomic(path.join(targetDir, OWNERSHIP_PATH), plan.nextOwnership);
    writeJsonAtomic(path.join(targetDir, UPGRADE_REPORT_JSON_PATH), report);
    atomicWrite(path.join(targetDir, UPGRADE_REPORT_MD_PATH), formatUpgradeMarkdown(report));
  } catch (error) {
    try {
      restoreManagedBackup({ targetDir, backupId: id });
    } catch (restoreError) {
      throw new Error(`Upgrade failed: ${error.message}; automatic restore failed: ${restoreError.message}`);
    }
    throw new Error(`Upgrade failed and was automatically restored from ${id}: ${error.message}`);
  }
  return { ...plan, status, exitCode: status === 'partial' ? 2 : 0, backupId: id, report };
}
