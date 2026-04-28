---
name: bkit-evals
classification: capability
classification-reason: Eval runner is a development-time quality tool, not a workflow phase
deprecation-risk: none
effort: low
description: |
  Run skill evaluations via evals/runner.js — a safe wrapper that validates skill names, captures stdout/stderr, and persists JSON results to .bkit/runtime/evals-{skill}-{timestamp}.json.
  Triggers: bkit evals, evals run, run skill eval, skill quality, eval runner,
  bkit 평가, 평가 실행, 스킬 평가, 품질 평가,
  bkit評価, 評価実行, スキル評価,
  bkit评估, 评估运行, 技能评估,
  bkit evaluacion, ejecutar evaluacion,
  bkit evaluation, executer evaluation,
  bkit Evaluation, Auswertung ausfuhren,
  bkit valutazione, esegui valutazione.
argument-hint: "run <skill> | list"
user-invocable: true
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
imports: []
next-skill: null
pdca-phase: null
task-template: "[Evals] {action}"
---

# bkit Evals — Skill Quality Evaluation Runner

> v2.1.11 Sprint β FR-β2. Wraps `evals/runner.js` with input validation,
> result persistence, and structured reporting. Replaces the bare `node
> evals/runner.js <skill>` invocation that previously required users to
> remember argv structure and ignored timeout / sandbox concerns.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `run <skill>` | Execute the eval suite for one skill | `/bkit-evals run gap-detector` |
| `list` | List all skills that have an `eval.yaml` definition | `/bkit-evals list` |

If no argument is provided, render the same output as `list`.

## Behavior

### `run <skill>`

1. Validate `skill` against `/^[a-z][a-z0-9-]{0,63}$/`. Reject anything else
   (no shell metacharacters, no slashes, no spaces) — see Security below.
2. Spawn `node evals/runner.js <skill>` via `child_process.spawnSync` (argv
   form, no shell). Default timeout 30 s, max 120 s.
3. Capture stdout / stderr. Best-effort parse the last `{` block as JSON.
4. Persist the structured result to
   `.bkit/runtime/evals-{skill}-{ISO timestamp}.json` with stdout/stderr
   tails (2000 chars each) and `parsed` payload.
5. Render a one-line summary in the chat:
   - exit code
   - parsed pass/fail counts (if available)
   - path of the persisted result file

### `list`

1. Read `evals/config.json` to enumerate skill classifications.
2. For each classification (`workflow`, `capability`, `hybrid`),
   list skills that have `evals/{classification}/{skill}/eval.yaml`.
3. Render a category-grouped table with skill name + a one-line note from
   the eval YAML (`description` field if present).

## Security

- Skill name regex prevents argument injection. Anything outside
  `[a-z][a-z0-9-]{0,63}` is rejected with `reason: invalid_skill_name`.
- argv-array spawn (no shell). No template-string concatenation into
  command lines.
- Result file path is composed from a hardcoded base + sanitized skill
  name + timestamp; no traversal possible.
- Subprocess timeout enforced (default 30 s, hard cap 120 s) so a buggy
  eval cannot block the session indefinitely.

## Module Dependencies

| Module | Function | Usage |
|--------|----------|-------|
| `lib/evals/runner-wrapper.js` | `invokeEvals(skill, opts)` | Validate + spawn + persist |
| `lib/evals/runner-wrapper.js` | `isValidSkillName(name)` | Regex pre-check shared with `list` |
| `evals/runner.js` | (subprocess) | Existing eval execution engine |

## Result Schema

`.bkit/runtime/evals-{skill}-{timestamp}.json`:

```json
{
  "skill": "gap-detector",
  "invokedAt": "<ISO 8601>",
  "exitCode": 0,
  "timedOut": false,
  "stdoutTail": "...",
  "stderrTail": "...",
  "parsed": { /* whatever runner.js prints as JSON, or null */ }
}
```

## Examples

```bash
# Single eval
/bkit-evals run gap-detector

# Discovery
/bkit-evals list
```

## Related

- `/control trust` — eval results contribute to trust score
- `/code-review` — uses eval data when assessing skills
- `/bkit explore` (FR-β1) — explore evals as a category

ARGUMENTS:
