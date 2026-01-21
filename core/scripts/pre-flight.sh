#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE PRE-FLIGHT VALIDATOR (Phase 0 - Generic)
# ═══════════════════════════════════════════════════════════════════════════════
# Generic pre-flight checks that run BEFORE infrastructure validation.
# Works for ANY project. Sends Slack notifications for each check.
#
# PRE-FLIGHT CHECKS:
#   1. Analyze Stories  - Validate AI stories against schema
#   2. Gap Analysis     - Check for missing coverage
#   3. Wave Planning    - Domain-based wave assignment
#   4. Green Light      - GO/NO-GO decision
#
# USAGE:
#   ./pre-flight.sh --project <path> --wave <N>
#   ./pre-flight.sh --project <path> --wave <N> --dry-run
#   ./pre-flight.sh --project <path> --wave <N> --skip-gaps
#
# CREATES:
#   .claude/locks/PREFLIGHT-wave{N}.lock
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="${WAVE_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SCRIPT_VERSION="1.0.0"

# Load environment
if [ -f "$WAVE_ROOT/.env" ]; then
    set -a
    source "$WAVE_ROOT/.env"
    set +a
fi

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_PATH=""
WAVE_NUMBER=""
DRY_RUN=false
SKIP_GAPS=false

# Check results
declare -A CHECK_RESULTS
declare -A CHECK_DETAILS
CHECKS_PASSED=0
CHECKS_FAILED=0
TOTAL_CHECKS=4

# Story data
TOTAL_STORIES=0
VALID_STORIES=0
INVALID_STORIES=0
STORY_DOMAINS=""
GAPS_FOUND=0
STORIES_GENERATED=0
WAVES_PLANNED=0
WAVE_BREAKDOWN=""
ESTIMATED_COST="0.00"
BLOCKERS=""

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[PRE-FLIGHT]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_check() { echo -e "${MAGENTA}[CHECK $1]${NC} $2"; }

# ─────────────────────────────────────────────────────────────────────────────
# SLACK NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────
notify_slack() {
    local type="$1"
    shift
    if [ -f "$SCRIPT_DIR/slack-notify.sh" ]; then
        "$SCRIPT_DIR/slack-notify.sh" "$type" "$@" 2>/dev/null || true
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 1: ANALYZE STORIES
# ─────────────────────────────────────────────────────────────────────────────
check_analyze_stories() {
    log_check "1" "Analyzing Stories..."

    local story_dir="$PROJECT_PATH/stories/wave${WAVE_NUMBER}"
    local domains=()

    # Check if story directory exists
    if [ ! -d "$story_dir" ]; then
        # Try alternate locations
        story_dir="$PROJECT_PATH/.claude/stories/wave${WAVE_NUMBER}"
        if [ ! -d "$story_dir" ]; then
            story_dir="$PROJECT_PATH/stories"
        fi
    fi

    if [ ! -d "$story_dir" ]; then
        CHECK_RESULTS[stories]="FAIL"
        CHECK_DETAILS[stories]="Story directory not found"
        BLOCKERS="${BLOCKERS}No stories found; "
        return 1
    fi

    # Count and validate stories
    local story_files=$(find "$story_dir" -name "*.json" -type f 2>/dev/null)

    for file in $story_files; do
        ((TOTAL_STORIES++)) || true

        # Validate JSON
        if ! jq empty "$file" 2>/dev/null; then
            ((INVALID_STORIES++)) || true
            continue
        fi

        # Check required fields (Schema V4)
        local has_id=$(jq -r 'has("id")' "$file" 2>/dev/null)
        local has_title=$(jq -r 'has("title")' "$file" 2>/dev/null)
        local has_domain=$(jq -r 'has("domain")' "$file" 2>/dev/null)
        local has_ac=$(jq -r 'has("acceptance_criteria")' "$file" 2>/dev/null)

        if [ "$has_id" = "true" ] && [ "$has_title" = "true" ]; then
            ((VALID_STORIES++)) || true

            # Collect domain
            local domain=$(jq -r '.domain // "UNKNOWN"' "$file" 2>/dev/null)
            if [[ ! " ${domains[*]} " =~ " ${domain} " ]]; then
                domains+=("$domain")
            fi
        else
            ((INVALID_STORIES++)) || true
        fi
    done

    STORY_DOMAINS=$(IFS=', '; echo "${domains[*]}")

    # Determine result
    if [ "$TOTAL_STORIES" -eq 0 ]; then
        CHECK_RESULTS[stories]="FAIL"
        CHECK_DETAILS[stories]="No story files found in $story_dir"
        BLOCKERS="${BLOCKERS}No stories; "
        return 1
    elif [ "$INVALID_STORIES" -gt 0 ]; then
        CHECK_RESULTS[stories]="WARN"
        CHECK_DETAILS[stories]="$INVALID_STORIES invalid stories found"
        return 0
    else
        CHECK_RESULTS[stories]="PASS"
        CHECK_DETAILS[stories]="All $VALID_STORIES stories valid"
        return 0
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 2: GAP ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────
check_gap_analysis() {
    log_check "2" "Running Gap Analysis..."

    if [ "$SKIP_GAPS" = true ]; then
        CHECK_RESULTS[gaps]="SKIP"
        CHECK_DETAILS[gaps]="Gap analysis skipped"
        return 0
    fi

    # Check for PRD file
    local prd_file=""
    local possible_prds=("$PROJECT_PATH/PRD.md" "$PROJECT_PATH/docs/PRD.md" "$PROJECT_PATH/README.md")

    for prd in "${possible_prds[@]}"; do
        if [ -f "$prd" ]; then
            prd_file="$prd"
            break
        fi
    done

    if [ -z "$prd_file" ]; then
        CHECK_RESULTS[gaps]="PASS"
        CHECK_DETAILS[gaps]="No PRD found - skipping detailed gap analysis"
        GAPS_FOUND=0
        return 0
    fi

    # Simple gap detection: check for common domains not covered
    local common_domains=("authentication" "user" "api" "database" "ui" "testing")
    local covered_domains=$(echo "$STORY_DOMAINS" | tr '[:upper:]' '[:lower:]')

    for domain in "${common_domains[@]}"; do
        if [[ ! "$covered_domains" =~ "$domain" ]]; then
            # Check if domain is mentioned in PRD
            if grep -qi "$domain" "$prd_file" 2>/dev/null; then
                ((GAPS_FOUND++)) || true
            fi
        fi
    done

    if [ "$GAPS_FOUND" -gt 0 ]; then
        CHECK_RESULTS[gaps]="WARN"
        CHECK_DETAILS[gaps]="$GAPS_FOUND potential gaps found - consider adding stories"
    else
        CHECK_RESULTS[gaps]="PASS"
        CHECK_DETAILS[gaps]="No significant gaps detected"
    fi

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 3: WAVE PLANNING
# ─────────────────────────────────────────────────────────────────────────────
check_wave_planning() {
    log_check "3" "Planning Waves..."

    # Group stories by domain
    local story_dir="$PROJECT_PATH/stories/wave${WAVE_NUMBER}"
    if [ ! -d "$story_dir" ]; then
        story_dir="$PROJECT_PATH/.claude/stories/wave${WAVE_NUMBER}"
        if [ ! -d "$story_dir" ]; then
            story_dir="$PROJECT_PATH/stories"
        fi
    fi

    declare -A domain_counts=()
    local story_files=$(find "$story_dir" -name "*.json" -type f 2>/dev/null || true)

    if [ -n "$story_files" ]; then
        for file in $story_files; do
            local domain=$(jq -r '.domain // "UNKNOWN"' "$file" 2>/dev/null | tr '[:lower:]' '[:upper:]')
            if [ -n "$domain" ]; then
                domain_counts[$domain]=$(( ${domain_counts[$domain]:-0} + 1 ))
            fi
        done
    fi

    # Calculate waves needed (max 5 stories per wave recommended)
    local total_stories=$VALID_STORIES
    WAVES_PLANNED=$(( (total_stories + 4) / 5 ))
    [ "$WAVES_PLANNED" -eq 0 ] && WAVES_PLANNED=1

    # Build breakdown
    WAVE_BREAKDOWN=""
    if [ ${#domain_counts[@]} -gt 0 ]; then
        for domain in "${!domain_counts[@]}"; do
            WAVE_BREAKDOWN="${WAVE_BREAKDOWN}${domain}: ${domain_counts[$domain]} stories, "
        done
        WAVE_BREAKDOWN="${WAVE_BREAKDOWN%, }"
    else
        WAVE_BREAKDOWN="No domain breakdown available"
    fi

    # Estimate cost (based on $0.50 per story average)
    ESTIMATED_COST=$(echo "scale=2; $total_stories * 0.50" | bc 2>/dev/null || echo "0.00")

    if [ "$WAVES_PLANNED" -gt 0 ]; then
        CHECK_RESULTS[planning]="PASS"
        CHECK_DETAILS[planning]="$WAVES_PLANNED wave(s) planned with $VALID_STORIES stories"
    else
        CHECK_RESULTS[planning]="FAIL"
        CHECK_DETAILS[planning]="Cannot plan waves - no valid stories"
        BLOCKERS="${BLOCKERS}No wave plan; "
        return 1
    fi

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK 4: GREEN LIGHT
# ─────────────────────────────────────────────────────────────────────────────
check_green_light() {
    log_check "4" "Green Light Decision..."

    # Count results
    for check in stories gaps planning; do
        case "${CHECK_RESULTS[$check]:-FAIL}" in
            PASS|WARN|SKIP) ((CHECKS_PASSED++)) || true ;;
            FAIL) ((CHECKS_FAILED++)) || true ;;
        esac
    done

    # Make decision
    if [ "$CHECKS_FAILED" -eq 0 ] && [ "$VALID_STORIES" -gt 0 ]; then
        CHECK_RESULTS[greenlight]="GO"
        CHECK_DETAILS[greenlight]="All checks passed - ready for launch"
        ((CHECKS_PASSED++)) || true
        return 0
    else
        CHECK_RESULTS[greenlight]="NO-GO"
        CHECK_DETAILS[greenlight]="Blockers: ${BLOCKERS:-None identified}"
        ((CHECKS_FAILED++)) || true
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# RUN ALL CHECKS
# ─────────────────────────────────────────────────────────────────────────────
run_preflight() {
    local project_name=$(basename "$PROJECT_PATH")

    echo ""
    echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║           WAVE PRE-FLIGHT SEQUENCE (Phase 0)                  ║${NC}"
    echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Project: ${CYAN}$project_name${NC}"
    echo -e "  Wave:    ${CYAN}$WAVE_NUMBER${NC}"
    echo -e "  Mode:    ${CYAN}$([ "$DRY_RUN" = true ] && echo "DRY-RUN" || echo "ENFORCE")${NC}"
    echo ""

    # Send start notification
    notify_slack preflight_start "$project_name" "$TOTAL_CHECKS"

    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Check 1: Analyze Stories
    if check_analyze_stories; then
        log_pass "Stories: $VALID_STORIES valid, $INVALID_STORIES invalid"
    else
        log_fail "Stories: ${CHECK_DETAILS[stories]}"
    fi
    notify_slack preflight_stories \
        "${CHECK_RESULTS[stories]}" \
        "$TOTAL_STORIES" \
        "$VALID_STORIES" \
        "$INVALID_STORIES" \
        "$STORY_DOMAINS"
    echo ""

    # Check 2: Gap Analysis
    if check_gap_analysis; then
        log_pass "Gaps: ${CHECK_DETAILS[gaps]}"
    else
        log_warn "Gaps: ${CHECK_DETAILS[gaps]}"
    fi
    notify_slack preflight_gaps \
        "${CHECK_RESULTS[gaps]}" \
        "$GAPS_FOUND" \
        "$STORIES_GENERATED" \
        "${CHECK_DETAILS[gaps]}"
    echo ""

    # Check 3: Wave Planning
    if check_wave_planning; then
        log_pass "Planning: $WAVES_PLANNED wave(s), ~\$$ESTIMATED_COST estimated"
    else
        log_fail "Planning: ${CHECK_DETAILS[planning]}"
    fi
    notify_slack preflight_waves \
        "${CHECK_RESULTS[planning]}" \
        "$WAVES_PLANNED" \
        "$WAVE_BREAKDOWN" \
        "$ESTIMATED_COST"
    echo ""

    # Check 4: Green Light
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    check_green_light

    if [ "${CHECK_RESULTS[greenlight]}" = "GO" ]; then
        echo ""
        echo -e "  ${GREEN}${BOLD}🟢 GREEN LIGHT - GO FOR LAUNCH${NC}"
        echo ""
        notify_slack preflight_greenlight "GO" "$CHECKS_PASSED" "$TOTAL_CHECKS" "None"
    else
        echo ""
        echo -e "  ${RED}${BOLD}🔴 RED LIGHT - LAUNCH BLOCKED${NC}"
        echo -e "  ${RED}Blockers: ${BLOCKERS:-Unknown}${NC}"
        echo ""
        notify_slack preflight_greenlight "NO-GO" "$CHECKS_PASSED" "$TOTAL_CHECKS" "${BLOCKERS:-Unknown}"
    fi

    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  Passed: ${GREEN}$CHECKS_PASSED${NC} | Failed: ${RED}$CHECKS_FAILED${NC} | Total: $TOTAL_CHECKS"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# CREATE LOCK FILE
# ─────────────────────────────────────────────────────────────────────────────
create_lock_file() {
    local lock_dir="$PROJECT_PATH/.claude/locks"
    local lock_file="$lock_dir/PHASE0-wave${WAVE_NUMBER}.lock"

    mkdir -p "$lock_dir"

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local checksum=$(find "$PROJECT_PATH/stories" -name "*.json" -type f 2>/dev/null | xargs cat 2>/dev/null | sha256sum | cut -d' ' -f1 || echo "no-stories")

    cat > "$lock_file" << EOF
{
    "phase": 0,
    "phase_name": "Pre-Flight",
    "wave": $WAVE_NUMBER,
    "status": "PASSED",
    "greenlight": "${CHECK_RESULTS[greenlight]}",
    "validator": "pre-flight.sh",
    "validator_version": "$SCRIPT_VERSION",
    "checks": {
        "stories": {
            "status": "${CHECK_RESULTS[stories]:-FAIL}",
            "total": $TOTAL_STORIES,
            "valid": $VALID_STORIES,
            "invalid": $INVALID_STORIES,
            "domains": "$STORY_DOMAINS"
        },
        "gaps": {
            "status": "${CHECK_RESULTS[gaps]:-FAIL}",
            "gaps_found": $GAPS_FOUND,
            "generated": $STORIES_GENERATED
        },
        "planning": {
            "status": "${CHECK_RESULTS[planning]:-FAIL}",
            "waves": $WAVES_PLANNED,
            "estimated_cost": "$ESTIMATED_COST"
        },
        "greenlight": {
            "status": "${CHECK_RESULTS[greenlight]:-NO-GO}",
            "blockers": "${BLOCKERS:-None}"
        }
    },
    "checks_passed": $CHECKS_PASSED,
    "checks_failed": $CHECKS_FAILED,
    "checksum": "$checksum",
    "timestamp": "$timestamp",
    "project_path": "$PROJECT_PATH"
}
EOF

    log_pass "Lock file created: $lock_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE Pre-Flight Validator (Phase 0 - Generic)

Generic pre-flight checks that run BEFORE infrastructure validation.
Works for ANY project.

Usage: pre-flight.sh [options]

Required:
  -p, --project <path>    Project directory path
  -w, --wave <number>     Wave number to validate

Optional:
  --dry-run               Run checks but don't create lock file
  --skip-gaps             Skip gap analysis check
  -h, --help              Show this help

Pre-Flight Checks:
  1. Analyze Stories  - Validate AI stories against schema
  2. Gap Analysis     - Check for missing coverage against PRD
  3. Wave Planning    - Domain-based wave assignment
  4. Green Light      - GO/NO-GO decision

Examples:
  ./pre-flight.sh --project /path/to/project --wave 1
  ./pre-flight.sh --project /path/to/project --wave 3 --dry-run
  ./pre-flight.sh --project /path/to/project --wave 2 --skip-gaps

EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--project)
                PROJECT_PATH="$2"
                shift 2
                ;;
            -w|--wave)
                WAVE_NUMBER="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-gaps)
                SKIP_GAPS=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    if [ -z "$PROJECT_PATH" ] || [ -z "$WAVE_NUMBER" ]; then
        echo "ERROR: --project and --wave are required"
        show_usage
        exit 1
    fi

    if [ ! -d "$PROJECT_PATH" ]; then
        echo "ERROR: Project path does not exist: $PROJECT_PATH"
        exit 1
    fi
}

main() {
    parse_args "$@"

    # Run pre-flight checks
    run_preflight

    # Create lock file if passed and not dry-run
    if [ "${CHECK_RESULTS[greenlight]}" = "GO" ]; then
        if [ "$DRY_RUN" = true ]; then
            log_warn "DRY-RUN: Lock file NOT created"
        else
            create_lock_file
        fi
        log_pass "PRE-FLIGHT COMPLETE - Ready for Infrastructure (Phase 1)"
        exit 0
    else
        log_fail "PRE-FLIGHT FAILED - Fix blockers before proceeding"
        exit 1
    fi
}

main "$@"
