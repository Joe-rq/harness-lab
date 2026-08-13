import fs from 'node:fs';
import path from 'node:path';

export const HARNESS_MODES = Object.freeze(['collaborative', 'supervised', 'autonomous']);
export const HOOK_ACTIONS = Object.freeze(['allow', 'warn', 'block']);
export const HOOK_EFFECTS = Object.freeze(['none', 'log', 'recovery', 'snapshot']);

const MATRIX = {
  'req.invalid': {
    collaborative: { action: 'block', effect: 'none' },
    supervised: { action: 'block', effect: 'none' },
    autonomous: { action: 'block', effect: 'none' },
  },
  'scope.violation': {
    collaborative: { action: 'block', effect: 'log' },
    supervised: { action: 'block', effect: 'log' },
    autonomous: { action: 'block', effect: 'log' },
  },
  'deploy.dangerous': {
    collaborative: { action: 'warn', effect: 'none' },
    supervised: { action: 'block', effect: 'log' },
    autonomous: { action: 'block', effect: 'log' },
  },
  'review.write-agent': {
    collaborative: { action: 'block', effect: 'none' },
    supervised: { action: 'block', effect: 'none' },
    autonomous: { action: 'block', effect: 'none' },
  },
  'risk.r3': {
    collaborative: { action: 'warn', effect: 'none' },
    supervised: { action: 'warn', effect: 'none' },
    autonomous: { action: 'allow', effect: 'log' },
  },
  'watchdog.stagnant': {
    collaborative: { action: 'warn', effect: 'none' },
    supervised: { action: 'warn', effect: 'none' },
    autonomous: { action: 'allow', effect: 'recovery' },
  },
  'stop.uncovered': {
    collaborative: { action: 'warn', effect: 'none' },
    supervised: { action: 'block', effect: 'none' },
    autonomous: { action: 'block', effect: 'none' },
  },
  'precompact.snapshot': {
    collaborative: { action: 'allow', effect: 'snapshot', audit: false },
    supervised: { action: 'allow', effect: 'snapshot', audit: false },
    autonomous: { action: 'allow', effect: 'snapshot', audit: true },
  },
};

export function validateHookPolicyMatrix(matrix) {
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
    throw new Error('Hook policy matrix must be an object');
  }
  for (const [point, decisions] of Object.entries(matrix)) {
    if (!/^[a-z][a-z0-9.-]*$/.test(point)) throw new Error(`Invalid hook policy point: ${point}`);
    for (const mode of HARNESS_MODES) {
      const decision = decisions?.[mode];
      if (!decision) throw new Error(`Hook policy ${point} is missing mode: ${mode}`);
      if (!HOOK_ACTIONS.includes(decision.action)) {
        throw new Error(`Hook policy ${point}/${mode} has invalid action: ${decision.action}`);
      }
      if (!HOOK_EFFECTS.includes(decision.effect)) {
        throw new Error(`Hook policy ${point}/${mode} has invalid effect: ${decision.effect}`);
      }
      if (decision.audit !== undefined && typeof decision.audit !== 'boolean') {
        throw new Error(`Hook policy ${point}/${mode} has invalid audit flag`);
      }
    }
    const extras = Object.keys(decisions).filter((mode) => !HARNESS_MODES.includes(mode));
    if (extras.length > 0) throw new Error(`Hook policy ${point} has unknown modes: ${extras.join(', ')}`);
  }
  return true;
}

validateHookPolicyMatrix(MATRIX);
export const hookPolicyMatrix = Object.freeze(
  Object.fromEntries(Object.entries(MATRIX).map(([point, decisions]) => [
    point,
    Object.freeze(Object.fromEntries(Object.entries(decisions).map(([mode, decision]) => [mode, Object.freeze(decision)]))),
  ]))
);

export function normalizeHarnessMode(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return HARNESS_MODES.includes(raw)
    ? { mode: raw, raw, valid: true }
    : { mode: 'collaborative', raw, valid: raw === '' };
}

export function readHarnessMode(rootDir) {
  const modePath = path.join(rootDir, '.claude', 'harness-mode');
  try {
    return { ...normalizeHarnessMode(fs.readFileSync(modePath, 'utf8')), path: modePath, exists: true };
  } catch {
    return { mode: 'collaborative', raw: '', valid: true, path: modePath, exists: false };
  }
}

export function getHookPolicy(point, mode) {
  const decisions = hookPolicyMatrix[point];
  if (!decisions) throw new Error(`Unknown hook policy point: ${point}`);
  const normalized = normalizeHarnessMode(mode).mode;
  return decisions[normalized];
}
