# Living Context + Self-Healing CI/CD Quick Start

## Overview

bkit의 Living Context 시스템은 Self-Healing이 코드를 수정할 때 **"왜 이렇게 만들었는지"** 이해할 수 있게 합니다.

```
에러 발생 → Context Loader(4-Layer) → Claude Code 수정 → 4중 검증 → Auto PR
```

## Quick Start

### 1. Invariants 작성 (사람이 핵심 10~20개만)

```yaml
# .bkit/invariants.yaml
version: "1.0"
invariants:
  - id: "INV-001"
    rule: "사용자 잔액은 음수가 될 수 없다"
    files: ["src/services/payment.ts"]
    check: "balance >= 0"
    severity: "critical"    # critical = 수정 거부, warning = 경고만
    category: "business-rule"
```

### 2. Scenario Matrix (PDCA Design에서 자동 생성)

`/pdca design` 완료 시 `docs/02-design/scenarios/{feature}.scenarios.yaml` 자동 생성됨.
검토 후 구체적인 입력/출력/제약조건을 채우세요.

```yaml
# docs/02-design/scenarios/user-auth.scenarios.yaml
version: "1.0"
module: "user-auth"
file: "src/services/auth.ts"
scenarios:
  - id: "S001"
    name: "정상 로그인"
    input: { email: "user@test.com", password: "valid" }
    expected: { status: 200 }
    tags: ["happy-path"]

  - id: "S002"
    name: "5회 실패 → 잠금"
    input: { attempts: 5 }
    expected: { status: 423, locked: true }
    why: "브루트포스 방지"
    constraint: "잠금 임계값 5회는 하드코딩. 변경 불가."
```

### 3. Impact Map (자동 생성)

`/pdca do` 완료 시 자동 생성됨. 수동 실행:

```javascript
const { generateImpactMap, writeImpactMap } = require('./lib/context');
const map = await generateImpactMap(process.cwd(), { include: ['src/'] });
writeImpactMap(map, '.bkit/impact-map.json');
```

### 4. Deploy

```bash
/pdca deploy feature --env dev      # DEV 배포
/pdca deploy feature --env staging  # STAGING (90%+ 필요)
/pdca deploy feature --env prod     # PROD (95%+ & Human Approval)
```

### 5. Self-Healing

에러 발생 시 자동으로:
1. Context Loader가 4-Layer 컨텍스트 로딩
2. Claude Code가 컨텍스트 포함하여 수정
3. Scenario Runner가 모든 시나리오 통과 검증
4. 100% Pass → Auto PR / Fail → 재시도(max 5) / 5회 실패 → 에스컬레이션

## Automation Levels

| Level | Deploy | Self-Healing |
|-------|--------|-------------|
| L0-L4 | 기존과 동일 | 기존과 동일 |
| **L5** | CI/CD + 환경 승격 자동 | - |
| **L6** | 자동 | 에러→수정→PR 자동 (리뷰만 사람) |

## Architecture

```
Living Context (4-Layer)           Self-Healing Flow
─────────────────────              ─────────────────
📋 Scenario Matrix                 Error → Context Load
🔒 Invariants Registry            → Claude Code Fix
🕸️ Impact Map                     → 4중 검증
🧠 Incident Memory                → Auto PR or Escalate
```
