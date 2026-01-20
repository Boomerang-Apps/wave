#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE BUILDING BLOCKS: PHASE 0 VALIDATOR (Stories)
# ═══════════════════════════════════════════════════════════════════════════════
# Validates that AI Stories conform to Schema V4 before any work begins.
# Creates PHASE0 lock file upon successful validation.
#
# SCHEMA V4 ENFORCEMENT (HARD):
#   Required fields: id, title, domain, objective, acceptance_criteria, files, safety
#
# VALIDATION CHECKS:
#   1. Story directory exists
#   2. At least 1 story file for the wave
#   3. All story files are valid JSON
#   4. Schema V4 required fields present
#   5. ID format matches pattern (WAVE#-XX-### or XXX-XX-###)
#   6. Title starts with action verb
#   7. Objective has as_a/i_want/so_that
#   8. Acceptance criteria has minimum 3 items with AC-### IDs
#   9. Files section includes forbidden list
#  10. Safety section includes stop_conditions
#  11. Story IDs are unique
#
# USAGE:
#   ./phase0-validator.sh --project <path> --wave <N>
#   ./phase0-validator.sh --project <path> --wave <N> --dry-run
#   ./phase0-validator.sh --project <path> --wave <N> --lenient  # Skip strict validation
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="${WAVE_ROOT:-$(dirname $(dirname $(dirname "$SCRIPT_DIR")))}"
SCRIPT_VERSION="2.0.0"

# Schema file location
SCHEMA_FILE="$WAVE_ROOT/.claudecode/stories/ai-story-schema-v4.json"

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

Validates AI Stories against Schema V4 before development begins.
HARD ENFORCEMENT: Stories must conform to Schema V4 structure.

Usage: phase0-validator.sh [options]

Required Options:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number to validate

Optional:
  --dry-run               Check without creating lock file
  --verbose               Show detailed validation output
  --allow-empty           Allow wave with no stories (for testing)
  --lenient               Downgrade schema errors to warnings (not recommended)

Schema V4 Required Fields:
  - id                    Story ID (WAVE#-XX-### or XXX-XX-###)
  - title                 Action-oriented title (Create, Add, Update, etc.)
  - domain                Business domain (auth, client, payment, etc.)
  - objective             User story (as_a, i_want, so_that)
  - acceptance_criteria   At least 3 items with AC-### IDs
  - files                 Including files.forbidden list
  - safety                Including safety.stop_conditions (min 3)

Exit Codes:
  0  - All checks passed, lock created
  1  - Validation failed

Examples:
  # Validate wave 3 stories (strict)
  ./phase0-validator.sh -p /path/to/project -w 3

  # Verbose output
  ./phase0-validator.sh -p /path/to/project -w 3 --verbose

  # Lenient mode (warnings only)
  ./phase0-validator.sh -p /path/to/project -w 3 --lenient

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMA V4 REQUIRED FIELDS (HARD ENFORCEMENT)
# ─────────────────────────────────────────────────────────────────────────────
# Top-level required fields
REQUIRED_FIELDS=("id" "title" "domain" "objective" "acceptance_criteria" "files" "safety")

# Valid action verbs for title
VALID_TITLE_VERBS="^(Create|Add|Update|Fix|Remove|Implement|Configure|Enable|Disable|Refactor|Migrate|Build|Setup|Initialize|Delete|Modify|Connect|Integrate)"

# Valid domains from schema
VALID_DOMAINS="auth|client|pilot|project|proposal|messaging|payment|deliverables|admin|layout|general|public"

# ID patterns (either format accepted)
ID_PATTERN_WAVE="^WAVE[0-9]+-[A-Z]+-[0-9]+$"
ID_PATTERN_DOMAIN="^[A-Z]+-[A-Z]+-[0-9]{3}$"

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
# VALIDATE SINGLE STORY (SCHEMA V4 HARD ENFORCEMENT)
# ─────────────────────────────────────────────────────────────────────────────
validate_story() {
    local story_file=$1
    local verbose=$2
    local lenient=$3
    local errors=()
    local warnings=()

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 1: Valid JSON
    # ─────────────────────────────────────────────────────────────────────────
    if ! jq empty "$story_file" 2>/dev/null; then
        errors+=("Invalid JSON syntax")
        [ "$verbose" = "true" ] && log_fail "Invalid JSON: $story_file"
        echo "${errors[*]}"
        return 1
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 2: Required top-level fields
    # ─────────────────────────────────────────────────────────────────────────
    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! jq -e ".$field" "$story_file" >/dev/null 2>&1; then
            errors+=("Missing required field: $field")
            [ "$verbose" = "true" ] && log_fail "Missing '$field'"
        fi
    done

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 3: ID format validation
    # ─────────────────────────────────────────────────────────────────────────
    local story_id=$(jq -r '.id // ""' "$story_file")
    if [ -z "$story_id" ]; then
        errors+=("Empty story ID")
    elif [[ ! "$story_id" =~ $ID_PATTERN_WAVE ]] && [[ ! "$story_id" =~ $ID_PATTERN_DOMAIN ]]; then
        errors+=("Invalid ID format: '$story_id' (expected WAVE#-XX-### or XXX-XX-###)")
        [ "$verbose" = "true" ] && log_fail "ID '$story_id' doesn't match pattern"
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 4: Title format (must start with action verb)
    # ─────────────────────────────────────────────────────────────────────────
    local title=$(jq -r '.title // ""' "$story_file")
    if [ -n "$title" ]; then
        if [[ ! "$title" =~ $VALID_TITLE_VERBS ]]; then
            errors+=("Title must start with action verb (Create, Add, Update, Fix, etc.)")
            [ "$verbose" = "true" ] && log_fail "Title '$title' doesn't start with action verb"
        fi
        local title_len=${#title}
        if [ "$title_len" -lt 10 ]; then
            errors+=("Title too short (min 10 chars, got $title_len)")
        elif [ "$title_len" -gt 100 ]; then
            errors+=("Title too long (max 100 chars, got $title_len)")
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 5: Domain validation
    # ─────────────────────────────────────────────────────────────────────────
    local domain=$(jq -r '.domain // ""' "$story_file")
    if [ -n "$domain" ]; then
        if [[ ! "$domain" =~ ^($VALID_DOMAINS)$ ]]; then
            warnings+=("Non-standard domain: '$domain'")
            [ "$verbose" = "true" ] && log_warn "Domain '$domain' not in standard list"
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 6: Objective structure (as_a, i_want, so_that)
    # ─────────────────────────────────────────────────────────────────────────
    if jq -e '.objective' "$story_file" >/dev/null 2>&1; then
        local has_as_a=$(jq -e '.objective.as_a' "$story_file" 2>/dev/null && echo "yes" || echo "no")
        local has_i_want=$(jq -e '.objective.i_want' "$story_file" 2>/dev/null && echo "yes" || echo "no")
        local has_so_that=$(jq -e '.objective.so_that' "$story_file" 2>/dev/null && echo "yes" || echo "no")

        if [ "$has_as_a" != "yes" ]; then
            errors+=("Missing objective.as_a")
            [ "$verbose" = "true" ] && log_fail "Missing objective.as_a"
        fi
        if [ "$has_i_want" != "yes" ]; then
            errors+=("Missing objective.i_want")
            [ "$verbose" = "true" ] && log_fail "Missing objective.i_want"
        fi
        if [ "$has_so_that" != "yes" ]; then
            errors+=("Missing objective.so_that")
            [ "$verbose" = "true" ] && log_fail "Missing objective.so_that"
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 7: Acceptance criteria (minimum 3, with AC-### IDs)
    # ─────────────────────────────────────────────────────────────────────────
    if jq -e '.acceptance_criteria' "$story_file" >/dev/null 2>&1; then
        local ac_count=$(jq '.acceptance_criteria | length' "$story_file" 2>/dev/null || echo 0)
        if [ "$ac_count" -lt 3 ]; then
            errors+=("Acceptance criteria must have at least 3 items (found $ac_count)")
            [ "$verbose" = "true" ] && log_fail "Only $ac_count acceptance criteria (min 3)"
        fi

        # Check if AC items are objects (Schema V4) or strings (legacy)
        local first_ac_type=$(jq -r '.acceptance_criteria[0] | type' "$story_file" 2>/dev/null || echo "unknown")

        if [ "$first_ac_type" = "object" ]; then
            # Schema V4 format: objects with id/description
            local ac_with_id=$(jq '[.acceptance_criteria[] | select(type == "object" and .id != null and .description != null)] | length' "$story_file" 2>/dev/null || echo 0)
            if [ "$ac_with_id" -lt "$ac_count" ]; then
                errors+=("Each acceptance_criteria must have 'id' and 'description' fields")
                [ "$verbose" = "true" ] && log_fail "Some acceptance criteria missing id/description"
            fi

            # Validate AC ID format (AC-###)
            local invalid_ac_ids=$(jq -r '.acceptance_criteria[] | select(type == "object") | .id // "missing" | select(test("^AC-[0-9]+$") | not)' "$story_file" 2>/dev/null | head -3)
            if [ -n "$invalid_ac_ids" ]; then
                errors+=("Acceptance criteria IDs must match AC-### format")
                [ "$verbose" = "true" ] && log_fail "Invalid AC IDs found"
            fi
        elif [ "$first_ac_type" = "string" ]; then
            # Legacy format: array of strings - not Schema V4 compliant
            errors+=("Acceptance criteria must be objects with 'id' and 'description' (found strings)")
            [ "$verbose" = "true" ] && log_fail "AC items are strings, not objects (Schema V4 requires objects)"
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 8: Files section (must have forbidden list)
    # ─────────────────────────────────────────────────────────────────────────
    if jq -e '.files' "$story_file" >/dev/null 2>&1; then
        if ! jq -e '.files.forbidden' "$story_file" >/dev/null 2>&1; then
            errors+=("Missing files.forbidden (required for safety)")
            [ "$verbose" = "true" ] && log_fail "Missing files.forbidden"
        else
            local forbidden_count=$(jq '.files.forbidden | length' "$story_file")
            if [ "$forbidden_count" -lt 1 ]; then
                errors+=("files.forbidden must have at least 1 entry")
                [ "$verbose" = "true" ] && log_fail "files.forbidden is empty"
            fi
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # CHECK 9: Safety section (must have stop_conditions)
    # ─────────────────────────────────────────────────────────────────────────
    if jq -e '.safety' "$story_file" >/dev/null 2>&1; then
        if ! jq -e '.safety.stop_conditions' "$story_file" >/dev/null 2>&1; then
            errors+=("Missing safety.stop_conditions")
            [ "$verbose" = "true" ] && log_fail "Missing safety.stop_conditions"
        else
            local stop_count=$(jq '.safety.stop_conditions | length' "$story_file")
            if [ "$stop_count" -lt 3 ]; then
                errors+=("safety.stop_conditions must have at least 3 entries (found $stop_count)")
                [ "$verbose" = "true" ] && log_fail "Only $stop_count stop conditions (min 3)"
            fi
        fi
    fi

    # ─────────────────────────────────────────────────────────────────────────
    # RESULT
    # ─────────────────────────────────────────────────────────────────────────
    # In lenient mode, convert errors to warnings
    if [ "$lenient" = "true" ]; then
        for err in "${errors[@]}"; do
            warnings+=("$err")
        done
        errors=()
    fi

    # Show warnings
    if [ "$verbose" = "true" ] && [ ${#warnings[@]} -gt 0 ]; then
        for warn in "${warnings[@]}"; do
            log_warn "$warn"
        done
    fi

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
    local lenient=$5

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
    echo -e "  ${BOLD}Schema:${NC}  V4 (Hard Enforcement)"
    if [ "$lenient" = "true" ]; then
        echo -e "  ${YELLOW}${BOLD}Mode:${NC}    ${YELLOW}LENIENT (errors → warnings)${NC}"
    else
        echo -e "  ${BOLD}Mode:${NC}    STRICT (all checks enforced)"
    fi
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
            local errors=$(validate_story "$story_file" "$verbose" "$lenient")

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
LENIENT=false

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
        --lenient)
            LENIENT=true
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
checks_result=$(run_validation "$PROJECT_ROOT" "$WAVE" "$VERBOSE" "$ALLOW_EMPTY" "$LENIENT")
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
