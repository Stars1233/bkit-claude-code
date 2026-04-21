#!/usr/bin/env node
/**
 * config-change-handler.js - ConfigChange Hook Handler
 * Logs configuration changes and checks for dangerous permission modifications.
 *
 * Input: { source, file_path }
 * Output: none (audit + security warning)
 *
 * @version 2.0.0
 * @module scripts/config-change-handler
 */

const fs = require('fs');
const { readStdinSync, outputEmpty } = require('../lib/core/io');
const { debugLog } = require('../lib/core/debug');

// Dangerous config patterns that should be flagged.
//
// Defense-in-Depth Architecture (2026-04-21, ENH-254):
//   Layer 1 (CC runtime sandbox):
//     - CC v2.1.113 #23: `dangerouslyDisableSandbox` can no longer bypass sandbox without permission prompt
//     - CC v2.1.116 S1: Sandbox auto-allow no longer bypasses dangerous-path safety for rm/rmdir on /, $HOME, critical dirs
//     - CC v2.1.113 #14/#15/#16: Bash deny rule wrapper hardening (env/sudo/setsid), find -exec, /private/* rm
//   Layer 2 (bkit config-change hook, this file):
//     - Detects these 5 patterns in config file writes and flags as SECURITY WARNING
//     - Complements CC runtime defense; provides early detection at settings layer
//   IMPORTANT: Both layers together do NOT guarantee user data safety.
//   Users must NOT rely on either layer alone. See docs/03-analysis/security-architecture.md.
const DANGEROUS_PATTERNS = [
  'dangerouslyDisableSandbox',      // CC v2.1.113 #23 hardened at runtime (2026-04-17)
  'excludedCommands',                // Sandbox bypass mechanism
  'autoAllowBashIfSandboxed',        // Auto-allow without permission (v2.1.116 S1 tightened)
  'chmod 777',                       // World-writable permissions
  'allowRead',                       // Broad read access grants
];

let input;
try {
  input = readStdinSync();
} catch (e) {
  debugLog('ConfigChange', 'Failed to read stdin', { error: e.message });
  outputEmpty();
  process.exit(0);
}

const source = input.source || '';
const filePath = input.file_path || input.filePath || '';

debugLog('ConfigChange', 'Hook started', { source, filePath });

// Step 1: Log config change to audit
try {
  const { writeAuditLog } = require('../lib/audit/audit-logger');
  writeAuditLog({
    actor: 'system',
    actorId: 'config-change-handler',
    action: 'config_changed',
    category: 'config',
    target: source || filePath || 'unknown',
    targetType: 'config',
    details: { source, filePath },
    result: 'success',
  });
  debugLog('ConfigChange', 'Audit log written');
} catch (e) {
  debugLog('ConfigChange', 'Audit write failed (non-critical)', { error: e.message });
}

// Step 2: Check for dangerous permission changes
try {
  if (filePath && fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const dangers = [];

    for (const pattern of DANGEROUS_PATTERNS) {
      if (content.includes(pattern)) {
        dangers.push(pattern);
      }
    }

    if (dangers.length > 0) {
      debugLog('ConfigChange', 'SECURITY WARNING: Dangerous config detected', {
        patterns: dangers,
        filePath,
      });

      // Write security warning to audit
      try {
        const { writeAuditLog } = require('../lib/audit/audit-logger');
        writeAuditLog({
          actor: 'hook',
          actorId: 'config-change-handler',
          action: 'destructive_blocked',
          category: 'control',
          target: filePath,
          targetType: 'config',
          details: {
            event: 'dangerous_config_detected',
            patterns: dangers,
          },
          result: 'blocked',
          reason: `Dangerous config patterns found: ${dangers.join(', ')}`,
          destructiveOperation: true,
          blastRadius: 'high',
        });
      } catch (_) { /* non-critical */ }
    }
  }
} catch (e) {
  debugLog('ConfigChange', 'Security check failed (non-critical)', { error: e.message });
}

debugLog('ConfigChange', 'Hook completed', { source, filePath });
outputEmpty();
process.exit(0);
