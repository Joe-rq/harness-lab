import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const EVENT_SCHEMA = {
  required: ['id', 'ts', 'type', 'source', 'sessionId', 'worktree', 'payload'],
  optional: ['reqId', 'phase'],
  sources: ['hook', 'cli', 'manual', 'agent', 'test'],
};

const DEFAULT_EVENTS_DIR = '.claude/events';
const MAX_EVENT_BYTES = 16 * 1024;
const TYPE_RE = /^[a-z][a-z0-9_-]*$/;
const EVENT_ID_RE = /^evt_[A-Za-z0-9_.:-]+$/;
let eventCounter = 0;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeWriterId(value) {
  const raw = String(value || 'session-main').trim() || 'session-main';
  return raw.replace(/[^A-Za-z0-9_.-]/g, '-').replace(/-+/g, '-').slice(0, 80);
}

function getDefaultSessionId() {
  return process.env.HARNESS_SESSION_ID
    || process.env.CLAUDE_SESSION_ID
    || process.env.CODEX_SESSION_ID
    || 'session-main';
}

function nowIso() {
  return new Date().toISOString();
}

function makeEventId() {
  eventCounter += 1;
  return `evt_${Date.now().toString(36)}_${eventCounter.toString(36).padStart(4, '0')}_${randomUUID()}`;
}

export function getEventsDir(options = {}) {
  if (options.eventsDir) return path.resolve(options.eventsDir);
  return path.join(options.rootDir || process.cwd(), DEFAULT_EVENTS_DIR);
}

export function getEventFilePath(options = {}) {
  const eventsDir = getEventsDir(options);
  const writerId = sanitizeWriterId(options.writerId || options.sessionId || getDefaultSessionId());
  return path.join(eventsDir, `${writerId}.jsonl`);
}

export function buildEvent(input, options = {}) {
  const event = {
    ...input,
    id: input.id || options.idFactory?.() || makeEventId(),
    ts: input.ts || options.now?.() || nowIso(),
    source: input.source || options.source || 'manual',
    sessionId: input.sessionId || options.sessionId || getDefaultSessionId(),
    worktree: input.worktree || options.worktree || options.rootDir || process.cwd(),
    payload: input.payload ?? {},
  };
  return event;
}

export function validateEvent(event) {
  const issues = [];

  if (!isPlainObject(event)) {
    return { ok: false, issues: ['event must be an object'] };
  }

  for (const field of EVENT_SCHEMA.required) {
    if (!(field in event)) issues.push(`missing required field: ${field}`);
  }

  const allowed = new Set([...EVENT_SCHEMA.required, ...EVENT_SCHEMA.optional]);
  for (const field of Object.keys(event)) {
    if (!allowed.has(field)) issues.push(`unknown field: ${field}`);
  }

  if ('id' in event && (typeof event.id !== 'string' || !EVENT_ID_RE.test(event.id))) {
    issues.push('id must be a string starting with evt_');
  }
  if ('ts' in event && (typeof event.ts !== 'string' || Number.isNaN(Date.parse(event.ts)))) {
    issues.push('ts must be an ISO timestamp string');
  }
  if ('type' in event && (typeof event.type !== 'string' || !TYPE_RE.test(event.type))) {
    issues.push('type must be a lowercase event token');
  }
  if ('source' in event && !EVENT_SCHEMA.sources.includes(event.source)) {
    issues.push(`source must be one of: ${EVENT_SCHEMA.sources.join(', ')}`);
  }
  if ('sessionId' in event && (typeof event.sessionId !== 'string' || event.sessionId.trim() === '')) {
    issues.push('sessionId must be a non-empty string');
  }
  if ('worktree' in event && (typeof event.worktree !== 'string' || event.worktree.trim() === '')) {
    issues.push('worktree must be a non-empty string');
  }
  if ('payload' in event && !isPlainObject(event.payload)) {
    issues.push('payload must be an object');
  }
  if ('reqId' in event && event.reqId !== undefined && typeof event.reqId !== 'string') {
    issues.push('reqId must be a string when present');
  }
  if ('phase' in event && event.phase !== undefined && typeof event.phase !== 'string') {
    issues.push('phase must be a string when present');
  }

  try {
    const bytes = Buffer.byteLength(JSON.stringify(event), 'utf8');
    if (bytes > MAX_EVENT_BYTES) issues.push(`event exceeds ${MAX_EVENT_BYTES} bytes`);
  } catch {
    issues.push('event must be JSON serializable');
  }

  return { ok: issues.length === 0, issues };
}

export function appendEvent(input, options = {}) {
  const event = buildEvent(input, options);
  const validation = validateEvent(event);
  if (!validation.ok) {
    throw new Error(`Invalid event: ${validation.issues.join('; ')}`);
  }

  const filePath = getEventFilePath({
    ...options,
    sessionId: event.sessionId,
  });
  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

function listEventFiles(options = {}) {
  const eventsDir = getEventsDir(options);
  if (options.files) return options.files.map((file) => path.resolve(file));
  if (!existsSync(eventsDir)) return [];
  return readdirSync(eventsDir)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => path.join(eventsDir, name));
}

export function readEvents(options = {}) {
  const records = [];
  for (const filePath of listEventFiles(options)) {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let event;
      try {
        event = JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSON in ${filePath}:${i + 1}: ${error.message}`);
      }

      const validation = validateEvent(event);
      if (!validation.ok) {
        throw new Error(`Invalid event in ${filePath}:${i + 1}: ${validation.issues.join('; ')}`);
      }

      records.push({ event, filePath, line: i + 1 });
    }
  }

  records.sort((a, b) => {
    const tsCmp = a.event.ts.localeCompare(b.event.ts);
    if (tsCmp !== 0) return tsCmp;
    const idCmp = a.event.id.localeCompare(b.event.id);
    if (idCmp !== 0) return idCmp;
    const fileCmp = a.filePath.localeCompare(b.filePath);
    if (fileCmp !== 0) return fileCmp;
    return a.line - b.line;
  });

  return records.map((record) => record.event);
}

function compactItems(items, limit = 8) {
  return items.slice(Math.max(0, items.length - limit));
}

function formatReqLabel(event) {
  const title = event.payload?.title ? `: ${event.payload.title}` : '';
  return `${event.reqId || 'unknown'}${title}`;
}

export function buildProgressProjection(options = {}) {
  const events = options.events || readEvents(options);
  if (events.length === 0) return null;

  const progress = {
    activeReq: 'none',
    phase: 'idle',
    lastUpdated: '',
    summary: [],
    nextSteps: [],
    blockers: [],
    source: 'events',
    eventCount: events.length,
  };

  for (const event of events) {
    progress.lastUpdated = event.ts ? event.ts.slice(0, 10) : progress.lastUpdated;

    if (event.type === 'req_created') {
      progress.activeReq = event.reqId || progress.activeReq;
      progress.phase = event.phase || 'design';
      progress.blockers = [];
      progress.summary.push(`REQ created: ${formatReqLabel(event)}`);
      progress.nextSteps = event.reqId ? [`Start REQ: ${event.reqId}`] : [];
    } else if (event.type === 'req_started') {
      const phase = event.phase || event.payload?.phase || 'implementation';
      progress.activeReq = event.reqId || progress.activeReq;
      progress.phase = phase;
      progress.blockers = [];
      progress.summary.push(`Active REQ: ${event.reqId || 'unknown'} (${phase})`);
      progress.nextSteps = event.reqId ? [`Continue active REQ: ${event.reqId}`] : [];
    } else if (event.type === 'req_blocked') {
      const reason = event.payload?.reason || 'Blocked without recorded reason';
      progress.activeReq = event.reqId || progress.activeReq;
      progress.phase = 'blocked';
      progress.blockers = [reason];
      progress.summary.push(`REQ blocked: ${event.reqId || 'unknown'}`);
      progress.nextSteps = event.reqId ? [`Resolve blocker for ${event.reqId}`] : [];
    } else if (event.type === 'req_completed') {
      progress.summary.push(`REQ completed: ${event.reqId || 'unknown'}`);
      if (!event.reqId || event.reqId === progress.activeReq) {
        progress.activeReq = 'none';
        progress.phase = 'idle';
        progress.blockers = [];
        progress.nextSteps = ['Select next REQ'];
      }
    }
  }

  progress.summary = compactItems(progress.summary);
  return progress;
}

function listWorktreeEventSources(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const sources = [];
  const mainEventsDir = path.join(rootDir, DEFAULT_EVENTS_DIR);

  if (existsSync(mainEventsDir)) {
    sources.push({
      worktree: 'main',
      eventsDir: mainEventsDir,
    });
  }

  const worktreesDir = path.join(rootDir, '.claude', 'worktrees');
  if (!existsSync(worktreesDir)) return sources;

  for (const entry of readdirSync(worktreesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const eventsDir = path.join(worktreesDir, entry.name, 'events');
    if (!existsSync(eventsDir)) continue;
    sources.push({
      worktree: entry.name,
      eventsDir,
    });
  }

  return sources;
}

function findWorktreeConflicts(worktrees) {
  const conflicts = [];
  const activeByReq = new Map();

  for (const item of worktrees) {
    if (item.error) {
      conflicts.push({
        type: 'projection_error',
        worktree: item.worktree,
        message: item.error,
      });
      continue;
    }

    const activeReq = item.projection?.activeReq;
    if (!activeReq || activeReq === 'none') continue;
    const owners = activeByReq.get(activeReq) || [];
    owners.push(item.worktree);
    activeByReq.set(activeReq, owners);
  }

  for (const [reqId, owners] of activeByReq.entries()) {
    if (owners.length > 1) {
      conflicts.push({
        type: 'duplicate_active_req',
        reqId,
        worktrees: owners,
      });
    }
  }

  return conflicts;
}

export function buildWorktreeProgressProjections(options = {}) {
  const sources = options.sources || listWorktreeEventSources(options);
  const worktrees = [];

  for (const source of sources) {
    try {
      const projection = buildProgressProjection({
        ...options,
        eventsDir: source.eventsDir,
      });
      if (!projection) continue;
      worktrees.push({
        worktree: source.worktree,
        eventsDir: source.eventsDir,
        projection,
        error: null,
      });
    } catch (error) {
      worktrees.push({
        worktree: source.worktree,
        eventsDir: source.eventsDir,
        projection: null,
        error: error.message,
      });
    }
  }

  return {
    worktrees,
    conflicts: findWorktreeConflicts(worktrees),
  };
}
