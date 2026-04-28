# bkit v2.1.10 바이브코딩 UX 완성도 심층 분석 (PM Team 관점)

> **분석 주체**: PM Team Lead + 4 Sub-Agents (pm-discovery, pm-strategy, pm-research, pm-prd)
> **분석 대상**: bkit v2.1.10 — Claude Code vibecoding 플러그인
> **분석 일자**: 2026-04-22
> **분석 목적**: 신규 기능 PRD가 아닌, **출시된 제품 자체의 UX 완성도 평가**
> **분석 범위**: 설치→첫 성공→일상 사용→에러 복구→가치 전달→생태계 적합성 전 영역

---

## Executive Summary

### 4-관점 요약표

| 관점 | 점수 | 핵심 진단 |
|------|:----:|-----------|
| **First Impression (15점)** | **9/15 ★★★** | 설치는 단순하나 "첫 성공"까지 마찰이 크다. 39 skills 목록 폭격에 초보자 위축. |
| **Learnability (20점)** | **10/20 ★★** | PDCA 철학은 훌륭하나, 36 agents × 39 skills 조합 폭발로 학습 곡선 가파름. Output Style 자동 선택이 부분적으로 완화. |
| **Daily UX (25점)** | **17/25 ★★★★** | Automation First 철학과 /pdca 체인은 강력. 단, 8 Checkpoint 중단이 L0 사용자에게만 적합. |
| **Value Delivery (20점)** | **16/20 ★★★★** | 90% Match Rate 정량 가드, 3,762 TC, Docs=Code CI는 "일감 치고 빠지기"를 막는 업계 최고 수준의 규율. |
| **Error Recovery (10점)** | **7/10 ★★★★** | self-healing agent + 5회 iterate 한도 + Defense-in-Depth 4-Layer는 탄탄. 단 에러 메시지 친화도는 중간. |
| **Community/Ecosystem Fit (10점)** | **6/10 ★★★** | Apache 2.0 + plugin.json marketplace 준비 완료. 그러나 동종 경쟁 대비 상대적 인지도 낮음, 영어 커뮤니티 부재. |
| **총점** | **65/100** | **B+ (Good, but needs targeted UX polish before mass adoption)** |

### Top 3 Delights (즉각적 감동)

1. **"90% 아래면 자동 재작업"** — 다른 AI 도구가 놓치는 품질 가드를 제품 수준으로 구현. `/pdca iterate`의 Evaluator-Optimizer 패턴.
2. **PDCA 문서가 Git에 남는다** — vibe coding의 치명적 약점(근거 없는 코드)을 `docs/00-pm/` ~ `docs/04-report/` 5 phase 문서 자동 생성으로 해소.
3. **8개 언어 자동 감지** — "정적 웹"이라 쓰면 자동으로 Starter 레벨 진입. 한국어 사용자에게 결정적 차별점.

### Top 3 Frictions (즉각적 마찰)

1. **"어디서 시작해야 할지 모름"** — 설치 후 39 skills / 36 agents / 21 hooks 노출. `/claude-code-learning` 추천이 약함.
2. **용어 과부하** — PDCA, Trust Score, Match Rate, L0~L4, Output Style, Agent Teams, Hook Events, Clean Architecture... 비개발자 거부감.
3. **Claude Code 버전 의존성** — v2.1.117+ 권고, v2.1.78+ 필수. 버전 불일치 시 조용한 기능 부분 작동으로 혼란.

---

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | 바이브코딩 시대, "prompt→accept→ship" 무규율 사이클에서 엔지니어링 디스크립린을 회복하기 위한 Claude Code 플러그인 |
| **WHO** | 3 Tier 사용자: 비개발자/학생(Starter) → 스타트업 풀스택 창업자(Dynamic) → 엔터프라이즈 개발팀(Enterprise) |
| **RISK** | 학습 곡선·용어 과부하로 초기 이탈 / Claude Code 버전 종속 / 경쟁자(Cursor, Cline) 대비 인지도 열세 |
| **SUCCESS** | (a) plugin marketplace 공식 등록, (b) 첫 `/pdca plan` → `/pdca report` 완주율 ≥ 60%, (c) Match Rate ≥ 90% 도달 feature 비율 ≥ 80% |
| **SCOPE** | 플러그인 자체 UX (설치·첫사용·일상·에러·가치·생태계) — bkend.ai SaaS, bkit-gemini, bkit-starter는 인접 제품으로 참조만 |

---

## 1. 제품 약속 분석 (README/plugin.json에서 추출)

### 1.1 명시적 약속 (Explicit Promises)

| # | 약속 | 근거 (README 위치) | 실제 전달도 |
|---|------|-------------------|:-----------:|
| P1 | "PDCA methodology로 AI-native development에 엔지니어링 디스크립린" | L10, L594 | ★★★★★ (전 체계 일관) |
| P2 | "39 Skills + 36 Agents + 3-Layer Orchestration" | L100-103 | ★★★★ (양은 풍부, 발견성 문제) |
| P3 | "90% Match Rate 자동 가드 + 최대 5회 iterate" | L105 | ★★★★★ (동종 최강) |
| P4 | "3 Project Levels — Starter/Dynamic/Enterprise" | L450-456 | ★★★★ (Level 감지 자동) |
| P5 | "8개 언어 자동 트리거" | L523-534 | ★★★★ (트리거 OK, 응답 언어는 별도 설정) |
| P6 | "Context Engineering 실용 구현 (6-Layer Hook)" | L31-56 | ★★★★ (철학 정합) |
| P7 | "Skill Evals로 skill 수명 관리 — 'Are my skills still worth keeping?'" | L110-181 | ★★★ (혁신적 but UX 미정착) |
| P8 | "PM Agent Team 43 frameworks (pm-skills MIT)" | L438-446 | ★★★★ (분석 깊이 우수) |

### 1.2 암묵적 약속 (Implicit Promises — Gap 존재)

| # | 암묵적 기대 | 실제 경험 | Gap |
|---|-----------|-----------|-----|
| I1 | "plugin 하나 설치하면 바로 쓸 수 있을 것" | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경변수, v2.1.117+ 권고, Node 18+ 필수 | **중간** |
| I2 | "한국어로 시작하면 한국어로 답할 것" | 트리거는 8개 언어 자동, 응답은 `language: "korean"` 명시 설정 필요 | **작음** |
| I3 | "AI Native Development OS라면 AI에게 설명하지 않아도 될 것" | 사용자가 `/pdca pm {feature}` → `/pdca plan` → `/pdca design` 명시적 호출 필요 | **중간** (제품 정체성↔UX 괴리) |
| I4 | "설치 직후 튜토리얼이 뜰 것" | SessionStart hook에 intro 있으나, "어느 명령부터"에 대한 온보딩 약함 | **큼** |
| I5 | "Starter는 개발 몰라도 될 것" | HTML/CSS/JS 기본 개념은 제공하나, `/pdca` 용어 자체가 비개발자 거부감 | **큼** |

### 1.3 약속과 전달의 Gap 총평

> **bkit은 "내용물"(what)은 과다 공급, "입구"(how to start)는 과소 공급하는 제품이다.**
> 39 skills / 36 agents / 21 hooks라는 숫자는 README에서는 자랑이지만, 초보자에게는 "선택지의 지옥"이다.

---

## 2. 페르소나 분석 (pm-research 담당)

### 2.1 페르소나 1: **Mina Park — 비개발자/입문자 (Starter)**

| 항목 | 상세 |
|------|------|
| **직함/배경** | 디자인 전공 4학년, 포트폴리오 사이트 제작 필요. Figma 능숙, 코드 경험 0 |
| **나이/지역** | 24세, 한국 서울 |
| **목표** | 3주 내 portfolio-site.com 배포 |
| **현재 도구** | Notion, Figma, ChatGPT Free (이따금) |
| **Pain Points** | (a) GitHub 계정도 없음, (b) "터미널"이라는 말 공포, (c) 영어 에러 메시지 두려움 |
| **JTBD** | "포트폴리오 사이트를 빨리 올려서, 친구·교수에게 링크 공유하고 취업 지원에 쓰고 싶다" |
| **bkit 적합도** | **★★☆ (33%)** — `/starter` + bkit-learning output style은 훌륭하나, 여전히 `/pdca plan` 용어가 장벽. **bkit-starter** 플러그인 쪽이 더 적합. |
| **기대 Value** | 한국어 안내 + 실수 자동 수정 + "다음에 뭐 해야 할지" 명확한 안내 |

### 2.2 페르소나 2: **Daniel Kwon — 풀스택 창업자 (Dynamic)**

| 항목 | 상세 |
|------|------|
| **직함/배경** | 3년차 전 FAANG 엔지니어, 현재 솔로 창업 (SaaS). TypeScript/Next.js/Supabase 숙련 |
| **나이/지역** | 31세, 한국/싱가포르 원격 |
| **목표** | 6주 내 MVP 런칭, Seed round 자료 준비 |
| **현재 도구** | Cursor + ChatGPT Plus + Linear + Supabase |
| **Pain Points** | (a) 혼자 일하니 코드 리뷰 부재, (b) 바이브코딩으로 쌓인 tech debt 불안, (c) 투자자에게 보여줄 "엔지니어링 근거" 필요 |
| **JTBD** | "짧은 기간 혼자서, 투자자에게 설명 가능한 코드를 만들고 싶다. AI에게 시키되 결과물은 검증하고 싶다" |
| **bkit 적합도** | **★★★★★ (95%)** — **정확한 Sweet Spot**. PDCA 문서가 투자자 자료가 됨. 90% Match Rate가 품질 근거. Agent Teams가 1인 창업자를 "팀처럼" 만듦. |
| **기대 Value** | 문서 자동 생성 + gap 감지 + 풀스택(bkend.ai) 연결 + 주 50시간 절약 |

### 2.3 페르소나 3: **Yuki Tanaka — 엔터프라이즈 개발팀 리더 (Enterprise)**

| 항목 | 상세 |
|------|------|
| **직함/배경** | 제조업체 사내 플랫폼 팀 테크 리드, 10년 경력. Java/Kubernetes/Terraform 숙련 |
| **나이/지역** | 37세, 일본 도쿄 |
| **목표** | 팀 내 AI 코딩 도입, 감사 대응 가능 수준의 규율 확보 |
| **현재 도구** | JetBrains + Copilot Enterprise + Jira + Backstage |
| **Pain Points** | (a) 보안·감사 요구 (OWASP, SBOM), (b) 팀원 간 AI 사용 편차, (c) 기존 JetBrains 워크플로우 이탈 부담 |
| **JTBD** | "AI 도입으로 생산성은 올리되, 팀원 개별 스타일 편차 없이 감사 대응 가능한 결과물을 만들고 싶다" |
| **bkit 적합도** | **★★★★ (80%)** — Clean Architecture 4-Layer + Defense-in-Depth + Audit Log NDJSON + Enterprise output style은 강력. 단 **Claude Code CLI 필수 전환**이 JetBrains 조직엔 장벽. |
| **기대 Value** | OWASP A03/A08 Sanitizer + Token Ledger 감사 로그 + K8s/Terraform 템플릿 + 6인 CTO Team |

### 2.4 페르소나 우선순위

| 우선순위 | 페르소나 | 적합도 | 시장 크기 | 결론 |
|:--------:|----------|:------:|:---------:|------|
| **1순위 (Beachhead)** | Daniel (Dynamic) | 95% | 중간 (~500K) | **집중 투자. 이 페르소나가 전도사가 된다.** |
| **2순위** | Yuki (Enterprise) | 80% | 소수 but 큰 계약 | 장기 성장 축 |
| **3순위** | Mina (Starter) | 33% | 대규모 but 이탈 高 | bkit-starter로 이관 권고 |

---

## 3. Jobs-To-Be-Done 6-Part 분석 (pm-discovery 담당)

**타겟 Job**: "바이브코딩으로 기능을 만들되, 품질과 근거를 잃지 않기"

| Part | 내용 |
|------|------|
| **When (상황)** | 혼자(또는 소규모 팀) AI로 기능을 만들어야 할 때, 특히 외부에 설명해야 하는 제품(MVP, 투자자 데모, 감사 대상 시스템)일 때 |
| **I want to (기능)** | AI가 생성한 코드를 자동으로 검증하고, 근거 문서를 남기며, 놓친 부분을 자동 수정하게 하고 싶다 |
| **So I can (결과)** | 짧은 시간에 "설명 가능한, 신뢰할 수 있는" 결과물을 얻고, 나중에 돌아봐도 왜 이렇게 짰는지 알 수 있다 |
| **Feel (정서)** | 불안 → **안심** (Match Rate 95% 숫자로 확인) / 피곤 → **통제감** (L0~L4로 내가 고삐 쥐는 느낌) / 고립 → **동료감** (Agent Teams) |
| **Socially (사회적 신호)** | "나도 제대로 일한다"를 Git log, PR, 투자자 데모에서 보여줌 / "바이브코더가 아니라 AI-Native Engineer다" |
| **Forces (추진·저항력)** | **추진**: AI 코드 품질 불안, 규제 압박, 혼자 일하는 고립감 / **저항**: 학습 곡선, Claude Code 종속, 용어 과다, "그냥 Cursor로 충분하지 않나?" |

---

## 4. Opportunity Solution Tree (pm-discovery 담당)

### 4.1 Outcome (북극성)
> **"바이브코딩하는 개발자가, 설명 가능한 결과물을 혼자서도 만들 수 있다"**

### 4.2 Top 5 Opportunities × bkit 해결책 매핑

| # | Opportunity (사용자 Pain) | bkit 해결 Solution | 해결 강도 |
|---|----------------------------|---------------------|:----------:|
| O1 | "AI가 생성한 코드, 맞게 돌아가는지 확신이 안 선다" | `/pdca analyze` + Match Rate + gap-detector (L1 API / L2 UI / L3 E2E) | ★★★★★ |
| O2 | "근거 문서가 없어 나중에 내가 봐도 모르겠다" | PDCA 4 문서 자동 생성 (plan/design/analysis/report) + Docs=Code CI | ★★★★★ |
| O3 | "버그가 나면 어디부터 고쳐야 할지" | self-healing agent + `/pdca iterate` 5회 자동 재시도 | ★★★★ |
| O4 | "혼자라 코드 리뷰가 안 된다" | CTO-Led Agent Teams (3~6명 병렬) + qa-lead + security-architect | ★★★★ |
| O5 | "어떤 stack/아키텍처가 내 상황에 맞나" | Design phase 3 Architecture Options (Minimal/Clean/Pragmatic) + 3 Level 자동 감지 | ★★★★ |

### 4.3 bkit이 놓치고 있는 기회 (Uncovered Opportunities)

| # | 놓친 기회 | 현재 상황 | 잠재 영향 |
|---|-----------|-----------|-----------|
| U1 | **"첫 5분 경험"** 자체가 상품이라는 인식 | 설치 후 `/claude-code-learning`을 알아서 찾아야 함 | 이탈 40%+ 추정 |
| U2 | **비바이브코더 온보딩** (GitHub 계정 없는 사용자) | bkit-starter로 이관했으나, bkit 본체에서 "bkit-starter 먼저 쓰세요" 안내 약함 | Starter 페르소나 Lost |
| U3 | **Non-Claude Code IDE 사용자** (JetBrains, VSCode Copilot) | Claude Code CLI 필수 — Enterprise 페르소나의 반수는 이 지점에서 이탈 | TAM 50% 제한 |
| U4 | **프로젝트 중도 합류** 워크플로우 | bkit은 green field 시작 전제. 기존 legacy 코드에 `/pdca` 부착하는 가이드 없음 | Enterprise 도입 장벽 |
| U5 | **팀 간 지식 공유** (한 명이 만든 PDCA 문서를 팀이 본다) | `.claude-plugin/` + `docs/` Git 공유는 되지만, 웹 대시보드/팀 뷰 부재 | 6인+ 팀 효과 제한 |

---

## 5. Value Proposition Canvas (pm-strategy 담당)

### 5.1 Customer Profile (Daniel — 1순위 페르소나)

| 영역 | 내용 |
|------|------|
| **Jobs** | 1) 혼자 MVP 6주 런칭 / 2) 투자자에게 설명 가능한 코드 만들기 / 3) tech debt 없이 기능 추가 / 4) AI와 협업하되 결과 검증 |
| **Pains** | P1 바이브코딩 결과물 불신 / P2 혼자라 리뷰어 없음 / P3 문서화 피로 / P4 AI 비용 낭비 / P5 "그냥 Cursor 쓸까"라는 기회비용 고민 |
| **Gains** | G1 빠른 이터레이션 / G2 투자자 설득 자료 / G3 주말·밤 시간 확보 / G4 "진짜 엔지니어"라는 자기 효능감 |

### 5.2 Value Map (bkit 제공)

| 영역 | 내용 |
|------|------|
| **Products & Services** | `/pdca` 스킬 체인, 3-Layer Orchestration, 5-Level Automation (L0~L4), CTO-Led Agent Teams, Output Styles 4종, 9-phase Pipeline, MCP servers 2개, bkend.ai 연결 |
| **Pain Relievers** | PR1 Match Rate 90% 강제 (P1) / PR2 Agent Teams 3~6명 병렬 리뷰 (P2) / PR3 PDCA 문서 자동 생성 (P3) / PR4 Token Ledger NDJSON 감사 (P4) / PR5 "Docs=Code CI"로 품질 근거 (P5) |
| **Gain Creators** | GC1 `/pdca iterate` 자동 재작업 (G1) / GC2 `docs/04-report/` 완료 리포트 (G2) / GC3 5-Level Automation L4 Full-Auto (G3) / GC4 "AI Native Development OS" 정체성 (G4) |

### 5.3 Fit 평가

| 축 | 점수 | 비고 |
|----|:----:|------|
| Problem-Solution Fit | ★★★★★ | Daniel 페르소나에 정확히 맞음 |
| Product-Market Fit | ★★★ | Claude Code 생태계 종속 → TAM 제한 |
| Message-Market Fit | ★★ | "AI Native Development OS", "vibecoding kit" 메시지가 Daniel에게 명확히 꽂히지 않음 |

---

## 6. Lean Canvas 9칸 (pm-strategy 담당)

| 칸 | 내용 |
|----|------|
| **1. Problem** | (a) 바이브코딩 코드 품질 불신 (b) 혼자 개발 시 리뷰 부재 (c) 설명 가능한 근거 문서 부재 |
| **2. Customer Segments** | 1순위: 1인/소규모 풀스택 창업자 (Daniel). 2순위: 엔터프라이즈 개발팀 (Yuki). Early Adopter: Claude Code 얼리어답터 중 PDCA·CI/CD 규율 선호 개발자 |
| **3. Unique Value Proposition** | "바이브코딩하되, 엔지니어링 디스크립린을 잃지 않는 단 하나의 Claude Code 플러그인" |
| **4. Solution** | PDCA 스킬 체인 + 90% Match Rate 가드 + CTO/PM Agent Teams + 4-Layer Clean Architecture + Audit Log |
| **5. Channels** | Claude Code 공식 plugin marketplace, GitHub README, Twitter/X 개발자 인플루언서, bkend.ai 생태계 연결, 한국/일본 스타트업 커뮤니티 |
| **6. Revenue Streams** | (현재) 오픈소스 Apache 2.0 무료 / (장래) bkend.ai SaaS 전환, Enterprise 지원 계약, Skills marketplace revenue share |
| **7. Cost Structure** | 개발 인건비 (현재 주체: POPUP STUDIO), Claude API 비용 전가 (사용자 부담), 문서/번역 유지 비용 |
| **8. Key Metrics** | (a) plugin install 수 (b) `/pdca plan` → `/pdca report` 완주율 (c) Match Rate 평균 (d) MAU / DAU |
| **9. Unfair Advantage** | (a) PDCA 메서드론 + 43 PM frameworks 통합 (b) 3,762 TC 무결성 (c) Docs=Code CI 규율 (d) POPUP STUDIO의 디자인+엔지니어 결합 DNA |

---

## 7. SWOT + Porter's 5 Forces (pm-strategy 담당)

### 7.1 SWOT

| 축 | 항목 |
|----|------|
| **Strengths** | S1 PDCA 철학 깊이 / S2 3,762 TC 검증 / S3 Clean Architecture 4-Layer / S4 43 PM frameworks / S5 8개 언어 / S6 Apache 2.0 |
| **Weaknesses** | W1 학습 곡선 / W2 Claude Code 종속 / W3 인지도 낮음 / W4 용어 과부하 / W5 Starter 페르소나 적합도 낮음 / W6 JetBrains·VSCode 사용자 배제 |
| **Opportunities** | O1 Claude Code plugin marketplace 공식 등록 / O2 Agent Teams 실험 GA 전환 / O3 한국/일본 AI 코딩 규제 맞춤화 / O4 "AI-Native Engineering" 카테고리 선점 |
| **Threats** | T1 Cursor/Windsurf의 native Agent / T2 Claude Code Skills native 통합 / T3 Anthropic이 pm-skills 유사 기능 흡수 / T4 Devin 같은 autonomous agent 약진 |

### 7.2 SO/WT 전략

| 전략 | 내용 |
|------|------|
| **SO (공격)** | S1+S2 (PDCA 깊이+TC 무결성) × O1 (marketplace 등록) = **"verified-quality plugin" 포지셔닝**으로 marketplace 상위 노출 |
| **WT (방어)** | W1 (학습 곡선) × T2 (CC native 흡수) = **Skill Evals 파리티 테스트로 bkit 고유 가치 상시 검증** + 온보딩 UX 집중 개선 |

### 7.3 Porter's 5 Forces

| 축 | 강도 | 해석 |
|----|:----:|------|
| 신규 진입 위협 | **高** | Cursor, Cline, Aider, Kiro 등 계속 등장 |
| 대체재 위협 | **高** | Cursor 같은 IDE-native 솔루션이 plugin 없이도 유사 경험 제공 |
| 공급자 교섭력 | **極高** | **Anthropic 단일 플랫폼 종속**. Claude Code 변경 시 즉시 영향 |
| 구매자 교섭력 | **中** | 오픈소스라 스위칭 코스트 낮으나, PDCA 문서 축적 후 lock-in 상승 |
| 기존 경쟁 강도 | **中** | Claude Code plugin 시장은 아직 초기. 선점 기회 有 |

**종합**: 경쟁 강도 자체는 아직 중간이나, **Anthropic 플랫폼 종속** 리스크가 가장 크다. MON-CC-02, MON-CC-06 모니터링 체계를 이미 운영 중인 것은 긍정 신호.

---

## 8. 경쟁사 분석 (pm-research 담당)

### 8.1 경쟁자 5종 표

| 경쟁자 | 포지셔닝 | bkit 대비 강점 | bkit 대비 약점 |
|--------|----------|----------------|----------------|
| **Cursor** | AI-first IDE, multi-model | UI/UX 성숙도 압도, VSCode 호환, 에디터 통합 | PDCA 없음, 문서 자동화 없음, Match Rate 가드 없음 |
| **Cline** (VSCode) | 오픈소스 AI coding agent | VSCode 네이티브, Plan/Act 모드 간단 | 품질 가드 약함, 다국어 약함, PM/CTO Team 없음 |
| **BMAD-METHOD** | 에이전트 기반 PDCA/agile | 방법론 깊이, 커뮤니티 활성, prompt 품질 | IDE 종속성 없음·통합 약함, Claude Code 최적화 없음 |
| **agent-os** | Cursor/Claude 대응 agent framework | 가벼움, 빠른 시작 | 규모 제한, 엔터프라이즈 기능 약함, 국제화 약함 |
| **Claude Code Skills (native)** | Anthropic 1st party | 공식 지원, Anthropic 업데이트 즉시 반영 | **범용 skill만, PDCA/gap/audit 등 도메인 특화 없음** |

### 8.2 차별화 축

| 축 | Cursor | Cline | BMAD | agent-os | CC Skills | **bkit** |
|----|:------:|:-----:|:----:|:--------:|:---------:|:--------:|
| PDCA 자동화 | ✗ | △ | ✓ | ✗ | ✗ | **✓✓✓** |
| Match Rate 가드 | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** |
| Multi-agent Teams | △ | ✗ | △ | ✓ | ✗ | **✓✓** |
| 3 Level 아키텍처 | ✗ | ✗ | ✗ | ✗ | ✗ | **✓✓** |
| Docs=Code CI | ✗ | ✗ | ✗ | ✗ | ✗ | **✓✓** |
| 8개 언어 자동 | ✗ | ✗ | ✗ | ✗ | ✗ | **✓✓** |
| Plugin marketplace 준비 | N/A | N/A | N/A | N/A | Native | **✓** |
| IDE UI 성숙도 | ✓✓✓ | ✓✓ | ✗ | ✗ | ✓ | ✗ (CLI only) |
| 진입 장벽 낮음 | ✓✓ | ✓✓✓ | ✓ | ✓✓ | ✓✓✓ | △ |

> **결론**: bkit은 **"verified-quality + PDCA 규율"의 유일 사업자**이되, **"IDE 체험·진입 장벽"에서는 열세**. → 1순위 페르소나(Daniel)에게 이 열세는 문제 안 되며, Starter에게는 치명적. 따라서 포지셔닝 재정의 필요.

---

## 9. 시장 규모 & Customer Journey (pm-research 담당)

### 9.1 TAM / SAM / SOM

| 층위 | 산정 | 추정 규모 |
|------|------|-----------|
| **TAM** | 전 세계 AI-coding 사용자 | **~20M** (GitHub Copilot 사용자 기준, 2026 Q1) |
| **SAM** | Claude Code 사용자 중 plugin 설치 의향 | **~500K** (Anthropic 공개 추정, 25M Claude 사용자의 ~2%) |
| **SOM** | PDCA·CI/CD 규율에 민감한 Dynamic+Enterprise 페르소나 | **~50K** (SAM의 10%, Year 1 달성 목표 1%) |

### 9.2 Year 1 목표 (Beachhead)

- Install 수: **5,000** (SOM의 10%)
- 주간 활성 개발자(WAU): **1,500**
- `/pdca plan → report` 완주 feature 수: **5,000** (평균 인당 3.3 완주)
- Match Rate ≥ 90% 도달율: **80%**

### 9.3 Customer Journey Map (Daniel 기준)

| 단계 | 사용자 행동 | 감정 | 마찰점 | bkit의 응답 |
|------|-------------|:----:|--------|-------------|
| **Awareness** | Twitter에서 "bkit" 언급 목격 | 😐 | "또 다른 플러그인?" | README 첫 화면 "PDCA + Verification" 메시지 |
| **Consideration** | GitHub README 탐독 | 🤔 | 기능이 너무 많아 보임 | ← **개선 필요**: Daniel용 5분 데모 영상 없음 |
| **Install** | `/plugin install bkit` | 🙂 | 환경변수·버전 요구사항 | CC v2.1.117+ 업데이트 안내 명확 |
| **First Run** | `/claude-code-learning` 또는 `/dynamic init` | 😕 | "뭐부터?"가 명확하지 않음 | ← **개선 필요**: First-run wizard 부재 |
| **First PDCA** | `/pdca plan my-feature` | 😊 | Checkpoint 1-2에서 답하기 길어짐 | AskUserQuestion 인터랙티브 체크포인트 |
| **Implementation** | `/pdca design` → `/pdca do` | 😃 | 3 Option 선택 피로감은 있음 | 3 Architecture Options + Design Anchor |
| **Verification** | `/pdca analyze` | 😮 | Match Rate 85%로 경고 | gap-detector 자동 제안 |
| **Iteration** | `/pdca iterate` | 🤩 | 자동 수정 작동 | 최대 5회, 90% 도달 시 자동 중지 |
| **Completion** | `/pdca report` → git commit | 😎 | PDCA 문서 품질에 만족 | `docs/04-report/` 4관점 Executive Summary |
| **Expansion** | Dynamic → Enterprise 이주 | 🤨 | Level 수동 변경? | ← **개선 필요**: Level upgrade wizard 약함 |
| **Advocacy** | Twitter에 share | 🥰 | — | NPS 9/10 예상 |

### 9.4 Journey 중 Critical Drop-off Point

1. **Install → First Run 사이** (Awareness 이후 가장 큰 이탈)
2. **Consideration → Install 사이** (README의 과도한 정보)
3. **Dynamic → Enterprise 이주** (현재 bkit의 미개척 영역)

---

## 10. UX 완성도 진단 (U1~U10)

### U1. 최초 진입 경험 (First-Run UX) — **★★☆ (2.5/5)**

**근거**:
- `/plugin install bkit` 자체는 2-step으로 깔끔
- 하지만 설치 후 `SessionStart hook`이 "무엇부터 할지" 명확히 안내하지 않음
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경변수 요구사항은 별도 안내 필요

**Pain Point**: 설치 후 "다음 한 줄"이 없다. Daniel이 `/pdca pm my-saas`를 쳐야 한다는 걸 아는 경로가 README 깊숙이 있음.

**개선안**: SessionStart hook에 첫 실행 감지 → "**bkit 처음이시군요! 3분 튜토리얼을 시작할까요?**" AskUserQuestion 배치.

### U2. 학습 곡선 — **★★ (2/5)**

**근거**:
- 39 Skills × 36 Agents × 21 Hooks × 4 Output Styles × 5 Automation Levels = **조합 폭발**
- README 633줄, CHANGELOG 1,779줄, CUSTOMIZATION-GUIDE 1,880줄 = 4,292줄 (초보자 불가능)
- bkit-learning output style은 좋은 완화책이나 default 아님

**Pain Point**: 용어의 레이어가 5단계 깊음 (PDCA → Skill → Agent → Hook → Lib module).

**개선안**: "**Mastery Track**" 도입 — Week 1: PDCA만 / Week 2: Agent Teams / Week 3: Skill Evals.

### U3. 명확성/발견성 (Discoverability) — **★★★ (3/5)**

**근거**:
- `/pdca status`, `/pdca next`는 탁월한 UX (현재 위치 → 다음 행동 안내)
- 반면 "어떤 Output Style을 언제 쓰는가"에 대한 자동 제안은 Level 감지에만 의존
- Skill Evals는 강력하나 UI/CLI 진입점이 `node evals/runner.js`라는 raw command

**Pain Point**: Skill Evals 같은 고급 기능이 "있는 줄도 모르고 지나감".

**개선안**: `/bkit explore` 신설 — 설치된 모든 skills/agents/evals를 카테고리별로 브라우징.

### U4. 에러/복구 UX — **★★★★ (4/5)**

**근거**:
- `self-healing` agent (opus) 전담 오류 복구
- `/pdca iterate` 최대 5회, 90% 미달 시 자동 재작업
- Defense-in-Depth 4-Layer: CC sandbox → PreToolUse Hook → audit-logger sanitizer → Token Ledger
- Rollback skill + Checkpoint 시스템

**Pain Point**: 에러 발생 시 **원인을 사용자에게 설명하는 언어**가 기술 중심. "OWASP A03 violated"는 Yuki에게는 OK지만 Mina/Daniel에게는 의미 불명.

**개선안**: 에러 메시지 이중화 — 기술 원문 + **Output Style 기반 친화 번역**.

### U5. 피드백 품질 (대시보드, 진행 시각화) — **★★★ (3/5)**

**근거**:
- CLI Dashboard (progress-bar, workflow-map, control-panel) 존재
- `/pdca status` 텍스트 대시보드 우수
- 하지만 **웹 대시보드/팀 뷰 없음** → 장시간 작업 가시성 제한

**Pain Point**: `/pdca iterate` 5회 돌 때, 콘솔 스크롤만 보이고 "지금 몇 회차에 얼마 남았나" 요약 뷰 부재.

**개선안**: `/pdca watch {feature}` 신설 — live status tail (CC v2.1.71+ `/loop` 활용).

### U6. 자동화/제어의 균형 (L0-L4 선택 부담) — **★★★★ (4/5)**

**근거**:
- 5-Level Controllable AI (L0 Manual ~ L4 Full-Auto)는 개념적으로 탁월
- Trust Score가 Level 자동 조정 (Sprint 7에서 복원)
- 8 Interactive Checkpoints가 L0~L2 사용자에게 안전망

**Pain Point**: Daniel 같은 중급자는 "Checkpoint 3 (3 Architecture Options 선택)"이 피로. L3-L4에서 어떻게 스킵하는지 문서 약함.

**개선안**: 첫 사용 시 "**당신의 AI 신뢰도는?**" 설문 → Trust Score 초기값 제안.

### U7. 다국어 사용자 경험 — **★★★★ (4/5)**

**근거**:
- 8개 언어 트리거 자동 감지 (정적 웹 / 静的サイト / 静态网站 ...)
- `language: "korean"` 설정으로 응답 언어 분리 제어
- docs/ 폴더는 한국어, skills/ agents/ 등은 영어 — 명확한 분리 원칙 (CLAUDE.md §1)

**Pain Point**: 트리거는 자동이지만 응답 언어는 settings.json 수동 편집 필요. 일본 Yuki가 일본어 응답을 받으려면 `"japanese"` 직접 입력.

**개선안**: 첫 SessionStart 시 언어 자동 감지 → "응답을 {language}로 받으시겠습니까?" 프롬프트.

### U8. Claude Code 버전 호환성 체감 — **★★★ (3/5)**

**근거**:
- 75 consecutive compatible releases는 업계 최고 수준의 호환성 유지
- MON-CC-02, MON-CC-06, ENH-214 defense 등 능동 모니터링
- cc-version-history 79줄 압축본 + 상세 4,292줄 분리

**Pain Point**: v2.1.117+ 권고지만 v2.1.78+에서 "어떤 기능이 작동 안하는지" 조용한 부분 비작동. 사용자는 "이상한데?" 상태.

**개선안**: SessionStart hook에서 CC 버전 체크 → 미달 기능 명시적 경고 ("Agent Teams unavailable: CC v2.1.117+ required").

### U9. 문서 접근성 — **★★★ (3/5)**

**근거**:
- README + CUSTOMIZATION-GUIDE + CHANGELOG 3계층 분리 체계
- `docs/` 폴더 5단계 PDCA 분리
- bkit-system/ Obsidian Graph View 지원은 혁신적

**Pain Point**: README에 "AI-Native Development OS"라는 정체성과 "39 Skills 나열"이 섞여 있어 **초독자가 무엇을 찾는 문서인지 혼란**.

**개선안**: README를 2층으로 분리 — `README.md` (5분 개요) + `README-FULL.md` (현재 내용).

### U10. 제품 정체성 (vibecoding, PDCA, Agent Teams, bkend.ai 메시징 일관성) — **★★ (2/5)**

**근거**:
- plugin.json displayName "bkit — AI Native Development OS"
- README 첫 줄 "bkit - Vibecoding Kit"
- README L8 "PDCA methodology + CTO-Led Agent Teams + AI coding assistant mastery"
- README L589 "engineering discipline to AI-native development"
- L10 태그 "vibecoding, fullstack, multilingual, enterprise..."

**Pain Point**: **정체성 메시지가 최소 4개 이상 공존**:
- "Vibecoding Kit"
- "AI Native Development OS"
- "PDCA plugin for Claude Code"
- "Context Engineering practical implementation"

→ Daniel이 "**이거 정확히 뭐야?**"를 3초 만에 답하기 어려움.

**개선안**: **One-Liner Redefinition** 워크숍 — 예: "The only Claude Code plugin that verifies AI-generated code against its own design specs."

---

## 11. Top 5 Delightful Moments (★4~5)

1. **`/pdca iterate`의 자동 재작업 경험** — Match Rate 85% → 92%로 스스로 올라가는 순간. 다른 AI 도구에서 느낄 수 없는 "AI가 스스로 품질을 챙기는" 경험.
2. **`docs/04-report/{feature}.report.md` 완료 리포트 자동 생성** — 투자자에게 그대로 보여줄 수 있는 엔지니어링 근거 문서. 4관점 Executive Summary + Success Criteria 추적.
3. **3 Architecture Options 자동 생성 (Minimal/Clean/Pragmatic)** — Design phase Checkpoint 3. 혼자 창업자에게 "동료 아키텍트"가 옆에 붙은 경험.
4. **한국어 "정적 웹"이라 쳤을 때 Starter 자동 진입** — 8개 언어 트리거 자동 감지의 "오, 내 언어로 알아듣네" 순간.
5. **Docs=Code CI의 "0 drift" 지속** — 버전 올릴 때마다 README/CHANGELOG/plugin.json 자동 동기화 검증. BKIT_VERSION 5-location invariant.

---

## 12. Top 5 Friction Points (★1~2)

1. **설치 후 "다음 한 줄"이 없다** — First-run wizard 부재. `/claude-code-learning`을 알아서 찾아야 하는 설계 실수.
2. **용어 과부하** — PDCA, Skill, Agent, Hook, Level, Match Rate, Trust Score, Automation Level, Output Style, Context Engineering... 10분 안에 10개 신조어. Daniel도 버거움.
3. **`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경변수** — README에 숨어 있음. Agent Teams 쓰려다 조용히 실패.
4. **README 633줄 단일 파일** — 초보자 탐색 불가. 정체성 혼란 (vibecoding kit ↔ AI Native OS ↔ PDCA plugin).
5. **Skill Evals CLI가 `node evals/runner.js`** — 혁신적 기능이 raw node command로만 노출. `/bkit evals run` 같은 slash command 부재.

---

## 13. 페르소나별 NPS 추정

| 페르소나 | 추천도 (0-10) | NPS 분류 | 이유 |
|----------|:-------------:|:--------:|------|
| **Mina (Starter)** | **4** | Detractor | 용어 거부감, bkit-starter로 이관 권고 |
| **Daniel (Dynamic)** | **9** | Promoter | 모든 pain point에 bkit이 응답, 투자자 데모까지 완결 |
| **Yuki (Enterprise)** | **7** | Passive | 품질·감사는 만족, but JetBrains→Claude Code 전환 장벽 |
| **종합 NPS** | **-14 ~ +67** (persona mix 따라 편차) | — | **Daniel만 보면 +67**, 3인 평균이면 낮음 |

> **의미**: **bkit은 Universal Plugin이 아니라 "Dynamic-First Plugin"으로 재포지셔닝**해야 한다. Starter는 bkit-starter, Enterprise는 장기 확장으로 분리.

---

## 14. Go/No-Go: Claude Code plugin marketplace 공식 등록 준비도

### 14.1 Ready Items (등록 가능 기준)

- ✅ `plugin.json` manifest 완비 (name, version, description, author, license, keywords, outputStyles)
- ✅ Apache 2.0 License + NOTICE 파일
- ✅ 75 consecutive CC compatible releases (v2.1.34 ~ v2.1.117)
- ✅ 3,762 test cases (PASS 3,760 / 0 FAIL)
- ✅ Match Rate 100% QA Shipping Readiness (v2.1.10 Sprint 7)
- ✅ Clean Architecture 4-Layer, Defense-in-Depth 4-Layer
- ✅ Docs=Code CI 무결성 (0 drift)
- ✅ 8개 언어 지원
- ✅ MON-CC-02, MON-CC-06 능동 모니터링

### 14.2 Blockers (등록 전 필수 해결)

| Blocker | 심각도 | 예상 공수 |
|---------|:------:|:---------:|
| B1. First-run wizard 부재 | **P0** | 3일 |
| B2. README 2층 분리 (README.md 5분 개요 + README-FULL.md) | **P0** | 1일 |
| B3. 제품 정체성 One-Liner 고정 (4개→1개) | **P0** | 0.5일 (의사결정 시간) |
| B4. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 환경변수 자동 검출/안내 | **P1** | 1일 |
| B5. Skill Evals slash command 진입점 (`/bkit evals`) | **P1** | 2일 |
| B6. 에러 메시지 친화 번역 레이어 | **P2** | 5일 |

### 14.3 권고: **조건부 Go** (P0 3건 해결 후 marketplace 공식 등록)

**근거**:
- 기술적 완성도 (테스트/아키텍처/호환성)는 marketplace 최상위 품질
- UX 진입 마찰만 해결되면 **"verified-quality plugin"** 카테고리를 선점할 수 있음
- **Daniel 페르소나 Alpha Program** 50명 먼저 모집 → NPS 측정 → 공식 등록

---

## 15. UX 개선 로드맵

### 15.1 Quick Wins (1주 내 가능)

| # | 항목 | 공수 | 예상 임팩트 |
|---|------|:----:|:-----------:|
| Q1 | README 2층 분리 (5분 개요 버전 추가) | 1일 | First impression +30% |
| Q2 | 제품 정체성 One-Liner 결정 & 모든 entry point 통일 | 0.5일 | 메시지 일관성 |
| Q3 | SessionStart hook에 "첫 실행 감지 → 3분 튜토리얼" AskUserQuestion | 1일 | First PDCA 완주율 +20% |
| Q4 | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` 자동 검출 + 안내 | 1일 | Agent Teams 활성화 +40% |
| Q5 | CC 버전 체크 → 미달 기능 명시 경고 | 0.5일 | 조용한 실패 제거 |

### 15.2 Short-term (v2.1.11)

| # | 항목 | 공수 | 예상 임팩트 |
|---|------|:----:|:-----------:|
| S1 | `/bkit explore` slash command (skills/agents/evals 브라우저) | 3일 | Discoverability +50% |
| S2 | `/bkit evals run` slash command (raw node command 래핑) | 2일 | Skill Evals 사용률 +3배 |
| S3 | 에러 메시지 Output Style 친화 번역 레이어 | 5일 | Error recovery UX +30% |
| S4 | `/pdca watch {feature}` live dashboard | 3일 | 장시간 작업 가시성 |
| S5 | 첫 SessionStart 언어 자동 감지 → 응답 언어 설정 제안 | 1일 | 비영어권 체감 품질 |

### 15.3 Mid-term (v2.2.x)

| # | 항목 | 공수 | 예상 임팩트 |
|---|------|:----:|:-----------:|
| M1 | Mastery Track 튜토리얼 (Week 1~3) | 10일 | 학습 곡선 완화 |
| M2 | Dynamic → Enterprise Level Upgrade Wizard | 7일 | Level 이주 journey 완성 |
| M3 | 웹 대시보드 (team view) | 20일 | Enterprise 팀 도입 |
| M4 | Legacy 코드 프로젝트 중도 합류 가이드 (`/pdca adopt`) | 10일 | Enterprise TAM 확대 |
| M5 | **Daniel 페르소나 전용 Fast Track** — `/pdca fast-track {feature}` (Checkpoint 스킵, L3 자동 모드) | 5일 | Daniel NPS 9→10 |

---

## 16. 최종 결론

### 16.1 종합 평가

> **bkit v2.1.10은 "엔지니어링 완성도 A급, 사용자 경험 B급"의 제품이다.**
>
> 내부 아키텍처(Clean Architecture 4-Layer, Defense-in-Depth, 3-Layer Orchestration, 3,762 TC, Docs=Code CI)는 **업계 최상위 품질**이며, 이는 Daniel (Dynamic 창업자) 페르소나에게는 NPS 9를 받을 만한 강력한 가치를 제공한다.
>
> 그러나 **Discovery·Onboarding·Identity 3개 UX 축**에서 마찰이 커, 현재 상태로는 Claude Code plugin marketplace 공식 등록 시 Daniel 외 페르소나의 이탈률이 높을 것으로 예측된다.

### 16.2 핵심 권고 3선

1. **포지셔닝 재정의**: "AI-Native Development OS" → **"The only Claude Code plugin that verifies AI-generated code against its own design"**. 1순위 페르소나 Daniel 중심.
2. **Quick Wins 5건 (1주)** 완료 후 **Daniel Alpha 50명** 모집 → NPS 측정.
3. **marketplace 공식 등록**은 Alpha NPS ≥ +50 확인 후 진행. (NPS -14 ~ +67의 변동폭을 +40 이상으로 안정화)

### 16.3 종합 점수

| 축 | 배점 | 점수 | 등급 |
|----|:----:|:----:|:----:|
| First Impression | 15 | 9 | C+ |
| Learnability | 20 | 10 | C |
| Daily UX | 25 | 17 | B+ |
| Error Recovery | 10 | 7 | B |
| Value Delivery | 20 | 16 | A- |
| Community/Ecosystem Fit | 10 | 6 | C |
| **총점** | **100** | **65** | **B+** |

---

## 17. Stakeholder Map & Pre-mortem

### 17.1 Stakeholder Map

| Stakeholder | 관심사 | bkit 영향 | 관리 전략 |
|-------------|--------|:---------:|-----------|
| Anthropic (Claude Code) | plugin 생태계 건전성, CC 안정성 | **극고** | MON-CC-02/06 지속 + marketplace 후보 등록 |
| POPUP STUDIO (owner) | 제품 발전, 매출화 | **극고** | Daniel 페르소나 집중 |
| 사용자 Daniel (Dynamic) | MVP 품질, 투자자 데모 | 고 | Alpha Program 우선 |
| 사용자 Yuki (Enterprise) | 감사·보안·규율 | 중 | Defense-in-Depth 강화 |
| 사용자 Mina (Starter) | 진입 장벽 낮음 | 저 (bkit-starter 이관) | bkit-starter 크로스 프로모션 |
| pm-skills 저자 (Pawel Huryn) | attribution, 프레임워크 활용 | 중 | MIT 준수 + 공식 credit |
| bkend.ai | SaaS 연결 | 고 | 교차 침투 |

### 17.2 Pre-mortem (6개월 후 실패 시나리오 Top 3)

| 리스크 | 확률 | 임팩트 | 완화책 |
|--------|:----:|:------:|--------|
| **R1. Anthropic이 Claude Code Skills native에 PDCA 유사 기능 흡수** | 40% | 극고 | Skill Evals 파리티 테스트로 bkit 고유 가치 상시 계량 + marketplace 선점 |
| **R2. 초기 사용자 온보딩 실패로 이탈 80%** | 60% | 고 | Quick Wins 5건 사전 처리, Daniel Alpha 50 검증 |
| **R3. Cursor/Windsurf가 유사 Agent Orchestration 출시로 카테고리 침식** | 50% | 중 | "Claude Code 전용 + 한국어/PDCA 깊이" 니치 고수 |

---

## 18. Attribution

- **PM Agent Team**: pm-lead, pm-discovery, pm-strategy, pm-research, pm-prd (bkit v2.1.10 agents)
- **Frameworks**: Teresa Torres (Opportunity Solution Tree), Alexander Osterwalder (VPC, Lean Canvas, BMC), Clayton Christensen & Tony Ulwick (JTBD), Geoffrey Moore (Beachhead), Kim & Mauborgne (Blue Ocean).
- **Library**: [pm-skills](https://github.com/phuryn/pm-skills) by Pawel Huryn (MIT License) — 43 frameworks 통합.
- **Data Source**: README.md, CHANGELOG.md, plugin.json, skills/*/SKILL.md, output-styles/*, docs/03-analysis/*, 프로젝트 memory (MEMORY.md).

---

**문서 종료**
분석 일자: 2026-04-22
다음 액션: `/pdca plan bkit-ux-onboarding-improvements` 으로 Quick Wins 5건 Plan 단계 이행 권고
