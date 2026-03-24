/**
 * Deploy Sub-State Machine
 * @module lib/pdca/deploy-state-machine
 * @version 3.0.0
 *
 * Manages deploy phase as a sub-state machine within PDCA.
 * Main PDCA: ... → do → [DEPLOY] → check → ...
 * Sub-states: init → dev → verify-dev → staging → verify-staging → approval → prod → complete
 *
 * Separated from main state machine to prevent transition table explosion.
 */
const fs = require('fs');
const path = require('path');

let _core = null;
function getCore() {
  if (!_core) { _core = require('../core'); }
  return _core;
}

// ── Deploy States ──
const DEPLOY_STATES = [
  'idle', 'init', 'dev', 'verify-dev',
  'staging', 'verify-staging', 'approval',
  'prod', 'canary', 'complete', 'failed', 'rollback'
];

// ── Deploy Events ──
const DEPLOY_EVENTS = [
  'DEPLOY_START', 'DEV_DONE', 'DEV_VERIFY_PASS', 'DEV_VERIFY_FAIL',
  'STAGING_DONE', 'STG_VERIFY_PASS', 'STG_VERIFY_FAIL',
  'APPROVAL_GRANTED', 'APPROVAL_DENIED',
  'PROD_DONE', 'CANARY_PASS', 'CANARY_FAIL',
  'DEPLOY_COMPLETE', 'DEPLOY_FAIL', 'DEPLOY_ROLLBACK'
];

// ── Deploy Transition Table ──
const DEPLOY_TRANSITIONS = [
  // Forward flow
  { from: 'idle', event: 'DEPLOY_START', to: 'init', guard: null, description: 'Deploy phase initiated' },
  { from: 'init', event: 'DEV_DONE', to: 'dev', guard: null, description: 'DEV environment deploy started' },
  { from: 'dev', event: 'DEV_VERIFY_PASS', to: 'verify-dev', guard: 'guardMatchRate90', description: 'DEV deploy verified (90%+)' },
  { from: 'dev', event: 'DEV_VERIFY_FAIL', to: 'failed', guard: null, description: 'DEV verification failed' },
  { from: 'verify-dev', event: 'STAGING_DONE', to: 'staging', guard: null, description: 'Staging deploy started' },
  { from: 'staging', event: 'STG_VERIFY_PASS', to: 'verify-staging', guard: 'guardMatchRate95', description: 'Staging verified (95%+)' },
  { from: 'staging', event: 'STG_VERIFY_FAIL', to: 'failed', guard: null, description: 'Staging verification failed' },
  { from: 'verify-staging', event: 'APPROVAL_GRANTED', to: 'approval', guard: null, description: 'Human approval for prod deploy' },
  { from: 'verify-staging', event: 'APPROVAL_DENIED', to: 'failed', guard: null, description: 'Prod deploy denied by human' },
  { from: 'approval', event: 'PROD_DONE', to: 'prod', guard: null, description: 'Production deploy started (canary)' },
  { from: 'prod', event: 'CANARY_PASS', to: 'complete', guard: null, description: 'Canary deploy successful, full rollout' },
  { from: 'prod', event: 'CANARY_FAIL', to: 'rollback', guard: null, description: 'Canary failed, rolling back' },
  { from: 'complete', event: 'DEPLOY_COMPLETE', to: 'idle', guard: null, description: 'Deploy cycle complete' },

  // Recovery
  { from: 'failed', event: 'DEPLOY_ROLLBACK', to: 'rollback', guard: null, description: 'Rolling back failed deploy' },
  { from: 'rollback', event: 'DEPLOY_COMPLETE', to: 'idle', guard: null, description: 'Rollback complete, return to idle' },
];

// ── Guards ──
const DEPLOY_GUARDS = {
  guardMatchRate90(context) {
    return (context.matchRate || 0) >= 90;
  },
  guardMatchRate95(context) {
    return (context.matchRate || 0) >= 95;
  },
};

// ── Deploy State Manager ──

/**
 * Get current deploy state for a feature
 */
function getDeployState(feature) {
  const statusPath = getDeployStatusPath(feature);
  if (fs.existsSync(statusPath)) {
    try {
      return JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    } catch { /* fall through */ }
  }
  return {
    feature,
    state: 'idle',
    env: null,
    history: [],
    matchRate: null,
    startedAt: null,
    lastTransition: null,
  };
}

/**
 * Transition deploy state
 */
function transitionDeploy(feature, event, context = {}) {
  const current = getDeployState(feature);
  const transition = DEPLOY_TRANSITIONS.find(
    t => (t.from === current.state || t.from === '*') && t.event === event
  );

  if (!transition) {
    return {
      success: false,
      error: `No transition from '${current.state}' on event '${event}'`,
      state: current,
    };
  }

  // Check guard
  if (transition.guard) {
    const guardFn = DEPLOY_GUARDS[transition.guard];
    if (guardFn && !guardFn({ ...current, ...context })) {
      return {
        success: false,
        error: `Guard '${transition.guard}' failed for ${event}`,
        state: current,
      };
    }
  }

  // Apply transition
  const newState = {
    ...current,
    state: transition.to,
    env: context.env || current.env,
    matchRate: context.matchRate || current.matchRate,
    lastTransition: {
      from: current.state,
      to: transition.to,
      event,
      timestamp: new Date().toISOString(),
      description: transition.description,
    },
    history: [
      ...current.history,
      {
        from: current.state,
        to: transition.to,
        event,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  if (!newState.startedAt && event === 'DEPLOY_START') {
    newState.startedAt = new Date().toISOString();
  }

  saveDeployState(feature, newState);

  return { success: true, state: newState, transition };
}

/**
 * Initialize deploy for a feature
 */
function initDeploy(feature, env) {
  const state = {
    feature,
    state: 'idle',
    env,
    history: [],
    matchRate: null,
    startedAt: null,
    lastTransition: null,
  };
  saveDeployState(feature, state);
  return transitionDeploy(feature, 'DEPLOY_START', { env });
}

/**
 * Get deploy status path
 */
function getDeployStatusPath(feature) {
  const { STATE_PATHS } = getCore();
  const runtimeDir = STATE_PATHS.runtime();
  return path.join(runtimeDir, `deploy-${feature}.json`);
}

/**
 * Save deploy state
 */
function saveDeployState(feature, state) {
  const statusPath = getDeployStatusPath(feature);
  const dir = path.dirname(statusPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statusPath, JSON.stringify(state, null, 2));
}

/**
 * Get deploy level configuration based on project level
 */
function getDeployConfig(projectLevel) {
  const configs = {
    starter: {
      environments: ['dev'],
      strategy: 'guide-only',
      tools: ['GitHub Pages', 'Netlify', 'Vercel'],
      description: 'Static hosting guide (no automated deploy)',
    },
    dynamic: {
      environments: ['dev', 'staging'],
      strategy: 'docker-gha',
      tools: ['Docker Compose', 'GitHub Actions', 'Vercel'],
      description: 'Docker + GitHub Actions CI/CD',
    },
    enterprise: {
      environments: ['dev', 'staging', 'prod'],
      strategy: 'eks-argocd',
      tools: ['Terraform', 'EKS', 'ArgoCD', 'Argo Rollouts', 'Helm'],
      description: '6-Layer Self-Healing CI/CD (Full)',
    },
  };
  return configs[projectLevel] || configs.dynamic;
}

/**
 * Format deploy status for display
 */
function formatDeployStatus(feature) {
  const state = getDeployState(feature);
  const stateIcons = {
    idle: '⏸️', init: '🔄', dev: '🟢', 'verify-dev': '✅',
    staging: '🟡', 'verify-staging': '✅', approval: '🧑‍💻',
    prod: '🔴', canary: '🐤', complete: '✅', failed: '❌', rollback: '⏪',
  };
  const icon = stateIcons[state.state] || '❓';

  const lines = [
    `🚀 Deploy Status: ${feature}`,
    `─────────────────────────────`,
    `State: ${icon} ${state.state}`,
    `Env: ${state.env || 'not set'}`,
    `Match Rate: ${state.matchRate || 'N/A'}`,
    `Started: ${state.startedAt || 'not started'}`,
  ];

  if (state.history.length > 0) {
    lines.push(`\nHistory (${state.history.length} transitions):`);
    for (const h of state.history.slice(-5)) {
      lines.push(`  ${h.from} → ${h.to} (${h.event})`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  DEPLOY_STATES,
  DEPLOY_EVENTS,
  DEPLOY_TRANSITIONS,
  DEPLOY_GUARDS,
  getDeployState,
  transitionDeploy,
  initDeploy,
  getDeployConfig,
  formatDeployStatus,
  saveDeployState,
};
