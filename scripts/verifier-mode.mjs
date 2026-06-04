export const DEFAULT_VERIFIER_MODE = 'envelope';

export const ALLOWED_VERIFIER_MODES = Object.freeze([
  'legacy',
  'envelope',
  'subagent',
]);

export const VERIFIER_READONLY_BOUNDARY = Object.freeze({
  allowedTools: Object.freeze(['Read', 'Grep', 'Glob', 'LS']),
  disallowedTools: Object.freeze([
    'Write',
    'Edit',
    'Bash',
    'NotebookEdit',
    'Task',
    'Agent',
    'Workflow',
  ]),
});

export function getVerifierMode(env = process.env) {
  const rawMode = env.HARNESS_VERIFIER_MODE;
  if (!rawMode) return DEFAULT_VERIFIER_MODE;
  return String(rawMode).trim().toLowerCase();
}

export function assertVerifierMode(mode, entrypoint = 'verifier') {
  if (ALLOWED_VERIFIER_MODES.includes(mode)) return mode;

  throw new Error(
    `Unsupported HARNESS_VERIFIER_MODE for ${entrypoint}: ${mode}. ` +
    `Expected one of: ${ALLOWED_VERIFIER_MODES.join(', ')}.`
  );
}

export function resolveVerifierMode(env = process.env, entrypoint = 'verifier') {
  return assertVerifierMode(getVerifierMode(env), entrypoint);
}
