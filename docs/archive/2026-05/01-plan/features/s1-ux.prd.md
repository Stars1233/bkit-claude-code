# S1-UX PRD — Sprint UX 개선 Sub-Sprint 1 (P0/P1 Quick Fixes)

> **Sub-Sprint ID**: `s1-ux` (kebab-case, `sprint-ux-improvement` master 의 1/4)
> **Master Plan**: `docs/01-plan/features/sprint-ux-improvement.master-plan.md` v1.0 (commit `77603ee`)
> **Phase**: PRD (1/7) → Plan → Design → Do → Iterate → QA → Report
> **Status**: Active
> **Date**: 2026-05-12
> **Author**: kay kim (POPUP STUDIO PTE. LTD.)
> **Trust Level (default)**: L3 (사용자 명시 가능 시 override)
> **Branch**: `feature/v2113-sprint-management` (base `77603ee`)
> **Target Release**: v2.1.13 GA (single release, Sprint 6 진입 전 완료)
> **Token Budget**: ~25K (단일 세션 안전, 1H prompt cache 활용)
> **Files in scope**: 3 (코드 2 + 스킬 문서 1) — Master Plan §5.1 "4 files" 는 P0 fix 의 helper 함수 추가까지 포함한 논리적 개수. 실제 디스크상 변경 파일은 3개.
> **Depends on (immutable)**:
> - Sprint 1-5 (모두 GA `1337e1f`)
> - bkit-system philosophy 7 invariants
> - Sprint 5 verification #1-#4 (commit `77603ee` 포함)
> - Master Plan §4.1-§4.5 P0/P1 분류
> **사용자 명시 누적 (1-5) 보존 검증**:
> 1. 8개국어 trigger + @docs 예외 한국어 → 본 PRD 한국어 ✓
> 2. Sprint 유기적 상호 연동 → P1 §4.4 skill args 가 직접 충족
> 3. QA = bkit-evals + claude -p + 4-System + diverse perspective → QA phase (S1-UX P6) 에서 적용
> 4. ★ Master Plan + 컨텍스트 윈도우 sprint sizing → 본 sub-sprint 가 P0/P1 fix 후 S2-UX (Master Plan generator) 진입 unblock
> 5. ★ 꼼꼼하고 완벽하게 (빠르게 X) → 본 PRD 의 모든 섹션 압축 X, code-level 정확 인용

---

## 0. Context Anchor (Master Plan §1 에서 본 Sub-Sprint 로 전파, 후속 Phase 모두에 상속)

| Key | Value |
|-----|-------|
| **WHY** | Master Plan §0.1 의 mission ("3 skills 유기적 통합으로 자율 PDCA cycle 수행 가능한 master plan 자동 생성기") 달성을 위해서는 **현재 v2.1.13 Sprint 5 GA (`1337e1f`) 상태의 6 gaps 중 P0×1 + P1×3 (P1 §4.5 는 Sprint 5 V#3 에서 이미 FIXED) 가 선행 해소되어야 한다**. 특히 P0 `start-sprint.usecase.js:164` 의 unconditional `createSprint()` 는 existing sprint resume 시 phase reset bug 를 일으켜 후속 S2-UX 의 `bkit:sprint-master-planner` agent 통합 시점에 **multi-sprint chain 의 root 신뢰성을 깨뜨림**. 본 sub-sprint 가 4 sub-sprints chain 의 첫 번째 단계로 후속 모든 작업의 토대를 안정화한다. 추가로 P1 §4.4 skill args invocation matrix 부재는 **본 세션의 실제 사례** (`/sprint start S1-UX Phase 1 PRD 진행해줘` 호출 시 LLM 이 `args.id` 를 무엇으로 dispatch 해야 하는지 명시 부재 → handler 실제 자동 실행 안 됨) 로 입증되었으며 즉시 fix 필요. |
| **WHO** | (1차) **bkit core developer (kay kim)** — Sprint UX 개선의 첫 sub-sprint 실행자, P0 fix 시 Sprint 2 invariant §R8 정당화 매트릭스 추적. (2차) **본 세션 LLM dispatcher** — `/sprint <action>` 호출 시 args 객체 구성 명확화로 자동 실행 가능. (3차) **bkit 사용자** — `/sprint start <id>` 호출 시 existing sprint 가 resume 되어 phase 가 보존됨 (현재는 reset). (4차) **bkit core CI** — Sprint 1-5 regression 226 TCs PASS 유지 보장 (P0 fix 의 Sprint 2 invariant 영향 검증). (5차) **`/control` Trust Level 사용자** — `--trust L0~L4` flag 가 3 form (args.trust / args.trustLevel / args.trustLevelAtStart) 모두 정상 normalize. (6차) **S2-UX 진입자** — 본 sub-sprint 의 Report 완료 후 Master Plan generator 안전 활용. |
| **RISK** | (a) **★ Sprint 2 invariant §R8 위배 risk**: `start-sprint.usecase.js:164` line 변경은 Sprint 5 Plan §R8 ("Sprint 2 Application Layer 변경 0 유지") 위배. → Master Plan §4.1 의 justification ("bug fix 는 invariant 보존 의도와 무관, functional correctness 의 일부") 매 commit 명시 + Sprint 1-4 226 TCs 매 변경 후 재실행. (b) **Load-then-resume 패턴의 race condition**: `stateStore.load(id)` 와 `createSprint(...)` 사이의 timing 으로 concurrent invocation 시 양쪽 다 load=null 인지 → 양쪽이 동시에 createSprint → 양쪽이 동시에 save 하면 last-write-wins → silent data loss. → Sprint 3 stateStore 가 atomic write (`fs.writeFile` 이 임시 파일 → rename 패턴) 임을 design phase 에서 검증 + concurrent 시나리오는 out-of-scope (single-user CC session 가정). (c) **Trust flag 3 form normalize 의 의미 손실**: `args.trust='L3'` 와 `args.trustLevel='L3'` 와 `args.trustLevelAtStart='L3'` 가 모두 동의어인지 확실하지 않음 — `trustLevelAtStart` 는 createSprint 시점 trust level 의 **시점 capture** 의도이지 user input alias 가 아닐 수 있음. → Design phase 에서 사용자 명시 의도 분리 (input alias vs stored property) + 3 form 모두 input → 단일 internal key `trustLevel` 로 normalize, stored property 는 별도. (d) **CLI shebang 추가 시 require cycle risk**: `scripts/sprint-handler.js` 가 require 되는 위치 (skills, agents, tests) 가 많아 shebang 추가 후 `node scripts/sprint-handler.js` CLI 실행 시 lazy require 가 회피되지 않으면 load order 가 바뀜. → Design phase 에서 `if (require.main === module)` 가드로 CLI mode 격리, require mode 는 변경 0. (e) **SKILL.md body 변경 시 frontmatter triggers 영향 0 보장**: skill frontmatter 의 8개국어 trigger list 는 본 sub-sprint scope 외, body 변경 시 frontmatter 손상 risk. → Design phase 에서 body-only edit + yaml lint + skill validator 매 변경 후 실행 (CC v2.1.129 #56448 measurement methodology TBD 와 별개로 250자 보수적 cap 적용). (f) **F9-120 closure 13-cycle 깨기 risk**: `claude plugin validate .` 가 SKILL.md 변경 후 fail → 본 sub-sprint Done criteria 미충족. → Do phase 매 변경 후 즉시 실행 + Iterate phase 에서 최종 확인. (g) **hooks.json 21:24 invariant 깨기 risk**: 신규 hook 추가 유혹 (e.g., sprint state 변경 시 webhook) → 본 sub-sprint scope 외, Master Plan §3.5 의 "신규 hook 추가 0" 명시. → Design phase 에서 신규 hook 0 확인. (h) **본 PRD 자체의 사용자 명시 5 위배 risk**: "빠르게 끝내려는 inclination" → Master Plan §12.O. → 본 sub-sprint 매 phase 시작 시 [[feedback-thorough-complete]] 메모리 참조. |
| **SUCCESS** | (1) **P0 bug fix 완료**: `start-sprint.usecase.js:164` load-then-resume 패턴 (stateStore.load 우선, existing sprint 발견 시 `cloneSprint(stored, { autoRun: { scope, startedAt } })`, 없으면 `createSprint(...)` — 기존 path). (2) **P1 trust flag normalize**: handler 가 `args.trust` / `args.trustLevel` / `args.trustLevelAtStart` 3 form 모두 수용 → internal key `trustLevel` 단일화 (lifecycleDeps 에 전달). (3) **P1 CLI entrypoint**: `scripts/sprint-handler.js` 에 `#!/usr/bin/env node` shebang + `if (require.main === module)` 가드 + 간이 argv parser (action + flags) + JSON 출력. require mode 동작 변경 0. (4) **P1 skill args invocation matrix**: `skills/sprint/SKILL.md` body 에 "Skill Invocation Contract (LLM dispatcher 용)" 섹션 추가 — JSON args schema 매트릭스 (각 sub-action 별 required/optional fields + 본 세션의 `/sprint start S1-UX Phase 1 PRD` 같은 자연어 → args.id='s1-ux' 매핑 예시). (5) **Sprint 1-4 regression 226 TCs PASS 유지**: P0 fix 의 Sprint 2 invariant 영향 무 (functional correctness). (6) **F9-120 closure 13-cycle 누적**: `claude plugin validate .` Exit 0. (7) **8개국어 trigger 무영향**: skill frontmatter triggers field 변경 0. (8) **hooks.json 21:24 보존**. (9) **bkit-system philosophy 7 invariants 보존** (§2.1 매트릭스). (10) **Doc=Code 0 drift**: `scripts/docs-code-sync.js` 매 commit 후 0. (11) **AC-P0-P1-Fixes 6 criteria 모두 PASS** (§6.1 매트릭스). (12) **본 PRD 의 9 sections + 6 JTBD + 11 pre-mortem 모두 완성** (꼼꼼함 §16 checklist row). |
| **SCOPE** | **In-scope 3 disk files (4 logical changes)**: (a) `lib/application/sprint-lifecycle/start-sprint.usecase.js` — line 164 conditional + helper function `loadOrCreateSprint(input, stateStore, clock)` 추가 (P0 §4.1), (b) `scripts/sprint-handler.js` — (b1) handleStart args normalize helper `normalizeTrustLevel(args)` (P1 §4.2), (b2) shebang + main argv parser + require.main guard (P1 §4.3), (c) `skills/sprint/SKILL.md` — body 에 §10 "Skill Invocation Contract" 신규 섹션 + JSON args schema 매트릭스 (P1 §4.4). **Out-of-scope (S2/S3/S4-UX 또는 v2.1.14)**: master-plan sub-action 구현 (S2-UX), context-sizer.js (S3-UX), L3 Contract SC-09/10 (S4-UX), `commands/bkit.md` ext (S4-UX), `docs/06-guide/sprint-management.guide.md §9` (S4-UX), BKIT_VERSION 5-loc bump (Sprint 6), CHANGELOG (Sprint 6), `gap-detector` regex parser (P1 §4.5 ✓ Sprint 5 V#3 FIXED), MEMORY.md hook v2 (v2.1.14, Sprint 5 V#4 base 만 유지), real backend wiring 확장 (verification #3 base 만, v2.1.14), `/pdca team` Sprint 통합 (v2.1.14). **Tests**: 본 sub-sprint 에서는 regression 위주 (Sprint 1-4 226 TCs 매 변경 후 재실행). 신규 L1/L2/L3 추가는 S4-UX (SC-09/10) 에서. 단 P0 fix 의 phase 보존 검증을 위한 ad-hoc 시나리오 1건은 본 sub-sprint Do/Iterate phase 에서 manual 검증. **Docs**: 본 PRD + Plan + Design + Report 4 docs (S1-UX sub-sprint 자체의 Doc=Code). Master Plan 변경 X. |

---

## 1. Problem Statement (현 v2.1.13 Sprint 5 GA 상태의 실제 결함)

Master Plan v1.0 §4 (Phase C 통합) 에서 식별된 6 gaps 중 본 sub-sprint 가 해소하는 4 건 (P0×1 + P1×3, P1 §4.5 는 Sprint 5 V#3 에서 이미 FIXED 로 skip):

### 1.1 P0 — `/sprint start` Phase Reset Bug (Master Plan §4.1)

**현 상태** (`lib/application/sprint-lifecycle/start-sprint.usecase.js` 실측):

```javascript
// line 156-179 (실측, 본 PRD 작성 시점 commit 77603ee)
const trustLevel = (input && input.trustLevel) || 'L2';
const scope = SPRINT_AUTORUN_SCOPE[trustLevel] || SPRINT_AUTORUN_SCOPE.L2;

const clock = (deps && typeof deps.clock === 'function')
  ? deps.clock
  : () => new Date().toISOString();
const now = clock();
let sprint = createSprint({ ...input, trustLevelAtStart: trustLevel });  // ← line 164: unconditional createSprint
sprint = cloneSprint(sprint, {
  autoRun: {
    ...(sprint.autoRun || {}),
    scope: { stopAfter: scope.stopAfter, requireApproval: scope.requireApproval },
    startedAt: now,
  },
  startedAt: now,
  phaseHistory: [{ phase: sprint.phase, enteredAt: now, exitedAt: null, durationMs: null }],
});

const stateStore = (deps && deps.stateStore) || inMemoryStore();
const emit = (deps && typeof deps.eventEmitter === 'function') ? deps.eventEmitter : noopEmitter;
await stateStore.save(sprint);  // ← line 178: unconditional save (existing sprint 덮어쓰기)
```

**문제**:
- existing sprint 가 stateStore 에 이미 phase='design' (예) 으로 저장되어 있어도 `createSprint(...)` 는 신규 sprint 를 phase='prd' (또는 `input.phase`) 로 생성
- line 178 `stateStore.save(sprint)` 가 existing entry 덮어쓰기 → **phase 영구 손실**
- phaseHistory 도 line 172 에서 single entry 로 reset → **이전 phase transitions 기록 손실**
- audit log 의 SprintCreated event 도 line 179 에서 (P0 fix 후 import 위치 변경 필요) 재 emit → **이벤트 중복**

**사용자 시나리오 broken case**:
1. User: `/sprint init my-launch --name "Q2 Launch" --trust L3` → sprint.phase='prd' 저장
2. User: `/sprint phase my-launch --to plan` → sprint.phase='plan' 저장 (advancePhase 정상)
3. (세션 clear 또는 다른 작업 후)
4. User: `/sprint start my-launch` → ★ phase='prd' 로 reset, phaseHistory single entry → 사용자 작업 손실

**Fix 방향 (Master Plan §4.1)**:

```javascript
// 의사 코드 (Design phase 에서 정확 구현):
async function loadOrCreateSprint(input, stateStore, clock) {
  const existing = await stateStore.load(input.id);
  if (existing) {
    return { sprint: existing, isResume: true };
  }
  return { sprint: createSprint({ ...input, trustLevelAtStart: input.trustLevel }), isResume: false };
}

// startSprint() 내부:
const { sprint: base, isResume } = await loadOrCreateSprint(input, stateStore, clock);
let sprint = cloneSprint(base, {
  autoRun: { ...(base.autoRun || {}), scope, startedAt: now },
  startedAt: isResume ? base.startedAt : now,  // resume 시 원래 startedAt 보존
  phaseHistory: isResume ? base.phaseHistory : [{ phase: base.phase, enteredAt: now, exitedAt: null, durationMs: null }],
});
emit(isResume
  ? SprintEvents.SprintResumed(...)  // 신규 import 필요? 또는 SprintCreated 의 변형?
  : SprintEvents.SprintCreated(...));
```

**Sprint 2 invariant §R8 정당화 매트릭스** (Master Plan §4.1):

| 측면 | 영향 | Mitigation |
|------|------|------------|
| 파일 변경 수 | 1 (`start-sprint.usecase.js`) | enhancement zone 외 변경 0 (git diff --stat 매 commit 검증) |
| LOC 변경 | +15~25 (helper + conditional) | minimal change |
| 시그니처 변경 | 0 (`startSprint(input, deps)` 시그니처 보존) | external caller 변경 0 |
| 기존 createSprint 호출 의도 | 보존 (no existing sprint 시 동일 path) | regression risk 최소 |
| Sprint 1-4 226 TCs | 모두 PASS 보장 | 매 변경 후 재실행 |
| Justification | "Bug fix 는 invariant 보존 의도와 무관, functional correctness 의 일부" | Master Plan §4.1 명시 |

### 1.2 P1 — `--trust` Flag Key 불일치 (Master Plan §4.2)

**현 상태** (`scripts/sprint-handler.js` handleStart 실측):

```javascript
// line 180-196 (실측 commit 77603ee)
async function handleStart(args, infra, deps) {
  if (!args || !args.id || !args.name) {
    return { ok: false, error: 'start requires { id, name }' };
  }
  const lifecycleDeps = Object.assign({
    stateStore: infra.stateStore,
    eventEmitter: infra.eventEmitter.emit,
  }, deps.lifecycleDeps || {});
  return lifecycle.startSprint({
    id: args.id,
    name: args.name,
    trustLevel: args.trustLevel || 'L3',  // ← args.trustLevel 만 인식
    phase: args.phase,
    context: { ...defaultContext(), ...(args.context || {}) },
    features: Array.isArray(args.features) ? args.features : [],
  }, lifecycleDeps);
}
```

**문제 매트릭스**:

| User input form | 현재 handler 결과 | 의도된 결과 |
|-----------------|------------------|------------|
| `args.trustLevel='L3'` | ✓ L3 적용 | ✓ L3 적용 |
| `args.trust='L3'` (CLI `--trust L3` 자연 매핑) | ✗ 무시 (defaults to L3 우연 매치, 하지만 L0/L1/L2/L4 시 실패) | ✓ L3 적용 |
| `args.trustLevelAtStart='L3'` (start-sprint.usecase.js 내부 property 명) | ✗ 무시 | ✓ L3 적용 |
| (모두 부재) | ✓ L3 fallback (의도된) | ✓ L3 fallback |

**의미 분리 필요**:
- `trustLevel` (input alias, user 입력): `--trust L3` flag → args.trust → handleStart input
- `trustLevelAtStart` (stored property, createSprint 시점 capture): sprint entity 내부 property, user input 아님

**Fix 방향**: `normalizeTrustLevel(args)` helper 추가, 3 form 모두 단일 input key 로 변환.

### 1.3 P1 — `scripts/sprint-handler.js` CLI Entrypoint 부재 (Master Plan §4.3)

**현 상태** (`scripts/sprint-handler.js` 마지막 부분 실측 line 460-464):

```javascript
module.exports = {
  handleSprintAction,
  VALID_ACTIONS,
  getInfra,
};
```

- 파일 첫 줄: `/**` (JSDoc, shebang 없음)
- module.exports 만, main argv parser 없음
- `node scripts/sprint-handler.js start my-launch --trust L3` 같은 headless 실행 불가
- `/sprint <action>` 호출 시 LLM 이 handler 호출 → Task tool / Bash 사용 시 CLI 가 더 직접적

**Fix 방향**:

```javascript
#!/usr/bin/env node
// (기존 JSDoc 유지)
'use strict';
// ... existing code ...

if (require.main === module) {
  // CLI mode
  const argv = process.argv.slice(2);
  const action = argv[0];
  const args = parseFlags(argv.slice(1));  // 간이 parser: --key value 패턴
  handleSprintAction(action, args, {})
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    })
    .catch(err => {
      console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
      process.exit(2);
    });
}

module.exports = { handleSprintAction, VALID_ACTIONS, getInfra };
```

**Dual mode 보장**: require mode 동작 변경 0 (기존 module.exports 유지 + if (require.main === module) 가드).

### 1.4 P1 — `bkit:sprint` Skill Args 전달 (Master Plan §4.4)

**현 상태** (`skills/sprint/SKILL.md` body 실측):
- "Quick Start" 섹션은 user-facing CLI 예시 (`/sprint init my-launch --name "Q2 Launch" --trust L3`)
- "Arguments" 표는 sub-action 별 CLI form 만 (e.g., `/sprint start <id>`)
- LLM dispatcher 가 `args` 객체를 어떻게 구성해야 하는지 JSON schema 부재
- `/sprint start S1-UX Phase 1 PRD 진행해줘` (본 세션 실제 호출) 같은 자연어 → `args.id` 매핑 명시 없음

**본 세션의 실제 broken 사례** (★ 가장 강력한 motivation):
1. 사용자: `/sprint start S1-UX Phase 1 PRD 진행해줘. 누누히 말하지만 꼼꼼하고 완벽하게 작업해야지...`
2. CC LLM dispatcher: skill bkit:sprint 발견 → handler 호출 필요 → 그러나 args.id 가 무엇인지 명확하지 않음 (`S1-UX`? `S1-UX Phase 1 PRD`? `s1-ux`?)
3. 결과: handler 호출 안 됨, LLM 이 직접 작업 수행 (본 PRD 작성 같은 manual flow)
4. 본 PRD 작성 = 사실상 P1 §4.4 gap 의 부재 입증

**Fix 방향**: `skills/sprint/SKILL.md` body 에 신규 §10 "Skill Invocation Contract (LLM dispatcher 용)" 섹션 추가.

매트릭스 (각 sub-action 별):

```yaml
init:
  required: [id, name]
  optional: [trust, phase, context, features]
  example_call:
    user_text: "/sprint init my-launch --name 'Q2 Launch' --trust L3"
    args: { id: "my-launch", name: "Q2 Launch", trustLevel: "L3" }
  example_natural:
    user_text: "my-launch 라는 sprint 시작해줘"
    args: { id: "my-launch", name: "my-launch" }  # name fallback to id

start:
  required: [id, name]
  optional: [trust, phase, context, features]
  example_call:
    user_text: "/sprint start my-launch"
    args: { id: "my-launch", name: "<load from state>" }  # name 은 stateStore 에서 load
  example_resume:
    user_text: "/sprint start s1-ux"  # existing sprint resume (P0 fix 후)
    args: { id: "s1-ux", name: "<load>" }
    expected: resume with phase preserved
  example_ambiguous:
    user_text: "/sprint start S1-UX Phase 1 PRD 진행해줘"
    parse_rule: "extract kebab-case id from prefix → 's1-ux'"
    args: { id: "s1-ux", name: "S1-UX P0/P1 Quick Fixes" }
    note: "ambiguous natural language → LLM 이 id 후보 식별 후 AskUserQuestion 으로 확인"

# ... 13 more actions ...
```

### 1.5 사용자 명시 5 (꼼꼼함) 가 본 sub-sprint 에 적용되는 방식

[[feedback-thorough-complete]] 메모리 참조 — 매 phase 시작 시:
- ★ "빠르게 끝내려는 inclination 회피"
- ★ "모든 섹션 작성, 압축 X"
- ★ "추측 X (No Guessing invariant), 실제 코드 line 인용"
- ★ "11 pre-mortem 시나리오 모두 식별"
- ★ "JTBD 6+ stories"
- ★ "AC 6 criteria 상세화"

본 PRD 의 §1.1 ~ §1.4 가 이미 실제 코드 line 인용 + Master Plan 참조 + broken 시나리오 명시로 꼼꼼함 충족.

---

## 2. Job Stories (Pawel Huryn JTBD 6-Part Pattern, 8 stories)

### Job Story 1 — bkit 사용자 (existing sprint resume)
**When** 세션 clear 후 또는 다른 작업 후 `/sprint start <existing-id>` 를 호출할 때,
**I want to** existing sprint 의 phase 와 phaseHistory 가 그대로 보존되는 것을 보장받을 수 있게
**so I can** `/sprint phase` 로 advance 한 작업 손실 없이 이어서 작업할 수 있다.

### Job Story 2 — `/control` Trust Level 사용자 (CLI flag form 다양성)
**When** `/sprint start my-launch --trust L4` 또는 `--trustLevel L4` 또는 `--trustLevelAtStart L4` 어느 form 으로든 호출할 때,
**I want to** 3 form 모두 동일하게 인식되어 `SPRINT_AUTORUN_SCOPE.L4` (full-auto) 가 적용되게
**so I can** flag name 기억 부담 없이 의도된 Trust Level 진입.

### Job Story 3 — bkit core developer (headless debug)
**When** `scripts/sprint-handler.js` 의 dispatch 로직을 디버그하거나 CI 환경에서 isolated test 를 실행할 때,
**I want to** `node scripts/sprint-handler.js start my-launch --trust L3` 같은 CLI 직접 호출이 가능
**so I can** require mode (skill 통합) 와 CLI mode (debug/CI) 양쪽 동작 검증.

### Job Story 4 — CC LLM dispatcher (skill auto-invoke)
**When** 사용자가 `/sprint start S1-UX Phase 1 PRD 진행해줘` 같은 자연어 + slash command 혼합으로 호출할 때,
**I want to** SKILL.md body 의 §10 invocation contract 를 읽어 `args.id='s1-ux'` 로 매핑할 수 있게
**so I can** handler 를 자동 호출하여 사용자 작업 흐름 끊김 없이 sprint 진입.

### Job Story 5 — Sprint UX 개선의 후속 sub-sprint 작업자 (S2/S3/S4-UX)
**When** S2-UX (Master Plan Generator), S3-UX (Context Sizer), S4-UX (Integration) 진입 시점에,
**I want to** S1-UX 의 P0/P1 fix 가 모두 완료되어 `/sprint start s2-ux` 호출이 정상 resume 패턴으로 동작
**so I can** Master Plan generator 가 의존하는 sprint lifecycle 의 root 신뢰성을 보장받는다.

### Job Story 6 — bkit core CI (regression auditor)
**When** S1-UX commit 매 push 시 GitHub Actions CI 가 실행될 때,
**I want to** Sprint 1-4 226 TCs + L3 contract 8 TCs + claude plugin validate Exit 0 모두 PASS 검증
**so I can** P0 fix 의 Sprint 2 invariant §R8 정당화된 깨기가 functional regression 0 임을 자동 보장.

### Job Story 7 — bkit-system philosophy 7 invariants 보존자
**When** S1-UX 의 P0 fix 가 merge 직전인 시점에,
**I want to** Design First / No Guessing / Gap<5% / State Machine / Trust Score / Checkpoint / Audit Trail 7 invariants 모두 영향 매트릭스 검증
**so I can** "bug fix 라도 invariant 깨기 정당화는 명시적 매트릭스 필수" 원칙 준수.

### Job Story 8 — Sprint 6 release manager (v2.1.13 GA 진입자)
**When** S4-UX Report 완료 후 Sprint 6 진입 시점에,
**I want to** Master Plan §0.4 의 11 정량 목표 중 P0 bug fix + P1×3 fix 완료 4건이 모두 PASS 표시되는 readiness 보고서 받을 수 있게
**so I can** v2.1.13 GA tag/release 진행 시 6 gaps 중 5 (P0×1 + P1×4) 모두 closed 확인.

---

## 3. User Scenarios (현재 broken + 개선 후 흐름)

### 3.1 Scenario A — Existing Sprint Resume (P0 §4.1 fix 검증)

**현재 (broken)**:
1. `/sprint init my-launch --name "Q2 Launch" --trust L3`
   - 결과: `.bkit/state/sprints/my-launch.json` 생성, phase='prd'
2. `/sprint phase my-launch --to plan`
   - 결과: phase='plan' 저장
3. (세션 clear)
4. `/sprint start my-launch`
   - **현재 결과**: phase='prd' 로 reset (★ bug)
   - phaseHistory single entry (이전 prd→plan transition 손실)

**P0 fix 후 (개선)**:
1-3. 동일
4. `/sprint start my-launch`
   - **개선 결과**: phase='plan' 보존, phaseHistory 누적 유지
   - autoRun.scope 만 재계산 + startedAt 갱신
   - SprintResumed event emit (SprintCreated 대신)

### 3.2 Scenario B — `--trust` Flag 3 Form (P1 §4.2 fix 검증)

**현재 (broken)**:
1. `/sprint start my-launch --trust L4`
   - args.trust='L4' (CLI flag 자연 매핑)
   - handleStart 는 args.trustLevel 만 읽음 → 결과: 'L3' fallback (★ 사용자 의도 L4 무시)

**P1 fix 후 (개선)**:
1. `/sprint start my-launch --trust L4`
   - normalizeTrustLevel(args) → trustLevel='L4' (3 form 모두 인식)
   - 결과: SPRINT_AUTORUN_SCOPE.L4 적용 (★ 의도된 full-auto)

### 3.3 Scenario C — CLI Headless Debug (P1 §4.3 fix 검증)

**현재 (broken)**:
```bash
$ node scripts/sprint-handler.js status my-launch
# (output 0, module.exports 만 평가)
```

**P1 fix 후 (개선)**:
```bash
$ node scripts/sprint-handler.js status my-launch
{
  "ok": true,
  "sprint": { "id": "my-launch", "phase": "plan", ... }
}
```

### 3.4 Scenario D — LLM Auto-Dispatch (P1 §4.4 fix 검증) ★ 본 세션 사례

**현재 (broken)**:
1. 사용자: `/sprint start S1-UX Phase 1 PRD 진행해줘`
2. CC LLM dispatcher: skill bkit:sprint 발견 → args.id 후보 ambiguous → handler 호출 안 함
3. LLM 이 직접 manual 작업 수행 (★ skill 의 자동화 가치 미실현)

**P1 fix 후 (개선)**:
1. 사용자: `/sprint start S1-UX Phase 1 PRD 진행해줘`
2. CC LLM dispatcher: SKILL.md §10 §Invocation Contract 의 `example_ambiguous` rule 참조
3. → kebab-case id 추출: 's1-ux'
4. → AskUserQuestion: "S1-UX (s1-ux) sub-sprint 의 Phase 1 PRD 진입을 원하시나요?"
5. 사용자 확인 → handler 호출: `handleSprintAction('start', { id: 's1-ux', ... }, deps)`
6. P0 fix 적용 후이므로 existing sprint resume → phase='prd' 보존 + Phase 1 작업 진입

### 3.5 Scenario E — Sprint 1-5 Regression 보존 (P0 fix 의 invariant 검증)

**현재 (baseline)**:
- Sprint 1-4 226 TCs PASS (commit 77603ee 기준)
- L3 Contract SC-01~SC-08 8 TCs PASS

**P0 fix 후 (유지)**:
- 동일 226 TCs PASS (★ 0 regression)
- L3 Contract SC-05 (start sprint 4-layer chain) 강화 (resume scenario 추가는 S4-UX 의 SC-09 까지 대기 — 본 sub-sprint 에서는 ad-hoc 시나리오 검증만)

---

## 4. Functional Requirements (R1-R12)

### R1 — P0 Load-then-Resume 패턴 (§4.1)
- **R1.1**: `loadOrCreateSprint(input, stateStore, clock)` helper 신규 추가
- **R1.2**: existing sprint 발견 시 createSprint() skip, cloneSprint 으로 autoRun.scope + startedAt 만 갱신
- **R1.3**: existing sprint 의 phase, phaseHistory, kpi, qualityGates, featureMap 모두 보존
- **R1.4**: no existing sprint 시 기존 path (createSprint + 첫 phaseHistory entry) 유지
- **R1.5**: SprintResumed event emit (resume case) vs SprintCreated event emit (create case) 분기 — 단 SprintResumed 가 lib/domain/sprint/events.js 에 이미 존재하는지 확인 (Design phase)

### R2 — P1 Trust Flag Normalize (§4.2)
- **R2.1**: `normalizeTrustLevel(args)` helper in handleStart 내부 (또는 모듈 top-level)
- **R2.2**: 3 form 모두 인식: `args.trust` || `args.trustLevel` || `args.trustLevelAtStart` || 'L3' fallback
- **R2.3**: valid value 검증: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' 중 하나, invalid 시 'L3' fallback + warning
- **R2.4**: 동일 helper 를 handleInit 에도 적용 (consistency)

### R3 — P1 CLI Entrypoint (§4.3)
- **R3.1**: shebang `#!/usr/bin/env node` 파일 최상단
- **R3.2**: `if (require.main === module)` 가드로 CLI mode 격리
- **R3.3**: 간이 argv parser: positional[0] = action, flags `--key value` 패턴 (`--trust L3` → args.trust='L3')
- **R3.4**: 출력: JSON.stringify(result, null, 2) → stdout, exit code = result.ok ? 0 : 1
- **R3.5**: catch 블록: 에러도 JSON 직렬화, exit code 2
- **R3.6**: require mode 동작 변경 0 (module.exports 보존, side-effect 0)

### R4 — P1 Skill Invocation Contract (§4.4)
- **R4.1**: SKILL.md body 에 신규 §10 "Skill Invocation Contract (LLM dispatcher 용)" 섹션 추가
- **R4.2**: 15 sub-actions 별 매트릭스 (required / optional / example_call / example_natural / parse_rule)
- **R4.3**: 자연어 → args.id 매핑 rule 명시 (kebab-case extraction, AskUserQuestion fallback)
- **R4.4**: 본 PRD §3.4 의 broken 사례 예제로 포함 (역설적 motivation 강화)
- **R4.5**: frontmatter triggers field 변경 0 (8개국어 trigger 보존)
- **R4.6**: body 변경 후 yaml lint + skill validator + claude plugin validate Exit 0 매 변경 후

### R5 — Sprint 1-5 Invariant 보존
- **R5.1**: Sprint 1-4 226 TCs 매 변경 후 재실행, 0 regression
- **R5.2**: L3 Contract SC-01~SC-08 8 TCs 매 변경 후 재실행
- **R5.3**: enhancement zone 외 변경 0 (git diff --stat 매 commit 확인)
- **R5.4**: lib/domain/sprint/ 0 변경 (domain layer purity)
- **R5.5**: lib/infra/sprint/ 0 변경 (infrastructure unchanged)
- **R5.6**: P0 fix 의 Sprint 2 invariant §R8 정당화 매트릭스 명시 (commit message + design doc)

### R6 — bkit-system Philosophy 7 Invariants 보존
- **R6.1**: Design First — Design phase 완료 후 Do phase 진입 (pre-write.js 통과)
- **R6.2**: No Guessing — gap-detector matchRate ≥ 90% (실제 100% 목표)
- **R6.3**: Gap < 5% — matchRate 100% 도달
- **R6.4**: State Machine — PDCA 9-phase + sprint 8-phase 모두 보존
- **R6.5**: Trust Score — L0-L4 외 reject
- **R6.6**: Checkpoint — Iterate phase 매 cycle 후 audit-logger entry
- **R6.7**: Audit Trail — SprintCreated + SprintResumed (R1.5) 둘 다 NDJSON 기록

### R7 — hooks.json 21:24 Invariant
- **R7.1**: 신규 hook 추가 0
- **R7.2**: SessionStart / Stop / PreToolUse / PostToolUse 모두 변경 0

### R8 — Doc=Code 0 Drift
- **R8.1**: scripts/docs-code-sync.js 매 commit 후 0 drift
- **R8.2**: 본 PRD + Plan + Design + Report 4 docs 모두 docs/01-plan/features 또는 docs/02-design/features 또는 docs/04-report/features 에 위치

### R9 — F9-120 Closure 13-Cycle
- **R9.1**: `claude plugin validate .` Exit 0 매 변경 후
- **R9.2**: 누적 13-cycle (v2.1.120/121/123/129/132/133/137/139 + 본 sub-sprint 변경 후 추가) 보존

### R10 — 8개국어 Trigger 보존
- **R10.1**: skill frontmatter triggers field 변경 0
- **R10.2**: 영어 + 한국어 + 일본어 + 중국어 + 스페인어 + 프랑스어 + 독일어 + 이탈리아어 모두 그대로

### R11 — Master Plan §0.4 정량 목표 부분 달성
- **R11.1**: P0 bug fix 1건 완료
- **R11.2**: P1 gaps fix 3건 완료 (§4.2, §4.3, §4.4)
- **R11.3**: P1 §4.5 는 Sprint 5 V#3 에서 이미 closed (skip)
- **R11.4**: 나머지 정량 목표 (master-plan sub-action, context-sizer, SC-09/10) 는 S2/S3/S4-UX

### R12 — 본 PRD 의 꼼꼼함 자체 검증
- **R12.1**: §0-§9 모두 작성, 압축 0
- **R12.2**: §2 JTBD 6 stories 이상 (본 PRD 8 stories)
- **R12.3**: §6 AC 6 criteria 이상 (본 PRD 8 criteria, §6.1)
- **R12.4**: §11 pre-mortem 11 시나리오 이상 (본 PRD 12 시나리오, §11)
- **R12.5**: 실제 코드 line 인용 (§1.1 line 156-179, §1.2 line 180-196, §1.3 line 460-464)

---

## 5. Non-Functional Requirements

| Aspect | Target |
|--------|--------|
| Performance | 변경 0 (P0 fix 추가 1 stateStore.load 호출은 file system O(1), 무시 가능) |
| Security | stateStore.load 시 args.id 의 path traversal 검증은 Sprint 3 stateStore 책임 (변경 0) |
| Scalability | 본 sub-sprint scope 외 |
| Maintainability | helper function naming convention (`loadOrCreateSprint`, `normalizeTrustLevel`) — 명확한 의도 표현 |
| Testability | CLI mode 추가로 headless test 용이 (R3) |
| Cost | 본 sub-sprint ~25K tokens (단일 세션 안전) |
| Reliability | atomic stateStore.save 가 Sprint 3 보장 (변경 0) |

---

## 6. Acceptance Criteria

### 6.1 AC-P0-P1-Fixes (8 criteria, Master Plan §11.2 의 "AC-P0-P1-Fixes 6 criteria" 확장)

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-1 | `/sprint init my-launch` → `/sprint phase my-launch --to plan` → `/sprint start my-launch` 흐름에서 phase='plan' 보존 | Ad-hoc 시나리오 실행 (Do/Iterate phase) + state JSON 직접 검증 |
| AC-2 | No existing sprint → `/sprint start my-launch --name "New"` 시 기존 createSprint path 동일 동작 | 동일 시나리오 + sprint.phaseHistory single entry 확인 |
| AC-3 | `args.trust='L4'`, `args.trustLevel='L4'`, `args.trustLevelAtStart='L4'` 3 form 모두 SPRINT_AUTORUN_SCOPE.L4 적용 | normalizeTrustLevel unit-style 검증 (ad-hoc, S4-UX SC-09 까지 대기) |
| AC-4 | `node scripts/sprint-handler.js status my-launch` 가 JSON 출력 + exit 0 | bash 직접 실행 |
| AC-5 | `node scripts/sprint-handler.js unknown-action` 가 JSON 에러 출력 + exit 1 | bash 직접 실행 |
| AC-6 | SKILL.md body 에 §10 "Skill Invocation Contract" 신규 섹션 존재 + 15 sub-actions 모두 covered | grep `## .*Skill Invocation Contract` + visual inspection |
| AC-7 | claude plugin validate . Exit 0 매 commit 후 | `claude plugin validate .` 매 commit |
| AC-8 | Sprint 1-4 226 TCs 매 변경 후 0 regression | bkit-evals + manual run (qa-aggregate scope) |

### 6.2 AC-Invariants (10 criteria, Master Plan §11.2)

| # | Criterion | Verification |
|---|-----------|--------------|
| AC-INV-1 | Design First — pre-write.js 통과 | hook 자동 실행 |
| AC-INV-2 | No Guessing — gap-detector matchRate 100% | Iterate phase |
| AC-INV-3 | Gap < 5% — matchRate ≥ 95% (실제 100%) | Iterate phase |
| AC-INV-4 | State Machine — PDCA 9 + sprint 8 phase 보존 | grep + visual |
| AC-INV-5 | Trust Score — L0-L4 외 reject | normalizeTrustLevel validation |
| AC-INV-6 | Checkpoint — Iterate phase audit-logger entry | NDJSON tail |
| AC-INV-7 | Audit Trail — SprintCreated / SprintResumed event NDJSON | NDJSON tail |
| AC-INV-8 | Sprint 2 invariant §R8 — 정당화된 깨기 명시 | commit message + design doc |
| AC-INV-9 | hooks.json 21:24 보존 | `node -e "..."` count |
| AC-INV-10 | Doc=Code 0 drift | scripts/docs-code-sync.js |

---

## 7. Out-of-scope (S2/S3/S4-UX 또는 v2.1.14 또는 Sprint 6)

| 항목 | 별도 |
|------|------|
| `master-plan` sub-action 구현 | S2-UX |
| `context-sizer.js` | S3-UX |
| L3 Contract SC-09 (master-plan 4-layer) | S4-UX |
| L3 Contract SC-10 (context-sizing boundary) | S4-UX |
| `commands/bkit.md` master-plan 매트릭스 ext | S4-UX |
| `docs/06-guide/sprint-management.guide.md §9` 신규 | S4-UX |
| BKIT_VERSION 5-loc bump | Sprint 6 (v2.1.13 release) |
| CHANGELOG v2.1.13 | Sprint 6 |
| ADR 0007/0008/0009 Accepted | Sprint 6 |
| GitHub tag/release | Sprint 6 |
| gap-detector regex parser | ✅ Sprint 5 V#3 closed |
| MEMORY.md hook v2 강화 | v2.1.14 |
| Real backend wiring 확장 | v2.1.14 |
| `/pdca team` sprint 통합 | v2.1.14 |
| Concurrent invocation race condition handling | out-of-scope (single-user CC session 가정) |

---

## 8. Dependencies & Constraints

### 8.1 Immutable Dependencies
- Sprint 1 (Domain): `lib/domain/sprint/` (entity, validators, events) — 변경 0
- Sprint 2 (Application): `lib/application/sprint-lifecycle/` — start-sprint.usecase.js 만 변경 (P0 fix), 나머지 use cases 변경 0
- Sprint 3 (Infrastructure): `lib/infra/sprint/` — 변경 0
- Sprint 4 (Presentation): `skills/sprint/SKILL.md` body 만 변경, frontmatter 변경 0; `scripts/sprint-handler.js` enhancement zone 만 변경
- Sprint 5 (Quality + Docs): L3 Contract SC-01~SC-08 보존, V#1-V#4 verification 보존
- bkit-system philosophy: 7 invariants
- CC v2.1.123 ↔ v2.1.139 호환성 (사용자 환경)

### 8.2 Constraints
- Token budget ~25K (단일 세션 안전, 1H prompt cache 활용)
- enhancement zone 외 변경 0 (R5.3)
- 신규 hook 추가 0 (R7.1)
- 신규 npm package 추가 0
- frontmatter 변경 0 (R10.1)
- F9-120 13-cycle 보존 (R9.1)

---

## 9. Stakeholder Map

| Stakeholder | Role | 본 Sub-Sprint 영향 |
|------------|------|--------------------|
| kay kim | Decision maker | 본 PRD 승인 + Plan phase 진입 |
| Sprint 1-5 (immutable) | Foundation | invariant 보존 (단 §R8 정당화) |
| Sprint UX 후속 S2/S3/S4-UX | Downstream | S1-UX Report 완료 후 진입 |
| Sprint 6 release manager | Final stage | S4-UX 완료 후 v2.1.13 GA tag |
| CC LLM dispatcher | Skill auto-invoker | §4.4 SKILL.md §10 의 primary consumer |
| `/control` Trust Level 사용자 | CLI flag 다양성 | §4.2 의 primary beneficiary |
| bkit core developer | headless debug | §4.3 의 primary beneficiary |
| bkit 사용자 (existing sprint resume) | functional correctness | §4.1 의 primary beneficiary |
| bkit core CI | Regression auditor | Sprint 1-4 226 TCs 매 commit |
| bkit-system philosophy guardian | 7 invariants | §R6 매 phase |
| 8개국어 사용자 | Multi-lingual | frontmatter triggers 보존 (R10) |

---

## 10. Quality Gates (Phase 진입/종료 조건)

| Phase | Gate | Threshold |
|-------|------|-----------|
| PRD → Plan | 본 PRD 9 sections + 8 JTBD + 8 AC + 12 pre-mortem 완성 | M8 designCompleteness ≥ 85 (design-validator 는 Design phase 에서, PRD 는 manual 검증) |
| Plan → Design | Plan doc R1-R12 + AC 상세 + pre-mortem | M8 ≥ 85 |
| Design → Do | Design doc 4 files spec + Sprint 2 invariant justification | M8 ≥ 85 (design-validator agent) |
| Do → Iterate | 3 disk files 변경 완료 + Sprint 1-4 regression 0 | M1 (matchRate) ≥ 90 progress |
| Iterate → QA | matchRate 100% | M1 = 100 |
| QA → Report | All quality gates PASS | M1=100, M2≥80, M3=0, M4≥95, M7≥90, M8≥85, S1=100, S2=100 |
| Report → S2-UX entry | Report doc 완성 + S2-UX phase 1 (PRD) blockedBy 해소 | Task #13 unblock |

---

## 11. Pre-mortem (12 시나리오, Master Plan §12 의 15 중 본 sub-sprint relevant)

| # | 시나리오 | 방지 |
|---|---------|------|
| PM-A | P0 fix 가 Sprint 1-5 regression 깨뜨림 | Sprint 1-4 226 TCs 매 변경 후 재실행, R5.1 |
| PM-B | Load-then-resume 패턴의 race condition (concurrent invocation) | out-of-scope (single-user 가정) + Sprint 3 atomic write 검증 |
| PM-C | Trust flag 3 form normalize 의 의미 손실 (input alias vs stored property) | Design phase 에서 분리 명시 (R2.4) |
| PM-D | CLI shebang 추가 시 require cycle | `if (require.main === module)` 가드 (R3.2) |
| PM-E | SKILL.md body 변경 시 frontmatter 손상 | yaml lint + skill validator 매 변경 후 (R4.6) |
| PM-F | F9-120 closure 13-cycle 깨기 | `claude plugin validate .` 매 변경 후 (R9.1) |
| PM-G | hooks.json 21:24 깨기 (신규 hook 유혹) | R7.1 명시 |
| PM-H | enhancement zone 외 변경 (LOC 폭증 risk) | git diff --stat 매 commit (R5.3) |
| PM-I | 본 PRD 의 꼼꼼함 위배 ("빠르게 끝내려는 inclination") | [[feedback-thorough-complete]] 매 phase 시작 시 참조 |
| PM-J | Sprint 2 invariant §R8 위배 정당화 미명시 | commit message + design doc 매 commit (R5.6) |
| PM-K | SprintResumed event 가 lib/domain/sprint/events.js 에 부재 | Design phase 에서 사전 확인, 부재 시 추가 (Sprint 1 domain 변경 0 invariant 와 충돌 — 별도 Design 결정) |
| PM-L | 본 sub-sprint 가 ~25K token budget 초과 | Master Plan §12.O context-sizer baseline 의 예방적 적용, Plan phase 에서 token estimate 재계산 |

---

## 12. References

| Reference | Type | Note |
|-----------|------|------|
| `docs/01-plan/features/sprint-ux-improvement.master-plan.md` v1.0 | Parent Master Plan | commit 77603ee |
| `lib/application/sprint-lifecycle/start-sprint.usecase.js` | Code (P0 §4.1) | line 156-179 인용 |
| `scripts/sprint-handler.js` | Code (P1 §4.2, §4.3) | line 180-196 + 460-464 인용 |
| `skills/sprint/SKILL.md` | Code (P1 §4.4) | body 인용 |
| `docs/01-plan/features/v2113-sprint-1-domain.prd.md` | Pattern reference | PRD structure 일관성 |
| `docs/01-plan/features/v2113-sprint-5-quality-docs.prd.md` | Pattern reference | PRD 디테일 수준 일관성 |
| Memory `feedback_thorough_complete.md` | 사용자 명시 5 | 매 phase 시작 시 참조 |
| Memory `feedback_skills_vs_commands.md` | 사용자 명시 (commands/*.md 추가 금지) | S4-UX `commands/bkit.md` ext 만 허용 |
| Memory `project_sprint_ux_improvement.md` | 진행 상태 | S1-UX 진입 지점 |
| ADR 0007/0008/0009 | Architecture | Sprint as Meta Container + Sprint Phase Enum + Auto-Run + Trust Scope |
| Sprint Management Master Plan §11.2 SPRINT_AUTORUN_SCOPE | L0-L4 spec | trustLevel 의 의미 분리 근거 |
| Task #6 (Task Management System) | Phase Task | 본 PRD = Phase 1 of 7 |

---

## 13. Final PRD Checklist (꼼꼼함 자체 검증)

매 row 가 사용자 명시 1-5 또는 R12 와 연결:

- [x] §0 Context Anchor — WHY/WHO/RISK/SUCCESS/SCOPE 5-key 완전 작성 (사용자 명시 5)
- [x] §1 Problem Statement — 4 P0/P1 gaps 실제 코드 line 인용 (R12.5)
- [x] §2 JTBD 8 stories (R12.2, 6 이상)
- [x] §3 User Scenarios — broken + improved 5 시나리오 (S1-UX P0/P1/P1/P1 모두 + regression)
- [x] §4 Functional Requirements R1-R12 (R12.1)
- [x] §5 Non-Functional Requirements 7 aspects
- [x] §6 Acceptance Criteria — AC-P0-P1-Fixes 8 + AC-Invariants 10 (R12.3)
- [x] §7 Out-of-scope — 15 items 명시
- [x] §8 Dependencies & Constraints 분리
- [x] §9 Stakeholder Map — 11 stakeholders
- [x] §10 Quality Gates — 7 phase transitions
- [x] §11 Pre-mortem 12 시나리오 (R12.4, 11 이상)
- [x] §12 References — 12 items
- [x] §13 본 checklist 자체 (꼼꼼함 §16 mirror)

---

**PRD Status**: ★ **Draft v1.0 완성 (꼼꼼함 §16 13/13 checklist PASS)**
**Next Phase**: Plan (Task #7) — R1-R12 + AC 8 + pre-mortem 12 상세화 + Sprint 2 invariant §R8 정당화 매트릭스 commit-ready 포맷
**예상 Phase 2 (Plan) 소요**: 30분 (Master Plan §10)
**사용자 명시 1-5 보존 확인**: 5/5 (§ Header preamble 의 5 row 모두 ✓)
