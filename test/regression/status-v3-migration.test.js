#!/usr/bin/env node
'use strict';
/**
 * Regression Test: Status v3.0 Migration (15 TC)
 * MG-001~005: v2.0 status migrates to v3.0 without data loss
 * MG-006~010: v3.0 has stateMachine, automation, team sections
 * MG-011~015: Feature-level stateMachine, metrics, phaseTimestamps added
 *
 * @version bkit v2.0.0
 */

const path = require('path');
const { assert, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');

console.log('\n=== status-v3-migration.test.js (15 TC) ===\n');

// --- Load modules ---
let status;
try {
  status = require(path.join(BASE_DIR, 'lib/pdca/status'));
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

// Build a realistic v2.0 status object for testing
function createTestV2Status() {
  const now = new Date().toISOString();
  return {
    version: '2.0',
    lastUpdated: now,
    activeFeatures: ['feat-alpha', 'feat-beta'],
    primaryFeature: 'feat-alpha',
    features: {
      'feat-alpha': {
        phase: 'design',
        phaseNumber: 2,
        matchRate: 92,
        iterationCount: 3,
        requirements: ['req-1', 'req-2', 'req-3'],
        documents: { plan: 'docs/01-plan/alpha.md', design: 'docs/02-design/alpha.md' },
        timestamps: { started: now, lastUpdated: now }
      },
      'feat-beta': {
        phase: 'plan',
        phaseNumber: 1,
        matchRate: null,
        iterationCount: 0,
        requirements: [],
        documents: {},
        timestamps: { started: now }
      },
      'feat-archived': {
        phase: 'archived',
        phaseNumber: 7,
        matchRate: 100,
        iterationCount: 5,
        requirements: ['req-a'],
        documents: { plan: 'docs/01-plan/archived.md' },
        timestamps: { started: now, archivedAt: now }
      }
    },
    pipeline: { currentPhase: 2, level: 'Enterprise', phaseHistory: ['plan', 'design'] },
    session: { startedAt: now, onboardingCompleted: true, lastActivity: now },
    history: [
      { action: 'feature_created', feature: 'feat-alpha' },
      { action: 'phase_transition', from: 'plan', to: 'design' },
      { action: 'feature_created', feature: 'feat-beta' },
    ]
  };
}

// ============================================================
// MG-001~005: v2.0 migrates to v3.0 without data loss
// ============================================================
console.log('--- v2.0 -> v3.0 Data Preservation ---');

const v2 = createTestV2Status();
let v3;
try {
  v3 = status.migrateStatusV2toV3(v2);
} catch (e) {
  console.error('Migration failed:', e.message);
  process.exit(1);
}

// MG-001: Version updated
assert('MG-001', v3.version === '3.0',
  'Version updated from 2.0 to 3.0');

// MG-002: All 3 features preserved
assert('MG-002', Object.keys(v3.features).length === 3,
  `All 3 features preserved (found ${Object.keys(v3.features).length})`);

// MG-003: activeFeatures preserved
assert('MG-003', v3.activeFeatures.length === 2 &&
  v3.activeFeatures.includes('feat-alpha') && v3.activeFeatures.includes('feat-beta'),
  'activeFeatures preserved (feat-alpha, feat-beta)');

// MG-004: primaryFeature preserved
assert('MG-004', v3.primaryFeature === 'feat-alpha',
  'primaryFeature preserved (feat-alpha)');

// MG-005: history preserved with all entries
assert('MG-005', Array.isArray(v3.history) && v3.history.length === 3,
  `History preserved with ${v3.history.length} entries (expected 3)`);

// ============================================================
// MG-006~010: v3.0 has stateMachine, automation, team sections
// ============================================================
console.log('\n--- v3.0 Global Sections ---');

// MG-006: Global stateMachine section exists
assert('MG-006', v3.stateMachine && typeof v3.stateMachine === 'object',
  'Global stateMachine section exists');

// MG-007: stateMachine has defaultWorkflow
assert('MG-007', v3.stateMachine.defaultWorkflow === 'default',
  `stateMachine.defaultWorkflow = "${v3.stateMachine.defaultWorkflow}" (expected "default")`);

// MG-008: Global automation section exists
assert('MG-008', v3.automation && typeof v3.automation === 'object',
  'Global automation section exists');

// MG-009: automation has globalLevel
assert('MG-009', typeof v3.automation.globalLevel === 'number' && v3.automation.globalLevel === 2,
  `automation.globalLevel = ${v3.automation.globalLevel} (expected 2, L2 default)`);

// MG-010: Global team section exists
assert('MG-010', v3.team && typeof v3.team === 'object' && v3.team.enabled === true,
  'Global team section exists with enabled=true');

// ============================================================
// MG-011~015: Feature-level stateMachine, metrics, phaseTimestamps
// ============================================================
console.log('\n--- Feature-Level Additions ---');

const featAlpha = v3.features['feat-alpha'];
const featBeta = v3.features['feat-beta'];

// MG-011: Feature stateMachine added
assert('MG-011', featAlpha.stateMachine && featAlpha.stateMachine.currentState === 'design',
  `feat-alpha stateMachine.currentState = "${featAlpha.stateMachine?.currentState}" (matches phase "design")`);

// MG-012: Feature metrics added
assert('MG-012', featAlpha.metrics && typeof featAlpha.metrics === 'object' &&
  featAlpha.metrics.qualityScore === null,
  'feat-alpha metrics object added (qualityScore=null default)');

// MG-013: Feature phaseTimestamps added
assert('MG-013', typeof featAlpha.phaseTimestamps === 'object',
  'feat-alpha phaseTimestamps object added');

// MG-014: Feature automationLevel added
assert('MG-014', featAlpha.automationLevel === 2,
  `feat-alpha automationLevel = ${featAlpha.automationLevel} (L2 default)`);

// MG-015: Second feature also gets v3 fields
assert('MG-015', featBeta.stateMachine && featBeta.stateMachine.currentState === 'plan' &&
  featBeta.metrics && featBeta.automationLevel === 2,
  'feat-beta also gets v3 fields (stateMachine, metrics, automationLevel)');

// ============================================================
// Summary
// ============================================================
const result = summary('Status v3.0 Migration Regression Tests');
if (result.failed > 0) process.exit(1);
