#!/usr/bin/env node
/**
 * Self-Healing Hook — Lifecycle events for heal operations
 * @version 3.0.0
 *
 * Events: heal-start, heal-complete, heal-failed, heal-escalate
 */
const fs = require('fs');
const path = require('path');

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  } catch {
    process.stdout.write(JSON.stringify({ result: 'allow' }));
    return;
  }

  const event = input.event || '';
  const sessionId = input.sessionId || '';
  const data = input.data || {};

  const logEntry = {
    type: `heal-${event}`,
    timestamp: new Date().toISOString(),
    sessionId,
    ...data,
  };

  // Log to audit
  try {
    const auditDir = path.join(process.cwd(), '.bkit', 'audit');
    if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });
    fs.appendFileSync(
      path.join(auditDir, 'heal-events.jsonl'),
      JSON.stringify(logEntry) + '\n'
    );
  } catch { /* non-critical */ }

  // Notifications
  if (event === 'escalate') {
    process.stderr.write([
      '',
      '🚨 Self-Healing ESCALATION',
      `   Session: ${sessionId}`,
      `   Reason: ${data.reason || 'Max iterations reached'}`,
      '   Action Required: Human developer must review and fix manually.',
      '',
    ].join('\n'));
  }

  if (event === 'complete') {
    process.stderr.write([
      '',
      '✅ Self-Healing Complete',
      `   Session: ${sessionId}`,
      `   Iterations: ${data.iterations || '?'}`,
      `   PR Ready: ${data.prReady ? 'Yes' : 'No'}`,
      '',
    ].join('\n'));
  }

  process.stdout.write(JSON.stringify({ result: 'allow' }));
}

main();
