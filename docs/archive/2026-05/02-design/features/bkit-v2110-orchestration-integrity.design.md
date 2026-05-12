---
feature: bkit-v2110-orchestration-integrity
status: 🏗️ Design Ready (Phase E Do 착수 가능)
target: bkit v2.1.10 (Sprint 7)
cc_compat: v2.1.117+
architecture_choice: Option B (Structured Extension) — Workflow State Machine + Next Action Engine + Team Invocation Protocol
source_plan: docs/01-plan/features/bkit-v2110-gap-closure-plan-plus.plan.md §21
source_analysis: docs/03-analysis/bkit-v2110-orchestration-integrity.analysis.md
created: 2026-04-22
---

# bkit v2.1.10 Orchestration Integrity — Design

> Phase B Gap Taxonomy 72건을 **P0 10 + P1 12 + P2/3 50**으로 분류한 뒤, **Invocation Contract 100% 보존 제약** 하에서 구현 가능한 최소·최단 경로를 정의한다.
> 설계 원칙:
> 1. **Invocation Contract 불변**: skills/agents/commands 이름·slash 명령어·`tools: Task(...)` 래퍼 구조 보존.
> 2. **Task tool 실 spawn 경로**: CTO/PM/QA Lead가 sub-agent를 실제 Task 도구로 호출. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 가드 유지.
> 3. **Sprint 4.5 재귀 학습**: 새 adapter는 `integration-runtime.test.js`로 방어.
> 4. **단일 진실원(SSoT)**: matchRate threshold `bkit.config.json:pdca.matchRateThreshold`, 버전 `bkit.config.json:version`, EXPECTED_COUNTS `lib/domain/rules/docs-code-invariants.js`.
> 5. **CC runtime 한계 공식화**: skill→skill 자동 호출은 LLM 지시문 기반 soft chain이며, bkit은 이를 **강화된 structured hint + autoTrigger JSON + AskUserQuestion**으로 3중 신호로 emit.

---

## 📌 Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | Sprint 0~6가 코드 유기성을 완결했으나 **UX 워크플로우 유기성**은 ~40% 수준. 사용자 프롬프트 → PDCA 전 사이클 자동화가 entry point에서 끊어짐 (G-J-01 등). CTO Team은 구조적 공백(G-T-01/02)으로 선전문(prose)에 머뭄. |
| **WHO** | 사용자(자연어로 기능 요청만 입력) + 개발자(Control Level 4 선택 시 완전 자동) + QA(Phase 7 /pdca qa로 전체 검증). |
| **RISK** | (R11)~(R15) Plan-Plus §21.5. 핵심 은 CTO Task spawn 실 구현 후 AGENT_TEAMS 환경 없는 사용자의 fallback + Trust Score level auto 변경으로 예기치 않은 권한 변동. |
| **SUCCESS** | D19~D30 (Plan-Plus §21.3). 특히 D22(matchRate SSoT 90), D23(cto-lead Task 예시 ≥5), D26(Next Action 범위 ≥15 hooks), D27(L4 자동 체인 ≤2 manual). |
| **SCOPE** | IN: lib/orchestrator/ 신규, Hook Next Action 표준화, PM/CTO/QA Lead body spawn 로직, intent/ 재구성, control/ trust auto 연결, frontmatter 정리, @version 일괄. OUT: design.md 2,644 lines 분할(v2.1.11+), main PR merge/tag/Release 노트(Phase 7 통과 후). |

---

## 1. Overview

### 1.1 핵심 아이디어: "3-Layer Orchestration"

```
┌─ Layer 1: Entry (User → Intent) ──────────────────────┐
│  UserPromptSubmit hook                                 │
│     ↓                                                  │
│  IntentRouter (신규, lib/orchestrator/intent-router.js)│
│     • SKILL_TRIGGER_PATTERNS 15+ 확장                  │
│     • Agent-Skill 우선순위 (skill > agent > feature)   │
│     • Feature-intent Hint (featureName optional)       │
│     • Structured output: {primary, alternatives}        │
└───────────────────┬──────────────────────────────────┘
                    ▼
┌─ Layer 2: Next Action Engine (Hook → Suggestion) ─────┐
│  Any Stop-family hook (Stop/SubagentStop/SessionEnd)  │
│     ↓                                                  │
│  NextActionEngine (신규, lib/orchestrator/next-action) │
│     • unified emit format                              │
│     • pdca phase → skill args 매핑                     │
│     • Control Level에 따라 autoTrigger 강도 조절       │
│     • AUTO-TRANSITION directive + structured hint      │
└───────────────────┬──────────────────────────────────┘
                    ▼
┌─ Layer 3: Team Invocation Protocol (Lead → Spawn) ────┐
│  PM Lead / CTO Lead / QA Lead (agent body)            │
│     ↓                                                  │
│  TeamProtocol (신규, lib/orchestrator/team-protocol)  │
│     • isTeamModeAvailable() 가드                       │
│     • spawnSubAgent(lead, sub, prompt) via Task tool  │
│     • state-writer lifecycle hook 연결                │
│     • Enterprise teammates 6 (SKILL.md 수정)          │
└───────────────────────────────────────────────────────┘
```

세 레이어는 **독립적으로 개선 가능**하며, 공통 의존 포트는 기존 `lib/cc-regression/index.js` facade + `lib/core/state-store.js`를 재사용.

### 1.2 "Invocation Contract 불변" 증명

| 변경 | Contract 영향 | 근거 |
|------|:---:|------|
| `lib/orchestrator/` 신규 3 모듈 | 0 | lib/ 내부, 공개 인터페이스 아님 |
| `SKILL_TRIGGER_PATTERNS` 확장 | 0 | `lib/intent/language.js` 내부 데이터 |
| Hook handler Next Action emit 보강 | 0 | `hookSpecificOutput.additionalContext`/`systemMessage` 필드 유지 |
| cto-lead body Task spawn 예시 추가 | 0 | description 내용 강화, agent 이름·tools 선언 수정만 |
| cto-lead frontmatter `Task(pm-lead)`/`Task(qa-lead)` 추가 | 0 | tools 배열에 optional 항목 추가, 기존 도구 보존 |
| trust-engine level auto 반영 | 0 | 내부 state file 동작, 사용자 API 없음 |
| `@version` 일괄 | 0 | JSDoc 주석 |
| Skills 중복 필드 제거 | 0 | YAML 최종값 불변 |

---

## 2. Module Map (Sprint 7 전체)

| 모듈 | 경로 | 변경 | Sprint |
|------|------|:---:|:---:|
| **Orchestrator Layer (신규)** | | | |
| intent-router.js | `lib/orchestrator/intent-router.js` | 신규 | 7c |
| next-action-engine.js | `lib/orchestrator/next-action-engine.js` | 신규 | 7c |
| team-protocol.js | `lib/orchestrator/team-protocol.js` | 신규 | 7a |
| workflow-state-machine.js | `lib/orchestrator/workflow-state-machine.js` | 신규 (pdca state × control level matrix) | 7b |
| index.js | `lib/orchestrator/index.js` | 신규 facade | 7a |
| **Intent Layer 확장** | | | |
| language.js | `lib/intent/language.js:SKILL_TRIGGER_PATTERNS` | 4→≥15 skills 확장 | 7c |
| trigger.js | `lib/intent/trigger.js` | featureName 없어도 hint 주입 | 7c |
| ambiguity.js | `lib/intent/ambiguity.js` | config 연결 | 7c |
| **Hook 통합** | | | |
| user-prompt-handler.js | `scripts/user-prompt-handler.js` | IntentRouter 연결, 구조화 emit | 7c |
| unified-stop.js | `scripts/unified-stop.js` | NextActionEngine 연결 (모든 default 경로) | 7c |
| session-end-handler.js | `scripts/session-end-handler.js` | NextActionEngine 연결 | 7c |
| subagent-stop-handler.js | `scripts/subagent-stop-handler.js` | NextActionEngine 연결 | 7c |
| pdca-skill-stop.js | `scripts/pdca-skill-stop.js` | NextActionEngine 재활용 (기존 동작 유지) | 7c |
| **Team Invocation** | | | |
| cto-lead.md | `agents/cto-lead.md` | body Task spawn 예시 + tools에 `Task(pm-lead)`, `Task(qa-lead)` 추가 | 7a |
| strategy.js | `lib/team/strategy.js` | Enterprise teammates 주석 일관화 | 7a |
| qa-lead.md | `agents/qa-lead.md` | qa-monitor 호출 경로 추가 | 7a |
| state-writer.js | `lib/team/state-writer.js` | lifecycle 호출 주석 (실 hook 연결) | 7a |
| **PDCA Phase Transition** | | | |
| state-machine.js | `lib/pdca/state-machine.js:288` | matchRate default 100→90 (config SSoT) | 7b |
| automation.js | `lib/pdca/automation.js:82` | matchRate 비교 config 참조 | 7b |
| gap-detector-stop.js | `scripts/gap-detector-stop.js:139` | 이미 config 참조 (일관성 재확인) | 7b |
| pdca-skill-stop.js | `scripts/pdca-skill-stop.js` | canAutoAdvance(Control L) 연결 | 7b |
| **Control / Trust** | | | |
| trust-engine.js | `lib/control/trust-engine.js:429` | syncToControlState에 currentLevel 반영 | 7d |
| automation-controller.js | `lib/control/automation-controller.js` | autoEscalation/autoDowngrade 플래그 연결 | 7d |
| full-auto-do.js | `lib/pdca/full-auto-do.js:234` | stub → Task dispatch | 7d |
| **Frontmatter/Legacy** | | | |
| Skills 19 frontmatter | 각 SKILL.md | @version update, 중복 필드 정리 | 7e |
| Agents 18 frontmatter | 각 agent .md | "Use proactively" 문구 추가 | 7e |
| SKILL.md (pdca) | `skills/pdca/SKILL.md:380-384` | Enterprise 5→6 | 7a |
| MEMORY.md | `memory/MEMORY.md` | "12명" 표현 제거 | 7e |
| `@version 2.0.0` → 2.1.10 | lib/ 66 + scripts/ 13 = 79 files | 일괄 grep+sed | 7e |
| **신규 Test** | | | |
| intent-router.test.js | `test/contract/intent-router.test.js` | 신규 L1/L2 | 7c |
| next-action-engine.test.js | `test/contract/next-action-engine.test.js` | 신규 L2 | 7c |
| team-protocol.test.js | `test/contract/team-protocol.test.js` | 신규 L2 | 7a |
| workflow-state.test.js | `test/contract/workflow-state.test.js` | 신규 L2 | 7b |
| trust-level-sync.test.js | `test/contract/trust-level-sync.test.js` | 신규 L1 | 7d |
| User Journey 10 shell smoke | `test/e2e/10-15*.sh` | L5 확장 | Phase 7 |

**총 신규 파일 11, 수정 파일 ~40**. Invocation Contract 226 assertions 영향 0건 확정.

---

## 3. 상세 설계 (Sprint 7a~7e)

### 3.1 Sprint 7a — Team Invocation Protocol (G-T 5건, ~4h)

#### 3.1.1 `lib/orchestrator/team-protocol.js` (~150 LOC)

```javascript
/**
 * Team Invocation Protocol — bridges Lead agents and Task tool spawn.
 *
 * Design Ref: bkit-v2110-orchestration-integrity.design.md §3.1
 * Plan SC: G-T-01/02/05/06 해결
 *
 * @module lib/orchestrator/team-protocol
 */

const cc = require('../cc-regression');
const team = require('../team');
const stateWriter = require('../team/state-writer');

/**
 * @typedef {Object} SpawnRequest
 * @property {string} lead  'pm-lead' | 'cto-lead' | 'qa-lead'
 * @property {string} sub   e.g. 'pm-discovery'
 * @property {string} prompt
 * @property {string} feature
 */

function canSpawn() {
  return team.isTeamModeAvailable();  // CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
}

/**
 * Register teammate state before actual Task spawn.
 * The actual spawn is performed by the Lead agent via its LLM turn.
 * This function records the intent and provides the prompt template.
 */
function registerSpawn(req) {
  stateWriter.addTeammate(req.lead, req.sub, { feature: req.feature });
  cc.recordEvent({
    hookEvent: 'TeamSpawn',
    ccVersion: cc.detectCCVersion(),
    sessionId: null,
    timestamp: new Date().toISOString(),
    context: { lead: req.lead, sub: req.sub },
  });
  return {
    taskPrompt: buildPrompt(req),
    env: canSpawn() ? 'agent-teams' : 'prose-fallback',
  };
}

function buildPrompt(req) {
  return `As ${req.sub} sub-agent invoked by ${req.lead} for feature "${req.feature}":\n\n${req.prompt}`;
}

function completeSpawn(req, result) {
  stateWriter.updateTeammateStatus(req.sub, 'completed');
}

module.exports = { canSpawn, registerSpawn, buildPrompt, completeSpawn };
```

**설계 핵심**: bkit 코드가 Task를 직접 실행할 수 없으므로 **"intent 등록 + prompt 준비 + state 기록"**만 담당. 실제 Task 발화는 **Lead agent의 LLM 턴**에서 수행(agent body 가이드로 지시).

#### 3.1.2 `agents/cto-lead.md` body 확장

기존 L82-88 테이블 이후에 추가:
```markdown
## CTO Team Task Spawn Patterns (v2.1.10 — G-T-01 해결)

### Plan phase
Execute in parallel using Task tool:
1. **Task(product-manager)**: "Analyze requirements for {feature}. Prepare scope brief."
2. **Task(pm-lead)**: "Deep product discovery for {feature} via PM Team."
Wait for both. Synthesize.

### Design phase
Execute in parallel:
1. **Task(enterprise-expert)**: "Design microservices architecture for {feature}."
2. **Task(infra-architect)**: "Define AWS/K8s infra for {feature}."
3. **Task(frontend-architect)**: "UI/UX architecture for {feature}."
4. **Task(security-architect)**: "OWASP review + auth design for {feature}."

### Do phase (swarm)
Dispatch implementation tasks:
- **Task(bkend-expert)**: backend + DB
- **Task(frontend-architect)**: UI + state
- **Task(code-analyzer)**: concurrent lint/quality pass

### Check phase (council)
- **Task(gap-detector)**: design↔code match
- **Task(qa-strategist)**: test strategy
- **Task(qa-lead)**: L1~L5 full QA

### Act phase
- **Task(pdca-iterator)**: auto-fix based on gap list
- **Task(report-generator)**: final report after 100% match

Before each Task call, invoke `lib/orchestrator/team-protocol.registerSpawn()` via
context (this agent's body instructs the LLM to call it as a side-effect).
```

#### 3.1.3 `agents/cto-lead.md` frontmatter `tools:` 추가

기존 11 Task() 선언 + 추가:
```yaml
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task(enterprise-expert)
  - Task(infra-architect)
  - Task(bkend-expert)
  - Task(frontend-architect)
  - Task(security-architect)
  - Task(product-manager)
  - Task(qa-strategist)
  - Task(code-analyzer)
  - Task(gap-detector)
  - Task(report-generator)
  - Task(pm-lead)        # v2.1.10: Enterprise pm role enablement (G-T-02)
  - Task(qa-lead)        # v2.1.10: Enterprise qa role enablement (G-T-02)
  - Task(pdca-iterator)  # v2.1.10: Act phase orchestration
  - Task(Explore)
```

#### 3.1.4 `agents/qa-lead.md` body 확장

Phase 3 실행 단계에 qa-monitor 경로 추가:
```markdown
### Phase 3: Test Execution (qa-lead direct + qa-monitor monitoring)

During L1~L5 execution, spawn qa-monitor in parallel for continuous monitoring:
- **Task(qa-monitor)**: "Monitor test output streams for the duration of L1~L5 execution. Report anomalies as they occur."

L1/L2/L3/L4/L5 실행은 qa-lead가 직접 수행하되, qa-monitor는 병렬로 Docker log / test stdout / stderr를 모니터링.
```

#### 3.1.5 `skills/pdca/SKILL.md:380-384` 교정

```diff
-| Dynamic | Yes | 3 | cto-lead (opus) |
-| Enterprise | Yes | 5 | cto-lead (opus) |
+| Dynamic | Yes | 3 | cto-lead (opus) |
+| Enterprise | Yes | 6 | cto-lead (opus) |
```

#### 3.1.6 `MEMORY.md` "12명" 표현 제거

이미 Sprint 6에서 79 lines로 축약됐으므로, "12명" 표현 있는 부분을 "동적 매핑 (Dynamic 3 / Enterprise 6)"으로 교정.

### 3.2 Sprint 7b — PDCA Phase Transition (G-P 4건, ~3h)

#### 3.2.1 matchRate SSoT 통일

**변경**:
- `lib/pdca/state-machine.js:288`:
  ```diff
  -const threshold = getConfig('pdca.matchRateThreshold', 100);
  +const threshold = getConfig('pdca.matchRateThreshold', 90);  // SSoT: bkit.config.json
  ```
- `lib/pdca/automation.js:82`:
  ```diff
  -check: context.matchRate >= 100
  +check: context.matchRate >= getConfig('pdca.matchRateThreshold', 90)
  ```

#### 3.2.2 `lib/orchestrator/workflow-state-machine.js` (~120 LOC)

PDCA phase × Control Level matrix를 통합:
```javascript
/**
 * Workflow State Machine — PDCA phase × Control Level 통합 분기
 * Plan SC: G-P-02 (GATE 연결), G-P-10 (ARCHIVE dispatcher), G-P-13 (DO_COMPLETE)
 */

const { canAutoAdvance, getCurrentLevel } = require('../control/automation-controller');
const { shouldAutoAdvance, generateAutoTrigger } = require('../pdca/automation');

function decideNextAction(phase, context) {
  const level = getCurrentLevel();
  const canAdvance = canAutoAdvance(phase, nextPhase(phase), level);
  const autoAdv = shouldAutoAdvance(phase);
  const trigger = generateAutoTrigger(phase, context);
  return {
    phase,
    nextPhase: nextPhase(phase),
    autoTrigger: trigger,
    canAdvanceByLevel: canAdvance,
    advanceMode: canAdvance && autoAdv ? 'auto' : canAdvance ? 'soft' : 'gate',
    level,
  };
}

function nextPhase(phase) {
  const map = { pm:'plan', plan:'design', design:'do', do:'check', check:'qa', qa:'report', report:'archived' };
  return map[phase] || null;
}

// v2.1.10 Sprint 7b — G-P-10: report→archived dispatcher
function dispatchArchive(feature) {
  const sm = require('../pdca/state-machine');
  const ctx = sm.loadContext(feature);
  if (ctx && ctx.currentState === 'report') {
    return sm.transition('report', 'ARCHIVE', ctx);
  }
  return null;
}

// v2.1.10 Sprint 7b — G-P-13: Do completion setter
function markDoComplete(feature, result) {
  const sm = require('../pdca/state-machine');
  const ctx = sm.loadContext(feature) || sm.createContext(feature);
  ctx.metadata = ctx.metadata || {};
  ctx.metadata.doCompletionResult = { complete: true, ...result };
  sm.saveContext(ctx);
  return ctx;
}

module.exports = { decideNextAction, nextPhase, dispatchArchive, markDoComplete };
```

#### 3.2.3 `scripts/pdca-skill-stop.js` — Control Level 연계

기존 autoTrigger 생성 로직 뒤에 workflow-state-machine.decideNextAction 호출 → L0~L1은 AskUserQuestion 강제, L2+는 soft chain, L4는 강제 autoTrigger.

### 3.3 Sprint 7c — User Journey (G-J 6건, ~5h)

#### 3.3.1 `lib/intent/language.js:SKILL_TRIGGER_PATTERNS` 확장

기존 4개(starter/dynamic/enterprise/mobile-app) → **15개** (신규 11):
```javascript
const SKILL_TRIGGER_PATTERNS = {
  starter: { ... },
  dynamic: { ... },
  enterprise: { ... },
  'mobile-app': { ... },
  // v2.1.10 Sprint 7c 신규
  pdca: { en: ['pdca', 'plan and design', 'full cycle'], ko: ['pdca', '계획 설계 구현'], ... },
  'pm-discovery': { en: ['product discovery', 'prd', 'user research'], ko: ['프로덕트 기획', '제품 발굴', '고객 연구'], ... },
  'plan-plus': { en: ['brainstorm plan', 'intent discovery'], ko: ['브레인스토밍', '심층 계획'], ... },
  'qa-phase': { en: ['run qa', 'test everything', 'full qa'], ko: ['qa 돌려', '테스트 전체', '품질 검사'], ... },
  'code-review': { en: ['review code', 'code quality'], ko: ['코드 리뷰', '코드 품질'], ... },
  deploy: { en: ['deploy', 'ship', 'release'], ko: ['배포', '릴리스'], ... },
  rollback: { en: ['rollback', 'revert'], ko: ['롤백', '되돌리'], ... },
  'skill-create': { en: ['create skill', 'new skill'], ko: ['스킬 만들', '스킬 생성'], ... },
  control: { en: ['automation level', 'control level'], ko: ['자동화 레벨', '제어 레벨'], ... },
  audit: { en: ['audit log', 'decision trace'], ko: ['감사 로그', '결정 추적'], ... },
  'phase-4-api': { en: ['api design', 'rest api'], ko: ['api 설계', '엔드포인트'], ... },
};
```

#### 3.3.2 `lib/orchestrator/intent-router.js` (~180 LOC)

경쟁 해결 + 구조화:
```javascript
/**
 * Intent Router — priority-resolved intent detection with structured output.
 *
 * Priority rule (v2.1.10 Sprint 7c, G-J-04):
 *   1. PDCA skill if feature intent detected (new feature → /pdca pm)
 *   2. Other skill if skill trigger matched (confidence ≥ 0.75)
 *   3. Agent if agent trigger matched (confidence ≥ 0.8)
 *   4. Feature-only hint (confidence ≥ 0.7 without featureName → soft suggestion)
 */

function route(prompt, context) {
  const feature = detectFeatureIntent(prompt);
  const skill = matchImplicitSkillTrigger(prompt);
  const agent = matchImplicitAgentTrigger(prompt);
  const ambiguity = calculateAmbiguityScore(prompt, context);

  const suggestions = [];
  let primary = null;

  // G-J-03: feature intent with loose threshold
  if (feature && feature.confidence >= 0.7) {
    const pdcaSuggestion = { type: 'skill', name: 'bkit:pdca', args: feature.featureName ? `pm ${feature.featureName}` : 'pm', rationale: 'new feature detected', confidence: feature.confidence };
    suggestions.push(pdcaSuggestion);
    primary = pdcaSuggestion;
  }
  if (skill && skill.confidence >= 0.75) {
    suggestions.push({ type: 'skill', name: skill.skill, rationale: 'skill trigger', confidence: skill.confidence });
    if (!primary) primary = suggestions[suggestions.length - 1];
  }
  if (agent && agent.confidence >= 0.8) {
    suggestions.push({ type: 'agent', name: agent.agent, rationale: 'agent trigger', confidence: agent.confidence });
    if (!primary) primary = suggestions[suggestions.length - 1];
  }

  return {
    primary,
    suggestions,
    ambiguity,
  };
}

module.exports = { route };
```

#### 3.3.3 `scripts/user-prompt-handler.js` 재연결

기존 contextParts.push 경로를 IntentRouter 결과로 치환:
```javascript
const { route } = require('../lib/orchestrator/intent-router');
const routed = route(userPrompt, { onboarding, featureState });

if (routed.primary) {
  contextParts.push(`[Primary] ${formatSuggestion(routed.primary)}`);
}
for (const alt of routed.suggestions.slice(1, 3)) {
  contextParts.push(`[Alt] ${formatSuggestion(alt)}`);
}
```

그리고 structured JSON도 병행 emit (`hookSpecificOutput.suggestions`):
```javascript
const response = {
  ...
  hookSpecificOutput: {
    ...,
    suggestions: routed.suggestions.map(s => ({ type: s.type, name: s.name, args: s.args || null, confidence: s.confidence })),
  }
};
```

#### 3.3.4 `scripts/unified-stop.js` 기본 경로 Next Action 추가

```javascript
if (!handled) {
  const { generateGeneric } = require('../lib/orchestrator/next-action-engine');
  const nextAction = generateGeneric({ activeSkill, activeAgent, pdcaStatus });
  const msg = `Stop event processed.${trustInfo}${auditInfo}${copyTip}${nextAction ? '\n\n' + nextAction : ''}`;
  outputAllow(msg, 'Stop');
}
```

#### 3.3.5 `lib/orchestrator/next-action-engine.js` (~160 LOC)

```javascript
/**
 * Next Action Engine — unified hint generator for Stop-family hooks.
 * Plan SC: G-J-05/06/07
 */

function generatePhaseNext(phase, feature) {
  const map = { pm:`/pdca plan ${feature}`, plan:`/pdca design ${feature}`, design:`/pdca do ${feature}`,
                do:`/pdca analyze ${feature}`, check:`/pdca iterate ${feature}`, qa:`/pdca report ${feature}`,
                report:`/pdca archive ${feature}` };
  return map[phase];
}

function generateGeneric(ctx) {
  const phase = ctx.pdcaStatus?.currentPhase;
  const feature = ctx.pdcaStatus?.primaryFeature;
  if (phase && feature) {
    const next = generatePhaseNext(phase, feature);
    if (next) return `Next suggested action: \`${next}\``;
  }
  if (ctx.activeSkill === 'pdca') return 'Next: continue PDCA cycle via `/pdca next` or `/pdca status`';
  return null;
}

function generateSessionEnd(ctx) { /* ... */ }
function generateSubagentStop(ctx) { /* ... */ }

module.exports = { generatePhaseNext, generateGeneric, generateSessionEnd, generateSubagentStop };
```

### 3.4 Sprint 7d — Control Level / Trust Score (G-C 4건, ~4h)

#### 3.4.1 `lib/control/trust-engine.js:429` level 반영 복원

```diff
 function syncToControlState() {
   try {
     const controlStatePath = path.join(PROJECT_DIR, '.bkit', 'runtime', 'control-state.json');
     if (!fs.existsSync(controlStatePath)) return;
     const current = JSON.parse(fs.readFileSync(controlStatePath, 'utf8'));
     const profile = loadTrustProfile();
     current.trustScore = profile.trustScore;
+    // v2.1.10 Sprint 7d (G-C-01): auto escalate/downgrade currentLevel
+    const autoDown = getConfig('automation.autoDowngrade', true);
+    const autoUp = getConfig('automation.autoEscalation', false);
+    if (profile.currentLevel != null && profile.currentLevel !== current.currentLevel) {
+      const increasing = profile.currentLevel > current.currentLevel;
+      if ((increasing && autoUp) || (!increasing && autoDown)) {
+        current.currentLevel = profile.currentLevel;
+      }
+    }
     fs.writeFileSync(controlStatePath, JSON.stringify(current, null, 2) + '\n', 'utf8');
   } catch (_) {}
 }
```

#### 3.4.2 `lib/pdca/full-auto-do.js:234` stub 해제

```javascript
// v2.1.10 Sprint 7d (G-C-08): Task dispatch via team-protocol
const tp = require('../orchestrator/team-protocol');
if (tp.canSpawn()) {
  const spawnReq = { lead: 'cto-lead', sub: 'bkend-expert', prompt, feature: ctx.feature };
  const reg = tp.registerSpawn(spawnReq);
  task.taskPrompt = reg.taskPrompt;
  task.env = reg.env;
  task.status = 'dispatched';  // CC의 LLM 턴이 실 Task 호출
} else {
  task.status = 'manual-required';  // prose fallback
}
```

### 3.5 Sprint 7e — Frontmatter + Dead Code (G-F + G-D, ~2h)

#### 3.5.1 Skills 중복 필드 정리

- `skills/phase-4-api/SKILL.md:7, 21` `user-invocable: false` 중 라인 21 제거
- `skills/phase-5-design-system/SKILL.md:9, 22` 동일

#### 3.5.2 `zero-script-qa` `allowed-tools` 명시

```yaml
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
```

#### 3.5.3 Agents 18개 "Use proactively when…" 추가

대표 패턴 (이미 존재하는 18개 agents의 description 앞에 추가):
```markdown
Use proactively when user requests {specific trigger context}.
```

#### 3.5.4 `@version` 일괄 교체

```bash
find lib -name "*.js" -exec sed -i '' 's/@version 2\.0\.0/@version 2.1.10/g' {} \;
find lib -name "*.js" -exec sed -i '' 's/@version 1\.6\.[0-9]*/@version 2.1.10/g' {} \;
find scripts -name "*.js" -exec sed -i '' 's/@version 1\.6\.[0-9]*/@version 2.1.10/g' {} \;
find scripts -name "*.js" -exec sed -i '' 's/@version 2\.0\.0/@version 2.1.10/g' {} \;
```

#### 3.5.5 `lib/core/paths.js:78` `@deprecated v1.6.0` 정리

실제 제거 또는 `@deprecated since v2.0.0, still retained for backward compatibility`로 교정.

---

## 4. Test Plan

### 4.1 L1 신규 TC (~30)

- `intent-router.test.js`: priority resolver, SKILL_TRIGGER_PATTERNS 15 ≥ 검증
- `next-action-engine.test.js`: 7 phase × 3 hook 매트릭스
- `team-protocol.test.js`: canSpawn/registerSpawn/completeSpawn
- `trust-level-sync.test.js`: autoDowngrade 동작, autoEscalation 차단

### 4.2 L2 Integration (~15)

- `workflow-state.test.js`: phase transition × Control Level 매트릭스
- `recordEvent + TeamSpawn`: NDJSON 기록
- `autoTrigger JSON`: structured suggestions 필드 emit

### 4.3 L5 User Journey Shell Smoke (신규 5~10)

- `test/e2e/10-intent-router-login-feature.sh`: "로그인 기능 만들어줘" → PDCA 제안 주입 확인
- `test/e2e/11-intent-router-pm-discovery.sh`: "프로덕트 기획해줘" → pm-discovery 감지
- `test/e2e/12-cto-team-spawn.sh`: CTO Team 시나리오 hint 구조 확인
- `test/e2e/13-control-level-4-chain.sh`: `/control level 4` 후 PDCA 사이클 ≤2 manual
- `test/e2e/14-trust-downgrade.sh`: 실패 누적 후 control-state.currentLevel 하락

### 4.4 Phase 7 /pdca qa (최종 검증)

Plan-Plus §21.6 10개 시나리오 전수 실행. qa-lead가 L1~L5 orchestration.

---

## 5. Invocation Contract 회귀 방어

각 Sprint 종료마다:
```
node test/contract/scripts/contract-test-run.js --compare v2.1.9 --level L1,L4
```
226 assertions PASS 유지 필수.

---

## 6. Session Plan (Phase E Do 실행 순서)

| 세션 | Sprint | 시간 |
|:----:|:------:|:---:|
| 1 | 7a (Team Invocation) | 4h |
| 2 | 7b (Phase Transition) | 3h |
| 3 | 7c (User Journey) | 5h |
| 4 | 7d (Control/Trust) | 4h |
| 5 | 7e (Frontmatter/Legacy) | 2h |
| 6 | Iterate + L5 smoke | 3h |
| 7 | **Phase 7 /pdca qa** | 3h |
| 8 | 문서 동기화 | 1h |
| **총** | | **~25h** |

### 6.1 의존성

```
7a (Team Protocol)
 └─ 7b (Workflow SM + Phase Transition)  ← canAutoAdvance 연동
    └─ 7c (Intent Router + Next Action) ← workflow-state-machine 호출
       └─ 7d (Trust/Control)             ← intent-router의 우선순위 규칙 적용
          └─ 7e (Frontmatter + Legacy)   ← 마지막 클린업
             └─ Iterate                   ← gap-detector 재실행
                └─ Phase 7 /pdca qa       ← 최종 검증
                   └─ 문서 동기화
```

---

## 7. Success Criteria (D19~D30, Plan-Plus §21.3 재게시)

| # | 기준 | 목표 |
|---|------|:---:|
| D19 | Skill trigger coverage | ≥ 15 |
| D20 | Feature intent 주입률 (10 smoke) | ≥ 8 |
| D21 | Agent-Skill resolver | 구현 |
| D22 | matchRate threshold SSoT | 90 only |
| D23 | cto-lead body Task 예시 수 | ≥ 5 |
| D24 | CTO teammates Task 선언 | pm-lead + qa-lead |
| D25 | Enterprise teammates 수 일관 | 6 = 6 |
| D26 | Next Action 제안 범위 | ≥ 15 hook |
| D27 | L4 자동 체인 smoke | ≤ 2 manual |
| D28 | Trust Score level 반영 | 작동 |
| D29 | Agents "Use proactively" | ≥ 30 |
| D30 | Legacy `@version 2.0.0` | 0 |

---

## 8. 리스크 재확인 (§21.5 매핑)

| # | Risk | 완화 | Sprint |
|---|------|------|:---:|
| R11 | CTO Task spawn 구조 변경 → AGENT_TEAMS 없을 때 silent fallback | `canSpawn()` 가드 + prose fallback body | 7a |
| R12 | SKILL_TRIGGER_PATTERNS false-positive | 임계 0.8 Skill 유지, 8-lang 엄격, smoke 10 | 7c |
| R13 | Trust auto level 변동 → 권한 급변 | `autoEscalation:false` 유지, `autoDowngrade` 만 | 7d |
| R14 | full-auto-do stub 해제 → recursion 재발 | Integration runtime TC + lazy require | 7d |
| R15 | `@version` 79건 diff 노이즈 | Sprint 7e 별도 커밋 | 7e |

---

**문서 끝.**

> 본 Design은 Plan-Plus §21을 실행 가능한 수준으로 상세화했습니다. Phase E Do(Sprint 7a)부터 착수.
