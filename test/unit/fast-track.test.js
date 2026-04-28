/**
 * fast-track.test.js — Unit tests for FR-β5 Daniel-mode auto-approve.
 *
 * Maps to Design §8.2 L1 TC #5 + §6 E-β5-01 (Trust < 80) + E-β5-02
 * (Design doc missing) + §3.3 config schema.
 *
 * @module test/unit/fast-track.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ft = require('../../lib/control/fast-track');

function withFakeRepo(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-ft-'));
  const stateDir = path.join(dir, '.bkit', 'state');
  const runtimeDir = path.join(dir, '.bkit', 'runtime');
  const designDir = path.join(dir, 'docs', '02-design', 'features');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(designDir, { recursive: true });

  const configPath = path.join(dir, 'bkit.config.json');
  const trustProfilePath = path.join(stateDir, 'trust-profile.json');
  const logPath = path.join(runtimeDir, 'fast-track-log.json');

  try { return fn({ dir, configPath, trustProfilePath, logPath, designDir }); }
  finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
}

function writeConfig(configPath, overrides = {}) {
  const base = {
    version: '2.1.11',
    control: {
      fastTrack: {
        enabled: true,
        minTrustScore: 80,
        autoLevel: 'L3',
        skipCheckpoints: [1, 2, 3, 4, 5, 6, 7, 8],
        fallbackLevel: 'L2',
      },
    },
    pdca: {
      docPaths: {
        design: ['docs/02-design/features/{feature}.design.md'],
      },
    },
  };
  if (overrides.fastTrack) {
    base.control.fastTrack = { ...base.control.fastTrack, ...overrides.fastTrack };
  }
  fs.writeFileSync(configPath, JSON.stringify(base, null, 2));
}

function writeTrust(trustProfilePath, score) {
  fs.writeFileSync(trustProfilePath, JSON.stringify({ trustScore: score, currentLevel: 2 }));
}

function writeDesign(designDir, feature) {
  fs.writeFileSync(path.join(designDir, `${feature}.design.md`), '# Design');
}

// ── loadConfig ────────────────────────────────────────────────────────────
test('loadConfig: defaults when bkit.config.json missing', () => {
  withFakeRepo(({ configPath }) => {
    const c = ft.loadConfig({ configPath });
    assert.equal(c.enabled, true);
    assert.equal(c.minTrustScore, 80);
    assert.equal(c.autoLevel, 'L3');
    assert.deepEqual(c.skipCheckpoints, [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(c.fallbackLevel, 'L2');
  });
});

test('loadConfig: user overrides merge over defaults', () => {
  withFakeRepo(({ configPath }) => {
    writeConfig(configPath, { fastTrack: { minTrustScore: 90, autoLevel: 'L4' } });
    const c = ft.loadConfig({ configPath });
    assert.equal(c.minTrustScore, 90);
    assert.equal(c.autoLevel, 'L4');
    assert.equal(c.enabled, true); // unchanged
  });
});

test('loadConfig: malformed JSON falls back to defaults', () => {
  withFakeRepo(({ configPath }) => {
    fs.writeFileSync(configPath, '{not json}');
    const c = ft.loadConfig({ configPath });
    assert.equal(c.minTrustScore, 80);
  });
});

// ── getTrustScore ─────────────────────────────────────────────────────────
test('getTrustScore: returns 0 when profile missing (fail-safe)', () => {
  withFakeRepo(({ trustProfilePath }) => {
    assert.equal(ft.getTrustScore({ trustProfilePath }), 0);
  });
});

test('getTrustScore: reads trustScore numeric field', () => {
  withFakeRepo(({ trustProfilePath }) => {
    writeTrust(trustProfilePath, 85);
    assert.equal(ft.getTrustScore({ trustProfilePath }), 85);
  });
});

test('getTrustScore: returns 0 on non-numeric value', () => {
  withFakeRepo(({ trustProfilePath }) => {
    fs.writeFileSync(trustProfilePath, JSON.stringify({ trustScore: 'high' }));
    assert.equal(ft.getTrustScore({ trustProfilePath }), 0);
  });
});

// ── findDesignDoc ─────────────────────────────────────────────────────────
test('findDesignDoc: returns found+path when doc exists', () => {
  withFakeRepo(({ dir, designDir }) => {
    writeDesign(designDir, 'feat-a');
    const r = ft.findDesignDoc('feat-a', { projectRoot: dir });
    assert.equal(r.found, true);
    assert.match(r.path, /feat-a\.design\.md$/);
  });
});

test('findDesignDoc: not found returns {found:false, path:null}', () => {
  withFakeRepo(({ dir }) => {
    const r = ft.findDesignDoc('nonexistent', { projectRoot: dir });
    assert.deepEqual(r, { found: false, path: null });
  });
});

test('findDesignDoc: invalid feature arg returns not found', () => {
  assert.deepEqual(ft.findDesignDoc(null), { found: false, path: null });
  assert.deepEqual(ft.findDesignDoc(123), { found: false, path: null });
});

// ── evaluatePreconditions ─────────────────────────────────────────────────
test('evaluatePreconditions: all green → ok=true, blocks empty', () => {
  withFakeRepo(({ dir, configPath, trustProfilePath, designDir }) => {
    writeConfig(configPath);
    writeTrust(trustProfilePath, 85);
    writeDesign(designDir, 'feat-x');

    const r = ft.evaluatePreconditions('feat-x', {
      configPath, trustProfilePath, projectRoot: dir,
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.blocks, []);
    assert.equal(r.trustScore, 85);
    assert.equal(r.minTrustScore, 80);
    assert.match(r.designPath, /feat-x\.design\.md$/);
  });
});

test('evaluatePreconditions: Trust < 80 → trust_score_too_low (E-β5-01)', () => {
  withFakeRepo(({ dir, configPath, trustProfilePath, designDir }) => {
    writeConfig(configPath);
    writeTrust(trustProfilePath, 50);
    writeDesign(designDir, 'feat-x');

    const r = ft.evaluatePreconditions('feat-x', {
      configPath, trustProfilePath, projectRoot: dir,
    });
    assert.equal(r.ok, false);
    assert.ok(r.blocks.includes('trust_score_too_low'));
    assert.equal(r.trustScore, 50);
  });
});

test('evaluatePreconditions: Design missing → design_doc_missing (E-β5-02)', () => {
  withFakeRepo(({ dir, configPath, trustProfilePath }) => {
    writeConfig(configPath);
    writeTrust(trustProfilePath, 90);

    const r = ft.evaluatePreconditions('feat-no-design', {
      configPath, trustProfilePath, projectRoot: dir,
    });
    assert.equal(r.ok, false);
    assert.ok(r.blocks.includes('design_doc_missing'));
  });
});

test('evaluatePreconditions: enabled=false → disabled_in_config', () => {
  withFakeRepo(({ dir, configPath, trustProfilePath, designDir }) => {
    writeConfig(configPath, { fastTrack: { enabled: false } });
    writeTrust(trustProfilePath, 90);
    writeDesign(designDir, 'feat-x');

    const r = ft.evaluatePreconditions('feat-x', {
      configPath, trustProfilePath, projectRoot: dir,
    });
    assert.equal(r.ok, false);
    assert.ok(r.blocks.includes('disabled_in_config'));
  });
});

test('evaluatePreconditions: multiple blocks accumulate', () => {
  withFakeRepo(({ dir, configPath, trustProfilePath }) => {
    writeConfig(configPath, { fastTrack: { enabled: false } });
    writeTrust(trustProfilePath, 30);

    const r = ft.evaluatePreconditions('no-design', {
      configPath, trustProfilePath, projectRoot: dir,
    });
    assert.equal(r.ok, false);
    assert.equal(r.blocks.length, 3);
    assert.ok(r.blocks.includes('disabled_in_config'));
    assert.ok(r.blocks.includes('trust_score_too_low'));
    assert.ok(r.blocks.includes('design_doc_missing'));
  });
});

// ── engage ────────────────────────────────────────────────────────────────
test('engage: writes audit log when preconditions pass', () => {
  withFakeRepo(({ dir, configPath, trustProfilePath, logPath, designDir }) => {
    writeConfig(configPath);
    writeTrust(trustProfilePath, 85);
    writeDesign(designDir, 'feat-x');

    const r = ft.engage('feat-x', {
      configPath, trustProfilePath, logPath, projectRoot: dir,
      now: new Date('2026-04-28T12:00:00Z'),
    });
    assert.equal(r.engaged, true);
    assert.equal(r.feature, 'feat-x');
    assert.equal(r.trustScore, 85);
    assert.equal(r.autoLevel, 'L3');
    assert.deepEqual(r.skipCheckpoints, [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(r.engagedAt, '2026-04-28T12:00:00.000Z');
    assert.deepEqual(r.decisions, []);

    const persisted = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    assert.equal(persisted.engaged, true);
    assert.equal(persisted.feature, 'feat-x');
  });
});

test('engage: returns blocks without writing log when preconditions fail', () => {
  withFakeRepo(({ dir, configPath, trustProfilePath, logPath }) => {
    writeConfig(configPath);
    writeTrust(trustProfilePath, 50);

    const r = ft.engage('no-design', {
      configPath, trustProfilePath, logPath, projectRoot: dir,
    });
    assert.equal(r.engaged, false);
    assert.equal(fs.existsSync(logPath), false);
  });
});

// ── recordCheckpoint ─────────────────────────────────────────────────────
test('recordCheckpoint: appends to existing audit log', () => {
  withFakeRepo(({ dir, configPath, trustProfilePath, logPath, designDir }) => {
    writeConfig(configPath);
    writeTrust(trustProfilePath, 90);
    writeDesign(designDir, 'feat-x');

    ft.engage('feat-x', { configPath, trustProfilePath, logPath, projectRoot: dir });

    const r1 = ft.recordCheckpoint({
      checkpoint: 1, decision: 'auto-approved', logPath,
      now: new Date('2026-04-28T12:00:01Z'),
    });
    const r2 = ft.recordCheckpoint({
      checkpoint: 5, decision: 'fallback', reason: 'no_recommended', logPath,
      now: new Date('2026-04-28T12:00:02Z'),
    });

    assert.equal(r1.appended, true);
    assert.equal(r1.total, 1);
    assert.equal(r2.appended, true);
    assert.equal(r2.total, 2);

    const persisted = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    assert.equal(persisted.decisions.length, 2);
    assert.equal(persisted.decisions[1].reason, 'no_recommended');
  });
});

test('recordCheckpoint: missing log → appended=false', () => {
  withFakeRepo(({ logPath }) => {
    const r = ft.recordCheckpoint({ checkpoint: 1, decision: 'auto-approved', logPath });
    assert.equal(r.appended, false);
  });
});

// ── isCheckpointSkipped ──────────────────────────────────────────────────
test('isCheckpointSkipped: returns true for default 1..8', () => {
  withFakeRepo(({ configPath }) => {
    writeConfig(configPath);
    for (let i = 1; i <= 8; i++) {
      assert.equal(ft.isCheckpointSkipped(i, { configPath }), true, `cp ${i}`);
    }
    assert.equal(ft.isCheckpointSkipped(9, { configPath }), false);
  });
});

test('isCheckpointSkipped: returns false when fastTrack.enabled=false', () => {
  withFakeRepo(({ configPath }) => {
    writeConfig(configPath, { fastTrack: { enabled: false } });
    assert.equal(ft.isCheckpointSkipped(1, { configPath }), false);
  });
});

// ── DEFAULT_FAST_TRACK contract ──────────────────────────────────────────
test('DEFAULT_FAST_TRACK is frozen with locked schema', () => {
  assert.equal(Object.isFrozen(ft.DEFAULT_FAST_TRACK), true);
  assert.equal(ft.DEFAULT_FAST_TRACK.enabled, true);
  assert.equal(ft.DEFAULT_FAST_TRACK.minTrustScore, 80);
  assert.deepEqual(ft.DEFAULT_FAST_TRACK.skipCheckpoints, [1, 2, 3, 4, 5, 6, 7, 8]);
});
