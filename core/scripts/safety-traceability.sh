#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE SAFETY TRACEABILITY MATRIX GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════
# Generates audit artifact showing safety coverage across stories.
# Links stories to safety controls, forbidden operations, and behavioral probes.
#
# Usage:
#   ./safety-traceability.sh [PROJECT_PATH] [OPTIONS]
#
# Options:
#   --wave=N              Generate for specific wave (default: all)
#   --format=FORMAT       Output format: json, markdown, html (default: json)
#   --output=PATH         Output file path (default: .claude/reports/)
#
# Output:
#   .claude/reports/safety-traceability.json
#   .claude/reports/safety-traceability.md
#
# ═══════════════════════════════════════════════════════════════════════════════

set -o pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-.}"

if [[ "$PROJECT_ROOT" == --* ]]; then
    PROJECT_ROOT="."
fi

PROJECT_ROOT=$(cd "$PROJECT_ROOT" 2>/dev/null && pwd || echo "$PROJECT_ROOT")
WAVE_ROOT="${WAVE_ROOT:-$(dirname $(dirname "$SCRIPT_DIR"))}"
STORIES_DIR="$PROJECT_ROOT/.claudecode/stories"
REPORTS_DIR="$PROJECT_ROOT/.claude/reports"
SAFETY_DIR="$WAVE_ROOT/core/safety"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Defaults
WAVE_FILTER=""
OUTPUT_FORMAT="json"
OUTPUT_PATH=""

# Parse flags
for arg in "$@"; do
    case $arg in
        --wave=*) WAVE_FILTER="${arg#*=}" ;;
        --format=*) OUTPUT_FORMAT="${arg#*=}" ;;
        --output=*) OUTPUT_PATH="${arg#*=}" ;;
        --help|-h)
            echo "Usage: $0 [PROJECT_PATH] [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --wave=N        Generate for specific wave"
            echo "  --format=FMT    Output format: json, markdown, html"
            echo "  --output=PATH   Output file path"
            exit 0
            ;;
    esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

check_dependencies() {
    if ! command -v jq &>/dev/null; then
        echo "ERROR: jq is required" >&2
        exit 1
    fi
}

# Get all stories from project
get_stories() {
    local stories=()

    # Check for wave directories
    for wave_dir in "$STORIES_DIR"/wave*; do
        if [ -d "$wave_dir" ]; then
            local wave_num=$(basename "$wave_dir" | sed 's/wave//')

            # Apply wave filter if set
            if [ -n "$WAVE_FILTER" ] && [ "$wave_num" != "$WAVE_FILTER" ]; then
                continue
            fi

            for story_file in "$wave_dir"/*.json; do
                if [ -f "$story_file" ]; then
                    echo "$story_file"
                fi
            done
        fi
    done
}

# Extract safety-relevant info from a story
analyze_story() {
    local story_file="$1"

    if [ ! -f "$story_file" ]; then
        echo "{}"
        return
    fi

    jq -c '{
        id: .id,
        title: .title,
        wave: (.wave // 1),
        risk: (.risk // "low"),
        approval_required: (.approval_required // "L0"),
        safety_tags: (.safety_tags // []),
        requires_review: (.requires_review // false),
        acceptance_criteria: (.acceptance_criteria // []),
        forbidden_operations: (
            if .forbidden_operations then .forbidden_operations
            else []
            end
        )
    }' "$story_file" 2>/dev/null || echo "{}"
}

# Get behavioral probes from safety directory
get_probes() {
    local probes_file="$SAFETY_DIR/behavioral-probes.json"

    if [ -f "$probes_file" ]; then
        jq -c '.probes // []' "$probes_file" 2>/dev/null || echo "[]"
    else
        echo "[]"
    fi
}

# Get FMEA forbidden operations
get_forbidden_operations() {
    local fmea_file="$WAVE_ROOT/docs/FMEA.md"
    local forbidden=()

    # Default forbidden operations (if FMEA not found)
    forbidden=(
        "delete_env_files"
        "force_push_main"
        "expose_secrets"
        "modify_safety_rules"
        "bypass_gates"
        "cross_domain_access"
        "exceed_budget"
        "access_other_agent_memory"
    )

    printf '%s\n' "${forbidden[@]}" | jq -R -s 'split("\n") | map(select(length > 0))'
}

# ─────────────────────────────────────────────────────────────────────────────
# TRACEABILITY GENERATION
# ─────────────────────────────────────────────────────────────────────────────

generate_traceability() {
    local stories=()
    local probes=$(get_probes)
    local forbidden_ops=$(get_forbidden_operations)

    # Collect all stories
    while IFS= read -r story_file; do
        local story_data=$(analyze_story "$story_file")
        if [ "$story_data" != "{}" ]; then
            stories+=("$story_data")
        fi
    done < <(get_stories)

    # Calculate coverage metrics
    local total_stories=${#stories[@]}
    local stories_with_risk=0
    local stories_with_tags=0
    local stories_requiring_review=0
    local critical_stories=0
    local high_stories=0

    for story in "${stories[@]}"; do
        local risk=$(echo "$story" | jq -r '.risk')
        local tags=$(echo "$story" | jq '.safety_tags | length')
        local review=$(echo "$story" | jq -r '.requires_review')

        [ "$risk" != "low" ] && ((stories_with_risk++))
        [ "$tags" -gt 0 ] && ((stories_with_tags++))
        [ "$review" = "true" ] && ((stories_requiring_review++))
        [ "$risk" = "critical" ] && ((critical_stories++))
        [ "$risk" = "high" ] && ((high_stories++))
    done

    # Build traceability matrix
    local matrix=()
    local probe_count=$(echo "$probes" | jq 'length')

    for story in "${stories[@]}"; do
        local story_id=$(echo "$story" | jq -r '.id')
        local story_tags=$(echo "$story" | jq -c '.safety_tags')
        local story_risk=$(echo "$story" | jq -r '.risk')

        # Find applicable probes for this story
        local applicable_probes=$(echo "$probes" | jq -c --arg tags "$story_tags" '
            [.[] | select(
                (.applicable_agents == null) or
                (.category == "forbidden_operation")
            ) | {id: .id, name: .name, category: .category}]
        ')

        # Create matrix entry
        matrix+=("{\"story_id\":\"$story_id\",\"risk\":\"$story_risk\",\"safety_tags\":$story_tags,\"applicable_probes\":$applicable_probes}")
    done

    # Generate report
    local report=$(cat <<EOF
{
  "safety_traceability_report": {
    "generated_at": "$TIMESTAMP",
    "project": "$PROJECT_ROOT",
    "wave_filter": ${WAVE_FILTER:-null},
    "summary": {
      "total_stories": $total_stories,
      "stories_with_risk_classification": $stories_with_risk,
      "stories_with_safety_tags": $stories_with_tags,
      "stories_requiring_review": $stories_requiring_review,
      "critical_risk_stories": $critical_stories,
      "high_risk_stories": $high_stories,
      "behavioral_probes_defined": $probe_count,
      "coverage_percent": $(echo "scale=1; ($stories_with_tags * 100) / ($total_stories + 1)" | bc 2>/dev/null || echo "0")
    },
    "risk_distribution": {
      "critical": $critical_stories,
      "high": $high_stories,
      "medium": $(echo "${stories[@]}" | tr ' ' '\n' | grep -c '"risk":"medium"' || echo 0),
      "low": $(echo "${stories[@]}" | tr ' ' '\n' | grep -c '"risk":"low"' || echo 0)
    },
    "forbidden_operations": $forbidden_ops,
    "stories": [$(IFS=,; echo "${stories[*]}")],
    "traceability_matrix": [$(IFS=,; echo "${matrix[*]}")]
  }
}
EOF
)

    echo "$report" | jq '.'
}

# Generate markdown report
generate_markdown() {
    local json_report="$1"

    cat <<EOF
# Safety Traceability Matrix

**Generated:** $(date)
**Project:** $PROJECT_ROOT

---

## Summary

| Metric | Value |
|--------|-------|
| Total Stories | $(echo "$json_report" | jq '.safety_traceability_report.summary.total_stories') |
| With Risk Classification | $(echo "$json_report" | jq '.safety_traceability_report.summary.stories_with_risk_classification') |
| With Safety Tags | $(echo "$json_report" | jq '.safety_traceability_report.summary.stories_with_safety_tags') |
| Requiring Review | $(echo "$json_report" | jq '.safety_traceability_report.summary.stories_requiring_review') |
| Behavioral Probes | $(echo "$json_report" | jq '.safety_traceability_report.summary.behavioral_probes_defined') |

## Risk Distribution

| Risk Level | Count |
|------------|-------|
| Critical | $(echo "$json_report" | jq '.safety_traceability_report.risk_distribution.critical') |
| High | $(echo "$json_report" | jq '.safety_traceability_report.risk_distribution.high') |
| Medium | $(echo "$json_report" | jq '.safety_traceability_report.risk_distribution.medium') |
| Low | $(echo "$json_report" | jq '.safety_traceability_report.risk_distribution.low') |

## Forbidden Operations

The following operations are prohibited across all agents:

$(echo "$json_report" | jq -r '.safety_traceability_report.forbidden_operations[]' | while read op; do
    echo "- \`$op\`"
done)

## Story-Safety Traceability Matrix

| Story ID | Risk | Safety Tags | Applicable Probes |
|----------|------|-------------|-------------------|
$(echo "$json_report" | jq -r '.safety_traceability_report.traceability_matrix[] | "| \(.story_id) | \(.risk) | \(.safety_tags | join(", ")) | \(.applicable_probes | length) probes |"')

---

*Generated by WAVE Safety Traceability Generator*
EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

main() {
    check_dependencies

    mkdir -p "$REPORTS_DIR"

    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    WAVE SAFETY TRACEABILITY GENERATOR                         ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Project:    $PROJECT_ROOT"
    echo "  Wave:       ${WAVE_FILTER:-all}"
    echo "  Format:     $OUTPUT_FORMAT"
    echo "  Timestamp:  $TIMESTAMP"
    echo ""

    log "${BLUE}Generating traceability matrix...${NC}"

    local json_report=$(generate_traceability)

    # Save JSON report
    local json_output="${OUTPUT_PATH:-$REPORTS_DIR/safety-traceability.json}"
    echo "$json_report" > "$json_output"
    log "${GREEN}[SAVED]${NC} JSON report: $json_output"

    # Generate additional format if requested
    if [ "$OUTPUT_FORMAT" = "markdown" ] || [ "$OUTPUT_FORMAT" = "md" ]; then
        local md_output="${OUTPUT_PATH:-$REPORTS_DIR/safety-traceability.md}"
        md_output="${md_output%.json}.md"
        generate_markdown "$json_report" > "$md_output"
        log "${GREEN}[SAVED]${NC} Markdown report: $md_output"
    fi

    # Print summary
    echo ""
    log "═══════════════════════════════════════════════════════════════════════════════"
    log "SUMMARY"
    log "═══════════════════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Total Stories:      $(echo "$json_report" | jq '.safety_traceability_report.summary.total_stories')"
    echo "  With Risk Class:    $(echo "$json_report" | jq '.safety_traceability_report.summary.stories_with_risk_classification')"
    echo "  With Safety Tags:   $(echo "$json_report" | jq '.safety_traceability_report.summary.stories_with_safety_tags')"
    echo "  Requiring Review:   $(echo "$json_report" | jq '.safety_traceability_report.summary.stories_requiring_review')"
    echo "  Critical Stories:   $(echo "$json_report" | jq '.safety_traceability_report.summary.critical_risk_stories')"
    echo ""
    log "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    log "${GREEN} TRACEABILITY MATRIX GENERATED${NC}"
    log "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
}

main "$@"
