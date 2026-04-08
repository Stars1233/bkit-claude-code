# QA Phase Expected Output - Process Steps

## Step 1: Argument Parsing and Phase Detection
1. Parse the invocation arguments: feature = "user-auth"
2. Detect the target PDCA phase as QA based on the skill "qa-phase"
3. Route to qa-lead agent as the default orchestrator
4. Verify current phase is "qa" (valid — entered via Check MATCH_PASS)

## Step 2: Context Collection
5. Read Design document: docs/02-design/features/user-auth.design.md
6. Read Analysis document: docs/03-analysis/user-auth.analysis.md
7. Scan implementation code: Glob + Grep for src/, lib/, components/
8. Check existing tests: test/, tests/, __tests__/ directories

## Step 3: Chrome MCP Availability Check
9. Check MCP_SERVERS environment for "claude-in-chrome"
10. Chrome MCP NOT available: flag chromeAvailable = false
11. L3-L5 tests (E2E, UX Flow, Data Flow) will be auto-skipped
12. QA verdict will be based on L1+L2 results only

## Step 4: Test Planning and Generation
13. Dispatch qa-test-planner to generate L1-L5 test plan from Design doc
14. Dispatch qa-test-generator to create test code files
15. Dispatch qa-debug-analyst for debug logging setup
16. Test plan output includes prioritized test items per level

## Step 5: Test Execution (L1+L2 only, Chrome unavailable)
17. Execute L1 (Unit Tests): detect framework (jest/vitest/node:test), run tests
18. Execute L2 (API Tests): curl/fetch-based endpoint verification
19. Skip L3 (E2E): Chrome MCP unavailable
20. Skip L4 (UX Flow): Chrome MCP unavailable
21. Skip L5 (Data Flow): Chrome MCP unavailable

## Step 6: Result Aggregation and Verdict
22. Calculate passRate from L1+L2 results: (passed / total) * 100
23. Count critical failures (L1 failures always critical, L2 auth/data failures critical)
24. Determine verdict: QA_PASS (passRate >= 95% AND criticalCount === 0) or QA_FAIL
25. Record skipped levels: ["L3", "L4", "L5"]

## Step 7: QA Report Generation
26. Generate QA report to docs/05-qa/user-auth.qa-report.md
27. Report includes: Test Summary table, Failed Tests detail, Metrics (M11-M15)
28. Note in report: "Chrome MCP unavailable — L3-L5 skipped"
29. Create Task: [QA] user-auth

## Step 8: State Machine Transition
30. If QA_PASS: trigger QA_PASS event → transition to "report" phase
31. If QA_FAIL: trigger QA_FAIL event → transition to "act" phase for fixes
32. Update pdca-status.json with qaPassRate, qaCriticalCount, qaTestCount
33. Suggest next step: /pdca report user-auth (if PASS) or /pdca iterate (if FAIL)
