---
name: qa-phase
classification: workflow
classification-reason: QA phase automation within PDCA cycle
deprecation-risk: none
effort: high
description: |
  QA Phase execution — L1-L5 test planning, generation, execution, and reporting.
  Triggers: qa phase, QA test, qa run, QA 실행, QAフェーズ, QA阶段, fase QA, phase QA, QA-Phase, fase QA.
argument-hint: "[feature]"
user-invocable: true
agents:
  lead: bkit:qa-lead
  planner: bkit:qa-test-planner
  generator: bkit:qa-test-generator
  debug: bkit:qa-debug-analyst
  monitor: bkit:qa-monitor
  default: bkit:qa-lead
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
imports:
  - ${PLUGIN_ROOT}/templates/qa-report.template.md
  - ${PLUGIN_ROOT}/templates/qa-test-plan.template.md
next-skill: pdca
pdca-phase: qa
task-template: "[QA] {feature}"
---

# QA Phase Skill

> Execute QA phase of the PDCA cycle. Automatically runs L1-L5 tests with Chrome MCP integration.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `[feature]` | Target feature to test | `/qa-phase user-auth` |

## Workflow

1. **Context**: Read design doc and Check phase analysis
2. **Plan**: Generate test plan (L1-L5 items with priorities)
3. **Generate**: Create test code files
4. **Execute**: Run L1-L5 tests (L3-L5 require Chrome MCP)
5. **Report**: Generate QA report to `docs/05-qa/{feature}.qa-report.md`

## Test Levels

| Level | Type | Tool | Chrome Required |
|-------|------|------|:---------------:|
| L1 | Unit Test | Node.js / Jest / Vitest | No |
| L2 | API Test | fetch / curl | No |
| L3 | E2E Test | Chrome MCP | Yes |
| L4 | UX Flow Test | Chrome MCP | Yes |
| L5 | Data Flow Test | Chrome MCP + Bash | Yes |

## Fallback

Chrome MCP unavailable:
- L1 + L2 only
- QA report notes "L3-L5 skipped"
- QA pass/fail based on L1+L2 results only
