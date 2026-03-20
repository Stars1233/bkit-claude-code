# bkit Test Suite

Complete test suite for bkit v1.6.1 including E2E tests and performance tests.

## Overview

- **E2E Tests**: 80 test cases (20 + 60)
- **Performance Tests**: 70 test cases (25 + 15 + 15 + 15)
- **Total**: 150 test cases

## Test Structure

```
test/
├── e2e/                          # E2E Tests (80 TC)
│   ├── eval-benchmark.test.js    # 20 TC: Eval runner E2E
│   └── run-e2e.sh                # 60 TC: CLI command tests
├── performance/                  # Performance Tests (70 TC)
│   ├── core-function-perf.test.js   # 25 TC: Core functions
│   ├── hook-perf.test.js            # 15 TC: Hook system
│   ├── benchmark-perf.test.js       # 15 TC: Benchmark system
│   └── module-load-perf.test.js     # 15 TC: Module loading
├── unit/
│   └── ambiguity.test.js         # Unit tests (existing)
├── run-all-tests.sh              # Master test runner
└── README.md                      # This file
```

## Running Tests

### Run All Tests

```bash
./test/run-all-tests.sh all
```

### Run E2E Tests Only

```bash
./test/run-all-tests.sh e2e
```

### Run Performance Tests Only

```bash
./test/run-all-tests.sh perf
```

### Run Individual Test Files

#### E2E Tests

```bash
# Eval benchmark tests (20 TC)
node test/e2e/eval-benchmark.test.js

# CLI command tests (60 TC)
bash test/e2e/run-e2e.sh
```

#### Performance Tests

```bash
# Core function performance (25 TC)
node test/performance/core-function-perf.test.js

# Hook performance (15 TC)
node test/performance/hook-perf.test.js

# Benchmark performance (15 TC)
node test/performance/benchmark-perf.test.js

# Module loading performance (15 TC)
node test/performance/module-load-perf.test.js
```

## E2E Test Cases

### Eval Benchmark Tests (20 TC)

**File**: `test/e2e/eval-benchmark.test.js`

- E2E-001: Module exports validation
- E2E-002: Config loading
- E2E-003: Full benchmark run (31 skills)
- E2E-004: Benchmark result structure
- E2E-005: Total skill count (31)
- E2E-006: Passed skill count >= 25
- E2E-007: Skill count consistency
- E2E-008: Individual skill - pdca
- E2E-009: Individual skill - phase-4-api
- E2E-010: Individual skill - phase-6-ui-integration
- E2E-011: Eval result details
- E2E-012: Workflow skill count >= 9
- E2E-013: Capability skill count >= 16
- E2E-014: Hybrid skill count >= 2
- E2E-015: Classification count sum = 28
- E2E-016: Benchmark performance < 35s
- E2E-017: Matched criteria tracking
- E2E-018: Score calculation
- E2E-019: YAML parsing
- E2E-020: No exceptions during benchmark

### CLI Command Tests (60 TC)

**File**: `test/e2e/run-e2e.sh`

#### PDCA Commands (E2E-001 ~ E2E-010)
- E2E-001: /pdca status
- E2E-002: /pdca list
- E2E-003: /memory status
- E2E-004: /memory save
- E2E-005: /skills list
- E2E-006: /agents list
- E2E-007: /pdca plan
- E2E-008: /pdca design
- E2E-009: /pdca analysis
- E2E-010: /pdca report

#### Plugin Configuration (E2E-011 ~ E2E-030)
- E2E-011: plugin.json exists
- E2E-012: marketplace.json exists
- E2E-013: skills directory
- E2E-014: agents directory
- E2E-015: evals directory
- E2E-016: bkit.config.json
- E2E-017: hooks directory
- E2E-018: lib directory
- E2E-019: SKILL.md files count
- E2E-020: Agent markdown files
- E2E-021: Eval YAML files
- E2E-022: Workflow evals
- E2E-023: Capability evals
- E2E-024: Hybrid evals
- E2E-025: runner.js exists
- E2E-026: reporter.js exists
- E2E-027: evals/config.json
- E2E-028: Eval prompt files
- E2E-029: Eval expected files
- E2E-030: Eval directory structure

#### Documentation (E2E-031 ~ E2E-050)
- E2E-031: docs directory
- E2E-032: plan docs
- E2E-033: design docs
- E2E-034: analysis docs
- E2E-035: report docs
- E2E-036: README.md
- E2E-037: .claude/CLAUDE.md
- E2E-038: templates directory
- E2E-039: package.json
- E2E-040: package.json valid JSON

#### JSON Configuration (E2E-041 ~ E2E-060)
- E2E-041: bkit.config.json JSON format
- E2E-042: plugin.json JSON format
- E2E-043: marketplace.json JSON format
- E2E-044: bkit.config.json version field
- E2E-045: bkit.config.json pdca section
- E2E-046: bkit.config.json team section
- E2E-047: plugin.json skills declaration
- E2E-048: plugin.json agents declaration
- E2E-049: marketplace.json metadata
- E2E-050: git repository

## Performance Test Cases

### Core Function Performance (25 TC)

**File**: `test/performance/core-function-perf.test.js`

**Thresholds**:
- calculateAmbiguityScore: < 10ms
- detectLanguage: < 5ms
- selectOrchestrationPattern: < 5ms
- getTierFromPath: < 5ms
- getLevelFromConfig: < 5ms
- matchFeaturePattern: < 5ms
- parseHookInput: < 10ms
- getConfig: < 5ms
- loadConfig: < 50ms
- safeJsonParse: < 5ms
- getAllTierExtensions: < 5ms
- truncateContext: < 10ms
- getDebugLogPath: < 5ms
- getPdcaStatusFull: < 20ms
- evaluateAgainstCriteria: < 20ms
- buildAgentTeamPlan: < 100ms

Test cases:
- PRF-001~003: Intent module (ambiguity, language, orchestration)
- PRF-004~005: Hook utilities (parseHookInput, truncateContext)
- PRF-006~010: PDCA module (tier, level, pattern, status, extensions)
- PRF-011~015: Config & cache (get, load, parse, debug, cache)
- PRF-016~020: Utility functions (platform, path, output)
- PRF-021~025: Advanced operations (multi-call, cache, JSON, context)

### Hook Performance Tests (15 TC)

**File**: `test/performance/hook-perf.test.js`

**Hook Thresholds**:
- SessionStart: < 500ms
- UserPromptSubmit: < 200ms
- PreToolUse: < 150ms
- PostToolUse: < 200ms
- Notification: < 100ms

Test cases:
- HKP-001~003: SessionStart hook variations
- HKP-004~006: UserPromptSubmit analysis
- HKP-007~009: PreToolUse permission checks
- HKP-010~012: PostToolUse processing
- HKP-013~015: Other hooks and combined processing

### Benchmark Performance Tests (15 TC)

**File**: `test/performance/benchmark-perf.test.js`

**Operation Thresholds**:
- Parse simple YAML: < 50ms
- Parse complex YAML: < 50ms
- Parse large YAML: < 100ms
- Single criterion: < 20ms
- Multiple criteria: < 40ms
- Threshold scoring: < 5ms
- Eval validation: < 10ms
- Sort results: < 10ms
- Filter by classification: < 5ms
- Aggregate results: < 50ms
- Format report line: < 5ms
- Build report: < 100ms
- Generate summary: < 100ms
- Full benchmark: < 300ms
- Classification filtering: < 200ms

### Module Loading Performance (15 TC)

**File**: `test/performance/module-load-perf.test.js`

**Module Load Thresholds**:
- lib/core: < 100ms
- lib/pdca: < 100ms
- lib/intent: < 50ms
- lib/task: < 50ms
- lib/team: < 100ms
- lib/common: < 200ms
- evals/runner: < 150ms
- evals/reporter: < 100ms
- hooks/session-start: < 200ms
- plugin metadata: < 300ms
- bkit.config.json: < 50ms
- All core modules: < 500ms
- Core startup: < 500ms
- Core + evals: < 700ms
- Full startup: < 1000ms

Test cases:
- MLP-001~006: Core module loading
- MLP-007~010: Eval and plugin loading
- MLP-011~012: Configuration and combined loads
- MLP-013~015: Startup sequences

## Performance Baseline

These are the expected performance baselines for bkit v1.6.1:

### Hook Performance (Claude Code v2.1.49+)
- SessionStart: ~450ms (measured in v2.1.49)
- UserPromptSubmit: ~120ms
- PreToolUse: ~80ms
- PostToolUse: ~150ms

### Module Loading
- Full startup: ~800-900ms
- Core modules only: ~300-400ms
- With evals: ~600-700ms

### Eval Benchmark
- Parse eval YAML: ~15-20ms per file
- Evaluate criteria: ~5-10ms per eval
- Full benchmark (31 skills): ~25-30 seconds

## Test Output Format

Each test suite produces structured output with:

```
╔════════════════════════════════════════════════════════╗
║           Test Suite Name (N TC)                       ║
╚════════════════════════════════════════════════════════╝

✓ Test-001: Description
  Expected value vs actual value

✗ Test-002: Failed test
  Error message

⏭ Test-003: Skipped test
  Reason for skip

╔════════════════════════════════════════════════════════╗
║                    Test Summary                        ║
╠════════════════════════════════════════════════════════╣
║  ✓ Passed: N
║  ✗ Failed: N
║  ⏭ Skipped: N
╠════════════════════════════════════════════════════════╣
║  Pass Rate: N%
╚════════════════════════════════════════════════════════╝
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: ./test/run-all-tests.sh e2e

- name: Run Performance Tests
  run: ./test/run-all-tests.sh perf

- name: Run All Tests
  run: ./test/run-all-tests.sh all
```

## Troubleshooting

### Tests fail with module not found

Ensure you're running from project root:
```bash
cd /path/to/bkit-claude-code
./test/run-all-tests.sh
```

### Performance tests show exceeded thresholds

Performance can vary based on:
- CPU load
- Available memory
- File system type
- System configuration

If consistently exceeding thresholds, check:
1. System resource availability
2. Node.js version compatibility
3. Module dependencies installed

### E2E CLI tests are skipped

CLI command tests (E2E-001 ~ E2E-010) are expected to skip in CI environments:
- They require an active Claude Code session
- They test interactive commands
- They're primarily for manual testing

## Maintenance

### Adding New Tests

1. Create test file in appropriate directory
2. Follow test naming convention: `name.test.js` or `name.test.sh`
3. Include header with version and test count
4. Use same output format
5. Update this README with test details

### Updating Performance Baselines

If performance baselines need adjustment:

1. Run baseline tests: `DEBUG=1 node test/performance/core-function-perf.test.js`
2. Note average durations
3. Update `PERFORMANCE_THRESHOLDS` in test files
4. Document changes in commit message

## Version History

### v1.6.1
- Initial comprehensive test suite
- 80 E2E test cases
- 70 performance test cases
- Support for all bkit core modules

## Related Documentation

- [Zero Script QA Guide](../skills/zero-script-qa/SKILL.md)
- [PDCA Workflow](../skills/pdca/SKILL.md)
- [bkit Configuration](../bkit.config.json)
- [Plugin Documentation](./.claude-plugin/)
