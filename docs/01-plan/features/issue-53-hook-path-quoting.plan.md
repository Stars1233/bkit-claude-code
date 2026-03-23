# issue-53-hook-path-quoting 계획서

> **요약**: Windows 사용자명에 괄호 포함 시 hook command bash syntax error 수정
>
> **프로젝트**: bkit-claude-code
> **버전**: 2.0.4
> **작성자**: Claude
> **날짜**: 2026-03-23
> **상태**: Draft
> **이슈**: [GitHub #53](https://github.com/popup-studio-ai/bkit-claude-code/issues/53)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **문제** | `hooks.json`의 모든 hook command에서 `${CLAUDE_PLUGIN_ROOT}` 경로가 따옴표 없이 사용되어, Windows 사용자명에 괄호(`(`, `)`)가 포함되면 bash syntax error 발생 |
| **해결** | hooks.json 내 모든 18개 hook command의 node 스크립트 경로를 double-quote로 감싸기 |
| **기능/UX 효과** | Windows 환경에서 특수문자 포함 경로에서도 bkit이 정상 작동 |
| **핵심 가치** | 크로스 플랫폼 호환성 보장 — "어떤 OS, 어떤 사용자명이든 동작" 원칙 |

---

## 1. 개요

### 1.1 목적

GitHub 이슈 #53에서 보고된 **Windows hook command 실패 버그**를 수정한다. `CLAUDE_PLUGIN_ROOT` 환경변수가 괄호를 포함한 경로로 확장될 때 bash가 이를 subshell 문법으로 해석하여 syntax error가 발생하는 문제를 해결한다.

### 1.2 배경

Claude Code 플러그인 시스템은 hook command를 bash `-c` 옵션으로 실행한다. `hooks.json`의 command 필드 값이 `bash -c "command_string"`의 command_string으로 전달되는데, `${CLAUDE_PLUGIN_ROOT}`이 다음과 같은 경로로 확장될 수 있다:

```
/c/Users/홍길동(HongGildong)/.claude/plugins/cache/bkit-marketplace/bkit/2.0.3/
```

이 경로의 `(`, `)` 문자를 bash가 subshell grouping으로 해석하여 syntax error가 발생한다.

**영향 범위**: hooks.json 내 모든 18개 hook command가 동일한 패턴을 사용하므로, 해당 환경에서는 bkit의 모든 hook이 실패한다.

### 1.3 관련 문서

- 이슈: [GitHub #53 — Hook commands fail on Windows when username contains parentheses](https://github.com/popup-studio-ai/bkit-claude-code/issues/53)

---

## 2. 범위

### 2.1 In Scope

- [x] `hooks/hooks.json`: 모든 18개 hook command의 경로 double-quote 처리
- [x] 경로에 공백, 괄호, 특수문자가 포함된 환경에서의 호환성 보장
- [x] 수정 후 기존 Unix/macOS 환경에서의 동작 유지 확인

### 2.2 Out of Scope

- hook 실행 엔진 자체의 수정 (Claude Code core)
- Windows-specific path separator 변환 (`\` → `/`)
- hook command의 쉘 선택 로직 변경

---

## 3. 기술 설계

### 3.1 변경 사항

**Before** (현재):
```json
"command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/user-prompt-handler.js"
```

**After** (수정):
```json
"command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/user-prompt-handler.js\""
```

### 3.2 영향 분석

| 항목 | 변경 | 영향도 |
|------|------|--------|
| `hooks/hooks.json` | 18개 command 경로 quoting | HIGH - 핵심 수정 |
| 기존 Unix/macOS 환경 | double-quote는 무해 | NONE - 하위 호환 |
| Windows (Git Bash/WSL) | syntax error 해결 | HIGH - 버그 수정 |

### 3.3 위험 요소

- **낮음**: JSON에서의 escaped double-quote (`\"`)가 올바르게 파싱되는지 확인 필요
- **낮음**: bash의 double-quote 내 변수 확장은 정상 동작 (`${VAR}` 형태 유지)

---

## 4. 구현 계획

| 단계 | 작업 | 예상 파일 |
|------|------|-----------|
| 1 | hooks.json 모든 command 경로 quoting | `hooks/hooks.json` |
| 2 | hooks.json 버전 description 업데이트 | `hooks/hooks.json` |
| 3 | 단위 테스트 추가 (Cycle 2) | `test/security/` |
| 4 | 문서 동기화 (Cycle 3) | `docs/` |

---

## 5. Impact Analysis

### 5.1 변경 파일 수: 1
### 5.2 변경 라인 수: ~18 (command 문자열만 변경)
### 5.3 의존성 영향: 없음 (hooks.json은 독립 설정 파일)
### 5.4 하위 호환성: 완전 호환 (double-quote는 모든 bash 환경에서 유효)
