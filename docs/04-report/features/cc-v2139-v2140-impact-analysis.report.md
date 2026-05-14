# CC v2.1.139 → v2.1.140 영향 분석 및 bkit 대응 보고서 (ADR 0003 아홉 번째 정식 적용)

> **Status**: ✅ Final (실증 기반, ADR 0003 아홉 번째 정식 적용)
>
> **Project**: bkit (bkit-claude-code)
> **bkit Version**: v2.1.12 (current GA, 2026-04-29 release tag)
> **Author**: kay kim (POPUP STUDIO PTE. LTD.) + cc-version-researcher + bkit-impact-analyst
> **Date**: 2026-05-13
> **PDCA Cycle**: cc-version-analysis (v2.1.140, **single-version increment** — ADR 0003 1/2/3/4/5/6/7/8/9-version increment + R-2 skip + dist-tag 분기/통합 모든 scenario robust 작동 입증)
> **CC Range**: v2.1.139 (baseline, 94 consecutive PASS, 2026-05-12) → **v2.1.140** (release 2026-05-12 21:09 UTC, **13 bullets** — Improvement 3 + Fix 10, Feature 0, Internal 0)
> **Verdict**: **크리티컬 회귀 0건 / Breaking 0건 / 자동수혜 MEDIUM 3건 (I3-140 무해, B2-140 ConfigChange dedup 자동수혜 신규, B8-140 Windows where.exe stall) + 간접 1건 (B9-140 Read offset) / 신규 ENH 후보 4건 (ENH-305 DROP / ENH-306 P3 deferred / ENH-307 → invariant 10 신설 / ENH-308 baseline 확인) / 5/13 review 의사결정 3건 모두 결정 (ENH-289 P0→P1 강등 / MON-CC-NEW-PLUGIN-HOOK-DROP P2→P1 격상 / ENH-303 P2→P1 격상 — bkit 차별화 #5 정식 편입) / R-3 evolved 11건 (+0 본 사이클) / 95 연속 호환**

---

## 1. Executive Summary

### 1.1 최종 판정

| 항목 | 값 |
|------|----|
| 크리티컬 회귀 건수 | **0건** (bkit v2.1.12 무수정 작동, ADR 0003 9/9 PASS — 사용자 환경 직접 실행) |
| Breaking Changes | **0건** (확정) |
| 자동수혜 (CONFIRMED) HIGH | **0건** (v2.1.140 13 bullets 전수 분석 결과 HIGH severity 0건) |
| 자동수혜 (CONFIRMED) MEDIUM | **3건** — **B2-140** (Symlinked settings hot-reload misattributed + spurious ConfigChange dedup 자동수혜 — bkit ConfigChange 구독 surface 신규 식별), **B8-140** (Windows `where.exe` event-loop stall fix — `scripts/release-plugin-tag.sh` 4 lines `gh` 호출 자동수혜), I3-140 (Plugin component folder collision warning — bkit `plugin.json` key 미명시 + default folder convention 사용으로 **collision 무발생 확정**, 무해) |
| 자동수혜 (CONFIRMED) LOW | **1건** — B9-140 (Read tool `offset` whitespace/+prefix normalization — agent 간접 자동수혜) |
| 정밀 검증 (무영향 확정) | **9건** — I1/I2-140 cosmetic, B1/B3/B4/B5/B6/B7/B10-140 (bkit 미사용 surface) |
| **신규 ENH 후보** | **4건** — ENH-305 (Plugin folder collision CI) **DROP** (bkit 무해), ENH-306 (Windows `gh` stall defense) **P3 deferred** (release script 4 lines 한정 자동수혜), ENH-307 (Hook terminal access regression defense) → **ADR 0003 invariant 10번째로 편입** (정식 ENH 아님), ENH-308 (ConfigChange spurious event dedup) **baseline 확인** (B2-140 자동수혜로 정식 ENH 불필요) |
| **신규 모니터** | **0건** 신규, 기존 7건 progress only |
| **기존 ENH 강화** | **5건** — ENH-292 P0 (#56293 **10-streak 결정적 강화 + bkit 차별화 #3 product moat 결정적**) / ENH-291 P2 (#56448 **9-streak**, multi-line concat methodology 측정으로 **14/44 skills > 250자** 발견 → 측정 매트릭스 격상) / ENH-281 OTEL 10 누적 (변동 0, v2.1.140 OTEL bullet 0건) / ENH-290 (stable v2.1.126 → **v2.1.128** 승격 → drift +12, bkit 권장 v2.1.123 ↔ stable **drift +5 악화**) / ENH-300 (effort-aware adaptive defense, baseline 4-cycle 유지) |
| **5/13 review 의사결정 3건 (본 cycle 결정)** | (1) **ENH-289 P0 → P1 강등 확정** (R-3 numbered #145 정체 +0 in 14d / evolved 본 cycle +0 / 추세 ~0/day 결정적 감소), (2) **MON-CC-NEW-PLUGIN-HOOK-DROP P2 → P1 격상 확정** (#57317 4-streak + #58405 needs-repro 보강), (3) **ENH-303 P2 → P1 격상 확정** (bkit 차별화 #5 정식 편입 — #57317 4-streak + #58441 exec-form regression + #58419 Warp regression 결합 → `continueOnBlock` deny reason moat) |
| **bkit 차별화 누적** | **4 → 5건** (ENH-303 정식 편입). ENH-286 / ENH-289 (P0→P1 강등) / ENH-292 (10-streak 결정적) / ENH-300 / **ENH-303 신규** |
| **DROP ENH** | **1건** (ENH-305 — bkit plugin.json key 미명시로 I3-140 영향 0건 확정) |
| **R-3 시리즈 monitor** | numbered violation #145 (issue #54178) 정체 (+0 in 14d) / dup-closure 5건 (5/1 closed) 유지 / **evolved form 누적 11건 (+0 본 사이클)** / 추세 **~0/day** (결정적 감소). **ENH-289 P0 → P1 강등 확정** |
| **메모리 정정** | **3건** — (1) OTEL surface 표현: 이전 "4 위치" → 정확히는 **4 unique env vars × 7 code positions × 13 lines** (OTEL_ENDPOINT/SERVICE_NAME/REDACT/LOG_USER_PROMPTS), (2) CLAUDE_PROJECT_DIR file 사용: 이전 "18 files" → 실제 **11 files** in lib/scripts/hooks, (3) "numbered #145" 표현 → 정확히는 **R-3 violation 카운트 #145** (issue #54178이 트래킹, issue 번호 #145 아님) |
| bkit v2.1.12 hotfix 필요성 | **불필요** (현재 main GA 안정, 94 → 95 연속 호환 확장 입증) |
| **연속 호환 릴리스** | **95** (v2.1.34 → v2.1.140, 94 → 95, +1 — v2.1.140 정상 추가, v2.1.134/135 R-2 skip 미포함) |
| ADR 0003 적용 | **YES (아홉 번째 정식 적용 — 9-사이클 일관성 입증)** |
| **권장 CC 버전** | **v2.1.123 (보수적, npm stable v2.1.128과 drift +5 악화)** 또는 **v2.1.140 (균형, 신규 추가)** — B2/B8-140 MEDIUM 자동수혜 + 95-cycle 검증. **v2.1.128 (= 현 npm stable) 비권장 유지** (#56293 10-streak 캐싱 회귀 직접 surface). 사용자 명시 승인 후 보류 패턴 유지 |

### 1.2 성과 요약

```
┌──────────────────────────────────────────────────────┐
│  v2.1.139 → v2.1.140 영향 분석 (ADR 0003 아홉 번째)   │
├──────────────────────────────────────────────────────┤
│  📊 CC 변경 수집: 13 bullets (Single increment)        │
│      v2.1.140: 3 Improvements + 10 Fixes (F/I 0)       │
│  🔴 실증된 크리티컬 회귀: 0건 (bkit 환경)              │
│  🟢 CONFIRMED auto-benefit HIGH: 0건                   │
│  🟡 CONFIRMED auto-benefit MEDIUM: 3건                 │
│      • B2-140 Symlinked settings ConfigChange dedup    │
│        → bkit ConfigChange 구독 surface 자동수혜 (신규)│
│      • B8-140 Windows where.exe stall fix              │
│        → scripts/release-plugin-tag.sh 4 lines 자동수혜│
│      • I3-140 Plugin folder collision warning (무해)   │
│        → bkit key 미명시로 collision 무발생            │
│  🟢 정밀 검증 (무영향 확정): 9건                       │
│  🆕 신규 ENH 후보: 4건                                 │
│      • ENH-305 → DROP (bkit 무해)                      │
│      • ENH-306 P3 deferred (release script 한정)       │
│      • ENH-307 → ADR 0003 invariant 10 신설            │
│      • ENH-308 → B2-140 자동수혜로 baseline 확정       │
│  🔁 기존 ENH 강화: 5건                                 │
│      • ENH-292 P0 #56293 10-streak (bkit moat 결정적)  │
│      • ENH-291 P2 #56448 9-streak + 측정 매트릭스      │
│        14/44 skills > 250자 (multi-line concat)        │
│      • ENH-281 OTEL 10 유지 (v140 bullet 0)            │
│      • ENH-290 stable 126→128 승격, drift +12          │
│      • ENH-300 effort-aware 4-cycle baseline 유지      │
│  🎯 5/13 review 의사결정 3/3 결정:                     │
│      ① ENH-289 P0 → P1 강등 확정                       │
│      ② MON-CC-NEW-PLUGIN-HOOK-DROP P2 → P1 격상 확정   │
│      ③ ENH-303 P2 → P1 격상 확정 (차별화 #5 정식 편입) │
│  ❌ Breaking Changes: 0 (확정)                         │
│  ✅ 연속 호환: 94 → 95 릴리스 (v2.1.34~v2.1.140)       │
│  ✅ F9-120 closure 9 릴리스 연속 PASS 갱신             │
│      (claude plugin validate Exit 0,                   │
│       v2.1.120/121/123/129/132/133/137/139/140)        │
│  ⚙️ npm dist-tag: stable 126 → 128 (+2 승격, drift +12)│
│      bkit 권장 v2.1.123 ↔ stable 128 drift +5 (악화)   │
│      latest=next=140 통합 유지 (2-cycle 통합 지속)     │
│  ⚙️ R-1/R-2 패턴 신규 0건 (v140 정상)                  │
│      18-릴리스 윈도우 9건/9 versions/50% 변동 없음     │
│  ⚙️ R-3 evolved 11건 (+0 본 사이클), 추세 ~0/day       │
│  📚 bkit 차별화 누적: 4 → 5건 (ENH-303 정식 편입)      │
└──────────────────────────────────────────────────────┘
```

---

## 2. ADR 0003 아홉 번째 정식 적용 — Phase 1.5 게이트 결과

본 사이클은 single-version increment scenario이며, ADR 0003 매트릭스를 9/9 직접 실행 검증으로 갱신했습니다. 신규 surface (B2-140 ConfigChange, B8-140 Windows `gh`, I3-140 plugin folder collision) 추가 검증 3건을 포함한 **12/12 항목 PASS**.

```bash
# Test #1: claude --version
$ claude --version
2.1.140 (Claude Code)
# → latest 채널 활성화 + bkit v2.1.12 무수정 작동 입증

# Test #2: claude plugin validate .
$ claude plugin validate .
Validating marketplace manifest: ...marketplace.json
✔ Validation passed
exit=0
# → F9-120 closure 9 릴리스 연속 PASS 갱신
#   (v2.1.120/121/123/129/132/133/137/139/140)

# Test #3: hooks.json events/blocks
top-level keys: 3
events: 21
blocks: 24
# → 메모리 수치 일치 (9 cycle invariant)

# Test #4: updatedToolOutput grep
$ grep -rn 'updatedToolOutput' lib/ scripts/ hooks/ | wc -l
0
# → #54196 무영향 invariant 10 cycle 유지

# Test #5: OTEL surface (메모리 정정)
$ grep -n 'OTEL_' lib/infra/telemetry.js
11, 12, 13 (docstring) / 109, 114, 115 (comment) / 126, 137, 149, 183, 188, 205, 282 (code)
$ grep -oE 'OTEL_[A-Z_]+' lib/infra/telemetry.js | sort -u
OTEL_ENDPOINT / OTEL_LOG_USER_PROMPTS / OTEL_REDACT / OTEL_SERVICE_NAME
# → 4 unique env vars × 7 code positions × 13 lines
#   (이전 메모리 "4 위치" 표현 → "4 unique vars / 7 code positions" 정정)

# Test #6: F1-132 SESSION_ID
$ grep -rn 'CLAUDE_CODE_SESSION_ID' lib/ scripts/ hooks/ | wc -l
0
# → 5-cycle DROP 유지

# Test #7: F2-132 ALTERNATE_SCREEN
$ grep -rn 'CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN' lib/ scripts/ hooks/ | wc -l
0
# → 5-cycle 무영향 유지

# Test #8: F4-133 effort.level (ENH-300)
$ grep -rn 'effort.level\|CLAUDE_EFFORT\|effortLevel' lib/ scripts/ hooks/ | wc -l
0
# → 4-cycle baseline (ENH-300 P2 deferred) 유지

# Test #9: F1/F2-136 FEEDBACK_SURVEY/autoMode
$ grep -rn 'FEEDBACK_SURVEY\|hard_deny' lib/ scripts/ hooks/ | wc -l
0
# → 3-cycle baseline 유지

# === 본 cycle 신규 검증 항목 10-12 (B2/B8/I3-140 surface) ===

# Test #10 (신규): B8-140 Windows where.exe stall — bkit gh 호출 surface
$ grep -rEn "(^|[^a-zA-Z])(gh )|exec.*['\"]gh['\"]|spawn.*['\"]gh['\"]" scripts/ lib/ hooks/
scripts/release-plugin-tag.sh:112  command -v gh
scripts/release-plugin-tag.sh:124  gh release create
scripts/release-plugin-tag.sh:125  echo gh release create failed
scripts/release-plugin-tag.sh:138  echo gh release view
# → 4 lines, release script 한정 (Windows 메인테이너 환경 자동수혜)
#   ENH-306 P3 deferred — bkit core flow 영향 0건

# Test #11 (신규): I3-140 Plugin folder collision — bkit plugin.json keys
$ cat .claude-plugin/plugin.json | jq 'keys'
["name", "version", "displayName", "description", "author",
 "repository", "license", "keywords", "outputStyles"]
# → commands/agents/skills/hooks key 모두 미명시 (default folder convention)
$ ls commands/ agents/ skills/ hooks/
commands/ 3, agents/ 34, skills/ 44, hooks/ 3
# → collision 무발생 확정 (key 명시 없음으로 default folder가 정상 인식)
#   ENH-305 DROP — bkit 무해

# Test #12 (신규): B2-140 ConfigChange spurious event — bkit 구독 surface
$ python3 -c "import json; d=json.load(open('hooks/hooks.json')); \
              print('ConfigChange' in d.get('hooks', {}))"
True
$ cat hooks/hooks.json | jq '.hooks.ConfigChange'
[{
  "matcher": "project_settings|skills",
  "hooks": [{
    "type": "command",
    "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/config-change-handler.js\"",
    "timeout": 3000
  }]
}]
# → bkit ConfigChange 1 block (matcher: project_settings|skills) 이미 구독 중
#   B2-140 symlinked settings spurious event dedup 자동수혜 즉시 확정
#   ENH-308 baseline 확정 (자동수혜로 정식 ENH 불필요)

# === 본 cycle 신규 invariant 항목 13 (B3-139 + #58419 over-broad fix) ===

# Test #13 (신규 invariant): hooks /dev/tty + OSC escape baseline
$ grep -rn '/dev/tty\|\\033\]' hooks/ scripts/ lib/ | wc -l
0
# → bkit hooks terminal access 미사용 invariant 신규 추가
#   #58419 Warp plugin breakage 환경에서도 회귀 0건 보장
#   ENH-307 → ADR 0003 invariant 10번째로 편입 (정식 ENH 아님)
```

**ADR 0003 매트릭스 갱신**: 9개 기존 항목 (#1~#9) + 4개 신규 항목 (#10~#13, v2.1.140 cycle 추가) = **13/13 PASS**. 9-cycle 일관성 입증.

---

## 3. v2.1.140 변경사항 전수표 (13 bullets)

| ID | Category | Severity | bkit | Surface | 한줄 요약 |
|---|---|:---:|:---:|---|---|
| I1-140 | I | LOW | NO | agents/ subagent_type | Agent tool `subagent_type` case/separator-insensitive 매칭 (Task tool 미사용) |
| I2-140 | I | LOW | NO | agents/ color | Agent color palette (cosmetic) |
| **I3-140** | **I** | **MEDIUM** | **자동수혜 (무해)** | `.claude-plugin/plugin.json` | Plugin default folder collision warning — bkit key 미명시로 영향 0건 |
| B1-140 | B | LOW | NO | `/goal` + disableAllHooks | `/goal` 명시 메시지 (bkit `/goal` 미사용) |
| **B2-140** | **B** | **MEDIUM** | **자동수혜 신규** | settings.json hot-reload + ConfigChange | Symlinked settings misattributed event + spurious ConfigChange dedup — bkit 구독 surface 자동수혜 |
| B3-140 | B | LOW | NO | `claude --bg` | Background service connection drop fix |
| B4-140 | B | LOW | NO | Enterprise endpoint security | Background service startup fix |
| B5-140 | B | LOW | NO | Remote managed settings | 401 force-refresh retry (bkit 미사용) |
| B6-140 | B | LOW | NO | known_marketplaces.json | Auto-update policy persist fix |
| B7-140 | B | LOW | NO | `/loop` | Redundant wakeup 제거 (bkit `/loop` 미사용) |
| **B8-140** | **B** | **MEDIUM** | **자동수혜 (release script 한정)** | Windows `where.exe` + `gh` | Event-loop stall fix — `scripts/release-plugin-tag.sh` 4 lines 자동수혜 |
| **B9-140** | **B** | **LOW** | **자동수혜 (간접)** | Read tool `offset` | Whitespace/+prefix normalization — agent 간접 자동수혜 |
| B10-140 | B | LOW | NO | Native terminal cursor | Cursor focus fix |

**Severity 분포**: HIGH 0건 / MEDIUM 3건 / LOW 10건
**bkit Relevance 분포**: 자동수혜 4건 (B2/B8/B9-140 + I3-140 무해) / NO 9건

---

## 4. 사전인지 결함 (본 사이클) — 신규 ENH 후보 4건 평가

### 4.1 ENH-305 (Plugin component folder collision CI) — **DROP 확정**

| 항목 | 내용 |
|------|------|
| **Trigger** | I3-140 (Plugin default folder collision 시 `/doctor` 경고) |
| **YAGNI Review** | **FAIL** — bkit `.claude-plugin/plugin.json` keys = `['name', 'version', 'displayName', 'description', 'author', 'repository', 'license', 'keywords', 'outputStyles']`. commands/agents/skills/hooks **key 모두 미명시** → default folder convention 사용 → collision 발생 불가 |
| **Cost vs Benefit** | Cost > 0 (CI gate 추가), Benefit = 0 (bkit 무해) |
| **결정** | **DROP** (bkit 적용 surface 부재) |

### 4.2 ENH-306 (Windows `gh` stall defense) — **P3 deferred**

| 항목 | 내용 |
|------|------|
| **Trigger** | B8-140 (Windows event-loop where.exe stall — bkit `gh` 호출 사이트 audit) |
| **bkit Exposure** | `scripts/release-plugin-tag.sh` line 112/124/125/138 (4 lines, release script 한정) |
| **YAGNI Review** | release script는 메인테이너 환경 (macOS) 전용. 일반 사용자 Windows 영향 0건. B8-140 자동수혜로 메인테이너가 Windows 환경에서 실행 시 자동 fix |
| **결정** | **P3 deferred** (defensive audit document만, 코드 변경 불필요) |
| **권고** | v2.1.13 Sprint Doc 챕터에 "Windows 메인테이너 환경 자동수혜 (B8-140)" 메모 추가 |

### 4.3 ENH-307 (Hook terminal access regression defense) — **ADR 0003 invariant 10 신설**

| 항목 | 내용 |
|------|------|
| **Trigger** | B3-139 (v2.1.139 hooks no-terminal-access over-broad fix) + #58419 (v2.1.140 OPEN, Warp plugin breakage, "Last Working Version: 2.1.138") |
| **bkit Exposure** | `/dev/tty` + OSC escape sequence grep in hooks/scripts/lib = **0건** |
| **YAGNI Review** | 정식 ENH 정의 불필요 — bkit는 이미 회귀 0 invariant 충족. defense는 미래 회귀 감지 목적 |
| **결정** | **ADR 0003 invariant 10번째로 편입** (정식 ENH 아님, 항상 0 grep 검증) |
| **편입 효과** | 차후 cycle에서도 hooks terminal access invariant 자동 검증 — #58419 evolved form 환경 대비 |

### 4.4 ENH-308 (ConfigChange spurious event dedup) — **B2-140 자동수혜로 baseline 확정**

| 항목 | 내용 |
|------|------|
| **Trigger** | B2-140 (Symlinked settings hot-reload misattributed + spurious ConfigChange dedup) |
| **bkit Exposure** | `hooks/hooks.json` ConfigChange 1 block 이미 구독 중 (matcher: `project_settings|skills`, handler: `config-change-handler.js`) |
| **YAGNI Review** | bkit는 이미 ConfigChange를 구독하고 있으므로 B2-140 dedup fix가 자동 적용됨. 정식 ENH 정의 시 cost > benefit |
| **결정** | **baseline 확정** (B2-140 자동수혜로 정식 ENH 불필요) |
| **메모리 추가** | "bkit ConfigChange 구독 surface 식별" — 본 cycle 신규 발견 (이전 메모리 미언급) |

---

## 5. 기존 ENH 강화 5건

| ENH | 직전 cycle 상태 | 본 cycle 변동 | 결정적 데이터 |
|---|---|---|---|
| **ENH-292 P0** Sub-agent caching 10x | 9-streak (가속 정당성 결정적) | **10-streak** | "Anthropic 자체 해결 의지 부재" **10-cycle 무해소** (v2.1.128~v2.1.140). v2.1.140 13 bullets 전수 grep — caching/sub-agent/cache_creation 0건. **bkit 차별화 #3 product moat 결정적 강화** — Sprint Coordination 가속 단독 P0 우선순위 결정적 |
| **ENH-291 P2** Skill validator | 8-streak (P2 유지) | **9-streak + 측정 매트릭스 격상** | (1) v2.1.140 #56448 fix bullet 0건 (9-cycle), (2) **multi-line concat methodology 측정**: sprint 852 / enterprise 469 / rollback 418 / development-pipeline 412 / audit 374 / pdca 357 / qa-phase 356 / pdca-batch 354 / pm-discovery 346 / control 332 → **14/44 skills > 250자** (이전 메모리 4 → 14, 3.5x). measurement methodology TBD 유지 |
| **ENH-281 OTEL** | 10 누적 | 변동 0 | v2.1.140 OTEL bullet 0건. **메모리 정정**: OTEL_ surface = 4 unique env vars × 7 code positions × 13 lines (이전 "4 위치" 표현 정정) |
| **ENH-289 P0** Defense Layer 6 (R-3) | P0, 강등 검토 5/13 | **P1 강등 확정** | R-3 numbered violation #145 (issue #54178) 정체 **+0 in 14d** / evolved 본 cycle 신규 0건 / 추세 ~0/day 결정적 감소. **5/13 review 의사결정 #1 확정**: P0 → P1 강등. 단 #57317 + ENH-303 격상으로 MON-CC-NEW-PLUGIN-HOOK-DROP P1 영역 흡수 가능 |
| **ENH-290 P3** dist-tag 3-Bucket | drift +13 | **stable v2.1.126 → v2.1.128 (+2 승격), drift +13 → +12** | bkit 권장 v2.1.123 ↔ stable v2.1.128 **drift +3 → +5 (악화)**. **단 stable v2.1.128 = #56293 caching 10x 도입 버전** — 사용자가 stable로 업데이트 시 caching 회귀 직접 노출. 사용자 안내 필요. latest=next=v2.1.140 통합 유지 (2-cycle 통합 지속). 18-window R-1/R-2 누적 9건/9 versions/50% 변동 없음 |
| **ENH-300 P2** Effort-aware adaptive defense | baseline 3-cycle | **baseline 4-cycle 유지** | F4-133 effort surface 미활용 4-cycle. bkit 차별화 #4 잠재 가치 유지 |
| **ENH-286 P1** Memory Enforcer | #57485 4-cycle 유지 | 변동 0 | v2.1.140에서 advisory 추가 데이터 없음. bkit 차별화 #1 보존 |

---

## 6. 5/13 review 의사결정 3건 — 본 cycle 확정

직전 cycle (v2.1.139)에서 본 cycle (5/13)로 이월된 의사결정 3건 모두 본 보고서에서 결정. 데이터 우세 방향으로 모두 확정.

### 6.1 의사결정 #1: ENH-289 P0 → P1 강등 — **확정**

| 항목 | 데이터 |
|------|--------|
| R-3 numbered violation #145 (issue #54178) | 정체 **+0 in 14d** (4/29 ~ 5/13 누적) |
| Dup-closure 5건 (#54178/54129/54123/54058/53816) | 모두 5/1 closed 유지, 변동 0 |
| Evolved-form 본 cycle 신규 | **0건** (#57661 5/9 OPEN은 이전 cycle 경계) |
| 추세 (1주 단위) | 1.4/day → 0.5/day → 0.2/day → ~0/day → 0.1/day → **~0/day (결정적 감소)** |
| **결정** | **P0 → P1 강등 확정** |
| 비고 | bkit Defense Layer 6 자체는 product moat로 유지 (장기 신뢰성). 단 P0 가속 우선순위 불필요 |

### 6.2 의사결정 #2: MON-CC-NEW-PLUGIN-HOOK-DROP P2 → P1 격상 — **확정**

| 항목 | 데이터 |
|------|--------|
| #57317 (plugin PostToolUse silent drop) | 3-streak (v2.1.137~v2.1.139) → **4-streak (v2.1.140 본 cycle 누적)** |
| #58405 (PreToolUse hook not working, needs-repro) | **신규 OPEN 5/12** — MON-CC-NEW와 도메인 결합 보강 |
| bkit Direct Surface | hooks/hooks.json PostToolUse **3 blocks** (Write `unified-write-post.js` + Bash `unified-bash-post.js` + Skill `skill-post.js`) |
| **결정** | **P2 → P1 격상 확정** |
| 비고 | 정식 ENH 신설 검토 (Sprint Defense 신규 PR 후보) — ENH-289 P1 강등과 통합 시너지 |

### 6.3 의사결정 #3: ENH-303 P2 → P1 격상 + 차별화 #5 정식 편입 — **확정**

| 항목 | 데이터 |
|------|--------|
| #57317 (plugin PostToolUse drop) | 4-streak (MON-CC-NEW와 결합) |
| #58441 (v2.1.139 exec-form regression) | `/doctor` validator regression — F6-139 surface |
| #58419 (v2.1.140 Warp plugin breakage) | B3-139 over-broad fix 데이터 — terminal access regression |
| bkit Direct Surface | hooks.json `continueOnBlock` 활용 **0건 baseline** (활용 시 deny reason moat) |
| **결정** | **P2 → P1 격상 확정 + bkit 차별화 #5 정식 편입** |
| 비고 | `continueOnBlock` 활용 시: CC native silent drop 위험 회피 + bkit 명시적 deny reason → 사용자 신뢰성 격상. v2.1.13 Sprint Defense (ENH-289 격하 + MON-CC-NEW 격상 + ENH-303 격상) 통합 단일 PR 후보 |

---

## 7. R-3 시리즈 monitor 갱신 (2주 review 5/13 본 cycle 결정)

본 cycle은 직전 cycle에서 예약된 **5/13 review 일자** — 위 §6.1 ENH-289 강등 결정으로 R-3 시리즈 monitor 우선순위 격하.

| 항목 | 5/12 시점 | 5/13 시점 (본 cycle) | Delta | 결정 |
|------|----------|---------------------|-------|------|
| Numbered violation #145 (issue #54178) | 정체 +0 in 13d | **정체 +0 in 14d** | 0 | ENH-289 P0 → P1 강등 확정 |
| Numbered violation #140 (#54129) | Closed (5/1) | Closed 유지 | 0 | — |
| Numbered violation #135 (#54123) | Closed (5/1) | Closed 유지 | 0 | — |
| Numbered violation #130 (#54085) | Open (4/27 stale) | Open 유지 | 0 | — |
| Numbered violation #105 (#54041) | Open | Open 유지 | 0 | — |
| Numbered violation #45 (#48948) | Open (4/16 stale) | Open 유지 | 0 | — |
| Numbered violation #5 (#53697) | Open (4/27) | Open 유지 | 0 | — |
| Dup-closure 5건 (5/1 closed) | 5 | 5 | 0 | — |
| **Evolved form 누적** | 11건 | **11건 (+0 본 cycle)** | 0 | 추세 결정적 감소 |
| **신규 evolved form 5/12-5/13** | — | **0건** (search "safety hooks" 결과 violation 키워드 0건) | 0 | 결정적 감소 |
| 추세 | ~0/day → 0.1/day | **~0/day (감소 지속)** | -0.1/day | 4-cycle 누적 감소 |

**메모리 정정 (중요)**: 이전 메모리의 *"numbered #145"*는 issue 번호 #145가 아니라 **R-3 violation 카운트 #145** (issue #54178이 트래킹). 실제 issue #145는 무관한 2025-02 인증 버그. 차후 cycle 메모리는 "violation #145 (issue #54178)" 형식으로 정확화.

---

## 8. Long-standing Issue 상태 (5건, 모두 streak +1)

| Issue | 직전 streak (5/12) | v2.1.140 fix? | 본 cycle streak | bkit defense / 영향 |
|-------|:------------------:|:-------------:|:---------------:|--------------------|
| **#56293** sub-agent caching 10x | 9-streak | **NO** (13 bullets grep 0건) | **10-streak** | **ENH-292 P0 결정적 강화 — bkit 차별화 #3 product moat 결정적** (10-cycle 무해소 + stable v2.1.128 승격으로 사용자 직접 노출 위험 +1) |
| #56448 skill validator | 8-streak | **NO** | **9-streak** | ENH-291 P2 유지. **multi-line concat methodology 측정**: 14/44 skills > 250자 (3.5x 증가) — measurement methodology TBD |
| #47855 Opus 1M /compact block | 27-streak | **NO** | **28-streak** | MON-CC-02 defense 유지 (`scripts/context-compaction.js:44-56`) |
| #47482 output styles frontmatter | 30-streak | **NO** | **31-streak** | ENH-214 defense 유지 (`scripts/user-prompt-handler.js`) |
| **#57317** plugin PostToolUse silent drop | 3-streak | **NO** | **4-streak** | MON-CC-NEW-PLUGIN-HOOK-DROP **P2 → P1 격상 확정** (§6.2) + ENH-303 격상 (§6.3) |

**신규 보강 데이터 (#57317 도메인)**:
- **#58405** (2026-05-12 OPEN, needs-repro): "PreToolUseHook not working" — MON-CC-NEW와 도메인 결합
- **#58419** (2026-05-12 OPEN): Warp plugin terminal access 차단 — B3-139 over-broad fix regression
- **#58441** (2026-05-12 OPEN): v2.1.139 exec-form schema validator `/doctor` regression — F6-139 surface

---

## 9. bkit 차별화 누적 (4 → 5건, ENH-303 정식 편입)

| # | ENH | 카테고리 | 본 cycle 변동 |
|---|-----|----------|-------------|
| 1 | **ENH-286** Memory Enforcer (PreToolUse deny-list, vs CC advisory) | 차별화 #1 | 변동 0 (#57485 4-cycle 유지) |
| 2 | **ENH-289** Defense Layer 6 (post-hoc audit + alarm + auto-rollback, vs R-3 시리즈) | 차별화 #2 | **P0 → P1 강등** (§6.1) — defense 자체는 moat 유지 |
| 3 | **ENH-292** Sequential Dispatch (vs CC native 평행 spawn caching 회귀) | 차별화 #3 | **10-streak 결정적 강화** (§5) — product moat 결정적 |
| 4 | **ENH-300** Effort-aware Adaptive Defense (vs CC effort surface only) | 차별화 #4 | baseline 4-cycle 유지 |
| **5** | **ENH-303** PostToolUse `continueOnBlock` Deny Reason Moat (vs CC native silent drop) | **차별화 #5 정식 편입** (§6.3) | **P2 → P1 격상 확정 — bkit 차별화 #5 정식 편입** |

**ENH-303 차별화 #5 정식 편입 정당화** (§6.3 데이터 종합):
- CC native `continueOnBlock` 활용 시 silent drop 위험 (#57317 4-streak) + over-broad fix regression (#58419) + exec-form regression (#58441)
- bkit가 `continueOnBlock` + 명시적 deny reason 활용 시: 사용자 신뢰성 + audit trace 가능 + Defense Layer 5 (memory enforcer) 결합 시너지
- v2.1.13 Sprint Defense 통합 PR 후보 — ENH-289 P0 강등 + MON-CC-NEW P2 격상 + ENH-303 P2 격상 단일 사이클

---

## 10. R-1/R-2 패턴 추적 (ENH-290 framework data)

| 항목 | 직전 cycle | 본 cycle (5/13) | 변동 |
|------|----------|-----------------|------|
| v2.1.140 정상 게시 | — | **YES** (releases API + npm 정상, 2026-05-12 21:09 UTC, commit `6b070c31`) | R-1 추가 0건 |
| v2.1.139 → v2.1.140 gap | — | **0 (연속)** | R-2 추가 0건 |
| 18-릴리스 윈도우 R-1 누적 | 6건 | 6건 (변동 0) | — |
| 18-릴리스 윈도우 R-2 누적 | 2 occurrences / 3 versions | 변동 0 | — |
| R-1 + R-2 누적 비율 | 9건/9 versions / 50% | 변동 0 | — |
| **stable** | v2.1.126 | **v2.1.128** | **+2 승격** |
| **latest** | v2.1.139 | **v2.1.140** | +1 순차 |
| **next** | v2.1.139 | **v2.1.140** | +1 순차 (2-cycle 통합 유지) |
| **drift (stable vs latest)** | +13 | **+12** | -1 감소 |
| **drift (stable vs bkit 권장 v2.1.123)** | +3 | **+5** | **+2 악화** |

**중요 경고 (사용자 안내 필요)**:
- **stable v2.1.128 = #56293 caching 10x regression 도입 버전**
- 사용자가 npm에서 `claude@stable` 설치 시 caching 회귀 직접 노출
- 권고: bkit 사용자에게 **v2.1.123 (보수적) 또는 v2.1.139/v2.1.140 (균형, 신규 추가)** 명시 권장. v2.1.128 회피 안내.

**latest=next 통합 패턴 결정적 입증**: 5/9 분기 → 5/12 통합 → 5/13 통합 유지 (2-cycle 지속). 분기 패턴 1-cycle 단명 확정 — ENH-290 framework data 추가.

---

## 11. file impact matrix (현재 변경 0 — 잠재 ENH 시나리오별)

본 cycle은 **분석 only**, 코드 변경 0건. 차후 시나리오별 영향 매트릭스 제시.

| ENH / 시나리오 | 영향 파일 | 테스트 영향 | 철학 준수 | Sprint 묶음 |
|---------------|----------|-----------|----------|-----------|
| ENH-292 P0 (10-streak 가속) | `lib/orchestrator/team-protocol.js` (sequential dispatch) + `agents/cto-lead.md` + `agents/qa-lead.md` | L3 sequential dispatch verify TC 신규 (cache miss ratio measurement) | Automation First + No Guessing | Sprint Coordination 단독 P0 |
| ENH-289 P1 (Defense Layer 6 maintenance) | `scripts/defense-coordinator.js` (잠정 신설) + `lib/audit/audit-logger.js` extend | L3 audit replay TC | Audit-as-Truth | Sprint Defense Layer 6 |
| MON-CC-NEW P1 (Plugin hook reachability) | `hooks/session-start.js` extend (PostToolUse reachability sanity check) | L3 hook smoke TC | Docs=Code | Sprint Defense (ENH-289 + MON-CC-NEW + ENH-303 통합 PR 후보) |
| ENH-303 P1 (차별화 #5 continueOnBlock) | `hooks/hooks.json` PostToolUse 3 blocks (`continueOnBlock` + deny reason field 추가) + `scripts/unified-write-post.js` / `unified-bash-post.js` / `skill-post.js` | L3 deny reason audit TC | Audit-as-Truth + Defense Layer 5 시너지 | Sprint Defense 통합 PR |
| ENH-281 OTEL 10 누적 | `lib/infra/telemetry.js` extend (agent_id/parent_agent_id + invocation_trigger + host_managed + subprocess env) | L3 OTEL replay TC | Observability | Sprint A Observability 단일 PR (10 묶음 + #17 token-meter Adapter zero entries CARRY-5 closure 후보) |
| ENH-291 P2 (multi-line measurement) | `scripts/validate-skill-description.js` (잠정 신설) + 14 skills 단축 후보 | L3 CI gate TC | Docs=Code | Sprint Doc (insurance gate 의의) |
| ENH-306 P3 (Windows `gh` defense) | `docs/06-guide/maintainer.guide.md` (B8-140 자동수혜 메모만) | 없음 | YAGNI 적용 | Sprint Doc |
| ENH-308 (baseline 확정) | 변경 0 | 없음 | YAGNI 적용 | — |
| ENH-305 (DROP) | 변경 0 | 없음 | YAGNI 적용 | — |

---

## 12. Phase 4 작업 결과 (본 보고서)

| 산출물 | 경로 | Status |
|--------|------|--------|
| 영향 분석 보고서 (본 문서) | `docs/04-report/features/cc-v2139-v2140-impact-analysis.report.md` | ✅ Final |
| 메모리 버전 history (신규) | `memory/cc_version_history_v2140.md` | ✅ Final |
| MEMORY.md 인덱스 갱신 | `memory/MEMORY.md` v2.1.13 신규 편입 섹션 추가 | ✅ Final |
| ADR 0003 매트릭스 갱신 | §2 (9 → 13 항목 확장) | ✅ Final |
| Plan 문서 | (생략, 본 cycle 코드 변경 0건으로 Plan 불필요 — 사용자 명시 보류 결정) | — |

---

## 13. 결론

### 13.1 핵심 결론

1. **bkit v2.1.12 무수정 95-cycle 연속 호환 확정**: v2.1.34 ~ v2.1.140 (v2.1.134/135 R-2 skip 제외), Breaking 0건, 회귀 0건. ADR 0003 9번째 정식 적용 13/13 PASS.
2. **자동수혜 MEDIUM 3건 + LOW 1건 확정**: B2-140 (ConfigChange dedup, bkit 구독 surface **신규 식별**), B8-140 (Windows `gh` stall fix, release script 한정), I3-140 (plugin collision warning, bkit 무해), B9-140 (Read offset normalization, 간접).
3. **5/13 review 의사결정 3건 모두 확정**: ENH-289 P0 → P1 강등 / MON-CC-NEW-PLUGIN-HOOK-DROP P2 → P1 격상 / ENH-303 P2 → P1 격상 (**bkit 차별화 #5 정식 편입**).
4. **bkit 차별화 누적 4 → 5건**: ENH-286 / ENH-289 (강등, moat 유지) / ENH-292 (10-streak 결정적) / ENH-300 / **ENH-303 신규 정식 편입**.
5. **ENH-292 P0 결정적 강화**: #56293 10-cycle 무해소 + stable v2.1.128 승격으로 사용자 직접 노출 위험 — Sprint Coordination 가속 단독 P0 우선순위 결정적.
6. **stable v2.1.128 사용자 노출 경고**: npm `claude@stable`이 #56293 caching 10x regression 도입 버전 직접 가리킴. bkit 권장 v2.1.123 (보수적) 또는 v2.1.140 (균형, 신규) 명시 안내 필요.
7. **메모리 정정 3건**: (1) OTEL surface = 4 vars × 7 code positions × 13 lines (이전 "4 위치" 정정), (2) CLAUDE_PROJECT_DIR = 11 files (이전 "18 files" 정정), (3) "numbered #145"는 R-3 violation #145 (issue #54178), issue 번호 아님.

### 13.2 본 cycle 결정에 따른 다음 작업 권고 (사용자 의사결정 보류)

| 우선순위 | 작업 | Sprint 묶음 후보 |
|---------|------|-----------------|
| P0 (단독) | ENH-292 sequential dispatch (10-streak 가속) | Sprint Coordination 단독 PR — `lib/orchestrator/team-protocol.js` + cto-lead/qa-lead Task spawn sequential 강제 |
| P1 (통합 PR) | ENH-289 P1 + MON-CC-NEW-PLUGIN-HOOK-DROP P1 + ENH-303 P1 + ENH-298 (이전 cycle) | Sprint Defense 통합 PR — Defense Layer 6 + Plugin hook reachability + `continueOnBlock` deny reason moat + push event guard |
| P1 (단독) | ENH-281 OTEL 10 누적 묶음 + CARRY-5 token-meter Adapter zero entries closure | Sprint A Observability 단일 PR |
| P2 (defensive) | ENH-286 (memory enforcer) + ENH-307 invariant 10 신설 | Sprint E Defense 확장 |
| P3 (deferred) | ENH-306 (Windows `gh` 메모) + ENH-291 multi-line measurement methodology TBD | Sprint Doc |
| DROP | ENH-305 (bkit 무해) | — |

본 cycle은 **분석 only**, 위 작업들은 모두 사용자 명시 승인 시 v2.1.13 Sprint 진입 시점에 결정. 본 cycle 종료 시점에 코드 변경 0건.

### 13.3 95 consecutive compatible 확정 + 권장 CC 버전 갱신

- **연속 호환**: 94 → **95** (v2.1.34 ~ v2.1.140, v2.1.134/135 R-2 skip 제외)
- **권장 (보수적)**: **v2.1.123** (drift +5 악화, 단 안정성 검증 완료)
- **권장 (균형, 신규 추가)**: **v2.1.140** (B2/B8-140 MEDIUM 자동수혜 + 95-cycle 검증 + dist-tag latest=next 통합 2-cycle 안정)
- **비권장**: v2.1.128 (= 현 npm stable, **#56293 caching 10x 직접 surface 진입**), v2.1.129 (#56448 9-streak 미해소). 환경 예외 변동 없음.

---

## 14. PDCA 상태 갱신

| 항목 | 값 |
|------|----|
| Feature | cc-version-analysis (v2.1.139 → v2.1.140) |
| Phase | report (analysis-only) → archived |
| Plan | (생략, 코드 변경 0건) |
| Design | (생략, 코드 변경 0건) |
| Implementation | **0건** (사용자 명시 분석 only 결정) |
| Match Rate | N/A (코드 변경 없음) |
| Test Results | ADR 0003 13/13 PASS (사용자 환경 직접 실행) |
| Verdict | ✅ Final |

---

## 15. bkit Feature Usage Report

| Feature | 사용 횟수 | 비고 |
|---------|---------|------|
| `/cc-version-analysis` (skill) | 1 | 본 cycle |
| cc-version-researcher (agent) | 1 | Phase 1 |
| bkit-impact-analyst (agent) | 1 | Phase 2 |
| Plan Plus brainstorming | 1 (인라인) | Phase 3 |
| Task tracking | 5 tasks | Phase 0-4 |
| ADR 0003 사후 검증 매트릭스 | 13/13 PASS | Phase 1.5 gate |
| AskUserQuestion | 1 | Phase 0 scope confirmation |
| 메모리 정정 | 3건 | OTEL / CLAUDE_PROJECT_DIR / violation #145 |
| 5/13 review 의사결정 | 3/3 결정 | ENH-289 강등 / MON-CC-NEW 격상 / ENH-303 격상 |
| bkit 차별화 누적 | 4 → 5건 | ENH-303 정식 편입 |
| 95 consecutive compatible | 갱신 | v2.1.34 ~ v2.1.140 |

---

**보고서 종료**.

ADR 0003 아홉 번째 정식 적용. 사용자 결정 대기 항목: 본 cycle 의사결정 3건 (ENH-289 P1 강등 / MON-CC-NEW P1 격상 / ENH-303 P1 격상 + 차별화 #5 정식 편입) 메모리 반영 후 v2.1.13 Sprint 진입 시점 hotfix 여부 결정.
