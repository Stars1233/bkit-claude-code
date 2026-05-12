# PRD: bkit v2.1.12 — Evals Wrapper Hotfix

> **요약**: `lib/evals/runner-wrapper.js`의 argv 불일치로 인해 `/bkit-evals run <skill>`이
> 항상 Usage 배너만 출력하면서도 `ok: true`를 반환하는 결정적 결함을 패치한다.
>
> **작성자**: PM Agent
> **작성일**: 2026-04-28
> **상태**: Draft — CTO 검토 대기
> **버전**: v2.1.12 hotfix

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | `runner-wrapper.js:93`이 `spawnSync('node', [runnerPath, skill])`로 positional arg를 전달하지만, `runner.js` CLI는 `--skill <name>` 플래그만 파싱한다. 결과적으로 모든 `/bkit-evals run <skill>` 호출이 Usage 배너만 출력하고 exit code 0을 반환하며, wrapper는 이를 PASS로 오판(`ok: true`)한다. |
| **Solution** | argv를 `['--skill', skill]`로 교정하고, `parsed === null` 및 `stdout.startsWith('Usage:')` 두 가지 false-positive 방어 검사를 추가한다. 변경 범위는 `runner-wrapper.js` 단일 파일, 20줄 미만의 수술적 패치다. |
| **UX impact** | Daniel(동적 파운더)과 Yuki(엔터프라이즈 거버넌스) 모두 `/bkit-evals run <skill>` 명령이 v2.1.11 배포 이후 단 한 번도 정상 동작한 적 없었다. 패치 후 즉시 실제 평가 결과(pass/fail JSON)를 확인할 수 있다. |
| **Core Value** | "Automation First, No Guessing" 철학에 정면 위배된 결함이다. eval이 통과했다는 표시가 사실은 아무것도 실행되지 않은 상태였다. 패치는 신뢰 기반 자동화의 무결성을 회복한다. |

---

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | v2.1.11 Sprint β FR-β2에서 신규 도입된 bkit-evals 스킬의 핵심 경로(runner-wrapper → runner.js)에 argv 불일치 결함이 존재. 실 사용자 세션(2026-04-28)에서 발견. |
| **WHO** | Daniel(동적 파운더, 첫 스킬 검증), Yuki(엔터프라이즈 거버넌스, eval을 품질 게이트로 활용) |
| **RISK** | wrapper 수정이 기존 30개 eval 카탈로그 호출 사이트에 회귀를 일으킬 가능성 → Contract Test로 방지 |
| **SUCCESS** | false-positive `ok: true` 0건, L1+L2+L3 신규 TC 전체 PASS, gap-detector 100% |
| **SCOPE** | `lib/evals/runner-wrapper.js` 교정 + 방어 검사 추가. `runner.js` CLI 로직 무수정. |

---

## 1. 결함 기술 (Defect Description)

### 1.1 근본 원인

`runner.js` CLI 진입점(line 406~437)은 다음 패턴으로 플래그를 파싱한다:

```javascript
// evals/runner.js:409-414
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    flags[args[i].slice(2)] = args[i + 1] || true;
    i++;
  }
}
```

따라서 `node runner.js --skill gap-detector`는 `flags.skill = 'gap-detector'`를 생성하지만,
`node runner.js gap-detector`(positional)는 `flags.skill`을 생성하지 않는다.

`runner-wrapper.js:93`이 전달하는 argv:

```javascript
// lib/evals/runner-wrapper.js:93 — 결함 있는 현재 코드
result = spawnSync('node', [runnerPath, skill], { ... });
//                          ^^^^^^^^  ^^^^^
//                          runner.js gap-detector  ← positional, 인식 불가
```

결과: `flags.skill === undefined` → `else` 분기 → `console.log('Usage: ...')` → `process.exit(0)` 없이 정상 종료 → exit code 0.

### 1.2 Secondary 결함: false-positive 방어 부재

wrapper의 ok 판정 로직(line 140):

```javascript
// lib/evals/runner-wrapper.js:140 — false-positive 발생 지점
return {
  ok: result.status === 0,   // exit 0이면 PASS — Usage 배너도 0
  ...
};
```

추가로:
- `parsed === null`일 때 ok를 `false`로 교정하지 않는다.
- `stdout.startsWith('Usage:')` 체크가 없다.

### 1.3 결함 발생 경로 (Full Call Stack)

```
사용자: /bkit-evals run gap-detector
  └─ bkit-evals SKILL.md → invokeEvals('gap-detector')
       └─ runner-wrapper.js:93
            spawnSync('node', ['evals/runner.js', 'gap-detector'])
                                                   ^^^^^^^^^^^^^^^
                                                   positional → 무시됨
            └─ runner.js else 분기 → "Usage: ..." 출력 → exit 0
       └─ runner-wrapper.js:140
            ok: (0 === 0) = true   ← 결정적 오판
```

---

## 2. JTBD-6 분석

**핵심 잡(Job)**: "스킬을 신뢰하기 전에 품질을 검증한다"

| JTBD 구성 | 내용 |
|-----------|------|
| **Job Statement** | 나는 신규 스킬(또는 업데이트된 스킬)을 프로덕션 워크플로우에 투입하기 전에, 평가 기준을 통과하는지 확인하고 싶다 |
| **Functional Job** | eval suite를 실행하고 pass/fail + 점수를 얻는다 |
| **Emotional Job** | "내가 믿는 도구가 실제로 동작한다"는 확신을 갖는다 |
| **Social Job** | 팀에게 "이 스킬은 검증됨"이라고 객관적 근거를 제시한다 |
| **Pain Points** | (현재) 실행했더니 Usage 배너만 보임 — 뭔가 잘못됐는지 코드를 뜯어봐야 알 수 있다 |
| **Gain Creators** | (패치 후) 한 줄 명령으로 즉시 pass/fail JSON + 결과 파일 경로를 확인한다 |
| **Success Criteria** | exit code + parsed JSON에 `pass: true/false` 존재, 결과 파일이 `.bkit/runtime/`에 기록됨 |

---

## 3. 페르소나 및 영향 분석

### 3.1 Daniel — 동적 파운더 (첫 스킬 검증)

| 항목 | 내용 |
|------|------|
| **역할** | 소규모 팀을 이끄는 테크 파운더. `/bkit-evals run` 명령을 써서 신규 스킬이 자신의 프로젝트에 적합한지 빠르게 확인한다. |
| **현재 경험** | `/bkit-evals run gap-detector` 실행 → 아무 결과 없이 "실행 완료"처럼 보임 → 실제로는 Usage 배너가 출력되었으나 ok: true로 표시됨 → 잘못된 신뢰 형성 |
| **패치 후** | 실행 즉시 `{ pass: true, score: 1.0, matchedCriteria: [...] }` JSON 확인, `.bkit/runtime/` 결과 파일 경로 제공 |
| **중요도** | Critical — 핵심 사용 시나리오가 완전 불동작 |

### 3.2 Yuki — 엔터프라이즈 거버넌스 (품질 게이트)

| 항목 | 내용 |
|------|------|
| **역할** | 엔터프라이즈 조직의 플랫폼 엔지니어. eval 결과를 CI/CD 파이프라인의 품질 게이트로 활용하며, `ok: false` 발생 시 배포를 차단하도록 설계한다. |
| **현재 경험** | 모든 eval이 ok: true를 반환하므로 품질 게이트가 항상 통과됨 → 게이트 자체가 무의미한 상태 → 실제 결함 있는 스킬이 배포될 위험 |
| **패치 후** | false-positive 제거, 실제 eval 결과(pass/fail)에 기반한 신뢰할 수 있는 게이트 운용 |
| **중요도** | Critical — 거버넌스 신뢰성 전체를 훼손 |

---

## 4. Surface Map — 영향 파일 목록

| 파일 | 역할 | 변경 유형 | 우선순위 |
|------|------|-----------|----------|
| `lib/evals/runner-wrapper.js` | wrapper의 spawnSync argv + false-positive 방어 | **수정 필수** (Must) | P0 |
| `evals/runner.js` | CLI 진입점 — `--skill` 플래그 파싱 | 무수정 (현재 설계가 올바름) | — |
| `skills/bkit-evals/SKILL.md` | `run <skill>` 동작 설명 | 주석 보강 권장 (Should) | P1 |
| `tests/unit/evals/runner-wrapper.test.js` | L1 단위 테스트 | **신규 작성 필수** (Must) | P0 |
| `tests/integration/evals/` | L2 통합 테스트 (subprocess 실행) | **신규 작성 필수** (Must) | P0 |
| `tests/contract/evals-wrapper-contract.test.js` | L3 Contract Test (30-eval 카탈로그 회귀 방지) | **신규 작성 필수** (Must) | P0 |
| `docs/00-pm/bkit-v2112-evals-wrapper-hotfix.prd.md` | 본 PRD | 신규 | — |
| `docs/01-plan/features/bkit-v2112-evals-wrapper-hotfix.plan.md` | Plan 문서 | 신규 작성 (Must) | P0 |
| `CHANGELOG.md` | v2.1.12 패치 노트 | **수정 필수** (Must) | P0 |
| `bkit.config.json` | 버전 번호 2.1.11 → 2.1.12 | **수정 필수** (Must) | P0 |

---

## 5. Beachhead 세그먼트

**타겟**: v2.1.11 기존 사용자 전체 (drop-in patch, 추가 설치 단계 없음)

| 항목 | 내용 |
|------|------|
| **세그먼트** | v2.1.11 배포 후 `/bkit-evals run <skill>`을 시도한 모든 사용자 |
| **크기** | v2.1.11 설치 사용자 전원 (eval 기능 첫 배포이므로 v2.1.11 = 전체 eval 사용자) |
| **업그레이드 경로** | `/plugin update` 또는 `claude plugin update .` — 코드 변경 없음, 재설치 없음 |
| **하위 호환성** | `invokeEvals()` API 시그니처 변경 없음. `ok` 값의 의미가 교정되므로 caller 동작이 개선됨 (Breaking 아님, 버그 수정) |
| **환경 요구사항** | 기존 v2.1.11 환경 그대로 (Node.js 버전, CC 버전 무변경) |

---

## 6. GTM 전략

**방침**: Silent Hotfix — 마케팅 없음, CHANGELOG 패치 노트만

| 항목 | 결정 |
|------|------|
| **릴리스 채널** | 기존 채널 동일 (`claude plugin update`) |
| **공지** | 없음 — CHANGELOG v2.1.12 섹션에 버그 수정 항목만 기재 |
| **릴리스 노트 톤** | 기술 사실 중심: "Fixed: `/bkit-evals run <skill>` always returned usage banner instead of running the eval (argv mismatch in runner-wrapper.js)" |
| **Release Tag** | `v2.1.12` GitHub tag 생성 (v2.1.10 미생성 선례 반복하지 않음) |
| **릴리스 타이밍** | Sprint β 진행 중 — hotfix를 별도 PR로 먼저 main 병합, Sprint β는 v2.1.12 기반으로 계속 |
| **사용자 커뮤니케이션** | /bkit-evals list 실행 시 "v2.1.12 패치 적용됨" 배너 1회 표시 (optional, Could) |

---

## 7. 성공 지표 (Success Metrics)

| 지표 | 목표값 | 측정 방법 |
|------|--------|-----------|
| gap-detector 매치율 | **100%** | `/pdca analyze bkit-v2112-evals-wrapper-hotfix` |
| CI validators (7개) | **0 FAIL** | `npm test` + CI 7-step 전체 PASS |
| L1 단위 테스트 | **전체 PASS** | `tests/unit/evals/runner-wrapper.test.js` |
| L2 통합 테스트 | **전체 PASS** | `tests/integration/evals/` subprocess 실행 검증 |
| L3 Contract Test | **전체 PASS** | 30-eval 카탈로그 회귀 없음 확인 |
| false-positive rate (`ok: true` + Usage 배너) | **0건** | L1 TC: Usage 배너 stdout 시 `ok: false` 반환 검증 |
| `parsed === null` 시 ok 판정 | **ok: false** | L1 TC: parsed null 케이스 명시적 테스트 |
| 기존 TC 회귀 | **0건** | 전체 3,762 TC 기반 PASS 유지 |

---

## 8. 리스크 및 완화

### 8.1 리스크 매트릭스

| 리스크 | 확률 | 영향 | 완화 방안 |
|--------|------|------|-----------|
| **argv 교정이 30-eval 카탈로그 기존 호출 사이트에 회귀 유발** | 중 | 높음 | Contract Test: 30개 스킬 전체에 대해 wrapper가 `--skill <name>` argv를 생성하는지 검증. 실제 runner.js 실행 없이 argv 검증만으로도 충분 |
| **`parsed === null` 방어 로직이 정상 결과를 `ok: false`로 오분류** | 낮음 | 중 | runner.js가 JSON을 출력하지 않는 경우는 Usage 배너 또는 오류뿐임을 문서화. 정상 경로에서 parsed는 항상 non-null |
| **`stdout.startsWith('Usage:')` 검사가 지역화된 Usage 메시지 변형을 놓침** | 낮음 | 낮음 | `stdout.includes('Usage:')` 로 교체하거나 exit code + parsed null 조합으로 충분. Usage 배너 텍스트 하드코딩 의존도 최소화 |
| **v2.1.12 hotfix PR이 Sprint β 브랜치와 충돌** | 낮음 | 중 | hotfix를 main 직접 패치 후 Sprint β 브랜치 rebase. 변경 파일 1개(`runner-wrapper.js`)이므로 충돌 가능성 낮음 |

### 8.2 Contract Test 설계 (핵심 완화 수단)

Contract: "invokeEvals(skill)이 spawnSync에 전달하는 argv는 반드시 `['--skill', skill]` 형태여야 한다"

```javascript
// tests/contract/evals-wrapper-contract.test.js (개요)
// spawnSync를 jest.mock으로 교체하여 argv 배열을 캡처
// 30개 스킬에 대해 invokeEvals() 호출 후 argv[2] === '--skill', argv[3] === skillName 검증
```

---

## 9. Pre-Mortem — 3가지 실패 시나리오

### 시나리오 A: argv 교정 후에도 Usage 배너가 출력되는 경우

**원인**: `runner.js`가 `--skill` 플래그 파싱 시 다음 인자(`args[i+1]`)를 건너뛰지 않아 스킬 이름을 누락하는 경우, 또는 runner.js 자체가 다른 오류로 인해 조기 종료하는 경우.

**탐지 방법**: L2 통합 테스트에서 실제 subprocess를 실행하고 stdout에 `{` 포함 여부 + `pass` 필드 존재 여부를 검증.

**대응**: `runner.js` CLI 파싱 로직(line 409-414)을 함께 재검토. `i++` 중복 실행 여부 확인.

### 시나리오 B: false-positive 방어 로직이 정상 eval 결과를 차단하는 경우

**원인**: `stdout.startsWith('Usage:')` 검사가 runner.js의 JSON 출력 앞에 의도치 않은 로그가 붙는 경우 오동작. 또는 `parsed === null` 조건이 일부 스킬의 정상 동작(JSON 미출력 스킬)을 false로 처리.

**탐지 방법**: L1 단위 테스트에서 정상 JSON 출력 케이스에 대해 `ok: true` 반환을 명시적으로 검증. 30-eval 카탈로그 전체에 대해 Contract Test 실행.

**대응**: `stdout.startsWith('Usage:')` 대신 `parsed === null && stdout.trim().startsWith('Usage')` 복합 조건으로 교체.

### 시나리오 C: hotfix PR이 병합되었으나 CC plugin 캐시로 인해 사용자에게 반영 안 되는 경우

**원인**: CC plugin 캐시가 구 버전 runner-wrapper.js를 로딩. 특히 `lib/` 모듈은 세션 시작 시 로드되어 캐시됨.

**탐지 방법**: `bkit.config.json` 버전 번호를 2.1.12로 변경했는지 확인. `/bkit version` 출력으로 배포 버전 확인.

**대응**: CHANGELOG + version bump를 hotfix PR에 포함시켜 버전 변경이 캐시 무효화를 트리거하도록 보장. 사용자에게 CC 세션 재시작 안내.

---

## 10. QA 팀 테스트 시나리오

### TC-01: 정상 실행 — 유효 스킬 (L1)

| 항목 | 내용 |
|------|------|
| **입력** | `invokeEvals('gap-detector')` |
| **전제조건** | `evals/capability/gap-detector/eval.yaml` 존재 |
| **기대 결과** | `{ ok: true/false(평가결과 따라), parsed: {pass: boolean, ...}, stdout: 'JSON...' }` |
| **검증 포인트** | `stdout`에 `Usage:` 없음, `parsed !== null`, `parsed.pass` 필드 존재 |

### TC-02: false-positive 방지 — Usage 배너 감지 (L1)

| 항목 | 내용 |
|------|------|
| **입력** | `invokeEvals`를 모킹된 runner(항상 Usage 배너 출력)와 함께 호출 |
| **기대 결과** | `{ ok: false, reason: 'usage_banner_detected' }` 또는 `ok: false` |
| **검증 포인트** | `ok: true` 절대 반환 안 됨 |

### TC-03: parsed null 방어 (L1)

| 항목 | 내용 |
|------|------|
| **입력** | runner가 JSON 없는 순수 텍스트만 출력하고 exit 0 |
| **기대 결과** | `{ ok: false, parsed: null }` |
| **검증 포인트** | exit code 0이어도 parsed null이면 ok: false |

### TC-04: 무효 스킬명 — 특수문자 포함 (L1)

| 항목 | 내용 |
|------|------|
| **입력** | `invokeEvals('../etc/passwd')` |
| **기대 결과** | `{ ok: false, reason: 'invalid_skill_name' }` |
| **검증 포인트** | spawnSync 미호출, runner.js 미실행 |

### TC-05: argv 형식 검증 (L3 Contract)

| 항목 | 내용 |
|------|------|
| **입력** | 30개 스킬 전체에 대해 `invokeEvals(skill)` 호출 (spawnSync mock) |
| **기대 결과** | 각 호출의 argv: `['--skill', skillName]` |
| **검증 포인트** | positional arg 형식(`[runnerPath, skill]`) 완전 제거 확인 |

### TC-06: timeout 정상 처리 (L1)

| 항목 | 내용 |
|------|------|
| **입력** | `invokeEvals('gap-detector', { timeoutMs: 1 })` (1ms로 강제 timeout) |
| **기대 결과** | `{ ok: false, reason: 'timeout' }` |
| **검증 포인트** | ETIMEDOUT 에러 정상 처리 |

### TC-07: 실제 subprocess 실행 — 통합 (L2)

| 항목 | 내용 |
|------|------|
| **입력** | 실제 node 프로세스로 `invokeEvals('gap-detector')` 실행 |
| **기대 결과** | stdout에 JSON `{pass: ..., details: {...}}` 포함 |
| **검증 포인트** | `parsed.details.skill === 'gap-detector'`, `resultFile`이 `.bkit/runtime/`에 생성됨 |

### TC-08: `/bkit-evals run` 전체 스킬 카탈로그 회귀 (L3)

| 항목 | 내용 |
|------|------|
| **입력** | config.json의 30개 스킬 전체에 대해 `invokeEvals()` 실행 |
| **기대 결과** | 어떤 스킬도 Usage 배너를 반환하지 않음 |
| **검증 포인트** | `stdout.includes('Usage:')` 0건, `parsed !== null` 전체 |

---

## 11. 이해관계자 맵

| 이해관계자 | 역할 | 관심사 | 영향도 |
|-----------|------|--------|--------|
| **Kay (CTO/개발자)** | 패치 구현 + PR 리뷰 | 회귀 없음, CI 통과, 브랜치 전략 | 높음 |
| **Daniel (동적 파운더)** | 기능 사용자 | `/bkit-evals run` 즉시 동작 | 높음 |
| **Yuki (엔터프라이즈)** | 품질 게이트 운용자 | eval 결과 신뢰성, false-positive 제거 | 높음 |
| **pm-lead Agent** | PRD 작성 | 요구사항 명확화 | 중간 |
| **qa-lead Agent** | 테스트 실행 | TC 커버리지, 회귀 방지 | 높음 |
| **gap-detector Agent** | 구현 검증 | match rate 100% | 중간 |

---

## 12. 범위 및 제외 항목

### 포함 (Must)
- `runner-wrapper.js` argv 교정: `[runnerPath, skill]` → `['--skill', skill]`
- false-positive 방어: `parsed === null` 처리 + Usage 배너 감지
- L1 + L2 + L3 테스트 신규 작성
- `bkit.config.json` 버전 2.1.12 bump
- `CHANGELOG.md` v2.1.12 섹션

### 포함 (Should)
- `skills/bkit-evals/SKILL.md` 동작 설명 정확도 검토 (현재 설명이 실제 동작과 일치하도록)
- result file의 `timedOut` 필드 보강

### 제외 (Won't — 이번 hotfix 범위 아님)
- `runner.js` CLI 인터페이스 변경 (현재 설계가 올바름)
- eval YAML 콘텐츠 개선 (별도 Sprint β 작업)
- bkit-evals `list` 명령 개선
- 30개 eval 결과 개별 검토

---

## 13. 타임라인

| 단계 | 예상 시간 | 산출물 |
|------|-----------|--------|
| Plan 문서 작성 | 30분 | `docs/01-plan/features/bkit-v2112-evals-wrapper-hotfix.plan.md` |
| Design 문서 작성 | 30분 | `docs/02-design/features/bkit-v2112-evals-wrapper-hotfix.design.md` |
| 패치 구현 | 30분 | `runner-wrapper.js` 교정 (~15줄) |
| 테스트 작성 + 실행 | 60분 | L1+L2+L3 TC PASS |
| CHANGELOG + version bump | 15분 | `bkit.config.json`, `CHANGELOG.md` |
| PR 생성 + 병합 | 15분 | hotfix PR → main |
| **전체** | **~3시간** | v2.1.12 릴리스 |

---

## Version History

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-28 | 초안 작성 (PM Agent) |

---

PRD complete — proceed to /pdca plan
