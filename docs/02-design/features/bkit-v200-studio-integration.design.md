# bkit v2.0.0 영역 7 — Studio 연동 준비 상세 설계

> **Summary**: Plugin 측에서 bkit Studio가 소비할 데이터 인터페이스 전체 정의 — 파일 스키마, 이벤트 스트림, 제어 상태, MCP 교환 인터페이스
>
> **Project**: bkit
> **Version**: v2.0.0
> **Author**: PM Agent (Claude Sonnet 4.6)
> **Date**: 2026-03-19
> **Status**: Draft
> **Planning Doc**: [bkit-v200-enhancement.plan.md](../01-plan/features/bkit-v200-enhancement.plan.md)

---

## 1. 설계 원칙

### 1.1 Studio 독립성 원칙

bkit Plugin은 Studio 없이 100% 완전하게 동작해야 합니다. Studio는 선택적 시각화 레이어이며, Plugin은 Studio의 존재를 알 필요가 없습니다.

| 원칙 | 적용 방식 |
|------|----------|
| **파일 기반 우선** | 모든 데이터는 `.bkit/` 하위 파일로 기록. Studio는 파일을 폴링/구독 |
| **Append-Only 스트림** | 이벤트 파일은 항상 추가 전용, Studio는 원하는 시점부터 읽기 가능 |
| **하위 호환 100%** | 기존 `.bkit/state/`, `.bkit/runtime/` 구조 유지, 신규 파일만 추가 |
| **MCP는 선택** | MCP 서버는 고급 조회 인터페이스. 파일 폴링만으로 모든 기능 사용 가능 |
| **외부 의존성 없음** | JSON/JSONL/YAML 표준 형식만 사용. 별도 DB/라이브러리 불필요 |

### 1.2 파일 경로 전체 맵

```
.bkit/
├── runtime/
│   ├── agent-state.json          (기존 v1.0 → v2.0 확장)
│   ├── agent-events.jsonl        [신규] Agent 이벤트 스트림
│   └── control-state.json        [신규] 런타임 제어 상태
├── state/
│   ├── pdca-status.json          (기존, 미변경)
│   ├── quality-metrics.json      [신규] 최신 품질 메트릭 10개
│   └── quality-history.json      [신규] 품질 메트릭 시계열
├── checkpoints/
│   ├── index.json                [신규] 체크포인트 인덱스
│   └── cp-{timestamp}/           체크포인트 디렉토리
│       ├── meta.json             체크포인트 메타데이터
│       └── files/                스냅샷 파일들
├── audit/
│   ├── {YYYY-MM-DD}.jsonl        감사 로그 (일별)
│   └── audit-index.json          [신규] 감사 로그 인덱스
├── decisions/
│   ├── {YYYY-MM-DD}.jsonl        의사결정 추적 로그
│   └── decision-index.json       [신규] Decision Trace 인덱스
└── workflows/
    ├── default.workflow.yaml     기본 워크플로우
    ├── hotfix.workflow.yaml      핫픽스 워크플로우
    ├── enterprise.workflow.yaml  Enterprise 워크플로우
    └── workflow.schema.json      [신규] JSON Schema 정의
```

---

## 2. `agent-state.json` v2.0 스키마

### 2.1 경로

`.bkit/runtime/agent-state.json`

### 2.2 설계 배경

기존 v1.0 스키마는 Agent Teams 상태 관리에 초점. v2.0은 Studio 실시간 대시보드에 필요한 `matchRate`, `iterationHistory`, `pendingApprovals`, `agentEvents` 필드를 추가합니다. 기존 필드는 100% 유지.

### 2.3 JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/agent-state.v2.json",
  "title": "AgentState",
  "description": "bkit Agent Team 실시간 상태. Studio 대시보드가 이 파일을 폴링하여 PDCA 진행 현황을 렌더링합니다.",
  "type": "object",
  "required": ["version", "feature", "pdcaPhase", "lastUpdated"],
  "properties": {

    "version": {
      "type": "string",
      "enum": ["1.0", "2.0"],
      "description": "스키마 버전. Studio는 이 값으로 파싱 전략을 분기합니다."
    },

    "feature": {
      "type": "string",
      "description": "현재 활성 Feature 이름 (kebab-case)"
    },

    "pdcaPhase": {
      "type": "string",
      "enum": ["idle", "pm", "plan", "design", "do", "check", "act", "report", "archived"],
      "description": "현재 PDCA 단계"
    },

    "automationLevel": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4,
      "description": "현재 자동화 레벨 (L0=Manual, L1=Guided, L2=Semi-Auto, L3=Auto, L4=Full-Auto)"
    },

    "matchRate": {
      "type": ["number", "null"],
      "minimum": 0,
      "maximum": 100,
      "description": "설계-구현 일치율 (0-100). Check 단계 이전은 null. Studio 진행 바에 표시."
    },

    "trustScore": {
      "type": ["number", "null"],
      "minimum": 0,
      "maximum": 100,
      "description": "Trust Score (0-100). 성공 누적 시 상승, 실패/취소 시 하락. null = 미산정."
    },

    "iterationHistory": {
      "type": "array",
      "description": "PDCA Act 반복 이력. Studio 반복 추이 차트에 사용.",
      "items": {
        "type": "object",
        "required": ["iter", "matchRate", "completedAt"],
        "properties": {
          "iter": {
            "type": "integer",
            "minimum": 1,
            "description": "반복 회차 (1부터 시작)"
          },
          "matchRate": {
            "type": "number",
            "minimum": 0,
            "maximum": 100,
            "description": "해당 회차 종료 시 matchRate"
          },
          "gapCount": {
            "type": "integer",
            "minimum": 0,
            "description": "해당 회차에서 발견된 Gap 수"
          },
          "fixedCount": {
            "type": "integer",
            "minimum": 0,
            "description": "해당 회차에서 수정된 Gap 수"
          },
          "completedAt": {
            "type": "string",
            "format": "date-time",
            "description": "ISO 8601 UTC 타임스탬프"
          }
        }
      },
      "maxItems": 10
    },

    "pendingApprovals": {
      "type": "array",
      "description": "현재 승인 대기 중인 항목. Studio 제어 패널에서 표시 및 응답 가능.",
      "items": {
        "type": "object",
        "required": ["id", "type", "message", "createdAt"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^appr-[a-z0-9]{8}$",
            "description": "승인 항목 고유 ID (예: appr-a1b2c3d4)"
          },
          "type": {
            "type": "string",
            "enum": [
              "phase_transition",
              "destructive_action",
              "automation_level_up",
              "checkpoint_restore",
              "manual_review"
            ],
            "description": "승인 유형"
          },
          "message": {
            "type": "string",
            "maxLength": 500,
            "description": "사용자에게 표시할 승인 요청 메시지"
          },
          "context": {
            "type": "object",
            "description": "승인 처리에 필요한 추가 데이터 (type별 다름)",
            "additionalProperties": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "expiresAt": {
            "type": ["string", "null"],
            "format": "date-time",
            "description": "만료 시간. null이면 무기한 대기."
          }
        }
      },
      "maxItems": 10
    },

    "agentEvents": {
      "type": "array",
      "description": "최근 Agent 이벤트 50건 요약. 전체 이벤트는 agent-events.jsonl 참조.",
      "items": {
        "type": "object",
        "required": ["timestamp", "agent", "event"],
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "agent": {
            "type": "string",
            "description": "에이전트 이름 또는 ID (예: gap-detector, cto-lead)"
          },
          "event": {
            "type": "string",
            "enum": ["spawned", "working", "completed", "failed", "message", "phase_change"],
            "description": "이벤트 유형"
          },
          "data": {
            "type": ["object", "null"],
            "description": "이벤트 관련 데이터 (이벤트 유형별 다름)"
          }
        }
      },
      "maxItems": 50
    },

    "enabled": {
      "type": "boolean",
      "description": "[v1.0 호환] Agent Team 활성화 여부"
    },

    "teamName": {
      "type": "string",
      "description": "[v1.0 호환] 팀 이름"
    },

    "orchestrationPattern": {
      "type": "string",
      "description": "[v1.0 호환] 오케스트레이션 패턴"
    },

    "ctoAgent": {
      "type": "string",
      "description": "[v1.0 호환] CTO 에이전트 모델"
    },

    "startedAt": {
      "type": "string",
      "format": "date-time",
      "description": "[v1.0 호환] 세션 시작 시각"
    },

    "lastUpdated": {
      "type": "string",
      "format": "date-time",
      "description": "마지막 갱신 시각"
    },

    "teammates": {
      "type": "array",
      "description": "[v1.0 호환] 팀원 목록"
    },

    "progress": {
      "type": "object",
      "description": "[v1.0 호환] 작업 진행 요약"
    },

    "sessionId": {
      "type": "string",
      "description": "[v1.0 호환] 세션 ID"
    }
  }
}
```

### 2.4 예시 데이터 (v2.0)

```json
{
  "version": "2.0",
  "feature": "user-auth",
  "pdcaPhase": "act",
  "automationLevel": 2,
  "matchRate": 78,
  "trustScore": 65,
  "iterationHistory": [
    {
      "iter": 1,
      "matchRate": 61,
      "gapCount": 8,
      "fixedCount": 5,
      "completedAt": "2026-03-19T10:30:00Z"
    },
    {
      "iter": 2,
      "matchRate": 78,
      "gapCount": 4,
      "fixedCount": 4,
      "completedAt": "2026-03-19T11:15:00Z"
    }
  ],
  "pendingApprovals": [
    {
      "id": "appr-a1b2c3d4",
      "type": "phase_transition",
      "message": "Check → Act 3회차를 시작합니다. matchRate 78% (목표: 90%). 계속하시겠습니까?",
      "context": {
        "fromPhase": "check",
        "toPhase": "act",
        "currentMatchRate": 78,
        "targetMatchRate": 90,
        "iteration": 3
      },
      "createdAt": "2026-03-19T11:20:00Z",
      "expiresAt": null
    }
  ],
  "agentEvents": [
    {
      "timestamp": "2026-03-19T11:15:00Z",
      "agent": "gap-detector",
      "event": "completed",
      "data": { "matchRate": 78, "gapsFound": 4, "duration_ms": 12400 }
    },
    {
      "timestamp": "2026-03-19T11:14:45Z",
      "agent": "gap-detector",
      "event": "working",
      "data": { "step": "comparing design vs implementation" }
    }
  ],
  "enabled": true,
  "teamName": "bkit-enterprise",
  "orchestrationPattern": "council",
  "ctoAgent": "opus",
  "startedAt": "2026-03-19T09:00:00Z",
  "lastUpdated": "2026-03-19T11:20:00Z",
  "teammates": [],
  "progress": {
    "totalTasks": 5,
    "completedTasks": 3,
    "inProgressTasks": 1,
    "failedTasks": 0,
    "pendingTasks": 1
  },
  "sessionId": "ses-abc123"
}
```

### 2.5 Studio 소비 방법

| 항목 | 방법 |
|------|------|
| **폴링 주기** | 2초 간격 (Studio 기본값). 파일 mtime 변경 시만 파싱 |
| **버전 분기** | `version === "1.0"`이면 하위 호환 모드로 렌더링 |
| **matchRate 표시** | null이면 대시(—), 0-100은 게이지 바 |
| **pendingApprovals** | 배열이 비어있지 않으면 승인 팝업 표시 |
| **갱신 트리거** | phase 전환, iteration 완료, 승인 생성/소비, agentEvents 50건 초과 |

### 2.6 Plugin 측 갱신 책임 모듈

| 모듈 | 갱신 항목 |
|------|----------|
| `lib/team/state-writer.js` | 전체 파일 원자적 쓰기 (tmp+rename) |
| `lib/pdca/state-machine.js` | `pdcaPhase`, `automationLevel` 전환 시 갱신 |
| `lib/pdca/iteration.js` | `iterationHistory` append, `matchRate` 갱신 |
| `lib/control/automation-controller.js` | `pendingApprovals` 생성/소비, `trustScore` 갱신 |
| `lib/audit/audit-logger.js` | `agentEvents` 최신 50건 유지 (FIFO) |

---

## 3. `.bkit/runtime/agent-events.jsonl` — Agent 이벤트 스트림

### 3.1 경로

`.bkit/runtime/agent-events.jsonl`

### 3.2 설계 배경

`agent-state.json`의 `agentEvents`는 최근 50건 요약이지만, 이 파일은 세션 전체의 완전한 이벤트 로그입니다. Studio는 `tail -f` 또는 `FileSystemWatcher`로 실시간 구독합니다.

### 3.3 이벤트 유형별 스키마

각 줄은 독립적인 JSON 객체입니다.

**공통 필드 (모든 이벤트)**

```json
{
  "ts": "2026-03-19T10:00:00.000Z",
  "event": "spawned",
  "agent": "gap-detector",
  "sessionId": "ses-abc123",
  "feature": "user-auth",
  "phase": "check"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `ts` | string (ISO 8601 UTC) | 이벤트 발생 시각 (밀리초 포함) |
| `event` | string (enum) | 이벤트 유형 (아래 6종) |
| `agent` | string | 에이전트 이름 (예: gap-detector, cto-lead, pdca-iterator) |
| `sessionId` | string | 세션 ID (세션 내 모든 이벤트 연결) |
| `feature` | string | 대상 Feature 이름 |
| `phase` | string | 발생 시점의 PDCA 단계 |

**이벤트 유형별 추가 필드**

#### `spawned` — 에이전트 실행 시작

```json
{
  "ts": "2026-03-19T10:00:00.000Z",
  "event": "spawned",
  "agent": "gap-detector",
  "sessionId": "ses-abc123",
  "feature": "user-auth",
  "phase": "check",
  "data": {
    "triggeredBy": "state_machine",
    "automationLevel": 2,
    "parentAgent": null
  }
}
```

| data 필드 | 타입 | 설명 |
|-----------|------|------|
| `triggeredBy` | string | 실행 트리거 (`state_machine`, `user_command`, `auto_retry`) |
| `automationLevel` | integer | 실행 시점 자동화 레벨 |
| `parentAgent` | string\|null | 부모 에이전트 이름 (Agent Team 사용 시) |

#### `working` — 에이전트 작업 진행 중

```json
{
  "ts": "2026-03-19T10:00:05.123Z",
  "event": "working",
  "agent": "gap-detector",
  "sessionId": "ses-abc123",
  "feature": "user-auth",
  "phase": "check",
  "data": {
    "step": "parsing design document",
    "progress": 25,
    "elapsed_ms": 5123
  }
}
```

| data 필드 | 타입 | 설명 |
|-----------|------|------|
| `step` | string | 현재 수행 중인 작업 설명 (자유 형식) |
| `progress` | integer (0-100) | 진행률. 알 수 없으면 null |
| `elapsed_ms` | integer | 시작으로부터 경과 시간 (ms) |

#### `completed` — 에이전트 작업 완료

```json
{
  "ts": "2026-03-19T10:02:30.456Z",
  "event": "completed",
  "agent": "gap-detector",
  "sessionId": "ses-abc123",
  "feature": "user-auth",
  "phase": "check",
  "data": {
    "duration_ms": 150456,
    "result": {
      "matchRate": 78,
      "gapsFound": 4,
      "outputPath": "docs/03-analysis/user-auth.analysis.md"
    }
  }
}
```

| data 필드 | 타입 | 설명 |
|-----------|------|------|
| `duration_ms` | integer | 총 실행 시간 (ms) |
| `result` | object | 에이전트별 결과 요약 (자유 형식) |

#### `failed` — 에이전트 작업 실패

```json
{
  "ts": "2026-03-19T10:01:00.789Z",
  "event": "failed",
  "agent": "pdca-iterator",
  "sessionId": "ses-abc123",
  "feature": "user-auth",
  "phase": "act",
  "data": {
    "errorCode": "CONTEXT_OVERFLOW",
    "errorMessage": "Context window exceeded during iteration 3",
    "recoverable": true,
    "retryCount": 1,
    "maxRetries": 3
  }
}
```

| data 필드 | 타입 | 설명 |
|-----------|------|------|
| `errorCode` | string | BkitError 코드 (예: CONTEXT_OVERFLOW, MAX_ITERATIONS_REACHED) |
| `errorMessage` | string | 사람이 읽을 수 있는 오류 메시지 |
| `recoverable` | boolean | 자동 복구 가능 여부 |
| `retryCount` | integer | 현재까지 재시도 횟수 |
| `maxRetries` | integer | 최대 재시도 횟수 |

#### `message` — 에이전트 중간 메시지

```json
{
  "ts": "2026-03-19T10:01:30.000Z",
  "event": "message",
  "agent": "cto-lead",
  "sessionId": "ses-abc123",
  "feature": "user-auth",
  "phase": "design",
  "data": {
    "level": "info",
    "text": "API 설계 검토 완료: 7개 엔드포인트, 2개 보안 이슈 발견",
    "tags": ["api", "security"]
  }
}
```

| data 필드 | 타입 | 설명 |
|-----------|------|------|
| `level` | string (`info`, `warn`, `error`) | 메시지 심각도 |
| `text` | string | 메시지 내용 (maxLength: 1000) |
| `tags` | string[] | 분류 태그 (Studio 필터용) |

#### `phase_change` — PDCA 단계 전환

```json
{
  "ts": "2026-03-19T10:05:00.000Z",
  "event": "phase_change",
  "agent": "state-machine",
  "sessionId": "ses-abc123",
  "feature": "user-auth",
  "phase": "check",
  "data": {
    "fromPhase": "do",
    "toPhase": "check",
    "trigger": "auto",
    "automationLevel": 2,
    "approvalId": null
  }
}
```

| data 필드 | 타입 | 설명 |
|-----------|------|------|
| `fromPhase` | string | 이전 단계 |
| `toPhase` | string | 전환된 단계 |
| `trigger` | string (`auto`, `user`, `approval`) | 전환 트리거 |
| `automationLevel` | integer | 전환 시점 레벨 |
| `approvalId` | string\|null | 승인을 통해 전환된 경우 appr-ID |

### 3.4 파일 관리 정책

| 항목 | 정책 |
|------|------|
| **최대 크기** | 세션당 1000줄 (약 200KB). 초과 시 가장 오래된 100줄 제거 |
| **세션 경계** | `SessionStart` 훅에서 파일 초기화 또는 새 파일 생성 (`--resume` 시 유지) |
| **쓰기 방식** | `fs.appendFileSync()` (원자적 append 보장) |
| **인코딩** | UTF-8, 줄바꿈 `\n` |

### 3.5 Studio 소비 방법

| 방법 | 구현 |
|------|------|
| **실시간 구독** | `FileSystemWatcher` (Node.js `fs.watch`) 또는 `tail -f` |
| **초기 로드** | 파일 전체 읽기 후 줄 단위 파싱 |
| **증분 읽기** | 마지막 읽은 byte offset 기록, 변경 감지 시 offset부터 읽기 |
| **파싱 방식** | `JSON.parse(line)` — 각 줄 독립 파싱, 오류 줄 건너뜀 |

---

## 4. `.bkit/runtime/control-state.json` — 런타임 제어 상태

### 4.1 경로

`.bkit/runtime/control-state.json`

### 4.2 설계 배경

Studio 제어 패널이 현재 자동화 레벨, Trust Score, 활성 가드레일, 승인 대기 상태를 읽고 쓸 수 있는 파일입니다. Plugin은 이 파일을 주기적으로 읽어 Studio의 지시를 반영합니다.

### 4.3 JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/control-state.v1.json",
  "title": "ControlState",
  "description": "런타임 자동화 제어 상태. Studio에서 읽기/쓰기 가능. Plugin은 5초 주기로 폴링하여 변경 반영.",
  "type": "object",
  "required": ["version", "automationLevel", "lastUpdated", "updatedBy"],
  "properties": {

    "version": {
      "type": "string",
      "const": "1.0"
    },

    "automationLevel": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4,
      "description": "현재 자동화 레벨 (L0=Manual, L1=Guided, L2=Semi-Auto, L3=Auto, L4=Full-Auto). Studio에서 변경 가능."
    },

    "trustScore": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Trust Score (읽기 전용 — Plugin만 갱신)"
    },

    "activeGuardrails": {
      "type": "array",
      "description": "현재 활성화된 가드레일 목록",
      "items": {
        "type": "object",
        "required": ["id", "name", "enabled"],
        "properties": {
          "id": {
            "type": "string",
            "description": "가드레일 규칙 ID (예: GR-01, GR-08)"
          },
          "name": {
            "type": "string",
            "description": "가드레일 이름 (예: rm_rf_block, git_force_push_block)"
          },
          "enabled": {
            "type": "boolean",
            "description": "Studio에서 개별 가드레일 on/off 가능"
          },
          "triggerCount": {
            "type": "integer",
            "minimum": 0,
            "description": "현재 세션에서 트리거된 횟수"
          },
          "lastTriggeredAt": {
            "type": ["string", "null"],
            "format": "date-time"
          }
        }
      }
    },

    "pendingApprovals": {
      "type": "array",
      "description": "승인 대기 항목 (agent-state.json과 동기화). Studio에서 approve/reject 응답 가능.",
      "items": {
        "type": "object",
        "required": ["id", "type", "message", "createdAt", "response"],
        "properties": {
          "id": {
            "type": "string",
            "pattern": "^appr-[a-z0-9]{8}$"
          },
          "type": {
            "type": "string",
            "enum": ["phase_transition", "destructive_action", "automation_level_up", "checkpoint_restore", "manual_review"]
          },
          "message": {
            "type": "string",
            "maxLength": 500
          },
          "context": {
            "type": "object",
            "additionalProperties": true
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "response": {
            "type": ["string", "null"],
            "enum": ["approved", "rejected", null],
            "description": "null = 대기 중. Studio에서 'approved' 또는 'rejected'로 설정하면 Plugin이 5초 내 감지."
          },
          "respondedAt": {
            "type": ["string", "null"],
            "format": "date-time"
          }
        }
      }
    },

    "guardrailHistory": {
      "type": "array",
      "description": "최근 가드레일 트리거 이력 (최신 20건)",
      "items": {
        "type": "object",
        "required": ["ts", "guardrailId", "action", "blocked"],
        "properties": {
          "ts": {
            "type": "string",
            "format": "date-time"
          },
          "guardrailId": {
            "type": "string"
          },
          "action": {
            "type": "string",
            "description": "감지된 작업 내용 (예: 'rm -rf ./src')"
          },
          "blocked": {
            "type": "boolean",
            "description": "실제로 차단되었으면 true, 경고만이면 false"
          },
          "blastRadius": {
            "type": ["string", "null"],
            "enum": ["low", "medium", "high", "critical", null],
            "description": "변경 영향 범위 평가"
          }
        }
      },
      "maxItems": 20
    },

    "emergencyStop": {
      "type": "boolean",
      "default": false,
      "description": "true로 설정 시 Plugin의 모든 자동화가 즉시 중단. Studio Emergency Stop 버튼."
    },

    "lastUpdated": {
      "type": "string",
      "format": "date-time"
    },

    "updatedBy": {
      "type": "string",
      "enum": ["plugin", "studio", "user"],
      "description": "마지막 갱신 주체. Plugin은 이 값으로 Studio 명령 감지."
    }
  }
}
```

### 4.4 예시 데이터

```json
{
  "version": "1.0",
  "automationLevel": 2,
  "trustScore": 65,
  "activeGuardrails": [
    {
      "id": "GR-01",
      "name": "rm_rf_block",
      "enabled": true,
      "triggerCount": 0,
      "lastTriggeredAt": null
    },
    {
      "id": "GR-02",
      "name": "git_force_push_block",
      "enabled": true,
      "triggerCount": 1,
      "lastTriggeredAt": "2026-03-19T10:30:00Z"
    }
  ],
  "pendingApprovals": [
    {
      "id": "appr-a1b2c3d4",
      "type": "phase_transition",
      "message": "Check → Act 3회차를 시작합니다.",
      "context": { "fromPhase": "check", "toPhase": "act", "iteration": 3 },
      "createdAt": "2026-03-19T11:20:00Z",
      "response": null,
      "respondedAt": null
    }
  ],
  "guardrailHistory": [
    {
      "ts": "2026-03-19T10:30:00Z",
      "guardrailId": "GR-02",
      "action": "git push --force origin main",
      "blocked": true,
      "blastRadius": "high"
    }
  ],
  "emergencyStop": false,
  "lastUpdated": "2026-03-19T11:20:00Z",
  "updatedBy": "plugin"
}
```

### 4.5 Studio 쓰기 프로토콜

Studio는 이 파일을 수정할 때 반드시 다음 절차를 따릅니다.

1. 파일 전체 읽기 (`fs.readFileSync`)
2. 목표 필드 수정 (`automationLevel`, `pendingApprovals[N].response`, `emergencyStop` 등)
3. `updatedBy: "studio"`, `lastUpdated: <now>` 설정
4. 원자적 쓰기 (tmp 파일 쓰기 후 rename)

Plugin은 5초 주기로 이 파일을 폴링하여 `updatedBy === "studio"` 감지 시 변경 사항을 반영합니다.

---

## 5. YAML 워크플로우 표준 스키마

### 5.1 경로

`.bkit/workflows/workflow.schema.json` (Schema 파일)
`.bkit/workflows/default.workflow.yaml` (기본 워크플로우 인스턴스)

### 5.2 JSON Schema for YAML Workflow

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/workflow.v1.json",
  "title": "BkitWorkflow",
  "description": "bkit YAML 워크플로우 DSL 스키마. Studio 워크플로우 에디터가 이 스키마로 유효성 검증 및 자동완성을 제공합니다.",
  "type": "object",
  "required": ["$schema", "version", "name", "phases"],
  "properties": {

    "$schema": {
      "type": "string",
      "const": "https://bkit.dev/schemas/workflow.v1.json",
      "description": "스키마 참조 URI. 에디터 자동완성 활성화에 필요."
    },

    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$",
      "description": "워크플로우 스키마 버전 (예: '1.0')"
    },

    "name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "워크플로우 식별자 (kebab-case, 예: default, hotfix, enterprise)"
    },

    "description": {
      "type": "string",
      "maxLength": 200,
      "description": "워크플로우 설명. Studio 에디터 툴팁에 표시."
    },

    "automationLevel": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4,
      "default": 2,
      "description": "이 워크플로우의 기본 자동화 레벨"
    },

    "phases": {
      "type": "array",
      "description": "PDCA 단계 목록 (순서가 실행 순서)",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {

          "id": {
            "type": "string",
            "enum": ["pm", "plan", "design", "do", "check", "act", "report", "archive"],
            "description": "단계 식별자"
          },

          "name": {
            "type": "string",
            "description": "단계 표시 이름"
          },

          "description": {
            "type": "string",
            "description": "단계 설명 (Studio 에디터 툴팁)"
          },

          "optional": {
            "type": "boolean",
            "default": false,
            "description": "true이면 skip 가능 (예: pm 단계)"
          },

          "maxIterations": {
            "type": "integer",
            "minimum": 1,
            "maximum": 20,
            "description": "최대 반복 횟수 (check/act 루프에 적용)"
          },

          "matchRateThreshold": {
            "type": "integer",
            "minimum": 0,
            "maximum": 100,
            "description": "다음 단계 진입을 위한 최소 matchRate (%)"
          },

          "agents": {
            "type": "array",
            "description": "이 단계에서 실행할 에이전트 목록",
            "items": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": {
                  "type": "string",
                  "description": "에이전트 파일명 (확장자 제외, 예: gap-detector)"
                },
                "parallel": {
                  "type": "boolean",
                  "default": false,
                  "description": "true이면 다른 에이전트와 병렬 실행"
                },
                "required": {
                  "type": "boolean",
                  "default": true,
                  "description": "false이면 실패해도 단계 진행"
                }
              }
            }
          },

          "gates": {
            "type": "array",
            "description": "이 단계 진입/진출 시 확인할 품질 게이트",
            "items": {
              "type": "object",
              "required": ["type", "condition"],
              "properties": {
                "type": {
                  "type": "string",
                  "enum": ["entry", "exit"],
                  "description": "entry = 단계 시작 전, exit = 단계 완료 후"
                },
                "condition": {
                  "type": "string",
                  "description": "조건 표현식 (예: 'matchRate >= 90', 'criticalIssues == 0')"
                },
                "action": {
                  "type": "string",
                  "enum": ["block", "warn", "auto_fix"],
                  "default": "block",
                  "description": "조건 미충족 시 동작"
                }
              }
            }
          },

          "transitions": {
            "type": "object",
            "description": "단계 전환 규칙 오버라이드",
            "properties": {
              "onSuccess": {
                "type": "string",
                "description": "성공 시 전환할 단계 ID"
              },
              "onFailure": {
                "type": "string",
                "description": "실패 시 전환할 단계 ID"
              },
              "requireApproval": {
                "type": "boolean",
                "description": "전환 전 승인 필요 여부"
              }
            }
          }
        }
      }
    },

    "hooks": {
      "type": "object",
      "description": "워크플로우 수준 훅 (전역 이벤트 핸들러)",
      "properties": {
        "onPhaseStart": {
          "type": "string",
          "description": "모든 단계 시작 시 실행할 스크립트 경로"
        },
        "onPhaseComplete": {
          "type": "string",
          "description": "모든 단계 완료 시 실행할 스크립트 경로"
        },
        "onError": {
          "type": "string",
          "description": "오류 발생 시 실행할 스크립트 경로"
        }
      }
    },

    "metadata": {
      "type": "object",
      "description": "워크플로우 메타데이터",
      "properties": {
        "author": { "type": "string" },
        "createdAt": { "type": "string", "format": "date-time" },
        "updatedAt": { "type": "string", "format": "date-time" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

### 5.3 예시 데이터 (`default.workflow.yaml`)

```yaml
$schema: "https://bkit.dev/schemas/workflow.v1.json"
version: "1.0"
name: default
description: 표준 PDCA 워크플로우 (bkit 기본값). PM → Plan → Design → Do → Check/Act 루프 → Report → Archive.
automationLevel: 2

phases:
  - id: pm
    name: Product Discovery
    description: 제품 요구사항 분석 및 PRD 생성
    optional: true
    agents:
      - name: pm-lead
        parallel: false

  - id: plan
    name: Plan
    description: Feature 계획서 작성
    agents:
      - name: plan-generator
        parallel: false
    gates:
      - type: exit
        condition: "documentExists == true"
        action: block

  - id: design
    name: Design
    description: 기술 설계 문서 작성
    agents:
      - name: design-generator
        parallel: false
    gates:
      - type: exit
        condition: "documentExists == true"
        action: block

  - id: do
    name: Implementation
    description: 설계 기반 코드 구현
    agents:
      - name: full-auto-do
        parallel: false
        required: false
    gates:
      - type: exit
        condition: "implementationDetected == true"
        action: warn

  - id: check
    name: Gap Analysis
    description: 설계-구현 일치율 검증
    agents:
      - name: gap-detector
        parallel: false
    gates:
      - type: exit
        condition: "matchRate >= 90"
        action: warn
    transitions:
      onSuccess: report
      onFailure: act

  - id: act
    name: Auto Iteration
    description: Gap 자동 수정 반복
    maxIterations: 5
    matchRateThreshold: 90
    agents:
      - name: pdca-iterator
        parallel: false
    transitions:
      onSuccess: check
      requireApproval: false

  - id: report
    name: Completion Report
    description: PDCA 완주 보고서 생성
    agents:
      - name: report-generator
        parallel: false

  - id: archive
    name: Archive
    description: 완료된 PDCA 문서 아카이브
    transitions:
      requireApproval: true

metadata:
  author: bkit-team
  createdAt: "2026-03-19T00:00:00Z"
  tags: [default, standard, pdca]
```

### 5.4 Studio 소비 방법

| 항목 | 방법 |
|------|------|
| **에디터 유효성 검증** | `workflow.schema.json`을 `$schema` 필드로 참조 → JSON Schema Validator 적용 |
| **자동완성** | `phases[].id` enum, `agents[].name` 목록, `gates[].action` enum 자동완성 |
| **워크플로우 맵 렌더링** | `phases` 배열 순서대로 노드 렌더링, `transitions` 엣지 연결 |
| **읽기 전용 모드** | v2.0.0에서 Studio는 읽기만 가능. 쓰기는 v2.1.0에서 지원 예정 |

---

## 6. 체크포인트 메타데이터 표준 포맷

### 6.1 경로

`.bkit/checkpoints/index.json` (전체 인덱스)
`.bkit/checkpoints/cp-{timestamp}/meta.json` (개별 메타)

### 6.2 `index.json` Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/checkpoint-index.v1.json",
  "title": "CheckpointIndex",
  "description": "전체 체크포인트 인덱스. Studio 체크포인트 브라우저가 이 파일로 목록을 렌더링합니다.",
  "type": "object",
  "required": ["version", "checkpoints", "lastUpdated"],
  "properties": {

    "version": {
      "type": "string",
      "const": "1.0"
    },

    "totalCount": {
      "type": "integer",
      "minimum": 0
    },

    "totalSizeBytes": {
      "type": "integer",
      "minimum": 0,
      "description": "모든 체크포인트 파일 합산 크기 (bytes)"
    },

    "checkpoints": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "feature", "phase", "createdAt", "trigger"],
        "properties": {

          "id": {
            "type": "string",
            "pattern": "^cp-\\d{13}$",
            "description": "체크포인트 ID (예: cp-1710849600000 — Unix 밀리초)"
          },

          "feature": {
            "type": "string",
            "description": "대상 Feature 이름"
          },

          "phase": {
            "type": "string",
            "enum": ["pm", "plan", "design", "do", "check", "act", "report"],
            "description": "체크포인트 생성 시점의 PDCA 단계"
          },

          "trigger": {
            "type": "string",
            "enum": ["auto", "manual", "phase_transition", "pre_destructive"],
            "description": "생성 트리거 유형"
          },

          "description": {
            "type": "string",
            "maxLength": 200,
            "description": "체크포인트 설명 (사용자 메모 또는 자동 생성)"
          },

          "matchRateAtCreation": {
            "type": ["number", "null"],
            "minimum": 0,
            "maximum": 100
          },

          "fileCount": {
            "type": "integer",
            "minimum": 0,
            "description": "스냅샷에 포함된 파일 수"
          },

          "sizeBytes": {
            "type": "integer",
            "minimum": 0,
            "description": "스냅샷 총 크기 (bytes)"
          },

          "createdAt": {
            "type": "string",
            "format": "date-time"
          },

          "restorable": {
            "type": "boolean",
            "description": "복원 가능 여부 (파일 무결성 검증 통과 시 true)"
          },

          "metaPath": {
            "type": "string",
            "description": "상세 메타 파일 경로 (`.bkit/checkpoints/{id}/meta.json`)"
          }
        }
      }
    },

    "lastUpdated": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

### 6.3 개별 체크포인트 `meta.json` Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/checkpoint-meta.v1.json",
  "title": "CheckpointMeta",
  "type": "object",
  "required": ["id", "feature", "phase", "createdAt", "files"],
  "properties": {

    "id": { "type": "string" },
    "feature": { "type": "string" },
    "phase": { "type": "string" },
    "trigger": { "type": "string" },
    "description": { "type": "string" },
    "matchRateAtCreation": { "type": ["number", "null"] },
    "automationLevelAtCreation": { "type": "integer" },
    "createdAt": { "type": "string", "format": "date-time" },

    "files": {
      "type": "array",
      "description": "스냅샷된 파일 목록",
      "items": {
        "type": "object",
        "required": ["path", "hash", "sizeBytes"],
        "properties": {
          "path": {
            "type": "string",
            "description": "프로젝트 루트 기준 상대 경로"
          },
          "hash": {
            "type": "string",
            "description": "SHA-256 해시 (무결성 검증용)"
          },
          "sizeBytes": {
            "type": "integer"
          },
          "snapshotPath": {
            "type": "string",
            "description": "체크포인트 디렉토리 내 저장 경로"
          }
        }
      }
    },

    "pdcaContext": {
      "type": "object",
      "description": "체크포인트 생성 시점의 PDCA 컨텍스트",
      "properties": {
        "matchRate": { "type": ["number", "null"] },
        "iterationCount": { "type": "integer" },
        "automationLevel": { "type": "integer" }
      }
    }
  }
}
```

### 6.4 예시 데이터 (`index.json`)

```json
{
  "version": "1.0",
  "totalCount": 3,
  "totalSizeBytes": 524288,
  "checkpoints": [
    {
      "id": "cp-1710849600000",
      "feature": "user-auth",
      "phase": "design",
      "trigger": "phase_transition",
      "description": "Do 단계 진입 전 자동 체크포인트",
      "matchRateAtCreation": null,
      "fileCount": 12,
      "sizeBytes": 204800,
      "createdAt": "2026-03-19T09:00:00Z",
      "restorable": true,
      "metaPath": ".bkit/checkpoints/cp-1710849600000/meta.json"
    },
    {
      "id": "cp-1710853200000",
      "feature": "user-auth",
      "phase": "check",
      "trigger": "auto",
      "description": "Check 1회차 완료 (matchRate: 61%)",
      "matchRateAtCreation": 61,
      "fileCount": 18,
      "sizeBytes": 163488,
      "createdAt": "2026-03-19T10:00:00Z",
      "restorable": true,
      "metaPath": ".bkit/checkpoints/cp-1710853200000/meta.json"
    }
  ],
  "lastUpdated": "2026-03-19T11:00:00Z"
}
```

### 6.5 Studio 소비 방법

| 항목 | 방법 |
|------|------|
| **목록 렌더링** | `index.json` 폴링 (10초 주기), `checkpoints` 배열 렌더링 |
| **상세 보기** | 선택된 항목의 `metaPath`로 `meta.json` 로드 → 파일 목록 표시 |
| **복원 요청** | `control-state.json`에 `pendingApprovals` 항목 추가 (type: `checkpoint_restore`) |
| **크기 표시** | `sizeBytes` → 사람이 읽기 쉬운 형식 (KB/MB) 변환 |

---

## 7. 품질 메트릭 JSON 스키마

### 7.1 경로

`.bkit/state/quality-metrics.json` (최신 메트릭 10개)
`.bkit/state/quality-history.json` (시계열 히스토리)

### 7.2 `quality-metrics.json` Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/quality-metrics.v1.json",
  "title": "QualityMetrics",
  "description": "현재 세션의 최신 품질 메트릭 10개. Studio 실시간 대시보드 카드에 표시.",
  "type": "object",
  "required": ["version", "feature", "collectedAt", "metrics"],
  "properties": {

    "version": { "type": "string", "const": "1.0" },
    "feature": { "type": "string" },
    "collectedAt": { "type": "string", "format": "date-time" },
    "phase": {
      "type": "string",
      "description": "수집 시점의 PDCA 단계"
    },

    "metrics": {
      "type": "object",
      "description": "10대 품질 메트릭",
      "properties": {
        "M1": {
          "type": "object",
          "description": "Match Rate — 설계-구현 일치율",
          "properties": {
            "value": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
            "unit": { "type": "string", "const": "%" },
            "threshold": { "type": "number", "const": 90 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M2": {
          "type": "object",
          "description": "Code Quality Score — 코드 품질 종합 점수",
          "properties": {
            "value": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
            "unit": { "type": "string", "const": "/100" },
            "threshold": { "type": "number", "const": 70 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M3": {
          "type": "object",
          "description": "Critical Issue Count — 치명적 이슈 수",
          "properties": {
            "value": { "type": ["integer", "null"], "minimum": 0 },
            "unit": { "type": "string", "const": "count" },
            "threshold": { "type": "integer", "const": 0 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M4": {
          "type": "object",
          "description": "API Compliance Rate — API 설계 준수율",
          "properties": {
            "value": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
            "unit": { "type": "string", "const": "%" },
            "threshold": { "type": "number", "const": 95 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M5": {
          "type": "object",
          "description": "Runtime Error Rate — 런타임 오류율",
          "properties": {
            "value": { "type": ["number", "null"], "minimum": 0 },
            "unit": { "type": "string", "const": "%" },
            "threshold": { "type": "number", "const": 1 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M6": {
          "type": "object",
          "description": "P95 Response Time — 95백분위 응답 시간",
          "properties": {
            "value": { "type": ["number", "null"], "minimum": 0 },
            "unit": { "type": "string", "const": "ms" },
            "threshold": { "type": "number", "const": 1000 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M7": {
          "type": "object",
          "description": "Convention Compliance — 코딩 컨벤션 준수율",
          "properties": {
            "value": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
            "unit": { "type": "string", "const": "%" },
            "threshold": { "type": "number", "const": 90 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M8": {
          "type": "object",
          "description": "Design Completeness — 설계 문서 완성도",
          "properties": {
            "value": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
            "unit": { "type": "string", "const": "/100" },
            "threshold": { "type": "number", "const": 85 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M9": {
          "type": "object",
          "description": "Iteration Efficiency — 반복당 matchRate 향상폭",
          "properties": {
            "value": { "type": ["number", "null"] },
            "unit": { "type": "string", "const": "%p/iter" },
            "threshold": { "type": "number", "const": 5 },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        },
        "M10": {
          "type": "object",
          "description": "PDCA Cycle Time — 현재 사이클 소요 시간",
          "properties": {
            "value": { "type": ["number", "null"], "minimum": 0 },
            "unit": { "type": "string", "const": "minutes" },
            "threshold": { "type": ["number", "null"] },
            "status": { "type": "string", "enum": ["pass", "fail", "pending"] }
          }
        }
      }
    }
  }
}
```

### 7.3 `quality-history.json` Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/quality-history.v1.json",
  "title": "QualityHistory",
  "description": "품질 메트릭 시계열 데이터. Studio 차트(선 그래프, 영역 그래프)에 사용.",
  "type": "object",
  "required": ["version", "feature", "dataPoints"],
  "properties": {

    "version": { "type": "string", "const": "1.0" },
    "feature": { "type": "string" },
    "maxDataPoints": {
      "type": "integer",
      "const": 100,
      "description": "최대 저장 데이터 포인트 수. 초과 시 가장 오래된 항목 제거 (FIFO)."
    },

    "dataPoints": {
      "type": "array",
      "description": "시간순 정렬된 메트릭 스냅샷 목록",
      "items": {
        "type": "object",
        "required": ["timestamp", "phase", "metrics"],
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "수집 시각 (ISO 8601 UTC)"
          },
          "phase": {
            "type": "string",
            "enum": ["pm", "plan", "design", "do", "check", "act", "report"]
          },
          "iteration": {
            "type": ["integer", "null"],
            "minimum": 1,
            "description": "Act 반복 회차 (check/act 단계만 해당)"
          },
          "metrics": {
            "type": "object",
            "description": "M1-M10 값 스냅샷 (null = 해당 단계에서 수집 불가)",
            "properties": {
              "M1": { "type": ["number", "null"] },
              "M2": { "type": ["number", "null"] },
              "M3": { "type": ["integer", "null"] },
              "M4": { "type": ["number", "null"] },
              "M5": { "type": ["number", "null"] },
              "M6": { "type": ["number", "null"] },
              "M7": { "type": ["number", "null"] },
              "M8": { "type": ["number", "null"] },
              "M9": { "type": ["number", "null"] },
              "M10": { "type": ["number", "null"] }
            }
          }
        }
      },
      "maxItems": 100
    }
  }
}
```

### 7.4 예시 데이터 (`quality-history.json` 발췌)

```json
{
  "version": "1.0",
  "feature": "user-auth",
  "maxDataPoints": 100,
  "dataPoints": [
    {
      "timestamp": "2026-03-19T09:30:00Z",
      "phase": "design",
      "iteration": null,
      "metrics": {
        "M1": null,
        "M2": null,
        "M3": null,
        "M4": null,
        "M5": null,
        "M6": null,
        "M7": null,
        "M8": 82,
        "M9": null,
        "M10": 30
      }
    },
    {
      "timestamp": "2026-03-19T10:30:00Z",
      "phase": "check",
      "iteration": 1,
      "metrics": {
        "M1": 61,
        "M2": 68,
        "M3": 2,
        "M4": 80,
        "M5": null,
        "M6": null,
        "M7": 85,
        "M8": 82,
        "M9": null,
        "M10": 90
      }
    },
    {
      "timestamp": "2026-03-19T11:15:00Z",
      "phase": "check",
      "iteration": 2,
      "metrics": {
        "M1": 78,
        "M2": 72,
        "M3": 0,
        "M4": 90,
        "M5": null,
        "M6": null,
        "M7": 88,
        "M8": 82,
        "M9": 17,
        "M10": 135
      }
    }
  ]
}
```

### 7.5 Studio 소비 방법

| 항목 | 방법 |
|------|------|
| **메트릭 카드** | `quality-metrics.json` 폴링 (5초 주기), M1-M10 카드 렌더링 |
| **status 색상** | `pass` = 녹색, `fail` = 빨간색, `pending` = 회색 |
| **M1 차트** | `quality-history.json`의 `dataPoints[].metrics.M1` 선 그래프 |
| **전체 트렌드** | M2, M7 등 핵심 메트릭 다중선 차트 |
| **갱신 트리거** | Check 단계 완료 시, Act 반복 완료 시 |

---

## 8. 감사 로그 / Decision Trace 스키마

### 8.1 경로

`.bkit/audit/{YYYY-MM-DD}.jsonl` (감사 로그)
`.bkit/audit/audit-index.json` (감사 로그 인덱스)
`.bkit/decisions/{YYYY-MM-DD}.jsonl` (Decision Trace)
`.bkit/decisions/decision-index.json` (Decision Trace 인덱스)

### 8.2 감사 로그 이벤트 스키마 (JSONL 한 줄)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/audit-event.v1.json",
  "title": "AuditEvent",
  "description": "단일 감사 이벤트. 각 JSONL 줄이 이 스키마를 따릅니다.",
  "type": "object",
  "required": ["ts", "id", "action", "actor", "severity"],
  "properties": {

    "ts": {
      "type": "string",
      "format": "date-time",
      "description": "이벤트 발생 시각 (ISO 8601 UTC, 밀리초 포함)"
    },

    "id": {
      "type": "string",
      "pattern": "^aud-[a-f0-9]{12}$",
      "description": "이벤트 고유 ID (예: aud-a1b2c3d4e5f6)"
    },

    "action": {
      "type": "string",
      "enum": [
        "file_created", "file_modified", "file_deleted",
        "command_executed", "command_blocked",
        "phase_transitioned", "approval_requested", "approval_resolved",
        "agent_spawned", "agent_completed", "agent_failed",
        "guardrail_triggered", "checkpoint_created", "checkpoint_restored",
        "automation_level_changed", "trust_score_changed",
        "session_started", "session_ended"
      ],
      "description": "감사 대상 액션 유형"
    },

    "actor": {
      "type": "string",
      "description": "액션 수행 주체 (에이전트 이름, 'user', 'state-machine', 'plugin')"
    },

    "severity": {
      "type": "string",
      "enum": ["info", "warning", "critical"],
      "description": "심각도. Studio 필터 기준."
    },

    "feature": {
      "type": ["string", "null"],
      "description": "관련 Feature 이름"
    },

    "phase": {
      "type": ["string", "null"],
      "description": "발생 시점의 PDCA 단계"
    },

    "target": {
      "type": ["string", "null"],
      "description": "액션 대상 (파일 경로, 명령어, 에이전트 이름 등)"
    },

    "detail": {
      "type": "object",
      "description": "액션별 상세 데이터 (자유 형식)",
      "additionalProperties": true
    },

    "outcome": {
      "type": "string",
      "enum": ["success", "failure", "blocked", "pending"],
      "description": "액션 결과"
    }
  }
}
```

### 8.3 감사 로그 예시 (JSONL 발췌)

```jsonl
{"ts":"2026-03-19T10:00:00.000Z","id":"aud-a1b2c3d4e5f6","action":"agent_spawned","actor":"state-machine","severity":"info","feature":"user-auth","phase":"check","target":"gap-detector","detail":{"automationLevel":2},"outcome":"success"}
{"ts":"2026-03-19T10:30:00.000Z","id":"aud-b2c3d4e5f6a1","action":"guardrail_triggered","actor":"gap-detector","severity":"critical","feature":"user-auth","phase":"check","target":"git push --force origin main","detail":{"guardrailId":"GR-02","blastRadius":"high"},"outcome":"blocked"}
{"ts":"2026-03-19T10:31:00.000Z","id":"aud-c3d4e5f6a1b2","action":"checkpoint_created","actor":"checkpoint-manager","severity":"info","feature":"user-auth","phase":"check","target":".bkit/checkpoints/cp-1710849600000","detail":{"trigger":"pre_destructive","fileCount":18},"outcome":"success"}
```

### 8.4 `audit-index.json` Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/audit-index.v1.json",
  "title": "AuditIndex",
  "description": "감사 로그 파일 인덱스. Studio가 날짜/기간으로 빠르게 조회하기 위해 사용.",
  "type": "object",
  "required": ["version", "files"],
  "properties": {

    "version": { "type": "string", "const": "1.0" },

    "retentionDays": {
      "type": "integer",
      "const": 30,
      "description": "보존 기간 (일). 이 기간이 지난 파일은 자동 삭제."
    },

    "totalSizeBytes": { "type": "integer" },

    "files": {
      "type": "array",
      "description": "날짜별 감사 로그 파일 목록 (최신 순)",
      "items": {
        "type": "object",
        "required": ["date", "path", "eventCount", "sizeBytes"],
        "properties": {
          "date": {
            "type": "string",
            "format": "date",
            "description": "YYYY-MM-DD"
          },
          "path": {
            "type": "string",
            "description": "JSONL 파일 경로"
          },
          "eventCount": {
            "type": "integer",
            "minimum": 0
          },
          "sizeBytes": {
            "type": "integer",
            "minimum": 0
          },
          "severitySummary": {
            "type": "object",
            "description": "심각도별 이벤트 수",
            "properties": {
              "info": { "type": "integer" },
              "warning": { "type": "integer" },
              "critical": { "type": "integer" }
            }
          },
          "features": {
            "type": "array",
            "items": { "type": "string" },
            "description": "해당 날짜에 활동이 있었던 Feature 목록"
          }
        }
      }
    },

    "lastUpdated": { "type": "string", "format": "date-time" }
  }
}
```

### 8.5 Decision Trace 이벤트 스키마 (JSONL 한 줄)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://bkit.dev/schemas/decision-event.v1.json",
  "title": "DecisionEvent",
  "type": "object",
  "required": ["ts", "id", "decision", "actor", "rationale"],
  "properties": {

    "ts": {
      "type": "string",
      "format": "date-time"
    },

    "id": {
      "type": "string",
      "pattern": "^dec-[a-f0-9]{12}$"
    },

    "decision": {
      "type": "string",
      "description": "내려진 결정 (예: 'proceed_to_act', 'block_destructive_action', 'escalate_automation_level')"
    },

    "actor": {
      "type": "string",
      "description": "결정 주체 (에이전트 또는 시스템 컴포넌트)"
    },

    "feature": { "type": ["string", "null"] },
    "phase": { "type": ["string", "null"] },

    "rationale": {
      "type": "string",
      "maxLength": 1000,
      "description": "결정 근거 (자연어 설명)"
    },

    "alternatives": {
      "type": "array",
      "description": "고려했으나 선택하지 않은 대안",
      "items": {
        "type": "object",
        "required": ["option", "rejectionReason"],
        "properties": {
          "option": { "type": "string" },
          "rejectionReason": { "type": "string" }
        }
      }
    },

    "impact": {
      "type": "object",
      "description": "결정의 예상 영향",
      "properties": {
        "affectedFiles": {
          "type": "array",
          "items": { "type": "string" }
        },
        "blastRadius": {
          "type": ["string", "null"],
          "enum": ["low", "medium", "high", "critical", null]
        },
        "reversible": {
          "type": "boolean"
        }
      }
    },

    "auditRef": {
      "type": ["string", "null"],
      "description": "관련 감사 로그 이벤트 ID (aud-XXXXXXXXXXXX)"
    }
  }
}
```

### 8.6 Studio 소비 방법 — 필터링 기준

| 필터 기준 | 필드 | Studio UI |
|-----------|------|----------|
| **날짜 범위** | `audit-index.json`의 `files[].date` | 날짜 피커 |
| **Feature** | `files[].features`, 이벤트의 `feature` | 드롭다운 |
| **액션 유형** | `action` enum | 체크박스 다중 선택 |
| **심각도** | `severity` | 탭 (info / warning / critical) |
| **에이전트** | `actor` | 텍스트 검색 |
| **결과** | `outcome` | 토글 (success/failure/blocked) |

### 8.7 갱신 주기 및 보존 정책

| 항목 | 정책 |
|------|------|
| **감사 로그 갱신** | 이벤트 발생 즉시 JSONL append (지연 없음) |
| **인덱스 갱신** | 감사 로그 갱신 후 5초 이내 인덱스 재계산 |
| **보존 기간** | 30일 (자동 삭제, `hooks/cleanup/audit-cleanup.js`) |
| **최대 크기** | 총 100MB. 초과 시 오래된 파일부터 삭제 |
| **Decision Trace** | 감사 로그와 동일한 보존 정책 적용 |

---

## 9. MCP 기반 데이터 교환 인터페이스

### 9.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                    bkit Studio                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ Dashboard  │  │ Audit View │  │ Workflow Editor    │ │
│  └─────┬──────┘  └─────┬──────┘  └────────┬───────────┘ │
│        │               │                  │              │
│  ┌─────┴───────────────┴──────────────────┴──────────┐  │
│  │          Studio Data Layer                         │  │
│  │  파일 폴링 (기본)  │  MCP 클라이언트 (선택)         │  │
│  └─────┬────────────────────────────┬────────────────┘  │
└────────│────────────────────────────│───────────────────┘
         │ FileSystem Watch            │ MCP Protocol
         ▼                             ▼
┌────────────────────────┐  ┌─────────────────────────────┐
│    .bkit/ 파일 시스템   │  │   bkit-pdca-server (MCP)    │
│  agent-state.json      │  │   servers/bkit-pdca-server/ │
│  agent-events.jsonl    │  │                             │
│  control-state.json    │  │  Tools:                     │
│  quality-metrics.json  │  │  - get_pdca_status          │
│  checkpoints/          │  │  - get_metrics              │
│  audit/                │  │  - get_audit_logs           │
│  decisions/            │  │  - set_automation_level     │
└────────────────────────┘  │  - approve_action           │
                             │  - restore_checkpoint       │
                             └─────────────────────────────┘
```

### 9.2 파일 기반 vs MCP 비교

| 항목 | 파일 기반 폴링 | MCP 기반 조회 |
|------|--------------|--------------|
| **구현 복잡도** | 낮음 (fs.watch) | 높음 (MCP 서버 구축 필요) |
| **실시간성** | 폴링 주기 의존 (최소 1초) | 이론상 즉시 (~50ms) |
| **데이터 필터링** | Studio 클라이언트에서 처리 | 서버 측 필터링 가능 |
| **인증/보안** | 없음 (파일 시스템 권한 의존) | MCP 연결 인증 가능 |
| **연결 상태** | 항상 접근 가능 | MCP 서버 실행 필요 |
| **오프라인 동작** | 가능 | 불가 |
| **bkit 없이 조회** | 가능 (파일 읽기) | 불가 |
| **권장 사용** | 기본값, 항상 작동 | 고급 조회, 실시간 알림 |

### 9.3 권장 아키텍처 결정

**v2.0.0 기본**: 파일 기반 폴링
**v2.0.0 선택**: MCP 기반 (고급 기능)

Studio는 다음 우선순위로 데이터 소스를 선택합니다.

1. `bkit-pdca-server` MCP 서버가 실행 중이면 MCP 사용
2. MCP 서버 미실행 시 파일 폴링으로 자동 폴백
3. 파일 접근 불가 시 "연결 없음" 상태 표시

### 9.4 MCP 서버 Tool 명세

#### `get_pdca_status`

```json
{
  "name": "get_pdca_status",
  "description": "현재 PDCA 상태, 활성 Feature, 자동화 레벨, matchRate를 조회합니다.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "feature": {
        "type": "string",
        "description": "조회할 Feature 이름. 생략 시 현재 활성 Feature."
      }
    }
  }
}
```

응답 형식: `agent-state.json` 전체 내용 (JSON)

#### `get_metrics`

```json
{
  "name": "get_metrics",
  "description": "품질 메트릭 최신값 또는 시계열 히스토리를 조회합니다.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ["latest", "history"],
        "default": "latest"
      },
      "feature": { "type": "string" },
      "metricIds": {
        "type": "array",
        "items": { "type": "string", "pattern": "^M[1-9]|10$" },
        "description": "조회할 메트릭 ID 목록. 생략 시 M1-M10 전체."
      }
    }
  }
}
```

#### `get_audit_logs`

```json
{
  "name": "get_audit_logs",
  "description": "감사 로그를 필터 조건에 따라 조회합니다.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "startDate": { "type": "string", "format": "date" },
      "endDate": { "type": "string", "format": "date" },
      "feature": { "type": "string" },
      "severity": {
        "type": "string",
        "enum": ["info", "warning", "critical"]
      },
      "action": { "type": "string" },
      "limit": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000,
        "default": 100
      }
    }
  }
}
```

#### `set_automation_level`

```json
{
  "name": "set_automation_level",
  "description": "자동화 레벨을 변경합니다. control-state.json에 쓰기 후 Plugin이 반영.",
  "inputSchema": {
    "type": "object",
    "required": ["level"],
    "properties": {
      "level": {
        "type": "integer",
        "minimum": 0,
        "maximum": 4,
        "description": "새 자동화 레벨 (0=Manual, 1=Guided, 2=Semi-Auto, 3=Auto, 4=Full-Auto)"
      },
      "reason": {
        "type": "string",
        "description": "변경 사유 (감사 로그에 기록됨)"
      }
    }
  }
}
```

#### `approve_action`

```json
{
  "name": "approve_action",
  "description": "승인 대기 항목에 응답합니다.",
  "inputSchema": {
    "type": "object",
    "required": ["approvalId", "response"],
    "properties": {
      "approvalId": {
        "type": "string",
        "pattern": "^appr-[a-z0-9]{8}$"
      },
      "response": {
        "type": "string",
        "enum": ["approved", "rejected"]
      },
      "comment": {
        "type": "string",
        "maxLength": 500,
        "description": "승인/거부 사유 (감사 로그에 기록됨)"
      }
    }
  }
}
```

#### `restore_checkpoint`

```json
{
  "name": "restore_checkpoint",
  "description": "체크포인트로 복원 요청을 제출합니다. 승인 게이트를 통과한 후 Plugin이 복원 실행.",
  "inputSchema": {
    "type": "object",
    "required": ["checkpointId"],
    "properties": {
      "checkpointId": {
        "type": "string",
        "pattern": "^cp-\\d{13}$"
      },
      "dryRun": {
        "type": "boolean",
        "default": false,
        "description": "true이면 복원할 파일 목록만 반환 (실제 복원 안 함)"
      }
    }
  }
}
```

### 9.5 MCP 서버 구현 위치 및 구조

```
servers/bkit-pdca-server/
├── index.js              MCP 서버 진입점 (stdio transport)
├── server.js             McpServer 인스턴스 + Tool 등록
├── tools/
│   ├── pdca-status.js    get_pdca_status 핸들러
│   ├── metrics.js        get_metrics 핸들러
│   ├── audit-logs.js     get_audit_logs 핸들러
│   ├── control.js        set_automation_level, approve_action 핸들러
│   └── checkpoints.js    restore_checkpoint 핸들러
├── readers/
│   ├── file-reader.js    .bkit/ 파일 읽기 유틸리티
│   └── jsonl-reader.js   JSONL 스트리밍 읽기
└── package.json          { "type": "module", "main": "index.js" }
```

`.mcp.json` 번들 설정:

```json
{
  "mcpServers": {
    "bkit-pdca": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/bkit-pdca-server/index.js"],
      "description": "bkit PDCA 상태 조회 및 제어 MCP 서버"
    }
  }
}
```

---

## 10. 구현 순서 및 의존성

### 10.1 Phase 3 내 구현 순서 (계획서 Phase 3에 포함)

```
Week 5-6 (영역 7 전담)
│
├── Step 1: 스키마 파일 정의 (Day 1-2)
│   ├── workflow.schema.json 작성
│   ├── audit-event.v1.json 작성
│   ├── decision-event.v1.json 작성
│   └── 모든 JSON Schema를 .bkit/schemas/ 에 배치
│
├── Step 2: 파일 기반 Writer 구현 (Day 3-5)
│   ├── lib/team/state-writer.js — agent-state.json v2.0 확장
│   ├── lib/studio/event-stream.js — agent-events.jsonl append
│   ├── lib/studio/control-state-writer.js — control-state.json
│   └── lib/quality/history-writer.js — quality-history.json
│
├── Step 3: 체크포인트 인덱스 연동 (Day 6-7)
│   └── lib/control/checkpoint-manager.js — index.json 갱신
│
├── Step 4: 감사 로그 인덱서 (Day 8-9)
│   └── lib/audit/audit-indexer.js — audit-index.json 갱신
│
└── Step 5: MCP 서버 기본 구현 (Day 10-14)
    ├── servers/bkit-pdca-server/ 기본 구조
    ├── get_pdca_status, get_metrics Tool 구현
    └── set_automation_level, approve_action Tool 구현
```

### 10.2 신규 모듈 목록

| 파일 | 역할 | 예상 LOC |
|------|------|:--------:|
| `lib/studio/event-stream.js` | agent-events.jsonl append writer | ~80 LOC |
| `lib/studio/control-state-writer.js` | control-state.json 원자적 쓰기 + 폴링 | ~100 LOC |
| `lib/studio/index.js` | Studio 연동 모듈 공개 API | ~30 LOC |
| `lib/audit/audit-indexer.js` | audit-index.json / decision-index.json 갱신 | ~120 LOC |
| `lib/quality/history-writer.js` | quality-history.json FIFO 관리 | ~80 LOC |
| `servers/bkit-pdca-server/index.js` | MCP 서버 진입점 | ~50 LOC |
| `servers/bkit-pdca-server/server.js` | Tool 등록 및 라우팅 | ~150 LOC |
| `servers/bkit-pdca-server/tools/*.js` | 6개 Tool 핸들러 | ~300 LOC |
| `.bkit/schemas/*.json` | JSON Schema 파일 5종 | 문서 |
| `.bkit/workflows/*.yaml` | 워크플로우 템플릿 3종 | 문서 |

**영역 7 합계**: 약 910 LOC + 문서 파일 8종

---

## 11. 관련 문서

- Plan: [bkit-v200-enhancement.plan.md](../01-plan/features/bkit-v200-enhancement.plan.md)
- 영역 6 (MCP 서버): 별도 설계 문서 예정
- 영역 2 (통제 가능한 AI): control-state.json의 가드레일 시스템과 연계

---

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 0.1 | 2026-03-19 | 초기 작성 — 영역 7 전체 8개 항목 설계 | PM Agent (Claude Sonnet 4.6) |
