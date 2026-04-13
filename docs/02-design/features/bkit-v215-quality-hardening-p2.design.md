# bkit v2.1.5 Quality Hardening Phase 2 — Design

**Feature**: `bkit-v215-quality-hardening-p2`
**버전**: 2.1.5
**작성일**: 2026-04-13
**아키텍처 방향**: Option A — Minimal Changes (기존 인프라 활용)

---

## 1. 설계 개요

Phase 1에서 구축한 4개 스캐너 인프라(ScannerBase, reporter, pre-release-check.sh) 위에:
1. 5번째 스캐너(wiring) 추가
2. pre-write.js에 PDCA 우회 감지 가드 삽입
3. /bkit 도움말 스킬 신규 생성
4. pre-release-check.sh에 wiring 스캐너 등록

---

## 2. 상세 설계

### 2.1 Item 1: #75 Skill 우회 가드

**파일**: `scripts/pre-write.js`
**위치**: Section 2 (PDCA Document Check) 다음, Section 3 (PDCA Guidance) 이전 (line 118~119 사이)

**설계 결정**:
- `outputBlock`이 아닌 `contextParts.push`로 **경고만** 발생 (Automation First — 차단하지 않음)
- `CLAUDE_SKILL_NAME` 환경변수로 Skill 컨텍스트 판별
- PDCA 문서 경로 6개 패턴 매칭 (plan, design, analysis, report, qa-report, prd)

**코드 변경**:
```javascript
// Section 2 다음에 삽입
// ============================================================
// 2.5 PDCA Skill Bypass Detection (v2.1.5 - #75)
// ============================================================
const PDCA_DOC_PATTERNS = [
  /docs\/01-plan\/.*\.plan\.md$/,
  /docs\/02-design\/.*\.design\.md$/,
  /docs\/03-analysis\/.*\.analysis\.md$/,
  /docs\/04-report\/.*\.report\.md$/,
  /docs\/05-qa\/.*\.qa-report\.md$/,
  /docs\/00-pm\/.*\.prd\.md$/,
];

const isPdcaDoc = PDCA_DOC_PATTERNS.some(pattern => pattern.test(filePath));
if (isPdcaDoc) {
  const isSkillContext = !!process.env.CLAUDE_SKILL_NAME;
  if (!isSkillContext) {
    contextParts.push(
      `[PDCA COMPLIANCE] This file is a PDCA document. ` +
      `Use /pdca command instead of direct Write/Edit. ` +
      `Direct writes bypass template injection, state tracking, and quality gates.`
    );
    debugLog('PreToolUse', 'PDCA skill bypass detected', { filePath });
  }
}
```

### 2.2 Item 2: Wiring 스캐너

**파일**: `lib/qa/scanners/wiring.js` (신규)
**베이스 클래스**: `ScannerBase` (lib/qa/scanner-base.js)
**유틸리티 재사용**: `extractExports` (lib/qa/utils/pattern-matcher.js), `getJsFiles` (lib/qa/utils/file-resolver.js)

**알고리즘**:
1. `lib/**/*.js`에서 모든 export 수집 (`extractExports` 재사용)
2. `lib/`, `scripts/`, `servers/`, `hooks/` 전체에서 각 export명 참조 검색
3. 참조 없으면 → 이슈 등록
4. Critical module (automation, gate-manager, state-machine, skill-orchestrator)이면 WARNING, 그 외 INFO

**설계 결정**:
- Dead Code Scanner의 `scanUnusedExports`와 유사하지만, 목적이 다름: Dead Code는 "import되지 않은 모듈", Wiring은 "export됐지만 호출되지 않는 함수"
- 실제로는 Dead Code Scanner Phase 2가 이미 비슷한 로직을 가지고 있으므로, Wiring Scanner는 **skills/agents SKILL.md 내 `lib/` 참조 문자열도 검색 대상에 포함**하여 차별화
- severity를 CRITICAL이 아닌 WARNING/INFO로 하여 pre-release를 차단하지 않음 (46개 기존 이슈가 즉시 차단하면 릴리스 불가)

### 2.3 Item 3: /bkit 도움말 스킬

**파일**: `skills/bkit/SKILL.md` (신규)
**분류**: workflow (bkit 자체 기능 안내)
**effort**: low

**Frontmatter 설계**:
```yaml
name: bkit
classification: workflow
effort: low
description: |
  bkit plugin help - Show all available bkit functions.
  Workaround for skills autocomplete issue.
  Triggers: bkit, bkit help, bkit functions, show bkit commands,
  도움말, 기능 목록, ヘルプ, 機能一覧, 帮助, ayuda, aide, Hilfe, aiuto.
user-invocable: true
```

**본문**: 38 Skills, 36 Agents, 2 MCP Servers, 4 Output Styles를 카테고리별로 나열

### 2.4 Item 4: Pre-release 통합

**파일 1**: `lib/qa/index.js`
- `WiringScanner` require 추가
- `SCANNERS` 객체에 `'wiring'` 항목 추가

**파일 2**: `scripts/qa/pre-release-check.sh`
- `--help` 출력에 wiring 스캐너 추가
- scanner 목록에 wiring 추가

---

## 3. 의존성 관계

```
pre-release-check.sh
  └─ lib/qa/index.js
       └─ lib/qa/scanners/wiring.js (신규)
            ├─ lib/qa/scanner-base.js (기존)
            ├─ lib/qa/utils/pattern-matcher.js (기존, extractExports 재사용)
            └─ lib/qa/utils/file-resolver.js (기존, getJsFiles 재사용)

scripts/pre-write.js (독립 수정, #75)
skills/bkit/SKILL.md (독립 신규)
```

---

## 4. 테스트 계획

| 테스트 | 방법 | 기대 결과 |
|--------|------|-----------|
| Wiring Scanner 문법 | `node -e "require('./lib/qa/scanners/wiring')"` | 에러 없음 |
| Wiring Scanner 인스턴스화 | `node -e "new (require('./lib/qa/scanners/wiring'))()"` | name='wiring' |
| Pre-release 5개 스캐너 | `bash scripts/qa/pre-release-check.sh` | 5 scanners 실행 |
| pre-write.js 로드 | `node -e "require('./scripts/pre-write')"` | 에러 없음 (stdin 대기) |
| /bkit SKILL.md frontmatter | YAML 파싱 검증 | name=bkit, description < 250자 |
