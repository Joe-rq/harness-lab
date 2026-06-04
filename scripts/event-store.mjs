import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
} from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const EVENT_SCHEMA = {
  required: ['id', 'ts', 'type', 'version', 'source', 'sessionId', 'worktree', 'payload'],
  optional: ['reqId', 'phase'],
  sources: ['hook', 'cli', 'manual', 'agent', 'test'],
};

export const EVENT_VERSION = '1.0';
export const EVENT_TYPE_SCHEMAS = Object.freeze({
  // ── REQ 生命周期(已有) ──
  req_created: { payload: { title: 'string' } },
  req_started: { payload: {} },
  req_completed: { payload: {} },
  req_blocked: { payload: { reason: 'string' } },
  // ── 会话(已有) ──
  session_started: { payload: {} },
  session_ended: { payload: {} },
  // ── REQ-075 新增:§7 6 维度遥测 ──
  verifier_blocked: { payload: { verdict: 'string', target_artifact: 'string' } },
  verifier_passed: { payload: { verdict: 'string', target_artifact: 'string' } },
  verifier_failed: { payload: { error: 'string', target_artifact: 'string' } },
  conflict_detected: { payload: { worktree_a: 'string', worktree_b: 'string', req_id: 'string' } },
  retry_attempted: { payload: { req_id: 'string', attempt_number: 'number' } },
  human_decision_made: { payload: { req_id: 'string', decision_summary: 'string' } },
  monthly_verifier_invocation_count: { payload: { count: 'number', cost_usd: 'number' } },
  verifier_degraded: { payload: { reason: 'string', original_mode: 'string' } },
  s3_verifier_cost_alert: { payload: { monthly_cost_usd: 'number', monthly_count: 'number' } },
  // ── REQ-075 新增:观察期专用 ──
  s3_observation_window_start: { payload: { start_ts: 'string', plan: 'string' } },
  s3_observation_window_end: { payload: { end_ts: 'string', actual_duration_days: 'number' } },
  s3_observation_data_recorded: { payload: { week_number: 'number', metrics: 'object' } },
  s3_observation_paused: { payload: { pause_start_ts: 'string', reason: 'string' } },
});

const DEFAULT_EVENTS_DIR = '.claude/events';
const DEFAULT_WORKTREE_EVENTS_ROOT = '.claude/worktrees';
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

function sanitizeNamespace(value) {
  const raw = String(value || 'main').trim() || 'main';
  const sanitized = raw.replace(/[^A-Za-z0-9_.-]/g, '-');
  if (sanitized.length <= 80) return sanitized;
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 10);
  return `${sanitized.slice(0, 69)}-${hash}`;
}

export function getWorktreeNamespace(worktree, options = {}) {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const raw = String(worktree || options.worktree || rootDir).trim();
  if (!raw || raw === rootDir || raw === '.' || raw === 'main') return 'main';

  const normalized = raw.replace(/\\/g, '/');
  const rootNormalized = rootDir.replace(/\\/g, '/');
  let label = normalized;
  if (normalized.startsWith(`${rootNormalized}/`)) {
    label = normalized.slice(rootNormalized.length + 1);
  }
  label = label.split('/').filter(Boolean).join('--');
  return sanitizeNamespace(label || 'main');
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

export function getWorktreeEventsDir(options = {}) {
  if (options.eventsDir) return path.resolve(options.eventsDir);
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const namespace = getWorktreeNamespace(options.worktree || rootDir, { rootDir });
  return path.join(rootDir, DEFAULT_WORKTREE_EVENTS_ROOT, namespace, 'events');
}

export function getEventFilePath(options = {}) {
  const eventsDir = options.eventsDir ? getEventsDir(options) : getWorktreeEventsDir(options);
  const writerId = sanitizeWriterId(options.writerId || options.sessionId || getDefaultSessionId());
  return path.join(eventsDir, `${writerId}.jsonl`);
}

export function buildEvent(input, options = {}) {
  const event = {
    ...input,
    id: input.id || options.idFactory?.() || makeEventId(),
    ts: input.ts || options.now?.() || nowIso(),
    version: input.version || options.version || EVENT_VERSION,
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
  // version 字段校验:必须存在 + 是 semver 字符串
  if (!('version' in event)) {
    issues.push('missing required field: version');
  } else if (typeof event.version !== 'string' || !/^\d+\.\d+(\.\d+)?$/.test(event.version)) {
    issues.push('version must be a semver string (e.g. "1.0")');
  }
  // type 白名单校验:仅对已注册的 type 严格校验 payload;未注册 type 不抛错(向后兼容)只 warn
  if ('type' in event && typeof event.type === 'string' && EVENT_TYPE_SCHEMAS[event.type]) {
    const schema = EVENT_TYPE_SCHEMAS[event.type];
    if (schema.payload && event.payload) {
      for (const [key, expectedType] of Object.entries(schema.payload)) {
        if (!(key in event.payload)) {
          issues.push(`payload.${key} missing for type ${event.type}`);
        } else if (expectedType === 'number' && typeof event.payload[key] !== 'number') {
          issues.push(`payload.${key} must be number for type ${event.type}`);
        } else if (expectedType === 'string' && typeof event.payload[key] !== 'string') {
          issues.push(`payload.${key} must be string for type ${event.type}`);
        } else if (expectedType === 'object' && !isPlainObject(event.payload[key])) {
          issues.push(`payload.${key} must be object for type ${event.type}`);
        }
      }
    }
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
    worktree: event.worktree,
  });
  mkdirSync(path.dirname(filePath), { recursive: true });
  // REQ-075: rotation 检查
  rotateIfNeeded(filePath, options);
  appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

function listEventFiles(options = {}) {
  const eventsDir = getEventsDir(options);
  if (options.files) return options.files.map((file) => path.resolve(file));
  const files = new Set();
  for (const filePath of listJsonlFiles(eventsDir)) {
    files.add(filePath);
  }
  // REQ-075: 同时读 archive 目录(rotation 后的事件也属于可读历史)
  const archiveDir = getArchiveDir(eventsDir);
  for (const filePath of listJsonlFiles(archiveDir)) {
    files.add(filePath);
  }

  // REQ-076: 默认读取还要合并 worktree namespace 下的新事件路径。
  if (!options.eventsDir) {
    for (const source of listWorktreeEventSources(options)) {
      for (const filePath of listJsonlFiles(source.eventsDir)) {
        files.add(filePath);
      }
      const namespaceArchiveDir = getArchiveDir(source.eventsDir);
      for (const filePath of listJsonlFiles(namespaceArchiveDir)) {
        files.add(filePath);
      }
    }
  }
  return [...files];
}

function listJsonlFiles(dirPath) {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => path.join(dirPath, name));
}

export function readEvents(options = {}) {
  const records = [];
  const legacyWarnings = [];
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
        // REQ-075 兼容性:旧事件(2026-05-31 之前写入)无 version 字段,只 warn 不抛错
        const isLegacyVersionMissing = validation.issues.every((issue) => issue.includes('version'));
        if (isLegacyVersionMissing) {
          event.version = event.version || '0.9'; // 旧事件打 0.9 标记
          legacyWarnings.push(`${filePath}:${i + 1}: legacy event without version (auto-filled 0.9)`);
        } else {
          throw new Error(`Invalid event in ${filePath}:${i + 1}: ${validation.issues.join('; ')}`);
        }
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

  if (legacyWarnings.length > 0 && options.warn !== false) {
    for (const w of legacyWarnings) {
      // eslint-disable-next-line no-console
      console.warn(`[event-store] WARN ${w}`);
    }
  }

  return records.map((record) => record.event);
}

function compactItems(items, limit = 8) {
  return items.slice(Math.max(0, items.length - limit));
}

// ── REQ-075: rotation 策略 ──
// 单文件 > MAX_EVENT_LINES 时,把当前文件 move 到 events-archive/YYYY-MM.jsonl
const DEFAULT_MAX_EVENT_LINES = 1000;
const ARCHIVE_DIR = 'events-archive';

function getMaxEventLines(options = {}) {
  if (options.maxEventLines !== undefined) return options.maxEventLines;
  const raw = process.env.MAX_EVENT_LINES;
  if (raw === undefined) return DEFAULT_MAX_EVENT_LINES;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_MAX_EVENT_LINES;
  return parsed;
}

function getArchiveDir(eventsDir) {
  return path.join(path.dirname(eventsDir), ARCHIVE_DIR);
}

function countLines(filePath) {
  if (!existsSync(filePath)) return 0;
  const content = readFileSync(filePath, 'utf8');
  if (!content) return 0;
  return content.split(/\r?\n/).filter((line) => line.trim() !== '').length;
}

function rotateIfNeeded(filePath, options = {}) {
  const maxLines = getMaxEventLines(options);
  if (maxLines === Infinity || maxLines === 0) return filePath;
  const lineCount = countLines(filePath);
  if (lineCount < maxLines) return filePath;

  const eventsDir = path.dirname(filePath);
  const archiveDir = getArchiveDir(eventsDir);
  mkdirSync(archiveDir, { recursive: true });

  const monthStamp = new Date().toISOString().slice(0, 7);
  const fileName = path.basename(filePath, '.jsonl');
  const archivePath = path.join(archiveDir, `${fileName}-${monthStamp}.jsonl`);

  if (existsSync(archivePath)) {
    // 同月已存在 archive,直接 append
    const content = readFileSync(filePath, 'utf8');
    appendFileSync(archivePath, content, 'utf8');
  } else {
    // rename
    renameSync(filePath, archivePath);
  }
  return filePath; // 返回新空文件路径
}

// ── REQ-075: stats 子命令 ──
// 输出 §7 6 维度原始计数 + 启用条件
export function computeEvaluationMetrics(events = []) {
  const counts = {
    verifier_blocked: 0,
    verifier_passed: 0,
    verifier_failed: 0,
    conflict_detected: 0,
    retry_attempted: 0,
    human_decision_made: 0,
    monthly_verifier_invocation_count: 0,
    verifier_degraded: 0,
    s3_verifier_cost_alert: 0,
    s3_observation_window_start: 0,
    s3_observation_window_end: 0,
    s3_observation_data_recorded: 0,
    s3_observation_paused: 0,
    req_started: 0,
    req_completed: 0,
  };
  for (const ev of events) {
    if (ev.type in counts) counts[ev.type] += 1;
  }

  const blocked = counts.verifier_blocked;
  const passed = counts.verifier_passed;
  const interceptions = blocked + passed;
  const completedReqs = counts.req_completed;
  const decisionEvents = counts.human_decision_made;

  return {
    raw_counts: counts,
    metrics: {
      // 维度 1: 失败率
      failure_rate: {
        numerator: counts.verifier_failed + counts.retry_attempted,
        denominator: completedReqs,
        enabled: completedReqs >= 3,
        value: completedReqs > 0
          ? (counts.verifier_failed + counts.retry_attempted) / completedReqs
          : 0,
        threshold: 0.30,
        unit: 'ratio',
      },
      // 维度 2: 并行 REQ(简化为 req_started 计数;时间窗口聚合留给后续 REQ)
      parallel_req_count: {
        value: counts.req_started,
        enabled: counts.req_started >= 1,
        threshold: 3,
        unit: 'count',
        note: '时间窗口聚合需后续 REQ 补强',
      },
      // 维度 3: 拦截率
      interception_rate: {
        numerator: blocked,
        denominator: interceptions,
        enabled: interceptions >= 5,
        value: interceptions > 0 ? blocked / interceptions : 0,
        threshold: 0.20,
        unit: 'ratio',
      },
      // 维度 4: 冲突次数
      conflict_count: {
        value: counts.conflict_detected,
        enabled: true,
        threshold: null,
        unit: 'count',
      },
      // 维度 5: 人工调度成本(决策时间)
      decision_time: {
        value: decisionEvents,
        enabled: decisionEvents >= 5,
        threshold: 20,
        unit: 'minutes/req',
        note: '实际分钟数需 REQ-076+ 落 human_decision_made 的 elapsed 字段',
      },
      // 维度 6: 主观诚实(由 user 密封预期文件手动对比)
      subjective_honesty: {
        enabled: true,
        value: 'see sealed expectation',
        threshold: null,
        unit: 'qualitative',
      },
    },
  };
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
  const mainNamespacedEventsDir = getWorktreeEventsDir({ rootDir, worktree: 'main' });
  const mainFiles = [
    ...listJsonlFiles(mainEventsDir),
    ...listJsonlFiles(getArchiveDir(mainEventsDir)),
    ...listJsonlFiles(mainNamespacedEventsDir),
    ...listJsonlFiles(getArchiveDir(mainNamespacedEventsDir)),
  ];

  if (mainFiles.length > 0) {
    sources.push({
      worktree: 'main',
      eventsDir: mainNamespacedEventsDir,
      files: mainFiles,
    });
  }

  const worktreesDir = path.join(rootDir, '.claude', 'worktrees');
  if (!existsSync(worktreesDir)) return sources;

  for (const entry of readdirSync(worktreesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'main') continue;
    const eventsDir = path.join(worktreesDir, entry.name, 'events');
    const files = [
      ...listJsonlFiles(eventsDir),
      ...listJsonlFiles(getArchiveDir(eventsDir)),
    ];
    if (files.length === 0 && !existsSync(eventsDir)) continue;
    sources.push({
      worktree: entry.name,
      eventsDir,
      files,
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
        files: source.files,
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

// ── REQ-075: CLI handler ──
// 用法: node scripts/event-store.mjs stats [--metrics] [--json]
//       node scripts/event-store.mjs read [--since <duration>]
function parseCliArgs(argv) {
  const args = { command: null, options: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === 'stats' || token === 'read') {
      args.command = token;
    } else if (token === '--metrics') {
      args.options.metrics = true;
    } else if (token === '--json') {
      args.options.json = true;
    } else if (token === '--since') {
      args.options.since = argv[++i];
    } else if (token === '--help' || token === '-h') {
      args.options.help = true;
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write(`Usage: node scripts/event-store.mjs <command> [options]

Commands:
  read                      Read all events, sorted by timestamp.
  stats [--metrics] [--json]
                            Print raw event counts; with --metrics, also
                            print §7 evaluation metrics with thresholds.

Options:
  --since <duration>        Filter read to events newer than <duration> (e.g. 14d, 7d, 24h).
  --json                    Emit JSON instead of human-readable text.
  --help, -h                Show this help.

Environment:
  MAX_EVENT_LINES           Soft cap per file before rotation (default 1000).
  HARNESS_SESSION_ID        Session id used in event.sessionId (falls back to session-main).
`);
}

function runCli(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv);
  if (args.options.help || !args.command) {
    printHelp();
    return args.command ? 0 : 1;
  }

  if (args.command === 'read') {
    const events = readEvents();
    let filtered = events;
    if (args.options.since) {
      const m = /^(\d+)([dhm])$/.exec(args.options.since);
      if (!m) {
        process.stderr.write(`Invalid --since value: ${args.options.since}\n`);
        return 2;
      }
      const n = Number.parseInt(m[1], 10);
      const unit = m[2];
      const ms = n * (unit === 'd' ? 86_400_000 : unit === 'h' ? 3_600_000 : 60_000);
      const cutoff = Date.now() - ms;
      filtered = events.filter((ev) => Date.parse(ev.ts) >= cutoff);
    }
    if (args.options.json) {
      process.stdout.write(`${JSON.stringify(filtered, null, 2)}\n`);
    } else {
      for (const ev of filtered) {
        process.stdout.write(`${ev.ts} ${ev.type} ${ev.sessionId} ${ev.reqId || '-'}\n`);
      }
    }
    return 0;
  }

  if (args.command === 'stats') {
    const events = readEvents();
    const result = computeEvaluationMetrics(events);
    if (args.options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`Total events: ${events.length}\n\n`);
      process.stdout.write('Raw counts:\n');
      for (const [type, count] of Object.entries(result.raw_counts)) {
        process.stdout.write(`  ${type}: ${count}\n`);
      }
      if (args.options.metrics) {
        process.stdout.write('\n§7 Evaluation metrics:\n');
        for (const [name, m] of Object.entries(result.metrics)) {
          const value = typeof m.value === 'number' ? m.value.toFixed(3) : m.value;
          process.stdout.write(
            `  ${name}: ${value} ${m.unit || ''}`
            + ` (enabled=${m.enabled}, threshold=${m.threshold === null ? 'N/A' : m.threshold})`
            + (m.note ? `  # ${m.note}` : '')
            + '\n',
          );
        }
      }
    }
    return 0;
  }

  process.stderr.write(`Unknown command: ${args.command}\n`);
  return 2;
}

// 允许作为模块导入时跑 CLI(给 npm script 调用)
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('event-store.mjs')) {
  const code = runCli();
  if (typeof process !== 'undefined') process.exit(code);
}
