#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for index.js re-export aggregation modules
 * 15 TC | lib/core, lib/pdca, lib/intent, lib/task, lib/team, lib/ui
 *
 * @version bkit v2.0.0
 */

const path = require('path');
const { assert, skip, summary, reset } = require('../helpers/assert');
reset();

console.log('\n=== index-modules.test.js (15 TC) ===\n');

// Load all index modules
let core, pdca, intent, task, team, ui;

try { core = require('../../lib/core'); } catch (e) { core = null; }
try { pdca = require('../../lib/pdca'); } catch (e) { pdca = null; }
try { intent = require('../../lib/intent'); } catch (e) { intent = null; }
try { task = require('../../lib/task'); } catch (e) { task = null; }
try { team = require('../../lib/team'); } catch (e) { team = null; }
try { ui = require('../../lib/ui'); } catch (e) { ui = null; }

const coreLoaded = core !== null;
const pdcaLoaded = pdca !== null;
const intentLoaded = intent !== null;
const taskLoaded = task !== null;
const teamLoaded = team !== null;
const uiLoaded = ui !== null;

// ============================================================
// Section 1: lib/core/index.js (IX-001 ~ IX-003)
// ============================================================
console.log('\n--- Section 1: lib/core/index.js ---');

// IX-001: core module loads without error
{
  assert('IX-001', coreLoaded,
    'lib/core/index.js loads without error');
}

// IX-002: core exports at least 50 functions/values
{
  if (coreLoaded) {
    const exportCount = Object.keys(core).length;
    assert('IX-002', exportCount >= 50,
      `core index exports >= 50 items (actual: ${exportCount})`);
  } else {
    skip('IX-002', 'Module not loaded');
  }
}

// IX-003: core exports key platform functions
{
  if (coreLoaded) {
    assert('IX-003',
      typeof core.debugLog === 'function' &&
      typeof core.getConfig === 'function' &&
      typeof core.isSourceFile === 'function',
      'core exports debugLog, getConfig, isSourceFile');
  } else {
    skip('IX-003', 'Module not loaded');
  }
}

// ============================================================
// Section 2: lib/pdca/index.js (IX-004 ~ IX-006)
// ============================================================
console.log('\n--- Section 2: lib/pdca/index.js ---');

// IX-004: pdca module loads without error
{
  assert('IX-004', pdcaLoaded,
    'lib/pdca/index.js loads without error');
}

// IX-005: pdca exports at least 60 functions/values
{
  if (pdcaLoaded) {
    const exportCount = Object.keys(pdca).length;
    assert('IX-005', exportCount >= 60,
      `pdca index exports >= 60 items (actual: ${exportCount})`);
  } else {
    skip('IX-005', 'Module not loaded');
  }
}

// IX-006: pdca exports key tier and automation functions
{
  if (pdcaLoaded) {
    assert('IX-006',
      typeof pdca.getLanguageTier === 'function' &&
      typeof pdca.getAutomationLevel === 'function' &&
      typeof pdca.validateDocument === 'function',
      'pdca exports getLanguageTier, getAutomationLevel, validateDocument');
  } else {
    skip('IX-006', 'Module not loaded');
  }
}

// ============================================================
// Section 3: lib/intent/index.js (IX-007 ~ IX-008)
// ============================================================
console.log('\n--- Section 3: lib/intent/index.js ---');

// IX-007: intent module loads without error
{
  assert('IX-007', intentLoaded,
    'lib/intent/index.js loads without error');
}

// IX-008: intent exports at least 15 functions/values
{
  if (intentLoaded) {
    const exportCount = Object.keys(intent).length;
    assert('IX-008', exportCount >= 15,
      `intent index exports >= 15 items (actual: ${exportCount})`);
  } else {
    skip('IX-008', 'Module not loaded');
  }
}

// ============================================================
// Section 4: lib/task/index.js (IX-009 ~ IX-010)
// ============================================================
console.log('\n--- Section 4: lib/task/index.js ---');

// IX-009: task module loads without error
{
  assert('IX-009', taskLoaded,
    'lib/task/index.js loads without error');
}

// IX-010: task exports at least 20 functions/values
{
  if (taskLoaded) {
    const exportCount = Object.keys(task).length;
    assert('IX-010', exportCount >= 20,
      `task index exports >= 20 items (actual: ${exportCount})`);
  } else {
    skip('IX-010', 'Module not loaded');
  }
}

// ============================================================
// Section 5: lib/team/index.js (IX-011 ~ IX-013)
// ============================================================
console.log('\n--- Section 5: lib/team/index.js ---');

// IX-011: team module loads without error
{
  assert('IX-011', teamLoaded,
    'lib/team/index.js loads without error');
}

// IX-012: team exports at least 30 functions/values
{
  if (teamLoaded) {
    const exportCount = Object.keys(team).length;
    assert('IX-012', exportCount >= 30,
      `team index exports >= 30 items (actual: ${exportCount})`);
  } else {
    skip('IX-012', 'Module not loaded');
  }
}

// IX-013: team exports key coordinator functions
{
  if (teamLoaded) {
    assert('IX-013',
      typeof team.isTeamModeAvailable === 'function' &&
      typeof team.generateTeamStrategy === 'function' &&
      typeof team.createMessage === 'function',
      'team exports isTeamModeAvailable, generateTeamStrategy, createMessage');
  } else {
    skip('IX-013', 'Module not loaded');
  }
}

// ============================================================
// Section 6: lib/ui/index.js (IX-014 ~ IX-015)
// ============================================================
console.log('\n--- Section 6: lib/ui/index.js ---');

// IX-014: ui module loads without error
{
  assert('IX-014', uiLoaded,
    'lib/ui/index.js loads without error');
}

// IX-015: ui exports render functions
{
  if (uiLoaded) {
    assert('IX-015',
      typeof ui.renderPdcaProgressBar === 'function' &&
      typeof ui.renderWorkflowMap === 'function' &&
      typeof ui.renderAgentPanel === 'function',
      'ui exports renderPdcaProgressBar, renderWorkflowMap, renderAgentPanel');
  } else {
    skip('IX-015', 'Module not loaded');
  }
}

// ============================================================
// Summary
// ============================================================
const result = summary('index-modules.test.js');
module.exports = result;
