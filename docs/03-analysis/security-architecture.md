# bkit Security Architecture — Defense-in-Depth

> **Version**: 2026-04-21 (v2.1.9, ENH-254)
> **Purpose**: bkit 보안 방어 레이어 아키텍처 공식 문서화
> **관련 ENH**: ENH-254 (P0, S1 + DANGEROUS_PATTERNS 이중 방어선 공식화)
> **관련 CC 버전**: v2.1.113 #23 (dangerouslyDisableSandbox fix), v2.1.116 S1 (rm dangerous-path check)

---

## §1. 레이어 정의

bkit의 보안 아키텍처는 **두 개의 독립된 방어 레이어**로 구성됩니다. 각 레이어는 서로 다른 시점(time)과 표면(surface)에서 작동합니다.

### Layer 1: CC Runtime Sandbox (CC CLI 책임)

**시점**: 실행 시 (command invocation)
**표면**: Bash tool, 파일 시스템 접근, sandbox boundary
**bkit 통제 불가** (CC 내부 동작)

주요 방어:
- **CC v2.1.113 #23** (2026-04-17): `dangerouslyDisableSandbox` 플래그가 설정되어 있어도 **권한 프롬프트 없이 sandbox를 우회할 수 없음**. 이전에는 설정만으로 즉시 해제 가능했으나 fix 이후 매번 명시적 승인 필요.
- **CC v2.1.116 S1** (2026-04-20): Sandbox auto-allow 모드에서 `rm`/`rmdir` 명령이 `/`, `$HOME`, critical system directories를 대상으로 할 경우 **dangerous-path safety check를 건너뛰지 않음**.
- **CC v2.1.113 #14**: macOS `/private/{etc,var,tmp,home}` 디렉터리에 대한 `Bash(rm:*)` allow rule 위험 제거.
- **CC v2.1.113 #15**: Bash deny rule이 `env`/`sudo`/`watch`/`ionice`/`setsid` wrapper를 통과시키지 않도록 매칭 강화.
- **CC v2.1.113 #16**: `Bash(find:*)` allow 하의 `-exec`/`-delete` 서브 옵션 자동 승인 중단.

### Layer 2: bkit Config-Change Hook (bkit 책임)

**시점**: 설정 변경 시 (settings file write)
**표면**: `.claude/settings.json`, `.claude-plugin/plugin.json`, bkit 설정 파일
**bkit 구현**: `scripts/config-change-handler.js`

주요 방어:
- **DANGEROUS_PATTERNS 5 항목 매칭** → SECURITY WARNING audit log 기록
  - `dangerouslyDisableSandbox`
  - `excludedCommands`
  - `autoAllowBashIfSandboxed`
  - `chmod 777`
  - `allowRead`
- **ConfigChange hook event 등록** (`hooks/hooks.json`)
- **사용자 경고 메시지** (debugLog + audit)

---

## §2. 상호 관계

### 공격 벡터별 레이어 방어 매트릭스

| 공격 벡터 | Layer 1 방어 | Layer 2 방어 | 양쪽 모두 필요? |
|----------|------------|------------|------------|
| 실행 중 `rm /`, `rm $HOME` | ✅ v2.1.116 S1 차단 | ❌ (실행 레이어 밖) | Layer 1만 |
| 설정 파일에 `dangerouslyDisableSandbox: true` 저장 | ❌ (파일 쓰기 레이어 밖) | ✅ SECURITY WARNING | Layer 2만 |
| `.claude/settings.json` 권한 약화 (allowRead 추가) | ⚠️ (부분적, 이후 실행 시만) | ✅ 즉시 audit 기록 | 양쪽 협력 |
| `env rm -rf /` wrapper 우회 시도 | ✅ v2.1.113 #15 매칭 강화 | ❌ | Layer 1만 |
| 플러그인 설정 전파로 `autoAllowBashIfSandboxed: true` 유포 | ❌ | ✅ 경고 표시 | Layer 2만 |
| `Bash(rm:*)` allow rule 오남용 | ✅ v2.1.113 #14 + #16 | ⚠️ (설정 변경 시에만) | 양쪽 협력 |
| `find -exec rm` 자동 승인 | ✅ v2.1.113 #16 중단 | ❌ | Layer 1만 |

### 핵심 원칙

**두 레이어는 서로 다른 표면을 방어합니다.**
- **Layer 1 = "실행 시 차단"** (runtime prevention)
- **Layer 2 = "설정 시 감지 및 경고"** (config-time detection)
- 두 레이어 중 하나만으로는 충분하지 않음 → **defense-in-depth (심층 방어)**

### 설계 철학

```
     ┌─────────────────────────────────────────────────┐
     │  공격자 / 실수  ──→  설정 파일 변경  ──→  실행     │
     └──────────────────────┬──────────────┬─────────┘
                            │              │
                            ▼              ▼
                    ┌───────────────┐  ┌──────────────┐
                    │   Layer 2     │  │   Layer 1    │
                    │   bkit config │  │   CC runtime │
                    │   감지 + audit│  │   sandbox    │
                    └───────┬───────┘  └──────┬───────┘
                            │                 │
                            └────사용자 경고────┘
                            └──명령 차단──────┘
```

---

## §3. 사용자 책임

bkit의 defense-in-depth 아키텍처는 **완전한 보안을 보장하지 않습니다**. 사용자는 다음을 반드시 이해해야 합니다:

### 3.1 Layer 1에만 의존 금지

CC 런타임이 아무리 강력해도, 다음 경우 **우회 가능**:
- 프로젝트 시작 전부터 설정이 약화된 상태였을 경우
- 사용자가 권한 프롬프트에 무의식적으로 승인할 경우
- CC 버전 회귀로 Layer 1 방어 일시 무효화 (예: MON-CC-06 네이티브 바이너리 회귀 16건)

### 3.2 Layer 2에만 의존 금지

bkit config-change hook이 아무리 정밀해도, 다음 경우 **발화 불가**:
- 설정 파일 건드리지 않고 명령 직접 실행 (사용자가 직접 `dangerouslyDisableSandbox` 플래그 명령어 전달)
- 설정이 이미 약화된 상태로 세션 시작
- ConfigChange hook event 자체가 firing되지 않는 경우 (CC 버그 또는 설정 오류)

### 3.3 필수 운영 습관

1. **`.claude/settings.json` 변경 시 audit log 확인 필수**
   - `.bkit/audit/*.jsonl` 에서 `config_changed` 이벤트 조회
2. **DANGEROUS_PATTERNS 5 항목을 의도적으로 사용할 경우**, bkit 경고를 이해한 뒤 진행
3. **CC 업그레이드 시 changelog 확인** — Layer 1 방어 강화/약화 여부 파악
4. **프로젝트 공유 전 `.claude/` 디렉토리 검토** — 민감 설정이 남아있지 않도록

---

## §4. 이력

| 일자 | 변경 | 관련 이슈/커밋 |
|------|------|---------|
| 2026-04-17 | CC v2.1.113 Layer 1 강화: #23 `dangerouslyDisableSandbox` bypass fix, #14 `/private/*` rm 위험 제거, #15 wrapper 감지 강화, #16 `find -exec` 자동 승인 중단 | v2.1.113 CHANGELOG |
| 2026-04-18 | CC v2.1.114 Agent teams permission dialog crash fix (CTO Team 자동 수혜) | v2.1.114 CHANGELOG |
| 2026-04-20 | CC v2.1.116 Layer 1 추가 강화: S1 `rm`/`rmdir` dangerous-path safety check | v2.1.116 CHANGELOG |
| 2026-04-21 | bkit **ENH-254** defense-in-depth 공식 문서화 (본 문서 신설) | bkit v2.1.9 |

---

## §5. 관련 코드

### 5.1 Layer 2 구현 위치

| 파일 | 라인 | 역할 |
|------|------|------|
| `scripts/config-change-handler.js` | 17-29 | `DANGEROUS_PATTERNS` 정의 + 주석 (ENH-254 보강) |
| `scripts/config-change-handler.js` | 58-95 | 패턴 매칭 + SECURITY WARNING audit 기록 |
| `lib/audit/audit-logger.js` | — | SECURITY WARNING audit JSONL 저장 |
| `hooks/hooks.json` | — | ConfigChange hook event 등록 (matcher: `project_settings|skills`) |

### 5.2 Layer 1 (CC 내부) 관련

- CC v2.1.113 CHANGELOG (#23, #14, #15, #16)
- CC v2.1.116 CHANGELOG (S1)
- `.claude/settings.json` sandbox 설정: `sandbox.allowedCommands`, `sandbox.deniedDomains` (v2.1.113 신설)

---

## §6. 관련 문서

- **CC v2.1.116 Impact Report**: `docs/04-report/features/cc-v2114-v2116-impact-analysis.report.md`
- **CC v2.1.113/114 Impact Report**: `docs/04-report/features/cc-v2112-v2114-impact-analysis.report.md`
- **bkit v2.1.9 Plan**: `docs/01-plan/features/cc-v2114-v2116-impact-analysis.plan.md`
- **bkit v2.1.9 Design**: `docs/02-design/features/cc-v2114-v2116-impact-analysis.design.md`
- **AI Agent Security Audit 2026**: `docs/ai-agent-security-audit-2026.report.md`
