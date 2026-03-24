#!/usr/bin/env node
/**
 * Deploy Hook — Pre/Post validation for deploy operations
 * @version 3.0.0
 *
 * Events: deploy-start, deploy-complete, deploy-failed
 * Validates environment readiness and notifies on completion/failure.
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

  const toolName = input.tool_name || input.toolName || '';
  const command = input.tool_input?.command || '';

  // Only intercept deploy-related bash commands
  if (toolName !== 'Bash') {
    process.stdout.write(JSON.stringify({ result: 'allow' }));
    return;
  }

  const isDeployCommand = /docker\s+compose|kubectl\s+apply|terraform\s+(apply|plan)|argocd\s+app\s+sync|helm\s+(install|upgrade)/i.test(command);
  if (!isDeployCommand) {
    process.stdout.write(JSON.stringify({ result: 'allow' }));
    return;
  }

  // Pre-deploy validation
  const checks = [];

  // Check 1: .env.example exists
  if (fs.existsSync(path.join(process.cwd(), '.env.example'))) {
    checks.push({ name: '.env.example', status: 'pass' });
  } else {
    checks.push({ name: '.env.example', status: 'warn', msg: '.env.example not found' });
  }

  // Check 2: Dockerfile exists (for docker commands)
  if (command.includes('docker')) {
    if (fs.existsSync(path.join(process.cwd(), 'Dockerfile'))) {
      checks.push({ name: 'Dockerfile', status: 'pass' });
    } else {
      checks.push({ name: 'Dockerfile', status: 'fail', msg: 'Dockerfile not found' });
    }
  }

  // Check 3: K8s manifests exist (for kubectl/helm)
  if (command.includes('kubectl') || command.includes('helm')) {
    const k8sDir = path.join(process.cwd(), 'infra', 'k8s');
    if (fs.existsSync(k8sDir)) {
      checks.push({ name: 'k8s manifests', status: 'pass' });
    } else {
      checks.push({ name: 'k8s manifests', status: 'warn', msg: 'infra/k8s/ not found' });
    }
  }

  // Log deploy event
  const event = {
    type: 'deploy-start',
    timestamp: new Date().toISOString(),
    command: command.slice(0, 200),
    checks,
  };

  logDeployEvent(event);

  // Block if critical check failed
  const hasFail = checks.some(c => c.status === 'fail');
  if (hasFail) {
    const failMsg = checks.filter(c => c.status === 'fail').map(c => c.msg).join(', ');
    process.stdout.write(JSON.stringify({
      result: 'block',
      reason: `Deploy blocked: ${failMsg}`,
    }));
    return;
  }

  // Show warnings
  const warns = checks.filter(c => c.status === 'warn');
  if (warns.length > 0) {
    const warnMsg = warns.map(c => `  ⚠️ ${c.msg}`).join('\n');
    process.stderr.write(`\n🚀 Deploy Hook — Warnings:\n${warnMsg}\n\n`);
  }

  process.stdout.write(JSON.stringify({ result: 'allow' }));
}

function logDeployEvent(event) {
  try {
    const auditDir = path.join(process.cwd(), '.bkit', 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    const logPath = path.join(auditDir, 'deploy-events.jsonl');
    fs.appendFileSync(logPath, JSON.stringify(event) + '\n');
  } catch { /* non-critical */ }
}

main();
