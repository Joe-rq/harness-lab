import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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

    const eventFile = getEventFilePath({ rootDir: root, sessionId: 'session-a' });
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

    const eventFile = getEventFilePath({ rootDir: root, sessionId: 'session-a' });
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

testAppendAddsDefaultsAndWritesJsonl();
testRejectsBadEventBeforeWrite();
testValidateReportsMissingFields();
testReadEventsMergesAndSortsTwoFiles();
testAppendPerformanceUnder50ms();
testBuildProgressProjectionFromLifecycleEvents();
testBuildProgressProjectionHandlesBlockedAndCompleted();
testBuildWorktreeProgressProjectionsAggregatesIndependentEvents();
testBuildWorktreeProgressProjectionsIsolatesBadEventFiles();

console.log('All event-store tests passed (9).');
