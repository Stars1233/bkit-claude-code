#!/usr/bin/env node
/**
 * notification-handler.js - Notification Hook Handler
 * Enriches idle notifications with PDCA context and logs to audit.
 *
 * Input: { message, title, notification_type }
 * Output: hookSpecificOutput with additionalContext (PDCA status info)
 *
 * @version 2.1.10
 * @module scripts/notification-handler
 */

const { readStdinSync, outputAllow, outputEmpty } = require('../lib/core/io');
const { debugLog } = require('../lib/core/debug');
const { getPdcaStatusFull } = require('../lib/pdca/status');

let input;
try {
  input = readStdinSync();
} catch (e) {
  debugLog('Notification', 'Failed to read stdin', { error: e.message });
  outputEmpty();
  process.exit(0);
}

const message = input.message || '';
const title = input.title || '';
const notificationType = input.notification_type || input.notificationType || '';

debugLog('Notification', 'Hook started', { notificationType, title });

// Step 1: Log notification to audit
try {
  const { writeAuditLog } = require('../lib/audit/audit-logger');
  writeAuditLog({
    actor: 'system',
    actorId: 'notification-handler',
    action: 'phase_transition',
    category: 'control',
    target: notificationType || 'notification',
    targetType: 'feature',
    details: {
      event: 'notification',
      notificationType,
      title,
      message: message.substring(0, 200),
    },
    result: 'success',
  });
} catch (e) {
  debugLog('Notification', 'Audit write failed (non-critical)', { error: e.message });
}

// Step 2: Enrich idle notifications with PDCA + Sprint context (v2.1.13)
if (notificationType === 'idle_prompt') {
  try {
    const pdcaStatus = getPdcaStatusFull();
    const fragments = [];

    if (pdcaStatus) {
      const feature = pdcaStatus.feature || pdcaStatus.featureName || 'none';
      const phase = pdcaStatus.phase || pdcaStatus.currentPhase || 'none';
      const progress = pdcaStatus.progress || 'unknown';
      fragments.push(`PDCA: feature="${feature}", phase=${phase}, progress=${progress}`);
      debugLog('Notification', 'PDCA context enriched', { feature, phase });
    }

    // v2.1.13: Sprint context enrichment (best-effort, non-blocking)
    try {
      const fs = require('node:fs');
      const path = require('node:path');
      const sprintFile = path.join(process.cwd(), '.bkit/state/sprint-status.json');
      if (fs.existsSync(sprintFile)) {
        const sprintState = JSON.parse(fs.readFileSync(sprintFile, 'utf8'));
        const active = Object.values(sprintState.entries || {})
          .filter((s) => s && s.status === 'active')
          .map((s) => `${s.id}(${s.phase})`);
        const paused = Object.values(sprintState.entries || {})
          .filter((s) => s && s.status === 'paused')
          .map((s) => `${s.id}(paused@${s.phase})`);
        if (active.length > 0 || paused.length > 0) {
          const sprintParts = [];
          if (active.length > 0) sprintParts.push(`active=[${active.slice(0, 3).join(', ')}]`);
          if (paused.length > 0) sprintParts.push(`paused=[${paused.slice(0, 3).join(', ')}]`);
          fragments.push(`Sprint: ${sprintParts.join(' ')}`);
        }
      }
    } catch (sprintErr) {
      debugLog('Notification', 'Sprint enrichment failed (non-critical)', { error: sprintErr.message });
    }

    if (fragments.length > 0) {
      const context = fragments.join('. ') + '. Resume work or run /pdca status or /sprint list for details.';
      outputAllow(context, 'Notification');
      process.exit(0);
    }
  } catch (e) {
    debugLog('Notification', 'PDCA enrichment failed (non-critical)', { error: e.message });
  }
}

debugLog('Notification', 'Hook completed', { notificationType });
outputEmpty();
process.exit(0);
