const TARGET_PACKAGE_SCRIPTS = {
  req: 'node scripts/req-cli.mjs',
  'req:create': 'node scripts/req-cli.mjs create',
  'req:start': 'node scripts/req-cli.mjs start',
  'req:block': 'node scripts/req-cli.mjs block',
  'req:complete': 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.req-complete-status && node scripts/req-cli.mjs complete --status-file .claude/.req-complete-status',
  'req:status': 'node scripts/req-cli.mjs status',
  'req:audit': 'node scripts/req-audit.mjs --all',
  'req:experience': 'node scripts/req-cli.mjs experience',
  'req:reflect': 'node scripts/req-reflect.mjs',
  'req:align': 'node scripts/req-align.mjs',
  'governance:health': 'node scripts/governance-health.mjs',
  'docs:verify': 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.docs-verify-status && node scripts/docs-verify.mjs --status-file .claude/.docs-verify-status',
  'docs:impact': 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.docs-impact-status && node scripts/docs-verify.mjs --status-file .claude/.docs-impact-status --impact-only',
  'docs:impact:json': 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.docs-impact-json-status && node scripts/docs-verify.mjs --status-file .claude/.docs-impact-json-status --impact-only --format json',
  'check:governance': 'git -c safe.directory=* status --porcelain=v1 -uall > .claude/.check-governance-status && node scripts/check-governance.mjs --status-file .claude/.check-governance-status',
  'harness:doctor': 'node scripts/harness-doctor.mjs',
  'harness:matcher-smoke': 'node scripts/claude-matcher-smoke.mjs',
  'ci:verify': 'node scripts/ci-verify.mjs',
  'pilot:observe': 'node scripts/pilot-observation.mjs',
};

const MODULES = {
  core: {
    name: '核心模块',
    required: true,
    default: true,
    dependsOn: [],
    detectionFiles: ['AGENTS.md', 'requirements/REQ_TEMPLATE.md'],
    files: [
      'AGENTS.md',
      'CLAUDE.md',
      'requirements/REQ_TEMPLATE.md',
      'requirements/in-progress/README.md',
      'requirements/completed/README.md',
      'requirements/reports/README.md',
    ],
  },
  docs: {
    name: 'docs/ 目录',
    required: false,
    default: true,
    dependsOn: ['core'],
    detectionFiles: ['docs/plans/README.md'],
    files: [
      'docs/plans/README.md',
      'docs/specs/README.md',
      'docs/pilots/README.md',
      'docs/pilots/PILOT_TEMPLATE.md',
      'docs/pilots/CANDIDATE_PREFLIGHT.md',
    ],
  },
  context: {
    name: 'context/ 目录',
    required: false,
    default: true,
    dependsOn: ['core'],
    detectionFiles: ['context/README.md'],
    files: [
      'context/README.md',
      'context/business/README.md',
      'context/tech/README.md',
      'context/tech/architecture.md',
      'context/tech/tech-stack.md',
      'context/tech/testing-strategy.md',
      'context/tech/env-contract.md',
      'context/tech/deployment-runbook.md',
      'context/experience/README.md',
      'context/experience/TEMPLATE.md',
      'context/invariants/TEMPLATE.md',
      'context/references/README.md',
    ],
  },
  skills: {
    name: 'skills/ 与 source-command skills',
    required: false,
    default: true,
    dependsOn: ['core'],
    detectionFiles: ['skills/README.md'],
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
    dependsOn: ['core'],
    detectionFiles: ['scripts/req-cli.mjs'],
    files: [
      'scripts/capability-manifest.mjs',
      'scripts/req-cli.mjs',
      'scripts/req-audit.mjs',
      'scripts/governance-health.mjs',
      'scripts/req-validation.mjs',
      'scripts/error-classifier.mjs',
      'scripts/event-store.mjs',
      'scripts/worktree-utils.mjs',
      'scripts/state-semantics.mjs',
      'scripts/ci-verify.mjs',
      'scripts/claude-matcher-smoke.mjs',
      'scripts/pilot-observation.mjs',
      'scripts/docs-verify.mjs',
      'scripts/check-governance.mjs',
      'scripts/docs-sync-rules.json',
      'scripts/template-guard.mjs',
      'scripts/harness-doctor.mjs',
      'scripts/req-reflect.mjs',
      'scripts/req-align.mjs',
      'scripts/invariant-extractor.mjs',
      'scripts/invariant-gate.mjs',
    ],
    packageScripts: TARGET_PACKAGE_SCRIPTS,
  },
  hook: {
    name: '治理 hooks',
    required: false,
    default: false,
    dependsOn: ['cli'],
    detectionFiles: ['scripts/req-check.js'],
    hook: true,
    files: [
      '.claude/settings.example.json',
      'scripts/session-start.js',
      'scripts/req-check.js',
      'scripts/scope-guard.mjs',
      'scripts/write-target-policy.mjs',
      'scripts/hook-policy.mjs',
    ],
  },
  'advanced-hooks': {
    name: '高级治理 hooks',
    required: false,
    default: false,
    interactive: false,
    dependsOn: ['hook'],
    detectionFiles: ['scripts/risk-tracker.mjs'],
    hook: true,
    files: [
      'scripts/deploy-guard.mjs',
      'scripts/review-gatekeeper.mjs',
      'scripts/risk-tracker.mjs',
      'scripts/watchdog.mjs',
      'scripts/stop-evaluator.mjs',
      'scripts/precompact-notify.mjs',
      'scripts/session-reflect.mjs',
      'scripts/loop-detection.mjs',
    ],
  },
};

const RAW_MANIFEST = {
  schemaVersion: 1,
  productVersion: 1,
  modules: MODULES,
  targetPackageScripts: TARGET_PACKAGE_SCRIPTS,
  profiles: {
    core: { name: 'core-only', modules: ['core'] },
    default: { name: 'default', modules: ['core', 'docs', 'context', 'skills', 'cli'] },
  },
  overlays: {
    'basic-hooks': { name: 'basic hooks', modules: ['hook'] },
    'advanced-hooks': { name: 'advanced hooks', modules: ['advanced-hooks'] },
  },
  capabilities: [
    { id: 'governance.core', modules: ['core'] },
    { id: 'governance.docs', modules: ['docs'] },
    { id: 'governance.context', modules: ['context'] },
    { id: 'governance.skills', modules: ['skills'] },
    { id: 'req.lifecycle', modules: ['cli'], scripts: ['req:create', 'req:start', 'req:status', 'req:complete'] },
    { id: 'governance.audit', modules: ['cli'], scripts: ['req:audit', 'check:governance', 'harness:doctor'] },
    { id: 'hooks.basic', modules: ['hook'], overlay: 'basic-hooks' },
    { id: 'hooks.advanced', modules: ['advanced-hooks'], overlay: 'advanced-hooks' },
  ],
  doctor: {
    basicHookEvents: ['SessionStart', 'PreToolUse'],
    knownHookEvents: ['SessionStart', 'PreToolUse', 'PostToolUse', 'PreCompact', 'Stop', 'SessionEnd'],
    scriptExtensions: ['js', 'mjs', 'sh'],
    basicHookScripts: ['session-start.js', 'req-check.js', 'scope-guard.mjs'],
    advancedHookEvents: ['PreToolUse', 'PostToolUse', 'PreCompact', 'Stop', 'SessionEnd'],
    advancedHookScripts: [
      'deploy-guard.mjs',
      'review-gatekeeper.mjs',
      'risk-tracker.mjs',
      'watchdog.mjs',
      'stop-evaluator.mjs',
      'precompact-notify.mjs',
      'session-reflect.mjs',
      'loop-detection.mjs',
    ],
  },
  verification: {
    nodeMajor: 20,
    runnerOs: ['ubuntu-latest', 'macos-latest', 'windows-latest'],
    testFiles: [
      'tests/governance.test.mjs',
      'tests/req-status-json.test.mjs',
      'tests/req-audit.test.mjs',
      'tests/event-store.test.mjs',
    ],
    stages: ['tests', 'capabilities', 'docs', 'governance', 'doctor', 'pack'],
  },
  publication: {
    extraFiles: [
      'README.md',
      '.claude/commands/harness-setup.md',
      'scripts/harness-install.mjs',
      'scripts/managed-upgrade.mjs',
      'scripts/capability-sync.mjs',
    ],
  },
};

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertSafeRelativePath(value, label) {
  if (
    typeof value !== 'string' || value.length === 0 || value.includes('\0') ||
    value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:\//.test(value) ||
    value.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new Error(`${label} must be a safe repository-relative POSIX path: ${String(value)}`);
  }
}

function assertUniqueStrings(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string' || !value)) {
    throw new Error(`${label} must be a non-empty string array`);
  }
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate) throw new Error(`${label} contains duplicate: ${duplicate}`);
}

export function validateCapabilityManifest(manifest) {
  assertPlainObject(manifest, 'manifest');
  if (manifest.schemaVersion !== 1) throw new Error('Unsupported capability manifest schemaVersion');
  assertPlainObject(manifest.modules, 'manifest.modules');
  assertPlainObject(manifest.targetPackageScripts, 'manifest.targetPackageScripts');
  assertPlainObject(manifest.profiles, 'manifest.profiles');
  assertPlainObject(manifest.overlays, 'manifest.overlays');

  const moduleIds = Object.keys(manifest.modules);
  assertUniqueStrings(moduleIds, 'module ids');
  const globalFiles = [];
  for (const [moduleId, definition] of Object.entries(manifest.modules)) {
    if (!/^[a-z][a-z0-9-]*$/.test(moduleId)) throw new Error(`Invalid module id: ${moduleId}`);
    assertPlainObject(definition, `module ${moduleId}`);
    assertUniqueStrings(definition.files, `module ${moduleId} files`);
    for (const file of definition.files) {
      assertSafeRelativePath(file, `module ${moduleId} file`);
      if (globalFiles.includes(file)) throw new Error(`File belongs to multiple modules: ${file}`);
      globalFiles.push(file);
    }
    assertUniqueStrings(definition.detectionFiles || [], `module ${moduleId} detectionFiles`);
    for (const file of definition.detectionFiles || []) {
      if (!definition.files.includes(file)) {
        throw new Error(`Module ${moduleId} detection file is not a module file: ${file}`);
      }
    }
    assertUniqueStrings(definition.dependsOn || [], `module ${moduleId} dependsOn`);
    for (const dependency of definition.dependsOn || []) {
      if (!moduleIds.includes(dependency)) throw new Error(`Module ${moduleId} depends on unknown module: ${dependency}`);
      if (dependency === moduleId) throw new Error(`Module ${moduleId} cannot depend on itself`);
    }
  }

  for (const [name, command] of Object.entries(manifest.targetPackageScripts)) {
    if (!name || typeof command !== 'string' || !command.trim()) {
      throw new Error(`Invalid target package script: ${name}`);
    }
  }
  if (manifest.modules.cli?.packageScripts !== manifest.targetPackageScripts) {
    throw new Error('CLI module packageScripts must reference targetPackageScripts');
  }

  for (const [kind, definitions] of [['profile', manifest.profiles], ['overlay', manifest.overlays]]) {
    for (const [id, definition] of Object.entries(definitions)) {
      assertPlainObject(definition, `${kind} ${id}`);
      assertUniqueStrings(definition.modules, `${kind} ${id} modules`);
      for (const moduleId of definition.modules) {
        if (!moduleIds.includes(moduleId)) throw new Error(`${kind} ${id} references unknown module: ${moduleId}`);
      }
    }
  }

  const capabilityIds = manifest.capabilities.map((capability) => capability.id);
  assertUniqueStrings(capabilityIds, 'capability ids');
  for (const capability of manifest.capabilities) {
    if (!/^[a-z][a-z0-9.-]*$/.test(capability.id)) throw new Error(`Invalid capability id: ${capability.id}`);
    assertUniqueStrings(capability.modules, `capability ${capability.id} modules`);
    for (const moduleId of capability.modules) {
      if (!moduleIds.includes(moduleId)) throw new Error(`Capability ${capability.id} references unknown module: ${moduleId}`);
    }
    for (const script of capability.scripts || []) {
      if (!(script in manifest.targetPackageScripts)) throw new Error(`Capability ${capability.id} references unknown script: ${script}`);
    }
    if (capability.overlay && !(capability.overlay in manifest.overlays)) {
      throw new Error(`Capability ${capability.id} references unknown overlay: ${capability.overlay}`);
    }
  }

  assertUniqueStrings(manifest.doctor.basicHookEvents, 'doctor basicHookEvents');
  assertUniqueStrings(manifest.doctor.knownHookEvents, 'doctor knownHookEvents');
  assertUniqueStrings(manifest.doctor.scriptExtensions, 'doctor scriptExtensions');
  assertUniqueStrings(manifest.doctor.basicHookScripts, 'doctor basicHookScripts');
  assertUniqueStrings(manifest.doctor.advancedHookEvents, 'doctor advancedHookEvents');
  assertUniqueStrings(manifest.doctor.advancedHookScripts, 'doctor advancedHookScripts');
  assertPlainObject(manifest.verification, 'manifest.verification');
  if (!Number.isInteger(manifest.verification.nodeMajor) || manifest.verification.nodeMajor < 20) {
    throw new Error('verification nodeMajor must be an integer >= 20');
  }
  assertUniqueStrings(manifest.verification.runnerOs, 'verification runnerOs');
  assertUniqueStrings(manifest.verification.testFiles, 'verification testFiles');
  assertUniqueStrings(manifest.verification.stages, 'verification stages');
  for (const file of manifest.verification.testFiles) assertSafeRelativePath(file, 'verification test file');
  assertUniqueStrings(manifest.publication.extraFiles, 'publication extraFiles');
  for (const file of manifest.publication.extraFiles) assertSafeRelativePath(file, 'publication extra file');

  // Resolve every profile/overlay now to detect cycles and dependency errors.
  for (const profileId of Object.keys(manifest.profiles)) resolveInstallProfile(profileId, { manifest });
  return true;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function resolveModuleClosure(moduleIds, { manifest = RAW_MANIFEST } = {}) {
  const resolved = [];
  const visiting = new Set();
  const visit = (moduleId) => {
    const definition = manifest.modules[moduleId];
    if (!definition) throw new Error(`Unknown module: ${moduleId}`);
    if (resolved.includes(moduleId)) return;
    if (visiting.has(moduleId)) throw new Error(`Capability module dependency cycle at: ${moduleId}`);
    visiting.add(moduleId);
    for (const dependency of definition.dependsOn || []) visit(dependency);
    visiting.delete(moduleId);
    resolved.push(moduleId);
  };
  for (const moduleId of moduleIds) visit(moduleId);
  return resolved;
}

export function resolveInstallProfile(profileId, { overlays = [], manifest = RAW_MANIFEST } = {}) {
  const profile = manifest.profiles[profileId];
  if (!profile) throw new Error(`Unknown install profile: ${profileId}`);
  const selected = [...profile.modules];
  for (const overlayId of overlays) {
    const overlay = manifest.overlays[overlayId];
    if (!overlay) throw new Error(`Unknown install overlay: ${overlayId}`);
    selected.push(...overlay.modules);
  }
  return resolveModuleClosure(selected, { manifest });
}

export function getInstallFiles(moduleIds, { manifest = RAW_MANIFEST } = {}) {
  const files = [];
  for (const moduleId of resolveModuleClosure(moduleIds, { manifest })) {
    for (const file of manifest.modules[moduleId].files) {
      if (!files.includes(file)) files.push(file);
    }
  }
  return files;
}

export function getCapabilitiesForModules(moduleIds, { manifest = RAW_MANIFEST } = {}) {
  const installed = new Set(resolveModuleClosure(moduleIds, { manifest }));
  return manifest.capabilities
    .filter((capability) => capability.modules.every((moduleId) => installed.has(moduleId)))
    .map((capability) => capability.id);
}

export function getPublishedFiles({ manifest = RAW_MANIFEST } = {}) {
  const files = [
    ...getInstallFiles(Object.keys(manifest.modules), { manifest }),
    ...manifest.publication.extraFiles,
  ];
  return [...new Set(files)].sort((left, right) => left.localeCompare(right));
}

validateCapabilityManifest(RAW_MANIFEST);
export const capabilityManifest = deepFreeze(RAW_MANIFEST);
export const modules = capabilityManifest.modules;
export const targetPackageScripts = capabilityManifest.targetPackageScripts;
export const doctorExpectations = capabilityManifest.doctor;
