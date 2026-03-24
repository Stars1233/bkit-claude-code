# PRD: bkit Infrastructure Automation (Self-Healing CI/CD)

**Feature**: bkit-infra-automation
**Version**: 2.0
**Date**: 2026-03-24
**Author**: PM Agent Team (pm-lead orchestration)
**Status**: Draft

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | bkit은 PDCA 워크플로우를 통해 코드 생성까지 자동화하지만, 배포 이후의 운영 자동화(CI/CD, 모니터링, 장애 대응)는 수동으로 남아있다. phase-9-deployment 스킬과 infra-architect 에이전트가 존재하나, 실제 파이프라인 통합이 없어 "코드 작성 -> 프로덕션 안정화"까지의 루프가 닫히지 않는다. |
| **Solution** | 6-Layer Self-Healing CI/CD Architecture(CI/CD + Infrastructure + Security + Observability + Error Tracking + Self-Healing)를 bkit 플러그인에 통합한다. 핵심은 **Living Context 시스템**(Scenario Matrix, Invariants Registry, Impact Map, Incident Memory)으로 Self-Healing 수정 품질을 보장하고, 6개 Human Intervention Point를 보존하면서 자동화를 최대화한다. |
| **기능/UX 효과** | `/pdca deploy`로 환경별 자동 배포, Self-Healing 루프가 **Living Context 기반으로** 에러 자동 수정 PR 생성(시나리오 검증 + 불변조건 체크 + 영향범위 분석 포함), PDCA Check에 Full Observability(Metrics+Logs+Traces) 연동. |
| **Core Value** | bkit을 "코드 생성 도구"에서 "컨텍스트 인지형 풀스택 DevOps 자동화 플랫폼"으로 진화. AI가 "왜 이렇게 만들었는지" 이해하고 수정하는 Self-Healing. |

---

## 1. Discovery Analysis

### 1.1 Opportunity Solution Tree (Teresa Torres)

```
[Desired Outcome]
bkit 사용자가 코드 작성부터 프로덕션 안정 운영까지
전체 소프트웨어 라이프사이클을 AI 지원으로 자동화한다
│
├── [Opportunity 1] 배포 자동화 갭
│   ├── PDCA Do 완료 후 수동 배포 프로세스
│   ├── 환경별(DEV/STAGING/PROD) 설정 관리 복잡성
│   └── [Solutions]
│       ├── S1: GitHub Actions 워크플로우 자동 생성 스킬
│       ├── S2: Terraform 템플릿 + 환경별 프로비저닝 자동화
│       └── S3: ArgoCD GitOps 매니페스트 자동 생성
│
├── [Opportunity 2] 모니터링-PDCA 연동 부재
│   ├── 프로덕션 메트릭이 bkit Check 단계에 반영 안됨
│   ├── Grafana/CloudWatch 데이터 활용 불가
│   └── [Solutions]
│       ├── S4: monitoring-bridge MCP 서버 (Prometheus/CloudWatch -> bkit)
│       ├── S5: PDCA Check에 운영 메트릭 자동 포함
│       └── S6: AlertManager -> bkit Hook 연동
│
├── [Opportunity 3] Self-Healing 루프 미구현
│   ├── 에러 감지 -> 자동 수정 -> PR 생성 파이프라인 없음
│   ├── Claude Code의 자동 수정 능력이 운영에 활용 안됨
│   └── [Solutions]
│       ├── S7: Slack Listener -> Claude Code 자동 분석 에이전트
│       ├── S8: 자동 PR 생성 + Human Review 게이트
│       └── S9: ArgoCD Auto Sync로 수정 자동 반영
│
├── [Opportunity 4] Human Intervention Point 관리
│   ├── 6개 개입 지점의 체계적 관리 필요
│   ├── 자동화 범위 확장 시 안전장치 필수
│   └── [Solutions]
│       ├── S10: Automation Level 확장 (L0-L4 -> L0-L6)
│       ├── S11: Human Gate 스킬 (명시적 승인 체크포인트)
│       └── S12: Emergency Stop 확장 (프로덕션 롤백 지원)
│
├── [Opportunity 5] Self-Healing 컨텍스트 부재 (v2.0 추가)
│   ├── 로직/시나리오가 어디에도 기록되지 않으면 AI 수정이 다른 곳을 깨뜨림
│   ├── "왜 이렇게 짰는지" 모르고 표면적 버그만 수정 → 더 큰 장애
│   └── [Solutions]
│       ├── S13: Scenario Matrix (PDCA Design에서 자동 생성, 입력/출력/경계값/에러케이스)
│       ├── S14: Invariants Registry (핵심 비즈니스 룰 불변조건, critical은 사람 작성)
│       ├── S15: Dependency Impact Map (code-analyzer 정적 분석으로 자동 생성)
│       └── S16: Incident Memory (Self-Healing 실행 시 자동 누적, anti-pattern 기록)
│
└── [Opportunity 6] Security + Observability 갭 (v2.0 추가)
    ├── Security Layer 부재 (WAF, VPC, IRSA, Network Policy 없음)
    ├── Monitoring이 Metrics만 → Logs/Traces 없음
    └── [Solutions]
        ├── S17: Security Layer 템플릿 (CloudFront, WAF, VPC, IRSA, Calico, ACM)
        ├── S18: Full Observability 3축 (Metrics: Prometheus + Logs: Loki + Traces: OTel/Tempo)
        └── S19: Staging EKS 단기 운영 (on-demand 생성/파괴로 비용 최적화)
```

### 1.2 Top Assumptions (Impact x Risk)

| # | 가정 | Impact | Risk | Score | 검증 방법 |
|---|------|--------|------|-------|-----------|
| A1 | Claude Code가 프로덕션 에러 로그를 분석하여 정확한 수정을 생성할 수 있다 | 10 | 9 | 90 | 실제 에러 로그 100건으로 Claude Code 수정 정확도 측정 |
| A2 | Self-Healing 자동 PR의 수정 품질이 Human Review를 통과할 수준이다 | 10 | 8 | 80 | 자동 생성 PR 50건의 승인/거부율 추적 |
| A3 | Slack Listener -> Claude Code 파이프라인이 충분히 빠르다 (5분 이내) | 8 | 6 | 48 | 에러 감지부터 PR 생성까지 지연시간 측정 |
| A4 | bkit 사용자가 AWS + K8s Enterprise 인프라를 사용한다 | 7 | 7 | 49 | 사용자 설문 + 프로젝트 레벨 분석 |
| A5 | 모니터링 데이터를 PDCA Check에 통합하면 Match Rate 정확도가 올라간다 | 9 | 5 | 45 | A/B 테스트: 모니터링 데이터 포함/미포함 Check 비교 |

### 1.3 Experiment Design (Top 3)

| 실험 | 가정 | 방법 | 성공 기준 |
|------|------|------|-----------|
| E1: Claude Code Error Fix Accuracy | A1 | 실제 Sentry 에러 50건을 Claude Code에 입력, 수정 코드 생성 후 테스트 통과율 측정 | 70%+ 정확도 |
| E2: Self-Healing PR Quality | A2 | 자동 생성 PR 20건을 시니어 개발자가 블라인드 리뷰, 승인율 측정 | 60%+ 승인율 |
| E3: Pipeline Latency | A3 | Slack webhook -> Claude Code API -> GitHub PR 생성까지 E2E 지연시간 | P95 < 5분 |

---

## 2. Strategy Analysis

### 2.1 JTBD 6-Part Value Proposition

| 파트 | 내용 |
|------|------|
| **1. When** | PDCA Do 단계 완료 후 코드를 프로덕션에 배포하고, 운영 중 에러가 발생했을 때 |
| **2. I want to** | 배포부터 에러 감지, 자동 수정까지 AI가 지원하는 자동화 파이프라인을 실행하고 싶다 |
| **3. So I can** | 수동 DevOps 작업 시간을 줄이고, 프로덕션 안정성을 높이며, MTTR(평균 복구 시간)을 단축할 수 있다 |
| **4. Without** | 복잡한 CI/CD 설정을 직접 작성하거나, 에러 로그를 수동으로 분석하거나, 새벽에 On-Call 알림에 대응하는 것 없이 |
| **5. Unlike** | 기존의 수동 배포 + 수동 모니터링 + 수동 핫픽스 워크플로우 (또는 GitHub Actions만 단독 사용) |
| **6. Our solution** | bkit의 PDCA 워크플로우에 5-Layer Self-Healing CI/CD를 통합하여, `/pdca deploy` -> 모니터링 자동 연동 -> Self-Healing 자동 수정 PR -> Human Review 게이트까지 일관된 AI Native 경험을 제공한다 |

### 2.2 Lean Canvas

| 섹션 | 내용 |
|------|------|
| **Problem** | 1) PDCA Do 이후 배포가 수동 2) 프로덕션 에러 대응이 느림(MTTR 높음) 3) 모니터링 데이터가 개발 워크플로우와 분리됨 |
| **Customer Segment** | Enterprise 레벨 bkit 사용자, DevOps 엔지니어, AI Native 개발팀, 스타트업 CTO |
| **Unique Value Proposition** | "코드 작성부터 프로덕션 자가 치유까지, bkit 하나로 완성하는 AI Native DevOps" |
| **Solution** | 5-Layer Self-Healing CI/CD를 bkit 플러그인으로 통합 (배포 스킬 + 모니터링 MCP + Self-Healing 에이전트) |
| **Channels** | bkit marketplace, Claude Code 플러그인 생태계, DevOps 커뮤니티 (Hashnode, Dev.to), 기술 블로그 |
| **Revenue Streams** | bkit Enterprise 라이선스 (Self-Healing 포함), 관리형 모니터링 대시보드 구독 |
| **Cost Structure** | Claude API 비용 (Self-Healing 분석), AWS 인프라 비용, 개발/유지보수 인력 |
| **Key Metrics** | MTTR 감소율, Self-Healing PR 승인율, 배포 빈도, 배포 실패율 |
| **Unfair Advantage** | bkit의 기존 PDCA 워크플로우 + 37개 에이전트 + Hook 시스템과의 네이티브 통합. 경쟁사는 CI/CD OR AI 코딩 중 하나만 제공 |

### 2.3 SWOT Analysis

| | 긍정적 | 부정적 |
|---|--------|--------|
| **내부** | **Strengths**: 1) 37개 에이전트 중 infra-architect, security-architect 이미 존재 2) Hook 시스템(18개 이벤트)으로 확장 용이 3) PDCA 상태 머신이 phase 전환 관리 4) Enterprise 스킬이 Terraform/K8s 템플릿 보유 | **Weaknesses**: 1) 현재 phase-9-deployment는 가이드만 제공, 실행 자동화 없음 2) MCP 서버가 2개뿐(pdca, analysis) - 모니터링 MCP 없음 3) Automation Level이 L4까지만 정의 4) 실제 AWS/K8s 연동 테스트 경험 부족 |
| **외부** | **Opportunities**: 1) DevOps 시장 $10.4B -> $25.5B 성장 2) Claude Code GitHub Actions 공식 출시 3) Self-Healing CI/CD가 2025-2026 업계 표준으로 부상 4) ArgoCD가 K8s 클러스터 60%에서 사용 | **Threats**: 1) GitHub Copilot Agent Mode가 유사 기능 제공 가능 2) 대형 DevOps 플랫폼(GitLab, Jenkins)이 AI 통합 가속화 3) AWS/GCP 자체 AI DevOps 도구 출시 4) Self-Healing 오류 시 프로덕션 장애 악화 위험 |

### 2.4 SO/WT 전략

| 전략 | 세부 |
|------|------|
| **SO (강점-기회)** | 기존 infra-architect + Hook 시스템을 활용하여 Claude Code GitHub Actions와 네이티브 통합. 37개 에이전트 생태계를 Self-Healing 루프의 분석 엔진으로 활용 |
| **ST (강점-위협)** | PDCA 워크플로우 통합이라는 차별점을 강화. GitHub Copilot은 코드 생성에 집중하지만, bkit은 Plan->Deploy->Monitor->Heal 전체 사이클을 커버 |
| **WO (약점-기회)** | monitoring-bridge MCP 서버를 새로 개발하여 Prometheus/CloudWatch 데이터를 bkit으로 유입. Automation Level을 L6까지 확장하여 Self-Healing 레벨 정의 |
| **WT (약점-위협)** | Self-Healing의 Human Gate를 철저히 유지하여 오류 확산 방지. 점진적 롤아웃(DEV -> STAGING -> PROD)으로 위험 최소화 |

### 2.5 Porter's Five Forces

| Force | 수준 | 분석 |
|-------|------|------|
| **기존 경쟁자** | 중 | GitLab Auto DevOps, Jenkins X가 일부 자동화 제공하나 AI Native 통합은 약함 |
| **신규 진입자** | 고 | Claude Code Action, Cursor, Copilot Workspace 등 AI 코딩 도구들의 DevOps 확장 |
| **대체재** | 중 | 수동 CI/CD + 수동 모니터링이 여전히 대부분 팀의 표준 |
| **공급자 교섭력** | 고 | Claude API(Anthropic), AWS, GitHub에 대한 종속성 |
| **구매자 교섭력** | 중 | Enterprise 고객은 대안이 많지만, PDCA 통합 경험은 bkit만 제공 |

---

## 3. Research Analysis

### 3.1 User Personas

#### Persona 1: DevOps Lead 김서준 (Primary)

| 항목 | 내용 |
|------|------|
| **역할** | 스타트업 DevOps Lead (팀 3명) |
| **경력** | 5년 (AWS, K8s, Terraform) |
| **Pain Points** | 1) 새벽 On-Call 알림으로 번아웃 2) CI/CD 파이프라인 설정에 전체 시간의 40% 소비 3) 에러 로그 분석에 반복적 시간 투자 |
| **JTBD** | "프로덕션 에러가 발생했을 때, AI가 자동으로 분석하고 수정 PR을 만들어서, 내가 리뷰만 하면 되게 하고 싶다" |
| **기대 가치** | MTTR 80% 감소, On-Call 부담 60% 감소 |
| **bkit 사용 수준** | Enterprise 레벨, 현재 PDCA Plan/Design/Do만 사용 |

#### Persona 2: 풀스택 개발자 이하은 (Secondary)

| 항목 | 내용 |
|------|------|
| **역할** | 1인 개발자 / 초기 스타트업 CTO |
| **경력** | 3년 (Next.js, Python, Docker) |
| **Pain Points** | 1) DevOps 전문 지식 부족으로 배포가 두렵다 2) 프로덕션 장애 시 혼자 대응해야 함 3) CI/CD 설정을 매 프로젝트마다 처음부터 작성 |
| **JTBD** | "DevOps를 잘 몰라도, bkit이 CI/CD 파이프라인을 자동으로 만들어주고 관리해줬으면 좋겠다" |
| **기대 가치** | 배포 설정 시간 90% 절약, DevOps 학습 곡선 제거 |
| **bkit 사용 수준** | Dynamic 레벨, 현재 Vercel 수동 배포 |

#### Persona 3: Enterprise Architect 박민호 (Tertiary)

| 항목 | 내용 |
|------|------|
| **역할** | 대기업 클라우드 아키텍트 (팀 15명 관리) |
| **경력** | 10년 (MSA, EKS, 멀티 리전) |
| **Pain Points** | 1) 마이크로서비스 30개의 배포 조율 복잡 2) 보안 컴플라이언스로 자동화 범위 제한 3) Self-Healing 도입 시 거버넌스 우려 |
| **JTBD** | "Self-Healing 자동화를 도입하되, 모든 변경이 감사 로그에 기록되고 승인 워크플로우를 거치게 하고 싶다" |
| **기대 가치** | 배포 빈도 3x 증가, 컴플라이언스 유지하면서 자동화 확대 |
| **bkit 사용 수준** | Enterprise 레벨, 조직 내 파일럿 검토 중 |

### 3.2 Customer Journey Map (Primary Persona: 김서준)

```
[Awareness]                    [Consideration]               [Adoption]                  [Retention]                [Advocacy]
│                              │                             │                           │                          │
│ "bkit으로 코드는             │ "Self-Healing이              │ "DEV 환경에서              │ "프로덕션에서               │ "Self-Healing PR이
│  잘 만드는데,                │  가능하다고?                  │  먼저 테스트해보자"         │  첫 자동 수정 PR 성공!"     │  월 평균 20개 생성,
│  배포는 여전히 수동"          │  어떻게 동작하지?"            │                           │                          │  모두 승인"
│                              │                             │                           │                          │
├── Touchpoint:                ├── Touchpoint:               ├── Touchpoint:             ├── Touchpoint:            ├── Touchpoint:
│   phase-9-deployment 사용    │   /pdca pm 분석 결과 확인     │   /pdca deploy --env dev  │   Self-Healing 알림       │   /pdca report에
│                              │                             │                           │   Slack 수신              │   운영 메트릭 포함
│                              │                             │                           │                          │
├── Feeling: 불만족             ├── Feeling: 기대              ├── Feeling: 약간 불안       ├── Feeling: 놀라움          ├── Feeling: 신뢰
│   (수동 작업 많음)            │   (자동화 가능성)             │   (새 시스템 학습)          │   (AI가 정확히 수정)       │   (팀에 추천)
│                              │                             │                           │                          │
└── Action:                    └── Action:                   └── Action:                 └── Action:                └── Action:
    docs 읽기                      PRD 검토, POC 결정             DEV 환경 설정                STAGING 확장               블로그/발표
```

### 3.3 Competitive Analysis (5 Competitors)

| # | 경쟁사 | 유형 | 강점 | 약점 | bkit 차별점 |
|---|--------|------|------|------|-------------|
| 1 | **GitHub Copilot Workspace** | AI 코딩 + CI | GitHub 네이티브, 대규모 사용자 | DevOps 자동화 없음, Self-Healing 없음, PDCA 없음 | bkit은 Plan->Heal 전체 사이클 커버 |
| 2 | **GitLab Auto DevOps** | CI/CD 자동화 | 빌트인 CI/CD, Auto Deploy, SAST/DAST | AI 코드 수정 없음, Self-Healing 없음 | bkit은 AI 기반 에러 분석+수정 제공 |
| 3 | **Gitar.ai** | Self-Healing CI/CD | AI 기반 파이프라인 자동 수정 | 코드 생성/PDCA 없음, 독립 도구 | bkit은 개발 전체 워크플로우와 통합 |
| 4 | **Qodo (CodeiumAI)** | AI 코드 리뷰 | CI/CD 파이프라인 내 AI 리뷰 | 인프라 자동화 없음, 배포 미지원 | bkit은 인프라+코드+운영 통합 |
| 5 | **Harness AI** | CI/CD + AIOps | ML 기반 배포 최적화, 롤백 자동화 | 고가, 학습 곡선 높음, Claude Code 미지원 | bkit은 Claude Code 네이티브, 오픈소스 |

### 3.4 Market Sizing (TAM/SAM/SOM)

#### 방법 1: Top-Down

| 지표 | 규모 | 산출 근거 |
|------|------|-----------|
| **TAM** | $25.5B | 글로벌 DevOps 시장 (2027 예측) |
| **SAM** | $2.55B | TAM의 10% - AI Native DevOps 도구 시장 (AI 코딩 + CI/CD 통합) |
| **SOM** | $25.5M | SAM의 1% - Claude Code 생태계 내 DevOps 자동화 도구 |

#### 방법 2: Bottom-Up

| 지표 | 규모 | 산출 근거 |
|------|------|-----------|
| **TAM** | $18B | 전 세계 개발 팀 300만 x 연 $6,000/팀 DevOps 도구 비용 |
| **SAM** | $1.8B | AI 코딩 도구 사용 팀 30만 (10%) x 연 $6,000 |
| **SOM** | $18M | Claude Code 사용 팀 3만 (1%) x 연 $600 bkit 구독 |

#### 합산 추정

| 지표 | 평균 추정치 |
|------|-------------|
| **TAM** | ~$21B |
| **SAM** | ~$2.2B |
| **SOM** | ~$22M (1-2년 목표) |

---

## 4. ICP & GTM Strategy

### 4.1 ICP (Ideal Customer Profile)

| 속성 | 정의 |
|------|------|
| **Company Size** | 10-200명 개발 조직 |
| **Tech Stack** | AWS + Kubernetes/Docker + GitHub + Claude Code |
| **DevOps Maturity** | CI/CD 파이프라인은 있으나 AI 자동화 미도입 |
| **Pain Intensity** | 월 2회 이상 프로덕션 장애, MTTR > 2시간 |
| **Budget** | 연 $5K-50K DevOps 도구 예산 |
| **Decision Maker** | CTO, VP of Engineering, DevOps Lead |

### 4.2 Beachhead Segment (Geoffrey Moore)

| 기준 | 점수 (1-5) | 설명 |
|------|-----------|------|
| **접근성** | 5 | 기존 bkit Enterprise 사용자 - 이미 채널 확보 |
| **Pain 강도** | 4 | 배포+모니터링 수동 작업에 대한 불만 높음 |
| **구매력** | 3 | 스타트업은 예산 제한적, 중견기업은 충분 |
| **전략적 가치** | 5 | Enterprise 레퍼런스 확보 -> 시장 확대의 기반 |
| **총점** | **17/20** | |

**Beachhead**: bkit Enterprise 레벨을 이미 사용 중인 10-50명 규모 스타트업 개발팀, AWS + K8s 인프라 운영 중, 전담 DevOps 엔지니어 1-3명.

### 4.3 GTM Strategy

| 채널 | 전략 | 기대 효과 |
|------|------|-----------|
| **bkit Marketplace** | Self-Healing CI/CD를 Enterprise 전용 기능으로 출시 | 기존 사용자 업그레이드 유도 |
| **Claude Code Plugin 생태계** | claude-code-action과의 공식 통합 예제 공개 | Claude Code 사용자 유입 |
| **기술 블로그/YouTube** | "bkit으로 Self-Healing CI/CD 구축하기" 시리즈 | SEO + 커뮤니티 인지도 |
| **DevOps 컨퍼런스** | KubeCon, DevOpsDays에서 라이브 데모 | Enterprise 리드 확보 |
| **GitHub Open Source** | Terraform/K8s 템플릿을 오픈소스로 공개 | 개발자 커뮤니티 기여 |

### 4.4 Competitive Battlecard

| 질문 | bkit 답변 |
|------|-----------|
| "GitHub Copilot이면 충분하지 않나요?" | Copilot은 코드 생성에 집중합니다. bkit은 코드 생성 + 배포 + 모니터링 + Self-Healing까지 전체 PDCA 사이클을 커버합니다. |
| "GitLab Auto DevOps와 뭐가 다른가요?" | GitLab은 CI/CD 자동화에 강하지만, AI 기반 에러 분석과 자동 코드 수정은 없습니다. bkit은 Claude Code를 활용한 Self-Healing을 제공합니다. |
| "Harness AI가 더 성숙하지 않나요?" | Harness는 엔터프라이즈 CI/CD에 강하지만, 연 $50K+ 비용과 높은 학습 곡선이 있습니다. bkit은 Claude Code 생태계에 네이티브하고, 개발 워크플로우와 통합됩니다. |
| "Self-Healing이 프로덕션을 망가뜨리면?" | bkit은 6개 Human Intervention Point를 엄격히 유지합니다. Self-Healing PR은 반드시 사람이 리뷰/승인해야 머지되고, ArgoCD가 자동 배포합니다. |

---

## 5. bkit Integration Analysis (핵심 분석)

### 5.1 통합 시 필요한 수정사항

#### 5.1.1 새로 추가해야 할 컴포넌트

| 컴포넌트 | 유형 | 설명 | 복잡도 |
|----------|------|------|--------|
| `deploy` 스킬 | Skill (Workflow) | `/pdca deploy {feature} --env [dev\|staging\|prod]` 명령 | 높음 |
| `self-healing` 에이전트 | Agent | Slack Listener -> 에러 분석 -> 자동 PR 생성 | 매우 높음 |
| `monitoring-bridge` MCP 서버 | MCP Server | Prometheus/CloudWatch -> bkit 메트릭 브릿지 | 높음 |
| `deploy-guard` Hook | Hook | 배포 전/후 검증 + 롤백 트리거 | 중간 |
| `heal-trigger` Hook | Hook | Self-Healing 루프 시작/종료 이벤트 | 중간 |
| Automation Level L5-L6 | Core | L5(Deploy Auto), L6(Self-Heal Auto) 정의 | 낮음 |
| PDCA `deploy` phase | State Machine | 기존 Do -> Check 사이에 Deploy phase 추가 | 높음 |

#### 5.1.2 수정해야 할 기존 컴포넌트

| 컴포넌트 | 현재 상태 | 수정 내용 |
|----------|-----------|-----------|
| `phase-9-deployment` 스킬 | 가이드만 제공 | `deploy` 스킬로 대체 또는 확장, 실제 실행 자동화 추가 |
| `infra-architect` 에이전트 | Terraform/K8s 설계만 | CI/CD 워크플로우 생성 + ArgoCD 매니페스트 자동 생성 기능 추가 |
| `gap-detector` 에이전트 | 코드 vs 설계 비교만 | 운영 메트릭(uptime, error rate, latency) 포함한 확장 Gap 분석 |
| `.pdca-status.json` | phase: plan/design/do/check/act | phase: deploy 추가, 운영 메트릭 필드 추가 |
| `bkit.config.json` | automation.defaultLevel: 2 | L5/L6 설정 추가, self-healing 설정 섹션 추가 |
| Hook 시스템 (`hooks.json`) | 18개 이벤트 | `deploy-start`, `deploy-complete`, `deploy-failed`, `heal-start`, `heal-complete` 추가 |
| PDCA 상태 머신 | 20 transitions, 9 guards | deploy phase transitions + self-healing loop transitions 추가 |
| `enterprise` 스킬 | Terraform/K8s 템플릿 보유 | Self-Healing 관련 템플릿 + ArgoCD App 정의 템플릿 추가 |

#### 5.1.3 6-Layer -> bkit 매핑 (v2.0 업데이트)

| Architecture Layer | bkit 매핑 | 구현 방식 |
|-------------------|-----------|-----------|
| **L1: Source & CI/CD** | `deploy` 스킬 + `infra-architect` | GHA 워크플로우 자동 생성 + **Test/Lint + Security Scan (SAST/Trivy) + Approval Gate** |
| **L2: AWS Infrastructure** | `enterprise` 스킬 + 환경별 템플릿 | DEV(Docker Compose), **STAGING(EKS 단기운영)**, PROD(EKS + **Argo Rollouts Canary** + **Karpenter**) |
| **L3: Security** *(신규)* | `security-architect` 에이전트 + 템플릿 | CloudFront, WAF, VPC, IRSA, Network Policy, ACM, Secrets Rotation, Backup/DR 템플릿 생성 |
| **L4: Full Observability** | `infra-architect` 템플릿 생성 | **3축**: Metrics(Prometheus/Grafana/AlertManager) + Logs(Loki/Promtail) + Traces(OpenTelemetry/Tempo) |
| **L5: Error Tracking** | `heal-trigger` Hook + Slack 연동 | Sentry webhook -> Slack(P1~P4) -> bkit 이벤트 트리거 -> PagerDuty 에스컬레이션 |
| **L6: Self-Healing** | `self-healing` 에이전트 + **Living Context** | Claude Code가 **컨텍스트 로딩 후** 수정 → bkit /pdca-iterate(max 5) → 100% Test Pass Gate → Auto PR → **Escalation/Audit/Rollback** |

#### 5.1.4 Living Context 시스템 (v2.0 신규 — Self-Healing 핵심)

Self-Healing이 "컨텍스트 없이 수정"하는 문제를 해결하기 위한 4-Layer 컨텍스트 시스템.

| Layer | 파일 | 생성 방식 | Self-Healing 시 역할 |
|-------|------|-----------|---------------------|
| **Scenario Matrix** | `docs/02-design/scenarios/*.yaml` | PDCA Design에서 Claude가 **자동 생성** + 사람 검토 | 수정 후 모든 시나리오 통과 검증, why/constraint 필드로 설계 의도 이해 |
| **Invariants Registry** | `.bkit/invariants.yaml` | 사람이 **핵심 비즈니스 룰만 작성** (10~20개) | critical invariant 위반 시 수정 거부 → 사람 에스컬레이션 |
| **Impact Map** | `.bkit/impact-map.yaml` | code-analyzer가 **정적 분석으로 자동 생성** | 수정 파일의 blast radius 자동 산정, 영향받는 파일 연쇄 검증 |
| **Incident Memory** | `.bkit/incident-memory.yaml` | Self-Healing 실행 시 **자동 누적** | 과거 동일 영역 장애 기록 참조, anti-pattern 반복 방지 |

**Self-Healing 컨텍스트 로딩 흐름**:
```
에러 발생 (Sentry/Slack)
    → ① Stack trace로 에러 위치 파일 식별
    → ② 컨텍스트 자동 로딩:
        ├── scenarios/*.yaml   → 이 파일이 커버하는 시나리오
        ├── invariants.yaml    → 이 파일의 불변 조건
        ├── impact-map.yaml    → 수정 시 영향 범위
        ├── incident-memory    → 과거 장애 기록 + anti-pattern
        └── PDCA Plan/Design   → 원래 설계 의도
    → ③ Claude Code가 컨텍스트 포함하여 수정
    → ④ bkit /pdca-iterate 검증:
        ├── 시나리오 매트릭스 전체 통과?
        ├── 불변 조건 위반 없음?
        ├── 영향 범위 내 다른 파일 깨지지 않음?
        └── 과거 anti-pattern 반복 안 함?
    → ⑤ 전부 통과 → Auto PR / 실패 → 재시도(max 5) or 에스컬레이션
```

#### 5.1.5 리스크 완화 전략 (v2.0 업데이트)

| 원래 리스크 | 완화 전략 | 해결도 | 잔여 리스크 |
|------------|-----------|--------|------------|
| Staging EKS 비용 ($150+/월) | **단기 운영**: PR/릴리즈 시에만 EKS 생성→테스트→파괴 (GHA 자동화) | 90% | 클러스터 생성 대기 15~20분 |
| 디버깅 복잡도 (6 Layer × 3 Env) | **단계별 디버깅 + Full Observability**: Loki/Tempo/Prometheus 3축으로 레이어별 상태 조회 자동화 | 75% | 레이어 간 상호작용은 경험 필요 |
| MCP 부하 (5+ 서비스 실시간 연동) | **GitOps 방식**: infra-architect가 템플릿만 생성, 실제 적용은 git push→GHA→Terraform/ArgoCD | 100% | 없음 |

### 5.2 통합 시 좋아지는 점 (구체적)

| # | 개선 사항 | Before (현재) | After (통합 후) | 정량적 기대 |
|---|-----------|--------------|-----------------|-------------|
| 1 | **MTTR (평균 복구 시간)** | 수동 에러 분석 -> 수동 핫픽스 -> 수동 배포 (2-6시간) | 자동 에러 분석 -> 자동 수정 PR -> Human 리뷰 -> ArgoCD 배포 (15-45분) | 80% 감소 |
| 2 | **배포 일관성** | 환경별 수동 설정, 환경 간 드리프트 발생 | Terraform + ArgoCD GitOps로 환경 동기화 보장 | 설정 드리프트 0% |
| 3 | **PDCA 완결성** | Plan -> Do -> Check만 자동화 (코드까지만) | Plan -> Do -> Deploy -> Monitor -> Heal -> Check 전체 자동화 | PDCA 커버리지 60% -> 95% |
| 4 | **개발자 경험** | phase-9-deployment는 문서 가이드만 | `/pdca deploy --env staging` 한 명령으로 배포 실행 | 배포 시간 5단계 -> 1단계 |
| 5 | **운영 품질 가시성** | Check 단계가 코드 구조만 검증 | Check 단계가 운영 메트릭(error rate, latency, uptime) 포함 | Match Rate 정확도 30% 향상 |
| 6 | **On-Call 부담** | 모든 에러에 사람이 직접 대응 | 정형화된 에러는 Self-Healing 자동 처리, Critical만 On-Call | On-Call 알림 60% 감소 |
| 7 | **bkit 시장 포지션** | AI 코딩 도구 (코드 생성 중심) | AI Native DevOps 플랫폼 (생성 + 운영 통합) | TAM 3x 확대 |

### 5.3 통합 시 나빠지는 점 (구체적)

| # | 악화 사항 | 상세 설명 | 심각도 | 완화 전략 |
|---|-----------|-----------|--------|-----------|
| 1 | **복잡성 급증** | 현재 37개 에이전트 + 28개 스킬에 Self-Healing 관련 컴포넌트 7개+ 추가. 플러그인 크기와 의존성 대폭 증가 | 높음 | 모듈화: Self-Healing을 별도 패키지(`bkit-infra`)로 분리, 선택적 설치 |
| 2 | **외부 의존성 증가** | AWS, Prometheus, Sentry, Slack, ArgoCD 등 외부 서비스 5개+ 필수. 하나라도 장애나면 파이프라인 중단 | 높음 | Fallback 체인: 외부 서비스 장애 시 수동 모드 자동 전환 + 알림 |
| 3 | **Claude API 비용 증가** | Self-Healing 분석마다 Claude API 호출. 프로덕션 에러가 빈번한 서비스의 경우 API 비용 급증 가능 | 중간 | Rate limiting, 에러 중복 제거, 분석 캐싱, 에러 심각도 필터링 |
| 4 | **보안 리스크 확대** | Claude Code가 프로덕션 코드를 자동 수정 -> 잘못된 수정이 머지되면 장애 확대. 프로덕션 접근 권한 관리 필수 | 높음 | 6개 Human Gate 엄격 유지, 자동 수정 범위 제한(config, 단순 버그만), 보안 리뷰 필수 |
| 5 | **학습 곡선 증가** | Enterprise 사용자도 AWS + K8s + Terraform + ArgoCD + Prometheus 지식 필요. Starter/Dynamic 사용자는 접근 불가 | 중간 | 레벨별 차등 제공: Starter(가이드만), Dynamic(Docker Compose+GH Actions), Enterprise(Full 5-Layer) |
| 6 | **디버깅 어려움** | Self-Healing 루프 내 문제 발생 시, 에러 원인이 코드인지/인프라인지/Self-Healing 로직인지 추적 어려움 | 중간 | 상세 감사 로그, Self-Healing 이력 대시보드, 단계별 드라이런 모드 |
| 7 | **PDCA 상태 머신 복잡화** | 현재 20 transitions + 9 guards에서 deploy/heal 관련 10+ transitions 추가. 상태 폭발 위험 | 중간 | deploy phase를 서브 상태 머신으로 분리, 메인 PDCA와 느슨한 결합 |
| 8 | **테스트 커버리지 유지 어려움** | 현재 3,127 TC 100% 모듈 커버리지 달성. 새 컴포넌트 추가 시 테스트 부담 급증 | 중간 | 새 모듈별 독립 테스트 스위트, 통합 테스트는 E2E 시나리오 기반 |

### 5.4 PDCA 워크플로우와 Self-Healing CI/CD 상호작용

```
[기존 PDCA Flow]                        [Self-Healing CI/CD Flow]

  Plan ───────────────────────────────── (인프라 요구사항 정의)
    │                                       │
    v                                       v
  Design ─────────────────────────────── (인프라 아키텍처 설계)
    │                                    (Terraform 모듈 선택)
    │                                    (환경별 스펙 결정)
    v                                       │
  Do ─────────────────────────────────── (코드 구현)
    │                                       │
    v                                       v
 [NEW] Deploy ────────────────────────── Layer 1: CI/CD 실행
    │   /pdca deploy --env dev               │ GitHub Actions Trigger
    │   /pdca deploy --env staging           │ Terraform Apply
    │   /pdca deploy --env prod              │ ArgoCD Sync (Prod)
    v                                       v
  Check ──────────────────────────────── Layer 3: Monitoring 연동
    │   gap-detector + 운영 메트릭           │ Prometheus 데이터 수집
    │   Match Rate = 코드 + 운영 품질        │ CloudWatch Logs 분석
    │                                       │ Grafana 대시보드
    v                                       v
  Act ────────────────────────────────── Layer 4-5: Self-Healing Loop
    │   pdca-iterator + self-healing         │ Sentry 에러 감지
    │                                       │ Slack 알림
    │   [Match Rate >= 90%]                  │ Claude Code 분석
    v                                       │ 자동 수정 PR
  Report ─────────────────────────────── │ Human PR Review (Gate)
    │   운영 메트릭 포함 리포트              │ ArgoCD Auto Sync
    v                                       │
  Archive                                   └──> 루프 (다음 에러까지)
```

#### 상호작용 포인트 상세

| # | 상호작용 | 방향 | 메커니즘 |
|---|----------|------|----------|
| 1 | Plan -> 인프라 요구사항 | PDCA -> CI/CD | Plan 문서에 환경 요구사항 섹션 추가. deploy 스킬이 참조 |
| 2 | Design -> Terraform 모듈 | PDCA -> CI/CD | Design 문서에 인프라 아키텍처 포함. infra-architect가 Terraform/K8s 매니페스트 생성 |
| 3 | Deploy -> GitHub Actions | PDCA -> CI/CD | `/pdca deploy` 명령이 GitHub Actions 워크플로우 트리거 |
| 4 | Monitoring -> Check | CI/CD -> PDCA | monitoring-bridge MCP가 운영 메트릭을 gap-detector에 전달. Match Rate 계산에 반영 |
| 5 | Self-Healing -> Act | CI/CD -> PDCA | Self-Healing PR이 PDCA Act iteration으로 기록. 자동 수정 이력이 PDCA 히스토리에 포함 |
| 6 | Check -> Deploy Gate | PDCA -> CI/CD | Match Rate < 90%이면 다음 환경 배포 차단 (DEV 90%+ -> STAGING 승격 가능) |
| 7 | Human Gate -> PDCA | CI/CD -> PDCA | 6개 Human Intervention Point 각각이 PDCA Checkpoint로 매핑 |

#### Automation Level 확장

| Level | 기존 | 확장 (통합 후) |
|-------|------|---------------|
| **L0** | 완전 수동 | 완전 수동 (변경 없음) |
| **L1** | 가이드 제공 | 가이드 + 인프라 가이드 제공 |
| **L2** | 반자동 (확인 필요) | 반자동 + 배포 확인 |
| **L3** | 자동 (리뷰만) | 자동 + 배포 자동 (STAGING까지) |
| **L4** | 완전 자동 | 완전 자동 (모든 환경 배포) |
| **L5** | (없음) | **Deploy Auto**: CI/CD 파이프라인 자동 실행, 환경 승격 자동 |
| **L6** | (없음) | **Self-Heal Auto**: 에러 감지 -> 분석 -> 수정 PR 자동, Human Review만 필수 |

---

## 6. PRD - Functional Requirements

### 6.1 Feature List

| ID | Feature | Priority | Complexity | 설명 |
|----|---------|----------|------------|------|
| F-01 | `/pdca deploy` 스킬 | P0 | 높음 | `--env [dev\|staging\|prod]` 파라미터로 환경별 배포 실행 |
| F-02 | GitHub Actions 워크플로우 자동 생성 | P0 | 중간 | `.github/workflows/deploy.yml` 자동 생성 (환경별 분기) |
| F-03 | Terraform 템플릿 자동 선택 | P1 | 중간 | 프로젝트 레벨에 따라 DEV/STAGING/PROD 인프라 템플릿 제공 |
| F-04 | ArgoCD Application 매니페스트 생성 | P1 | 중간 | Production 환경용 ArgoCD App + Helm Chart 자동 생성 |
| F-05 | `monitoring-bridge` MCP 서버 | P1 | 높음 | Prometheus/CloudWatch 메트릭을 bkit으로 브릿지 |
| F-06 | gap-detector 운영 메트릭 확장 | P1 | 중간 | Check 단계에서 error rate, latency, uptime 포함 분석 |
| F-07 | `self-healing` 에이전트 | P2 | 매우 높음 | Slack Listener -> Claude Code 분석 -> 자동 PR 생성 |
| F-08 | Deploy Hook 이벤트 | P0 | 낮음 | `deploy-start`, `deploy-complete`, `deploy-failed` 이벤트 |
| F-09 | Self-Healing Hook 이벤트 | P2 | 낮음 | `heal-start`, `heal-complete`, `heal-failed` 이벤트 |
| F-10 | Automation Level L5/L6 | P1 | 낮음 | bkit.config.json에 L5(Deploy Auto), L6(Self-Heal) 정의 |
| F-11 | PDCA Deploy Phase | P0 | 높음 | 상태 머신에 deploy phase transitions 추가 |
| F-12 | 환경별 승격 게이트 | P1 | 중간 | DEV 90%+ -> STAGING, STAGING 95%+ -> PROD 자동 승격 조건 |
| F-13 | 배포 롤백 스킬 | P1 | 중간 | `/pdca rollback {feature} --env [env]` 빠른 롤백 |
| F-14 | Self-Healing 감사 로그 | P2 | 중간 | 모든 Self-Healing 활동의 감사 추적 기록 |
| F-15 | 레벨별 차등 배포 | P0 | 중간 | Starter(가이드), Dynamic(Docker+GH Actions), Enterprise(Full 6-Layer) |
| F-16 | **Scenario Matrix 자동 생성** | P0 | 중간 | PDCA Design에서 시나리오 매트릭스(입력/출력/경계값/why/constraint) 자동 생성 |
| F-17 | **Invariants Registry** | P1 | 낮음 | `.bkit/invariants.yaml` — 핵심 비즈니스 룰 불변조건 관리, critical 위반 시 수정 거부 |
| F-18 | **Impact Map 자동 생성** | P1 | 중간 | code-analyzer 정적 분석으로 의존관계/blast radius 자동 산정 |
| F-19 | **Incident Memory 자동 누적** | P2 | 낮음 | Self-Healing 실행 시 에러/원인/수정/교훈/anti-pattern 자동 기록 |
| F-20 | **Self-Healing 컨텍스트 로더** | P0 | 높음 | 에러 발생 시 관련 파일의 4-Layer 컨텍스트 자동 로딩 후 Claude Code에 주입 |
| F-21 | **Security Layer 템플릿** | P1 | 중간 | CloudFront, WAF, VPC, IRSA, Network Policy, ACM, Secrets Rotation, Backup/DR |
| F-22 | **Full Observability 템플릿** | P1 | 중간 | Metrics(Prometheus) + Logs(Loki/Promtail) + Traces(OpenTelemetry/Tempo) |
| F-23 | **Canary Deploy (Argo Rollouts)** | P2 | 높음 | 프로덕션 점진적 배포 + 자동 롤백 |
| F-24 | **Staging EKS 단기 운영** | P1 | 중간 | PR/릴리즈 트리거로 EKS 클러스터 on-demand 생성/파괴 자동화 |

### 6.2 Non-Functional Requirements

| ID | 요구사항 | 기준 |
|----|----------|------|
| NF-01 | 배포 파이프라인 지연시간 | CI/CD 트리거부터 배포 완료까지 P95 < 10분 |
| NF-02 | Self-Healing 응답 시간 | 에러 감지부터 PR 생성까지 P95 < 5분 |
| NF-03 | Self-Healing PR 정확도 | 자동 생성 PR의 Human Review 승인율 >= 60% |
| NF-04 | 시스템 가용성 | monitoring-bridge MCP 서버 99.9% uptime |
| NF-05 | 보안 | 프로덕션 접근 권한 최소화, 모든 변경 감사 로그 |
| NF-06 | 하위 호환성 | 기존 PDCA 워크플로우 100% 호환 유지 |
| NF-07 | 플러그인 크기 | Self-Healing 패키지 분리로 기본 설치 크기 유지 |

### 6.3 Success Criteria

| 기준 | 목표 | 측정 방법 |
|------|------|-----------|
| MTTR 감소 | 현재 대비 70%+ 감소 | 장애 발생 -> 해결까지 평균 시간 비교 |
| Self-Healing PR 승인율 | 60%+ | 자동 생성 PR 중 Human Review 통과 비율 |
| 배포 빈도 | 현재 대비 2x 증가 | 주간 배포 횟수 비교 |
| 배포 실패율 | 5% 이하 | 전체 배포 중 롤백 발생 비율 |
| PDCA 커버리지 | 95%+ | 전체 개발 사이클 중 자동화된 비율 |
| 사용자 만족도 | NPS 70+ | Enterprise 사용자 설문 |

---

## 7. Implementation Roadmap

### Phase 1: Living Context Foundation (3주) ★ 최우선

Self-Healing의 핵심 전제조건 — 컨텍스트 없이 수정하면 의미 없음

- F-16: **Scenario Matrix 자동 생성** (PDCA Design 연동)
- F-17: **Invariants Registry** (`.bkit/invariants.yaml`)
- F-18: **Impact Map 자동 생성** (code-analyzer 확장)
- F-20: **Self-Healing 컨텍스트 로더** (4-Layer 로딩 엔진)

### Phase 2: Deploy Foundation (4주)

- F-01: `/pdca deploy` 스킬 기본 구현
- F-02: GitHub Actions 워크플로우 자동 생성
- F-08: Deploy Hook 이벤트
- F-11: PDCA Deploy Phase (상태 머신 확장)
- F-15: 레벨별 차등 배포

### Phase 3: Infrastructure + Security (4주)

- F-03: Terraform 템플릿 자동 선택
- F-04: ArgoCD Application 매니페스트 생성
- F-21: **Security Layer 템플릿** (CloudFront, WAF, VPC, IRSA 등)
- F-24: **Staging EKS 단기 운영** (on-demand 생성/파괴)
- F-10: Automation Level L5/L6
- F-12: 환경별 승격 게이트
- F-13: 배포 롤백 스킬

### Phase 4: Observability Integration (3주)

- F-22: **Full Observability 템플릿** (Metrics + Logs + Traces)
- F-05: `monitoring-bridge` MCP 서버 (또는 infra-architect 템플릿 방식)
- F-06: gap-detector 운영 메트릭 확장

### Phase 5: Self-Healing (4주)

- F-07: `self-healing` 에이전트 (**Living Context 기반**)
- F-09: Self-Healing Hook 이벤트
- F-14: Self-Healing 감사 로그
- F-19: **Incident Memory 자동 누적**
- F-23: **Canary Deploy (Argo Rollouts)**

### Phase 6: Polish & Launch (2주)

- E2E 통합 테스트 (Living Context → Self-Healing 전체 루프)
- 문서화 및 튜토리얼
- Enterprise 사용자 베타 테스트

**총 예상 기간**: 20주 (약 5개월)

---

## 8. Risk Assessment & Pre-mortem

### 8.1 Pre-mortem: "이 프로젝트가 실패한 이유는..."

| # | 실패 시나리오 | 확률 | 영향 | 예방/완화 |
|---|-------------|------|------|-----------|
| 1 | **Self-Healing이 잘못된 수정을 프로덕션에 반영하여 장애 악화** | 중간 | 치명적 | Human Review Gate 절대 제거 불가. 수정 범위를 config/단순버그로 제한. 자동 롤백 트리거 포함 |
| 2 | **Claude API 비용이 예상보다 5-10x 초과** | 높음 | 높음 | Rate limiting, 에러 중복 제거, 분석 결과 캐싱, 비용 상한선 설정 (bkit.config.json) |
| 3 | **외부 서비스(AWS/Slack/Sentry) 장애로 전체 파이프라인 중단** | 중간 | 높음 | 각 단계별 fallback 모드(수동 전환), Circuit Breaker 패턴 적용 |
| 4 | **PDCA 상태 머신 복잡성 폭발로 유지보수 불가** | 중간 | 높음 | Deploy를 서브 상태 머신으로 분리, 기존 PDCA와 느슨한 결합 유지 |
| 5 | **Enterprise 사용자 중 AWS+K8s 사용자가 예상보다 적음** | 중간 | 중간 | Dynamic 레벨(Docker+GH Actions)도 지원하여 접근성 확보. Phase 1에서 사용자 조사 선행 |

### 8.2 Risk Matrix

| Risk | Probability | Impact | Priority | Owner |
|------|------------|--------|----------|-------|
| Self-Healing 오류 확산 | Medium | Critical | P0 | security-architect |
| API 비용 초과 | High | High | P0 | cto-lead |
| 외부 서비스 의존성 | Medium | High | P1 | infra-architect |
| 상태 머신 복잡성 | Medium | High | P1 | enterprise-expert |
| 사용자 채택률 저조 | Low | Medium | P2 | product-manager |

---

## 9. User Stories

### 9.1 핵심 User Stories

| ID | As a | I want to | So that | Priority |
|----|------|-----------|---------|----------|
| US-01 | DevOps Lead | `/pdca deploy --env staging`으로 한 명령에 배포 | 수동 배포 단계를 줄이고 배포 빈도를 높일 수 있다 | P0 |
| US-02 | DevOps Lead | Self-Healing이 에러를 자동 감지하고 수정 PR을 생성 | 새벽 On-Call 부담이 줄고 MTTR이 단축된다 | P2 |
| US-03 | 풀스택 개발자 | bkit이 내 프로젝트에 맞는 CI/CD 파이프라인을 자동 생성 | DevOps 지식 없이도 안정적인 배포가 가능하다 | P0 |
| US-04 | Enterprise Architect | Self-Healing의 모든 활동이 감사 로그에 기록 | 보안 컴플라이언스를 유지하면서 자동화를 확대할 수 있다 | P2 |
| US-05 | DevOps Lead | PDCA Check에서 운영 메트릭도 함께 확인 | 코드 품질과 운영 품질을 통합적으로 판단할 수 있다 | P1 |
| US-06 | 풀스택 개발자 | 배포 실패 시 `/pdca rollback`으로 즉시 롤백 | 프로덕션 장애 시간을 최소화할 수 있다 | P1 |
| US-07 | Enterprise Architect | Match Rate 90%+ 미달 시 다음 환경 배포 자동 차단 | 품질 기준 미달 코드가 프로덕션에 배포되는 것을 방지한다 | P1 |

### 9.2 INVEST Check (US-01)

| 기준 | 충족 | 설명 |
|------|------|------|
| **I**ndependent | O | 다른 스토리와 독립적으로 구현 가능 |
| **N**egotiable | O | `--env` 범위, 지원 플랫폼 등 조정 가능 |
| **V**aluable | O | 배포 시간 직접 단축 |
| **E**stimable | O | GitHub Actions 생성 + 트리거 로직으로 추정 가능 |
| **S**mall | O | 1-2 스프린트 내 완료 가능 |
| **T**estable | O | 배포 성공/실패, 환경별 분기 검증 가능 |

---

## 10. Test Scenarios

| ID | 시나리오 | 입력 | 기대 결과 | 관련 US |
|----|----------|------|-----------|---------|
| TS-01 | DEV 환경 배포 | `/pdca deploy feature-x --env dev` | Docker Compose로 DEV 환경에 성공적으로 배포, 상태 머신 deploy phase로 전환 | US-01 |
| TS-02 | STAGING 승격 차단 | DEV Match Rate 85%에서 staging 배포 시도 | "Match Rate 90% 미달, STAGING 승격 불가" 메시지 출력, 배포 차단 | US-07 |
| TS-03 | PROD 배포 + ArgoCD Sync | `/pdca deploy feature-x --env prod` | ArgoCD Application 매니페스트 생성, GitOps sync 트리거 | US-01 |
| TS-04 | Self-Healing PR 생성 | Sentry에서 TypeError 감지 -> Slack 알림 | Claude Code가 에러 분석 후 수정 PR 자동 생성, Human Review 대기 상태 | US-02 |
| TS-05 | CI/CD 파이프라인 자동 생성 | Dynamic 레벨 프로젝트에서 `/pdca deploy` | `.github/workflows/deploy.yml` 자동 생성 (Docker build + push) | US-03 |
| TS-06 | 배포 롤백 | `/pdca rollback feature-x --env staging` | 이전 버전으로 롤백, 상태 머신 do phase로 복원 | US-06 |
| TS-07 | 감사 로그 기록 | Self-Healing PR 생성 후 | `.bkit/heal-audit.json`에 에러 내용, 분석 결과, PR URL, 타임스탬프 기록 | US-04 |
| TS-08 | 운영 메트릭 Check 통합 | `/pdca analyze feature-x` (deploy 후) | gap-detector가 코드 Match Rate + 운영 메트릭(error rate, latency) 포함 보고 | US-05 |

---

## 11. Stakeholder Map

| Stakeholder | 역할 | 관심사 | 영향력 |
|-------------|------|--------|--------|
| bkit 사용자 (Enterprise) | 최종 사용자 | 기능 품질, 배포 안정성, 학습 곡선 | 높음 |
| bkit 사용자 (Dynamic) | 잠재 업그레이드 사용자 | 접근성, 가격, Docker 지원 여부 | 중간 |
| bkit Core Team | 개발팀 | 구현 복잡도, 유지보수성, 기존 아키텍처 영향 | 높음 |
| Anthropic (Claude Code) | 플랫폼 제공자 | API 사용량, 통합 품질, 생태계 확장 | 높음 |
| AWS | 인프라 제공자 | 서비스 사용량, 통합 패턴 품질 | 낮음 |
| 경쟁사 | 간접 이해관계자 | 기능 차별화, 시장 포지셔닝 | 낮음 |

---

## 12. Growth Loops

### 12.1 Product-Led Growth Loop

```
사용자가 /pdca deploy 사용
    -> 배포 성공 + 모니터링 자동화 경험
    -> Self-Healing이 에러 자동 수정
    -> 사용자가 팀에 공유/추천
    -> 팀 전체 bkit Enterprise 채택
    -> 더 많은 서비스에 적용
    -> 더 많은 Self-Healing 데이터 축적
    -> AI 수정 정확도 향상
    -> (루프)
```

### 12.2 Data Network Effect

Self-Healing 데이터가 축적될수록 에러 패턴 인식과 수정 정확도가 향상되는 네트워크 효과. 초기 채택자가 많을수록 후발 채택자의 경험이 좋아진다.

---

## Attribution

이 PRD는 bkit PM Agent Team이 다음 프레임워크를 사용하여 생성했습니다:

- **Discovery**: Teresa Torres의 Opportunity Solution Tree, Assumption Mapping
- **Strategy**: JTBD 6-Part Value Proposition, Lean Canvas (Ash Maurya), SWOT + SO/WT, Porter's Five Forces
- **Research**: JTBD Persona, Customer Journey Map, TAM/SAM/SOM (Dual Method)
- **GTM**: ICP, Beachhead Segment (Geoffrey Moore), Competitive Battlecard, Growth Loops
- **Execution**: Pre-mortem, INVEST User Stories, Test Scenarios, Stakeholder Map

PM Agent Team frameworks based on [pm-skills](https://github.com/phuryn/pm-skills) by Pawel Huryn (MIT License).

---

## Sources

- [How to Architect Self-Healing CI/CD for Agentic AI](https://optimumpartners.com/insight/how-to-architect-self-healing-ci/cd-for-agentic-ai/)
- [AI and ML in DevOps: Transforming CI/CD Pipelines](https://devops.com/ai-and-ml-in-devops-transforming-ci-cd-pipelines-into-intelligent-autonomous-workflows/)
- [CI/CD pipelines with agentic AI - Elasticsearch Labs](https://www.elastic.co/search-labs/blog/ci-pipelines-claude-ai-agent)
- [Autonomous Cloud Pipelines in 2025](https://cloudserv.ai/autonomous-cloud-pipelines-how-self-healing-systems-are-becoming-standard-in-2025/)
- [AI-Driven CI: Self-healing Pipelines - Semaphore](https://semaphore.io/blog/self-healing-ci)
- [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions)
- [Claude Code $1B Revenue 2026](https://orbilontech.com/claude-code-1b-revenue-ai-coding-revolution-2026/)
- [Top AI-Powered DevOps Tools for 2026](https://stackgen.com/blog/top-ai-powered-devops-tools-2026)
- [claude-code-action on GitHub](https://github.com/anthropics/claude-code-action)
- [Make Your Kubernetes Apps Self-Heal With Argo CD](https://thenewstack.io/make-your-kubernetes-apps-self-heal-with-argo-cd-and-gitops/)
- [CNCF Survey: Argo CD Majority Adopted GitOps Solution](https://www.cncf.io/announcements/2025/07/24/cncf-end-user-survey-finds-argo-cd-as-majority-adopted-gitops-solution-for-kubernetes/)
- [Self-Healing infrastructure using GitOps & ArgoCD](https://medium.com/@shubhs.2803/self-healing-infrastructure-using-gitops-argocd-e3b512af20c0)
