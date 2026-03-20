#!/usr/bin/env node
'use strict';
/**
 * Unit Tests for lib/pdca/workflow-parser.js
 * 25 TC | YAML parsing, validation, file operations, edge cases
 *
 * @version bkit v1.6.2
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { assert, skip, assertThrows, assertNoThrow, assertDeepEqual, summary, reset } = require('../helpers/assert');
reset();

const BASE_DIR = path.resolve(__dirname, '../..');

console.log('\n=== workflow-parser.test.js (25 TC) ===\n');

// Load module
let wp;
try {
  wp = require('../../lib/pdca/workflow-parser');
} catch (e) {
  wp = null;
}

// ============================================================
// Section 1: YAML Parsing (WP-001 ~ WP-008)
// ============================================================
console.log('\n--- Section 1: YAML Parsing ---');

// WP-001: Parse simple key-value pairs
{
  const result = wp ? wp.parseWorkflowYaml('id: test\nname: Test Workflow') : null;
  assert('WP-001', result && result.id === 'test' && result.name === 'Test Workflow',
    'parseWorkflowYaml parses key-value pairs');
}

// WP-002: Parse arrays
{
  const yaml = 'items:\n  - alpha\n  - beta\n  - gamma';
  const result = wp ? wp.parseWorkflowYaml(yaml) : null;
  assert('WP-002',
    result && Array.isArray(result.items) && result.items.length === 3 && result.items[0] === 'alpha',
    'parseWorkflowYaml parses arrays');
}

// WP-003: Parse nested objects
{
  const yaml = 'parent:\n  child: value\n  nested:\n    deep: yes';
  const result = wp ? wp.parseWorkflowYaml(yaml) : null;
  assert('WP-003',
    result && result.parent && result.parent.child === 'value',
    'parseWorkflowYaml parses nested objects');
}

// WP-004: Comments are stripped
{
  const yaml = 'key: value # this is a comment\n# full line comment\nname: test';
  const result = wp ? wp.parseWorkflowYaml(yaml) : null;
  assert('WP-004',
    result && result.key === 'value' && result.name === 'test',
    'parseWorkflowYaml strips comments');
}

// WP-005: Quoted strings preserved
{
  const yaml = 'msg: "hello world"\nsingle: \'foo bar\'';
  const result = wp ? wp.parseWorkflowYaml(yaml) : null;
  assert('WP-005',
    result && result.msg === 'hello world' && result.single === 'foo bar',
    'parseWorkflowYaml handles quoted strings');
}

// WP-006: Numbers parsed correctly
{
  const result = wp ? wp._parseValue('42') : null;
  const floatResult = wp ? wp._parseValue('3.14') : null;
  assert('WP-006',
    result === 42 && floatResult === 3.14,
    '_parseValue parses integers and floats');
}

// WP-007: Booleans parsed correctly
{
  const t = wp ? wp._parseValue('true') : null;
  const f = wp ? wp._parseValue('false') : null;
  assert('WP-007',
    t === true && f === false,
    '_parseValue parses booleans');
}

// WP-008: Null/tilde parsed correctly
{
  const n1 = wp ? wp._parseValue('null') : undefined;
  const n2 = wp ? wp._parseValue('~') : undefined;
  assert('WP-008',
    n1 === null && n2 === null,
    '_parseValue parses null and tilde');
}

// ============================================================
// Section 2: validateWorkflow (WP-009 ~ WP-014)
// ============================================================
console.log('\n--- Section 2: validateWorkflow ---');

// WP-009: Valid workflow passes validation
{
  const validWf = {
    id: 'test', name: 'Test', version: '1.0', description: 'desc',
    steps: { start: { phase: 'idle', type: 'sequential' } },
    defaults: { matchRateThreshold: 90, maxIterations: 5, automationLevel: 'semi-auto' },
  };
  const result = wp ? wp.validateWorkflow(validWf) : null;
  assert('WP-009', result && result.valid === true && result.errors.length === 0,
    'Valid workflow passes validation');
}

// WP-010: Missing required fields detected
{
  const result = wp ? wp.validateWorkflow({ id: 'test' }) : null;
  assert('WP-010', result && result.valid === false && result.errors.length > 0,
    'Missing required fields cause validation failure');
}

// WP-011: Null input returns invalid
{
  const result = wp ? wp.validateWorkflow(null) : null;
  assert('WP-011', result && result.valid === false,
    'Null input returns invalid');
}

// WP-012: Invalid step phase detected
{
  const wf = {
    id: 'test', name: 'Test', version: '1.0', description: 'desc',
    steps: { s1: { phase: 'invalid_phase', type: 'sequential' } },
    defaults: {},
  };
  const result = wp ? wp.validateWorkflow(wf) : null;
  assert('WP-012', result && result.errors.some(e => e.includes('Invalid phase')),
    'Invalid step phase is flagged');
}

// WP-013: Invalid step type detected
{
  const wf = {
    id: 'test', name: 'Test', version: '1.0', description: 'desc',
    steps: { s1: { phase: 'plan', type: 'invalid_type' } },
    defaults: {},
  };
  const result = wp ? wp.validateWorkflow(wf) : null;
  assert('WP-013', result && result.errors.some(e => e.includes('Invalid type')),
    'Invalid step type is flagged');
}

// WP-014: Dangling next reference detected
{
  const wf = {
    id: 'test', name: 'Test', version: '1.0', description: 'desc',
    steps: { s1: { phase: 'plan', type: 'sequential', next: 'nonexistent' } },
    defaults: {},
  };
  const result = wp ? wp.validateWorkflow(wf) : null;
  assert('WP-014', result && result.errors.some(e => e.includes('non-existent step')),
    'Dangling next reference is flagged');
}

// ============================================================
// Section 3: loadWorkflowFile (WP-015 ~ WP-019)
// ============================================================
console.log('\n--- Section 3: loadWorkflowFile ---');

// Create a tmp directory with test workflow files
const tmpDir = path.join(os.tmpdir(), `bkit-wp-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

// WP-015: Load valid JSON workflow file
{
  const validWf = {
    id: 'json-test', name: 'JSON Test', version: '1.0', description: 'A test',
    steps: { start: { phase: 'idle', type: 'sequential' } },
    defaults: { matchRateThreshold: 90, maxIterations: 5, automationLevel: 'semi-auto' },
  };
  const filePath = path.join(tmpDir, 'test.workflow.json');
  fs.writeFileSync(filePath, JSON.stringify(validWf));
  let loaded = null;
  try { loaded = wp ? wp.loadWorkflowFile(filePath) : null; } catch (e) { loaded = null; }
  assert('WP-015', loaded && loaded.id === 'json-test',
    'loadWorkflowFile loads valid JSON file');
}

// WP-016: Load valid YAML workflow file
{
  const yamlContent = [
    'id: yaml-test',
    'name: YAML Test',
    'version: "1.0"',
    'description: A YAML test',
    'steps:',
    '  start:',
    '    phase: idle',
    '    type: sequential',
    'defaults:',
    '  matchRateThreshold: 90',
    '  maxIterations: 5',
    '  automationLevel: semi-auto',
  ].join('\n');
  const filePath = path.join(tmpDir, 'test.workflow.yaml');
  fs.writeFileSync(filePath, yamlContent);
  let loaded = null;
  try { loaded = wp ? wp.loadWorkflowFile(filePath) : null; } catch (e) { loaded = null; }
  assert('WP-016', loaded && loaded.id === 'yaml-test',
    'loadWorkflowFile loads valid YAML file');
}

// WP-017: Non-existent file throws
{
  let threw = false;
  try { wp && wp.loadWorkflowFile('/nonexistent/path/workflow.yaml'); } catch (e) { threw = true; }
  assert('WP-017', threw, 'loadWorkflowFile throws on non-existent file');
}

// WP-018: Malformed JSON throws
{
  const filePath = path.join(tmpDir, 'bad.workflow.json');
  fs.writeFileSync(filePath, '{ broken json }}}');
  let threw = false;
  try { wp && wp.loadWorkflowFile(filePath); } catch (e) { threw = true; }
  assert('WP-018', threw, 'loadWorkflowFile throws on malformed JSON');
}

// WP-019: Invalid workflow content throws validation error
{
  const invalidWf = { id: 'incomplete' };
  const filePath = path.join(tmpDir, 'invalid.workflow.json');
  fs.writeFileSync(filePath, JSON.stringify(invalidWf));
  let threw = false;
  try { wp && wp.loadWorkflowFile(filePath); } catch (e) { threw = true; }
  assert('WP-019', threw, 'loadWorkflowFile throws on invalid workflow content');
}

// ============================================================
// Section 4: listAvailableWorkflows & Edge Cases (WP-020 ~ WP-025)
// ============================================================
console.log('\n--- Section 4: listAvailableWorkflows & Edge Cases ---');

// WP-020: listAvailableWorkflows returns array
{
  const result = wp ? wp.listAvailableWorkflows(tmpDir) : null;
  assert('WP-020', Array.isArray(result),
    'listAvailableWorkflows returns array');
}

// WP-021: listAvailableWorkflows finds workflow files in bundle dir
{
  const bundleDir = path.join(tmpDir, wp.WORKFLOW_DIR_BUNDLE);
  fs.mkdirSync(bundleDir, { recursive: true });
  const validWf = {
    id: 'listed', name: 'Listed WF', version: '1.0', description: 'desc',
    steps: { start: { phase: 'idle', type: 'sequential' } },
    defaults: {},
  };
  fs.writeFileSync(path.join(bundleDir, 'listed.workflow.json'), JSON.stringify(validWf));
  const result = wp ? wp.listAvailableWorkflows(tmpDir) : [];
  assert('WP-021', result.some(w => w.name === 'Listed WF'),
    'listAvailableWorkflows finds bundle workflow files');
}

// WP-022: Project workflow overrides bundle workflow with same name
{
  const projectDir = path.join(tmpDir, wp.WORKFLOW_DIR_PROJECT);
  fs.mkdirSync(projectDir, { recursive: true });
  const projectWf = {
    id: 'listed', name: 'Project Override', version: '2.0', description: 'project',
    steps: { start: { phase: 'idle', type: 'sequential' } },
    defaults: {},
  };
  fs.writeFileSync(path.join(projectDir, 'listed.workflow.json'), JSON.stringify(projectWf));
  const result = wp ? wp.listAvailableWorkflows(tmpDir) : [];
  const listed = result.find(w => w.path.includes(wp.WORKFLOW_DIR_PROJECT));
  assert('WP-022', listed && listed.name === 'Project Override',
    'Project workflow overrides bundle with same basename');
}

// WP-023: Empty string input to parseWorkflowYaml throws
{
  let threw = false;
  try { wp && wp.parseWorkflowYaml(''); } catch (e) { threw = true; }
  assert('WP-023', threw, 'parseWorkflowYaml throws on empty string');
}

// WP-024: Non-string input to parseWorkflowYaml throws
{
  let threw = false;
  try { wp && wp.parseWorkflowYaml(123); } catch (e) { threw = true; }
  assert('WP-024', threw, 'parseWorkflowYaml throws on non-string input');
}

// WP-025: Malformed workflow file in listAvailableWorkflows shows parse error
{
  const bundleDir = path.join(tmpDir, wp.WORKFLOW_DIR_BUNDLE);
  fs.writeFileSync(path.join(bundleDir, 'broken.workflow.json'), '{{{{');
  const result = wp ? wp.listAvailableWorkflows(tmpDir) : [];
  const broken = result.find(w => w.name === 'broken');
  assert('WP-025', broken && broken.description === '(parse error)',
    'Malformed workflow in listAvailableWorkflows has (parse error) description');
}

// Cleanup tmp
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

// ============================================================
// Summary
// ============================================================
const result = summary('workflow-parser.test.js');
module.exports = result;
