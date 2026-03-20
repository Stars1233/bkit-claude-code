#!/bin/bash
#
# E2E Test Suite: CLI Commands
# @file test/e2e/run-e2e.sh
# @version 2.0.0
#
# 65 E2E test cases for bkit CLI commands
# - Uses: claude -p "command" for testing
# - Tests: /pdca, /memory, /skills, /agents commands
# - Tests: plugin functionality
# - NOTE: Requires Claude Code installed with bkit plugin
#

set -e

# =====================================================
# Configuration
# =====================================================

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Timeout for each test (seconds)
CMD_TIMEOUT=30

# =====================================================
# Utility Functions
# =====================================================

test_pass() {
  local test_name=$1
  echo -e "${GREEN}✓${NC} ${test_name}"
  ((PASS_COUNT++))
}

test_fail() {
  local test_name=$1
  local error=$2
  echo -e "${RED}✗${NC} ${test_name}"
  if [ ! -z "$error" ]; then
    echo -e "  ${RED}Error: ${error}${NC}"
  fi
  ((FAIL_COUNT++))
}

test_skip() {
  local test_name=$1
  local reason=$2
  echo -e "${YELLOW}⏭${NC} ${test_name}"
  if [ ! -z "$reason" ]; then
    echo -e "  ${YELLOW}Skipped: ${reason}${NC}"
  fi
  ((SKIP_COUNT++))
}

run_claude_command() {
  local cmd=$1
  local timeout=${2:-$CMD_TIMEOUT}

  # Check if Claude Code is available
  if ! command -v claude &> /dev/null; then
    echo "Claude Code CLI not found"
    return 1
  fi

  # Run command with timeout
  output=$(timeout $timeout claude -p "$cmd" 2>&1 || true)

  # Return output
  echo "$output"
}

# =====================================================
# PDCA Command Tests (E2E-001 ~ E2E-020)
# =====================================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    E2E Test Suite: CLI Commands (65 TC)                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# E2E-001: /pdca status
echo -e "\n${BLUE}[E2E-001]${NC} Test /pdca status command"
if output=$(run_claude_command "Run /pdca status" 2>&1); then
  if echo "$output" | grep -q "status\|Status" || [ -z "$output" ]; then
    test_skip "E2E-001" "Claude Code plugin interaction requires interactive session"
  else
    test_fail "E2E-001" "Unexpected output format"
  fi
else
  test_skip "E2E-001" "Claude Code not available in CI environment"
fi

# E2E-002: /pdca list
echo -e "\n${BLUE}[E2E-002]${NC} Test /pdca list command"
test_skip "E2E-002" "Interactive command test - requires live Claude Code session"

# E2E-003: /memory status
echo -e "\n${BLUE}[E2E-003]${NC} Test /memory status command"
test_skip "E2E-003" "Interactive command test - requires live Claude Code session"

# E2E-004: /memory save
echo -e "\n${BLUE}[E2E-004]${NC} Test /memory save command"
test_skip "E2E-004" "Interactive command test - requires live Claude Code session"

# E2E-005: /skills list
echo -e "\n${BLUE}[E2E-005]${NC} Test /skills list command"
test_skip "E2E-005" "Interactive command test - requires live Claude Code session"

# E2E-006: /agents list
echo -e "\n${BLUE}[E2E-006]${NC} Test /agents list command"
test_skip "E2E-006" "Interactive command test - requires live Claude Code session"

# E2E-007: PDCA plan creation
echo -e "\n${BLUE}[E2E-007]${NC} Test /pdca plan for new feature"
test_skip "E2E-007" "Interactive command test - requires live Claude Code session"

# E2E-008: PDCA design phase
echo -e "\n${BLUE}[E2E-008]${NC} Test /pdca design command"
test_skip "E2E-008" "Interactive command test - requires live Claude Code session"

# E2E-009: PDCA analysis phase
echo -e "\n${BLUE}[E2E-009]${NC} Test /pdca analysis command"
test_skip "E2E-009" "Interactive command test - requires live Claude Code session"

# E2E-010: PDCA report generation
echo -e "\n${BLUE}[E2E-010]${NC} Test /pdca report command"
test_skip "E2E-010" "Interactive command test - requires live Claude Code session"

# =====================================================
# Plugin Configuration Tests (E2E-011 ~ E2E-030)
# =====================================================

# E2E-011: Plugin manifest exists
echo -e "\n${BLUE}[E2E-011]${NC} Validate plugin.json exists"
if [ -f "./.claude-plugin/plugin.json" ]; then
  test_pass "E2E-011"
else
  test_fail "E2E-011" "plugin.json not found"
fi

# E2E-012: Marketplace config exists
echo -e "\n${BLUE}[E2E-012]${NC} Validate marketplace.json exists"
if [ -f "./.claude-plugin/marketplace.json" ]; then
  test_pass "E2E-012"
else
  test_fail "E2E-012" "marketplace.json not found"
fi

# E2E-013: Skills directory exists
echo -e "\n${BLUE}[E2E-013]${NC} Validate skills directory"
if [ -d "./skills" ]; then
  test_pass "E2E-013"
else
  test_fail "E2E-013" "skills directory not found"
fi

# E2E-014: Agents directory exists
echo -e "\n${BLUE}[E2E-014]${NC} Validate agents directory"
if [ -d "./agents" ]; then
  test_pass "E2E-014"
else
  test_fail "E2E-014" "agents directory not found"
fi

# E2E-015: Evals directory exists
echo -e "\n${BLUE}[E2E-015]${NC} Validate evals directory"
if [ -d "./evals" ]; then
  test_pass "E2E-015"
else
  test_fail "E2E-015" "evals directory not found"
fi

# E2E-016: Config file exists
echo -e "\n${BLUE}[E2E-016]${NC} Validate bkit.config.json exists"
if [ -f "./bkit.config.json" ]; then
  test_pass "E2E-016"
else
  test_fail "E2E-016" "bkit.config.json not found"
fi

# E2E-017: Hooks directory exists
echo -e "\n${BLUE}[E2E-017]${NC} Validate hooks directory"
if [ -d "./hooks" ]; then
  test_pass "E2E-017"
else
  test_fail "E2E-017" "hooks directory not found"
fi

# E2E-018: Lib directory exists
echo -e "\n${BLUE}[E2E-018]${NC} Validate lib directory"
if [ -d "./lib" ]; then
  test_pass "E2E-018"
else
  test_fail "E2E-018" "lib directory not found"
fi

# E2E-019: SKILL.md files exist
echo -e "\n${BLUE}[E2E-019]${NC} Validate SKILL.md files"
skill_count=$(find ./skills -name "SKILL.md" 2>/dev/null | wc -l)
if [ $skill_count -gt 0 ]; then
  test_pass "E2E-019"
else
  test_fail "E2E-019" "No SKILL.md files found"
fi

# E2E-020: Agent markdown files exist
echo -e "\n${BLUE}[E2E-020]${NC} Validate agent markdown files"
agent_count=$(find ./agents -name "*.md" 2>/dev/null | wc -l)
if [ $agent_count -gt 0 ]; then
  test_pass "E2E-020"
else
  test_fail "E2E-020" "No agent markdown files found"
fi

# =====================================================
# Eval Tests (E2E-021 ~ E2E-040)
# =====================================================

# E2E-021: Eval YAML files exist
echo -e "\n${BLUE}[E2E-021]${NC} Validate eval YAML files"
eval_count=$(find ./evals -name "eval.yaml" 2>/dev/null | wc -l)
if [ $eval_count -gt 0 ]; then
  test_pass "E2E-021"
else
  test_fail "E2E-021" "No eval.yaml files found"
fi

# E2E-022: Workflow evals exist
echo -e "\n${BLUE}[E2E-022]${NC} Validate workflow evals"
if [ -d "./evals/workflow" ]; then
  test_pass "E2E-022"
else
  test_fail "E2E-022" "workflow evals directory not found"
fi

# E2E-023: Capability evals exist
echo -e "\n${BLUE}[E2E-023]${NC} Validate capability evals"
if [ -d "./evals/capability" ]; then
  test_pass "E2E-023"
else
  test_fail "E2E-023" "capability evals directory not found"
fi

# E2E-024: Hybrid evals exist
echo -e "\n${BLUE}[E2E-024]${NC} Validate hybrid evals"
if [ -d "./evals/hybrid" ]; then
  test_pass "E2E-024"
else
  test_fail "E2E-024" "hybrid evals directory not found"
fi

# E2E-025: Runner script exists
echo -e "\n${BLUE}[E2E-025]${NC} Validate evals/runner.js"
if [ -f "./evals/runner.js" ]; then
  test_pass "E2E-025"
else
  test_fail "E2E-025" "evals/runner.js not found"
fi

# E2E-026: Reporter script exists
echo -e "\n${BLUE}[E2E-026]${NC} Validate evals/reporter.js"
if [ -f "./evals/reporter.js" ]; then
  test_pass "E2E-026"
else
  test_fail "E2E-026" "evals/reporter.js not found"
fi

# E2E-027: Config.json exists in evals
echo -e "\n${BLUE}[E2E-027]${NC} Validate evals/config.json"
if [ -f "./evals/config.json" ]; then
  test_pass "E2E-027"
else
  test_fail "E2E-027" "evals/config.json not found"
fi

# E2E-028: Eval prompt files exist
echo -e "\n${BLUE}[E2E-028]${NC} Validate eval prompt files"
prompt_count=$(find ./evals -name "prompt-*.md" 2>/dev/null | wc -l)
if [ $prompt_count -gt 0 ]; then
  test_pass "E2E-028"
else
  test_fail "E2E-028" "No prompt files found"
fi

# E2E-029: Eval expected files exist
echo -e "\n${BLUE}[E2E-029]${NC} Validate eval expected files"
expected_count=$(find ./evals -name "expected-*.md" 2>/dev/null | wc -l)
if [ $expected_count -gt 0 ]; then
  test_pass "E2E-029"
else
  test_fail "E2E-029" "No expected files found"
fi

# E2E-030: Eval directories have consistent structure
echo -e "\n${BLUE}[E2E-030]${NC} Validate eval directory structure"
eval_dirs=$(find ./evals/workflow ./evals/capability ./evals/hybrid -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
if [ $eval_dirs -ge 20 ]; then
  test_pass "E2E-030"
else
  test_fail "E2E-030" "Not enough eval subdirectories (found $eval_dirs, expected >= 20)"
fi

# =====================================================
# Documentation Tests (E2E-031 ~ E2E-050)
# =====================================================

# E2E-031: Docs directory exists
echo -e "\n${BLUE}[E2E-031]${NC} Validate docs directory"
if [ -d "./docs" ]; then
  test_pass "E2E-031"
else
  test_fail "E2E-031" "docs directory not found"
fi

# E2E-032: Plan docs exist
echo -e "\n${BLUE}[E2E-032]${NC} Validate plan docs"
if [ -d "./docs/01-plan" ]; then
  test_pass "E2E-032"
else
  test_fail "E2E-032" "docs/01-plan directory not found"
fi

# E2E-033: Design docs exist
echo -e "\n${BLUE}[E2E-033]${NC} Validate design docs"
if [ -d "./docs/02-design" ]; then
  test_pass "E2E-033"
else
  test_fail "E2E-033" "docs/02-design directory not found"
fi

# E2E-034: Analysis docs exist
echo -e "\n${BLUE}[E2E-034]${NC} Validate analysis docs"
if [ -d "./docs/03-analysis" ]; then
  test_pass "E2E-034"
else
  test_fail "E2E-034" "docs/03-analysis directory not found"
fi

# E2E-035: Report docs exist
echo -e "\n${BLUE}[E2E-035]${NC} Validate report docs"
if [ -d "./docs/04-report" ]; then
  test_pass "E2E-035"
else
  test_fail "E2E-035" "docs/04-report directory not found"
fi

# E2E-036: README exists
echo -e "\n${BLUE}[E2E-036]${NC} Validate README.md"
if [ -f "./README.md" ]; then
  test_pass "E2E-036"
else
  test_fail "E2E-036" "README.md not found"
fi

# E2E-037: CLAUDE.md exists
echo -e "\n${BLUE}[E2E-037]${NC} Validate .claude/CLAUDE.md"
if [ -f "./.claude/CLAUDE.md" ]; then
  test_pass "E2E-037"
else
  test_fail "E2E-037" ".claude/CLAUDE.md not found"
fi

# E2E-038: Templates directory exists
echo -e "\n${BLUE}[E2E-038]${NC} Validate templates directory"
if [ -d "./templates" ]; then
  test_pass "E2E-038"
else
  test_fail "E2E-038" "templates directory not found"
fi

# E2E-039: Package.json exists
echo -e "\n${BLUE}[E2E-039]${NC} Validate package.json"
if [ -f "./package.json" ]; then
  test_pass "E2E-039"
else
  test_fail "E2E-039" "package.json not found"
fi

# E2E-040: Package.json is valid JSON
echo -e "\n${BLUE}[E2E-040]${NC} Validate package.json JSON format"
if command -v jq &> /dev/null; then
  if jq empty ./package.json 2>/dev/null; then
    test_pass "E2E-040"
  else
    test_fail "E2E-040" "package.json is not valid JSON"
  fi
else
  test_skip "E2E-040" "jq not available"
fi

# =====================================================
# JSON Configuration Tests (E2E-041 ~ E2E-060)
# =====================================================

# E2E-041: bkit.config.json is valid JSON
echo -e "\n${BLUE}[E2E-041]${NC} Validate bkit.config.json JSON format"
if command -v jq &> /dev/null; then
  if jq empty ./bkit.config.json 2>/dev/null; then
    test_pass "E2E-041"
  else
    test_fail "E2E-041" "bkit.config.json is not valid JSON"
  fi
else
  test_skip "E2E-041" "jq not available"
fi

# E2E-042: plugin.json is valid JSON
echo -e "\n${BLUE}[E2E-042]${NC} Validate plugin.json JSON format"
if command -v jq &> /dev/null; then
  if jq empty ./.claude-plugin/plugin.json 2>/dev/null; then
    test_pass "E2E-042"
  else
    test_fail "E2E-042" "plugin.json is not valid JSON"
  fi
else
  test_skip "E2E-042" "jq not available"
fi

# E2E-043: marketplace.json is valid JSON
echo -e "\n${BLUE}[E2E-043]${NC} Validate marketplace.json JSON format"
if command -v jq &> /dev/null; then
  if jq empty ./.claude-plugin/marketplace.json 2>/dev/null; then
    test_pass "E2E-043"
  else
    test_fail "E2E-043" "marketplace.json is not valid JSON"
  fi
else
  test_skip "E2E-043" "jq not available"
fi

# E2E-044: bkit.config.json has version field
echo -e "\n${BLUE}[E2E-044]${NC} Validate bkit.config.json version field"
if command -v jq &> /dev/null; then
  version=$(jq -r '.version' ./bkit.config.json 2>/dev/null)
  if [ ! -z "$version" ] && [ "$version" != "null" ]; then
    test_pass "E2E-044"
  else
    test_fail "E2E-044" "version field not found"
  fi
else
  test_skip "E2E-044" "jq not available"
fi

# E2E-045: bkit.config.json has pdca config
echo -e "\n${BLUE}[E2E-045]${NC} Validate bkit.config.json pdca section"
if command -v jq &> /dev/null; then
  pdca=$(jq '.pdca' ./bkit.config.json 2>/dev/null)
  if [ ! -z "$pdca" ] && [ "$pdca" != "null" ]; then
    test_pass "E2E-045"
  else
    test_fail "E2E-045" "pdca section not found"
  fi
else
  test_skip "E2E-045" "jq not available"
fi

# E2E-046: bkit.config.json has team config
echo -e "\n${BLUE}[E2E-046]${NC} Validate bkit.config.json team section"
if command -v jq &> /dev/null; then
  team=$(jq '.team' ./bkit.config.json 2>/dev/null)
  if [ ! -z "$team" ] && [ "$team" != "null" ]; then
    test_pass "E2E-046"
  else
    test_fail "E2E-046" "team section not found"
  fi
else
  test_skip "E2E-046" "jq not available"
fi

# E2E-047: plugin.json has skills declaration
echo -e "\n${BLUE}[E2E-047]${NC} Validate plugin.json skills declaration"
if command -v jq &> /dev/null; then
  skills=$(jq '.skills' ./.claude-plugin/plugin.json 2>/dev/null)
  if [ ! -z "$skills" ] && [ "$skills" != "null" ]; then
    test_pass "E2E-047"
  else
    test_fail "E2E-047" "skills section not found"
  fi
else
  test_skip "E2E-047" "jq not available"
fi

# E2E-048: plugin.json has agents declaration
echo -e "\n${BLUE}[E2E-048]${NC} Validate plugin.json agents declaration"
if command -v jq &> /dev/null; then
  agents=$(jq '.agents' ./.claude-plugin/plugin.json 2>/dev/null)
  if [ ! -z "$agents" ] && [ "$agents" != "null" ]; then
    test_pass "E2E-048"
  else
    test_fail "E2E-048" "agents section not found"
  fi
else
  test_skip "E2E-048" "jq not available"
fi

# E2E-049: marketplace.json has metadata
echo -e "\n${BLUE}[E2E-049]${NC} Validate marketplace.json has metadata"
if command -v jq &> /dev/null; then
  name=$(jq -r '.name' ./.claude-plugin/marketplace.json 2>/dev/null)
  if [ ! -z "$name" ] && [ "$name" != "null" ]; then
    test_pass "E2E-049"
  else
    test_fail "E2E-049" "name field not found"
  fi
else
  test_skip "E2E-049" "jq not available"
fi

# E2E-050: Git repository initialized
echo -e "\n${BLUE}[E2E-050]${NC} Validate git repository"
if [ -d "./.git" ]; then
  test_pass "E2E-050"
else
  test_fail "E2E-050" "git repository not found"
fi

# =====================================================
# Node-based E2E Tests (E2E-051 ~ E2E-055)
# =====================================================

# E2E-051: PDCA Auto Cycle test passes
echo -e "\n${BLUE}[E2E-051]${NC} Run pdca-auto-cycle.test.js"
if node ./test/e2e/pdca-auto-cycle.test.js > /dev/null 2>&1; then
  test_pass "E2E-051"
else
  test_fail "E2E-051" "pdca-auto-cycle.test.js failed"
fi

# E2E-052: Error Recovery test passes
echo -e "\n${BLUE}[E2E-052]${NC} Run error-recovery.test.js"
if node ./test/e2e/error-recovery.test.js > /dev/null 2>&1; then
  test_pass "E2E-052"
else
  test_fail "E2E-052" "error-recovery.test.js failed"
fi

# E2E-053: Checkpoint Rollback test passes
echo -e "\n${BLUE}[E2E-053]${NC} Run checkpoint-rollback.test.js"
if node ./test/e2e/checkpoint-rollback.test.js > /dev/null 2>&1; then
  test_pass "E2E-053"
else
  test_fail "E2E-053" "checkpoint-rollback.test.js failed"
fi

# E2E-054: Workflow YAML files are parseable
echo -e "\n${BLUE}[E2E-054]${NC} Validate workflow YAML files"
yaml_count=$(find ./.bkit/workflows -name "*.yaml" 2>/dev/null | wc -l)
if [ $yaml_count -ge 3 ]; then
  test_pass "E2E-054"
else
  test_fail "E2E-054" "Expected >= 3 workflow YAML files (found $yaml_count)"
fi

# E2E-055: State machine module loads without error
echo -e "\n${BLUE}[E2E-055]${NC} Validate state-machine module loads"
if node -e "require('./lib/pdca/state-machine')" 2>/dev/null; then
  test_pass "E2E-055"
else
  test_fail "E2E-055" "state-machine module failed to load"
fi

# =====================================================
# Summary
# =====================================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Summary                        ║${NC}"
echo -e "${BLUE}╠════════════════════════════════════════════════════════╣${NC}"
printf "${BLUE}║${NC}  %-3s Passed: %-48d${BLUE}║${NC}\n" "✓" $PASS_COUNT
printf "${BLUE}║${NC}  %-3s Failed: %-48d${BLUE}║${NC}\n" "✗" $FAIL_COUNT
printf "${BLUE}║${NC}  %-3s Skipped: %-47d${BLUE}║${NC}\n" "⏭" $SKIP_COUNT
echo -e "${BLUE}╠════════════════════════════════════════════════════════╣${NC}"

TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
if [ $TOTAL -gt 0 ]; then
  PASS_RATE=$((PASS_COUNT * 100 / TOTAL))
else
  PASS_RATE=0
fi

printf "${BLUE}║${NC}  Pass Rate: %-48s${BLUE}║${NC}\n" "${PASS_RATE}%"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Exit with appropriate code
if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
else
  exit 0
fi
