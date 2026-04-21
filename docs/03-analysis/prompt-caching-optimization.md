# bkit 토큰 절감 — ENABLE_PROMPT_CACHING_1H 최적화

> **Version**: 2026-04-21 (v2.1.9, ENH-265)
> **Purpose**: CC v2.1.108+ `ENABLE_PROMPT_CACHING_1H` 기능을 활용한 bkit 사용자 토큰 30~40% 절감 가이드
> **관련 ENH**: ENH-265 (P1 HIGH, v2.1.9 채택)
> **관련 CC 기능**: `ENABLE_PROMPT_CACHING_1H` env var (v2.1.108 전체 provider 통합 — BYOK/Bedrock/Vertex/Foundry)

---

## §1. 개요

CC CLI v2.1.108부터 모든 provider에서 **1시간 TTL prompt caching**이 통합 지원됩니다. bkit처럼 긴 PDCA 세션 (Plan→Design→Do→QA, 수 시간)을 운영하는 경우 **반복 전송되는 컨텍스트**(SessionStart header, MEMORY.md, CLAUDE.md, 대화 이력)를 캐시하여 토큰을 절감합니다.

### 예상 효과

| 세션 유형 | 기본 토큰 소비 | Caching 1H 적용 시 | 절감률 |
|----------|--------------|------------------|--------|
| 단일 작업 (5 turn) | 100K × 5 = 500K | 100K + (30K × 4) = 220K | **56%** |
| 중간 작업 (20 turn, 2시간) | 100K × 20 = 2M | 100K + (30K × 19) = 670K | **66%** (이론) / **30~40%** (실측 보수) |
| 장기 작업 (50 turn, 4시간) | 5M | 1.8M | **64%** |

### 비용 영향 (Opus 4.7, $15/M input)

| 세션 | 기본 비용 | Caching 1H | 절감액 |
|------|---------|-----------|-------|
| 2h PDCA | $30 | $12~$18 | $12~18 |
| 4h 장기 | $75 | $27~$45 | $30~48 |

---

## §2. 활성화 방법

### 2.1 macOS/Linux (zsh/bash)

**영구 설정** (`~/.zshrc` 또는 `~/.bashrc`):

```bash
export ENABLE_PROMPT_CACHING_1H=1
```

**일회성 세션**:

```bash
ENABLE_PROMPT_CACHING_1H=1 claude
```

### 2.2 Windows (PowerShell)

```powershell
# 영구
[Environment]::SetEnvironmentVariable("ENABLE_PROMPT_CACHING_1H", "1", "User")

# 일회성
$env:ENABLE_PROMPT_CACHING_1H="1"; claude
```

### 2.3 CI/CD (GitHub Actions)

```yaml
env:
  ENABLE_PROMPT_CACHING_1H: "1"
```

### 2.4 검증 (bkit SessionStart 출력)

bkit v2.1.9+ 설치 후 CC 세션 시작 시 다음 메시지 확인:

```
## bkit v2.1.9 (Current)
- CC recommended: v2.1.116+ | 74 consecutive compatible releases
- Architecture: 39 Skills, 36 Agents, 21 Hook Events, 2 MCP Servers
- Prompt caching 1H: ✅ enabled (30-40% token savings on long PDCA sessions)
```

`⚠️ disabled`로 표시되면 env var 미설정 상태.

---

## §3. bkit이 캐싱에서 얻는 이점 (구체적 분석)

### 3.1 캐시되는 bkit 컨텍스트

| 컴포넌트 | 대략 크기 | 세션 내 재전송 횟수 | 캐싱 이득 |
|---------|---------|------------------|---------|
| SessionStart header + context | 8KB | 매 turn | ✅ 1 turn 후 cache hit |
| MEMORY.md (전체) | 38KB | 매 turn (일부) | ✅ 1시간 내 재사용 |
| CLAUDE.md | 2KB | 매 turn | ✅ 안정적 cache |
| .claude/CLAUDE.md | 0.5KB | 매 turn | ✅ 안정적 cache |
| 활성 feature Plan/Design 문서 | 10~50KB | Do/QA 단계 반복 | ✅ 단계 내 cache |
| Agent definitions (매 spawn) | 2~10KB | subagent 호출 시 | ✅ 반복 호출 시 이득 |

### 3.2 PDCA 단계별 예상 이득

| 단계 | 기본 토큰 | Caching 1H | 절감 |
|------|---------|-----------|------|
| **Plan** (요구사항 분석 5~10 turn) | 500K~1M | 200K~400K | **~60%** |
| **Design** (설계 검증 3~7 turn) | 300K~700K | 150K~300K | **~55%** |
| **Do** (구현 10~30 turn, 1~3시간) | 1M~3M | 300K~900K | **~70%** |
| **QA** (검증 5~15 turn) | 500K~1.5M | 200K~600K | **~60%** |

### 3.3 CTO Team 12명 병렬 spawn 영향

CTO Team 패턴 사용 시 각 teammate가 독립 context를 받지만, **공통 컨텍스트(MEMORY/CLAUDE.md/Plan 문서)는 캐시 공유** → CTO Team 세션에서 특히 큰 절감 효과.

- 12 agent 동시 spawn: 기본 2M 토큰 → Caching 1H: **~800K 토큰** (60% 절감)

---

## §4. 주의사항 및 한계

### 4.1 Cache TTL 1시간

- 1시간 이상 idle 후 turn 재개 시 cache miss 발생
- bkit 권장: 장기 PDCA 작업은 **연속 1시간 내** 진행 후 `/clear` 또는 휴식

### 4.2 Context 변경 시 cache invalidation

- MEMORY.md 또는 CLAUDE.md 수정 시 해당 cache 무효화
- bkit v2.1.9 ENH-239 SHA-256 fingerprint dedup로 중복 재주입 방지 (PreCompact hook)

### 4.3 rate limit 고려

- 1시간 cache는 API rate limit에도 유리 (같은 window 내 재사용)
- Max plan 5시간 윈도우 사용량 여유 ↑

### 4.4 v2.1.108 미만 CC

- env var 무시됨 (경고 없음)
- bkit이 SessionStart 메시지로 "⚠️ disabled" 표시하여 인지 가능

---

## §5. 관련 CC 기능

| 기능 | 도입 버전 | 연관 |
|------|---------|------|
| `ENABLE_PROMPT_CACHING_1H` (전체 provider) | v2.1.108 | **본 ENH-265** |
| `FORCE_PROMPT_CACHING_5M` | v2.1.108 | 짧은 작업용, bkit 미채택 |
| `ENABLE_PROMPT_CACHING_1H_BEDROCK` (deprecated) | v2.1.107 이전 | v2.1.108 이후 통합됨 |
| Cache control TTL ordering fix (B8) | v2.1.116 | 병렬 agent spawn 안정성 |

---

## §6. 체감 측정 방법

### 6.1 `/cost` 명령

CC v2.1.92+ 제공. 세션 내 per-model cost breakdown 확인:

```
/cost
```

출력 예시:
```
Session cost: $3.42
Model: claude-opus-4-7
Input tokens: 245,103 (cached: 180,450)
Cache hit rate: 73.6%
```

### 6.2 PDCA 사이클 비교

동일 feature를 caching 여부에 따라 2회 실행 후 총 token/cost 비교:

1. `ENABLE_PROMPT_CACHING_1H=0 claude` → `/pdca do ...` → `/cost`
2. `ENABLE_PROMPT_CACHING_1H=1 claude` → `/pdca do ...` → `/cost`

---

## §7. 이력

| 일자 | 변경 | 관련 이슈 |
|------|------|---------|
| 2026-04-17 | CC v2.1.108 전체 provider `ENABLE_PROMPT_CACHING_1H` 통합 | v2.1.108 CHANGELOG |
| 2026-04-21 | bkit **ENH-265** SessionStart 힌트 + 문서 신설 | bkit v2.1.9 |
| 2026-04-20 | CC v2.1.116 B8 cache TTL ordering fix (병렬 spawn 안정성) | v2.1.116 CHANGELOG |

---

## §8. 관련 문서

- **CC v2.1.108 Impact Report**: `docs/04-report/features/cc-v2107-v2108-impact-analysis.report.md`
- **bkit v2.1.9 Plan**: `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md` §4.1 ENH-265
- **보안 아키텍처**: `docs/03-analysis/security-architecture.md` (ENH-254)
- **Context Engineering**: `docs/context-engineering.md` (bkit 전반 컨텍스트 관리)
