---
feature: bkit-v2111-integrated-enhancement
sprint: β (Beta)
theme: Discoverability Layer
phase: 02-design
type: sprint-detail
status: Draft — Checkpoint 3 승인 (Option C Pragmatic)
architecture: Option C (Pragmatic Balance)
fr-count: 6
created: 2026-04-23
author: kay kim
parent: docs/02-design/features/bkit-v2111-integrated-enhancement.design.md
---

# Sprint β — Discoverability Layer (Design)

> **Summary**: 설치된 39 skills · 36 agents · evals 시스템을 **사용자가 발견·활용** 할 수 있게 한다. `/bkit explore` 카테고리 브라우저, `/bkit evals run` slash wrapper, 에러 메시지 Output Style 친화 번역 (8 언어), `/pdca watch` live dashboard, `/pdca fast-track` Daniel 전용 Checkpoint 스킵, 언어 자동 감지 총 6 FR 을 Option C Pragmatic 으로 구현한다.
>
> **Goal**: Daniel NPS +9 → +10, 발견성 +50%, Skill Evals 사용률 3배
> **Parent Design**: [bkit-v2111-integrated-enhancement.design.md](./bkit-v2111-integrated-enhancement.design.md)

---

## Context Anchor

| Key | Value |
|-----|-------|
| **WHY** | 39 skills × 36 agents 조합 폭발 → Daniel 조차 `/claude-code-learning` 같은 entry point 를 모르고 지나감. 혁신 기능(Skill Evals) 이 `node evals/runner.js` raw 노출로 사용률 낮음 |
| **WHO** | Primary: Daniel (Fast Track, watch dashboard). Secondary: Yuki (explore, evals). 8-language users (에러 번역, 언어 감지) |
| **RISK** | (a) `/pdca watch` live UI 가 CC v2.1.71+ `/loop` 렌더링 한계 / (b) 에러 번역 사전이 8 언어 품질 격차 / (c) `/pdca fast-track` 의 L3 자동 진입이 Trust Score 기준 오판 |
| **SUCCESS** | 6 FR × Match Rate ≥ 90%, Skill Evals 호출 3배, Daniel Alpha 50명 중 fast-track 사용자 ≥ 60%, 에러 번역 KO/EN 품질 ≥ 0.9 (manual review) |
| **SCOPE** | IN: 4 slash commands + 에러 번역 + 언어 감지. OUT: First-run(α3), One-Liner(α2), Application Layer pilot(γ2) |

---

## 1. Overview

### 1.1 Design Goals

- **4 slash commands on single pattern** — v2.1.10 관례 (skills/{category}/{name}/SKILL.md + lib) 통일
- **γ pilot 과 완전 분리** — `lib/pdca/fast-track.js` 는 `lib/pdca/lifecycle.js` 기존 경로 사용, γ2 `lib/application/pdca-lifecycle/` 이관과 충돌 없음 (RD-1 mitigation)
- **에러 번역 JSON 사전** — `assets/error-dict.{lang}.json` 8 파일, Output Style × error category 2D 매트릭스
- **Daniel Fast Track 안전 가드** — Trust Score < 80 이면 Checkpoint 스킵 불가, fail-open fallback

### 1.2 Design Principles

1. **Skill-First over Agent-First** — 4개 모두 Skill (Slash Invoke Pattern CC 2.1.0+). Agent 호출은 내부 구현
2. **JSON Dictionary over Hard-coded** — 에러 번역은 JSON 외부 파일, 코드 변경 없이 사전 확장 가능
3. **Live Dashboard via /loop** — 별도 WebSocket 없이 CC native `/loop {interval} /pdca status` 활용
4. **Fast Track Opt-In** — 기본값 false. 명시적 `/pdca fast-track` 호출 또는 Trust Score ≥ 80 자동 제안

---

## 2. Architecture

### 2.0 Selected: Option C Pragmatic

| Aspect | 결정 |
|--------|-----|
| Slash Command 수 | 4 (explore / evals-run / watch / fast-track) |
| 에러 번역 구조 | 1 translator + 8 JSON dict |
| 언어 감지 | session-start.js 확장 + `lib/i18n/detector.js` |
| γ pilot 분리 | fast-track.js 가 lifecycle.js 경로 의존, Application Layer pilot 밖 |

### 2.1 Component Diagram

```
┌──────────────────────────── Skills (Presentation) ──────────────────────────┐
│  skills/bkit/explore/SKILL.md        ─┐                                    │
│  skills/bkit/evals-run/SKILL.md      ─┼─▶ lazy require lib/*              │
│  skills/pdca/SKILL.md (actions +)    ─┤   (watch, fast-track,             │
│                                       │    token-report — δ4 공유)         │
│  hooks/error-handler.js              ─┘                                    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                ▼
┌──────────────────── Application + Infrastructure ───────────────────────────┐
│                                                                             │
│  lib/discovery/explorer.js          (β1) ─▶ skills/ agents/ evals/ 스캔   │
│  lib/evals/runner-wrapper.js        (β2) ─▶ evals/runner.js 호출          │
│  lib/ui/error-translator.js         (β3) ─▶ assets/error-dict.*.json      │
│  lib/ui/live-dashboard.js           (β4) ─▶ .bkit/state/ tail + /loop     │
│  lib/pdca/fast-track.js             (β5) ─▶ lib/pdca/full-auto-do.js      │
│  lib/i18n/detector.js               (β6) ─▶ ~/.claude/settings.json       │
│                                                                             │
│  assets/error-dict.{ko,en,ja,zh,es,fr,de,it}.json  (β3)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Slash Command Interface

| Command | Skill Path | 주요 Action |
|---------|-----------|------|
| `/bkit explore` | `skills/bkit/explore/SKILL.md` | Starter/Dynamic/Enterprise × category × 난이도 필터링 |
| `/bkit evals run [skill]` | `skills/bkit/evals-run/SKILL.md` | `node evals/runner.js {skill}` 래핑 + 요약 표 출력 |
| `/pdca watch {feature}` | `skills/pdca/SKILL.md` (action=watch) | `/loop 30s /pdca status` live tail |
| `/pdca fast-track {feature}` | `skills/pdca/SKILL.md` (action=fast-track) | Checkpoint 1~8 스킵 + L3 자동 진입 (Trust Score ≥ 80 가드) |
| `/pdca token-report` | `skills/pdca/SKILL.md` (action=token-report) | δ4 — 이 Sprint 에서 skill action 슬롯만 reserve |

---

## 3. Data Model

### 3.1 Error Dictionary Schema (β3)

`assets/error-dict.ko.json` 예시:

```json
{
  "version": "2.1.11",
  "language": "ko",
  "categories": {
    "OWASP_A03_INJECTION": {
      "technical": "OWASP A03: Injection detected",
      "styles": {
        "bkit-learning": "입력값 검증이 필요합니다. 사용자 입력을 코드에 직접 넣으면 위험해요. SQL injection 방어 예시를 볼까요?",
        "bkit-pdca-guide": "⚠️ A03 위반 — `/pdca iterate` 로 자동 수정하거나 Design §7 Security 섹션 참조",
        "bkit-enterprise": "[CRIT] OWASP A03 — sanitizer 누락. lib/core/audit-logger.js Layer 3 참조",
        "bkit-pdca-enterprise": "🔒 A03 Injection — Sanitizer 필요. Defense-in-Depth Layer 3 재검토"
      }
    },
    "OWASP_A08_SOFTWARE_INTEGRITY": { /* ... */ },
    "ZOD_VALIDATION_FAILED": { /* ... */ },
    "RATE_LIMIT_EXCEEDED": { /* ... */ },
    "AUTH_REQUIRED": { /* ... */ },
    "FILE_NOT_FOUND": { /* ... */ },
    "PERMISSION_DENIED": { /* ... */ },
    "NETWORK_TIMEOUT": { /* ... */ },
    "PARSE_ERROR": { /* ... */ },
    "MCP_TOOL_CALL_FAILED": { /* ... */ },
    "CC_VERSION_MISMATCH": { /* ... */ },
    "TRUST_SCORE_TOO_LOW": { /* ... */ },
    "HOOK_BLOCKED": { /* ... */ },
    "DOMAIN_PURITY_VIOLATION": { /* ... */ },
    "INVOCATION_CONTRACT_BROKEN": { /* ... */ },
    "MATCH_RATE_BELOW_THRESHOLD": { /* ... */ },
    "TOKEN_LEDGER_WRITE_FAILED": { /* ... */ },
    "AGENT_TEAMS_DISABLED": { /* ... */ },
    "PENCIL_ANCHOR_MISSING": { /* ... */ },
    "UNKNOWN_ERROR": { /* ... */ }
  }
}
```

**총 20 카테고리 × 4 Output Style = 80 메시지 × 8 언어 = 640 번역 문자열**
(RD-5 mitigation: KO/EN 먼저 full quality, 나머지 6 언어 pseudo + v2.1.12 감수)

### 3.2 Explorer Index (β1)

`lib/discovery/explorer.js` 가 실행 시 생성하는 in-memory 구조:

```javascript
{
  "categories": {
    "starter": { skills: ["starter", "phase-1-schema", ...], agents: ["starter-guide", ...] },
    "dynamic": { skills: ["dynamic", "bkend-auth", "bkend-data", ...], agents: ["bkend-expert", ...] },
    "enterprise": { skills: ["enterprise", "phase-8-review", ...], agents: ["enterprise-expert", "infra-architect", ...] },
    "pdca-core": { skills: ["pdca", "plan-plus", "qa-phase", ...] },
    "utility": { skills: ["bkit", "output-style-setup", "skill-create", ...] }
  },
  "evals": {
    "available": 39,
    "categories": ["skill", "agent", "hook"]
  }
}
```

### 3.3 Fast Track Config (β5)

`bkit.config.json` 신규 섹션:

```json
{
  "control": {
    "fastTrack": {
      "enabled": true,
      "minTrustScore": 80,
      "autoLevel": "L3",
      "skipCheckpoints": [1, 2, 3, 4, 5, 6, 7, 8],
      "fallbackLevel": "L2"
    }
  }
}
```

---

## 4. API Specification (Slash Command Contracts)

### 4.1 `/bkit explore` (β1)

**Arguments**:
- `explore` — 전체 카테고리 트리
- `explore {category}` — 카테고리 상세 (starter/dynamic/enterprise/pdca-core/utility)
- `explore evals` — evals 전용
- `explore --level {L}` — Starter/Dynamic/Enterprise 필터

**Output**: 표 형태 skills/agents 목록 + 난이도 · 사용 빈도 · 관련 skill 추천

### 4.2 `/bkit evals run [skill]` (β2)

**Behavior**:
1. `skill` 인자 없으면 `/bkit evals list` 힌트 + 현재 skill list 표시
2. `skill` 인자 있으면 `child_process.spawn("node", ["evals/runner.js", skill])` 실행
3. 표준출력 tee → `/pdca analyze` 와 유사한 요약 표 렌더링
4. 결과 JSON 을 `.bkit/runtime/evals-{skill}-{timestamp}.json` 저장

### 4.3 `/pdca watch {feature}` (β4)

**Behavior**:
1. `{feature}` 없으면 현재 active feature 자동 감지
2. `/loop 30s /pdca status {feature}` 호출 (CC v2.1.71+)
3. 각 tick: `.bkit/state/pdca-status.json` + `.bkit/runtime/token-ledger.json` tail → live table render
4. 사용자 Ctrl+C 또는 PDCA phase 완료 시 종료

> **CC v2.1.118 X14 대응**: prompt hooks verifier re-fire 가 PreToolUse/PostToolUse 에 재발화 가능.
> `/pdca watch` 는 read-only tail 이라 직접 영향 없음 — 방어 불요. β3 에러 번역 경로에만 idempotent 캐시 추가 (§6 E-β3-03 참조).

**Output Example**:
```
📊 [Watch] bkit-v2111-integrated-enhancement — tick 12 (08:45:30)
─────────────────────────────────────────────────────────────────
Phase: do          Scope: sprint-beta           Turns: 23 / 50~60
Match Rate:  87% → Target 90%                   Iterate: 1 / 5
Tokens:      125k in / 38k out                  Cost: $2.85
─────────────────────────────────────────────────────────────────
Recent: β3 에러 번역 사전 ko.json 작성 중 (카테고리 12/20)
```

### 4.4 `/pdca fast-track {feature}` (β5)

**Preconditions** (fail-open):
1. Trust Score ≥ `bkit.config.control.fastTrack.minTrustScore` (기본 80)
2. `bkit.config.control.fastTrack.enabled === true`
3. Design 문서 존재 ( `/pdca design` 완료)

**Behavior**:
1. Automation Level L2 → L3 auto-escalate
2. Checkpoint 1~8 모두 auto-approve (default Recommended)
3. 각 Checkpoint 의 auto-approved 선택을 `.bkit/runtime/fast-track-log.json` 에 기록 (audit trail)
4. 하나라도 Recommended 없는 Checkpoint 발견 시 → fallback L2 + 사용자 개입 요청

**Fail-Open**:
- Trust Score 부족 → fast-track 비활성 + "Trust Score 올리기" 가이드 출력
- Design 문서 없음 → `/pdca design` 선행 안내

### 4.5 `/pdca token-report` (δ4 slot)

본 Sprint 에서는 skill action 슬롯만 reserve. 실제 구현은 Sprint δ에서.

---

## 5. UI/UX Design

### 5.1 `/bkit explore` Page Layout

```
╔══════════════════════════════════════════════════════════════╗
║ bkit Explore — 39 Skills · 36 Agents · 39 Evals              ║
╠══════════════════════════════════════════════════════════════╣
║ Filter: Level [All] Category [All] Difficulty [All]         ║
║ Sort by: [Usage] [Name] [Difficulty]                         ║
╠══════════════════════════════════════════════════════════════╣
║ 📂 starter (5 skills / 1 agent)                              ║
║   /starter         — 정적 웹 초심자                            ║
║   /phase-1-schema  — 스키마 정의                             ║
║   /phase-2-conv... — 코딩 컨벤션                             ║
║   🤖 starter-guide — 입문자 안내                             ║
║                                                              ║
║ 📂 dynamic (8 skills / 1 agent)                              ║
║   /dynamic         — bkend.ai 풀스택                          ║
║   ...                                                        ║
╚══════════════════════════════════════════════════════════════╝
```

### 5.2 `/pdca fast-track` Confirmation

```
⚡ Fast Track Mode — Daniel's Track
─────────────────────────────────────────────────────────────
Trust Score: 85 (≥ 80 required) ✓
Design doc: bkit-v2111-sprint-alpha.design.md exists ✓
Level: L2 → L3 auto-escalating

Skipped Checkpoints: 1 Requirements / 2 Clarifying / 3 Architecture
                     4 Implementation Scope / 5 Review / 6~8 ...

Fallback trigger: No "Recommended" option detected → pause to L2

Proceeding with sprint-alpha implementation... (35~45 turns estimated)
```

### 5.3 Page UI Checklist

#### /bkit explore Page

- [ ] Header: "bkit Explore — {N} Skills · {M} Agents · {K} Evals"
- [ ] Filter: Level dropdown (All / Starter / Dynamic / Enterprise)
- [ ] Filter: Category dropdown (All / pdca-core / utility / starter / dynamic / enterprise)
- [ ] Filter: Difficulty dropdown (All / easy / medium / hard)
- [ ] Sort: Usage / Name / Difficulty
- [ ] Group: Category headers with count badges
- [ ] Item: slash command + 1-line description
- [ ] Icon: 🤖 for agents, / for skills, 🧪 for evals

#### /pdca watch Page

- [ ] Header: Feature name + tick counter + timestamp
- [ ] Row: Phase / Scope / Turns
- [ ] Row: Match Rate / Target / Iterate count
- [ ] Row: Tokens in/out / Cost
- [ ] Footer: Recent action (last log line)
- [ ] Refresh every 30s (configurable)

---

## 6. Error Handling

| Code | Cause | Handling |
|------|-------|----------|
| E-β1-01 | skills/ 디렉토리 없음 | Explorer empty tree + "bkit 미설치" 안내 |
| E-β2-01 | `node evals/runner.js` subprocess fail | stderr tee + exit code 표시 |
| E-β3-01 | 에러 카테고리가 dict 에 없음 | UNKNOWN_ERROR 카테고리 fallback |
| E-β3-02 | 언어 파일 로드 실패 | 영어 fallback |
| E-β4-01 | `/loop` 미지원 CC 버전 | 단순 1회 `/pdca status` + warning |
| E-β5-01 | Trust Score < 80 | fast-track 비활성 + 가이드 |
| E-β5-02 | Design doc 없음 | `/pdca design` 선행 안내 |
| E-β3-03 | CC v2.1.118 X14 prompt hook re-fire 에서 error-handler 중복 번역 | idempotent message hash 캐싱 (세션당 1회 translate) |
| E-β6-01 | 언어 감지 실패 | 영어 기본 |

---

## 7. Security Considerations

- [x] `node evals/runner.js` subprocess: argument injection 방지 (`skill` 인자는 `[a-z0-9-]+` 정규식 validation)
- [x] Fast Track audit trail: `.bkit/runtime/fast-track-log.json` OWASP A08 sanitizer 경유
- [x] 에러 번역 dict JSON: schema validation (Ajv or manual), path traversal 불가 (assets/ 하드코딩)
- [x] `/pdca watch` tail: `.bkit/state/` read-only, no write access
- [x] PII redaction: Token Ledger tail 시 기존 7-key redaction 유지

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Count |
|------|--------|------|:---:|
| L1 Unit | explorer / runner-wrapper / translator / detector / fast-track | Node test | 10 |
| L2 Integration | 4 slash + error handling + language detect | bash + L5 harness | 25 |
| Contract | Invocation Contract L1-L4 신규 16 assertions | tests/contract/ | 16 |

### 8.2 L1 Unit Tests (10)

| # | Function | Check |
|:---:|---|---|
| 1 | `explorer.listByLevel(level)` | 카테고리 필터 동작 |
| 2 | `explorer.listByCategory(cat)` | 카테고리 상세 |
| 3 | `runner-wrapper.invokeEvals(skill)` | subprocess + 결과 JSON |
| 4 | `translator.translate(code, style, lang)` | 번역 매핑 정확 |
| 5 | `translator.fallback(unknownCode)` | UNKNOWN_ERROR fallback |
| 6 | `detector.detectFromPrompt(text)` | 8 언어 detection (KO/EN/JA/ZH/ES/FR/DE/IT) |
| 7 | `fast-track.canActivate(trustScore)` | 80 임계값 |
| 8 | `fast-track.skipCheckpoints(config)` | 8 Checkpoint 자동 스킵 |
| 9 | `live-dashboard.tail(feature)` | 30s tick |
| 10 | `live-dashboard.render(state)` | 표 포맷 |

### 8.3 L2 Integration Tests (25)

| # | Scenario | Expected |
|:---:|---|---|
| 1~5 | `/bkit explore` 5 variants (전체/starter/dynamic/enterprise/evals) | 각 필터 결과 |
| 6~8 | `/bkit evals run {skill}` 3 cases (valid/invalid skill/subprocess fail) | runner 결과 vs 에러 |
| 9~12 | `/pdca watch` 4 cases (active feature/no feature/CC v2.1.71-/loop 작동) | live tail 정상/fallback |
| 13~17 | `/pdca fast-track` 5 cases (Trust 85/75/no design/enable false/fallback) | 활성/차단/fallback |
| 18~22 | 에러 번역 5 카테고리 × 4 style | 올바른 메시지 |
| 23~25 | 언어 감지 3 케이스 (KO/EN/혼합) | 올바른 lang code |

### 8.4 Contract Tests (16 신규 assertions)

| Command | L1 frontmatter | L2 invocation | L3 side-effect |
|---------|:-:|:-:|:-:|
| `/bkit explore` | ✓ | ✓ | — |
| `/bkit evals run` | ✓ | ✓ | ✓ (evals-*.json 생성) |
| `/pdca watch` | ✓ | ✓ | ✓ (`/loop` 연동) |
| `/pdca fast-track` | ✓ | ✓ | ✓ (Level escalate + fast-track-log.json) |

**Total**: 16 assertions (4 command × 4 contract dim)

---

## 9. Clean Architecture Layer 배치

| Component | Layer | Path |
|-----------|-------|------|
| 4 slash SKILL.md | Presentation | `skills/bkit/*` + `skills/pdca/` |
| `error-handler.js` | Presentation | `hooks/error-handler.js` |
| `explorer.js` | Application | `lib/discovery/explorer.js` |
| `runner-wrapper.js` | Application | `lib/evals/runner-wrapper.js` |
| `error-translator.js` | Infrastructure | `lib/ui/error-translator.js` |
| `live-dashboard.js` | Infrastructure | `lib/ui/live-dashboard.js` |
| `fast-track.js` | Application | `lib/pdca/fast-track.js` ← **γ pilot 와 분리** |
| `detector.js` (i18n) | Infrastructure | `lib/i18n/detector.js` |
| `error-dict.*.json` | Infrastructure (assets) | `assets/error-dict.{ko,en,ja,zh,es,fr,de,it}.json` |

### 9.1 RD-1 Mitigation: β vs γ 경로 분리

```
Sprint β:  lib/pdca/fast-track.js          (기존 lib/pdca/ 경로 — γ pilot 밖)
                    │
                    └─▶ lib/pdca/full-auto-do.js   (기존, v2.1.10)

Sprint γ:  lib/application/pdca-lifecycle/   (NEW, γ2 pilot 전용)
                    │
                    └─▶ (no dependency on fast-track.js)

→ β 와 γ 상호 영향 0, 병렬 구현 가능
```

---

## 10. Coding Convention Reference

### 10.1 Slash Command Naming

| Command | Rule |
|---------|------|
| `/bkit explore` | 단어 1개 (namespaced under bkit) |
| `/bkit evals run` | 2-word action (namespaced) |
| `/pdca watch` | pdca namespace 의 action |
| `/pdca fast-track` | kebab-case action |

### 10.2 JSON Dictionary Schema

`assets/error-dict.{lang}.json` 은 JSON Schema 로 검증:
```javascript
{
  "version": "string",
  "language": "enum(ko|en|ja|zh|es|fr|de|it)",
  "categories": {
    "[A-Z_]+": {
      "technical": "string",
      "styles": {
        "bkit-learning": "string",
        "bkit-pdca-guide": "string",
        "bkit-enterprise": "string",
        "bkit-pdca-enterprise": "string"
      }
    }
  }
}
```

---

## 11. Implementation Guide

### 11.1 File Structure

```
skills/
├── bkit/
│   ├── explore/
│   │   └── SKILL.md                  [NEW]
│   └── evals-run/
│       └── SKILL.md                  [NEW]
└── pdca/
    └── SKILL.md                      [MODIFY] + watch + fast-track + token-report(slot)

hooks/
└── error-handler.js                  [NEW]

lib/
├── discovery/
│   └── explorer.js                   [NEW]
├── evals/
│   └── runner-wrapper.js             [NEW]
├── ui/
│   ├── error-translator.js           [NEW]
│   └── live-dashboard.js             [NEW]
├── pdca/
│   └── fast-track.js                 [NEW]
└── i18n/
    └── detector.js                   [NEW]

assets/                               [NEW DIR]
├── error-dict.ko.json                [NEW]
├── error-dict.en.json                [NEW]
├── error-dict.ja.json                [NEW]
├── error-dict.zh.json                [NEW]
├── error-dict.es.json                [NEW]
├── error-dict.fr.json                [NEW]
├── error-dict.de.json                [NEW]
└── error-dict.it.json                [NEW]

bkit.config.json                      [MODIFY] + control.fastTrack 섹션
```

### 11.2 Implementation Order

1. [ ] β1-a: `lib/discovery/explorer.js` + L1 TC 2개
2. [ ] β1-b: `skills/bkit/explore/SKILL.md`
3. [ ] β2-a: `lib/evals/runner-wrapper.js` + L1 TC 1개
4. [ ] β2-b: `skills/bkit/evals-run/SKILL.md`
5. [ ] β6-a: `lib/i18n/detector.js` + L1 TC 1개
6. [ ] β6-b: `hooks/session-start.js` 언어 감지 AUQ 추가 (α와 별개)
7. [ ] β3-a: `assets/error-dict.ko.json` + `assets/error-dict.en.json` full quality
8. [ ] β3-b: 나머지 6 언어 pseudo-translation
9. [ ] β3-c: `lib/ui/error-translator.js` + L1 TC 2개
10. [ ] β3-d: `hooks/error-handler.js` 연동
11. [ ] β4-a: `lib/ui/live-dashboard.js` + L1 TC 2개
12. [ ] β4-b: `skills/pdca/SKILL.md` watch action 추가
13. [ ] β5-a: `lib/pdca/fast-track.js` + L1 TC 2개
14. [ ] β5-b: `skills/pdca/SKILL.md` fast-track action 추가
15. [ ] β5-c: `bkit.config.json` + control.fastTrack
16. [ ] L2 Integration 25 TC 실행
17. [ ] Contract 16 assertions 추가 및 PASS

### 11.3 Session Guide (β 내부)

#### Module Map

| Sub-Module | Scope Key | FR | Est. Turns |
|------------|-----------|:---:|:---:|
| Explorer | `sprint-beta-explorer` | β1 | 8~12 |
| Evals Wrapper | `sprint-beta-evals` | β2 | 5~8 |
| Error Translator | `sprint-beta-translator` | β3 | 15~20 (8 언어 JSON) |
| Live Dashboard | `sprint-beta-watch` | β4 | 8~10 |
| Fast Track | `sprint-beta-fast-track` | β5 | 10~15 |
| i18n Detector | `sprint-beta-i18n` | β6 | 5~8 |

**총 추정**: 51~73 turns (평균 ~60)

---

## 12. Acceptance Criteria (Sprint β DoD)

- [ ] 6 FR 전량 Match Rate ≥ 90%
- [ ] 4 slash commands L2 integration PASS
- [ ] 8 언어 JSON 사전 schema validation PASS
- [ ] KO/EN 에러 번역 품질 ≥ 0.9 (manual review)
- [ ] `/pdca fast-track` Trust Score 가드 동작 (L2 TC)
- [ ] `/pdca watch` `/loop` 연동 또는 fallback 동작
- [ ] Invocation Contract +16 assertions 추가 및 PASS
- [ ] RD-1 확인: β fast-track.js 와 γ pilot 이 경로 분리됨

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial Sprint β design — Option C, 4 slash + 8-lang dict + γ pilot 분리 | kay kim |

---

**Next Step**: Sprint α 완료 후 `/pdca do bkit-v2111-integrated-enhancement --scope sprint-beta`
