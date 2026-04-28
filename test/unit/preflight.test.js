/**
 * preflight.test.js — Unit tests for SessionStart preflight (FR-α4 + FR-α5)
 *
 * @module test/unit/preflight.test
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const preflight = require('../../hooks/startup/preflight');

test('checkAgentTeamsEnv: warning when env unset', () => {
  const orig = process.env[preflight.AGENT_TEAMS_ENV];
  delete process.env[preflight.AGENT_TEAMS_ENV];
  try {
    const result = preflight.checkAgentTeamsEnv();
    assert.equal(result.active, false);
    assert.equal(typeof result.warning, 'string');
    assert.match(result.warning, /Agent Teams/);
    assert.match(result.warning, new RegExp(preflight.AGENT_TEAMS_ENV));
  } finally {
    if (orig === undefined) delete process.env[preflight.AGENT_TEAMS_ENV];
    else process.env[preflight.AGENT_TEAMS_ENV] = orig;
  }
});

test('checkAgentTeamsEnv: no warning when env="1"', () => {
  const orig = process.env[preflight.AGENT_TEAMS_ENV];
  process.env[preflight.AGENT_TEAMS_ENV] = '1';
  try {
    const result = preflight.checkAgentTeamsEnv();
    assert.equal(result.active, true);
    assert.equal(result.warning, null);
  } finally {
    if (orig === undefined) delete process.env[preflight.AGENT_TEAMS_ENV];
    else process.env[preflight.AGENT_TEAMS_ENV] = orig;
  }
});

test('checkAgentTeamsEnv: env="0" still warns (only "1" activates)', () => {
  const orig = process.env[preflight.AGENT_TEAMS_ENV];
  process.env[preflight.AGENT_TEAMS_ENV] = '0';
  try {
    const result = preflight.checkAgentTeamsEnv();
    assert.equal(result.active, false);
    assert.ok(result.warning);
  } finally {
    if (orig === undefined) delete process.env[preflight.AGENT_TEAMS_ENV];
    else process.env[preflight.AGENT_TEAMS_ENV] = orig;
  }
});

test('renderCCVersionWarning: null inputs return null', () => {
  assert.equal(preflight.renderCCVersionWarning(null), null);
  assert.equal(preflight.renderCCVersionWarning({ skipped: true }), null);
  assert.equal(preflight.renderCCVersionWarning({ current: null }), null);
});

test('renderCCVersionWarning: severity "ok" returns null', () => {
  assert.equal(
    preflight.renderCCVersionWarning({
      current: '2.1.121',
      severity: 'ok',
      inactive: [],
      recommended: '2.1.118',
      min: '2.1.78',
    }),
    null,
  );
});

test('renderCCVersionWarning: severity "warn" surfaces recommended + inactive list', () => {
  const msg = preflight.renderCCVersionWarning({
    current: '2.1.114',
    severity: 'warn',
    inactive: ['agentTeams', 'hookMcpToolDirect'],
    recommended: '2.1.118',
    min: '2.1.78',
  });
  assert.match(msg, /v2\.1\.118\+/);
  assert.match(msg, /v2\.1\.114/);
  assert.match(msg, /agentTeams/);
  assert.match(msg, /hookMcpToolDirect/);
});

test('renderCCVersionWarning: severity "error" surfaces minimum required', () => {
  const msg = preflight.renderCCVersionWarning({
    current: '2.1.50',
    severity: 'error',
    inactive: ['agentTeams'],
    recommended: '2.1.118',
    min: '2.1.78',
  });
  assert.match(msg, /v2\.1\.78\+ required/);
  assert.match(msg, /v2\.1\.50/);
});

test('run: returns a non-empty section when env unset', () => {
  const orig = process.env[preflight.AGENT_TEAMS_ENV];
  delete process.env[preflight.AGENT_TEAMS_ENV];
  try {
    const section = preflight.run();
    assert.match(section, /## Preflight/);
    assert.match(section, /Agent Teams/);
  } finally {
    if (orig === undefined) delete process.env[preflight.AGENT_TEAMS_ENV];
    else process.env[preflight.AGENT_TEAMS_ENV] = orig;
  }
});

test('run: returns empty string when everything is healthy and updates disabled', () => {
  const origTeams = process.env[preflight.AGENT_TEAMS_ENV];
  const origDis = process.env.DISABLE_UPDATES;
  process.env[preflight.AGENT_TEAMS_ENV] = '1';
  process.env.DISABLE_UPDATES = '1';
  try {
    const section = preflight.run();
    assert.equal(section, '');
  } finally {
    if (origTeams === undefined) delete process.env[preflight.AGENT_TEAMS_ENV];
    else process.env[preflight.AGENT_TEAMS_ENV] = origTeams;
    if (origDis === undefined) delete process.env.DISABLE_UPDATES;
    else process.env.DISABLE_UPDATES = origDis;
  }
});
