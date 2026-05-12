---
design-anchor-id: bkit-v2111-alpha-tutorial
feature: bkit-v2111-integrated-enhancement
sprint: α (Alpha)
fr: FR-α3 (First-Run Tutorial AUQ)
target: hooks/startup/preflight.js OR hooks/startup/first-run.js (FR-α3-b)
status: locked
captured: 2026-04-28
captured-by: kay kim (Claude Opus 4.7 1M autonomous mode)
capture-method: manual-from-design-spec
parent-design: docs/02-design/features/bkit-v2111-sprint-alpha.design.md §3.7 / §5.1
pencil-pilot: deferred (terminal-native UI — no .pen artifact required)
---

# Design Anchor: bkit v2.1.11 First-Run Tutorial (Sprint α)

> **Pilot Decision Note (D4 reaffirmed)**: Sprint α §3.7 originally proposed a Pencil MCP pilot for the FR-α3 AskUserQuestion UI. After implementation review, the AUQ surface is rendered by Claude Code's terminal-native widget — there is no `.pen` artifact to lock. The same intent is preserved by **anchoring the design tokens here** and validating them via the FR-α3 unit/integration tests. Pencil pilot for non-AUQ visual artifacts may revisit in v2.1.12 if an actual `.pen` surface emerges.

## 1. Token Lockfile

These tokens are the source of truth that FR-α3-b/c implementations MUST consume. Drift detection: any future visual deviation in the First-Run AUQ tutorial requires updating this anchor first, then propagating to code.

### 1.1 Colors

| Token | Value | Notes |
|---|---|---|
| `color.primary` | `#0969da` | Claude Code accent-compatible blue (matches CC `[!]` chrome) |
| `color.bg` | terminal default | Inherit user terminal theme; no override |
| `color.text` | terminal default | Inherit user terminal theme; no override |
| `color.warn` | `⚠️` glyph + terminal default | Reuse preflight warning convention from FR-α4/α5 |

Rationale: AUQ in CC terminal cannot inject ANSI safely without breaking VT100 fallbacks; tokens stay glyph-driven.

### 1.2 Typography

| Token | Value | Notes |
|---|---|---|
| `type.face` | monospace | Terminal-native, no font override |
| `type.scale.h1` | 1× monospace | "## " markdown header (handled by CC renderer) |
| `type.lineWidth.max` | 60 columns | Soft wrap at 60; never exceed 80 |

### 1.3 Spacing

| Token | Value |
|---|---|
| `space.between.options` | 1 blank line |
| `space.before.header` | 2 blank lines |
| `space.after.header` | 1 blank line |
| `space.between.questionAndOptions` | 1 blank line |

### 1.4 Radius / Border

| Token | Value |
|---|---|
| `radius` | N/A — terminal flat |
| `border.box` | none — markdown bullets only |

### 1.5 Tone (Voice)

| Aspect | Token Value |
|---|---|
| Register | warm, friendly, mentor-like |
| Korean opener | "bkit 처음이시군요! 3분 튜토리얼을 시작할까요?" |
| English opener | "Welcome to bkit! Want a 3-minute tour?" |
| Forbidden phrasing | imperative ("must", "required", "you should") in opener — never |
| Default language | follow `process.env.LANG` first segment; fall back to English |

### 1.6 Layout

| Element | Token |
|---|---|
| Top of AUQ | `📖` glyph + bold question |
| Option list | bullet `→` per option, no table |
| Option label format | `<verb-phrase> (<modifier>)` — e.g., "Start 3-min tutorial (Recommended)" |
| Option description format | imperative description, ≤ 80 chars |

## 2. AUQ Schema Lock (FR-α3 contract)

```javascript
AskUserQuestion({
  questions: [{
    question: "<localized opener — see §1.5>",
    header: "First Run",
    multiSelect: false,
    options: [
      {
        label: "Start 3-min tutorial (Recommended)",
        description: "Walk through PDCA basics, output styles, and your first /pdca plan example via /claude-code-learning.",
      },
      {
        label: "Later — just start",
        description: "Skip this prompt. Run /claude-code-learning anytime to revisit the tutorial.",
      },
      {
        label: "Skip permanently",
        description: "Disable this prompt forever. onboarding.firstRun = false will be persisted.",
      },
    ],
  }],
});
```

Locked invariants:
- exactly **3 options**, in this order
- multiSelect always **false** (radio-style)
- header constant string `"First Run"`
- option labels match §1.5 phrasing tokens

## 3. State Schema Lock (FR-α3-c)

`.bkit/runtime/first-run-seen.json`:

```json
{
  "version": "2.1.11",
  "seenAt": "<ISO 8601 timestamp>",
  "tutorialResponse": "tutorial" | "later" | "skip",
  "ccVersionAtFirstRun": "<from cc-version-checker.getCurrent() OR null>"
}
```

| Field | Type | Constraint |
|---|---|---|
| `version` | string | Must equal `BKIT_VERSION` at write time |
| `seenAt` | string | ISO 8601 UTC, generated via `new Date().toISOString()` |
| `tutorialResponse` | enum | `"tutorial"` (option 1) / `"later"` (option 2) / `"skip"` (option 3) |
| `ccVersionAtFirstRun` | string \| null | Re-uses FR-α5 detection; null when CC version undetectable |

Lifecycle:
- File creation MUST be idempotent (any of 3 responses creates the file)
- File presence ⇒ AUQ NOT shown again
- Permanent skip stores `tutorialResponse: "skip"` AND sets `bkit.config.json.onboarding.firstRun = false` (separate concern, FR-α3-c2)

## 4. Validation Rules (referenced by FR-α3 tests)

These MUST be asserted by FR-α3-b unit tests:

- **VAL-01**: AUQ payload `options.length === 3`
- **VAL-02**: Each option has both `label` and `description`
- **VAL-03**: First option label matches `/Start 3-min tutorial/`
- **VAL-04**: Localized opener matches `/처음이시군요|Welcome to bkit/`
- **VAL-05**: After any response, `.bkit/runtime/first-run-seen.json` exists
- **VAL-06**: `tutorialResponse` value is one of the three locked enums

## 5. Anti-patterns (forbidden in FR-α3 implementation)

- ❌ Inline color codes (ANSI escape sequences) in option text
- ❌ Tables (`|---|`) in AUQ — use bullets only
- ❌ Imperative tone in opener — see §1.5 forbidden list
- ❌ Inline duplicate copies of `ONE_LINER_EN` (use `lib/infra/branding.ONE_LINER_EN` import)
- ❌ Synchronous I/O in the AUQ render path beyond `fs.existsSync` for `seen.json`
- ❌ Failing closed when `seen.json` write fails — must fail-open with `debugLog`

## 6. Provenance / Capture History

| Date | Capturer | Tool | Note |
|---|---|---|---|
| 2026-04-28 | kay kim (Opus 4.7 autonomous L4) | manual from design spec §5.1 | Initial lock; Pencil pilot deferred per §3.7 D4 reaffirmation |

## 7. Re-capture Procedure (when v2.1.12 needs visual update)

1. Bump `version` field in this file's frontmatter
2. Update §1.* tokens reflecting the new design intent
3. Rebuild AUQ in code, re-run FR-α3 tests with the updated VAL-* assertions
4. Add a new entry to §6 Provenance
5. Run `node scripts/docs-code-sync.js` to verify Docs=Code consistency
