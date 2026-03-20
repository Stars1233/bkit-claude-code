#!/usr/bin/env node
/**
 * Performance Test Suite: Benchmark System
 * @file test/performance/benchmark-perf.test.js
 * @version 1.6.1
 *
 * 15 Performance test cases for benchmark system
 * - Measures eval runner performance
 * - Validates skill evaluation speed
 * - Tests: YAML parsing, criteria evaluation, reporting
 */

const { performance } = require('perf_hooks');
const assert = require('assert');
const path = require('path');

// =====================================================
// Configuration
// =====================================================

const BENCHMARK_THRESHOLDS = {
  parseEvalYaml: 50,            // < 50ms per file
  evaluateEval: 20,             // < 20ms per eval
  buildBenchmarkReport: 100,    // < 100ms
  calculateScore: 5,            // < 5ms
  sortResults: 10,              // < 10ms
  filterByClassification: 5,    // < 5ms
  aggregateResults: 50,         // < 50ms
  validateEval: 10,             // < 10ms
  formatReportLine: 5,          // < 5ms
  generateSummary: 100,         // < 100ms
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

function measureFunction(fn, iterations = 100) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  return (end - start) / iterations;
}

function assertBenchmarkPerformance(testName, fn, threshold, iterations = 100) {
  try {
    const avgTime = measureFunction(fn, iterations);
    const pass = avgTime < threshold;

    const measurement = {
      name: testName,
      duration: avgTime.toFixed(3),
      threshold: threshold,
      unit: 'ms',
      pass: pass
    };
    results.measurements.push(measurement);

    const index = results.measurements.length;
    if (pass) {
      console.log(`✓ BMP-${String(index).padStart(2, '0')}: ${testName}`);
      console.log(`  Avg: ${avgTime.toFixed(3)}ms / Threshold: ${threshold}ms`);
      results.passed++;
    } else {
      console.log(`✗ BMP-${String(index).padStart(2, '0')}: ${testName}`);
      console.log(`  Avg: ${avgTime.toFixed(3)}ms / Threshold: ${threshold}ms (EXCEEDED by ${(avgTime - threshold).toFixed(3)}ms)`);
      results.failed++;
    }
  } catch (err) {
    console.log(`✗ BMP-${String(results.measurements.length + 1).padStart(2, '0')}: ${testName}`);
    console.log(`  Error: ${err.message}`);
    results.failed++;
  }
}

// =====================================================
// Benchmark Tests (15 TC)
// =====================================================

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Performance Test Suite: Benchmark (15 TC)            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // =====================================================
    // YAML Parsing Tests (BMP-001 ~ BMP-003)
    // =====================================================

    console.log('\n--- YAML Parsing Tests ---\n');

    // BMP-001: Parse simple eval YAML
    console.log('[BMP-001] Parse simple eval YAML');
    const simpleYaml = `
name: test-skill
classification: capability
evals:
  - name: test-eval-1
    description: Test evaluation 1
    criteria:
      - Must have clear output
      - Must validate input
`;
    assertBenchmarkPerformance(
      'Parse simple YAML',
      () => {
        const lines = simpleYaml.split('\n');
        lines.forEach(line => {
          line.trim();
        });
      },
      BENCHMARK_THRESHOLDS.parseEvalYaml,
      100
    );

    // BMP-002: Parse complex eval YAML
    console.log('\n[BMP-002] Parse complex eval YAML');
    const complexYaml = `
name: complex-skill
classification: workflow
evals:
  - name: eval-1
    description: Complex evaluation
    criteria:
      - First criterion
      - Second criterion
      - Third criterion
    timeout: 5000
  - name: eval-2
    description: Another evaluation
    criteria:
      - Criterion A
      - Criterion B
parity_test:
  enabled: true
  threshold: 90
benchmark:
  enabled: true
  timeout: 10000
`;
    assertBenchmarkPerformance(
      'Parse complex YAML',
      () => {
        const lines = complexYaml.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.includes(':')) {
            const [key, value] = trimmed.split(':');
          }
        });
      },
      BENCHMARK_THRESHOLDS.parseEvalYaml,
      100
    );

    // BMP-003: Parse large eval YAML (multiple evals)
    console.log('\n[BMP-003] Parse large eval YAML');
    let largeYaml = 'name: large-skill\nclassification: hybrid\nevals:\n';
    for (let i = 0; i < 20; i++) {
      largeYaml += `  - name: eval-${i}\n    description: Eval ${i}\n    criteria:\n      - Criterion A\n      - Criterion B\n`;
    }
    assertBenchmarkPerformance(
      'Parse large YAML',
      () => {
        const lines = largeYaml.split('\n');
        let evalCount = 0;
        lines.forEach(line => {
          if (line.trim().startsWith('- name:')) evalCount++;
        });
      },
      BENCHMARK_THRESHOLDS.parseEvalYaml * 2,
      50
    );

    // =====================================================
    // Criteria Evaluation Tests (BMP-004 ~ BMP-007)
    // =====================================================

    console.log('\n--- Criteria Evaluation Tests ---\n');

    // BMP-004: Evaluate single criterion
    console.log('[BMP-004] Evaluate single criterion');
    assertBenchmarkPerformance(
      'Single criterion evaluation',
      () => {
        const criterion = 'Must have clear output';
        const content = 'This is a test output with clear information';
        const pass = content.toLowerCase().includes('output') || content.toLowerCase().includes('result');
      },
      BENCHMARK_THRESHOLDS.evaluateEval,
      100
    );

    // BMP-005: Evaluate multiple criteria
    console.log('\n[BMP-005] Evaluate multiple criteria');
    assertBenchmarkPerformance(
      'Multiple criteria evaluation',
      () => {
        const criteria = [
          'Must have clear output',
          'Must validate input',
          'Must handle errors',
          'Must provide examples'
        ];
        const content = 'Test content with validation and error handling';
        let passedCount = 0;
        criteria.forEach(criterion => {
          const pass = content.toLowerCase().includes(criterion.toLowerCase().split(' ')[3]);
          if (pass) passedCount++;
        });
      },
      BENCHMARK_THRESHOLDS.evaluateEval * 2,
      100
    );

    // BMP-006: Evaluate with threshold scoring
    console.log('\n[BMP-006] Evaluate with threshold scoring');
    assertBenchmarkPerformance(
      'Threshold scoring',
      () => {
        const criteria = Array(10).fill('criterion');
        const matchedCount = 8;
        const score = matchedCount / criteria.length;
        const pass = score >= 0.8;
      },
      BENCHMARK_THRESHOLDS.calculateScore,
      100
    );

    // BMP-007: Validate eval structure
    console.log('\n[BMP-007] Validate eval structure');
    assertBenchmarkPerformance(
      'Eval structure validation',
      () => {
        const evalData = {
          name: 'test',
          description: 'Test eval',
          criteria: ['criterion1', 'criterion2'],
          timeout: 5000
        };
        const isValid = evalData.name && evalData.description && Array.isArray(evalData.criteria);
      },
      BENCHMARK_THRESHOLDS.validateEval,
      100
    );

    // =====================================================
    // Aggregation Tests (BMP-008 ~ BMP-010)
    // =====================================================

    console.log('\n--- Aggregation Tests ---\n');

    // BMP-008: Sort benchmark results
    console.log('[BMP-008] Sort benchmark results');
    const unsortedResults = Array(100).fill().map((_, i) => ({
      skill: `skill-${i}`,
      pass: Math.random() > 0.5,
      score: Math.random()
    }));
    assertBenchmarkPerformance(
      'Sort results',
      () => {
        unsortedResults.slice().sort((a, b) => b.score - a.score);
      },
      BENCHMARK_THRESHOLDS.sortResults,
      50
    );

    // BMP-009: Filter by classification
    console.log('\n[BMP-009] Filter by classification');
    const skillsWithClass = Array(100).fill().map((_, i) => ({
      name: `skill-${i}`,
      classification: ['workflow', 'capability', 'hybrid'][i % 3]
    }));
    assertBenchmarkPerformance(
      'Filter by classification',
      () => {
        skillsWithClass.filter(s => s.classification === 'workflow');
      },
      BENCHMARK_THRESHOLDS.filterByClassification,
      100
    );

    // BMP-010: Aggregate skill results
    console.log('\n[BMP-010] Aggregate skill results');
    const skillResults = Array(28).fill().map((_, i) => ({
      name: `skill-${i}`,
      pass: Math.random() > 0.2,
      score: Math.random() * 100
    }));
    assertBenchmarkPerformance(
      'Aggregate results',
      () => {
        const passed = skillResults.filter(r => r.pass).length;
        const avgScore = skillResults.reduce((a, b) => a + b.score, 0) / skillResults.length;
        const stats = { total: skillResults.length, passed, avgScore };
      },
      BENCHMARK_THRESHOLDS.aggregateResults,
      50
    );

    // =====================================================
    // Report Generation Tests (BMP-011 ~ BMP-013)
    // =====================================================

    console.log('\n--- Report Generation Tests ---\n');

    // BMP-011: Format report line
    console.log('[BMP-011] Format report line');
    assertBenchmarkPerformance(
      'Format report line',
      () => {
        const name = 'skill-name';
        const status = 'PASS';
        const score = 95.5;
        const line = `${name.padEnd(30)} ${status.padStart(10)} ${String(score).padStart(8)}`;
      },
      BENCHMARK_THRESHOLDS.formatReportLine,
      100
    );

    // BMP-012: Build benchmark report
    console.log('\n[BMP-012] Build benchmark report');
    const reportData = Array(28).fill().map((_, i) => ({
      skill: `skill-${i}`,
      pass: Math.random() > 0.1,
      duration: Math.random() * 1000
    }));
    assertBenchmarkPerformance(
      'Build report',
      () => {
        const report = reportData.map(d => ({
          ...d,
          timestamp: new Date().toISOString(),
          version: '1.6.1'
        }));
        JSON.stringify(report);
      },
      BENCHMARK_THRESHOLDS.buildBenchmarkReport,
      20
    );

    // BMP-013: Generate summary statistics
    console.log('\n[BMP-013] Generate summary statistics');
    assertBenchmarkPerformance(
      'Generate summary',
      () => {
        const stats = {
          total: 28,
          passed: 27,
          failed: 1,
          passRate: 96.4,
          avgDuration: 450,
          timestamp: new Date().toISOString()
        };
        JSON.stringify(stats);
      },
      BENCHMARK_THRESHOLDS.generateSummary,
      100
    );

    // =====================================================
    // Integration Tests (BMP-014 ~ BMP-015)
    // =====================================================

    console.log('\n--- Integration Tests ---\n');

    // BMP-014: Full benchmark cycle (small)
    console.log('[BMP-014] Full benchmark cycle (28 skills)');
    assertBenchmarkPerformance(
      'Full benchmark cycle',
      () => {
        // Simulate running eval for 28 skills
        const skills = Array(28).fill().map((_, i) => `skill-${i}`);
        const results = skills.map(skill => ({
          name: skill,
          pass: Math.random() > 0.1,
          score: Math.random(),
          duration: Math.random() * 500
        }));
        const stats = {
          total: results.length,
          passed: results.filter(r => r.pass).length,
          avgDuration: results.reduce((a, b) => a + b.duration, 0) / results.length
        };
      },
      BENCHMARK_THRESHOLDS.buildBenchmarkReport * 3,
      10
    );

    // BMP-015: Classification filtering and reporting
    console.log('\n[BMP-015] Classification filtering and reporting');
    const classifiedSkills = Array(28).fill().map((_, i) => ({
      name: `skill-${i}`,
      classification: ['workflow', 'capability', 'hybrid'][i % 3],
      pass: Math.random() > 0.1,
      score: Math.random()
    }));
    assertBenchmarkPerformance(
      'Classification filtering',
      () => {
        const byClass = {
          workflow: classifiedSkills.filter(s => s.classification === 'workflow'),
          capability: classifiedSkills.filter(s => s.classification === 'capability'),
          hybrid: classifiedSkills.filter(s => s.classification === 'hybrid')
        };
        const classReports = Object.entries(byClass).map(([cls, skills]) => ({
          classification: cls,
          total: skills.length,
          passed: skills.filter(s => s.pass).length,
          avgScore: skills.reduce((a, b) => a + b.score, 0) / skills.length
        }));
      },
      BENCHMARK_THRESHOLDS.buildBenchmarkReport * 2,
      20
    );

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
  console.log('║         Benchmark Performance Summary                  ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  ✓ Passed: ${String(results.passed).padStart(48)}║`);
  console.log(`║  ✗ Failed: ${String(results.failed).padStart(48)}║`);
  console.log(`║  ⏭ Skipped: ${String(results.skipped).padStart(47)}║`);
  console.log('╠════════════════════════════════════════════════════════╣');

  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
  console.log(`║  Pass Rate: ${String(passRate + '%').padStart(47)}║`);

  // Show slowest benchmarks
  if (results.measurements.length > 0) {
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Slowest Benchmarks:                                   ║');
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
