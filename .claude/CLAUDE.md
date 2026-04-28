# bkit Project Rules

## Language Rules

### Conversation
- Always respond in **Korean** (한국어) when communicating with the user.

### Code & Documentation Language
- **English by default** for ALL generated content:
  - Code, comments, commit messages, PR descriptions
  - README.md, CHANGELOG.md, and all non-docs/ markdown files
  - Agent definitions (`agents/*.md`), skill definitions (`skills/*/SKILL.md`)
  - Templates (`templates/*.md`)
  - Config files, error messages, log messages

- **Korean exceptions** (한국어 작성):
  - `docs/` directory and all subdirectories (`docs/01-plan/`, `docs/02-design/`, `docs/03-analysis/`, `docs/04-report/`)
  - 8-language auto-trigger keywords (EN, KO, JA, ZH, ES, FR, DE, IT) in agent/skill trigger lists
  - bkit memory state descriptions in `.bkit/state/memory.json`

### Key Principle
bkit is a **global service**. Keep all public-facing and code-level content in English. Korean is only for internal planning docs (`docs/`) and developer communication.

### Do NOT
- Do NOT translate existing English files to Korean (waste of tokens)
- Do NOT write docs/ files in English unless explicitly requested
- Do NOT mix languages within a single file (except trigger keyword lists)
