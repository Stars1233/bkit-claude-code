#!/usr/bin/env node
/*
 * Domain Layer Purity Check — Sprint 5.5 C2
 *
 * Ensures lib/domain/** does not depend on Infrastructure-layer Node.js
 * built-ins. This enforces Clean Architecture — Domain must be pure
 * (no fs/child_process/net/http/https/os).
 *
 * Design Ref: bkit-v2110-gap-closure.design.md §3.3.3
 * Plan SC: G-W2 / "Domain 의존성 0" CI gate
 */

const fs = require('fs');
const path = require('path');

const DOMAIN_DIR = path.resolve(__dirname, '..', 'lib', 'domain');
const FORBIDDEN = ['fs', 'child_process', 'net', 'http', 'https', 'os', 'dns', 'tls', 'cluster'];

function* walkJS(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkJS(p);
    else if (entry.isFile() && /\.(js|mjs|cjs)$/.test(entry.name)) yield p;
  }
}

function checkFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  for (const mod of FORBIDDEN) {
    // require('fs'), require("fs"), import ... from 'fs'
    const reqPattern = new RegExp(`require\\(\\s*['\"]${mod}['\"]\\s*\\)`, 'g');
    const impPattern = new RegExp(`from\\s+['\"]${mod}['\"]`, 'g');
    if (reqPattern.test(src) || impPattern.test(src)) {
      violations.push(mod);
    }
  }
  return violations;
}

function main() {
  let hasViolation = false;
  let filesChecked = 0;

  for (const file of walkJS(DOMAIN_DIR)) {
    filesChecked++;
    const v = checkFile(file);
    if (v.length > 0) {
      hasViolation = true;
      const rel = path.relative(path.resolve(__dirname, '..'), file);
      console.error(`❌ ${rel}: forbidden import(s) [${v.join(', ')}]`);
    }
  }

  if (hasViolation) {
    console.error('\nDomain layer must not depend on Node.js built-ins.');
    console.error('Move side-effectful logic to lib/infra/ (Adapter) and keep lib/domain/ pure.');
    process.exit(1);
  }

  console.log(`✓ Domain layer purity OK — ${filesChecked} files checked, 0 forbidden imports.`);
  process.exit(0);
}

main();
