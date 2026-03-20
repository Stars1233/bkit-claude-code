'use strict';
/**
 * Unit Tests for lib/ui/ansi.js
 * 10 TC | console.assert based | no external dependencies
 */

// Force NO_COLOR off initially so we can test both paths
delete process.env.NO_COLOR;
delete process.env.ANSI_DISABLED;

let mod;
try {
  mod = require('../../lib/ui/ansi');
} catch (e) {
  console.error('Module load failed:', e.message);
  process.exit(1);
}

let passed = 0, failed = 0, total = 0;

function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; console.error(`  FAIL: ${id} - ${message}`); }
}

console.log('\n=== ansi.test.js ===\n');

// --- AN-001: COLORS object has all expected keys ---
const expectedColors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'reset'];
assert('AN-001', expectedColors.every(k => k in mod.COLORS), 'COLORS object has all expected keys');

// --- AN-002: STYLES object has all expected keys ---
const expectedStyles = ['bold', 'dim', 'underline', 'reset'];
assert('AN-002', expectedStyles.every(k => k in mod.STYLES), 'STYLES object has all expected keys');

// --- AN-003: colorize() wraps text with ANSI codes when color enabled ---
// Temporarily ensure color is enabled (stdout may not be TTY in test, so we test the function logic)
const originalNoColor = process.env.NO_COLOR;
const originalIsTTY = process.stdout.isTTY;
delete process.env.NO_COLOR;
delete process.env.ANSI_DISABLED;
// Force isTTY for this test
Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

const colored = mod.colorize('hello', 'red');
assert('AN-003', colored.includes('\x1b[31m') && colored.includes('\x1b[0m'),
  'colorize() wraps text with ANSI red code and reset');

// --- AN-004: colorize() with invalid color returns plain text ---
const invalidColor = mod.colorize('hello', 'nonexistent');
assert('AN-004', invalidColor === 'hello', 'colorize() with invalid color returns plain text');

// --- AN-005: NO_COLOR env var disables colors ---
process.env.NO_COLOR = '1';
const noColorResult = mod.colorize('test', 'green');
assert('AN-005', noColorResult === 'test', 'NO_COLOR=1 disables colorize output');

// --- AN-006: NO_COLOR disables bold() ---
const noBoldResult = mod.bold('test');
assert('AN-006', noBoldResult === 'test', 'NO_COLOR=1 disables bold output');

// Clean up NO_COLOR
delete process.env.NO_COLOR;
// Restore isTTY
Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });

// --- AN-007: getTermWidth returns a number ---
const tw = mod.getTermWidth();
assert('AN-007', typeof tw === 'number' && tw > 0, `getTermWidth returns positive number (${tw})`);

// --- AN-008: getWidthBreakpoint returns valid category ---
const bp = mod.getWidthBreakpoint();
const validBp = ['narrow', 'normal', 'wide', 'ultrawide'];
assert('AN-008', validBp.includes(bp), `getWidthBreakpoint returns valid category (${bp})`);

// --- AN-009: truncate function works correctly ---
const trunc1 = mod.truncate('hello world', 5);
assert('AN-009',
  trunc1.length <= 5 && trunc1.endsWith('\u2026'),
  'truncate shortens text and appends ellipsis');

// --- AN-010: hline and center functions ---
const hl = mod.hline(10);
assert('AN-010',
  hl.length === 10 && typeof mod.center('hi', 20) === 'string' && mod.center('hi', 20).length === 20,
  'hline creates correct width line and center pads to width');

console.log(`\n${'='.repeat(50)}`);
console.log(`ansi.test.js: ${passed}/${total} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
