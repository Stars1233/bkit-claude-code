# bkit v2.0.0 영역 4: 아키텍처 리팩토링 상세 설계

> **영역**: 4 — Architecture Refactoring
> **Plan 참조**: `docs/01-plan/features/bkit-v200-enhancement.plan.md` Section 4.1
> **설계 기준일**: 2026-03-19
> **요구사항**: FR-05, FR-06, FR-07, FR-21, FR-22

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **영역** | 아키텍처 리팩토링 (6개 항목) |
| **현재 문제** | common.js God Module (210 exports), session-start.js 비대 (787 LOC/15+ 책임), 파일 I/O 비원자적 쓰기, 매직 넘버 산재, 에러 처리 비표준화, pdca-status.json v2.0 제한 |
| **목표** | Quality Score 72→85+, Hook cold start 50% 감소, 동시성 안전 보장 |
| **예상 LOC** | ~1,150 LOC (신규 ~600, 리팩토링 ~550) |
| **의존 관계** | 영역 1,2,3,5 모두 영역 4 완료 후 진행 |

---

## 1. common.js 브릿지 제거 전략 (FR-05)

### 1.1 현재 상태 분석

`lib/common.js`는 5개 하위 모듈(`core`, `pdca`, `intent`, `task`, `team`)의 210개 함수를 re-export하는 순수 브릿지 레이어이다.

**현재 common.js 의존 파일 수**: 48개 (scripts: 42, hooks: 1, lib: 5)

#### 1.1.1 common.js를 import하는 전체 파일 목록 (48개)

**scripts/ (42개)**:

| # | 파일 | 사용 함수 | 원본 모듈 |
|---|------|----------|----------|
| 1 | `analysis-stop.js` | outputAllow | core/io |
| 2 | `archive-feature.js` | PROJECT_DIR | core/platform |
| 3 | `code-analyzer-pre.js` | outputBlock | core/io |
| 4 | `code-review-stop.js` | (lazy getCommon) | mixed |
| 5 | `context-compaction.js` | readStdinSync, debugLog, getPdcaStatusFull, outputEmpty, STATE_PATHS | core/io, core/debug, pdca/status, core/paths |
| 6 | `cto-stop.js` | readStdinSync, debugLog, outputAllow, getPdcaStatusFull, addPdcaHistory | core, pdca/status |
| 7 | `design-validator-pre.js` | readStdinSync, parseHookInput, outputAllow, outputEmpty | core/io |
| 8 | `gap-detector-post.js` | readStdinSync, parseHookInput, outputAllow, outputEmpty | core/io |
| 9 | `gap-detector-stop.js` | (12+ 함수) readStdinSync, debugLog, outputAllow, getPdcaStatusFull, updatePdcaStatus, addPdcaHistory, autoAdvancePdcaPhase, shouldAutoAdvance, getAutomationLevel, formatAskUserQuestion, buildNextActionQuestion, autoCreatePdcaTask | core, pdca/status, pdca/automation, task/creator |
| 10 | `iterator-stop.js` | (12+ 함수) 유사 gap-detector-stop | core, pdca, task |
| 11 | `learning-stop.js` | (lazy getCommon) | mixed |
| 12 | `pdca-post-write.js` | readStdinSync, parseHookInput, debugLog, isSourceFile, getPdcaStatusFull, updatePdcaStatus, extractFeature | core, pdca/status, core/file |
| 13 | `pdca-skill-stop.js` | (10+ 함수) readStdinSync, debugLog, outputAllow, getPdcaStatusFull, updatePdcaStatus, addPdcaHistory, shouldAutoAdvance, autoAdvancePdcaPhase, getAutomationLevel, formatAskUserQuestion | core, pdca |
| 14 | `pdca-task-completed.js` | (9+ 함수) readStdinSync, debugLog, outputAllow, getPdcaStatusFull, autoAdvancePdcaPhase, shouldAutoAdvance, getAutomationLevel, formatAskUserQuestion, buildNextActionQuestion, detectPdcaFromTaskSubject + generateExecutiveSummary, formatExecutiveSummary | core, pdca |
| 15 | `phase-transition.js` | readStdinSync, debugLog, outputAllow, getPdcaStatusFull, updatePdcaStatus, validatePdcaTransition | core, pdca |
| 16 | `phase1-schema-stop.js` | outputAllow, checkPhaseDeliverables | core/io, pdca/phase |
| 17 | `phase2-convention-pre.js` | readStdinSync, parseHookInput, outputAllow, outputEmpty | core/io |
| 18 | `phase2-convention-stop.js` | outputAllow, checkPhaseDeliverables | core/io, pdca/phase |
| 19 | `phase3-mockup-stop.js` | outputAllow, checkPhaseDeliverables, loadPdcaStatus | core/io, pdca |
| 20 | `phase4-api-stop.js` | outputAllow | core/io |
| 21 | `phase5-design-post.js` | readStdinSync, parseHookInput, debugLog, outputAllow, outputEmpty | core |
| 22 | `phase5-design-stop.js` | (lazy getCommon) | mixed |
| 23 | `phase6-ui-post.js` | readStdinSync, parseHookInput, isUiFile, outputAllow, outputEmpty | core |
| 24 | `phase6-ui-stop.js` | (lazy getCommon) | mixed |
| 25 | `phase7-seo-stop.js` | outputAllow, checkPhaseDeliverables | core/io, pdca/phase |
| 26 | `phase8-review-stop.js` | outputAllow | core/io |
| 27 | `phase9-deploy-pre.js` | readStdinSync, parseHookInput, outputAllow, outputEmpty, PROJECT_DIR | core |
| 28 | `phase9-deploy-stop.js` | (lazy getCommon) | mixed |
| 29 | `plan-plus-stop.js` | readStdinSync, debugLog, outputAllow, getPdcaStatusFull, updatePdcaStatus, addPdcaHistory, formatAskUserQuestion | core, pdca |
| 30 | `post-compaction.js` | readStdinSync, debugLog, getPdcaStatusFull, outputEmpty | core, pdca/status |
| 31 | `pre-write.js` | readStdinSync, parseHookInput, debugLog, isSourceFile, isCodeFile, isEnvFile, outputAllow, outputBlock, outputEmpty, detectLevel, PLUGIN_ROOT, extractFeature, getPdcaStatusFull | core, pdca |
| 32 | `qa-monitor-post.js` | readStdinSync, parseHookInput, outputAllow, outputEmpty | core/io |
| 33 | `qa-pre-bash.js` | readStdinSync, parseHookInput, outputAllow, outputBlock | core/io |
| 34 | `qa-stop.js` | outputAllow | core/io |
| 35 | `select-template.js` | detectLevel, PROJECT_DIR, PLUGIN_ROOT | core/platform, pdca/level |
| 36 | `skill-post.js` | (lazy getCommon) | mixed |
| 37 | `stop-failure-handler.js` | readStdinSync, debugLog, outputEmpty, getPdcaStatusFull, addPdcaHistory | core, pdca/status |
| 38 | `subagent-start-handler.js` | readStdinSync, debugLog, outputAllow, getPdcaStatusFull | core, pdca/status |
| 39 | `subagent-stop-handler.js` | readStdinSync, debugLog, outputAllow, getPdcaStatusFull, addPdcaHistory | core, pdca/status |
| 40 | `team-idle-handler.js` | readStdinSync, debugLog, outputAllow, getPdcaStatusFull | core, pdca/status |
| 41 | `team-stop.js` | readStdinSync, debugLog, outputAllow, getPdcaStatusFull, addPdcaHistory | core, pdca/status |
| 42 | `unified-bash-post.js` | readStdinSync, parseHookInput, debugLog, outputAllow, outputEmpty | core |
| 43 | `unified-bash-pre.js` | readStdinSync, parseHookInput, debugLog, outputAllow, outputBlock, PROJECT_DIR | core |
| 44 | `unified-stop.js` | readStdinSync, debugLog, outputAllow, getPdcaStatusFull, updatePdcaStatus | core, pdca/status |
| 45 | `unified-write-post.js` | readStdinSync, parseHookInput, debugLog, getActiveSkill, getActiveAgent, outputAllow | core, task/context |
| 46 | `user-prompt-handler.js` | readStdinSync, debugLog, detectNewFeatureIntent, matchImplicitAgentTrigger, matchImplicitSkillTrigger, calculateAmbiguityScore, outputAllow, outputEmpty, truncateContext, PLUGIN_ROOT | core, intent |

**hooks/ (1개)**:

| # | 파일 | 사용 함수 | 원본 모듈 |
|---|------|----------|----------|
| 47 | `session-start.js` | BKIT_PLATFORM, detectLevel, debugLog, initPdcaStatusIfNotExists, getPdcaStatusFull, emitUserPrompt, detectNewFeatureIntent, matchImplicitAgentTrigger, matchImplicitSkillTrigger, getBkitConfig, calculateAmbiguityScore, generateClarifyingQuestions | core, pdca, intent |

**lib/ (5개)**:

| # | 파일 | 사용 함수 | 원본 모듈 |
|---|------|----------|----------|
| 48 | `permission-manager.js` | (lazy getCommon) debugLog, getConfig 등 | core |
| 49 | `context-hierarchy.js` | (lazy getCommon) debugLog, globalCache | core |
| 50 | `memory-store.js` | (lazy getCommon) debugLog | core |
| 51 | `context-fork.js` | (lazy getCommon) debugLog, globalCache | core |
| 52 | `import-resolver.js` | (lazy getCommon) debugLog, getConfig 등 | core |
| 53 | `skill-orchestrator.js` | (lazy getCommon) 다수 | core, pdca, task |

### 1.2 사용 빈도별 함수 분류

#### 가장 많이 사용되는 함수 Top 15

| 순위 | 함수 | 사용 횟수 | 원본 모듈 |
|:---:|------|:--------:|----------|
| 1 | `outputAllow` | 35 | `lib/core/io` |
| 2 | `debugLog` | 30 | `lib/core/debug` |
| 3 | `readStdinSync` | 28 | `lib/core/io` |
| 4 | `getPdcaStatusFull` | 22 | `lib/pdca/status` |
| 5 | `outputEmpty` | 15 | `lib/core/io` |
| 6 | `parseHookInput` | 14 | `lib/core/io` |
| 7 | `outputBlock` | 5 | `lib/core/io` |
| 8 | `addPdcaHistory` | 8 | `lib/pdca/status` |
| 9 | `updatePdcaStatus` | 7 | `lib/pdca/status` |
| 10 | `PROJECT_DIR` | 5 | `lib/core/platform` |
| 11 | `PLUGIN_ROOT` | 4 | `lib/core/platform` |
| 12 | `checkPhaseDeliverables` | 4 | `lib/pdca/phase` |
| 13 | `detectLevel` | 3 | `lib/pdca/level` |
| 14 | `formatAskUserQuestion` | 4 | `lib/pdca/automation` |
| 15 | `autoAdvancePdcaPhase` | 4 | `lib/pdca/automation` |

### 1.3 직접 import 전환 매핑 규칙

```
// 변환 전 (common.js 브릿지)
const { outputAllow, debugLog, readStdinSync } = require('../lib/common.js');

// 변환 후 (직접 import)
const { outputAllow, readStdinSync } = require('../lib/core/io');
const { debugLog } = require('../lib/core/debug');
```

**모듈별 import 경로 매핑**:

| 함수 카테고리 | common.js 경유 | 직접 import 경로 |
|-------------|---------------|-----------------|
| I/O (outputAllow, readStdinSync, parseHookInput, outputBlock, outputEmpty, truncateContext, MAX_CONTEXT_LENGTH, xmlSafeOutput) | `../lib/common.js` | `../lib/core/io` |
| Debug (debugLog, getDebugLogPath, DEBUG_LOG_PATHS) | `../lib/common.js` | `../lib/core/debug` |
| Platform (BKIT_PLATFORM, PROJECT_DIR, PLUGIN_ROOT, isClaudeCode, detectPlatform, getPluginPath, getProjectPath, getTemplatePath, BKIT_PROJECT_DIR) | `../lib/common.js` | `../lib/core/platform` |
| Cache (get, set, invalidate, clear, globalCache, _cache, DEFAULT_TTL, TOOLSEARCH_TTL, getToolSearchCache, setToolSearchCache) | `../lib/common.js` | `../lib/core/cache` |
| Config (loadConfig, getConfig, getConfigArray, getBkitConfig, safeJsonParse) | `../lib/common.js` | `../lib/core/config` |
| File (TIER_EXTENSIONS, isSourceFile, isCodeFile, isUiFile, isEnvFile, extractFeature, DEFAULT_EXCLUDE_PATTERNS, DEFAULT_FEATURE_PATTERNS) | `../lib/common.js` | `../lib/core/file` |
| Paths (STATE_PATHS, LEGACY_PATHS, CONFIG_PATHS, ensureBkitDirs, getDocPaths, resolveDocPaths, findDoc, getArchivePath, backupToPluginData, restoreFromPluginData) | `../lib/common.js` | `../lib/core/paths` |
| Status (getPdcaStatusFull, savePdcaStatus, updatePdcaStatus, addPdcaHistory, loadPdcaStatus, initPdcaStatusIfNotExists 등 24개) | `../lib/common.js` | `../lib/pdca/status` |
| Phase (PDCA_PHASES, getPhaseNumber, getPhaseName, checkPhaseDeliverables, validatePdcaTransition 등 9개) | `../lib/common.js` | `../lib/pdca/phase` |
| Level (detectLevel, LEVEL_PHASE_MAP, canSkipPhase 등 7개) | `../lib/common.js` | `../lib/pdca/level` |
| Automation (getAutomationLevel, shouldAutoAdvance, autoAdvancePdcaPhase, formatAskUserQuestion, buildNextActionQuestion 등 14개) | `../lib/common.js` | `../lib/pdca/automation` |
| Tier (getLanguageTier 등 8개) | `../lib/common.js` | `../lib/pdca/tier` |
| ExecutiveSummary (generateExecutiveSummary, formatExecutiveSummary, generateBatchSummary) | `../lib/common.js` | `../lib/pdca/executive-summary` |
| TemplateValidator (REQUIRED_SECTIONS 등 6개) | `../lib/common.js` | `../lib/pdca/template-validator` |
| Language (SUPPORTED_LANGUAGES 등 6개) | `../lib/common.js` | `../lib/intent/language` |
| Trigger (NEW_FEATURE_PATTERNS 등 5개) | `../lib/common.js` | `../lib/intent/trigger` |
| Ambiguity (calculateAmbiguityScore 등 8개) | `../lib/common.js` | `../lib/intent/ambiguity` |
| Classification (classifyTask 등 6개) | `../lib/common.js` | `../lib/task/classification` |
| Context (setActiveSkill 등 7개) | `../lib/common.js` | `../lib/task/context` |
| Creator (generatePdcaTaskSubject 등 6개) | `../lib/common.js` | `../lib/task/creator` |
| Tracker (savePdcaTaskId 등 7개) | `../lib/common.js` | `../lib/task/tracker` |
| Team 전체 (40개) | `../lib/common.js` | `../lib/team` (또는 하위 모듈) |

### 1.4 마이그레이션 순서 (4단계)

#### 단계 1: deprecation 경고 추가 (Day 1)

common.js 파일 상단에 런타임 경고를 추가한다:

```javascript
// lib/common.js — 1단계: deprecation warning
let _warned = false;
function warnDeprecation() {
  if (_warned) return;
  _warned = true;
  const { debugLog } = require('./core/debug');
  debugLog('DEPRECATED', 'common.js bridge is deprecated. Import from lib/core, lib/pdca, lib/intent, lib/task, lib/team directly.');
}

// 모든 함수 접근 시 경고
const handler = {
  get(target, prop) {
    warnDeprecation();
    return target[prop];
  }
};

module.exports = new Proxy({ /* 기존 exports */ }, handler);
```

#### 단계 2: I/O 전용 스크립트 전환 (Day 2-3, 18개 파일)

`outputAllow`만 사용하거나 I/O 함수만 사용하는 단순 스크립트부터 전환한다:

**대상 (영향도 최저)**:
1. `analysis-stop.js` — `outputAllow` → `core/io`
2. `code-analyzer-pre.js` — `outputBlock` → `core/io`
3. `phase4-api-stop.js` — `outputAllow` → `core/io`
4. `phase8-review-stop.js` — `outputAllow` → `core/io`
5. `qa-stop.js` — `outputAllow` → `core/io`
6. `phase1-schema-stop.js` — `outputAllow, checkPhaseDeliverables` → `core/io` + `pdca/phase`
7. `phase2-convention-stop.js` — 동일
8. `phase3-mockup-stop.js` — `outputAllow, checkPhaseDeliverables, loadPdcaStatus` → `core/io` + `pdca/phase` + `pdca/status`
9. `phase7-seo-stop.js` — `outputAllow, checkPhaseDeliverables` → `core/io` + `pdca/phase`
10. `qa-pre-bash.js` — `readStdinSync, parseHookInput, outputAllow, outputBlock` → `core/io`
11. `phase2-convention-pre.js` — `readStdinSync, parseHookInput, outputAllow, outputEmpty` → `core/io`
12. `design-validator-pre.js` — 동일 패턴
13. `gap-detector-post.js` — 동일 패턴
14. `qa-monitor-post.js` — 동일 패턴
15. `phase6-ui-post.js` — `readStdinSync, parseHookInput, isUiFile, outputAllow, outputEmpty` → `core/io` + `core/file`
16. `phase9-deploy-pre.js` — `readStdinSync, parseHookInput, outputAllow, outputEmpty, PROJECT_DIR` → `core/io` + `core/platform`
17. `archive-feature.js` — `PROJECT_DIR` → `core/platform`
18. `select-template.js` — `detectLevel, PROJECT_DIR, PLUGIN_ROOT` → `pdca/level` + `core/platform`

**전환 예시**:

```javascript
// 변환 전: scripts/qa-pre-bash.js
const { readStdinSync, parseHookInput, outputAllow, outputBlock } = require('../lib/common.js');

// 변환 후:
const { readStdinSync, parseHookInput, outputAllow, outputBlock } = require('../lib/core/io');
```

#### 단계 3: core+pdca 혼합 스크립트 전환 (Day 4-7, 20개 파일)

`debugLog` + `getPdcaStatusFull` 등 2-3개 모듈을 사용하는 스크립트:

**대상**: team-stop.js, cto-stop.js, plan-plus-stop.js, phase-transition.js, subagent-start-handler.js, subagent-stop-handler.js, team-idle-handler.js, post-compaction.js, stop-failure-handler.js, unified-stop.js, unified-bash-post.js, unified-bash-pre.js, unified-write-post.js, phase5-design-post.js, pdca-post-write.js, pre-write.js, context-compaction.js, user-prompt-handler.js

**전환 예시**:

```javascript
// 변환 전: scripts/team-stop.js
const { readStdinSync, debugLog, outputAllow, getPdcaStatusFull, addPdcaHistory } = require('../lib/common.js');

// 변환 후:
const { readStdinSync, outputAllow } = require('../lib/core/io');
const { debugLog } = require('../lib/core/debug');
const { getPdcaStatusFull, addPdcaHistory } = require('../lib/pdca/status');
```

#### 단계 4: 복합 스크립트 + lib/ + hooks/ 전환 (Day 8-10, 10개 파일)

10+ 함수를 사용하는 복합 스크립트와 lib/ 내부 파일:

**대상**: gap-detector-stop.js, iterator-stop.js, pdca-skill-stop.js, pdca-task-completed.js, session-start.js, lazy-getCommon 패턴(learning-stop.js, skill-post.js, phase5-design-stop.js, phase6-ui-stop.js, phase9-deploy-stop.js, code-review-stop.js), lib/permission-manager.js, lib/context-hierarchy.js, lib/memory-store.js, lib/context-fork.js, lib/import-resolver.js, lib/skill-orchestrator.js

**lib/ 내부 전환 규칙**: `require('./common.js')` → `require('./core')` 또는 구체적 하위 모듈

```javascript
// 변환 전: lib/permission-manager.js
_common = require('./common.js');
const { debugLog, getConfig } = getCommon();

// 변환 후:
const { debugLog } = require('./core/debug');
const { getConfig } = require('./core/config');
```

#### 단계 5: common.js 제거 (Day 11)

모든 참조가 제거된 후:
1. common.js의 Proxy deprecation wrapper만 남김 (throw Error)
2. 1 릴리스 후 완전 삭제

### 1.5 검증 방법

```bash
# 1. 모든 참조 제거 확인
grep -rn "require.*common\.js" scripts/ hooks/ lib/ --include='*.js'
# 결과: 0건이어야 함

# 2. 각 스크립트 독립 실행 테스트 (syntax check)
for f in scripts/*.js; do node -c "$f" && echo "OK: $f"; done

# 3. hook 실행 테스트
echo '{}' | node hooks/session-start.js

# 4. export 수 확인 (직접 import 후에도 동일 기능)
node -e "const core = require('./lib/core'); console.log(Object.keys(core).length);" # 54
```

---

## 2. session-start.js 5개 모듈 분할 (FR-07)

### 2.1 현재 상태 분석

`hooks/session-start.js`는 787줄이며, 다음 15+ 책임을 가진다:

| 줄 번호 | 책임 | LOC | 분할 대상 |
|---------|------|:---:|----------|
| 1-23 | 모듈 import | 23 | orchestrator |
| 26-60 | context-hierarchy, memory-store, import-resolver, context-fork 로드 | 35 | `context-init.js` |
| 62-65 | 디버그 로그 | 4 | orchestrator |
| 67-111 | v1.5.9 Legacy path 마이그레이션 | 45 | `migration.js` |
| 113-124 | v1.6.2 PLUGIN_DATA 복원 | 12 | `restore.js` |
| 126-128 | PDCA status 초기화 | 3 | `context-init.js` |
| 129-217 | context-hierarchy, memory-store, import-resolver, context-fork 초기화 | 89 | `context-init.js` |
| 219-271 | UserPromptSubmit 버그 감지, Skills fork scan, import preload | 53 | `context-init.js` |
| 298-301 | v1.4.2 fixes 실행 | 4 | `context-init.js` |
| 307-433 | enhancedOnboarding(), analyzeRequestAmbiguity() | 127 | `onboarding.js` |
| 438-470 | getTriggerKeywordTable() | 33 | `onboarding.js` |
| 472-485 | 환경 변수 persist | 14 | orchestrator |
| 490-786 | additionalContext 빌드 (Feature Usage, Executive Summary 등) | 296 | `session-context.js` |

### 2.2 분할 설계

#### 파일 구조

```
hooks/
├── session-start.js          (orchestrator, ~60 LOC)
└── startup/
    ├── index.js              (re-export, ~15 LOC)
    ├── migration.js          (~60 LOC)
    ├── restore.js            (~25 LOC)
    ├── context-init.js       (~120 LOC)
    ├── onboarding.js         (~170 LOC)
    └── session-context.js    (~340 LOC)
```

#### 2.2.1 `hooks/startup/migration.js`

```javascript
/**
 * State Migration Module
 * @module hooks/startup/migration
 * @version 2.0.0
 *
 * v1.5.9 legacy path migration + future v2.0.0 schema migrations
 */

const fs = require('fs');
const { debugLog } = require('../../lib/core/debug');
const { STATE_PATHS, LEGACY_PATHS, ensureBkitDirs } = require('../../lib/core/paths');

/**
 * Migrate legacy state file paths to .bkit/ structured paths
 * @returns {{ migrated: string[], skipped: string[], errors: string[] }}
 */
function migrateStatePaths() { /* ... */ }

/**
 * Migrate pdca-status.json from v2.0 to v3.0 schema
 * @param {Object} status - Current status object
 * @returns {Object} Migrated status (v3.0)
 */
function migrateStatusSchema(status) { /* ... */ }

module.exports = { migrateStatePaths, migrateStatusSchema };
```

**Export 함수 시그니처**:
- `migrateStatePaths() → { migrated: string[], skipped: string[], errors: string[] }`
- `migrateStatusSchema(status: Object) → Object`

**이전 코드 매핑**: session-start.js 67-111줄 → `migrateStatePaths()`

#### 2.2.2 `hooks/startup/restore.js`

```javascript
/**
 * PLUGIN_DATA Restore Module
 * @module hooks/startup/restore
 * @version 2.0.0
 *
 * Restore critical state files from ${CLAUDE_PLUGIN_DATA} backup
 */

const { debugLog } = require('../../lib/core/debug');
const { restoreFromPluginData } = require('../../lib/core/paths');

/**
 * Restore state files from PLUGIN_DATA backup if missing
 * @returns {{ restored: string[], skipped: string[] }}
 */
function restorePluginDataBackup() { /* ... */ }

module.exports = { restorePluginDataBackup };
```

**Export 함수 시그니처**:
- `restorePluginDataBackup() → { restored: string[], skipped: string[] }`

**이전 코드 매핑**: session-start.js 113-124줄

#### 2.2.3 `hooks/startup/context-init.js`

```javascript
/**
 * Context Initialization Module
 * @module hooks/startup/context-init
 * @version 2.0.0
 *
 * Initialize ContextHierarchy, MemoryStore, ImportResolver
 */

const fs = require('fs');
const path = require('path');
const { debugLog } = require('../../lib/core/debug');
const { getBkitConfig } = require('../../lib/core/config');
const { initPdcaStatusIfNotExists, getPdcaStatusFull } = require('../../lib/pdca/status');
const { detectLevel } = require('../../lib/pdca/level');

/**
 * Initialize PDCA status and core context modules
 * @returns {{ contextHierarchy: Object|null, memoryStore: Object|null, importResolver: Object|null }}
 */
function initializeCoreContext() { /* ... */ }

/**
 * Scan skills for context:fork configuration
 * @param {Object|null} contextHierarchy
 * @returns {Array} Fork-enabled skills
 */
function scanSkillsForkConfig(contextHierarchy) { /* ... */ }

/**
 * Preload common imports for performance
 * @param {Object|null} importResolver
 */
function preloadCommonImports(importResolver) { /* ... */ }

/**
 * Check UserPromptSubmit plugin bug
 * @returns {string|null} Warning message or null
 */
function checkUserPromptSubmitBug() { /* ... */ }

module.exports = {
  initializeCoreContext,
  scanSkillsForkConfig,
  preloadCommonImports,
  checkUserPromptSubmitBug,
};
```

**이전 코드 매핑**: session-start.js 26-60, 126-301줄

#### 2.2.4 `hooks/startup/onboarding.js`

```javascript
/**
 * Onboarding Message Generator
 * @module hooks/startup/onboarding
 * @version 2.0.0
 *
 * Generate resume/new-user onboarding prompts
 */

const { getPdcaStatusFull } = require('../../lib/pdca/status');
const { detectLevel } = require('../../lib/pdca/level');
const { getBkitConfig } = require('../../lib/core/config');
const { emitUserPrompt } = require('../../lib/pdca/automation');
const { calculateAmbiguityScore } = require('../../lib/intent/ambiguity');

/**
 * Generate enhanced onboarding data
 * @returns {{ type: 'resume'|'new_user', hasExistingWork: boolean, primaryFeature?: string, phase?: string, matchRate?: number, prompt: Object }}
 */
function enhancedOnboarding() { /* ... */ }

/**
 * Analyze user request ambiguity
 * @param {string} userRequest
 * @param {Object} context
 * @returns {{ needsClarification: boolean, score: number, factors: string[], questions: string[], prompt: Object }|null}
 */
function analyzeRequestAmbiguity(userRequest, context) { /* ... */ }

/**
 * Generate trigger keyword reference table
 * @returns {string} Formatted markdown table
 */
function getTriggerKeywordTable() { /* ... */ }

module.exports = {
  enhancedOnboarding,
  analyzeRequestAmbiguity,
  getTriggerKeywordTable,
};
```

**이전 코드 매핑**: session-start.js 307-470줄

#### 2.2.5 `hooks/startup/session-context.js`

```javascript
/**
 * Session Context Builder
 * @module hooks/startup/session-context
 * @version 2.0.0
 *
 * Build additionalContext injected into SessionStart response
 */

const fs = require('fs');
const path = require('path');
const { detectLevel } = require('../../lib/pdca/level');
const { getPdcaStatusFull } = require('../../lib/pdca/status');

/**
 * Build full additionalContext string for SessionStart
 * @param {{ onboardingData: Object, triggerTable: string }} params
 * @returns {string} Complete additionalContext markdown
 */
function buildSessionContext({ onboardingData, triggerTable }) { /* ... */ }

module.exports = { buildSessionContext };
```

**이전 코드 매핑**: session-start.js 490-786줄

빌드하는 세션 컨텍스트 섹션:
1. Previous Work / New User 안내
2. CTO-Led Agent Teams 상태
3. Output Styles 안내
4. Memory Systems 안내
5. bkend MCP Status
6. Multi-Feature PDCA
7. PDCA Core Rules
8. Trigger Keyword Table
9. v1.4.0~v1.6.2 Enhancement 안내
10. Executive Summary Output Rule
11. bkit Feature Usage Report Rule

#### 2.2.6 `hooks/session-start.js` (orchestrator)

```javascript
#!/usr/bin/env node
/**
 * bkit Vibecoding Kit - SessionStart Hook (v2.0.0)
 * Thin orchestrator: delegates all logic to hooks/startup/ modules
 */

const fs = require('fs');
const { debugLog } = require('../lib/core/debug');
const { BKIT_PLATFORM } = require('../lib/core/platform');
const { detectLevel } = require('../lib/pdca/level');

// Startup modules
const { migrateStatePaths } = require('./startup/migration');
const { restorePluginDataBackup } = require('./startup/restore');
const { initializeCoreContext, scanSkillsForkConfig, preloadCommonImports, checkUserPromptSubmitBug } = require('./startup/context-init');
const { enhancedOnboarding, getTriggerKeywordTable } = require('./startup/onboarding');
const { buildSessionContext } = require('./startup/session-context');

// Step 1: Migration
debugLog('SessionStart', 'Hook executed', { cwd: process.cwd(), platform: BKIT_PLATFORM });
migrateStatePaths();

// Step 2: Restore from PLUGIN_DATA
restorePluginDataBackup();

// Step 3: Initialize context
const { contextHierarchy } = initializeCoreContext();
scanSkillsForkConfig(contextHierarchy);
preloadCommonImports(null);
checkUserPromptSubmitBug();

// Step 4: Persist env vars
const envFile = process.env.CLAUDE_ENV_FILE;
if (envFile) { /* ... */ }

// Step 5: Build response
const onboardingData = enhancedOnboarding();
const triggerTable = getTriggerKeywordTable();
const additionalContext = buildSessionContext({ onboardingData, triggerTable });

const response = {
  systemMessage: `bkit Vibecoding Kit v2.0.0 activated (Claude Code)`,
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    onboardingType: onboardingData.type,
    hasExistingWork: onboardingData.hasExistingWork,
    primaryFeature: onboardingData.primaryFeature || null,
    currentPhase: onboardingData.phase || null,
    matchRate: onboardingData.matchRate || null,
    additionalContext,
  }
};

console.log(JSON.stringify(response));
process.exit(0);
```

**결과**: 787줄 → orchestrator 60줄 + 5개 모듈 ~715줄 (총 ~775줄, 각 모듈 최대 340줄)

---

## 3. StateStore 추상화 (FR-06)

### 3.1 현재 문제

| 위치 | 쓰기 방식 | 문제 |
|------|----------|------|
| `lib/pdca/status.js:126,190` | `fs.writeFileSync()` 직접 호출 | 비원자적, 프로세스 충돌 시 데이터 손실 |
| `lib/memory-store.js:71` | `fs.writeFileSync()` 직접 호출 | 동일 |
| `lib/core/paths.js:207` | `fs.writeFileSync()` 직접 호출 | 동일 |
| `lib/skill-quality-reporter.js:73` | `fs.writeFileSync()` 직접 호출 | 동일 |
| `lib/team/state-writer.js:113-114` | `writeFileSync(tmp) → renameSync()` | **유일하게 원자적** (참조 모델) |

Team 모드에서 CTO + 5명의 teammate가 동시에 `agent-state.json`을 쓰면 데이터 경합 발생 가능.

### 3.2 설계

#### 파일: `lib/core/state-store.js`

```javascript
/**
 * StateStore - Atomic File I/O with Optional Locking
 * @module lib/core/state-store
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Constants
// ============================================================

/** Lock file timeout in milliseconds */
const LOCK_TIMEOUT_MS = 5000;

/** Lock file stale threshold (orphaned lock detection) */
const LOCK_STALE_MS = 10000;

/** Maximum retry attempts for acquiring lock */
const LOCK_MAX_RETRIES = 50;

/** Retry interval for lock acquisition */
const LOCK_RETRY_INTERVAL_MS = 100;

// ============================================================
// StateStore Interface (JSDoc)
// ============================================================

/**
 * @typedef {Object} StateStore
 * @property {function(string): Object|null} read - Read JSON state from path
 * @property {function(string, Object): void} write - Write JSON state to path (atomic)
 * @property {function(string): boolean} exists - Check if state file exists
 * @property {function(string): void} remove - Remove state file
 */

// ============================================================
// FileStateStore - Atomic write (no lock)
// ============================================================

/**
 * Read JSON state from file
 * @param {string} filePath - Absolute file path
 * @returns {Object|null} Parsed JSON or null
 */
function read(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * Write JSON state atomically (tmp + rename)
 * @param {string} filePath - Absolute file path
 * @param {Object} data - Data to serialize as JSON
 * @throws {Error} If write fails
 */
function write(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmpPath = filePath + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    // Cleanup tmp file on failure
    try { fs.unlinkSync(tmpPath); } catch (_) {}
    throw e;
  }
}

/**
 * Check if state file exists
 * @param {string} filePath
 * @returns {boolean}
 */
function exists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Remove state file
 * @param {string} filePath
 */
function remove(filePath) {
  try { fs.unlinkSync(filePath); } catch (_) {}
}

// ============================================================
// LockedStateStore - Atomic write with file locking
// ============================================================

/**
 * Acquire file lock
 * @param {string} filePath - File to lock
 * @param {number} [timeoutMs=LOCK_TIMEOUT_MS]
 * @returns {string} Lock file path
 * @throws {Error} If lock cannot be acquired within timeout
 */
function lock(filePath, timeoutMs = LOCK_TIMEOUT_MS) {
  const lockPath = filePath + '.lock';
  const lockData = JSON.stringify({
    pid: process.pid,
    timestamp: Date.now(),
    hostname: require('os').hostname(),
  });

  const startTime = Date.now();
  let retries = 0;

  while (retries < LOCK_MAX_RETRIES) {
    try {
      // O_EXCL: fail if file already exists (atomic create)
      fs.writeFileSync(lockPath, lockData, { flag: 'wx' });
      return lockPath;
    } catch (e) {
      if (e.code === 'EEXIST') {
        // Check for stale lock
        try {
          const existingLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (Date.now() - existingLock.timestamp > LOCK_STALE_MS) {
            // Stale lock — remove and retry
            fs.unlinkSync(lockPath);
            continue;
          }
        } catch (_) {
          // Corrupt lock file — remove and retry
          try { fs.unlinkSync(lockPath); } catch (__) {}
          continue;
        }

        // Active lock — wait and retry
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Lock timeout: ${filePath} (held by PID ${existingLock?.pid})`);
        }

        // Synchronous sleep (acceptable in hook scripts)
        const waitUntil = Date.now() + LOCK_RETRY_INTERVAL_MS;
        while (Date.now() < waitUntil) { /* busy wait */ }
        retries++;
      } else {
        throw e;
      }
    }
  }

  throw new Error(`Lock failed after ${LOCK_MAX_RETRIES} retries: ${filePath}`);
}

/**
 * Release file lock
 * @param {string} filePath - Original file path (not lock path)
 */
function unlock(filePath) {
  const lockPath = filePath + '.lock';
  try { fs.unlinkSync(lockPath); } catch (_) {}
}

/**
 * Read-modify-write with lock
 * @param {string} filePath
 * @param {function(Object|null): Object} modifier - Function that receives current data and returns modified data
 * @returns {Object} Modified data
 */
function lockedUpdate(filePath, modifier) {
  lock(filePath);
  try {
    const current = read(filePath);
    const modified = modifier(current);
    write(filePath, modified);
    return modified;
  } finally {
    unlock(filePath);
  }
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  // FileStateStore (atomic write, no lock)
  read,
  write,
  exists,
  remove,

  // LockedStateStore (atomic write + file lock)
  lock,
  unlock,
  lockedUpdate,

  // Constants
  LOCK_TIMEOUT_MS,
  LOCK_STALE_MS,
  LOCK_MAX_RETRIES,
  LOCK_RETRY_INTERVAL_MS,
};
```

### 3.3 기존 코드 대체 매핑

| 기존 코드 | 위치 | 대체 코드 |
|----------|------|----------|
| `fs.writeFileSync(statusPath, JSON.stringify(status, null, 2))` | `status.js:190` | `stateStore.write(statusPath, status)` |
| `fs.writeFileSync(statusPath, JSON.stringify(initialStatus, null, 2))` | `status.js:126` | `stateStore.write(statusPath, initialStatus)` |
| `fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2) + '\n')` | `status.js:733` | `stateStore.write(memoryPath, memory)` |
| `fs.writeFileSync(MEMORY_FILE, JSON.stringify(_memoryCache, null, 2))` | `memory-store.js:71` | `stateStore.write(MEMORY_FILE, _memoryCache)` |
| `fs.writeFileSync(tmpPath, ...); fs.renameSync(tmpPath, statePath)` | `state-writer.js:113-114` | `stateStore.write(statePath, state)` (이미 원자적, 통일만) |
| `fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2))` | `skill-quality-reporter.js:73` | `stateStore.write(statsPath, stats)` |
| `fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))` | `paths.js:207` | `stateStore.write(historyPath, history)` |

**Team 모드 동시성 제어 대상**:
- `agent-state.json` → `stateStore.lockedUpdate()` 사용
- `pdca-status.json` → `stateStore.lockedUpdate()` 사용 (Team 모드일 때)

### 3.4 savePdcaStatus() 대체

```javascript
// 변환 전: lib/pdca/status.js
function savePdcaStatus(status) {
  status.lastUpdated = new Date().toISOString();
  if (status.session) status.session.lastActivity = status.lastUpdated;
  const docsDir = path.dirname(statusPath);
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
  globalCache.set('pdca-status', status);
}

// 변환 후:
const stateStore = require('../core/state-store');

function savePdcaStatus(status) {
  const statusPath = getPdcaStatusPath();
  status.lastUpdated = new Date().toISOString();
  if (status.session) status.session.lastActivity = status.lastUpdated;

  stateStore.write(statusPath, status);  // atomic write
  globalCache.set('pdca-status', status);

  // Backup to PLUGIN_DATA (non-critical)
  try { backupToPluginData(); } catch (_) {}
}
```

---

## 4. 매직 넘버 → constants.js (FR-22 일부)

### 4.1 현재 하드코딩된 상수 추출 목록

현재 코드에서 grep으로 확인한 모든 매직 넘버/문자열:

#### 4.1.1 PDCA 관련

| 현재 코드 | 위치 | 상수명 |
|----------|------|--------|
| `90` (matchRate threshold) | `automation.js:80,171,542`, `executive-summary.js:55`, `cto-logic.js:187`, `tracker.js:157` | `MATCH_RATE_THRESHOLD` |
| `70` (matchRate warning) | `cto-logic.js:191` | `MATCH_RATE_WARNING` |
| `100` (history max entries) | `status.js:283,404,480,562,635` | `MAX_HISTORY_ENTRIES` |
| `100` (autoStart threshold) | `automation.js:144` | `AUTO_START_THRESHOLD` |
| `50` (max features) | `status.js:420` | `MAX_FEATURES` |
| `50` (ambiguity threshold) | `session-start.js:411` | `AMBIGUITY_THRESHOLD` |

#### 4.1.2 Team 관련

| 현재 코드 | 위치 | 상수명 |
|----------|------|--------|
| `10` (max teammates) | `state-writer.js:26` | `MAX_TEAMMATES` |
| `50` (max messages) | `state-writer.js:27` | `MAX_MESSAGES` |
| `50` (version history max) | `paths.js:206` | `MAX_VERSION_HISTORY` |

#### 4.1.3 Cache 관련

| 현재 코드 | 위치 | 상수명 |
|----------|------|--------|
| `5000` (default TTL ms) | `cache.js:17` | `DEFAULT_TTL` (이미 존재) |
| `60000` (tool search TTL) | `cache.js:81` | `TOOLSEARCH_TTL` (이미 존재) |
| `30000` (import cache TTL) | `import-resolver.js:36` | `IMPORT_CACHE_TTL` |
| `30000` (skill cache TTL) | `skill-orchestrator.js:43` | `SKILL_CACHE_TTL` |
| `30000` (skill loader TTL) | `skill-loader.js:27` | `CACHE_TTL_MS` |
| `3000` (pdca status cache) | `status.js:142` | `PDCA_STATUS_CACHE_TTL` |
| `5000` (context hierarchy) | `context-hierarchy.js:38` | `CONTEXT_CACHE_TTL` |
| `10000` (bkit config cache) | `config.js:103` | `BKIT_CONFIG_CACHE_TTL` |

#### 4.1.4 I/O 관련

| 현재 코드 | 위치 | 상수명 |
|----------|------|--------|
| `500` (max context length) | `io.js:11` | `MAX_CONTEXT_LENGTH` (이미 존재) |

#### 4.1.5 Quality 관련

| 현재 코드 | 위치 | 상수명 |
|----------|------|--------|
| `100` (max history entries) | `skill-quality-reporter.js:30` | `MAX_QUALITY_HISTORY` |
| `10` (max sessions per skill) | `skill-quality-reporter.js:130` | `MAX_SESSIONS_PER_SKILL` |
| `20` (max metadata per skill) | `skill-quality-reporter.js:138` | `MAX_METADATA_PER_SKILL` |
| `50` (health critical %) | `skill-quality-reporter.js:293` | `HEALTH_CRITICAL_THRESHOLD` |
| `80` (health attention %) | `skill-quality-reporter.js:294` | `HEALTH_ATTENTION_THRESHOLD` |

#### 4.1.6 Classification 관련

| 현재 코드 | 위치 | 상수명 |
|----------|------|--------|
| `200` chars / `10` lines | `classification.js:11` | `TRIVIAL_THRESHOLD` |
| `1000` chars / `50` lines | `classification.js:12` | `MINOR_THRESHOLD` |
| `5000` chars / `200` lines | `classification.js:13` | `FEATURE_THRESHOLD` |

### 4.2 constants.js 설계

#### 파일: `lib/core/constants.js`

```javascript
/**
 * bkit Central Constants
 * @module lib/core/constants
 * @version 2.0.0
 *
 * All magic numbers extracted from codebase.
 * Categories: PDCA, TEAM, CACHE, IO, QA, CLASSIFICATION
 */

// ============================================================
// PDCA Constants
// ============================================================

/** Match rate threshold for PDCA phase transition (check→report) */
const MATCH_RATE_THRESHOLD = 90;

/** Match rate below which a warning is issued */
const MATCH_RATE_WARNING = 70;

/** Maximum history entries in pdca-status.json */
const MAX_HISTORY_ENTRIES = 100;

/** Threshold for auto-starting PDCA (char count) */
const AUTO_START_THRESHOLD = 100;

/** Maximum concurrent features tracked */
const MAX_FEATURES = 50;

/** Ambiguity score above which clarifying questions are generated */
const AMBIGUITY_THRESHOLD = 50;

/** Maximum PDCA iterations before circuit breaker */
const MAX_PDCA_ITERATIONS = 10;

// ============================================================
// Team Constants
// ============================================================

/** Maximum simultaneous teammates in Team Mode */
const MAX_TEAMMATES = 10;

/** Maximum recent messages in agent-state.json ring buffer */
const MAX_TEAM_MESSAGES = 50;

/** Maximum version history entries in PLUGIN_DATA backup */
const MAX_VERSION_HISTORY = 50;

// ============================================================
// Cache TTL Constants (milliseconds)
// ============================================================

/** Default cache TTL */
const DEFAULT_CACHE_TTL = 5000;

/** Tool search result cache TTL */
const TOOLSEARCH_CACHE_TTL = 60000;

/** Import resolver cache TTL */
const IMPORT_CACHE_TTL = 30000;

/** Skill orchestrator/loader cache TTL */
const SKILL_CACHE_TTL = 30000;

/** PDCA status cache TTL */
const PDCA_STATUS_CACHE_TTL = 3000;

/** Context hierarchy cache TTL */
const CONTEXT_CACHE_TTL = 5000;

/** bkit.config.json cache TTL */
const BKIT_CONFIG_CACHE_TTL = 10000;

// ============================================================
// I/O Constants
// ============================================================

/** Maximum context length for hook output truncation */
const MAX_CONTEXT_LENGTH = 500;

// ============================================================
// QA / Quality Constants
// ============================================================

/** Maximum quality history entries */
const MAX_QUALITY_HISTORY = 100;

/** Maximum sessions tracked per skill */
const MAX_SESSIONS_PER_SKILL = 10;

/** Maximum metadata entries per skill */
const MAX_METADATA_PER_SKILL = 20;

/** Health score critical threshold (%) */
const HEALTH_CRITICAL_THRESHOLD = 50;

/** Health score needs-attention threshold (%) */
const HEALTH_ATTENTION_THRESHOLD = 80;

// ============================================================
// Classification Thresholds
// ============================================================

/** Task classification thresholds */
const CLASSIFICATION_THRESHOLDS = {
  trivial: { maxChars: 200, maxLines: 10 },
  minor:   { maxChars: 1000, maxLines: 50 },
  feature: { maxChars: 5000, maxLines: 200 },
};

// ============================================================
// State Store Constants
// ============================================================

/** Lock file timeout (ms) */
const LOCK_TIMEOUT_MS = 5000;

/** Lock file stale threshold (ms) */
const LOCK_STALE_MS = 10000;

/** Lock retry interval (ms) */
const LOCK_RETRY_INTERVAL_MS = 100;

/** Maximum lock retries */
const LOCK_MAX_RETRIES = 50;

// ============================================================
// Exports
// ============================================================

module.exports = {
  // PDCA
  MATCH_RATE_THRESHOLD,
  MATCH_RATE_WARNING,
  MAX_HISTORY_ENTRIES,
  AUTO_START_THRESHOLD,
  MAX_FEATURES,
  AMBIGUITY_THRESHOLD,
  MAX_PDCA_ITERATIONS,

  // Team
  MAX_TEAMMATES,
  MAX_TEAM_MESSAGES,
  MAX_VERSION_HISTORY,

  // Cache TTL
  DEFAULT_CACHE_TTL,
  TOOLSEARCH_CACHE_TTL,
  IMPORT_CACHE_TTL,
  SKILL_CACHE_TTL,
  PDCA_STATUS_CACHE_TTL,
  CONTEXT_CACHE_TTL,
  BKIT_CONFIG_CACHE_TTL,

  // I/O
  MAX_CONTEXT_LENGTH,

  // QA
  MAX_QUALITY_HISTORY,
  MAX_SESSIONS_PER_SKILL,
  MAX_METADATA_PER_SKILL,
  HEALTH_CRITICAL_THRESHOLD,
  HEALTH_ATTENTION_THRESHOLD,

  // Classification
  CLASSIFICATION_THRESHOLDS,

  // State Store
  LOCK_TIMEOUT_MS,
  LOCK_STALE_MS,
  LOCK_RETRY_INTERVAL_MS,
  LOCK_MAX_RETRIES,
};
```

### 4.3 마이그레이션 예시

```javascript
// 변환 전: lib/pdca/automation.js
check: context.matchRate >= 90

// 변환 후:
const { MATCH_RATE_THRESHOLD } = require('../core/constants');
check: context.matchRate >= MATCH_RATE_THRESHOLD
```

```javascript
// 변환 전: lib/pdca/status.js
if (status.history.length > 100) {
  status.history = status.history.slice(-100);
}

// 변환 후:
const { MAX_HISTORY_ENTRIES } = require('../core/constants');
if (status.history.length > MAX_HISTORY_ENTRIES) {
  status.history = status.history.slice(-MAX_HISTORY_ENTRIES);
}
```

---

## 5. BkitError 클래스 (FR-22 일부)

### 5.1 현재 상태

- **catch 블록 수**: lib/ 45개 + scripts/ 80개 + hooks/ 19개 = **총 144개**
- 에러 처리 패턴이 비일관적: 일부는 `debugLog`만, 일부는 무시(`catch (_) {}`), 일부는 `console.error`

### 5.2 에러 코드 체계

```
BKIT_{DOMAIN}_{ACTION}_{DETAIL}

Domains:
  PDCA    — PDCA 워크플로우
  STATE   — 상태 파일 I/O
  HOOK    — Hook 실행
  TEAM    — Agent Team
  CONFIG  — 설정 로드
  INTENT  — Intent 분석
  PLUGIN  — Plugin 통합
```

### 5.3 설계

#### 파일: `lib/core/errors.js`

```javascript
/**
 * BkitError - Standardized Error Class
 * @module lib/core/errors
 * @version 2.0.0
 */

// ============================================================
// Error Severity Levels
// ============================================================

/**
 * @typedef {'critical'|'error'|'warning'|'info'} ErrorSeverity
 */
const SEVERITY = {
  CRITICAL: 'critical',  // Immediate action required, workflow halted
  ERROR: 'error',        // Operation failed, fallback used
  WARNING: 'warning',    // Non-fatal issue, operation continues
  INFO: 'info',          // Informational, logged only
};

// ============================================================
// Error Codes
// ============================================================

const ERROR_CODES = {
  // PDCA Domain
  BKIT_PDCA_STATUS_READ:     'BKIT_PDCA_STATUS_READ',
  BKIT_PDCA_STATUS_WRITE:    'BKIT_PDCA_STATUS_WRITE',
  BKIT_PDCA_STATUS_MIGRATE:  'BKIT_PDCA_STATUS_MIGRATE',
  BKIT_PDCA_PHASE_INVALID:   'BKIT_PDCA_PHASE_INVALID',
  BKIT_PDCA_TRANSITION_FAIL: 'BKIT_PDCA_TRANSITION_FAIL',
  BKIT_PDCA_FEATURE_LIMIT:   'BKIT_PDCA_FEATURE_LIMIT',
  BKIT_PDCA_ITERATION_LIMIT: 'BKIT_PDCA_ITERATION_LIMIT',

  // State Domain
  BKIT_STATE_READ:           'BKIT_STATE_READ',
  BKIT_STATE_WRITE:          'BKIT_STATE_WRITE',
  BKIT_STATE_LOCK_TIMEOUT:   'BKIT_STATE_LOCK_TIMEOUT',
  BKIT_STATE_LOCK_STALE:     'BKIT_STATE_LOCK_STALE',
  BKIT_STATE_CORRUPT:        'BKIT_STATE_CORRUPT',
  BKIT_STATE_MIGRATION:      'BKIT_STATE_MIGRATION',

  // Hook Domain
  BKIT_HOOK_STDIN_PARSE:     'BKIT_HOOK_STDIN_PARSE',
  BKIT_HOOK_OUTPUT_FAIL:     'BKIT_HOOK_OUTPUT_FAIL',
  BKIT_HOOK_TIMEOUT:         'BKIT_HOOK_TIMEOUT',
  BKIT_HOOK_MODULE_LOAD:     'BKIT_HOOK_MODULE_LOAD',

  // Team Domain
  BKIT_TEAM_STATE_READ:      'BKIT_TEAM_STATE_READ',
  BKIT_TEAM_STATE_WRITE:     'BKIT_TEAM_STATE_WRITE',
  BKIT_TEAM_MAX_TEAMMATES:   'BKIT_TEAM_MAX_TEAMMATES',
  BKIT_TEAM_NOT_AVAILABLE:   'BKIT_TEAM_NOT_AVAILABLE',

  // Config Domain
  BKIT_CONFIG_LOAD:          'BKIT_CONFIG_LOAD',
  BKIT_CONFIG_PARSE:         'BKIT_CONFIG_PARSE',
  BKIT_CONFIG_MISSING:       'BKIT_CONFIG_MISSING',

  // Intent Domain
  BKIT_INTENT_DETECT:        'BKIT_INTENT_DETECT',
  BKIT_INTENT_AMBIGUOUS:     'BKIT_INTENT_AMBIGUOUS',

  // Plugin Domain
  BKIT_PLUGIN_DATA_BACKUP:   'BKIT_PLUGIN_DATA_BACKUP',
  BKIT_PLUGIN_DATA_RESTORE:  'BKIT_PLUGIN_DATA_RESTORE',
  BKIT_PLUGIN_INIT:          'BKIT_PLUGIN_INIT',
};

// ============================================================
// BkitError Class
// ============================================================

/**
 * Standardized bkit error with code, severity, and context
 * @extends Error
 */
class BkitError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {Object} options
   * @param {string} options.code - Error code from ERROR_CODES
   * @param {ErrorSeverity} [options.severity='error'] - Severity level
   * @param {Error} [options.cause] - Original error
   * @param {Object} [options.context] - Additional context (file path, feature name, etc.)
   */
  constructor(message, { code, severity = SEVERITY.ERROR, cause = null, context = {} } = {}) {
    super(message);
    this.name = 'BkitError';
    this.code = code || 'BKIT_UNKNOWN';
    this.severity = severity;
    this.cause = cause;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert to JSON for logging/serialization
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        code: this.cause.code,
      } : null,
    };
  }

  /**
   * Check if this is a critical error
   * @returns {boolean}
   */
  isCritical() {
    return this.severity === SEVERITY.CRITICAL;
  }

  /**
   * Format for debug log output
   * @returns {string}
   */
  toDebugString() {
    return `[${this.code}] ${this.message}${this.cause ? ` (caused by: ${this.cause.message})` : ''}`;
  }
}

// ============================================================
// Helper: Safe Catch Wrapper
// ============================================================

/**
 * Wrap a function call with standardized error handling
 * @param {Function} fn - Function to execute
 * @param {Object} options
 * @param {string} options.code - Error code for wrapping
 * @param {*} options.fallback - Fallback value on error
 * @param {string} [options.module] - Module name for debug logging
 * @returns {*} Function result or fallback
 */
function safeCatch(fn, { code, fallback, module = 'bkit' } = {}) {
  try {
    return fn();
  } catch (e) {
    const bkitError = e instanceof BkitError ? e : new BkitError(e.message, {
      code,
      severity: SEVERITY.WARNING,
      cause: e,
    });

    // Log via debugLog if available
    try {
      const { debugLog } = require('./debug');
      debugLog(module, bkitError.toDebugString(), bkitError.context);
    } catch (_) {}

    return fallback;
  }
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  BkitError,
  ERROR_CODES,
  SEVERITY,
  safeCatch,
};
```

### 5.4 기존 catch 블록 표준화 가이드

#### 패턴 1: 무시 가능한 에러 (`catch (_) {}`)

```javascript
// 변환 전:
try { backupToPluginData(); } catch (_) { /* non-critical */ }

// 변환 후:
safeCatch(() => backupToPluginData(), {
  code: ERROR_CODES.BKIT_PLUGIN_DATA_BACKUP,
  fallback: undefined,
  module: 'PDCA',
});
```

#### 패턴 2: debugLog만 하는 에러

```javascript
// 변환 전:
try {
  const content = fs.readFileSync(path, 'utf8');
  return JSON.parse(content);
} catch (e) {
  debugLog('PDCA', 'Failed to read status', { error: e.message });
  return null;
}

// 변환 후:
return safeCatch(() => {
  const content = fs.readFileSync(path, 'utf8');
  return JSON.parse(content);
}, {
  code: ERROR_CODES.BKIT_PDCA_STATUS_READ,
  fallback: null,
  module: 'PDCA',
});
```

#### 패턴 3: 워크플로우 중단이 필요한 에러

```javascript
// 변환 전:
try { /* ... */ } catch (e) { throw e; }

// 변환 후:
throw new BkitError('Status migration failed', {
  code: ERROR_CODES.BKIT_PDCA_STATUS_MIGRATE,
  severity: SEVERITY.CRITICAL,
  cause: originalError,
  context: { feature, fromVersion: '2.0', toVersion: '3.0' },
});
```

### 5.5 마이그레이션 우선순위

1. **즉시 적용** (Phase 1): 신규 모듈 (`state-store.js`, `constants.js` 등) — BkitError 처음부터 사용
2. **단계적 전환** (Phase 2-5): 기존 144개 catch 블록 → 중요도순으로 점진 전환
   - P0: `status.js` (6개), `state-writer.js` (3개), `paths.js` (5개) — 상태 파일 관련
   - P1: `user-prompt-handler.js` (13개), `session-start.js` (19개) — 사용자 대면
   - P2: 나머지 scripts/ (80개)

---

## 6. pdca-status.json v3.0 스키마 (FR-21)

### 6.1 현재 v2.0 스키마

```json
{
  "version": "2.0",
  "lastUpdated": "ISO-8601",
  "activeFeatures": ["feature-name"],
  "primaryFeature": "feature-name",
  "features": {
    "feature-name": {
      "phase": "plan|design|do|check|act|report|archived",
      "phaseNumber": 0-7,
      "matchRate": null|0-100,
      "iterationCount": 0,
      "requirements": [],
      "documents": {},
      "timestamps": {
        "started": "ISO-8601",
        "lastUpdated": "ISO-8601"
      }
    }
  },
  "pipeline": {
    "currentPhase": 1-9,
    "level": "Starter|Dynamic|Enterprise",
    "phaseHistory": []
  },
  "session": {
    "startedAt": "ISO-8601",
    "onboardingCompleted": false,
    "lastActivity": "ISO-8601"
  },
  "history": [{ "timestamp": "ISO-8601", "feature": "", "phase": "", "action": "" }]
}
```

### 6.2 v3.0 신규 필드

```json
{
  "version": "3.0",

  // === v2.0 필드 100% 유지 (하위 호환) ===
  "lastUpdated": "ISO-8601",
  "activeFeatures": [],
  "primaryFeature": null,
  "features": {
    "feature-name": {
      // v2.0 기존 필드 전부 유지
      "phase": "plan",
      "phaseNumber": 1,
      "matchRate": null,
      "iterationCount": 0,
      "requirements": [],
      "documents": {},
      "timestamps": {
        "started": "ISO-8601",
        "lastUpdated": "ISO-8601"
      },

      // v3.0 신규: Phase Timestamps
      "phaseTimestamps": {
        "pm": { "entered": "ISO-8601", "exited": "ISO-8601", "duration": 0 },
        "plan": { "entered": "ISO-8601", "exited": null, "duration": null },
        "design": null,
        "do": null,
        "check": null,
        "act": null,
        "report": null
      },

      // v3.0 신규: Feature Metrics
      "metrics": {
        "totalIterations": 0,
        "matchRateHistory": [{ "timestamp": "ISO-8601", "rate": 85 }],
        "qualityScoreHistory": [],
        "checkpointCount": 0,
        "errorCount": 0,
        "resumeCount": 0
      },

      // v3.0 신규: State Machine State
      "stateMachine": {
        "currentState": "plan",
        "automationLevel": "semi-auto",
        "controlLevel": 2,
        "trustScore": 50,
        "pendingApproval": null,
        "lastTransition": {
          "from": "pm",
          "to": "plan",
          "trigger": "auto",
          "timestamp": "ISO-8601"
        }
      }
    }
  },

  // v2.0 기존
  "pipeline": { /* 동일 */ },
  "session": { /* 동일 */ },
  "history": [],

  // v3.0 신규: Global Team State
  "team": {
    "enabled": false,
    "lastSession": null,
    "totalSessions": 0,
    "cumulativeStats": {
      "totalTasks": 0,
      "completedTasks": 0,
      "failedTasks": 0
    }
  },

  // v3.0 신규: Automation Config
  "automation": {
    "defaultLevel": "semi-auto",
    "controlLevel": 2,
    "trustScore": 50,
    "featureOverrides": {}
  }
}
```

### 6.3 JSON Schema 정의

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://bkit.dev/schemas/pdca-status-v3.json",
  "title": "bkit PDCA Status v3.0",
  "type": "object",
  "required": ["version", "lastUpdated", "activeFeatures", "features"],
  "properties": {
    "version": {
      "type": "string",
      "enum": ["2.0", "3.0"]
    },
    "lastUpdated": {
      "type": "string",
      "format": "date-time"
    },
    "activeFeatures": {
      "type": "array",
      "items": { "type": "string" },
      "maxItems": 50
    },
    "primaryFeature": {
      "type": ["string", "null"]
    },
    "features": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/$defs/feature"
      }
    },
    "pipeline": {
      "$ref": "#/$defs/pipeline"
    },
    "session": {
      "$ref": "#/$defs/session"
    },
    "history": {
      "type": "array",
      "maxItems": 100
    },
    "team": {
      "$ref": "#/$defs/team"
    },
    "automation": {
      "$ref": "#/$defs/automation"
    }
  },
  "$defs": {
    "feature": {
      "type": "object",
      "required": ["phase"],
      "properties": {
        "phase": {
          "type": "string",
          "enum": ["pm", "plan", "design", "do", "check", "act", "report", "archived", "completed"]
        },
        "phaseNumber": { "type": "integer", "minimum": 0, "maximum": 7 },
        "matchRate": { "type": ["number", "null"], "minimum": 0, "maximum": 100 },
        "iterationCount": { "type": "integer", "minimum": 0 },
        "requirements": { "type": "array" },
        "documents": { "type": "object" },
        "timestamps": { "type": "object" },
        "phaseTimestamps": { "type": ["object", "null"] },
        "metrics": { "type": ["object", "null"] },
        "stateMachine": { "type": ["object", "null"] }
      }
    },
    "pipeline": {
      "type": "object",
      "properties": {
        "currentPhase": { "type": "integer", "minimum": 1, "maximum": 9 },
        "level": { "type": "string", "enum": ["Starter", "Dynamic", "Enterprise"] },
        "phaseHistory": { "type": "array" }
      }
    },
    "session": {
      "type": "object",
      "properties": {
        "startedAt": { "type": "string", "format": "date-time" },
        "onboardingCompleted": { "type": "boolean" },
        "lastActivity": { "type": "string", "format": "date-time" }
      }
    },
    "team": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "lastSession": { "type": ["string", "null"] },
        "totalSessions": { "type": "integer" },
        "cumulativeStats": { "type": "object" }
      }
    },
    "automation": {
      "type": "object",
      "properties": {
        "defaultLevel": { "type": "string", "enum": ["guide", "semi-auto", "full-auto"] },
        "controlLevel": { "type": "integer", "minimum": 0, "maximum": 4 },
        "trustScore": { "type": "integer", "minimum": 0, "maximum": 100 },
        "featureOverrides": { "type": "object" }
      }
    }
  }
}
```

### 6.4 v2.0 → v3.0 마이그레이션 로직

#### 파일: `lib/pdca/status.js` 확장

```javascript
/**
 * Migrate v2.0 schema to v3.0
 * @param {Object} status - v2.0 status object
 * @returns {Object} v3.0 status object
 */
function migrateStatusToV3(status) {
  if (status.version === '3.0') return status;

  const now = new Date().toISOString();

  // 1. Version bump
  status.version = '3.0';

  // 2. Add v3.0 fields to each feature (non-destructive)
  for (const [name, feat] of Object.entries(status.features || {})) {
    // phaseTimestamps: reconstruct from existing timestamps
    if (!feat.phaseTimestamps) {
      feat.phaseTimestamps = {
        pm: null, plan: null, design: null, do: null,
        check: null, act: null, report: null,
      };
      // Populate current phase entry from existing timestamps
      if (feat.phase && feat.timestamps?.started) {
        feat.phaseTimestamps[feat.phase] = {
          entered: feat.timestamps.started,
          exited: null,
          duration: null,
        };
      }
    }

    // metrics: initialize from existing data
    if (!feat.metrics) {
      feat.metrics = {
        totalIterations: feat.iterationCount || 0,
        matchRateHistory: feat.matchRate != null
          ? [{ timestamp: now, rate: feat.matchRate }]
          : [],
        qualityScoreHistory: [],
        checkpointCount: 0,
        errorCount: 0,
        resumeCount: 0,
      };
    }

    // stateMachine: initialize from current state
    if (!feat.stateMachine) {
      feat.stateMachine = {
        currentState: feat.phase || 'plan',
        automationLevel: 'semi-auto',
        controlLevel: 2,
        trustScore: 50,
        pendingApproval: null,
        lastTransition: null,
      };
    }
  }

  // 3. Add global team section
  if (!status.team) {
    status.team = {
      enabled: false,
      lastSession: null,
      totalSessions: 0,
      cumulativeStats: { totalTasks: 0, completedTasks: 0, failedTasks: 0 },
    };
  }

  // 4. Add global automation section
  if (!status.automation) {
    status.automation = {
      defaultLevel: 'semi-auto',
      controlLevel: 2,
      trustScore: 50,
      featureOverrides: {},
    };
  }

  status.lastUpdated = now;
  return status;
}
```

**getPdcaStatusFull() 수정**:

```javascript
function getPdcaStatusFull(forceRefresh = false) {
  /* ... existing cache logic ... */

  let status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

  // Auto-migrate
  if (!status.version || status.version === '1.0') {
    status = migrateStatusToV2(status);
  }
  if (status.version === '2.0') {
    status = migrateStatusToV3(status);  // NEW
  }

  savePdcaStatus(status);
  globalCache.set('pdca-status', status);
  return status;
}
```

**createInitialStatusV3()**:

```javascript
function createInitialStatusV3() {
  const base = createInitialStatusV2();
  base.version = '3.0';
  base.team = {
    enabled: false,
    lastSession: null,
    totalSessions: 0,
    cumulativeStats: { totalTasks: 0, completedTasks: 0, failedTasks: 0 },
  };
  base.automation = {
    defaultLevel: 'semi-auto',
    controlLevel: 2,
    trustScore: 50,
    featureOverrides: {},
  };
  return base;
}
```

### 6.5 하위 호환성 보장

| v2.0 필드 | v3.0 상태 | 접근 방법 |
|----------|----------|----------|
| `version` | "3.0"으로 변경 | 기존 `version === "2.0"` 체크는 마이그레이션 코드에서만 사용 |
| `features[x].phase` | 그대로 유지 | 동일 접근 |
| `features[x].phaseNumber` | 그대로 유지 | 동일 접근 |
| `features[x].matchRate` | 그대로 유지 | 동일 접근 |
| `features[x].iterationCount` | 그대로 유지 | 동일 접근 |
| `features[x].timestamps` | 그대로 유지 | 동일 접근 |
| `activeFeatures` | 그대로 유지 | 동일 접근 |
| `primaryFeature` | 그대로 유지 | 동일 접근 |
| `pipeline` | 그대로 유지 | 동일 접근 |
| `session` | 그대로 유지 | 동일 접근 |
| `history` | 그대로 유지 | 동일 접근 |

v3.0 신규 필드(`phaseTimestamps`, `metrics`, `stateMachine`, `team`, `automation`)는 모두 optional이며, 기존 코드가 접근하지 않으므로 하위 호환 100% 보장.

---

## 7. 구현 순서 및 의존 관계

```
Phase 1 (Day 1-3): 기반 모듈
  ├── [1] lib/core/constants.js (독립, 의존 없음)
  ├── [2] lib/core/errors.js (독립, 의존 없음)
  └── [3] lib/core/state-store.js ([1]에 의존)

Phase 2 (Day 4-7): session-start 분할
  ├── [4] hooks/startup/migration.js ([1],[2] 사용)
  ├── [5] hooks/startup/restore.js ([2] 사용)
  ├── [6] hooks/startup/context-init.js ([1],[2] 사용)
  ├── [7] hooks/startup/onboarding.js ([1] 사용)
  ├── [8] hooks/startup/session-context.js ([1] 사용)
  └── [9] hooks/session-start.js 리팩토링 ([4]-[8] orchestrator)

Phase 3 (Day 8-10): common.js 제거 (단계 2-3)
  ├── [10] scripts/ I/O 전용 18개 파일 전환
  └── [11] scripts/ core+pdca 혼합 20개 파일 전환

Phase 4 (Day 11-13): common.js 제거 (단계 4) + 스키마
  ├── [12] scripts/ 복합 + lib/ 10개 파일 전환
  ├── [13] common.js deprecation wrapper
  └── [14] pdca-status.json v3.0 스키마 + 마이그레이션

Phase 5 (Day 14): 검증 + 정리
  ├── [15] 전체 스크립트 독립 실행 테스트
  ├── [16] Hook cold start 성능 측정
  └── [17] Quality Score 재측정
```

---

## 8. 검증 기준

| # | 검증 항목 | 방법 | 기대 결과 |
|---|----------|------|----------|
| 1 | common.js 참조 0건 | `grep -rn "common.js" scripts/ hooks/ lib/ --include='*.js'` | 0건 (deprecation wrapper 제외) |
| 2 | 모든 스크립트 구문 정상 | `for f in scripts/*.js; do node -c "$f"; done` | 48개 전부 OK |
| 3 | SessionStart 정상 실행 | `echo '{}' \| node hooks/session-start.js` | 유효한 JSON 출력 |
| 4 | Hook cold start 시간 | `time node -e "require('./lib/core/io')"` vs `time node -e "require('./lib/common')"` | 50%+ 감소 |
| 5 | pdca-status.json v2.0→v3.0 마이그레이션 | v2.0 파일로 테스트 | v3.0 + 모든 v2.0 필드 유지 |
| 6 | StateStore 원자적 쓰기 | 프로세스 중단 시뮬레이션 | 데이터 무손실 |
| 7 | StateStore 잠금 동시성 | 2개 프로세스 동시 쓰기 | 순차 처리, 데이터 일관성 |
| 8 | BkitError 직렬화 | `JSON.stringify(new BkitError(...))` | 유효한 JSON |
| 9 | constants.js 매직 넘버 0건 | grep으로 리터럴 숫자 검색 | lib/ 내 하드코딩 매직 넘버 0건 |
| 10 | Quality Score | code-analyzer 실행 | 85+/100 |

---

## Version History

| 버전 | 날짜 | 변경 | 작성자 |
|------|------|------|--------|
| 1.0 | 2026-03-19 | 영역 4 상세 설계 초안 | Claude Opus 4.6 + bkit-code-analyzer |
