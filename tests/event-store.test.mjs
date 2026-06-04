import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  appendEvent,
  buildProgressProjection,
  buildWorktreeProgressProjections,
  getEventFilePath,
  getWorktreeNamespace,
  readEvents,
  validateEvent,
} from '../scripts/event-store.mjs';

function tempDir(prefix) {
  return mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

function testAppendAddsDefaultsAndWritesJsonl() {
  const root = tempDir('event-store-append');
  try {
    const event = appendEvent({
      type: 'req_started',
      reqId: 'REQ-2026-070',
      phase: 'implementation',
      source: 'cli',
      payload: { title: 'Stage 2' },
    }, {
      rootDir: root,
      sessionId: 'session-a',
      worktree: 'main',
      now: () => '2026-05-31T00:00:00.000Z',
      idFactory: () => 'evt_test_append',
    });

    assert.equal(event.id, 'evt_test_append');
    assert.equal(event.ts, '2026-05-31T00:00:00.000Z');
    assert.equal(event.sessionId, 'session-a');
    assert.equal(event.worktree, 'main');

    const eventFile = getEventFilePath({ rootDir: root, sessionId: 'session-a', worktree: 'main' });
    assert.equal(
      eventFile,
      path.join(root, '.claude', 'worktrees', 'main', 'events', 'session-a.jsonl')
    );
    const lines = readFileSync(eventFile, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    assert.deepEqual(JSON.parse(lines[0]), event);
  } finally {
    cleanup(root);
  }
}

function testRejectsBadEventBeforeWrite() {
  const root = tempDir('event-store-bad');
  try {
    assert.throws(() => appendEvent({
      type: 'req_started',
      source: 'cli',
      payload: 'not an object',
    }, {
      rootDir: root,
      sessionId: 'session-a',
      worktree: 'main',
      idFactory: () => 'evt_bad_payload',
    }), /payload must be an object/);

    const eventFile = getEventFilePath({ rootDir: root, sessionId: 'session-a', worktree: 'main' });
    assert.equal(existsSync(eventFile), false);
  } finally {
    cleanup(root);
  }
}

function testValidateReportsMissingFields() {
  const result = validateEvent({ type: 'req_started', payload: {} });
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('missing required field: id'));
  assert.ok(result.issues.includes('missing required field: ts'));
  assert.ok(result.issues.includes('missing required field: source'));
}

function testReadEventsMergesAndSortsTwoFiles() {
  const root = tempDir('event-store-read');
  try {
    appendEvent({
      type: 'req_completed',
      source: 'cli',
      reqId: 'REQ-2026-069',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'session-b',
      worktree: 'main',
      now: () => '2026-05-31T00:00:02.000Z',
      idFactory: () => 'evt_002',
    });
    appendEvent({
      type: 'req_started',
      source: 'cli',
      reqId: 'REQ-2026-070',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'session-a',
      worktree: 'main',
      now: () => '2026-05-31T00:00:01.000Z',
      idFactory: () => 'evt_001',
    });

    const events = readEvents({ rootDir: root });
    assert.deepEqual(events.map((event) => event.id), ['evt_001', 'evt_002']);
    assert.deepEqual(events.map((event) => event.sessionId), ['session-a', 'session-b']);
  } finally {
    cleanup(root);
  }
}

function testWorktreeNamespaceIsStableAndSanitized() {
  const root = tempDir('event-store-namespace');
  try {
    assert.equal(getWorktreeNamespace('main', { rootDir: root }), 'main');
    assert.equal(getWorktreeNamespace(path.join(root, 'feature/a'), { rootDir: root }), 'feature--a');
    assert.equal(getWorktreeNamespace('feature/a', { rootDir: root }), 'feature--a');
    assert.equal(getWorktreeNamespace('feature:a?', { rootDir: root }), 'feature-a-');
  } finally {
    cleanup(root);
  }
}

function testSameSessionWritesToSeparateWorktreeNamespaces() {
  const root = tempDir('event-store-namespace-write');
  try {
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-TEST-A',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'shared-session',
      worktree: 'feature/a',
      now: () => '2026-06-04T00:00:01.000Z',
      idFactory: () => 'evt_namespace_a',
    });
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-TEST-B',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'shared-session',
      worktree: 'feature/b',
      now: () => '2026-06-04T00:00:02.000Z',
      idFactory: () => 'evt_namespace_b',
    });

    const pathA = getEventFilePath({ rootDir: root, sessionId: 'shared-session', worktree: 'feature/a' });
    const pathB = getEventFilePath({ rootDir: root, sessionId: 'shared-session', worktree: 'feature/b' });
    assert.notEqual(pathA, pathB);
    assert.ok(pathA.endsWith(path.join('.claude', 'worktrees', 'feature--a', 'events', 'shared-session.jsonl')));
    assert.ok(pathB.endsWith(path.join('.claude', 'worktrees', 'feature--b', 'events', 'shared-session.jsonl')));
    assert.equal(existsSync(pathA), true);
    assert.equal(existsSync(pathB), true);

    const events = readEvents({ rootDir: root, warn: false });
    assert.deepEqual(events.map((event) => event.reqId), ['REQ-TEST-A', 'REQ-TEST-B']);
  } finally {
    cleanup(root);
  }
}

function testReadEventsIncludesLegacyMainNamespaceAndArchiveFiles() {
  const root = tempDir('event-store-read-compat');
  try {
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-LEGACY',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: root,
      eventsDir: path.join(root, '.claude', 'events'),
      sessionId: 'legacy-session',
      worktree: 'main',
      now: () => '2026-06-04T00:00:01.000Z',
      idFactory: () => 'evt_legacy_main_path',
    });
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-NAMESPACE',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'namespace-session',
      worktree: 'feature/a',
      now: () => '2026-06-04T00:00:02.000Z',
      idFactory: () => 'evt_namespace_path',
    });
    appendEvent({
      type: 'req_completed',
      source: 'test',
      reqId: 'REQ-ARCHIVE',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'archive-session',
      worktree: 'feature/archive',
      now: () => '2026-06-04T00:00:03.000Z',
      idFactory: () => 'evt_archive_path',
      maxEventLines: 1,
    });
    appendEvent({
      type: 'session_started',
      source: 'test',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'archive-session',
      worktree: 'feature/archive',
      now: () => '2026-06-04T00:00:04.000Z',
      idFactory: () => 'evt_archive_current',
      maxEventLines: 1,
    });

    const events = readEvents({ rootDir: root, warn: false });
    assert.deepEqual(
      events.map((event) => event.id),
      ['evt_legacy_main_path', 'evt_namespace_path', 'evt_archive_path', 'evt_archive_current']
    );
  } finally {
    cleanup(root);
  }
}

function testAppendPerformanceUnder50ms() {
  const root = tempDir('event-store-perf');
  try {
    const start = process.hrtime.bigint();
    appendEvent({
      type: 'session_started',
      source: 'test',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'session-perf',
      worktree: 'main',
      idFactory: () => 'evt_perf',
    });
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    assert.ok(elapsedMs < 50, `append took ${elapsedMs.toFixed(2)}ms`);
  } finally {
    cleanup(root);
  }
}

function testBuildProgressProjectionFromLifecycleEvents() {
  const events = [
    {
      id: 'evt_001',
      ts: '2026-05-31T00:00:01.000Z',
      type: 'req_created',
      source: 'cli',
      sessionId: 'session-a',
      worktree: 'main',
      reqId: 'REQ-2026-072',
      payload: { title: 'Stage 2: progress projection' },
    },
    {
      id: 'evt_002',
      ts: '2026-05-31T00:00:02.000Z',
      type: 'req_started',
      source: 'cli',
      sessionId: 'session-a',
      worktree: 'main',
      reqId: 'REQ-2026-072',
      phase: 'implementation',
      payload: {},
    },
  ];

  const projection = buildProgressProjection({ events });
  assert.equal(projection.activeReq, 'REQ-2026-072');
  assert.equal(projection.phase, 'implementation');
  assert.equal(projection.lastUpdated, '2026-05-31');
  assert.deepEqual(projection.nextSteps, ['Continue active REQ: REQ-2026-072']);
  assert.ok(projection.summary.some((item) => item.includes('Active REQ: REQ-2026-072')));
}

function testBuildProgressProjectionHandlesBlockedAndCompleted() {
  const events = [
    {
      id: 'evt_001',
      ts: '2026-05-31T00:00:01.000Z',
      type: 'req_started',
      source: 'cli',
      sessionId: 'session-a',
      worktree: 'main',
      reqId: 'REQ-2026-072',
      phase: 'implementation',
      payload: {},
    },
    {
      id: 'evt_002',
      ts: '2026-05-31T00:00:02.000Z',
      type: 'req_blocked',
      source: 'cli',
      sessionId: 'session-a',
      worktree: 'main',
      reqId: 'REQ-2026-072',
      phase: 'blocked',
      payload: { reason: 'waiting for review' },
    },
  ];

  const blockedProjection = buildProgressProjection({ events });
  assert.equal(blockedProjection.activeReq, 'REQ-2026-072');
  assert.equal(blockedProjection.phase, 'blocked');
  assert.deepEqual(blockedProjection.blockers, ['waiting for review']);

  const completedProjection = buildProgressProjection({
    events: [
      ...events,
      {
        id: 'evt_003',
        ts: '2026-05-31T00:00:03.000Z',
        type: 'req_completed',
        source: 'cli',
        sessionId: 'session-a',
        worktree: 'main',
        reqId: 'REQ-2026-072',
        payload: {},
      },
    ],
  });
  assert.equal(completedProjection.activeReq, 'none');
  assert.equal(completedProjection.phase, 'idle');
  assert.deepEqual(completedProjection.blockers, []);
}

function testBuildWorktreeProgressProjectionsAggregatesIndependentEvents() {
  const root = tempDir('event-store-worktrees');
  try {
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-2026-100',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'main-session',
      worktree: 'main',
      now: () => '2026-05-31T00:00:01.000Z',
      idFactory: () => 'evt_wt_main',
    });
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-2026-200',
      phase: 'review',
      payload: {},
    }, {
      rootDir: root,
      eventsDir: path.join(root, '.claude', 'worktrees', 'feature-a', 'events'),
      sessionId: 'feature-a-session',
      worktree: 'feature-a',
      now: () => '2026-05-31T00:00:02.000Z',
      idFactory: () => 'evt_wt_feature_a',
    });
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-2026-200',
      phase: 'qa',
      payload: {},
    }, {
      rootDir: root,
      eventsDir: path.join(root, '.claude', 'worktrees', 'feature-b', 'events'),
      sessionId: 'feature-b-session',
      worktree: 'feature-b',
      now: () => '2026-05-31T00:00:03.000Z',
      idFactory: () => 'evt_wt_feature_b',
    });

    const aggregation = buildWorktreeProgressProjections({ rootDir: root });
    assert.deepEqual(
      aggregation.worktrees.map((item) => item.worktree),
      ['main', 'feature-a', 'feature-b']
    );
    assert.deepEqual(
      aggregation.worktrees.map((item) => item.projection.activeReq),
      ['REQ-2026-100', 'REQ-2026-200', 'REQ-2026-200']
    );
    assert.ok(aggregation.conflicts.some((item) => item.type === 'duplicate_active_req'));
  } finally {
    cleanup(root);
  }
}

function testBuildWorktreeProgressProjectionsIsolatesBadEventFiles() {
  const root = tempDir('event-store-worktree-bad');
  try {
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-2026-300',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: root,
      eventsDir: path.join(root, '.claude', 'worktrees', 'feature-ok', 'events'),
      sessionId: 'feature-ok-session',
      worktree: 'feature-ok',
      now: () => '2026-05-31T00:00:01.000Z',
      idFactory: () => 'evt_wt_feature_ok',
    });

    const badDir = path.join(root, '.claude', 'worktrees', 'feature-bad', 'events');
    mkdirSync(badDir, { recursive: true });
    writeFileSync(path.join(badDir, 'bad.jsonl'), '{bad json}\n', 'utf8');

    const aggregation = buildWorktreeProgressProjections({ rootDir: root });
    const ok = aggregation.worktrees.find((item) => item.worktree === 'feature-ok');
    const bad = aggregation.worktrees.find((item) => item.worktree === 'feature-bad');
    assert.equal(ok.projection.activeReq, 'REQ-2026-300');
    assert.match(bad.error, /Invalid JSON/);
    assert.ok(aggregation.conflicts.some((item) => item.type === 'projection_error'));
  } finally {
    cleanup(root);
  }
}

function testStage2RevalidationUsesDefaultNamespacedWrites() {
  const root = tempDir('event-store-stage2-revalidation');
  try {
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-TEST-A',
      phase: 'implementation',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'shared-session',
      worktree: 'feature/a',
      now: () => '2026-06-04T00:00:01.000Z',
      idFactory: () => 'evt_stage2_a',
    });
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-TEST-B',
      phase: 'review',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'shared-session',
      worktree: 'feature/b',
      now: () => '2026-06-04T00:00:02.000Z',
      idFactory: () => 'evt_stage2_b',
    });
    appendEvent({
      type: 'req_started',
      source: 'test',
      reqId: 'REQ-TEST-A',
      phase: 'qa',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'shared-session',
      worktree: 'feature/c',
      now: () => '2026-06-04T00:00:03.000Z',
      idFactory: () => 'evt_stage2_c',
    });

    const aggregation = buildWorktreeProgressProjections({ rootDir: root });
    const activeByWorktree = Object.fromEntries(
      aggregation.worktrees.map((item) => [item.worktree, item.projection.activeReq])
    );
    assert.equal(activeByWorktree['feature--a'], 'REQ-TEST-A');
    assert.equal(activeByWorktree['feature--b'], 'REQ-TEST-B');
    assert.equal(activeByWorktree['feature--c'], 'REQ-TEST-A');
    assert.deepEqual(
      aggregation.conflicts,
      [{
        type: 'duplicate_active_req',
        reqId: 'REQ-TEST-A',
        worktrees: ['feature--a', 'feature--c'],
      }]
    );

    const pathA = getEventFilePath({ rootDir: root, sessionId: 'shared-session', worktree: 'feature/a' });
    const pathB = getEventFilePath({ rootDir: root, sessionId: 'shared-session', worktree: 'feature/b' });
    const pathC = getEventFilePath({ rootDir: root, sessionId: 'shared-session', worktree: 'feature/c' });
    assert.equal(readFileSync(pathA, 'utf8').trim().split('\n').length, 1);
    assert.equal(readFileSync(pathB, 'utf8').trim().split('\n').length, 1);
    assert.equal(readFileSync(pathC, 'utf8').trim().split('\n').length, 1);
  } finally {
    cleanup(root);
  }
}

testAppendAddsDefaultsAndWritesJsonl();
testRejectsBadEventBeforeWrite();
testValidateReportsMissingFields();
testReadEventsMergesAndSortsTwoFiles();
testWorktreeNamespaceIsStableAndSanitized();
testSameSessionWritesToSeparateWorktreeNamespaces();
testReadEventsIncludesLegacyMainNamespaceAndArchiveFiles();
testAppendPerformanceUnder50ms();
testBuildProgressProjectionFromLifecycleEvents();
testBuildProgressProjectionHandlesBlockedAndCompleted();
testBuildWorktreeProgressProjectionsAggregatesIndependentEvents();
testBuildWorktreeProgressProjectionsIsolatesBadEventFiles();
testStage2RevalidationUsesDefaultNamespacedWrites();

// ── REQ-2026-075 新增测试 ──

function testVersionFieldAutoInjected() {
  const root = tempDir('event-store-version');
  try {
    const event = appendEvent({
      type: 'req_started',
      source: 'cli',
      reqId: 'REQ-2026-075',
      payload: {},
    }, {
      rootDir: root,
      sessionId: 'session-version',
      worktree: 'main',
      idFactory: () => 'evt_version',
    });
    assert.equal(event.version, '1.0');
  } finally {
    cleanup(root);
  }
}

function testVersionRequiredInValidation() {
  const result = validateEvent({
    id: 'evt_x', ts: '2026-06-03T00:00:00.000Z',
    type: 'req_started', source: 'cli',
    sessionId: 's', worktree: 'main', payload: {},
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.includes('version')));
}

function testTypeSchemaValidationPassesAndFails() {
  // 合法:verifier_blocked payload 字段齐全
  const good = validateEvent({
    id: 'evt_a', ts: '2026-06-03T00:00:00.000Z',
    type: 'verifier_blocked', version: '1.0', source: 'hook',
    sessionId: 's', worktree: 'main',
    payload: { verdict: 'fail', target_artifact: 'REQ-2026-075/design.md' },
  });
  assert.equal(good.ok, true, `expected ok, got issues: ${JSON.stringify(good.issues)}`);

  // 非法:verifier_blocked 缺 payload.verdict
  const bad = validateEvent({
    id: 'evt_b', ts: '2026-06-03T00:00:00.000Z',
    type: 'verifier_blocked', version: '1.0', source: 'hook',
    sessionId: 's', worktree: 'main',
    payload: { target_artifact: 'x' },
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.some((i) => i.includes('payload.verdict')));

  // 非法:verifier_blocked 的 verdict 类型错
  const wrongType = validateEvent({
    id: 'evt_c', ts: '2026-06-03T00:00:00.000Z',
    type: 'verifier_blocked', version: '1.0', source: 'hook',
    sessionId: 's', worktree: 'main',
    payload: { verdict: 123, target_artifact: 'x' },
  });
  assert.equal(wrongType.ok, false);
  assert.ok(wrongType.issues.some((i) => i.includes('payload.verdict')));
}

function testAllThirteenNewTypesAreRegistered() {
  // 13 个新 type 都在 EVENT_TYPE_SCHEMAS 中(从被测模块 import)
  const expected = [
    'verifier_blocked', 'verifier_passed', 'verifier_failed',
    'conflict_detected', 'retry_attempted', 'human_decision_made',
    'monthly_verifier_invocation_count', 'verifier_degraded', 's3_verifier_cost_alert',
    's3_observation_window_start', 's3_observation_window_end',
    's3_observation_data_recorded', 's3_observation_paused',
  ];
  // 通过 appendEvent 走一遍,每个 type 至少能写
  for (const type of expected) {
    const ev = appendEvent({
      type, source: 'test',
      payload: typeDefaultPayload(type),
    }, {
      rootDir: tempDir(`event-store-type-${type}`),
      sessionId: `s-${type}`, worktree: 'main',
      idFactory: () => `evt_${type}`,
    });
    assert.equal(ev.type, type);
    assert.equal(ev.version, '1.0');
  }
}

function typeDefaultPayload(type) {
  const defaults = {
    verifier_blocked: { verdict: 'fail', target_artifact: 'x' },
    verifier_passed: { verdict: 'pass', target_artifact: 'x' },
    verifier_failed: { error: 'crash', target_artifact: 'x' },
    conflict_detected: { worktree_a: 'a', worktree_b: 'b', req_id: 'r' },
    retry_attempted: { req_id: 'r', attempt_number: 2 },
    human_decision_made: { req_id: 'r', decision_summary: 'go' },
    monthly_verifier_invocation_count: { count: 10, cost_usd: 0.23 },
    verifier_degraded: { reason: 'subagent unavailable', original_mode: 'subagent' },
    s3_verifier_cost_alert: { monthly_cost_usd: 6.0, monthly_count: 250 },
    s3_observation_window_start: { start_ts: '2026-06-03T00:00:00.000Z', plan: 'obs' },
    s3_observation_window_end: { end_ts: '2026-06-17T00:00:00.000Z', actual_duration_days: 14 },
    s3_observation_data_recorded: { week_number: 1, metrics: { ok: true } },
    s3_observation_paused: { pause_start_ts: '2026-06-10T00:00:00.000Z', reason: 'vacation' },
  };
  return defaults[type] || {};
}

function testRotationMovesFileWhenLimitExceeded() {
  const root = tempDir('event-store-rotation');
  try {
    // 用 maxEventLines=2 强制触发 rotation
    for (let i = 0; i < 3; i += 1) {
      appendEvent({
        type: 'verifier_passed', source: 'test',
        payload: { verdict: 'pass', target_artifact: `art-${i}` },
      }, {
        rootDir: root, sessionId: 's-rotate', worktree: 'main',
        idFactory: () => `evt_rot_${i}`,
        maxEventLines: 2,
      });
    }
    // 第二个事件应触发 rotation:第一个+第二个 → archive,第三个 → 新文件
    const archiveDir = path.join(root, '.claude', 'worktrees', 'main', 'events-archive');
    assert.ok(existsSync(archiveDir), 'archive dir should exist');
    const archiveFiles = readdirSync(archiveDir).filter((f) => f.endsWith('.jsonl'));
    assert.ok(archiveFiles.length >= 1, `expected at least 1 archive file, got ${archiveFiles.length}`);

    // 读回所有事件,总数应为 3
    const events = readEvents({ rootDir: root, warn: false });
    assert.equal(events.length, 3);
  } finally {
    cleanup(root);
  }
}

function testComputeEvaluationMetricsOutputsSixDimensions() {
  const events = [
    { type: 'verifier_passed', payload: { verdict: 'pass', target_artifact: 'a' } },
    { type: 'verifier_passed', payload: { verdict: 'pass', target_artifact: 'b' } },
    { type: 'verifier_blocked', payload: { verdict: 'fail', target_artifact: 'c' } },
    { type: 'req_completed', payload: {} },
    { type: 'req_completed', payload: {} },
    { type: 'req_completed', payload: {} },
    { type: 'human_decision_made', payload: { req_id: 'r', decision_summary: 'go' } },
  ];
  const root = tempDir('event-store-metrics');
  try {
    for (let i = 0; i < events.length; i += 1) {
      appendEvent({
        ...events[i],
        id: `evt_metrics_${i}`,
        version: '1.0',
        source: 'test',
        sessionId: 's-metrics',
        worktree: 'main',
      }, {
        rootDir: root,
        sessionId: 's-metrics',
        worktree: 'main',
        idFactory: () => `evt_metrics_${i}`,
      });
    }
    const stored = readEvents({ rootDir: root, warn: false });
    return import('../scripts/event-store.mjs').then((mod) => {
      const result = mod.computeEvaluationMetrics(stored);
      assert.ok(result.metrics.failure_rate, 'failure_rate metric should exist');
      assert.ok(result.metrics.interception_rate, 'interception_rate metric should exist');
      assert.ok(result.metrics.parallel_req_count, 'parallel_req_count metric should exist');
      assert.ok(result.metrics.conflict_count, 'conflict_count metric should exist');
      assert.ok(result.metrics.decision_time, 'decision_time metric should exist');
      assert.ok(result.metrics.subjective_honesty, 'subjective_honesty metric should exist');
      // verifier_passed=2, verifier_blocked=1, interception_rate = 1/3 ≈ 0.333
      assert.equal(result.metrics.interception_rate.denominator, 3);
      assert.equal(result.metrics.interception_rate.value, 1 / 3);
      // req_completed=3, failure_rate 启用
      assert.equal(result.metrics.failure_rate.enabled, true);
    });
  } finally {
    cleanup(root);
  }
}

function testLegacyEventsWithoutVersionAreTolerated() {
  const root = tempDir('event-store-legacy');
  try {
    // 手工写入一个 0.9 风格事件(无 version)
    const eventsDir = path.join(root, '.claude', 'events');
    mkdirSync(eventsDir, { recursive: true });
    writeFileSync(
      path.join(eventsDir, 'session-legacy.jsonl'),
      JSON.stringify({
        id: 'evt_legacy',
        ts: '2026-05-31T00:00:00.000Z',
        type: 'req_started',
        source: 'cli',
        sessionId: 's',
        worktree: 'main',
        payload: {},
      }) + '\n',
      'utf8',
    );
    // readEvents 应容忍,只 warn
    const events = readEvents({ rootDir: root, warn: false });
    assert.equal(events.length, 1);
    assert.equal(events[0].version, '0.9');
  } finally {
    cleanup(root);
  }
}

testVersionFieldAutoInjected();
testVersionRequiredInValidation();
testTypeSchemaValidationPassesAndFails();
testAllThirteenNewTypesAreRegistered();
testRotationMovesFileWhenLimitExceeded();
// testComputeEvaluationMetricsOutputsSixDimensions is async, await below
testLegacyEventsWithoutVersionAreTolerated();

// 跑 async 那个
(async () => {
  await testComputeEvaluationMetricsOutputsSixDimensions();
  console.log('All event-store tests passed (20).');
})();
