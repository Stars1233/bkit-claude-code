# issue-53-docs-sync 계획서

> **요약**: Issue #53 수정 및 v2.0.4 릴리스에 따른 문서 동기화
>
> **프로젝트**: bkit-claude-code
> **버전**: 2.0.4
> **작성자**: Claude
> **날짜**: 2026-03-23
> **상태**: Completed
> **PDCA Cycle**: 3/3

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **문제** | 코드 변경(v2.0.3→2.0.4, hook path quoting) 후 문서가 미동기 상태 |
| **해결** | README, bkit-system 문서, CUSTOMIZATION-GUIDE 등 전체 문서 버전 동기화 + hook quoting 가이드 추가 |
| **기능/UX 효과** | 문서와 코드 100% 일치, 사용자가 정확한 정보 확인 가능 |
| **핵심 가치** | "Docs=Code" 원칙 실현 |

---

## 1. 범위

### 1.1 버전 업데이트 대상
- README.md: 버전 배지 2.0.4, CC requirements 문구
- bkit-system/components/skills/_skills-overview.md
- bkit-system/components/agents/_agents-overview.md
- bkit-system/components/scripts/_scripts-overview.md
- bkit-system/components/hooks/_hooks-overview.md
- bkit-system/README.md

### 1.2 내용 업데이트 대상
- hooks/_hooks-overview.md: v2.0.4 path quoting fix 섹션 추가
- CUSTOMIZATION-GUIDE.md: 예시 코드의 hook command를 quoted path 패턴으로 수정

### 1.3 변경하지 않는 항목
- AI-NATIVE-DEVELOPMENT.md: v2.0.3 기능 설명은 역사적 기록 (해당 버전에서 추가된 기능)
- commands/bkit.md: v2.0.3 참조는 기능 도입 시점 표시
- bkit-system/_GRAPH-INDEX.md: lib/common.js 설명의 v2.0.3은 해당 시점 상태
