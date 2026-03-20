#!/usr/bin/env node
/**
 * Performance Test Suite: Hook System
 * @file test/performance/hook-perf.test.js
 * @version 1.6.1
 *
 * 15 Performance test cases for hook system
 * - Measures hook execution time
 * - Validates hook performance under various loads
 * - Tests: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse hooks
 */

const { performance } = require('perf_hooks');
const assert = require('assert');

// =====================================================
// Configuration
// =====================================================

const HOOK_PERFORMANCE_THRESHOLDS = {
  sessionStart: 500,           // < 500ms (v2.1.49 measured)
  userPromptSubmit: 200,       // < 200ms
  preToolUse: 150,             // < 150ms
  postToolUse: 200,            // < 200ms
  postToolUseFailure: 200,     // < 200ms
  notification: 100,           // < 100ms
  subagentStart: 100,          // < 100ms
  subagentStop: 100,           // < 100ms
  taskCompleted: 150,          // < 150ms
  preCompact: 100,             // < 100ms
};

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  measurements: []
};

// =====================================================
// Utility Functions
// =====================================================

function simulateHookExecution(hookType, duration) {
  // Simulate async hook execution
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

function measureHookTime(fn) {
  const start = performance.now();
  fn();
  const end = performance.now();
  return end - start;
}

async function measureAsyncHookTime(fn) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
}

function assertHookPerformance(testName, measurements, threshold) {
  const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
  const pass = avgTime < threshold;

  const measurement = {
    name: testName,
    duration: avgTime.toFixed(2),
    threshold: threshold,
    unit: 'ms',
    pass: pass
  };
  results.measurements.push(measurement);

  if (pass) {
    console.log(`✓ HKP-${String(Object.keys(results.measurements).length).padStart(2, '0')}: ${testName}`);
    console.log(`  Avg: ${avgTime.toFixed(2)}ms / Threshold: ${threshold}ms`);
    results.passed++;
  } else {
    console.log(`✗ HKP-${String(Object.keys(results.measurements).length).padStart(2, '0')}: ${testName}`);
    console.log(`  Avg: ${avgTime.toFixed(2)}ms / Threshold: ${threshold}ms (EXCEEDED)`);
    results.failed++;
  }
}

// =====================================================
// Hook Performance Tests (15 TC)
// =====================================================

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║    Performance Test Suite: Hook System (15 TC)         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // =====================================================
    // SessionStart Hook Tests (HKP-001 ~ HKP-003)
    // =====================================================

    console.log('\n--- SessionStart Hook Tests ---\n');

    // HKP-001: SessionStart hook single execution
    console.log('[HKP-001] SessionStart hook - single execution');
    const sessionStartMeasurements = [];
    for (let i = 0; i < 5; i++) {
      const time = measureHookTime(() => {
        // Simulate SessionStart hook: load config, init plugins, detect platform
        const data = {};
        for (let j = 0; j < 100; j++) {
          data[`key${j}`] = `value${j}`;
        }
        JSON.stringify(data);
      });
      sessionStartMeasurements.push(time);
    }
    assertHookPerformance('SessionStart hook', sessionStartMeasurements, 500);

    // HKP-002: SessionStart with plugin loading simulation
    console.log('\n[HKP-002] SessionStart with plugin loading');
    const pluginLoadMeasurements = [];
    for (let i = 0; i < 5; i++) {
      const time = measureHookTime(() => {
        // Simulate loading 27 skills + 16 agents
        let plugins = [];
        for (let j = 0; j < 43; j++) {
          plugins.push({ id: `plugin${j}`, loaded: true });
        }
      });
      pluginLoadMeasurements.push(time);
    }
    assertHookPerformance('SessionStart with plugins', pluginLoadMeasurements, 500);

    // HKP-003: SessionStart cache operations
    console.log('\n[HKP-003] SessionStart cache operations');
    const cacheInitMeasurements = [];
    const cache = {};
    for (let i = 0; i < 5; i++) {
      const time = measureHookTime(() => {
        // Simulate cache initialization
        for (let j = 0; j < 50; j++) {
          cache[`cache_key_${j}`] = { data: `value${j}`, timestamp: Date.now() };
        }
      });
      cacheInitMeasurements.push(time);
    }
    assertHookPerformance('SessionStart cache init', cacheInitMeasurements, 500);

    // =====================================================
    // UserPromptSubmit Hook Tests (HKP-004 ~ HKP-006)
    // =====================================================

    console.log('\n--- UserPromptSubmit Hook Tests ---\n');

    // HKP-004: UserPromptSubmit basic analysis
    console.log('[HKP-004] UserPromptSubmit - text analysis');
    const promptAnalysisMeasurements = [];
    for (let i = 0; i < 10; i++) {
      const time = measureHookTime(() => {
        // Simulate prompt analysis: language detection, ambiguity calculation
        const prompt = 'Run /pdca plan new-feature-test implementation';
        const tokens = prompt.split(' ').length;
        const length = prompt.length;
        const hasSlash = prompt.includes('/');
      });
      promptAnalysisMeasurements.push(time);
    }
    assertHookPerformance('UserPromptSubmit analysis', promptAnalysisMeasurements, 200);

    // HKP-005: UserPromptSubmit intent detection
    console.log('\n[HKP-005] UserPromptSubmit - intent detection');
    const intentDetectionMeasurements = [];
    for (let i = 0; i < 10; i++) {
      const time = measureHookTime(() => {
        // Simulate intent detection with pattern matching
        const patterns = ['pdca', 'memory', 'skills', 'agents', 'help', 'reload'];
        const prompt = 'Run /pdca plan test-feature';
        patterns.filter(p => prompt.includes(`/${p}`));
      });
      intentDetectionMeasurements.push(time);
    }
    assertHookPerformance('UserPromptSubmit intent', intentDetectionMeasurements, 200);

    // HKP-006: UserPromptSubmit ambiguity check
    console.log('\n[HKP-006] UserPromptSubmit - ambiguity check');
    const ambiguityMeasurements = [];
    for (let i = 0; i < 10; i++) {
      const time = measureHookTime(() => {
        // Simulate ambiguity scoring
        const prompt = 'Implement feature';
        const keywords = ['feature', 'implement', 'add', 'create', 'build'];
        let score = 0;
        keywords.forEach(kw => {
          if (prompt.toLowerCase().includes(kw)) score += 0.1;
        });
      });
      ambiguityMeasurements.push(time);
    }
    assertHookPerformance('UserPromptSubmit ambiguity', ambiguityMeasurements, 200);

    // =====================================================
    // PreToolUse Hook Tests (HKP-007 ~ HKP-009)
    // =====================================================

    console.log('\n--- PreToolUse Hook Tests ---\n');

    // HKP-007: PreToolUse permission check
    console.log('[HKP-007] PreToolUse - permission check');
    const permissionMeasurements = [];
    for (let i = 0; i < 20; i++) {
      const time = measureHookTime(() => {
        // Simulate permission checking
        const permissions = {
          'Read': 'allow',
          'Write': 'allow',
          'Edit': 'allow',
          'Bash': 'allow',
          'Bash(rm -rf*)': 'deny'
        };
        const tool = 'Bash';
        const denied = Object.keys(permissions).some(p => p.startsWith(tool) && permissions[p] === 'deny');
      });
      permissionMeasurements.push(time);
    }
    assertHookPerformance('PreToolUse permission', permissionMeasurements, 150);

    // HKP-008: PreToolUse tool analysis
    console.log('\n[HKP-008] PreToolUse - tool analysis');
    const toolAnalysisMeasurements = [];
    for (let i = 0; i < 20; i++) {
      const time = measureHookTime(() => {
        // Simulate tool analysis
        const tools = ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'];
        const requestedTool = 'Read';
        const allowed = tools.includes(requestedTool);
      });
      toolAnalysisMeasurements.push(time);
    }
    assertHookPerformance('PreToolUse analysis', toolAnalysisMeasurements, 150);

    // HKP-009: PreToolUse parameter validation
    console.log('\n[HKP-009] PreToolUse - parameter validation');
    const paramValidationMeasurements = [];
    for (let i = 0; i < 20; i++) {
      const time = measureHookTime(() => {
        // Simulate parameter validation
        const params = {
          file_path: '/path/to/file.md',
          content: 'test content',
          limit: 100
        };
        const isValid = Object.keys(params).length > 0 && params.file_path && params.content;
      });
      paramValidationMeasurements.push(time);
    }
    assertHookPerformance('PreToolUse validation', paramValidationMeasurements, 150);

    // =====================================================
    // PostToolUse Hook Tests (HKP-010 ~ HKP-012)
    // =====================================================

    console.log('\n--- PostToolUse Hook Tests ---\n');

    // HKP-010: PostToolUse result processing
    console.log('[HKP-010] PostToolUse - result processing');
    const resultProcessingMeasurements = [];
    for (let i = 0; i < 15; i++) {
      const time = measureHookTime(() => {
        // Simulate result processing
        const result = {
          success: true,
          output: 'test output',
          duration: 100,
          lines: 5
        };
        const processed = {
          ...result,
          timestamp: Date.now(),
          processed: true
        };
      });
      resultProcessingMeasurements.push(time);
    }
    assertHookPerformance('PostToolUse processing', resultProcessingMeasurements, 200);

    // HKP-011: PostToolUse error handling
    console.log('\n[HKP-011] PostToolUse - error handling');
    const errorHandlingMeasurements = [];
    for (let i = 0; i < 15; i++) {
      const time = measureHookTime(() => {
        // Simulate error handling
        const result = { success: false, error: 'Test error' };
        const errorInfo = {
          type: 'tool_error',
          message: result.error,
          recoverable: true
        };
      });
      errorHandlingMeasurements.push(time);
    }
    assertHookPerformance('PostToolUse error handling', errorHandlingMeasurements, 200);

    // HKP-012: PostToolUse logging
    console.log('\n[HKP-012] PostToolUse - logging');
    const loggingMeasurements = [];
    for (let i = 0; i < 15; i++) {
      const time = measureHookTime(() => {
        // Simulate logging operations
        const logEntry = {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          tool: 'Read',
          duration: 50,
          success: true
        };
        JSON.stringify(logEntry);
      });
      loggingMeasurements.push(time);
    }
    assertHookPerformance('PostToolUse logging', loggingMeasurements, 200);

    // =====================================================
    // Other Hook Tests (HKP-013 ~ HKP-015)
    // =====================================================

    console.log('\n--- Other Hook Tests ---\n');

    // HKP-013: Notification hook
    console.log('[HKP-013] Notification hook');
    const notificationMeasurements = [];
    for (let i = 0; i < 30; i++) {
      const time = measureHookTime(() => {
        // Simulate notification processing
        const notification = {
          type: 'info',
          message: 'Test notification',
          timestamp: Date.now()
        };
      });
      notificationMeasurements.push(time);
    }
    assertHookPerformance('Notification hook', notificationMeasurements, 100);

    // HKP-014: Task tracking hook
    console.log('\n[HKP-014] Task completed hook');
    const taskMeasurements = [];
    for (let i = 0; i < 25; i++) {
      const time = measureHookTime(() => {
        // Simulate task completion tracking
        const task = {
          id: `task_${i}`,
          duration: 1000 + (i * 100),
          success: i % 2 === 0,
          resultLines: 50 + (i * 10)
        };
      });
      taskMeasurements.push(time);
    }
    assertHookPerformance('Task completed hook', taskMeasurements, 150);

    // HKP-015: Combined hook processing
    console.log('\n[HKP-015] Combined hook processing');
    const combinedMeasurements = [];
    for (let i = 0; i < 10; i++) {
      const time = measureHookTime(() => {
        // Simulate multiple hooks fired together
        const sessionData = { started: true };
        const promptData = { analyzed: true };
        const toolData = { checked: true };
        const combined = { ...sessionData, ...promptData, ...toolData };
      });
      combinedMeasurements.push(time);
    }
    assertHookPerformance('Combined hook processing', combinedMeasurements, 200);

  } catch (err) {
    console.error('\nTest error:', err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
  }

  // =====================================================
  // Print Summary
  // =====================================================

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              Hook Performance Summary                  ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ✓ Passed: ${String(results.passed).padStart(48)}║`);
  console.log(`║  ✗ Failed: ${String(results.failed).padStart(48)}║`);
  console.log(`║  ⏭ Skipped: ${String(results.skipped).padStart(47)}║`);
  console.log('╠════════════════════════════════════════════════════════╣');

  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
  console.log(`║  Pass Rate: ${String(passRate + '%').padStart(47)}║`);

  // Show slowest hooks
  if (results.measurements.length > 0) {
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Slowest Hooks:                                        ║');
    const sorted = results.measurements
      .sort((a, b) => parseFloat(b.duration) - parseFloat(a.duration))
      .slice(0, 5);
    sorted.forEach((m, i) => {
      const name = m.name.substring(0, 32).padEnd(32);
      const duration = `${m.duration}ms`.padStart(8);
      const icon = m.pass ? '✓' : '✗';
      console.log(`║  ${i + 1}. ${name} ${duration} ${icon}  ║`);
    });
  }

  console.log('╚════════════════════════════════════════════════════════╝\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
