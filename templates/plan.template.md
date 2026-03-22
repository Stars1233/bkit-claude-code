---
template: plan
version: 1.2
description: PDCA Plan phase document template with Architecture and Convention considerations
variables:
  - feature: Feature name
  - date: Creation date (YYYY-MM-DD)
  - author: Author
  - project: Project name (from package.json or CLAUDE.md)
  - version: Project version (from package.json)
---

# {feature} Planning Document

> **Summary**: {One-line description}
>
> **Project**: {project}
> **Version**: {version}
> **Author**: {author}
> **Date**: {date}
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | {Core problem this feature solves} |
| **Solution** | {Selected solution approach} |
| **Function/UX Effect** | {Expected functional and UX impact} |
| **Core Value** | {Core value proposition} |

---

## 1. Overview

### 1.1 Purpose

{The problem this feature solves or the goal it achieves}

### 1.2 Background

{Why this feature is needed, business context}

### 1.3 Related Documents

- Requirements: {link}
- References: {link}

---

## 2. Scope

### 2.1 In Scope

- [ ] {Included item 1}
- [ ] {Included item 2}
- [ ] {Included item 3}

### 2.2 Out of Scope

- {Excluded item 1}
- {Excluded item 2}

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | {Requirement description} | High/Medium/Low | Pending |
| FR-02 | {Requirement description} | High/Medium/Low | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | {e.g., Response time < 200ms} | {Tool/Method} |
| Security | {e.g., OWASP Top 10 compliance} | {Verification method} |
| Accessibility | {e.g., WCAG 2.1 AA} | {Verification method} |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] All functional requirements implemented
- [ ] Unit tests written and passing
- [ ] Code review completed
- [ ] Documentation completed

### 4.2 Quality Criteria

- [ ] Test coverage above 80%
- [ ] Zero lint errors
- [ ] Build succeeds

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| {Risk 1} | High/Medium/Low | High/Medium/Low | {Mitigation plan} |
| {Risk 2} | High/Medium/Low | High/Medium/Low | {Mitigation plan} |

---

## 6. Impact Analysis

> **Purpose**: List every existing consumer of the resources being changed.
> Changes can break existing functionality in unexpected ways.
> This section forces a full inventory of current usage before making changes.

### 6.1 Changed Resources

| Resource | Type | Change Description |
|----------|------|--------------------|
| {e.g., BilliContract model} | DB Model / API / Schema / Config | {What is being added, modified, or removed} |

### 6.2 Current Consumers

For each changed resource above, list **all** existing code paths that use it:

| Resource | Operation | Code Path | Impact |
|----------|-----------|-----------|--------|
| {resource} | CREATE | {e.g., user-app/contract/new → createBilliContract} | {None / Needs verification / Breaking} |
| {resource} | READ | {e.g., admin/queries/contract.ts → GET_CONTRACT_DETAIL} | {None / Needs verification / Breaking} |
| {resource} | UPDATE | {e.g., admin/hooks/use-contracts.ts → useUpdateContract} | {None / Needs verification / Breaking} |
| {resource} | DELETE | {e.g., admin/queries/contract.ts → DELETE_CONTRACT} | {None / Needs verification / Breaking} |

### 6.3 Verification

- [ ] All consumers listed above verified to work with the proposed changes
- [ ] No auth/permission changes break existing operations
- [ ] No field additions/removals break existing queries or mutations

---

## 7. Architecture Considerations

### 7.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure (`components/`, `lib/`, `types/`) | Static sites, portfolios, landing pages | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration (bkend.ai) | Web apps with backend, SaaS MVPs, fullstack apps | ☐ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems, complex architectures | ☐ |

### 7.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js / React / Vue | {selected} | {reason} |
| State Management | Context / Zustand / Redux / Jotai | {selected} | {reason} |
| API Client | fetch / axios / react-query | {selected} | {reason} |
| Form Handling | react-hook-form / formik / native | {selected} | {reason} |
| Styling | Tailwind / CSS Modules / styled-components | {selected} | {reason} |
| Testing | Jest / Vitest / Playwright | {selected} | {reason} |
| Backend | BaaS (bkend.ai) / Custom Server / Serverless | {selected} | Dynamic -> bkend.ai recommended |

### 7.3 Clean Architecture Approach

```
Selected Level: {Starter/Dynamic/Enterprise}

Folder Structure Preview:
┌─────────────────────────────────────────────────────┐
│ Starter:                                            │
│   src/components/, src/lib/, src/types/             │
├─────────────────────────────────────────────────────┤
│ Dynamic:                                            │
│   src/components/, src/features/, src/services/,    │
│   src/types/, src/lib/bkend.ts, .mcp.json           │
├─────────────────────────────────────────────────────┤
│ Enterprise:                                         │
│   src/presentation/, src/application/,              │
│   src/domain/, src/infrastructure/                  │
└─────────────────────────────────────────────────────┘
```

---

## 8. Convention Prerequisites

### 8.1 Existing Project Conventions

Check which conventions already exist in the project:

- [ ] `CLAUDE.md` has coding conventions section
- [ ] `docs/01-plan/conventions.md` exists (Phase 2 output)
- [ ] `CONVENTIONS.md` exists at project root
- [ ] ESLint configuration (`.eslintrc.*`)
- [ ] Prettier configuration (`.prettierrc`)
- [ ] TypeScript configuration (`tsconfig.json`)

### 8.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Naming** | {exists/missing} | {specific rules} | High |
| **Folder structure** | {exists/missing} | {structure rules} | High |
| **Import order** | {exists/missing} | {import rules} | Medium |
| **Environment variables** | {exists/missing} | {env var list} | Medium |
| **Error handling** | {exists/missing} | {error patterns} | Medium |

### 8.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `NEXT_PUBLIC_API_URL` | API endpoint | Client | ☐ |
| `DATABASE_URL` | DB connection | Server | ☐ |
| `AUTH_SECRET` | Auth secret key | Server | ☐ |
| {variable} | {purpose} | {scope} | ☐ |

### 8.4 Pipeline Integration

If using 9-phase Development Pipeline, check the following:

| Phase | Status | Document Location | Command |
|-------|:------:|-------------------|---------|
| Phase 1 (Schema) | ☐ | `docs/01-plan/schema.md` | `/pipeline-next` |
| Phase 2 (Convention) | ☐ | `docs/01-plan/conventions.md` | `/pipeline-next` |

**Pipeline Templates Available:**
- `templates/pipeline/phase-1-schema.template.md`
- `templates/pipeline/phase-2-convention.template.md`

**Quick Start:**
```bash
# Check pipeline status
/pipeline-status

# Start pipeline from Phase 1
/pipeline-start

# Go to next phase
/pipeline-next
```

---

## 9. Next Steps

1. [ ] Write design document (`{feature}.design.md`)
2. [ ] Team review and approval
3. [ ] Start implementation

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | {date} | Initial draft | {author} |
