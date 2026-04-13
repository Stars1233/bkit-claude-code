# bkit v2.1.5 종합 개선 설계서

## 개요

| 항목 | 내용 |
|------|------|
| Feature | bkit-v215-comprehensive-improvement |
| 버전 | 2.1.5 |
| 작성일 | 2026-04-13 |

## 상세 설계

### 1. lib/audit/index.js

3개 모듈 re-export. `generateUUID` 충돌 존재하나 동일 참조이므로 spread 허용.

```javascript
// lib/audit/index.js — Module entry point (v2.1.5)
const auditLogger = require('./audit-logger');
const decisionTracer = require('./decision-tracer');
const explanationGenerator = require('./explanation-generator');

module.exports = {
  ...auditLogger,
  ...decisionTracer,
  ...explanationGenerator,
};
```

**Export 목록 (21개)**:
- audit-logger (19): writeAuditLog, readAuditLogs, generateDailySummary, generateWeeklySummary, cleanupOldLogs, getSessionStats, logControl, logPermission, logCheckpoint, logPdca, logTrust, logSystem, ACTION_TYPES, CATEGORIES, RESULTS, ACTORS, TARGET_TYPES, BLAST_RADII, BKIT_VERSION, generateUUID, getAuditDir, getAuditFilePath
- decision-tracer (13): recordDecision, readDecisions, getDecisionSummary, getDecisionChain, generateDailyDecisionSummary, shouldTraceDecision, DECISION_TYPES, PDCA_PHASES, IMPACT_LEVELS, OUTCOMES, generateUUID(중복), getDecisionsDir, getDecisionsFilePath
- explanation-generator (4): generateExplanation, formatDecisionForDisplay, summarizeDecisionHistory, DETAIL_LEVELS

총 고유 export: ~34개 (generateUUID 중복 1건 제외)

### 2. lib/control/index.js

7개 모듈 re-export. 충돌 없음.

```javascript
// lib/control/index.js — Module entry point (v2.1.5)
const automationController = require('./automation-controller');
const blastRadius = require('./blast-radius');
const checkpointManager = require('./checkpoint-manager');
const destructiveDetector = require('./destructive-detector');
const loopBreaker = require('./loop-breaker');
const scopeLimiter = require('./scope-limiter');
const trustEngine = require('./trust-engine');

module.exports = {
  ...automationController,
  ...blastRadius,
  ...checkpointManager,
  ...destructiveDetector,
  ...loopBreaker,
  ...scopeLimiter,
  ...trustEngine,
};
```

**Export 수**: 총 ~55개 (충돌 0건)

### 3. lib/quality/index.js

3개 모듈 re-export. 충돌 없음.

```javascript
// lib/quality/index.js — Module entry point (v2.1.5)
const gateManager = require('./gate-manager');
const metricsCollector = require('./metrics-collector');
const regressionGuard = require('./regression-guard');

module.exports = {
  ...gateManager,
  ...metricsCollector,
  ...regressionGuard,
};
```

**Export 수**: 총 ~23개 (충돌 0건)

### 4. PDCA 상태 정리

제거 대상 (테스트/디버그 아티팩트):

| Feature 이름 | 분류 |
|-------------|------|
| test-feature | 테스트 |
| test-feature-sync | 테스트 |
| test-module-chain | 테스트 |
| test-flow-3 | 테스트 |
| test-flow-1 | 테스트 |
| test-iter-1, test-iter-2 | 테스트 |
| test-complete-1 | 테스트 |
| test-abandon-1 | 테스트 |
| test-feature-lc09~lc13 | 테스트 |
| feat-persist-1~3 | 테스트 |
| feat-bo008 | 테스트 |
| regression | 디버그 |
| bkit-claude-code | 디버그(모듈명) |
| bkit-pdca-server | 디버그(서버명) |
| qa | 디버그(모듈명) |
| scanners | 디버그(모듈명) |
| scripts | 디버그(모듈명) |
| team | 디버그(모듈명) |
| pdca | 디버그(모듈명) |
| bkit 전체 컴포넌트 포괄 QA | 디버그 |

**유지 대상:**
- bkit-v209-cc-v2194-compatibility (실제 기능)
- cc-version-issue-response (실제 기능)

### 5. lib/adapters/ 제거

```
lib/adapters/
├── claude/   (빈 디렉토리)
└── local/    (빈 디렉토리)
```

`rm -rf lib/adapters/` — 파일 0개이므로 안전.

### 6. CHANGELOG.md v2.1.5 항목

v2.1.5의 모든 하위 기능을 통합한 포괄적 항목:
- Issue #73/#74/#75 수정
- Quality hardening P2 (wiring scanner, bkit help, skill bypass guard)
- Comprehensive improvement (index.js, status cleanup, CHANGELOG)
