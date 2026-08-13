#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EVENT_FIELDS = Object.freeze({
  pilot_started: ['event', 'occurredAt', 'pilotId', 'projectType', 'baselineRef'],
  first_req_ready: ['event', 'occurredAt', 'reqId', 'elapsedMinutes'],
  cycle_started: ['event', 'occurredAt', 'reqId'],
  cycle_completed: ['event', 'occurredAt', 'reqId', 'verificationResult'],
  recovery_started: ['event', 'occurredAt', 'reqId'],
  recovery_completed: ['event', 'occurredAt', 'reqId', 'elapsedSeconds', 'outcome'],
  incident: ['event', 'occurredAt', 'reqId', 'classification', 'severity'],
  exemption_used: ['event', 'occurredAt', 'reqId', 'reasonCode'],
  repeat_use: ['event', 'occurredAt', 'intent'],
  pilot_closed: ['event', 'occurredAt', 'outcome'],
});

const PROJECT_TYPES = new Set(['javascript', 'python', 'monorepo']);
const VERIFICATION_RESULTS = new Set(['pass', 'fail']);
const RECOVERY_OUTCOMES = new Set(['correct', 'partial', 'incorrect']);
const INCIDENT_CLASSES = new Set(['false-block', 'false-miss', 'true-block']);
const SEVERITIES = new Set(['low', 'medium', 'high']);
const EXEMPTION_REASONS = new Set(['emergency', 'scope-gap', 'tool-gap', 'false-block', 'other-reviewed']);
const REPEAT_INTENTS = new Set(['intentional-reuse', 'paused', 'abandoned']);
const CLOSE_OUTCOMES = new Set(['completed', 'paused', 'abandoned']);
const REQ_PATTERN = /^REQ-\d{4}-\d{3}$/;
const PILOT_PATTERN = /^pilot-[a-z0-9][a-z0-9-]{2,31}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) throw new Error(`${label} must be one of: ${[...allowed].join(', ')}`);
}

function assertTimestamp(value, label = 'occurredAt') {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be an ISO-8601 timestamp with timezone`);
  }
}

function assertNonNegativeNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number`);
}

export function validateEventShape(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('event must be an object');
  const expected = EVENT_FIELDS[event.event];
  if (!expected) throw new Error(`Unknown pilot event: ${String(event.event)}`);
  const actual = Object.keys(event).sort();
  const allowed = expected.filter((field) => !(event.event === 'incident' && field === 'reqId' && event.reqId === undefined)).sort();
  if (actual.length !== allowed.length || actual.some((field, index) => field !== allowed[index])) {
    throw new Error(`${event.event} fields must be exactly: ${expected.join(', ')}${event.event === 'incident' ? ' (reqId optional)' : ''}`);
  }
  assertTimestamp(event.occurredAt);
  if ('reqId' in event && event.reqId !== undefined && !REQ_PATTERN.test(event.reqId)) throw new Error(`Invalid reqId: ${event.reqId}`);

  switch (event.event) {
    case 'pilot_started':
      if (!PILOT_PATTERN.test(event.pilotId)) throw new Error('pilotId must match pilot-[a-z0-9-]');
      assertEnum(event.projectType, PROJECT_TYPES, 'projectType');
      if (event.baselineRef !== 'uncommitted-reviewed' && !/^[a-f0-9]{7,40}$/.test(event.baselineRef)) {
        throw new Error('baselineRef must be a Git commit hash or uncommitted-reviewed');
      }
      break;
    case 'first_req_ready': assertNonNegativeNumber(event.elapsedMinutes, 'elapsedMinutes'); break;
    case 'cycle_completed': assertEnum(event.verificationResult, VERIFICATION_RESULTS, 'verificationResult'); break;
    case 'recovery_completed':
      assertNonNegativeNumber(event.elapsedSeconds, 'elapsedSeconds');
      assertEnum(event.outcome, RECOVERY_OUTCOMES, 'outcome');
      break;
    case 'incident':
      assertEnum(event.classification, INCIDENT_CLASSES, 'classification');
      assertEnum(event.severity, SEVERITIES, 'severity');
      break;
    case 'exemption_used': assertEnum(event.reasonCode, EXEMPTION_REASONS, 'reasonCode'); break;
    case 'repeat_use': assertEnum(event.intent, REPEAT_INTENTS, 'intent'); break;
    case 'pilot_closed': assertEnum(event.outcome, CLOSE_OUTCOMES, 'outcome'); break;
    default: break;
  }
  return true;
}

export function parseObservation(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  return lines.map((line, index) => {
    try {
      const event = JSON.parse(line);
      validateEventShape(event);
      return event;
    } catch (error) {
      throw new Error(`Invalid observation line ${index + 1}: ${error.message}`);
    }
  });
}

export function validateObservation(events, { requireComplete = false, asOf = new Date().toISOString() } = {}) {
  if (!Array.isArray(events) || events.length === 0) throw new Error('Observation is empty');
  events.forEach(validateEventShape);
  if (events[0].event !== 'pilot_started') throw new Error('First event must be pilot_started');
  if (events.filter(({ event }) => event === 'pilot_started').length !== 1) throw new Error('pilot_started must occur exactly once');
  assertTimestamp(asOf, 'asOf');
  const asOfMs = Date.parse(asOf);
  let previous = -Infinity;
  let closed = false;
  const cycles = new Map();
  const recoveryOpen = new Map();
  let firstReqReady = 0;
  let firstReqReadyId = null;
  let intentionalReuseAt = null;

  for (const item of events) {
    const at = Date.parse(item.occurredAt);
    if (at < previous) throw new Error('Observation timestamps must be non-decreasing');
    if (at > asOfMs + 5 * 60 * 1000) throw new Error('Observation contains an event too far in the future');
    previous = at;
    if (closed) throw new Error('No events are allowed after pilot_closed');
    if (item.event === 'first_req_ready') {
      firstReqReady += 1;
      firstReqReadyId = item.reqId;
      const measuredMinutes = (at - Date.parse(events[0].occurredAt)) / (60 * 1000);
      if (Math.abs(measuredMinutes - item.elapsedMinutes) > 1) {
        throw new Error(`first_req_ready elapsedMinutes does not match timestamps: ${item.elapsedMinutes} vs ${measuredMinutes}`);
      }
    }
    if (item.event === 'cycle_started') {
      if (cycles.has(item.reqId)) throw new Error(`Cycle already exists: ${item.reqId}`);
      cycles.set(item.reqId, { startedAt: item.occurredAt, completedAt: null, verificationResult: null, exemptions: 0 });
    }
    if (item.event === 'cycle_completed') {
      const cycle = cycles.get(item.reqId);
      if (!cycle || cycle.completedAt) throw new Error(`cycle_completed without one open cycle: ${item.reqId}`);
      cycle.completedAt = item.occurredAt;
      cycle.verificationResult = item.verificationResult;
    }
    if (item.event === 'exemption_used') {
      const cycle = cycles.get(item.reqId);
      if (!cycle || cycle.completedAt) throw new Error(`exemption_used requires an open cycle: ${item.reqId}`);
      cycle.exemptions += 1;
    }
    if (item.event === 'recovery_started') {
      if (recoveryOpen.has(item.reqId)) throw new Error(`Recovery already open: ${item.reqId}`);
      recoveryOpen.set(item.reqId, item.occurredAt);
    }
    if (item.event === 'recovery_completed') {
      if (!recoveryOpen.has(item.reqId)) throw new Error(`recovery_completed without recovery_started: ${item.reqId}`);
      const measuredSeconds = (at - Date.parse(recoveryOpen.get(item.reqId))) / 1000;
      if (Math.abs(measuredSeconds - item.elapsedSeconds) > 1) {
        throw new Error(`recovery elapsedSeconds does not match timestamps for ${item.reqId}: ${item.elapsedSeconds} vs ${measuredSeconds}`);
      }
      recoveryOpen.delete(item.reqId);
    }
    if (item.event === 'repeat_use' && item.intent === 'intentional-reuse') intentionalReuseAt = item.occurredAt;
    if (item.event === 'pilot_closed') closed = true;
  }

  if (firstReqReady > 1) throw new Error('first_req_ready may occur at most once');
  if (recoveryOpen.size > 0 && requireComplete) throw new Error(`Open recovery observations: ${[...recoveryOpen.keys()].join(', ')}`);
  const completed = [...cycles.entries()].filter(([, cycle]) => cycle.completedAt && cycle.verificationResult === 'pass');
  const failedVerification = [...cycles.entries()].filter(([, cycle]) => cycle.completedAt && cycle.verificationResult !== 'pass');
  if (requireComplete) {
    if (!closed) throw new Error('Complete pilot must contain pilot_closed');
    if (events.at(-1).outcome !== 'completed') throw new Error('Complete pilot must close with outcome=completed');
    if (firstReqReady !== 1) throw new Error('Complete pilot must contain one first_req_ready event');
    if (!cycles.has(firstReqReadyId)) throw new Error('first_req_ready must reference a recorded cycle');
    if (completed.length < 2) throw new Error('Complete pilot requires at least two verified completed cycles');
    if (failedVerification.length > 0) throw new Error('Complete pilot contains a failed verification cycle');
    if ([...cycles.values()].some((cycle) => !cycle.completedAt)) throw new Error('Complete pilot contains an open cycle');
    const durationDays = (Date.parse(events.at(-1).occurredAt) - Date.parse(events[0].occurredAt)) / DAY_MS;
    if (durationDays < 14 || durationDays > 28) throw new Error(`Complete pilot observation must be 14-28 days, got ${durationDays}`);
    if (!intentionalReuseAt) throw new Error('Complete pilot requires an intentional-reuse observation');
    const reuseDay = (Date.parse(intentionalReuseAt) - Date.parse(events[0].occurredAt)) / DAY_MS;
    if (reuseDay < 14) throw new Error(`intentional-reuse must occur on or after day 14, got day ${reuseDay}`);
  }
  return { complete: requireComplete && closed, completedCycles: completed.length, totalCycles: cycles.size };
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

export function summarizeObservation(events, { asOf = new Date().toISOString() } = {}) {
  validateObservation(events, { asOf });
  const start = events[0];
  const cycles = new Map();
  const recoveries = [];
  const incidents = { 'false-block': 0, 'false-miss': 0, 'true-block': 0 };
  let firstReqMinutes = null;
  let repeatIntent = null;
  for (const item of events) {
    if (item.event === 'cycle_started') cycles.set(item.reqId, { reqId: item.reqId, completed: false, verified: false, exemptions: 0 });
    if (item.event === 'cycle_completed') {
      const cycle = cycles.get(item.reqId);
      if (cycle) { cycle.completed = true; cycle.verified = item.verificationResult === 'pass'; }
    }
    if (item.event === 'exemption_used' && cycles.has(item.reqId)) cycles.get(item.reqId).exemptions += 1;
    if (item.event === 'recovery_completed') recoveries.push(item.elapsedSeconds);
    if (item.event === 'incident') incidents[item.classification] += 1;
    if (item.event === 'first_req_ready') firstReqMinutes = item.elapsedMinutes;
    if (item.event === 'repeat_use') repeatIntent = item.intent;
  }
  const completed = [...cycles.values()].filter(({ completed, verified }) => completed && verified);
  const exemptionCount = completed.reduce((sum, cycle) => sum + cycle.exemptions, 0);
  const exemptedCycles = completed.filter(({ exemptions }) => exemptions > 0).length;
  return {
    schemaVersion: 1,
    pilotId: start.pilotId,
    projectType: start.projectType,
    baselineRef: start.baselineRef,
    observation: {
      startedAt: start.occurredAt,
      closedAt: events.find(({ event }) => event === 'pilot_closed')?.occurredAt || null,
      durationDays: (Date.parse(events.at(-1).occurredAt) - Date.parse(start.occurredAt)) / DAY_MS,
    },
    cycles: { total: cycles.size, completedVerified: completed.length },
    firstReqMinutes,
    recovery: { count: recoveries.length, medianSeconds: percentile(recoveries, 0.5), p90Seconds: percentile(recoveries, 0.9) },
    incidents,
    exemptions: {
      count: exemptionCount,
      cyclesWithExemption: exemptedCycles,
      cycleRate: completed.length ? exemptedCycles / completed.length : null,
      perCompletedCycle: completed.length ? exemptionCount / completed.length : null,
    },
    repeatUse: repeatIntent,
  };
}

function resolvePilotPath(value) {
  if (typeof value !== 'string' || path.isAbsolute(value)) throw new Error('Pilot path must be relative');
  const normalized = value.replace(/\\/g, '/');
  if (!normalized.startsWith('.harness/pilot/') || normalized.split('/').some((part) => part === '..' || part === '.')) {
    throw new Error('Pilot path must stay under .harness/pilot/');
  }
  return path.resolve(value);
}

function readArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith('--') || !rest[index + 1] || rest[index + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`);
    options[arg.slice(2)] = rest[++index];
  }
  return { command, options };
}

function assertOptionKeys(options, allowed) {
  const unknown = Object.keys(options).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) throw new Error(`Unknown option(s): ${unknown.map((key) => `--${key}`).join(', ')}`);
}

function numberOption(value, label) {
  const result = Number(value);
  assertNonNegativeNumber(result, label);
  return result;
}

function buildRecord(options) {
  const event = options.event;
  const base = { event, occurredAt: options.at };
  switch (event) {
    case 'first_req_ready':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'req-id', 'elapsed-minutes']);
      return { ...base, reqId: options['req-id'], elapsedMinutes: numberOption(options['elapsed-minutes'], 'elapsedMinutes') };
    case 'cycle_started':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'req-id']);
      return { ...base, reqId: options['req-id'] };
    case 'cycle_completed':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'req-id', 'verification-result']);
      return { ...base, reqId: options['req-id'], verificationResult: options['verification-result'] };
    case 'recovery_started':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'req-id']);
      return { ...base, reqId: options['req-id'] };
    case 'recovery_completed':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'req-id', 'elapsed-seconds', 'outcome']);
      return { ...base, reqId: options['req-id'], elapsedSeconds: numberOption(options['elapsed-seconds'], 'elapsedSeconds'), outcome: options.outcome };
    case 'incident':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'req-id', 'classification', 'severity']);
      return { ...base, ...(options['req-id'] ? { reqId: options['req-id'] } : {}), classification: options.classification, severity: options.severity };
    case 'exemption_used':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'req-id', 'reason-code']);
      return { ...base, reqId: options['req-id'], reasonCode: options['reason-code'] };
    case 'repeat_use':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'intent']);
      return { ...base, intent: options.intent };
    case 'pilot_closed':
      assertOptionKeys(options, ['input', 'event', 'at', 'as-of', 'outcome']);
      return { ...base, outcome: options.outcome };
    default: throw new Error(`Unknown record event: ${String(event)}`);
  }
}

export function main(argv = process.argv.slice(2)) {
  const { command, options } = readArgs(argv);
  if (command === 'init') {
    assertOptionKeys(options, ['pilot-id', 'project-type', 'baseline-ref', 'at', 'output']);
    const output = resolvePilotPath(options.output);
    if (existsSync(output)) throw new Error(`Observation already exists: ${options.output}`);
    const event = { event: 'pilot_started', occurredAt: options.at, pilotId: options['pilot-id'], projectType: options['project-type'], baselineRef: options['baseline-ref'] };
    validateEventShape(event);
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(event)}\n`, 'utf8');
    console.log(`Initialized ${options['pilot-id']} -> ${options.output}`);
    return;
  }
  const input = resolvePilotPath(options.input);
  const events = parseObservation(readFileSync(input, 'utf8'));
  if (command === 'record') {
    const event = buildRecord(options);
    validateEventShape(event);
    validateObservation([...events, event], { asOf: options['as-of'] || new Date().toISOString() });
    appendFileSync(input, `${JSON.stringify(event)}\n`, 'utf8');
    console.log(`Recorded ${event.event} -> ${options.input}`);
    return;
  }
  if (command === 'validate') {
    assertOptionKeys(options, ['input', 'complete', 'as-of']);
    const result = validateObservation(events, { requireComplete: options.complete === 'true', asOf: options['as-of'] || new Date().toISOString() });
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (command === 'summary') {
    assertOptionKeys(options, ['input', 'output', 'as-of']);
    const summary = summarizeObservation(events, { asOf: options['as-of'] || new Date().toISOString() });
    const serialized = `${JSON.stringify(summary, null, 2)}\n`;
    if (options.output) {
      const output = resolvePilotPath(options.output);
      mkdirSync(path.dirname(output), { recursive: true });
      writeFileSync(output, serialized, 'utf8');
    } else process.stdout.write(serialized);
    return summary;
  }
  throw new Error('Usage: pilot-observation <init|record|validate|summary> ...');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error?.message || error); process.exitCode = 1; }
}
