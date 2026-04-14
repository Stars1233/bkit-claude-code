# bkit v2.1.6 고도화 계획서 — CC v2.1.105 통합 + 유기적 연동 강화

> **작성일**: 2026-04-14
> **대상 버전**: bkit v2.1.6 (v2.1.5 기반)
> **분석 방식**: CTO Team 11명 병렬 심층 감사 + Plan Plus 브레인스토밍
> **베이스 CC 버전**: v2.1.105 (67개 연속 호환)
> **스코프 철학**: **"정비(Maintenance) 릴리스"** — 신기능 최소, 유기적 연동 강화 최대

---

## 0. Executive Summary

### 핵심 결론

v2.1.6은 **3대 축**으로 정의됩니다:

1. **Docs=Code 복원** — MEMORY.md/paths.js 버전 하드코딩 등 8+건 기록 오류 교정
2. **유기적 연동 강화** — Hook chain 무결성, unified-stop.js deprecated 경로 정리, dead fallback 제거
3. **CC v2.1.105 신기능 선별 도입** — PreCompact blocking만 우선, monitors/desc 확장은 선별적

**의도적으로 제외**: RTK 차용(→v2.2.0), Clean Architecture T0~T5(→v3.0.0), context:fork 전면 확대(→v2.2.0)

### Agent Team 스코어카드 종합

| 축 | 현재 | v2.1.6 목표 | Δ |
|---|:---:|:---:|:---:|
| 아키텍처 등급 | 3.8/5 | 4.3/5 | +0.5 |
| 유기적 연동 품질 | 7.2/10 | 8.5/10 | +1.3 |
| CC 고급 기능 채택률 | ~70% | ~80% | +10% |
| OWASP 준수 | 6/10 | 9/10 | +3 |
| Match Rate | 75% | 95% | +20% |
| Breaking 호환성 | 67연속 | 68연속 | +1 |

### Executive 4-Perspective

| Perspective | v2.1.6 핵심 가치 |
|-------------|------------------|
| **Technical** | PreCompact blocking으로 PDCA 무결성 확보, dead code 51% → <20% |
| **Operational** | catch(_){} 43건 → 구조적 로깅, Hook chain 관측성 복원 |
| **Strategic** | v2.2.0(RTK) / v3.0.0(Clean Arch) 전단계 안전 발판 |
| **Quality** | OWASP A01 FAIL 해결 (settings.json permissions.deny), Bash 공격면 축소 |

---

## 1. 11명 CTO Team 분석 종합

### 1.1 팀 구성 및 역할

| # | 전문가 | 역할 | 핵심 발견 |
|---|--------|------|----------|
| 1 | Skills Architect | skills 전수 감사 | 39 skills, context:fork 1개만, desc 평균 180/1536자 사용(80% 여유) |
| 2 | Agents Architect | agents 전수 감사 | 36 agents, maxTurns 누락 0건, desc 28건 250자 초과, disallowedTools 불완전 |
| 3 | Hooks Integrator | hook↔script 연동 | 24 active hooks, `if` 필드 1/24만, 19 legacy-fallback scripts |
| 4 | MCP Engineer | MCP 서버 + monitors | 2 servers 19 tools, monitors manifest POC 설계 완료 |
| 5 | Lib Core Auditor | lib/ 의존성 | 97 modules 23,908 LOC, state-machine.js 948 LOC 분할 후보 |
| 6 | CC Feature Integrator | v2.1.105 통합 설계 | PreCompact 블로킹 120 LOC 설계, 총 31h WBS 작성 |
| 7 | Code Quality Analyst | 아키텍처 품질 | 3.8/5 등급, Critical 5건 (paths.js v2.0.4 하드코딩 등) |
| 8 | Gap Detector | 설계-구현 일치 | v3.0 plan 0% / rtk plan 5% 미구현, lib/context/ dead code |
| 9 | QA Strategist | v2.1.6 품질 전략 | 74 TC 계획, context:fork race condition 최우선 리스크 |
| 10 | Security Architect | 보안 감사 | OWASP A01/A05/A10 FAIL, settings.json permissions 빈 배열 |
| 11 | Enterprise Expert | 전략 조언 | 스코어 19/25 (76%), "정비 릴리스" 정의 권고 |

### 1.2 팀 간 교차 검증으로 확정된 사실

| 교차 검증 항목 | 결과 |
|--------------|------|
| **실제 skills 수** | 38~39개 (MEMORY: 37, archi memo: 36) — **MEMORY 갱신 필수** |
| **실제 agents 수** | 36개 (MEMORY: 32) — **MEMORY 갱신 필수** |
| **bkitVersion 하드코딩** | `lib/core/paths.js:260,271` = '2.0.4' (현재 v2.1.5) — ENH-167 미해결 확인 |
| **unified-stop.js deprecated** | v1.6.0부터 `@deprecated` 표기, v2.1.5까지 9개 마이너 방치 |
| **lib/context/ dead code** | hooks/scripts 0건 require — 삭제 vs 와이어링 결정 필요 |
| **settings.json 보안** | `permissions.allow/deny/ask` 모두 빈 배열 — OWASP A01 FAIL |

---

## 2. Plan Plus 브레인스토밍

### Phase 0: Intent Discovery

#### 0.1 v2.1.6의 "진짜 목표"는?

| 가정 | 검증 | 결론 |
|------|------|------|
| "CC v2.1.105 신기능 최대 채택" | 11명 CTO 합의: 3개 중 1개만 (PreCompact)이 즉시 가치 | ❌ 과잉 |
| "v3.0.0 Clean Arch의 전단계" | Gap Detector: v3.0 plan 0% 구현 → 점진적 접근 필요 | ✅ 맞음 |
| "유기적 연동 무결성 복원" | Code Quality: 아키 3.8, 유기 7.2 — 구조적 기반 투자 필요 | ✅ **핵심** |
| "사용자 문제 해결 (압력 요구)" | 사용자: "안 하면 크리티컬?" → "아니요" → **압력 없음** | ⚠️ 스코프 욕심 경계 |

**결정된 의도**: *"CC v2.1.105를 구실 삼아 bkit 내부 기술 부채를 청산하고, 다음 메이저 업그레이드(v2.2.0 RTK, v3.0 Clean Arch)의 안전한 발판을 마련한다."*

#### 0.2 놓치면 안 되는 Critical Risk

| Risk | 심각도 | 발견자 |
|------|:---:|-------|
| OWASP A01 FAIL (settings.json deny 빈 배열) | **Critical** | Security Architect |
| bkitVersion '2.0.4' 하드코딩 (백업 메타 오염) | **Critical** | Code Quality |
| unified-stop.js deprecated SKILL/AGENT_HANDLERS 2중 호출 위험 | **Critical** | Code Quality + Hooks |
| context:fork 병렬 시 pdca-status.json race condition | **High** | QA Strategist |
| catch(_){} 43건 사일런트 삼킴 | **High** | Code Quality |

#### 0.3 기존 workaround 대체 가능 native

- **PreCompact blocking** (v2.1.105) → 현재 post-compaction.js 복원 전용 workaround 불필요
- **monitors manifest** (v2.1.105) → SessionStart 폴링 fallback 대체 가능 (단, v2.2.0으로 연기)
- **Skill desc 1,536자** (v2.1.105) → v2.0.8 압축 제약 해제 (단, 선별 적용)

### Phase 1: Alternative Exploration

#### 1.1 PreCompact 구현 전략 (3안 비교)

| 전략 | 구현 범위 | 비용 | 리스크 |
|------|----------|------|------|
| A. exit 2 블로킹 | stderr 메시지만 | 1h | 한국어 메시지 렌더 불안정 |
| B. **decision:block JSON** | 구조화 응답 | 3h | ✅ 권장 (명확한 UX) |
| C. 하이브리드 | 양쪽 병행 | 4h | 과잉 설계 |

**선택**: B — CC v2.1.105 공식 스펙 준수, 한국어 bypass 메시지 정상 전달.

#### 1.2 context:fork 확대 범위 (3안)

| 전략 | 범위 | 비용 | 리스크 |
|------|------|------|------|
| A. 최소 (1→2) | cc-version-analysis만 | 30분 | race condition 가능성 |
| B. **중간 (1→5)** | +enterprise, phase-8-review, audit, skill-status | 2h | ✅ 권장 (READONLY 중심) |
| C. 전면 (1→10+) | Top 10 fork 후보 전부 | 4h | pdca-status.json 동시쓰기 race |

**선택**: B — READONLY skills만 먼저 적용, write 수반 skills는 v2.2.0에서 file-lock 도입 후.

#### 1.3 unified-stop.js 정리 전략 (3안)

| 전략 | 접근 | 비용 | 리스크 |
|------|------|------|------|
| A. 전면 삭제 | SKILL/AGENT_HANDLERS 완전 제거 | 30분 + 2h 테스트 | breaking 위험 |
| B. **점진 제거** | frontmatter hooks 검증 후 레지스트리만 삭제 | 1h + 3h E2E | ✅ 권장 |
| C. 유지 (유보) | @deprecated만 업데이트 | 5분 | 부채 지속 |

**선택**: B — ENH-188 검증 전제, E2E 통과 후 제거.

### Phase 2: YAGNI Review

| 항목 | 포함? | 이유 |
|------|:---:|------|
| MEMORY.md 수치 정합 교정 | ✅ | Docs=Code 철학 직접 위반 |
| paths.js bkitVersion 교정 | ✅ | 백업 메타 정확성 (ENH-167) |
| unified-stop.js deprecated 제거 | ✅ | 2중 호출 실제 위험 (ENH-188) |
| PreCompact blocking | ✅ | v2.1.105 최대 가치 기능 |
| settings.json permissions.deny | ✅ | **OWASP Critical** |
| Bash matcher 9→20 패턴 | ✅ | 공격면 축소 |
| context:fork 1→5 (READONLY) | ✅ | 안전 범위 내 DX 개선 |
| agents disallowedTools 감사 | ✅ | fork 격리 보안 |
| catch(_){} → debugLog 래핑 | ✅ | 관측성 복구 |
| lib/context/ 삭제 vs 와이어링 | ✅ | Dead code 결정 필요 |
| 3개 신규 handler 설계 반영 | ✅ | Docs=Code |
| PermissionDenied hook | ⏸ | Auto Mode GA 대기 → v2.2.0 |
| monitors manifest | ❌ | POC만 설계, v2.2.0에서 구현 |
| Skill desc 재확장 | ❌ | v2.0.8 최적화 역행 위험 |
| lib/pdca/state-machine 분할 | ❌ | v3.0.0 범위 (리스크 과다) |
| RTK 차용 | ❌ | v2.2.0 |
| Clean Arch T0~T5 | ❌ | v3.0.0 |

### Phase 3: Priority Assignment

**P0 블로커 (v2.1.6 필수)**:
- ENH-201: MEMORY.md 수치/상태 정합 교정
- ENH-167: paths.js bkitVersion 동적화
- ENH-206 [신규]: settings.json permissions.deny (OWASP A01)

**P1 권장 (v2.1.6 릴리스 전)**:
- ENH-188: unified-stop.js deprecated 제거
- ENH-203: PreCompact decision:block 구현
- ENH-207 [신규]: catch(_){} → debugLog 래핑 (43건, 17파일)
- ENH-208 [신규]: Bash destructive 패턴 9→20+ 확장
- ENH-202(축소): context:fork READONLY 5 skills만
- ENH-209 [신규]: agents disallowedTools 감사 (fork 격리)

**P2 Nice-to-Have**:
- ENH-210 [신규]: 3개 handler(cwd/file/task) design 문서 반영
- ENH-211 [신규]: lib/context/ 삭제 결정 및 실행
- ENH-212 [신규]: detectActiveSkill dead fallback 제거
- ENH-213 [신규]: permission-manager.js context-hierarchy 잔해 제거

**P3 모니터링**:
- ENH-204: monitors manifest POC → v2.2.0
- ENH-205: Skill desc 선별 재확장 → v2.2.0

### Phase 4: Pre-mortem (실패 시나리오)

| 실패 | 원인 | 예방책 |
|------|------|--------|
| v2.1.6이 v2.1.5 대비 breaking | unified-stop.js 제거로 legacy skill 호출 실패 | 점진 제거 + E2E 테스트 G6 |
| PreCompact hook이 compaction 무한 차단 | bypass 로직 버그 | env var + snapshot-age + manual trigger 3중 bypass |
| context:fork 확대로 race 발생 | READONLY로 제한했으나 예외 skill | G4 게이트에서 concurrent write 테스트 |
| settings.json deny로 사용자 워크플로우 차단 | 과도한 패턴 | `deny` 아닌 `ask`로 약한 강제 + 문서화 |
| dead code 삭제가 실제로 사용되던 경로 | require 추적 누락 | Grep 전면 + npm test |

---

## 3. v2.1.6 스코프 정의

### 3.1 IN (포함)

| 카테고리 | 항목 | ENH | 우선순위 | 공수 |
|---------|------|-----|:-----:|:----:|
| Docs=Code | MEMORY.md 정합 교정 (8건) | ENH-201 | P0 | 30m |
| Docs=Code | paths.js bkitVersion 동적화 | ENH-167 | P0 | 15m |
| Docs=Code | 3개 handler design 반영 | ENH-210 | P2 | 30m |
| 보안 | settings.json permissions.deny | ENH-206 | P0 | 30m |
| 보안 | Bash destructive 패턴 확장 (9→20+) | ENH-208 | P1 | 1h |
| 보안 | agents disallowedTools 감사 | ENH-209 | P1 | 1h |
| 유기적 연동 | unified-stop.js deprecated 제거 | ENH-188 | P1 | 1h + 3h test |
| 유기적 연동 | catch(_){} debugLog 래핑 (43건) | ENH-207 | P1 | 3h |
| 유기적 연동 | detectActiveSkill dead fallback 제거 | ENH-212 | P2 | 30m |
| 유기적 연동 | permission-manager dead branch 제거 | ENH-213 | P2 | 45m |
| 유기적 연동 | lib/context/ 삭제 결정 및 실행 | ENH-211 | P2 | 1h |
| CC 통합 | PreCompact decision:block 구현 | ENH-203 | P1 | 3h + 3h test |
| DX 개선 | context:fork READONLY 5 skills | ENH-202 | P1 | 2h |
| QA | L1~L5 TC 74건 작성 | — | P1 | 8h |
| 문서 | CHANGELOG, context-engineering.md 업데이트 | — | P0 | 1h |
| **합계** | | | | **~30h** |

### 3.2 OUT (제외 — v2.2.0 또는 v3.0.0)

| 항목 | 이유 | 연기 대상 |
|------|------|----------|
| monitors manifest 구현 | POC 설계만, 런타임 검증 부족 | v2.2.0 |
| Skill desc 전면 재확장 | v2.0.8 최적화 역행, ROI 불명확 | v2.2.0 (선별) |
| RTK 차용 (토큰 30~50% 절감) | 28건 ENH-R, 대형 설계 변경 | v2.2.0 |
| Clean Architecture T0~T5 | 32건 개선 항목, v3.0 전용 | v3.0.0 |
| context:fork 전면 확대 (Top 10) | race condition 미해결 | v2.2.0 (file-lock 도입 후) |
| lib/pdca/state-machine.js 분할 | 948 LOC, 리스크 크고 v3.0 스코프 | v3.0.0 |
| audit-logger 싱글턴 정규화 | 구조 변경 범위 큼 | v3.0.0 |
| PermissionDenied hook | Auto Mode GA 대기 | v2.2.0+ |

---

## 4. ENH별 상세 설계

### ENH-201: MEMORY.md 정합 교정 (P0)

**대상 교정 (8+건)**:

```diff
- Skills: 37 → Agents: 32
+ Skills: 38 → Agents: 36
- Phase Stop scripts: 11
+ Phase Stop scripts: 5
- lib modules: 88 → ~97
+ lib modules: 97 (23,908 LOC)
```

**완료 기준**: 모든 수치 grep 명령으로 실측 검증.

### ENH-167: paths.js bkitVersion 동적화 (P0)

**현재**:
```js
// lib/core/paths.js:260,271
bkitVersion: '2.0.4',  // 하드코딩 (v2.1.5 시점)
```

**변경**:
```js
const { BKIT_VERSION } = require('./version');
// ...
bkitVersion: BKIT_VERSION,
```

**신규 파일**: `lib/core/version.js` (단일 진실 소스, package.json에서 읽거나 상수)

### ENH-206: settings.json permissions.deny (P0, OWASP A01)

**변경**: `.claude/settings.json`

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)", "Read(./.env.*)", "Read(./credentials*)",
      "Read(./*.pem)", "Read(./*.key)", "Read(./id_rsa*)",
      "Read(./.git/config)", "Read(./.aws/credentials)",
      "Bash(curl:*secret*)", "Bash(wget:*secret*)",
      "Bash(sudo:*)", "Bash(*rm -rf /*)",
      "Write(./.env)", "Write(./credentials*)"
    ],
    "ask": [
      "Bash(chmod 777*)", "Bash(git push --force*)",
      "Write(./.github/workflows/*)"
    ]
  }
}
```

### ENH-188: unified-stop.js deprecated 제거 (P1)

**단계**:
1. frontmatter hooks 경로 E2E 검증 (모든 skill/agent 정상 동작)
2. `SKILL_HANDLERS`, `AGENT_HANDLERS` 레지스트리 제거
3. 19개 legacy fallback script 실파일 보존 (ENH-210으로 design 반영 후)
4. E2E 3h: PDCA 완전 사이클, CTO Team 실행, /simplify, /pdca status

**리스크 완화**: 스냅샷 백업 + git revert plan.

### ENH-203: PreCompact decision:block 구현 (P1)

**신규 파일**: `scripts/pre-compaction.js` (~120 LOC, CC Feature Integrator 설계안)

**핵심 로직**:
- CRITICAL_PHASES 감지 (design/implementation/verification + progress 0~99%)
- bypass 3중:
  - `trigger === 'manual'`
  - `BKIT_FORCE_COMPACT=1` env
  - 최근 5분 내 snapshot 존재
- snapshot 생성 후 block (safety net)
- 한국어 `permissionDecisionReason`

**hooks.json 등록**:
```json
{
  "matcher": "auto|manual",
  "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/pre-compaction.js" }]
}
```

### ENH-202 (축소): context:fork READONLY 5 skills (P1)

**적용 대상** (QA Strategist G4 통과 확정):
1. `cc-version-analysis` (high, INDEPENDENT, write 없음)
2. `enterprise` (high, INDEPENDENT)
3. `phase-8-review` (high, READONLY, LSP만)
4. `audit` (medium, READONLY)
5. `skill-status` (low, READONLY)

**제외** (write 가능성):
- `bkit`, `bkit-rules`, `control`, `phase-3-mockup` — v2.2.0 파일락 도입 후

**SKILL.md 변경**:
```yaml
---
name: cc-version-analysis
context: fork
effort: high
---
```

### ENH-207: catch(_){} 구조적 로깅 (P1)

**대상**: 17 파일, 43건

**변경 패턴**:
```diff
- try { ... } catch (_) {}
+ try { ... } catch (e) {
+   require('./lib/core/debug').debugLog('module-name', 'operation failed', { error: e.message });
+ }
```

**신규 유틸**: `lib/core/error-handler.js` — `safeCall(fn, context, fallback)` 헬퍼.

### ENH-208: Bash destructive 패턴 확장 (P1)

**현재 `scripts/unified-bash-pre.js:67-77`**: 9건

**추가 11건**:
```js
/sudo\s/, /chmod\s+777/,
/curl\s[^\n]*\|\s*(ba)?sh/, /wget\s[^\n]*\|\s*(ba)?sh/,
/cat\s+[^\s]*id_rsa/, /cat\s+[^\s]*\.pem/,
/eval\s/, /base64\s+-d.*\|\s*(ba)?sh/,
/ssh-keygen\s+-.*-f\s*\/dev\/null/,
/dd\s+if=\/dev\/(zero|urandom)/,
/mkfs\./
```

### ENH-209: agents disallowedTools 감사 (P1)

**감사 대상**: 36 agents 전수

**카테고리별 기본 템플릿**:
- **Read-only agents** (design-validator, code-analyzer, gap-detector): `disallowedTools: Write, Edit, Bash`
- **Orchestrators** (cto-lead, pm-lead, qa-lead): `disallowedTools: Bash(rm*), Bash(git push --force*)`
- **Implementers**: 기존 유지

**자동 스크립트**: `scripts/audit-agent-frontmatter.js` (CI 통합)

### ENH-210: 3개 handler design 반영 (P2)

**대상 문서**: `docs/02-design/features/bkit-v216-enhancement.design.md` §9 Hook Handlers

**추가 내용**:
- CwdChanged (ENH-149): 프로젝트 전환 감지 → PDCA 상태 재로드
- FileChanged (ENH-150): `Write|Edit(docs/**/*.md)` → gap-detector 자동 제안
- TaskCreated (ENH-156): `[PM]/[Plan]/...` 패턴 파싱 → taskHistory 유지

### ENH-211: lib/context/ 결정 (P2)

**분석**: 7 모듈, 어디서도 `require` 안 됨 (dead code)

**결정 프로세스**:
1. Grep 전수 재확인
2. 과거 커밋에서 어디서 호출되었는지 git log
3. 의도된 기능이면 와이어링 (v2.2.0), 아니면 삭제 (v2.1.6)

**권장**: 삭제 — 복원 필요 시 git history에서 복구.

### ENH-212: detectActiveSkill dead fallback 제거 (P2)

**위치**: `scripts/unified-stop.js:157-161`

**현재**:
```js
if (pdcaStatus.session?.lastSkill) {  // ← createInitialStatusV2에 이 스키마 없음
  return pdcaStatus.session.lastSkill;
}
```

**수정**: 분기 제거 + 스키마 검증 주석 추가.

### ENH-213: permission-manager.js 정리 (P2)

**위치**: `lib/permission-manager.js:10, 54, 100, 146`

**제거 대상**: v2.1.1~v2.1.3에서 제거된 `context-hierarchy.js` 잔해 분기 주석 4건.

**결과**: `DEFAULT_PERMISSIONS` 단일화.

---

## 5. 유기적 연동 설계

### 5.1 Hook Chain 무결성 맵 (v2.1.6 기준)

```
┌─ SessionStart ──→ session-start.js ──→ lib/pdca/status.load()
│                                    └─→ lib/core/memory.restore()
│
├─ UserPromptSubmit ─→ user-prompt-handler.js (sessionTitle ENH-187)
│
├─ PreToolUse (Write|Edit) ─→ pre-write.js ──→ [ENH-206] secrets 차단 확인
├─ PreToolUse (Bash) ─────→ unified-bash-pre.js ──→ [ENH-208] 20+ 패턴 매칭
│
├─ CwdChanged [ENH-149] ─→ cwd-changed-handler.js ──→ pdca/status.reload()
├─ FileChanged [ENH-150] ─→ file-changed-handler.js (if: docs/**/*.md)
│                                                  └─→ gap-detector suggest
├─ TaskCreated [ENH-156] ─→ task-created-handler.js ──→ pdca-status.taskHistory
│
├─ PreCompact [ENH-203 신규] ─→ pre-compaction.js
│                             ├─ CRITICAL_PHASES 감지 → snapshot 생성
│                             ├─ bypass 3중 체크 (manual/env/snapshot-age)
│                             └─ decision:block 또는 outputEmpty
│
├─ PostCompact ──→ post-compaction.js ──→ pdca/status.restore (기존)
│
├─ Stop ──→ unified-stop.js
│        ├─ [ENH-188] SKILL/AGENT_HANDLERS 제거 (frontmatter 단일 경로)
│        ├─ [ENH-212] dead fallback 제거
│        ├─ State machine transition
│        ├─ Quality gate M1~M10
│        └─ Trust engine sync
│
└─ SessionEnd ──→ session-end-handler.js ──→ audit-logger.finalize
```

**무결성 검증 포인트**: 각 → 경로에서 [ENH-207] `catch(_){}` 구조적 로깅 통과.

### 5.2 3중 동기화 체계 (Docs=Code)

```
┌──────────────────────┐     ┌────────────────────┐     ┌──────────────────┐
│  실코드              │ ←→  │ .bkit/state/       │ ←→  │ MEMORY.md        │
│  (agents/skills/lib) │     │ pdca-status.json   │     │ (auto-memory)    │
└──────────────────────┘     └────────────────────┘     └──────────────────┘
         ▲                              ▲                        ▲
         │                              │                        │
    [ENH-167]                     SessionStart             [ENH-201] 정합 교정
    version 동적화                 restore                   (이번 릴리스 완료)

v2.1.6 신규: invariant-checker (v2.2.0 후보)
  → SessionStart에서 3중 sync 검증, drift 감지 시 audit 경고
```

### 5.3 Agent 협업 그래프 (CTO Team 활성화 시)

```
User Request (/pdca team feature)
    ↓
cto-lead (opus)
    ├─→ pm-lead → pm-discovery + pm-strategy + pm-research + pm-prd
    ├─→ Task(enterprise-expert, infra-architect, frontend-architect) [병렬]
    ├─→ Task(security-architect) [ENH-206/208/209 기반]
    ├─→ Task(product-manager) → 요구사항 분석
    ├─→ Task(qa-strategist) → qa-lead → qa-test-planner/generator/monitor
    ├─→ Task(code-analyzer) [ENH-207 구조적 로깅 기반]
    ├─→ Task(gap-detector) → pdca-iterator (반복 루프)
    └─→ Task(report-generator) [haiku]

[ENH-209] disallowedTools 감사 완료 후 fork 안전성 보장
```

---

## 6. 리스크 및 완화

### 6.1 리스크 매트릭스

| # | 리스크 | 가능성 | 영향 | 완화 |
|---|--------|:---:|:---:|------|
| R1 | unified-stop.js 제거 후 legacy skill 실행 실패 | 중 | 높음 | E2E 3h + git revert plan |
| R2 | PreCompact 무한 차단 (사용자 blocking) | 저 | 높음 | bypass 3중 (manual/env/5분 snapshot) + 한국어 메시지 |
| R3 | context:fork race condition | 중 | 중 | READONLY 5 skills로 제한, G4 게이트 |
| R4 | settings.json deny로 워크플로우 차단 | 중 | 중 | `ask`로 완충 + CHANGELOG 가이드 |
| R5 | catch(_){} 래핑이 성능 저하 | 저 | 저 | debugLog는 기본 비활성, 환경변수로 opt-in |
| R6 | lib/context/ 삭제가 숨겨진 import 깨뜨림 | 저 | 높음 | Grep 전수 + npm test + staging 배포 |
| R7 | 67연속 호환성 깨짐 | 저 | 매우높음 | G7 Smoke test (CC v2.1.104 호환) |

### 6.2 Rollback 전략

**체크포인트 시점**:
1. v2.1.5 태그 직후 (baseline)
2. ENH-201/167/206 P0 완료 후 (Gate A)
3. ENH-188/203 P1 위험 변경 완료 후 (Gate B)
4. v2.1.6 릴리스 직전 (Gate C)

**Rollback 트리거**: Match Rate < 85%, Critical bug, 호환성 깨짐.

---

## 7. WBS (상세 공수)

| Phase | 항목 | 담당 agent (구현 시) | 공수 | 의존 |
|-------|------|----------|:---:|------|
| **P1. Docs=Code** (2h) | | | | |
| 1.1 | ENH-201 MEMORY.md 정합 | cto-lead | 30m | — |
| 1.2 | ENH-167 paths.js + lib/core/version.js | code-analyzer | 15m | — |
| 1.3 | ENH-210 design 문서 §9 추가 | design-validator | 30m | 1.1 |
| 1.4 | CHANGELOG/context-engineering.md | report-generator | 1h | 1.1~1.3 |
| **P2. 보안** (3h) | | | | |
| 2.1 | ENH-206 settings.json deny | security-architect | 30m | — |
| 2.2 | ENH-208 Bash 패턴 확장 | security-architect | 1h | — |
| 2.3 | ENH-209 agents disallowedTools 감사 | security-architect | 1h | — |
| 2.4 | 보안 E2E (permission/bash) | qa-monitor | 30m | 2.1~2.3 |
| **P3. 유기적 연동** (7h) | | | | |
| 3.1 | ENH-188 unified-stop.js 제거 | code-analyzer | 1h | — |
| 3.2 | ENH-188 E2E 3h (PDCA 사이클) | qa-strategist | 3h | 3.1 |
| 3.3 | ENH-207 catch(_){} 래핑 (43건) | code-analyzer | 2h | — |
| 3.4 | ENH-212 detectActiveSkill 정리 | code-analyzer | 30m | 3.1 |
| 3.5 | ENH-213 permission-manager 정리 | code-analyzer | 45m | — |
| **P4. Dead Code** (1h) | | | | |
| 4.1 | ENH-211 lib/context/ Grep 재확인 | gap-detector | 30m | — |
| 4.2 | 삭제 또는 와이어링 결정/실행 | cto-lead | 30m | 4.1 |
| **P5. CC v2.1.105 통합** (6h) | | | | |
| 5.1 | ENH-203 scripts/pre-compaction.js | bkit-impact-analyst | 2h | — |
| 5.2 | hooks.json PreCompact 등록 | bkit-impact-analyst | 30m | 5.1 |
| 5.3 | lib/pdca/snapshot.js 확장 | code-analyzer | 1h | 5.1 |
| 5.4 | PreCompact E2E (8 TC) | qa-monitor | 2.5h | 5.1~5.3 |
| **P6. DX** (2h) | | | | |
| 6.1 | ENH-202 context:fork 5 skills | skills architect | 1h | 2.3 (fork 격리) |
| 6.2 | fork race 테스트 (G4 게이트) | qa-monitor | 1h | 6.1 |
| **P7. QA/Release** (9h) | | | | |
| 7.1 | L1 TC 22건 작성 | qa-test-generator | 3h | all |
| 7.2 | L2 TC 14건 | qa-test-generator | 2h | all |
| 7.3 | L3 TC 28건 | qa-test-generator | 2h | all |
| 7.4 | L4 E2E 6건 + L5 4건 | qa-monitor | 1.5h | all |
| 7.5 | 릴리스 체크리스트 통과 | cto-lead | 30m | all |
| **합계** | | | **~30h** | |

### 일정 (1주일 핫픽스)

| Day | 작업 |
|:---:|------|
| 1 (월) | P1 Docs=Code + P2 보안 (5h) |
| 2 (화) | P3 유기적 연동 상반부 (ENH-188 작업 4h) |
| 3 (수) | P3 나머지 + P4 Dead Code (4h) |
| 4 (목) | P5 CC v2.1.105 통합 (6h) |
| 5 (금) | P6 DX + P7 QA 1차 (7h) |
| 6 (토) | 회귀 테스트, 릴리스 준비 |
| 7 (일) | 릴리스, CHANGELOG, 태그 |

---

## 8. 품질 게이트

### 8.1 v2.1.6 품질 게이트 (M1~M10 중 7개 적용)

| Gate | 조건 | 블로킹 |
|------|------|:---:|
| **G1** | context:fork 5 skills description ≤ 250자 | Yes |
| **G2** | 36 agents frontmatter (effort+maxTurns+model) 완전성 | Yes |
| **G3** | PreCompact hook timeout < 3,000ms | Yes |
| **G4** | pdca-status.json concurrent write 테스트 pass (fork 5 skills) | **Yes** |
| **G5** | Match Rate ≥ 90% | Yes |
| **G6** | Critical Issues = 0 (code-analyzer) | Yes |
| **G7** | 67연속 호환 유지 (CC v2.1.104 smoke) | **Yes** |

### 8.2 QA 전략 (74 TC)

| Level | TC 수 | 범위 |
|:---:|:---:|------|
| L1 Unit | 22 | hook handler 함수 |
| L2 Integration | 14 | hook→script→lib 체인 |
| L3 Component | 28 | 5 fork skills + 16 agent frontmatter |
| L4 E2E | 6 | PDCA 완전 사이클 |
| L5 User | 4 | 실제 사용자 워크플로우 |

### 8.3 OWASP Top 10 목표

| OWASP | 이전 | v2.1.6 | 방법 |
|-------|:---:|:---:|------|
| A01 Access Control | FAIL | **PASS** | ENH-206 |
| A03 Injection | 부분 FAIL | **PASS** | ENH-208 |
| A05 Misconfig | FAIL | **PASS** | ENH-206 |
| A09 Logging | 부분 | **개선** | ENH-207 |
| A10 SSRF | FAIL | **PASS** | ENH-208 |

---

## 9. 릴리스 체크리스트

### Pre-release (코드 완료 전)

- [ ] 5 context:fork skills description ≤ 250자 lint (grep + wc -m)
- [ ] 36 agents frontmatter 3-field 완전성 (effort/maxTurns/model)
- [ ] context-compaction.js 실행 시간 < 1,000ms 측정
- [ ] monitors manifest 충돌 없음 (plugin.json 무변경 확인, v2.2.0 연기)
- [ ] bkitVersion 하드코딩 0건 (grep `'2\.0\.` → 0 hits)

### Integration

- [ ] PreCompact → pre-compaction → snapshot → decision:block 체인 정상
- [ ] PostCompact → post-compaction → 복원 정상 (기존 동작)
- [ ] context:fork 5 skills 병렬 실행 중 pdca-status.json 무결성 유지
- [ ] hooks.json/plugin.json 버전 문자열 v2.1.6 동기화

### Regression

- [ ] CC v2.1.104 기준 21개 hook event 정상 발화 smoke test
- [ ] SessionStart / SubagentStart / SubagentStop 3 hook 확인
- [ ] PreToolUse Write|Edit / Bash matcher 정상
- [ ] PDCA E2E: plan → design → do → check → act (mock feature)

### Security

- [ ] settings.json deny로 `.env` Read 차단 확인
- [ ] Bash 20+ destructive 패턴 매칭 테스트
- [ ] fork 5 skills에서 disallowedTools 격리 확인

### Release

- [ ] CHANGELOG.md v2.1.5 → v2.1.6 동기화
- [ ] MEMORY.md 수치 정합 (skills 38, agents 36, lib 97)
- [ ] git tag v2.1.6, push
- [ ] GitHub release note (ENH-201~213 목록)

---

## 10. v2.2.0 / v3.0.0 경로

### v2.2.0 (3~4주 후, 마이너 릴리스)

**포함 후보**:
- monitors manifest 실제 구현 (POC → production)
- context:fork 전면 확대 (file-lock 도입 후, Top 10)
- Skill desc 1,536자 선별 재확장 (5개 복잡 skills)
- PermissionDenied hook (Auto Mode GA 대비)
- RTK 차용 Phase 1 (ENH-R01/R08: output-filter, hook-safety)
- invariant-checker (3중 sync drift 감지)

### v3.0.0 (Q3 2026, 메이저 릴리스)

**포함 후보**:
- Clean Architecture T0~T5 (32건 ENH)
- lib/pdca/state-machine.js 분할 (948 LOC → 3 모듈)
- audit-logger 싱글턴 정규화
- lib/context/ 와이어링 (v2.1.6에서 삭제 결정 시 재도입)
- RTK 차용 전 Phase 완료 (세션당 30~50% 토큰 절감)
- Dead code <5% 목표 (현재 51%)
- 테스트 커버리지 70% (현재 ~35%)

---

## 11. 결론 및 CTO 메시지

### 핵심 3줄

1. **v2.1.6은 "정비 릴리스"다** — 신기능 최소, 내부 품질 최대. 11명 CTO Team 합의.
2. **유기적 연동 복원이 최대 레버리지** — ENH-188(unified-stop 정리) + ENH-207(catch 래핑) + ENH-167(version 동적화)이 v3.0 Clean Arch 발판.
3. **Breaking 0 기록 67연속을 반드시 지켜라** — G7 smoke test 블로킹, RTK/Clean Arch는 v2.2.0/v3.0.0로 분리.

### 예상 효과

| 지표 | Before | After | Δ |
|------|:---:|:---:|:---:|
| Critical Issues | 5건 | 0건 | −5 |
| Dead Code | 51% | ~30% | −21% |
| OWASP 준수 | 6/10 | 9/10 | +3 |
| catch(_){} 무조건삼킴 | 43건 | 0건 | −43 |
| hardcoded version | 2곳 | 0 | −2 |
| CC 고급기능 채택률 | ~70% | ~80% | +10% |
| 유기적 연동 품질 | 7.2/10 | 8.5/10 | +1.3 |
| Match Rate | ~75% | ≥95% | +20% |
| bkit 연속 호환 | 67 | **68** | +1 |
| 신규 ENH | — | **13건** (201,167,188,202,203,206~213) | +13 |

### 다음 단계

- [ ] 본 계획서 검토 및 승인
- [ ] `docs/02-design/features/bkit-v216-enhancement.design.md` 작성 (Do phase 진입 전)
- [ ] `/pdca team bkit-v216-enhancement` 실행 → 본 plan 기반 자동 구현

---

**Agent Team 참여**:
- Skills Architect, Agents Architect, Hooks Integrator, MCP Engineer (Explore × 4)
- CC Feature Integrator, Gap Detector (bkit-impact-analyst, gap-detector)
- Code Quality Analyst (code-analyzer)
- QA Strategist, Security Architect, Enterprise Expert
- **총 11명 병렬 실행, 전체 분석 시간 ~18분**

**참고 문서**:
- `docs/04-report/features/cc-v21105-impact-analysis.report.md`
- `docs/01-plan/features/bkit-v300-clean-architecture-enhancement.plan.md`
- `docs/01-plan/features/rtk-inspired-bkit-enhancement.plan.md`
- `memory/MEMORY.md` (ENH 이력)
