/**
 * Self-Healing Engine — Living Context based auto-fix pipeline
 * @module lib/context/self-healing
 * @version 3.0.0
 *
 * FR-22: Self-Healing agent core logic
 * FR-24: Incident Memory auto-accumulation
 * FR-25: Escalation Gate (5 failures)
 * FR-26: Auto Rollback trigger
 * FR-28: PDCA Audit Log
 *
 * Flow: Error → Context Load → Claude Code Fix → PDCA Iterate → Verify → PR or Escalate
 */
const fs = require('fs');
const path = require('path');

const MAX_ITERATIONS = 5;

let _loader = null;
function getLoader() {
  if (!_loader) { _loader = require('./context-loader'); }
  return _loader;
}

let _checker = null;
function getChecker() {
  if (!_checker) { _checker = require('./invariant-checker'); }
  return _checker;
}

let _runner = null;
function getRunner() {
  if (!_runner) { _runner = require('./scenario-runner'); }
  return _runner;
}

// ── Self-Healing Session ──

/**
 * Create a new self-healing session
 * @param {Object} error - { message, file, line, stackTrace, severity }
 * @param {Object} options - { feature, environment }
 * @returns {HealSession}
 */
function createHealSession(error, options = {}) {
  const session = {
    id: `HEAL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: 'created',    // created | loading | analyzing | fixing | verifying | pr-ready | escalated | failed
    error,
    feature: options.feature || null,
    environment: options.environment || 'unknown',
    context: null,
    iterations: 0,
    maxIterations: MAX_ITERATIONS,
    fixes: [],
    verification: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  logAudit(session, 'session_created', { error: error.message });
  return session;
}

/**
 * Load context for heal session (Step 2)
 */
async function loadHealContext(session) {
  session.status = 'loading';
  session.updatedAt = new Date().toISOString();

  const context = await getLoader().loadContext(session.error.file, {
    feature: session.feature,
  });

  session.context = context;
  session.status = 'analyzing';

  logAudit(session, 'context_loaded', {
    scenarios: context.scenarios.length,
    invariants: context.invariants.length,
    hasImpact: context.impact !== null,
    incidents: context.incidents.length,
  });

  return session;
}

/**
 * Record a fix attempt (Step 3)
 */
function recordFix(session, fix) {
  session.iterations++;
  session.fixes.push({
    iteration: session.iterations,
    timestamp: new Date().toISOString(),
    description: fix.description || '',
    filesChanged: fix.filesChanged || [],
    linesChanged: fix.linesChanged || 0,
  });
  session.status = 'fixing';
  session.updatedAt = new Date().toISOString();

  logAudit(session, 'fix_attempted', {
    iteration: session.iterations,
    files: fix.filesChanged,
  });

  return session;
}

/**
 * Verify fix using Living Context (Step 4)
 */
async function verifyFix(session, changedCode = '') {
  session.status = 'verifying';

  if (!session.context) {
    session.verification = { allPassed: false, reason: 'No context loaded' };
    return session;
  }

  const verification = await getRunner().runFullVerification(
    session.error.file,
    session.context,
    changedCode,
  );

  session.verification = verification;
  session.updatedAt = new Date().toISOString();

  logAudit(session, 'verification_complete', {
    allPassed: verification.allPassed,
    canAutoFix: verification.canAutoFix,
    scenariosPassed: verification.scenarios?.passed || 0,
    scenariosTotal: verification.scenarios?.total || 0,
    invariantViolations: verification.invariants?.violations?.length || 0,
  });

  if (verification.allPassed) {
    session.status = 'pr-ready';
  } else if (session.iterations >= session.maxIterations) {
    session.status = 'escalated';
    logAudit(session, 'escalated', { reason: `Max iterations (${MAX_ITERATIONS}) reached` });
  } else if (!verification.canAutoFix) {
    session.status = 'escalated';
    logAudit(session, 'escalated', { reason: 'Critical invariant violation — human review required' });
  }

  return session;
}

/**
 * Check if session should escalate
 */
function shouldEscalate(session) {
  return session.status === 'escalated' ||
    session.iterations >= session.maxIterations ||
    (session.verification && !session.verification.canAutoFix);
}

/**
 * Record incident to memory (auto-accumulation)
 */
function recordIncident(session, result) {
  const memPath = path.join(process.cwd(), '.bkit', 'incident-memory.yaml');
  let content = '';

  if (fs.existsSync(memPath)) {
    content = fs.readFileSync(memPath, 'utf8');
  } else {
    content = 'version: "1.0"\nincidents:\n';
  }

  const incident = [
    `  - id: "${session.id}"`,
    `    timestamp: "${new Date().toISOString()}"`,
    `    error: "${(session.error.message || '').replace(/"/g, "'")}"`,
    `    file: "${session.error.file}"`,
    `    line: ${session.error.line || 0}`,
    `    root_cause: "${(result.rootCause || 'unknown').replace(/"/g, "'")}"`,
    `    fix: "${(result.fixDescription || '').replace(/"/g, "'")}"`,
    `    lesson: "${(result.lesson || '').replace(/"/g, "'")}"`,
    `    anti_pattern: "${(result.antiPattern || '').replace(/"/g, "'")}"`,
    `    healing_iterations: ${session.iterations}`,
    `    success: ${result.success}`,
  ].join('\n');

  content += '\n' + incident + '\n';
  fs.writeFileSync(memPath, content);

  logAudit(session, 'incident_recorded', { incidentId: session.id });
}

// ── Audit Log ──

/**
 * Write to PDCA audit log
 */
function logAudit(session, event, data = {}) {
  try {
    const auditDir = path.join(process.cwd(), '.bkit', 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    const logPath = path.join(auditDir, 'heal-audit.jsonl');
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: session.id,
      event,
      status: session.status,
      iteration: session.iterations,
      ...data,
    };

    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch { /* audit is non-critical */ }
}

/**
 * Get audit log for a session
 */
function getAuditLog(sessionId) {
  const logPath = path.join(process.cwd(), '.bkit', 'audit', 'heal-audit.jsonl');
  if (!fs.existsSync(logPath)) return [];

  return fs.readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(e => e && (!sessionId || e.sessionId === sessionId));
}

/**
 * Format heal session status
 */
function formatHealStatus(session) {
  const icons = {
    created: '🆕', loading: '📚', analyzing: '🔍', fixing: '🔧',
    verifying: '✅', 'pr-ready': '🔀', escalated: '🚨', failed: '❌',
  };
  const icon = icons[session.status] || '❓';

  const lines = [
    `${icon} Self-Healing: ${session.id}`,
    `─────────────────────────────`,
    `Status: ${session.status}`,
    `Error: ${session.error.message}`,
    `File: ${session.error.file}:${session.error.line || '?'}`,
    `Iterations: ${session.iterations}/${session.maxIterations}`,
    `Context: ${session.context ? (session.context.hasContext ? 'Loaded' : 'Empty') : 'Not loaded'}`,
  ];

  if (session.verification) {
    lines.push(`Verification: ${session.verification.allPassed ? 'PASS' : 'FAIL'}`);
  }

  return lines.join('\n');
}

/**
 * Generate context prompt for Claude Code
 * This is injected into Claude Code's prompt when Self-Healing runs
 */
function generateHealPrompt(session) {
  if (!session.context) return '';

  const parts = [
    '## Self-Healing Context\n',
    `Error: ${session.error.message}`,
    `File: ${session.error.file}:${session.error.line || '?'}`,
    `Stack: ${(session.error.stackTrace || '').slice(0, 500)}`,
    '',
    session.context.summary,
    '',
    '## Rules for Self-Healing Fix:',
    '1. Fix ONLY the reported error. Do not refactor surrounding code.',
    '2. ALL scenarios listed above MUST still pass after your fix.',
    '3. Do NOT violate any CRITICAL invariants.',
    '4. Check anti-patterns from past incidents — do not repeat them.',
    '5. If blast_radius >= 5, flag affected files for review.',
    '',
  ];

  return parts.join('\n');
}

module.exports = {
  createHealSession,
  loadHealContext,
  recordFix,
  verifyFix,
  shouldEscalate,
  recordIncident,
  logAudit,
  getAuditLog,
  formatHealStatus,
  generateHealPrompt,
  MAX_ITERATIONS,
};
