#!/usr/bin/env node
/**
 * TC-B1~B4: ENH-238 session-context.js opt-out gate tests.
 * Uses child_process.spawnSync for full cache isolation (same pattern as ui-opt-out-matrix).
 * Run: node tests/qa/session-context.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

let pass = 0;
let fail = 0;
function tc(id, fn) {
  try {
    fn();
    console.log(`✅ ${id} PASS`);
    pass++;
  } catch (e) {
    console.error(`❌ ${id} FAIL — ${e.message}`);
    fail++;
  }
}

/**
 * Spawn a Node child that requires session-context.js and prints build() result to stdout.
 * Runs in a tmp cwd with the given bkit.config.json.
 */
function runBuild(bkitConfig) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bkit-ctx-'));
  try {
    if (bkitConfig !== null) {
      const body = typeof bkitConfig === 'string' ? bkitConfig : JSON.stringify(bkitConfig);
      fs.writeFileSync(path.join(tmp, 'bkit.config.json'), body);
    }
    const runner = `
      const path = require('path');
      const MOD = path.join(${JSON.stringify(PROJECT_ROOT)}, 'hooks/startup/session-context.js');
      const { build } = require(MOD);
      const out = build(null, { onboardingData: { type: 'new_user', hasExistingWork: false }, triggerTable: '' });
      process.stdout.write(out);
    `;
    const env = { ...process.env, CLAUDE_PLUGIN_ROOT: PROJECT_ROOT, CLAUDE_PROJECT_DIR: tmp };
    // Ensure PROJECT_DIR follows tmp (config.js resolves via CLAUDE_PROJECT_DIR || cwd)
    const r = spawnSync('node', ['-e', runner], {
      cwd: tmp,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      timeout: 5000,
    });
    return { stdout: r.stdout.toString(), stderr: r.stderr.toString(), code: r.status };
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_e) {}
  }
}

// v2.1.11 (FR-α2-c): header now includes One-Liner verbatim. Build expected
// dynamically from branding SSoT so the test follows ONE_LINER_EN drift-free.
const { ONE_LINER_EN } = require(path.join(PROJECT_ROOT, 'lib/infra/branding'));
const HEADER_ONLY = `# bkit Vibecoding Kit v2.1.8 - Session Startup\n\n> ${ONE_LINER_EN}\n\n`;

// TC-B1: 기본값 (config.ui 미지정) → 8 builder 전부 실행
tc('TC-B1', () => {
  const r = runBuild({ version: '2.1.8', ui: {} });
  assert.strictEqual(r.code, 0, `exit 0, got ${r.code}. stderr=${r.stderr}`);
  assert(r.stdout.includes('Session Startup'), 'header present');
  assert(r.stdout.includes('PDCA Core Rules'), 'pdcaCoreRules present');
  assert(r.stdout.includes('Output Styles'), 'outputStyles present');
  assert(r.stdout.length > 1500, `len=${r.stdout.length}, expected >1500`);
});

// TC-B2: enabled=false → 헤더만
tc('TC-B2', () => {
  const r = runBuild({ version: '2.1.8', ui: { contextInjection: { enabled: false } } });
  assert.strictEqual(r.code, 0, `exit 0, got ${r.code}. stderr=${r.stderr}`);
  assert.strictEqual(r.stdout, HEADER_ONLY, `expected header-only, got ${r.stdout.length} chars`);
});

// TC-B3: sections=["pdcaCoreRules"] 만 활성화
tc('TC-B3', () => {
  const r = runBuild({
    version: '2.1.8',
    ui: { contextInjection: { enabled: true, sections: ['pdcaCoreRules'] } },
  });
  assert.strictEqual(r.code, 0, `exit 0, got ${r.code}. stderr=${r.stderr}`);
  assert(r.stdout.includes('PDCA Core Rules'), 'pdcaCoreRules present');
  assert(!r.stdout.includes('Output Styles'), 'outputStyles absent');
  assert(!r.stdout.includes('8-language auto-detection'), 'automation absent');
});

// TC-B4: sections=[] 빈 배열 → 헤더만
tc('TC-B4', () => {
  const r = runBuild({
    version: '2.1.8',
    ui: { contextInjection: { enabled: true, sections: [] } },
  });
  assert.strictEqual(r.code, 0, `exit 0, got ${r.code}. stderr=${r.stderr}`);
  assert.strictEqual(r.stdout, HEADER_ONLY, 'empty sections → header-only');
});

// TC-B4b: config 손상 시 fail-open (기본값 8 builder)
tc('TC-B4b', () => {
  const r = runBuild('!!! corrupt !!!');
  assert.strictEqual(r.code, 0, `exit 0 (fail-open), got ${r.code}. stderr=${r.stderr}`);
  assert(r.stdout.includes('Session Startup'), 'header present on corrupt config');
  assert(r.stdout.length > 500, 'default builders run on corrupt config');
});

// TC-B4c: config 없음 → 기본값 경로 (cwd에 파일 없어도 plugin root 경로 시도)
tc('TC-B4c', () => {
  const r = runBuild(null);
  assert.strictEqual(r.code, 0, `exit 0, got ${r.code}. stderr=${r.stderr}`);
  // plugin root의 bkit.config.json이 로드되므로 사실상 기본 동작과 동일
  assert(r.stdout.length > 0, 'some output even without project config');
});

console.log(`\n[session-context.test] ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
