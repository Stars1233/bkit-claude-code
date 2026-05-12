---
feature: bkit-v2111-integrated-enhancement
phase: 03-analysis
type: cc-impact-analysis
status: Draft — Impact Analysis 완료
cc-from: 2.1.117
cc-to: 2.1.118
cc-release-date: 2026-04-23
bkit-baseline: 2.1.10 (main merged, commit f2c17f3)
bkit-target: 2.1.11 (Plan + Design 완료, Precondition 대기)
last-enh: ENH-276
created: 2026-04-23
author: kay kim + bkit-impact-analyst agent
related:
  - plan: docs/01-plan/features/bkit-v2111-integrated-enhancement.plan.md
  - design-index: docs/02-design/features/bkit-v2111-integrated-enhancement.design.md
  - design-α: docs/02-design/features/bkit-v2111-sprint-alpha.design.md
  - design-β: docs/02-design/features/bkit-v2111-sprint-beta.design.md
  - design-γ: docs/02-design/features/bkit-v2111-sprint-gamma.design.md
  - design-δ: docs/02-design/features/bkit-v2111-sprint-delta.design.md
---

# CC v2.1.117 → v2.1.118 — bkit v2.1.11 영향 분석

> **Summary**: CC v2.1.118 은 **Breaking 0건** 의 호환 릴리스로 76번째 연속 호환을 달성한다. 4건의 HIGH-impact 변경(F1/F7/F9/X13)은 모두 **bkit v2.1.11 Sprint 구조와 자연스럽게 결합 가능한 Opportunity** 이며, 19 FR 중 **0 FR 재설계 필요**, **5 FR 개선 기회**, **3 FR 신규 편입 권고**, **2 FR v2.1.12 이월 권고**로 집계된다. Precondition 이 여전히 클리어되어 있다면 **v2.1.11 GO 판정 + 가벼운 Plan/Design 수정(7곳)** 만으로 진행 가능.

---

## Executive Summary

| 관점 | 수치 | 근거 |
|------|:---:|------|
| **v2.1.11 흡수 권고 ENH** | **3건** (ENH-277 P0 / ENH-279 P1 / ENH-280 P1) | HIGH 4건 중 3건이 Sprint δ·γ 와 자연 결합 |
| **v2.1.12+ 이월 ENH** | **1건** (ENH-278 P2) | autoMode `$defaults` 는 bkit autoMode 미사용 — 효과 한정 |
| **기존 FR 수정 필요** | **5 FR** (FR-α5 / FR-δ1 / FR-δ5 / FR-β4 / FR-γ3) | 경량 텍스트·테스트 확장 — Architecture 변경 없음 |
| **신규 FR 추가 권고** | **2 FR** (FR-δ6 Release Automation / FR-γ4 Agent-Hook 다중 이벤트) | Sprint δ·γ 에 Option C Pragmatic 수준 편입 |
| **방어선 업데이트** | **3건** (76 연속 호환 갱신 / MON-CC-06 유지 / ENH-214 유지) | CC v2.1.118 에서 직접 해소 0건 |
| **Philosophy 준수** | **3/3 유지** | 3건 ENH 모두 Automation First · No Guessing · Docs=Code 준수 |

**종합 판정**: ✅ **GO** — v2.1.11 진행. 단, **7곳 Plan/Design 텍스트 패치** 를 Precondition Phase 중 완료하고, ENH-277/279/280 을 Sprint δ 에 흡수한다.

**권고 실행 순서**:
1. Precondition Phase 중 Plan §5.2 NFR + §7 Risks + §Appendix C 3곳 패치 (10분 이내)
2. Design Index §5 Contract + §6 Docs=Code + §9 CI Matrix 3곳 패치 (20분 이내)
3. Sprint δ Design 에 FR-δ6 (Release Automation) 신규 항목 추가 (30분 이내)
4. Sprint γ Design 에 FR-γ4 (Agent-Hook 다중 이벤트) 선택적 편입 여부 결정 (10분 이내)
5. Sprint α 착수 (Precondition 완료 후)

---

## 1. 매핑 매트릭스 (CC 변경 × bkit v2.1.11)

### 1.1 HIGH-Impact 매핑

| CC 변경 | Type | Impact | 영향 Sprint | FR 수정? | 신규 FR? | Contract? | Test? | ENH |
|---------|:----:|:------:|:----------:|:--------:|:--------:|:---------:|:-----:|:---:|
| **F1** Hooks × MCP tool 직접 호출 | Feature | HIGH | **δ** (β 부분) | FR-δ1 수정 | — | δ1 +2 assertions | L3 +2 TC | **ENH-277 P0** |
| **F7** autoMode `$defaults` merge | Feature | HIGH | (미해당) | — | — | — | — | **ENH-278 P2 이월** |
| **F9** `claude plugin tag` 명령 | Feature | HIGH | **δ** (Governance) | FR-δ5 확장 | **FR-δ6 신규** | — | +3 TC | **ENH-279 P1** |
| **X13** Agent-type hooks 다중 이벤트 복원 | Fix | HIGH | **γ** (β 부분) | FR-γ3 scenarios +1 | **FR-γ4 선택적** | γ3 +1 assertion | L5 +1 scenario | **ENH-280 P1** |

### 1.2 MEDIUM-Impact 매핑

| CC 변경 | Type | Impact | 영향 Sprint | 처리 방향 |
|---------|:----:|:------:|:----------:|-----------|
| F3 `/cost`+`/stats` → `/usage` 병합 | Feature | MED | **δ** (FR-δ4 token-report) | Design §5.1 에 "`/usage` 와의 관계" 1 paragraph 추가 — v2.1.118+ 사용자는 `/usage` 도 병행 사용 가능 |
| F4 Custom themes | Feature | MED | (미해당) | Sprint δ Opportunity 로 기록만, 구현은 v2.1.12+ |
| F5 `DISABLE_UPDATES` env | Feature | MED | **α** (FR-α5) | cc-version-checker 가 env 감지 시 check skip 하도록 1줄 가드 추가 권고 |
| F13 Plugin version-constraint skip 가시성 | Feature | MED | **δ** (FR-δ5 ADR) | ADR 0002 §10.3 Skip 절차에 "CC native 가시성 경유" 1줄 추가 |
| X2/X3/X7/X9 MCP OAuth bugfix | Fix | MED | (간접) | 영향 없음 — bkit MCP 는 stdio transport, OAuth 미사용 |
| X14 prompt hooks verifier re-fire | Fix | MED | **β** (FR-β3 error-handler) | Design §6 에 re-fire 인지 유의사항 기록 — 실제 영향 없음 |
| X19 plugin install on already-installed | Fix | MED | (미해당) | bkit CI install path 영향 없음 |
| X22 Subagents resumed via SendMessage cwd | Fix | MED | **γ** (CTO Team 패턴) | L5 scenario 1 (PM sub-agents) 신뢰성 ↑, 추가 작업 불요 |

### 1.3 미매핑 (No Action)

- LOW-impact 변경 전량: bkit 에 직간접 영향 없음

---

## 2. Sprint 별 구체 보완 patch

### 2.1 Sprint α 보완 (경량 1곳)

**대상**: `docs/02-design/features/bkit-v2111-sprint-alpha.design.md` §3.3 CC Version Compat Map

**수정 전**:
```javascript
const FEATURE_VERSION_MAP = {
  "agentTeams": "2.1.117",
  "loopCommand": "2.1.71",
  "promptCaching1h": "2.1.108",
  "contextFork": "2.1.113",
  "opus1MCompact": "2.1.113",
};
```

**수정 후** (2줄 추가):
```javascript
const FEATURE_VERSION_MAP = {
  "agentTeams": "2.1.117",
  "loopCommand": "2.1.71",
  "promptCaching1h": "2.1.108",
  "contextFork": "2.1.113",
  "opus1MCompact": "2.1.113",
  "hookMcpToolDirect": "2.1.118",      // F1 — ENH-277
  "pluginTagCommand": "2.1.118",       // F9 — ENH-279
  "agentHookMultiEvent": "2.1.118",    // X13 — ENH-280
};

// F5 (DISABLE_UPDATES env) 지원: cc-version-checker 가 env 감지 시 check skip
function checkCCVersion() {
  if (process.env.DISABLE_UPDATES === '1') return { skipped: true };
  // ... 기존 로직
}
```

**수정 근거**: α5 가 v2.1.118 신규 기능까지 인지하도록 확장. 사용자 환경이 CI 등 DISABLE_UPDATES 인 경우 silent degrade (F5).

**영향**:
- L1 TC #4 fixture 확장 (FEATURE_VERSION_MAP entry 5→8)
- DoD 영향 없음 (기존 5 FR 그대로)

---

### 2.2 Sprint β 보완 (경량 1곳, 주석)

**대상**: `docs/02-design/features/bkit-v2111-sprint-beta.design.md` §4.3 `/pdca watch` + §6 Error Handling

**추가 섹션 (§4.3 말미 주석)**:
```
> **CC v2.1.118 X14 대응**: prompt hooks verifier re-fire 가 PreToolUse/PostToolUse 에
> 재발화 가능. /pdca watch 는 read-only tail 이라 영향 없음 — 방어 불요.
```

**추가 섹션 (§6 Error Handling 표에 1행 추가)**:
```
| E-β3-03 | CC v2.1.118 prompt hook re-fire 에서 error-handler 중복 번역 | idempotent message hash 캐싱 (1회 세션당) |
```

**수정 근거**: X14 의 re-fire 가 β3 에러 번역 hook 에 영향을 줄 수 있음. 캐싱으로 방어.

**영향**:
- L2 TC 신규 1개 (재발화 duplicate 방지) — 총 25 → 26
- Contract 영향 없음

---

### 2.3 Sprint γ 보완 (중형 2곳)

#### 2.3.1 FR-γ3 L5 9-scenario 확장

**대상**: `docs/02-design/features/bkit-v2111-sprint-gamma.design.md` §5.1 Scenario Matrix + §5.2 Implementation

**수정 전**:
```
| 1 | PM | pm-lead spawns 3 sub-agents + PRD generated | Yes | Skip-if-no-env |
```

**수정 후**:
```
| 1 | PM | pm-lead spawns 3 sub-agents + PRD generated + cwd 복원 (CC v2.1.118 X22) | Yes | Skip-if-no-env |
```

**§5.2 scenario 1 it() 블록에 assertion 추가**:
```typescript
it('[1/9] PM — pm-lead spawns sub-agents + PRD + cwd 복원', async () => {
  if (!hasAgentTeams) return test.skip(true, 'Agent Teams env required');
  // 기존: PRD 생성 검증
  // NEW (v2.1.118 X22 대응): resumed subagent 의 cwd === original cwd
  expect(resumedSubagentCwd).toBe(originalCwd);
});
```

**수정 근거**: X22 subagent cwd 복원 수정으로 CTO Team 패턴이 reliable 해짐. Regression guard 로 assert 추가.

**영향**:
- L5 9 scenario 유지 (count 불변)
- Contract +0 (기존 9 scenario assertion 에 포함)

#### 2.3.2 FR-γ4 Agent-Hook 다중 이벤트 활용 (신규, 선택적)

**대상**: `docs/02-design/features/bkit-v2111-sprint-gamma.design.md` §1.1 Design Goals + §11 Implementation Guide + §12 DoD

**§1.1 Design Goals 에 bullet 추가**:
```
- **Agent-Hook 다중 이벤트 활용** (FR-γ4, 선택적): v2.1.118 X13 fix 로 agent-type hook
  을 Stop/SubagentStop 외 SessionStart/UserPromptSubmit 등에도 연결 가능. CTO Team
  패턴을 Stop 시점뿐 아니라 SessionStart 시점에도 트리거 가능성 검증.
```

**§11 Implementation Guide §11.1 File Structure 에 1줄 추가** (선택적):
```
hooks/
└── hooks.json                       [MODIFY — FR-γ4 선택적]  + CTO Team agent hook
                                                               SessionStart 이벤트 시험 연결
```

**§12 DoD 에 1줄 추가** (선택적):
```
- [ ] **FR-γ4 선택적 검증**: v2.1.118 X13 fix 전후로 agent-hook 다중 이벤트 연결 테스트.
  영향 있으면 CTO Team 패턴 확장 (v2.1.12 스콥), 영향 없으면 결정 문서화만.
```

**수정 근거**: X13 은 BUG FIX 이므로 이미 깨진 기능이 복원되는 것. bkit 이 기존에 workaround 로 Stop-only 제한을 했다면 이제 풀 수 있음. 단 workaround 실존 여부 확인 필요 → **Do phase Turn 1 에서 `grep -rn "Stop\|SubagentStop" hooks/hooks.json lib/orchestrator/` 로 사전 조사**.

**영향**:
- FR 수 19 → 19 (γ4 는 선택적, 미편입 시 v2.1.12 ENH-280)
- Complexity XS (조사 + 결정 문서화)

---

### 2.4 Sprint δ 보완 (중형 3곳 + 신규 FR 1개)

#### 2.4.1 FR-δ1 MCP Port Design 확장 — F1 (Hook × MCP Tool)

**대상**: `docs/02-design/features/bkit-v2111-sprint-delta.design.md` §2.2 MCP Port Contract + §4.2

**§2.2 말미에 섹션 추가 (CC v2.1.118 F1 대응)**:
```markdown
### 2.2.1 F1 — Hook × MCP Tool 직접 호출 비교 표 (CC v2.1.118 신규)

| 호출 경로 | v2.1.10 이전 | v2.1.11 + CC v2.1.118 |
|-----------|--------------|----------------------|
| Skill → MCP Tool | ✓ (MCP transport) | ✓ 유지 |
| Slash Command → MCP Tool | ✓ (via skill) | ✓ 유지 |
| Hook → MCP Tool | ✗ (subprocess child or 직접 require 만) | **✓ (hooks.json type: "mcp_tool" 신규)** |

**bkit Port 관점**:
- MCP Port interface (§2.2) 는 호출자(caller) 와 독립적 — skill/slash/hook 모두 동일 Port 사용
- `lib/infra/mcp-port-registry.js` 에 `callPaths: ['skill', 'slash', 'hook']` 메타데이터 추가 권고
- hooks.json `type: "mcp_tool"` 활용은 **v2.1.12 스콥** (ENH-277 P0)
- v2.1.11 에서는 **Port 설계만** F1 수용 가능하도록 — 구현은 v2.1.12
```

**§4.2 MCP Port Interface 에 문장 1개 추가**:
```
> **CC v2.1.118 F1 주의**: Hook 이 MCP tool 을 직접 호출할 수 있게 되었으나,
> v2.1.11 bkit 은 기존 subprocess 경로 유지. Port interface 설계는 이 미래 경로를
> 수용하도록 호출자 독립적으로 정의 (ENH-277).
```

**수정 근거**: F1 은 hooks 에서 MCP tool 직접 호출이라는 근본 변화. Port 추상화 (δ1) 가 이 새 호출 경로까지 포괄할 수 있도록 **설계 시점에 미리 수용**. 실제 구현은 v2.1.12 로 이월.

**영향**:
- Contract +2 assertions (Port 가 caller-agnostic 임을 assert)
- L3 TC 변경 없음 (v2.1.12 스콥)

#### 2.4.2 FR-δ5 CC Upgrade Policy ADR 확장 — F5, F13

**대상**: `docs/02-design/features/bkit-v2111-sprint-delta.design.md` §10 ADR 0002 Synopsis

**§10.3 Decision 에 bullet 추가**:
```
- **Skip 절차 확장**:
  1. `docs/03-analysis/cc-v2.1.X-skip-rationale.md` 작성
  2. MEMORY.md 업데이트
  3. GitHub issue 로 skip 공표
  4. **F13 대응 (v2.1.118)**: plugin version-constraint skip 가시성 활용 —
     bkit.config.json `engines.claudeCode: "<2.1.X"` 선언으로 CC 자체가 사용자에게 경고
  5. **F5 대응 (v2.1.118)**: enterprise 배포 환경에서 `DISABLE_UPDATES=1` 가이드 —
     제어된 upgrade 주기 운영 기업을 위한 README 섹션 추가 권고
```

**수정 근거**: F5/F13 은 바로 ADR 0002 에 녹일 수 있는 운영 기준. ADR 가 실행 가이드를 포함해야 Governance 측면 완결.

**영향**:
- ADR 0002 내용만 확장 — FR 수 불변
- Complexity 영향 없음

#### 2.4.3 FR-δ6 Release Automation (신규) — F9

**대상**: `docs/02-design/features/bkit-v2111-sprint-delta.design.md` 전체 (신규 FR)

**신규 FR 정의** (Plan §3.1 Sprint δ + Design §2 에 추가):
```markdown
- [ ] **FR-δ6**: **Release Automation `claude plugin tag` 통합**
  (CC v2.1.118 F9)
  - 현재: v2.1.10 릴리스 시 `git tag v2.1.10` + `gh release create` 수동
  - 신규: `claude plugin tag v2.1.11` 실행 → version validation + git tag 자동 생성
  - bkit BKIT_VERSION SoT (`bkit.config.json:version`) 와 일치 검증
  - scripts/release-plugin-tag.sh (신규) — plugin tag + release notes 템플릿 연동
```

**Design §2.0 Option 표에 추가**:
```
| δ6 Release Automation | manual only | plugin tag + gh + sign | **claude plugin tag + scripts 얇은 래퍼** |
```

**Design §11.1 File Structure 에 추가**:
```
scripts/
├── check-mcp-port-drift.js           [NEW] — I3 invariant
├── check-quality-gates-ssot.js       [NEW] — I4 invariant
└── release-plugin-tag.sh             [NEW] — δ6, `claude plugin tag` wrapper
```

**Design §11.2 Implementation Order 에 추가**:
```
16. [ ] **δ6-a**: `scripts/release-plugin-tag.sh` — `claude plugin tag v{version}` wrapper
17. [ ] **δ6-b**: BKIT_VERSION SoT ↔ plugin tag version 일치 검증 (CI gate)
18. [ ] **δ6-c**: Release Notes 템플릿 연동 (`docs/04-report/features/bkit-v2111-*.report.md`)
```

**§12 DoD 에 1줄 추가**:
```
- [ ] **FR-δ6**: `claude plugin tag` wrapper 동작, BKIT_VERSION 일치 CI 통과
```

**수정 근거**: F9 `claude plugin tag` 는 bkit 의 릴리스 discipline 에 직접 적합. v2.1.10 release 에서 "git tag 대기" 가 Precondition P3 로 남아있다는 사실 자체가 수동 부담을 증명. v2.1.11 부터는 자동화.

**영향**:
- FR 수 19 → **20** (Sprint δ 5 → 6)
- Complexity XS (얇은 wrapper script)
- TC +3 (version 일치 / tag 생성 / release notes 연동)
- Docs=Code invariant +0 (기존 BKIT_VERSION 6-location invariant 재활용)

---

## 3. 신규 ENH 상세

### ENH-277 — Hook × MCP Tool Direct Invocation (P0)

**WHY**: CC v2.1.118 F1 으로 hooks.json `type: "mcp_tool"` 이 공식 지원. bkit 현재 hook 은 MCP tool 호출 시 subprocess spawn 또는 require 필요 → 불필요한 overhead + 복잡도. F1 활용 시 hook overhead 감소 + Port abstraction 이 호출 경로 독립적으로 확장 가능.

**WHAT**:
1. `lib/infra/mcp-port-registry.js` 에 `callPaths: ['skill','slash','hook']` 메타데이터 추가
2. MCP Port interface (δ1) 가 caller-agnostic 임을 Contract test 로 명시
3. v2.1.12 에서 선택 hook 1개 (예: audit-logger) 를 `type: "mcp_tool"` 로 전환 pilot

**WHERE**:
- `lib/domain/ports/mcp-tool.js` (JSDoc 보강)
- `lib/infra/mcp-port-registry.js` (메타데이터 추가)
- `tests/contract/mcp-port.test.js` (+2 TC)
- `hooks/hooks.json` (v2.1.12 에서 pilot)

**HOW**: **XS** (v2.1.11 스콥 — Port 확장만)
**WHEN**: **v2.1.11 Sprint δ** (δ1 확장), 구현 pilot 은 v2.1.12

**DoD**:
- Port JSDoc 에 `callPaths` 명시
- Registry 에 16 tool 전량 callPaths meta 추가
- Contract +2 assertions PASS
- v2.1.12 플래닝에 "audit-logger hook → mcp_tool 전환 pilot" 기록

---

### ENH-278 — autoMode `$defaults` Migration (P2 — 이월)

**WHY**: CC v2.1.118 F7 은 `autoMode.allow/soft_deny/environment` 배열에 `"$defaults"` sentinel 을 넣으면 CC 내장 룰과 자동 병합. 그러나 **bkit 은 autoMode 미사용** (plugin.json `autoMode` 섹션 0) — 직접 효과 0.

**WHAT**: (v2.1.12 이월)
- Enterprise 배포용 템플릿 `plugin-autoMode-sample.json` 제공 시 `$defaults` 활용
- 문서화만, 실 기능 변경 없음

**WHERE**: `docs/reference/enterprise-deployment.md` (v2.1.12 신규)

**HOW**: **XS** (문서만)
**WHEN**: **v2.1.12** 이월

**DoD**: Enterprise 배포 문서 1 섹션

---

### ENH-279 — Release Automation `claude plugin tag` 통합 (P1)

**WHY**: F9 `claude plugin tag` 는 plugin release 시 git tag 자동 생성 + version validation 을 CC 가 보장. 현재 bkit 은 Precondition P3 "git tag v2.1.10 대기" 가 수동 부담으로 남아있음. v2.1.11 부터 자동화.

**WHAT**:
1. `scripts/release-plugin-tag.sh` — `claude plugin tag v{version}` wrapper + BKIT_VERSION 일치 검증
2. CI gate 로 "BKIT_VERSION ↔ plugin tag version" 동기 보장
3. Release Notes 템플릿 (`docs/04-report/features/bkit-v{VERSION}-integrated-enhancement.report.md`) 자동 참조
4. Plan `§Appendix C CHANGELOG 스켈레톤` 에 "claude plugin tag v2.1.11" 단계 추가
5. Design `§12.3 GA Release Phase` 4 번 단계 → `claude plugin tag v2.1.11` 로 교체

**WHERE**:
- `scripts/release-plugin-tag.sh` (NEW)
- `docs/02-design/features/bkit-v2111-sprint-delta.design.md` (§11.1 / §11.2 / §12)
- `docs/02-design/features/bkit-v2111-integrated-enhancement.design.md` (§12.3)
- `.github/workflows/release.yml` (optional CI integration)

**HOW**: **XS** (shell script + CI 1줄)
**WHEN**: **v2.1.11 Sprint δ** (신규 FR-δ6)

**DoD**:
- `scripts/release-plugin-tag.sh` 실행 시 BKIT_VERSION 불일치 검출 → exit 1
- v2.1.11 GA 릴리스 시 실 사용하여 git tag + GitHub Release 생성
- L2 integration TC 3개 (version 일치 / tag 생성 / release notes ref)

---

### ENH-280 — Agent-Hook 다중 이벤트 활용 (P1 — 선택적)

**WHY**: CC v2.1.118 X13 fix 는 agent-type hook 이 Stop/SubagentStop 외 이벤트에도 정상 연결 가능하도록 복원. bkit 의 CTO Team 패턴은 현재 Stop-family 위주 — 만약 workaround 가 있다면 제거 가능, 없다면 SessionStart/UserPromptSubmit 에도 agent-hook 연결로 **Proactive CTO Team** 가능.

**WHAT**:
1. `grep -rn "Stop\|SubagentStop" hooks/hooks.json lib/orchestrator/` 로 현재 사용 실태 조사
2. Workaround 실존 시 → 제거 (v2.1.118+ 에서 정상)
3. Workaround 없으면 → SessionStart/UserPromptSubmit 에 agent-hook 연결 실험
4. L5 scenario 1 (PM sub-agents) 에 X13 regression assertion 추가

**WHERE**:
- `hooks/hooks.json` (v2.1.12 에서 확장)
- `lib/orchestrator/team-protocol.js`
- `tests/e2e/pdca-full-cycle-9scenario.spec.ts` (§5.2 scenario 1)

**HOW**: **S** (조사 + 결정 + assertion)
**WHEN**: **v2.1.11 Sprint γ** (선택적 FR-γ4, 조사만 필수 / 확장 v2.1.12)

**DoD**:
- Do phase Turn 1 에서 grep 조사 완료
- L5 scenario 1 에 "agent-hook 다중 이벤트 정상 동작" assertion 추가
- 확장 필요 시 v2.1.12 ENH-280b 로 backlog

---

## 4. Plan 문서 수정 제안

**대상**: `docs/01-plan/features/bkit-v2111-integrated-enhancement.plan.md`

### 4.1 §5.2 NFR Compatibility 업데이트

**수정 전 (§5.2 첫 행)**:
```
| **Compatibility** | v2.1.10 → v2.1.11 upgrade breaking change **0건** | `plugin.json` 의 `description`/`keywords`/`engines` diff · 기존 feature 자동 마이그레이션 테스트 |
```

**수정 후 (각주 추가)**:
```
| **Compatibility** | v2.1.10 → v2.1.11 upgrade breaking change **0건** (CC **76 연속 호환**, v2.1.118 검증 2026-04-23)¹ | `plugin.json` 의 `description`/`keywords`/`engines` diff · 기존 feature 자동 마이그레이션 테스트 |

¹ v2.1.117 → v2.1.118 Impact Analysis: `docs/03-analysis/cc-v2117-v2118-bkit-v2111-impact.md`
```

### 4.2 §7 Risks 신규 RA-11 추가

```
| **RA-11** | CC v2.1.118 F1 Hook×MCP 기능이 Sprint δ Port 설계 시점에 맞지 않음 | Medium | Low | ENH-277 은 **Port 확장만** v2.1.11 스콥, 실 hook 전환은 v2.1.12 pilot. v2.1.11 진행 blocker 아님 |
| **RA-12** | CC v2.1.118 X13 Agent-Hook fix 가 bkit 기존 workaround 와 충돌 | Medium | Low | Sprint γ FR-γ4 (선택적) 에 Do Turn 1 조사 배치. 충돌 실측 시 workaround 제거, 없으면 문서화 |
```

### 4.3 §3.1 Sprint δ features 신규 항목 추가

```
- [ ] **FR-δ6**: **Release Automation `claude plugin tag` 통합** (CC v2.1.118 F9, ENH-279)
```

### 4.4 §5.1 Functional Requirements 표에 행 추가

```
| FR-δ6 | Release Automation — `claude plugin tag` wrapper | δ | Low | XS | Pending |
```

### 4.5 §Appendix C CHANGELOG 스켈레톤 확장

`### Added` 섹션 말미에 추가:
```
- [FR-δ6] Release Automation — `scripts/release-plugin-tag.sh` + `claude plugin tag` (CC v2.1.118 F9)
- [ENH-277] MCP Port caller-agnostic design (hook direct invocation 수용, v2.1.12 pilot 준비)
- [ENH-280] Agent-hook multi-event regression guard (CC v2.1.118 X13)
```

`### Quality Gates` 섹션에 추가:
```
- CC Compatibility: v2.1.117 + v2.1.118 (76 연속 호환, 0 breaking)
```

### 4.6 §Appendix B v2.1.10 대비 증분 표 업데이트

```
| Skills | 39 | **41** (+/bkit explore + /bkit evals run) | +2 |
```
기존 유지. 단 **Scripts** 행 수정:
```
| Scripts | 47 | **48** (+ release-plugin-tag.sh) | +1 |
```

---

## 5. Design Index 수정 제안

**대상**: `docs/02-design/features/bkit-v2111-integrated-enhancement.design.md`

### 5.1 §5.1 Invocation Contract 신규 Assertions 표 확장

기존:
```
| 총합 | — | — | 51 → 240+ 달성 |
```

수정 후 (행 추가):
```
| δ | δ1 | Port caller-agnostic (ENH-277) | 2 |
| γ | γ3 | X22 subagent cwd 복원 regression assertion | 1 (scenario 1 내) |
| δ | δ6 | `scripts/release-plugin-tag.sh` BKIT_VERSION 일치 | 1 |
| **총합** | — | — | **55 → 241+ 달성** |
```

### 5.2 §6 Docs=Code CI 영향 — 9 count 유지 (변경 없음)

변경 없음 (δ6 는 Scripts count 에만 영향 — 기존 scripts count 47 → 48).

### 5.3 §6.3 신규 Invariants 표 확장 (I5 추가)

```
| **I5** | **BKIT_VERSION ↔ plugin tag 일치** — `claude plugin tag {version}` 실행 결과 === `bkit.config.version` (ENH-279) | `scripts/release-plugin-tag.sh` + CI gate |
```

### 5.4 §9.1 CI Jobs 추가 (1개)

```
| `check-plugin-tag-version` | δ | `scripts/release-plugin-tag.sh --dry-run` → BKIT_VERSION 일치 검증 | 0 |
```

### 5.5 §4 Dependency Graph — 변경 없음

Sprint 병렬 관계 유지. ENH-277/279/280 모두 Sprint δ·γ 내부 개선 — 새 edge 0.

### 5.6 §3 Sprint Overview Matrix 업데이트

**수정 전**:
```
| **δ** | Port Extension & Governance | 5 | Medium | 6~8 | 3~4 |
```

**수정 후**:
```
| **δ** | Port Extension & Governance | **6** | Medium | **7~9** | 3~4 |
```

`**총합** | — | 19 → **20** | ...`

### 5.7 §10.2 Recommended Session Plan — Sprint δ turns 조정

```
| 6 | Do | `--scope sprint-delta` | 40~55 → **45~58** |
```
(FR-δ6 XS 로 3 turn 추가)

---

## 6. 방어선 업데이트

### 6.1 MON-CC-02 (#47855 Opus 1M /compact) — 유지

- 상태: **해소 없음**, v2.1.118 에서 직접 수정 없음
- 방어선: `scripts/context-compaction.js:44-56` 유지
- v2.1.113 #32 fix tentative 여전히 유효

### 6.2 MON-CC-06 (19 tracked) — 유지

- 직접 해소 0건
- X13/X14 주제 확인: X13 은 agent-hook 다중 이벤트 fix, X14 는 prompt hooks verifier re-fire — 기존 MON-CC-06 19건과 주제 독립
- **19건 유지** (v2.1.118 신규 issue 없음)

### 6.3 ENH-214 (#47482 output styles frontmatter) — 유지

- 상태: **10+ releases OPEN** (v2.1.118 에서도 해소 없음)
- 방어선: `scripts/user-prompt-handler.js` 유지

### 6.4 76 연속 호환 갱신

- **v2.1.34 ~ v2.1.118 = 76 연속 호환**
- MEMORY.md 업데이트:
  - "Consecutive compatible releases: 75 → **76**"
  - "MON-CC-06: 19 tracked (v2.1.113 native 10 + v2.1.114~118 HIGH 6 + v2.1.117 HIGH 3)"

### 6.5 cc_version_history_v21xx.md 업데이트

신규 엔트리 추가 (요약):
```
v2.1.118 (2026-04-23):
- HIGH: F1 Hook×MCP Tool, F7 autoMode $defaults, F9 claude plugin tag, X13 Agent-hook multi-event fix
- MEDIUM: F3 /usage merge, F4 themes, F5 DISABLE_UPDATES, F13 version-constraint visibility, X2/X3/X7/X9/X14/X19/X22
- bkit impact: ENH-277 (P0) + ENH-278 (P2 이월) + ENH-279 (P1) + ENH-280 (P1 선택)
- Breaking: 0, 76 연속 호환
```

---

## 7. Philosophy Compliance Check

### 7.1 3 Philosophy 준수 매트릭스

| ENH | Automation First | No Guessing | Docs=Code | 종합 Verdict |
|:---:|:---------------:|:-----------:|:---------:|:-----------:|
| **ENH-277** | ✅ hook → MCP 전환으로 subprocess overhead 자동 제거 | ✅ F1 공식 지원 확인 후 적용 — 추측 없음 | ✅ Port JSDoc 에 callPaths 명시 + Contract assertion | **✅ Compliant** |
| **ENH-278** (이월) | — | ✅ bkit autoMode 미사용 확정 후 이월 판단 | ✅ 이월 근거 문서화 | **✅ Compliant** |
| **ENH-279** | ✅ 수동 `git tag` → `claude plugin tag` 자동화 (대표 사례) | ✅ F9 공식 명령어 사용, 추측 0 | ✅ BKIT_VERSION SoT ↔ tag 동기 CI | **✅ Compliant** |
| **ENH-280** | ✅ X13 fix 활용으로 agent-hook 다중 이벤트 자동 | ✅ 실측 조사 후 확장 결정 — 추측 금지 | ✅ L5 scenario 1 에 regression assertion | **✅ Compliant** |

### 7.2 보완 항목 일반 Philosophy 체크

| 보완 항목 | Automation First | No Guessing | Docs=Code |
|:----------|:----:|:----:|:----:|
| α5 FEATURE_VERSION_MAP 확장 (F1/F9/X13) | ✅ | ✅ | ✅ |
| α5 `DISABLE_UPDATES` 가드 (F5) | ✅ | ✅ | ✅ |
| β3 error-handler idempotent 캐시 (X14) | ✅ | ✅ | ✅ |
| γ3 X22 cwd assertion | ✅ | ✅ | ✅ |
| δ1 Port caller-agnostic 수용 (F1) | ✅ | ✅ | ✅ |
| δ5 ADR 0002 F5/F13 절차 흡수 | ✅ | ✅ | ✅ |
| δ6 `release-plugin-tag.sh` (F9) | ✅ | ✅ | ✅ |

**결론**: 모든 보완이 bkit 3 철학 준수 — 규칙 위반 0건.

---

## 8. 종합 결론 및 권고

### 8.1 최종 판정

✅ **GO** — v2.1.11 Precondition 완료 후 Sprint α 착수

**근거**:
1. CC v2.1.118 은 Breaking 0 / 호환 유지 (76 연속)
2. HIGH 4건 모두 Opportunity 성격 — Sprint 재설계 불요
3. Plan/Design 수정은 **텍스트 7곳 (총 약 90분 작업량)** 수준
4. 신규 FR 1개 (FR-δ6) 는 XS Complexity — Sprint δ 공수 +3 turns 이내
5. Philosophy 3/3 유지

### 8.2 권고 실행 순서 (Precondition Phase 중 병행)

| 순서 | 작업 | 예상 시간 | 담당 |
|:---:|------|:--------:|------|
| 1 | Plan §5.2 NFR + §7 RA-11/12 + §Appendix C 3곳 패치 | 15분 | maintainer |
| 2 | Design Index §3 / §5.1 / §5.7 / §6.3 / §9.1 / §10.2 6곳 패치 | 25분 | maintainer |
| 3 | Sprint δ Design §2.2 / §2.4(FR-δ6) / §10 / §11 / §12 5곳 패치 | 40분 | maintainer |
| 4 | Sprint γ Design §1.1 / §5.2 / §11 / §12 4곳 패치 | 20분 | maintainer |
| 5 | Sprint α Design §3.3 FEATURE_VERSION_MAP + `DISABLE_UPDATES` 가드 | 10분 | maintainer |
| 6 | Sprint β Design §4.3 주석 + §6 E-β3-03 추가 | 10분 | maintainer |
| 7 | MEMORY.md 75→76 / ENH 4건 편입 / cc_version_history 업데이트 | 15분 | maintainer |
| 8 | **Precondition P1/P2/P3** (기존 계획) 병행 | — | maintainer |
| **총합** | — | **~135분** (2시간 내) | — |

### 8.3 Skip 항목 (이월)

- **ENH-278** (autoMode `$defaults`): v2.1.12 이월 확정
- **FR-γ4 본격 구현**: v2.1.12 (조사만 v2.1.11)
- **ENH-277 실 hook 전환**: v2.1.12 pilot (Port 수용만 v2.1.11)

### 8.4 다음 CC 릴리스 대응 준비

- MON-CC-02 / MON-CC-06 / ENH-214 3건 방어선 유지 — CC v2.1.119 에서 재검토
- ADR 0002 (CC upgrade policy) 작성 완료 후 Skip 의사결정 프로세스 적용 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-23 | Initial impact analysis — CC v2.1.117→v2.1.118, bkit v2.1.11 영향 분석. GO 판정 + 7곳 Plan/Design 패치 권고 + ENH-277/279/280 흡수 + ENH-278 이월 | kay kim + bkit-impact-analyst |

---

**Document End**
**Next Step**: Precondition Phase 중 권고 7곳 Plan/Design 패치 적용 → Sprint α 착수
