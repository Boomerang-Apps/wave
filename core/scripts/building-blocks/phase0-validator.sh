#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PHASE 0 VALIDATOR (Stories)
# ═══════════════════════════════════════════════════════════════════════════════
# Validates that AI Stories are properly created before any work begins.
# Creates PHASE0 lock file upon successful validation.
#
# VALIDATION CHECKS:
#   1. Story directory exists
#   2. At least 1 story file for the wave
#   3. All story files are valid JSON
#   4. Required fields present (id, title, domain, acceptance_criteria)
#   5. Story IDs are unique
#   6. Acceptance criteria are defined
#
# USAGE:
#   ./phase0-validator.sh --project <path> --wave <N>
#   ./phase0-validator.sh --project <path> --wave <N> --dry-run
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_VERSION="1.0.0"

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[P0]${NC} $1"; }
log_success() { echo -e "${GREEN}[P0]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[P0]${NC} $1"; }
log_error() { echo -e "${RED}[P0]${NC} $1"; }
log_check() { echo -e "${CYAN}[CHECK]${NC} $1"; }
log_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Building Blocks: Phase 0 Validator (Stories)

Validates AI Stories before development begins.

Usage: phase0-validator.sh [options]

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number to validate

Optional:
  --dry-run               Check without creating lock file
  --verbose               Show detailed validation output
  --allow-empty           Allow wave with no stories (for testing)

Exit Codes:
  0  - All checks passed, lock created
  1  - Validation failed

Examples:
  # Validate wave 3 stories
  ./phase0-validator.sh -p /path/to/project -w 3

  # Dry run (no lock created)
  ./phase0-validator.sh -p /path/to/project -w 3 --dry-run

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# REQUIRED STORY FIELDS
# ─────────────────────────────────────────────────────────────────────────────
# Note: 'domain' or 'agent' field indicates the responsible team
REQUIRED_FIELDS=("id" "title")

# ─────────────────────────────────────────────────────────────────────────────
# FIND STORY FILES
# ─────────────────────────────────────────────────────────────────────────────
find_story_files() {
    local project_root=$1
    local wave=$2

    cd "$project_root"

    # Try wave-specific directory first
    if [ -d "stories/wave${wave}" ]; then
        find "stories/wave${wave}" -name "*.json" -type f 2>/dev/null | sort
    elif [ -d "stories" ]; then
        # Try flat structure with wave prefix
        find "stories" -name "WAVE${wave}*.json" -type f 2>/dev/null | sort
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATE SINGLE STORY
# ─────────────────────────────────────────────────────────────────────────────
validate_story() {
    local story_file=$1
    local verbose=$2
    local errors=()

    # Check 1: Valid JSON
    if ! jq empty "$story_file" 2>/dev/null; then
        errors+=("Invalid JSON syntax")
        [ "$verbose" = "true" ] && log_fail "Invalid JSON: $story_file"
        echo "${errors[*]}"
        return 1
    fi

    # Check 2: Required fields
    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! jq -e ".$field" "$story_file" >/dev/null 2>&1; then
            errors+=("Missing field: $field")
            [ "$verbose" = "true" ] && log_fail "Missing '$field' in $story_file"
        fi
    done

    # Check 3: Acceptance criteria (can be in different formats)
    local has_ac=false
    if jq -e '.acceptance_criteria' "$story_file" >/dev/null 2>&1; then
        has_ac=true
    elif jq -e '.acceptanceCriteria' "$story_file" >/dev/null 2>&1; then
        has_ac=true
    elif jq -e '.ac' "$story_file" >/dev/null 2>&1; then
        has_ac=true
    fi

    if [ "$has_ac" = "false" ]; then
        errors+=("Missing acceptance_criteria")
        [ "$verbose" = "true" ] && log_fail "Missing acceptance criteria in $story_file"
    fi

    # Check 4: ID format (should match wave)
    local story_id=$(jq -r '.id // ""' "$story_file")
    if [ -z "$story_id" ]; then
        errors+=("Empty story ID")
    fi

    # Check 5: Domain/Agent must be valid (accepts either field name)
    local domain=$(jq -r '.domain // .agent // ""' "$story_file")
    case "$domain" in
        frontend|backend|fullstack|qa|devops|fe-dev|be-dev|"")
            # Valid domains/agents
            ;;
        *)
            # Allow other domains but warn
            [ "$verbose" = "true" ] && log_warn "Non-standard domain/agent '$domain' in $story_file"
            ;;
    esac

    if [ ${#errors[@]} -gt 0 ]; then
        echo "${errors[*]}"
        return 1
    fi

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
run_validation() {
    local project_root=$1
    local wave=$2
    local verbose=$3
    local allow_empty=$4

    local all_passed=true
    local checks_json="{}"
    local story_ids=()
    local stories_validated=()
    local validation_errors=()

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} PHASE 0 VALIDATION: STORIES (Wave $wave)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    cd "$project_root"

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 1: Stories directory exists
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Stories directory exists"
    if [ -d "stories" ]; then
        log_pass "stories/ directory found"
        checks_json=$(echo "$checks_json" | jq '.directory_exists = true')
    else
        log_fail "stories/ directory not found"
        checks_json=$(echo "$checks_json" | jq '.directory_exists = false')
        all_passed=false
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 2: Story files exist for this wave
    # ─────────────────────────────────────────────────────────────────────────
    log_check "Story files exist for wave $wave"
    local story_files=$(find_story_files "$project_root" "$wave")
    local story_count=$(echo "$story_files" | grep -c ".json" || echo 0)

    if [ "$story_count" -gt 0 ]; then
        log_pass "Found $story_count story file(s)"
        checks_json=$(echo "$checks_json" | jq --argjson count "$story_count" '.story_count = $count')
    elif [ "$allow_empty" = "true" ]; then
        log_warn "No stories found (--allow-empty enabled)"
        checks_json=$(echo "$checks_json" | jq '.story_count = 0 | .empty_allowed = true')
        story_count=0
    else
        log_fail "No story files found for wave $wave"
        log_info "  Expected: stories/wave${wave}/*.json or stories/WAVE${wave}*.json"
        checks_json=$(echo "$checks_json" | jq '.story_count = 0')
        all_passed=false
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 3: Validate each story file
    # ─────────────────────────────────────────────────────────────────────────
    if [ "$story_count" -gt 0 ]; then
        log_check "Validating story files"

        while IFS= read -r story_file; do
            [ -z "$story_file" ] && continue

            local filename=$(basename "$story_file")
            local errors=$(validate_story "$story_file" "$verbose")

            if [ -z "$errors" ]; then
                log_pass "$filename"
                local story_id=$(jq -r '.id' "$story_file")
                story_ids+=("$story_id")
                stories_validated+=("$story_id")
            else
                log_fail "$filename: $errors"
                validation_errors+=("$filename: $errors")
                all_passed=false
            fi
        done <<< "$story_files"
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 4: Unique story IDs
    # ─────────────────────────────────────────────────────────────────────────
    if [ ${#story_ids[@]} -gt 0 ]; then
        log_check "Story IDs are unique"

        local unique_count=$(printf '%s\n' "${story_ids[@]}" | sort -u | wc -l | tr -d ' ')
        local total_count=${#story_ids[@]}

        if [ "$unique_count" -eq "$total_count" ]; then
            log_pass "All $total_count story IDs are unique"
            checks_json=$(echo "$checks_json" | jq '.ids_unique = true')
        else
            log_fail "Duplicate story IDs detected"
            local duplicates=$(printf '%s\n' "${story_ids[@]}" | sort | uniq -d)
            log_error "  Duplicates: $duplicates"
            checks_json=$(echo "$checks_json" | jq '.ids_unique = false')
            all_passed=false
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # SUMMARY
    # ─────────────────────────────────────────────────────────────────────────
    echo ""
    echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"

    # Add stories list to checks
    if [ ${#stories_validated[@]} -gt 0 ]; then
        local stories_json=$(printf '%s\n' "${stories_validated[@]}" | jq -R . | jq -s .)
        checks_json=$(echo "$checks_json" | jq --argjson stories "$stories_json" '.stories_validated = $stories')
    fi

    checks_json=$(echo "$checks_json" | jq -c --argjson passed "$([[ "$all_passed" == "true" ]] && echo true || echo false)" '.all_passed = $passed')

    if [ "$all_passed" = "true" ]; then
        echo -e "${GREEN}${BOLD}  PHASE 0 VALIDATION: PASSED${NC}"
        echo "JSON_OUTPUT:$checks_json"
        return 0
    else
        echo -e "${RED}${BOLD}  PHASE 0 VALIDATION: FAILED${NC}"
        echo ""
        if [ ${#validation_errors[@]} -gt 0 ]; then
            log_error "Errors:"
            for err in "${validation_errors[@]}"; do
                echo -e "    ${RED}•${NC} $err"
            done
        fi
        echo "JSON_OUTPUT:$checks_json"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_ROOT=""
WAVE=""
DRY_RUN=false
VERBOSE=false
ALLOW_EMPTY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_ROOT="$2"
            shift 2
            ;;
        -w|--wave)
            WAVE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --allow-empty)
            ALLOW_EMPTY=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$PROJECT_ROOT" ]; then
    log_error "--project is required"
    exit 1
fi

if [ ! -d "$PROJECT_ROOT" ]; then
    log_error "Project directory not found: $PROJECT_ROOT"
    exit 1
fi

PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd)"

if [ -z "$WAVE" ]; then
    log_error "--wave is required"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# RUN VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
checks_result=$(run_validation "$PROJECT_ROOT" "$WAVE" "$VERBOSE" "$ALLOW_EMPTY")
validation_exit_code=$?

# Extract JSON from output (line with JSON_OUTPUT: prefix)
checks_json=$(echo "$checks_result" | grep "^JSON_OUTPUT:" | sed 's/^JSON_OUTPUT://')

# Show output without the JSON line
echo "$checks_result" | grep -v "^JSON_OUTPUT:"

if [ $validation_exit_code -eq 0 ]; then
    if [ "$DRY_RUN" = "true" ]; then
        echo ""
        log_info "Dry run - no lock file created"
    else
        # Create lock file
        echo ""
        "$SCRIPT_DIR/lock-manager.sh" create \
            --project "$PROJECT_ROOT" \
            --wave "$WAVE" \
            --phase 0 \
            --checks "$checks_json"
    fi
    exit 0
else
    echo ""
    log_error "Phase 0 validation failed - cannot proceed"
    log_info "Fix the above errors and re-run validation"
    exit 1
fi
