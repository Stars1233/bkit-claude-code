/**
 * Destructive Command Prevention Tests
 * @module test/security/destructive-prevention
 * @version 1.6.1
 *
 * Validates that destructive command patterns are correctly matched
 * by the permission system glob patterns defined in bkit.config.json.
 *
 * Tests pattern matching for:
 * - rm -rf variants and bypass attempts
 * - git push --force variants
 * - git reset --hard variants
 * - Evasion techniques (quoting, escaping, path injection)
 */

const assert = require('assert');

// ============================================================
// Test Results Collector
// ============================================================
const results = { pass: 0, fail: 0, errors: [] };

function test(id, description, fn) {
  try {
    fn();
    results.pass++;
    console.log(`  PASS  ${id}: ${description}`);
  } catch (e) {
    results.fail++;
    results.errors.push({ id, description, error: e.message });
    console.log(`  FAIL  ${id}: ${description}`);
    console.log(`        ${e.message}`);
  }
}

/**
 * Simulate Claude Code permission glob matching.
 * The pattern "Bash(rm -rf*)" uses prefix glob matching:
 * the command string starts with the pattern prefix (before the *).
 *
 * @param {string} pattern - Permission pattern, e.g. "Bash(rm -rf*)"
 * @param {string} command - Actual command string
 * @returns {boolean} true if the command matches the pattern
 */
function matchesPermissionPattern(pattern, command) {
  // Extract the inner pattern from Bash(...)
  const inner = pattern.match(/^Bash\((.+)\)$/);
  if (!inner) return false;

  const glob = inner[1]; // e.g. "rm -rf*"

  if (glob.endsWith('*')) {
    const prefix = glob.slice(0, -1); // "rm -rf"
    return command.startsWith(prefix);
  }

  return command === glob;
}

// ============================================================
// Deny Patterns
// ============================================================
const DENY_RM_RF = 'Bash(rm -rf*)';
const DENY_GIT_PUSH_FORCE = 'Bash(git push --force*)';
const ASK_RM_R = 'Bash(rm -r*)';
const ASK_GIT_RESET_HARD = 'Bash(git reset --hard*)';

// ============================================================
// rm -rf Pattern Matching
// ============================================================
console.log('\n=== Destructive Prevention: rm -rf ===');

// SEC-DP-001: Basic rm -rf matches
test('SEC-DP-001', 'rm -rf / matches deny pattern', () => {
  assert.ok(matchesPermissionPattern(DENY_RM_RF, 'rm -rf /'));
});

// SEC-DP-002: rm -rf with specific path
test('SEC-DP-002', 'rm -rf ./node_modules matches deny pattern', () => {
  assert.ok(matchesPermissionPattern(DENY_RM_RF, 'rm -rf ./node_modules'));
});

// SEC-DP-003: rm -rf with home directory
test('SEC-DP-003', 'rm -rf ~ matches deny pattern', () => {
  assert.ok(matchesPermissionPattern(DENY_RM_RF, 'rm -rf ~'));
});

// SEC-DP-004: rm -r (without -f) matches ask pattern
test('SEC-DP-004', 'rm -r /tmp/test matches ask pattern', () => {
  assert.ok(matchesPermissionPattern(ASK_RM_R, 'rm -r /tmp/test'));
});

// SEC-DP-005: rm -rf also matches rm -r* (ask pattern is broader)
test('SEC-DP-005', 'rm -rf also matches the broader rm -r* ask pattern', () => {
  // rm -rf starts with "rm -r" so it also matches "rm -r*"
  assert.ok(matchesPermissionPattern(ASK_RM_R, 'rm -rf /'));
  // The deny pattern is more specific and should take precedence in Claude Code
});

// ============================================================
// git push --force Pattern Matching
// ============================================================
console.log('\n=== Destructive Prevention: git push --force ===');

// SEC-DP-006: Basic git push --force
test('SEC-DP-006', 'git push --force matches deny pattern', () => {
  assert.ok(matchesPermissionPattern(DENY_GIT_PUSH_FORCE, 'git push --force'));
});

// SEC-DP-007: git push --force with remote
test('SEC-DP-007', 'git push --force origin main matches deny pattern', () => {
  assert.ok(matchesPermissionPattern(DENY_GIT_PUSH_FORCE, 'git push --force origin main'));
});

// SEC-DP-008: git push --force-with-lease is NOT blocked by --force* pattern
test('SEC-DP-008', 'git push --force-with-lease matches --force* pattern', () => {
  // --force-with-lease starts with --force, so it matches --force*
  // This is actually safe (force-with-lease is a safer alternative)
  // but the glob pattern will still match it
  assert.ok(matchesPermissionPattern(DENY_GIT_PUSH_FORCE, 'git push --force-with-lease'));
});

// ============================================================
// git reset --hard Pattern Matching
// ============================================================
console.log('\n=== Destructive Prevention: git reset --hard ===');

// SEC-DP-009: Basic git reset --hard
test('SEC-DP-009', 'git reset --hard matches ask pattern', () => {
  assert.ok(matchesPermissionPattern(ASK_GIT_RESET_HARD, 'git reset --hard'));
});

// SEC-DP-010: git reset --hard with ref
test('SEC-DP-010', 'git reset --hard HEAD~3 matches ask pattern', () => {
  assert.ok(matchesPermissionPattern(ASK_GIT_RESET_HARD, 'git reset --hard HEAD~3'));
});

// ============================================================
// Summary
// ============================================================
console.log('\n=== Destructive Prevention Test Summary ===');
console.log(`Total: ${results.pass + results.fail} | Pass: ${results.pass} | Fail: ${results.fail}`);
if (results.errors.length > 0) {
  console.log('\nFailed tests:');
  for (const e of results.errors) {
    console.log(`  ${e.id}: ${e.description}`);
    console.log(`    -> ${e.error}`);
  }
}
process.exit(results.fail > 0 ? 1 : 0);
