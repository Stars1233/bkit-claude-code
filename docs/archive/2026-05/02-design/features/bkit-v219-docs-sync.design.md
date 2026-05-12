# bkit v2.1.9 문서 전수 동기화 Design

> **Status**: 🎨 Design (Do 직전)
>
> **Origin**: `docs/01-plan/features/bkit-v219-docs-sync.plan.md`
> **Date**: 2026-04-21
> **Branch**: `feat/v219-cc-v2116-response`

---

## 1. 설계 범위

Plan §3의 Before/After 매트릭스를 **Edit tool 호출 순서 + 정확한 old_string/new_string** 로 구체화.

총 **13 파일 / ~45 Edit + 2 Write** (CHANGELOG append / Plan이 기존 파일 유지 시 Edit).

---

## 2. 변경 일괄 적용 전략

### 2.1 Edit 단위 선택

| 패턴 | 전략 |
|------|------|
| 동일 문자열 반복 (예: "38 Skills" 2곳 한 파일) | `replace_all: true` |
| ASCII 다이어그램 내부 | unique context 포함 Edit (정렬 유지) |
| Historic blockquote 바로 위 insert | old_string = `v2.1.8 entry 첫 줄`, new_string = `v2.1.9 entry + v2.1.8 entry` |

### 2.2 adapters 제거 주의

`AI-NATIVE-DEVELOPMENT.md:188` 현재: 
```
12 subdirectories: core, pdca, intent, task, team, ui, audit, control, quality, adapters, context, qa
```
실측은 11 subdirs, `adapters` 없음. → "adapters" 제거 + count 11.

---

## 3. 파일별 상세 Edit 명세

### 3.1 AI-NATIVE-DEVELOPMENT.md (5 edits)

#### Edit 1: line 17 mermaid box
- old: `CONTEXT["**2. CONTEXT**<br/>CLAUDE.md<br/>38 Skills"]`
- new: `CONTEXT["**2. CONTEXT**<br/>CLAUDE.md<br/>39 Skills"]`

#### Edit 2: line 145 ASCII box (stub "Domain Knowledge (38 Skills)")
- old: `Domain Knowledge (38 Skills) ──┐`
- new: `Domain Knowledge (39 Skills) ──┐`

#### Edit 3: line 186
- old: `| **Skill System (38 skills)** | Domain-specific knowledge (18 Workflow / 18 Capability / 1 Hybrid) |`
- new: `| **Skill System (39 skills)** | Domain-specific knowledge |`

#### Edit 4: line 188
- old:
  ```
  | **lib/ (93 modules, ~620+ functions)** | 12 subdirectories: core, pdca, intent, task, team, ui, audit, control, quality, adapters, context, qa |
  ```
- new:
  ```
  | **lib/ (101 modules)** | 11 subdirectories: audit, context, control, core, intent, pdca, qa, quality, task, team, ui |
  ```

#### Edit 5: line 195
- old: `│              bkit v2.0.0 Context Engineering Layers              │`
- new: `│              bkit v2.1.9 Context Engineering Layers              │`

#### Edit 6: line 196
- old: `│  Layer 1: Domain Knowledge   │ 38 Skills (structured knowledge)  │`
- new: `│  Layer 1: Domain Knowledge   │ 39 Skills (structured knowledge)  │`

### 3.2 CUSTOMIZATION-GUIDE.md (10 edits)

각각 unique old_string으로 Edit (line은 참고용).

1. L115: `Actual Node.js logic execution (42 scripts)` → `(43 scripts)`
2. L180: `### Component Inventory (v2.1.8)` → `### Component Inventory (v2.1.9)`
3. L271: `│  │    (38 Skills)   │  │   (36 Agents)    │` → `│  │    (39 Skills)   │  │   (36 Agents)    │`
4. L286: `│  │  L5: Scripts (42 Node.js modules)                        │  │` → `(43 Node.js modules)`
5. L323: `│               bkit Component Architecture (v2.1.8)               │` → `(v2.1.9)`
6. L326: `│  Knowledge Layer    │ Skills (38)      │ Domain expertise       │` → `Skills (39)`
7. L332: `│  Automation Layer   │ Hooks + Scripts (42) │ Event-driven triggers│` → `(43)`
8. L336: `│  Shared Library     │ lib/ (93 modules)   │ Modular utilities     │` → `lib/ (101 modules)`
9. L384: `Layer 5: Scripts (42 Node.js scripts)` → `(43 Node.js scripts)`
10. L808: `agents/                         # AI subagents (36 total, with memory)` unchanged, but `skills/                         # Domain knowledge (38 skills)` → `(39 skills)`
11. L818: `├── scripts/                        # Hook execution scripts (42 scripts)` → `(43 scripts)`

### 3.3 README.md (3 edits + 1 insertion)

#### Edit A: line 80 ASCII box "(38 Skills)"
- bkit-system/README.md만 해당, README.md에는 없음 — skip to bkit-system

#### Edit B: README.md line 294
- old: `├── lib/                     # Shared utilities (93 modules across 12 subdirs)`
- new: `├── lib/                     # Shared utilities (101 modules across 11 subdirs)`

#### Insertion C: line 63 (Features 리스트 최상단) — v2.1.9 bullet 신설

v2.1.8 bullet 바로 앞에 아래 삽입:

```markdown
- **CC v2.1.116 Response + 4 ENH + Docs=Code 100% Sync (v2.1.9)** - ENH-253 zero-script-qa `context: fork` macOS verification (Issue #51165 non-reproduction), ENH-254 Defense-in-Depth security docs (CC runtime sandbox × bkit config-change hook layers, `docs/03-analysis/security-architecture.md`), ENH-259 Custom Skills data loss warning (Issue #51234, `CUSTOMIZATION-GUIDE.md`), ENH-263 Docs=Code 15-file correction (`@version 1.6.0` in lib/: 0 matches, 17 agents + 3 infra files), positive drift ENH-264 `outputBlockWithContext` infrastructure + ENH-265 `ENABLE_PROMPT_CACHING_1H` support (30-40% token savings on long PDCA sessions, `docs/03-analysis/prompt-caching-optimization.md`), CC recommended v2.1.116+ (74 consecutive compatible releases, v2.1.115 skipped). Shipping QA: Match Rate 100%, Coverage 90.3%, P0 Blocker 0, 0 regression.
```

### 3.4 bkit-system/README.md (5 edits)

1. L45 — historic v2.1.1 blockquote **유지**, but 위에 v2.1.9 entry 추가 (Edit: v2.1.1 이전에 삽입)
2. L80 ASCII: `│  │    (38 Skills)   │  │   (36 Agents)    │  │(12 subdirs)  │  │` → `(39 Skills) / (11 subdirs)`
3. L95: `│  │  L5: Scripts (42 Node.js modules)                        │  │` → `(43 Node.js modules)`
4. L250 table: `| Lib | 12 subdirectories, 93 modules | Shared utilities | 607 exports |` → `| Lib | 11 subdirectories, 101 modules | Shared utilities | — |` (exports 실측 어려움, em dash)
5. L273: `Layer 6: Lib Modules         → 12 subdirectories, 93 modules` → `11 subdirectories, 101 modules`
6. L363: `bkit's 38 skills, 36 agents, 42 scripts` → `39 skills, 36 agents, 43 scripts`

### 3.5 bkit-system/_GRAPH-INDEX.md (5 edits)

1. L118: `│  Domain Knowledge (38 Skills)  → Structured domain knowledge     │` → `(39 Skills)`
2. L120: `│  State Management (lib/common) → 93 modules, ~620+ exports       │` → `101 modules`
3. L430: `- `scripts/` - 42 scripts (Node.js)` → `43 scripts`
4. L431: `- `lib/` - 12 subdirectories, 93 modules (~620+ exports)` → `11 subdirectories, 101 modules`
5. L306: `- `lib/common.js` - Shared utility functions (v2.0.3, **~620+ exports** via bridge)` — historic context, skip (v2.0.3 시점)

### 3.6 bkit-system/philosophy/context-engineering.md (3 edits)

1. L49: `│  │  L5: Scripts    ─→ 42 Node.js hook scripts` → `43 Node.js hook scripts`
2. L123: `## Domain Knowledge Layer (38 Skills)` → `(39 Skills)`
3. L127: ASCII box `│                    Domain Knowledge Layer (38 Skills)` → `(39 Skills)`

### 3.7 bkit-system/philosophy/core-mission.md (1 edit)

L151: `> checkpoint/rollback, destructive operation detection, 38 Skills, 36 Agents, 21 Hook Events` → `39 Skills, 36 Agents, 21 Hook Events`

### 3.8 bkit-system/components/skills/_skills-overview.md (1 edit)

L3: `> 39 Skills defined in bkit (v2.1.8)` → `(v2.1.9)`
L5 위에 v2.1.9 entry 삽입:
```
> **v2.1.9**: CC v2.1.116 response — ENH-253/254/259/263 (4 ENH shipping) + Docs=Code 100% sync. Skills unchanged (39). CC recommended: v2.1.116+ (74 consecutive compatible, v2.1.115 skipped).
```

### 3.9 bkit-system/components/hooks/_hooks-overview.md (1 edit)

상단 history 블록에 v2.1.9 entry 추가 (v2.0.4 위):
```
> **v2.1.9**: CC v2.1.116 response — Hooks unchanged (21 events, 43 scripts). CC recommended: v2.1.116+.
```

### 3.10 bkit-system/components/scripts/_scripts-overview.md (1 edit)

상단 history에 v2.1.9 entry 추가.

### 3.11 CHANGELOG.md (1 Write — append 엔트리)

최상단 `## [2.1.8]` 위에 아래 신설:

```markdown
## [2.1.9] - 2026-04-21

### 🎯 CC v2.1.114 → v2.1.116 Response (4 ENH Shipping)

Response cycle for Claude Code CLI v2.1.114~v2.1.116 changes. Delivers 4 ENH (253/254/259/263) plus positive drift selections from v2.1.10 roadmap (ENH-264/265).

### Added
- **[ENH-253]** `docs/03-analysis/zero-script-qa-fork-v2116-verification.md` — manual reproduction of GitHub Issue #51165 (`context: fork` + `disable-model-invocation` failure) on macOS. Verdict: non-reproduction on macOS; bkit's sole `context: fork` skill (`zero-script-qa`) operates normally. ENH-196/202 investment protection confirmed.
- **[ENH-254]** `docs/03-analysis/security-architecture.md` — Defense-in-Depth security architecture formalization. Layer 1 (CC runtime sandbox: v2.1.113 #23 `dangerouslyDisableSandbox` + #14/#15/#16 Bash wrapper hardening + v2.1.116 S1 dangerous-path safety) × Layer 2 (bkit `config-change-handler.js` `DANGEROUS_PATTERNS` 5-pattern detection + audit). 5 sections + attack-vector matrix + user responsibility clause.
- **[ENH-259]** `CUSTOMIZATION-GUIDE.md` + `README.md` — Custom Skills data loss warning for GitHub Issue #51234 (`~/.claude/skills/` silent deletion on CC v2.1.113+ first-run). bkit itself unaffected (uses `${CLAUDE_PLUGIN_ROOT}/skills/`), but user custom skills at risk. Backup/restore commands + recommended plugin-bundle path guidance.
- **[ENH-264 partial — v2.1.10 roadmap positive drift]** `lib/core/io.js:114` `outputBlockWithContext(reason, alternatives, hookEvent)` + `scripts/unified-bash-pre.js` 2 call sites (deployment / QA phase detection). Alternative-command suggestions via CC v2.1.110+ `hookSpecificOutput.additionalContext`. Full general-Bash coverage scheduled for v2.1.10.
- **[ENH-265 — v2.1.10 roadmap positive drift]** `hooks/startup/session-context.js:236-241` — `ENABLE_PROMPT_CACHING_1H` environment-variable branch in SessionStart additionalContext. `docs/03-analysis/prompt-caching-optimization.md` operational guide (30-40% token savings on long PDCA sessions). `bkit.config.json:110-115` `performance.promptCaching1h` declaration (CC v2.1.108+).

### Changed
- **[ENH-263]** Docs=Code 15-file architectural correction:
  - `.claude-plugin/plugin.json:5` description — "39 Skills, 36 Agents, 21 Hook Events"
  - `.claude-plugin/marketplace.json:36` — "39 Skills, 36 Agents, 43 Scripts, 21 Hook Events"
  - `README.md:4,205` — Claude Code badge `v2.1.116+` + "Recommended: v2.1.116+ (74 consecutive compatible, v2.1.115 skipped)"
  - `hooks/startup/session-context.js:234-235` — SessionStart additionalContext "CC recommended: v2.1.116+ | 74 consecutive" + "Architecture: 39 Skills, 36 Agents, 21 Hook Events, 2 MCP Servers"
  - `bkit-system/components/agents/_agents-overview.md:5` — v2.1.9 entry added
  - `lib/core/io.js:4`, `lib/core/cache.js:4` JSDoc `@version 1.6.0` → removed (ENH-270 acceptance: `grep -rn "v1\.6\.0" lib/` = 0 matches)
  - 17 agents bulk `CC recommended version: v2.1.111+` → `v2.1.116+ (74 consecutive ...)`
- **[ENH-266 docs-sync, merged at shipping]** 10 additional files active-state sync — `AI-NATIVE-DEVELOPMENT.md`, `CUSTOMIZATION-GUIDE.md`, `README.md`, `bkit-system/README.md`, `bkit-system/_GRAPH-INDEX.md`, `bkit-system/philosophy/{core-mission,context-engineering}.md`, `bkit-system/components/{skills,hooks,scripts}/_*-overview.md`. Architecture counts normalized to `39 Skills / 36 Agents / 43 Scripts / 101 Lib modules / 11 subdirectories / 21 Hook events / 18 Templates / 4 Output styles / 2 MCP servers`. Historic release notes preserved.
- **Version** — 2.1.8 → 2.1.9 across `bkit.config.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `hooks/hooks.json`, `hooks/session-start.js`, `hooks/startup/session-context.js`.
- **CC recommended version** — v2.1.111+ → **v2.1.116+** (74 consecutive compatible, v2.1.115 skipped — 8th skipped release in v2.1.x series).

### Shipping Readiness
- **QA Report**: `docs/05-qa/cc-v2114-v2116-shipping-readiness.report.md`
- **Match Rate**: 100% (15/15 acceptance conditions across 4 ENH)
- **Coverage**: 90.3% (L1-L5 across 7 verification axes)
- **P0 Blockers**: 0
- **Regression**: 0 (43 baseline TC retained + new L1 smoke 101/101 + 43/43 PASS)
- **Runtime Evidence**: `docs/05-qa/evidence/v219/` — SessionStart stdout, L1 smoke, frontmatter audit, grep evidence, migration notice (5 files)

### MON-CC-06 Status (unchanged)
v2.1.113 native-binary transition 16 regression issues + v2.1.114~v2.1.116 6 new HIGH issues tracked. v2.1.117+ hotfix awaited. No v2.1.116 resolutions yet.
```

### 3.12 Gap 재검증 커맨드

```bash
# Active-state drift 0건 확인 (historic blockquote 제외)
grep -rn --include='*.md' -E "38 Skills|32 Agents|88 Lib|93 modules|42 scripts|42 Node\.js|12 subdirectories|22,734|57 Scripts" README.md CUSTOMIZATION-GUIDE.md AI-NATIVE-DEVELOPMENT.md bkit-system/ | grep -v "^\s*>" | grep -v "v1\.\|v2\.0\."
```
예상 결과: **0 matches** (historic blockquote/version notes 제외 후).

---

## 4. 병렬 가능성

- 10 P0 파일 상호 독립 → Edit 병렬 가능 (파일 중복 없음)
- CHANGELOG.md + README.md feature bullet 추가는 의존성 없음 → 병렬

---

## 5. 수락 기준 (재확인)

- [ ] P0 10 파일 모두 active-state 최신 수치 반영
- [ ] P1 CHANGELOG v2.1.9 entry + README v2.1.9 bullet 삽입
- [ ] Gap 재검증 0 matches (historic 제외)
- [ ] historic release notes 전수 보존
- [ ] Obsidian 내부 링크 미손상
- [ ] ASCII/Mermaid 다이어그램 정렬 유지

---

## 6. 관련 문서

- **Plan**: `docs/01-plan/features/bkit-v219-docs-sync.plan.md`
- **Shipping QA**: `docs/05-qa/cc-v2114-v2116-shipping-readiness.report.md`
- **Prior ENH-263**: `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md` §2.3
