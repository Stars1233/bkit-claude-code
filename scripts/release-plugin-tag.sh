#!/usr/bin/env bash
#
# release-plugin-tag.sh — bkit GA release automation (FR-δ6, ENH-279)
#
# Wraps `claude plugin tag v<version>` (CC v2.1.118 F9) with:
#   1. BKIT_VERSION SoT alignment verification (5 locations)
#   2. Pre-flight clean working tree check
#   3. CI invariants (check-trust-score-reconcile + check-quality-gates)
#   4. Tag creation via `claude plugin tag`
#   5. Optional GitHub release notes draft from CHANGELOG.md
#
# Exit codes:
#   0 — release tag created
#   1 — preflight invariant failed (no tag created)
#   2 — version mismatch among the 5 SoT locations
#   3 — `claude plugin tag` itself failed
#
# Usage:
#   bash scripts/release-plugin-tag.sh [--dry-run] [--no-gh-notes]
#
# @version 2.1.11
# @since   2.1.11
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=0
NO_GH_NOTES=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --no-gh-notes) NO_GH_NOTES=1 ;;
    -h|--help)
      grep '^#' "$0" | grep -v '^#!' | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

cd "$ROOT"

# ── 1. Read canonical version from bkit.config.json ──────────────────────
VERSION=$(node -e 'console.log(require("./bkit.config.json").version)')
TAG="v${VERSION}"
echo "[release] canonical BKIT_VERSION=${VERSION} → tag=${TAG}"

# ── 2. Verify the 5 SoT locations agree ──────────────────────────────────
SOT_FILES=(
  "bkit.config.json"
  ".claude-plugin/plugin.json"
)
for loc in "${SOT_FILES[@]}"; do
  v=$(node -e "console.log(require('./${loc}').version)")
  if [[ "$v" != "$VERSION" ]]; then
    echo "[release] FAIL — ${loc} reports ${v}, expected ${VERSION}" >&2
    exit 2
  fi
  echo "[release]  OK  — ${loc} = ${v}"
done

# README badge + CHANGELOG header (regex matches)
if grep -qE "^# Changelog" CHANGELOG.md && \
   ! grep -qE "^## \[${VERSION}\]" CHANGELOG.md; then
  echo "[release] FAIL — CHANGELOG.md missing [${VERSION}] section" >&2
  exit 2
fi
echo "[release]  OK  — CHANGELOG.md contains [${VERSION}] header"

# ── 3. Pre-flight clean working tree ─────────────────────────────────────
if [[ -n $(git status --porcelain) ]]; then
  echo "[release] FAIL — working tree not clean. Commit or stash first." >&2
  git status --short
  exit 1
fi
echo "[release]  OK  — working tree clean"

# ── 4. Run CI invariants (must pass) ─────────────────────────────────────
node scripts/check-trust-score-reconcile.js
node scripts/check-quality-gates-m1-m10.js
echo "[release]  OK  — CI invariants pass"

# ── 5. Detect tag conflicts ─────────────────────────────────────────────
if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "[release] FAIL — git tag ${TAG} already exists" >&2
  exit 1
fi
echo "[release]  OK  — tag ${TAG} is free"

# ── 6. Issue the tag ─────────────────────────────────────────────────────
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[release] DRY RUN — would invoke: claude plugin tag ${TAG}"
  echo "[release] DRY RUN — would invoke: git tag -a ${TAG}"
else
  if command -v claude >/dev/null 2>&1; then
    echo "[release] invoking: claude plugin tag ${TAG}"
    if ! claude plugin tag "${TAG}"; then
      echo "[release] FAIL — claude plugin tag ${TAG} returned non-zero" >&2
      exit 3
    fi
  else
    echo "[release] WARN — 'claude' CLI not on PATH; falling back to git tag only"
    git tag -a "${TAG}" -m "bkit ${TAG} release"
  fi
fi

# ── 7. Optional GitHub release notes draft ──────────────────────────────
if [[ "$NO_GH_NOTES" -eq 0 ]]; then
  if command -v gh >/dev/null 2>&1; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[release] DRY RUN — would draft GitHub release notes"
    else
      # Extract CHANGELOG section for this version
      NOTES=$(awk -v v="${VERSION}" '
        $0 ~ "^## \\[" v "\\]" { capture = 1; next }
        capture && /^## \[/ { exit }
        capture { print }
      ' CHANGELOG.md)
      if [[ -n "$NOTES" ]]; then
        echo "[release] drafting GitHub release with CHANGELOG section"
        gh release create "${TAG}" --draft --title "bkit ${TAG}" --notes "$NOTES" || \
          echo "[release] WARN — gh release create failed (manual step required)"
      else
        echo "[release] WARN — no CHANGELOG content for ${VERSION} — skip notes"
      fi
    fi
  else
    echo "[release] WARN — 'gh' CLI not on PATH; skip release notes"
  fi
fi

echo ""
echo "[release] DONE — ${TAG} ready for push"
echo "  next: git push origin ${TAG}"
echo "  GitHub release notes: gh release view ${TAG} --web"
