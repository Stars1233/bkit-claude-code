# globalcache-project-isolation 설계서

> **요약**: PLUGIN_DATA 백업/복원에 프로젝트 검증 가드 추가 및 globalCache 프로젝트 격리 설계
>
> **프로젝트**: bkit-claude-code
> **버전**: 2.0.0
> **작성자**: Claude
> **날짜**: 2026-03-21
> **상태**: Draft
> **계획서**: [globalcache-project-isolation.plan.md](../01-plan/features/globalcache-project-isolation.plan.md)

---

## 1. 개요

### 1.1 설계 목표

- `backupToPluginData()` / `restoreFromPluginData()`에 프로젝트 식별 메커니즘을 추가하여 크로스 프로젝트 상태 오염을 원천 차단한다
- `globalCache`의 PDCA 상태 키를 프로젝트별로 네임스페이스하여 동일 세션 내 프로젝트 전환 시 캐시 격리를 보장한다
- 최소 변경 원칙: 수정 파일 2개, 추가 코드 ~40 LOC

### 1.2 설계 원칙

- **안전 우선**: 검증 불가 시 복원 거부 (잘못된 복원 > 깨끗한 초기화)
- **하위 호환**: meta.json 없는 레거시 백업은 에러 없이 스킵
- **투명성**: 스킵 사유를 반환값에 명시하여 디버깅 용이

---

## 2. 아키텍처

### 2.1 변경 전 데이터 흐름 (현재 — 버그)

```
┌─────────────┐     ┌──────────────────────────────────────┐     ┌─────────────┐
│ Project A   │     │ CLAUDE_PLUGIN_DATA (전역)              │     │ Project B   │
│             │     │ ~/.claude/plugins/data/bkit/backup/   │     │             │
│ savePdca()  │────▶│ pdca-status.backup.json  ← A의 상태    │     │             │
│             │     │ (프로젝트 식별 정보 없음)                 │     │             │
└─────────────┘     └──────────────────────────────────────┘     └─────────────┘
                                    │                                    │
                                    │ SessionStart (B 설치)               │
                                    │ !destExists && backupExists        │
                                    │ → 무조건 복원                        │
                                    └───────────────────────────────────▶│
                                                                 A의 상태가
                                                                 B에 복사됨 ✗
```

### 2.2 변경 후 데이터 흐름 (수정)

```
┌─────────────┐     ┌──────────────────────────────────────┐     ┌─────────────┐
│ Project A   │     │ CLAUDE_PLUGIN_DATA (전역)              │     │ Project B   │
│ /path/to/A  │     │ ~/.claude/plugins/data/bkit/backup/   │     │ /path/to/B  │
│             │     │                                      │     │             │
│ savePdca()  │────▶│ pdca-status.backup.json  ← A의 상태    │     │             │
│             │────▶│ meta.json ← { projectDir: "/path/A" }│     │             │
└─────────────┘     └──────────────────────────────────────┘     └─────────────┘
                                    │                                    │
                                    │ SessionStart (B 설치)               │
                                    │ meta.projectDir ≠ PROJECT_DIR      │
                                    │ → 복원 거부 ✓                       │
                                    └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ▶│
                                                                 createInitial
                                                                 StatusV2() ✓
```

### 2.3 컴포넌트 의존 관계

| 컴포넌트 | 의존 대상 | 역할 |
|-----------|-----------|------|
| `lib/core/paths.js` | `lib/core/platform.js` (PROJECT_DIR) | 백업/복원 + 프로젝트 검증 |
| `lib/pdca/status.js` | `lib/core/paths.js`, `lib/core/cache.js` | PDCA 상태 관리 + 캐시 네임스페이스 |
| `hooks/startup/restore.js` | `lib/core/paths.js` | SessionStart 시 복원 호출 (변경 불필요) |
| `scripts/post-compaction.js` | `lib/core/paths.js` | PostCompact 시 복원 호출 (변경 불필요) |

> `hooks/startup/restore.js`와 `scripts/post-compaction.js`는 `restoreFromPluginData()`의 반환값만 사용하므로 수정 불필요. 가드 로직은 `paths.js` 내부에서 처리됨.

---

## 3. 상세 설계

### 3.1 `backupToPluginData()` 수정 — meta.json 저장

**파일**: `lib/core/paths.js` (line 209~254)

**현재 코드** (version-history.json 저장 부분):
```javascript
history.push({ timestamp: new Date().toISOString(), bkitVersion: '2.0.0', backed });
```

**수정 내용**: 백업 성공 후 `meta.json`에 프로젝트 경로를 기록한다.

```javascript
// backupToPluginData() 마지막에 추가
// Write project identity for cross-project restore guard
try {
  const metaPath = path.join(backupDir, 'meta.json');
  const meta = {
    projectDir: getPlatform().PROJECT_DIR,
    timestamp: new Date().toISOString(),
    bkitVersion: '2.0.0',
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
} catch (_) { /* meta.json is non-critical */ }
```

**설계 결정**:
- `meta.json` 쓰기 실패는 무시 (기존 백업 동작에 영향 없음)
- `projectDir`은 `getPlatform().PROJECT_DIR` 원본 사용 (심볼릭 링크 정규화는 복원 시에만)
- `version-history.json`과 별도 파일로 분리 (관심사 분리: version-history는 이력, meta는 현재 소유자)

### 3.2 `restoreFromPluginData()` 수정 — 프로젝트 검증 가드

**파일**: `lib/core/paths.js` (line 261~294)

**현재 코드** (핵심 버그):
```javascript
if (!fs.existsSync(destPath) && fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, destPath);
  restored.push(t.name);
}
```

**수정 설계**: 복원 루프 진입 전에 meta.json을 읽고 프로젝트 일치 여부를 검증한다.

```javascript
function restoreFromPluginData() {
  const backupDir = STATE_PATHS.pluginDataBackup();
  if (!backupDir || !fs.existsSync(backupDir)) {
    return { restored: [], skipped: ['no backup directory'] };
  }

  // === NEW: Project identity guard ===
  const metaPath = path.join(backupDir, 'meta.json');
  try {
    if (!fs.existsSync(metaPath)) {
      return { restored: [], skipped: ['no meta.json — legacy backup, skipping for safety'] };
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const currentDir = getPlatform().PROJECT_DIR;

    // Normalize paths to handle symlinks
    let metaResolved, currentResolved;
    try {
      metaResolved = fs.realpathSync(meta.projectDir);
      currentResolved = fs.realpathSync(currentDir);
    } catch (_) {
      // realpathSync fails if path doesn't exist (deleted project)
      metaResolved = meta.projectDir;
      currentResolved = currentDir;
    }

    if (metaResolved !== currentResolved) {
      return {
        restored: [],
        skipped: [`backup belongs to different project: ${meta.projectDir}`]
      };
    }
  } catch (e) {
    // Corrupted meta.json — skip restore for safety
    return { restored: [], skipped: [`meta.json parse error: ${e.message}`] };
  }
  // === END: Project identity guard ===

  // ... (기존 복원 로직 동일 유지) ...
}
```

**검증 흐름도**:

```
restoreFromPluginData() 호출
  │
  ├─ backupDir 없음? → return { skipped: ['no backup directory'] }
  │
  ├─ meta.json 없음? → return { skipped: ['legacy backup, skipping'] }  ← FR-03
  │
  ├─ meta.json 파싱 실패? → return { skipped: ['parse error'] }
  │
  ├─ meta.projectDir ≠ PROJECT_DIR? → return { skipped: ['different project'] }  ← FR-02
  │
  └─ 일치 → 기존 복원 로직 실행  ← 정상 경로
```

### 3.3 `globalCache` 프로젝트 네임스페이스

**파일**: `lib/pdca/status.js`

**현재 코드**: 고정 키 `'pdca-status'` 사용 (6곳)

```javascript
// line 186
globalCache.set('pdca-status', initialStatus);

// line 201
const cached = globalCache.get('pdca-status', 3000);

// line 219
globalCache.set('pdca-status', status);

// line 255
globalCache.set('pdca-status', status);
```

**수정 설계**: 헬퍼 함수를 추가하여 프로젝트별 캐시 키를 생성한다.

```javascript
/**
 * Get project-scoped cache key for PDCA status
 * @returns {string} Cache key like 'pdca-status:/path/to/project'
 */
function _getCacheKey() {
  try {
    const { PROJECT_DIR } = require('../core/platform');
    return `pdca-status:${PROJECT_DIR}`;
  } catch (_) {
    return 'pdca-status';  // Fallback for edge cases
  }
}
```

**적용 위치**: `globalCache.get('pdca-status', ...)` → `globalCache.get(_getCacheKey(), ...)` (전체 치환)

| 함수 | 라인 | 변경 |
|------|------|------|
| `initPdcaStatusIfNotExists()` | 186 | `globalCache.set(_getCacheKey(), ...)` |
| `getPdcaStatusFull()` | 201 | `globalCache.get(_getCacheKey(), 3000)` |
| `getPdcaStatusFull()` | 219 | `globalCache.set(_getCacheKey(), ...)` |
| `savePdcaStatus()` | 255 | `globalCache.set(_getCacheKey(), ...)` |

---

## 4. 데이터 모델

### 4.1 meta.json 스키마

```json
{
  "projectDir": "/Users/user/projects/my-app",
  "timestamp": "2026-03-21T10:00:00.000Z",
  "bkitVersion": "2.0.0"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `projectDir` | string | Yes | 백업 원본 프로젝트의 절대 경로 (`getPlatform().PROJECT_DIR`) |
| `timestamp` | string (ISO 8601) | Yes | 마지막 백업 시각 |
| `bkitVersion` | string | Yes | 백업 시점의 bkit 버전 |

### 4.2 파일 위치

```
~/.claude/plugins/data/bkit-bkit-marketplace/backup/
├── meta.json                    ← NEW (프로젝트 식별)
├── pdca-status.backup.json      ← 기존 (변경 없음)
├── memory.backup.json           ← 기존 (변경 없음)
└── version-history.json         ← 기존 (변경 없음)
```

---

## 5. 에러 처리

### 5.1 시나리오별 처리

| 시나리오 | 처리 | 반환값 |
|----------|------|--------|
| meta.json 없음 (레거시) | 복원 스킵 | `{ skipped: ['no meta.json — legacy backup, skipping for safety'] }` |
| meta.json JSON 파싱 실패 | 복원 스킵 | `{ skipped: ['meta.json parse error: ...'] }` |
| meta.projectDir ≠ currentDir | 복원 스킵 | `{ skipped: ['backup belongs to different project: ...'] }` |
| meta.json 쓰기 실패 | 무시, 백업은 정상 수행 | 기존 반환값 유지 |
| realpathSync 실패 (삭제된 프로젝트) | 원본 경로로 비교 | 정상 흐름 |
| meta.projectDir 필드 누락 | 복원 스킵 | `{ skipped: ['meta.json missing projectDir'] }` |

### 5.2 로깅

모든 스킵 사유는 `debugLog()`를 통해 기록되며, `hooks/startup/restore.js`에서 이미 결과를 로깅하고 있으므로 추가 로깅 불필요.

---

## 6. 보안 고려사항

- [x] 경로 비교 시 `fs.realpathSync`로 심볼릭 링크 우회 방지
- [x] meta.json 파싱 시 임의 JSON 주입 불가 (읽기 전용, projectDir만 사용)
- [x] meta.json에 민감 정보 미포함 (프로젝트 경로만 저장)

---

## 7. 테스트 계획

### 7.1 테스트 범위

| 유형 | 대상 | 방법 |
|------|------|------|
| 시나리오 테스트 | 크로스 프로젝트 복원 차단 | 수동 (프로젝트 2개) |
| 시나리오 테스트 | 동일 프로젝트 복원 성공 | 수동 |
| 엣지 케이스 | 레거시 백업 (meta.json 없음) | 코드 리뷰 |
| 엣지 케이스 | 손상된 meta.json | 코드 리뷰 |
| 엣지 케이스 | 심볼릭 링크 프로젝트 경로 | 코드 리뷰 |

### 7.2 핵심 테스트 케이스

- [ ] **TC-01**: 프로젝트 A 백업 후 프로젝트 B에서 `restoreFromPluginData()` → 복원 거부 확인
- [ ] **TC-02**: 프로젝트 A 백업 후 프로젝트 A에서 `restoreFromPluginData()` → 정상 복원 확인
- [ ] **TC-03**: meta.json 삭제 후 `restoreFromPluginData()` → 스킵 (레거시 안전 모드) 확인
- [ ] **TC-04**: meta.json에 잘못된 JSON → 스킵 + 에러 메시지 확인
- [ ] **TC-05**: globalCache에서 프로젝트 A/B 키가 별도로 저장되는지 확인
- [ ] **TC-06**: meta.json에 projectDir 필드 누락 → 스킵 확인
- [ ] **TC-07**: `backupToPluginData()` 호출 후 meta.json이 올바른 projectDir을 포함하는지 확인

---

## 8. 구현 가이드

### 8.1 수정 파일 목록

```
lib/
├── core/
│   └── paths.js          ← backupToPluginData() + restoreFromPluginData() 수정
└── pdca/
    └── status.js         ← globalCache 키 네임스페이스
```

### 8.2 구현 순서

1. [ ] `lib/core/paths.js` — `backupToPluginData()`에 meta.json 쓰기 추가
2. [ ] `lib/core/paths.js` — `restoreFromPluginData()`에 프로젝트 검증 가드 추가
3. [ ] `lib/pdca/status.js` — `_getCacheKey()` 헬퍼 추가 및 globalCache 키 교체
4. [ ] 수동 테스트: 프로젝트 2개에서 교차 복원 시도

### 8.3 변경 크기 추정

| 파일 | 추가 | 수정 | 삭제 | 순변경 |
|------|------|------|------|--------|
| `lib/core/paths.js` | ~30 LOC | ~5 LOC | 0 | +30 |
| `lib/pdca/status.js` | ~10 LOC | ~4 LOC | 0 | +10 |
| **합계** | **~40 LOC** | **~9 LOC** | **0** | **+40** |

---

## 버전 이력

| 버전 | 날짜 | 변경사항 | 작성자 |
|------|------|----------|--------|
| 0.1 | 2026-03-21 | 초안 작성 | Claude |
