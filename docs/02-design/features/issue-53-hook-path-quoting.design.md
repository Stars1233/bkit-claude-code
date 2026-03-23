# issue-53-hook-path-quoting 설계서

> **요약**: hooks.json 모든 command 경로에 double-quote 적용하여 Windows 특수문자 경로 호환성 확보
>
> **프로젝트**: bkit-claude-code
> **버전**: 2.0.4
> **작성자**: Claude
> **날짜**: 2026-03-23
> **상태**: Approved
> **이슈**: [GitHub #53](https://github.com/popup-studio-ai/bkit-claude-code/issues/53)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **문제** | `hooks.json`의 18개 hook command에서 `${CLAUDE_PLUGIN_ROOT}` 경로 미인용으로 Windows 괄호 경로에서 bash syntax error |
| **해결** | 모든 hook command의 node 스크립트 경로를 `\"...\"`로 감싸기 |
| **기능/UX 효과** | Windows 사용자의 모든 hook이 정상 작동, 설치 후 추가 설정 불필요 |
| **핵심 가치** | "설치하면 어디서든 동작" 원칙 — 크로스 플랫폼 무조건 호환 |

---

## 1. 아키텍처 옵션 분석

### Option A: Minimal Fix — JSON String Quoting (✅ Selected)

| 항목 | 내용 |
|------|------|
| **접근** | hooks.json의 command 문자열 내 경로를 escaped double-quote로 감싸기 |
| **장점** | 단일 파일 변경, 하위 호환 완벽, bash 표준 동작 활용 |
| **단점** | 새 hook 추가 시 패턴 준수 필요 (테스트로 강제) |
| **복잡도** | 낮음 |

### Option B: Wrapper Script

| 항목 | 내용 |
|------|------|
| **접근** | hook command를 wrapper 스크립트 경유로 변경 |
| **장점** | 향후 확장성 |
| **단점** | 과도한 엔지니어링, 성능 오버헤드, 새 의존성 |
| **복잡도** | 중간 |

### Option C: Node.js Direct Execution

| 항목 | 내용 |
|------|------|
| **접근** | bash 대신 node로 직접 실행하는 커스텀 런타임 |
| **장점** | 쉘 이슈 근본 제거 |
| **단점** | Claude Code hook 실행 엔진에 의존, 구현 불가능 |
| **복잡도** | 높음 |

**선택 근거**: Option A가 최소 변경으로 완벽한 해결을 제공. double-quote 내 `${VAR}` 확장은 bash 표준 동작이므로 모든 쉘 환경에서 안전.

---

## 2. 상세 설계

### 2.1 변경 패턴

```
Before: "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/foo.js"
After:  "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/foo.js\""
```

### 2.2 bash 동작 분석

```bash
# Before (unquoted) — path with parentheses causes syntax error:
node /c/Users/홍길동(HongGildong)/.claude/plugins/.../scripts/foo.js
# bash interprets ( as subshell start → syntax error

# After (quoted) — path treated as single string:
node "/c/Users/홍길동(HongGildong)/.claude/plugins/.../scripts/foo.js"
# bash treats entire quoted string as one argument → works correctly
```

### 2.3 특수문자 커버리지

| 문자 | Before | After |
|------|--------|-------|
| `(` `)` | ❌ Subshell syntax | ✅ Quoted |
| 공백 | ❌ Argument split | ✅ Quoted |
| `&` | ❌ Background operator | ✅ Quoted |
| `$` | ⚠️ Variable expansion | ✅ Inside double-quote still expands `${VAR}` |
| `'` | ✅ OK | ✅ OK |
| `!` | ⚠️ History expansion (bash) | ✅ Quoted (no history in non-interactive) |

### 2.4 영향받는 Hook 이벤트 (18개)

1. SessionStart, 2. PreToolUse(Write|Edit), 3. PreToolUse(Bash),
4. PostToolUse(Write), 5. PostToolUse(Bash), 6. PostToolUse(Skill),
7. Stop, 8. StopFailure, 9. UserPromptSubmit, 10. PreCompact,
11. PostCompact, 12. TaskCompleted, 13. SubagentStart, 14. SubagentStop,
15. TeammateIdle, 16. SessionEnd, 17. PostToolUseFailure, 18. InstructionsLoaded,
19. ConfigChange, 20. PermissionRequest, 21. Notification

(총 21개 command entry, 18개 hook event type)

---

## 3. 테스트 전략

### 3.1 Security Test (Cycle 2에서 구현)
- hooks.json 파싱 후 모든 command에 quoted path 패턴 확인
- 새 hook 추가 시 quoting 누락 방지를 위한 regression guard

### 3.2 Regression Test (Cycle 2에서 구현)
- 괄호, 공백, 특수문자 포함 경로 시뮬레이션
- bash -c 실행 시 정상 동작 검증

---

## 4. 버전 업데이트 범위

| 파일 | 변경 내용 |
|------|-----------|
| `hooks/hooks.json` | description v2.0.4, 21개 command quoting |
| `.claude-plugin/plugin.json` | version 2.0.4 |
| `bkit.config.json` | version 2.0.4 |
| `.claude-plugin/marketplace.json` | version 2.0.4 (2곳) |
| `evals/config.json` | version 2.0.4 |
| `servers/bkit-pdca-server/package.json` | version 2.0.4 |
| `servers/bkit-analysis-server/package.json` | version 2.0.4 |
| `lib/audit/audit-logger.js` | BKIT_VERSION 2.0.4 |
| `hooks/session-start.js` | systemMessage 2.0.4 |
| `hooks/startup/session-context.js` | additionalContext 2.0.4 |
| `lib/core/paths.js` | bkitVersion 2.0.4 (2곳) |
| `CHANGELOG.md` | v2.0.4 섹션 추가 |
