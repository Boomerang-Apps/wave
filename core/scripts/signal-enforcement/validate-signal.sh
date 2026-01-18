#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE SIGNAL VALIDATION SAFETY HOOK - PROJECT-AGNOSTIC
# ═══════════════════════════════════════════════════════════════════════════════
# HARD ENFORCEMENT: Validates any signal file written to .claude/
#
# USAGE (as hook):
#   ./validate-signal.sh /path/to/project/.claude/signal-wave4-gate3-fe-complete.json
#
# USAGE (with flags):
#   ./validate-signal.sh --file /path/to/signal.json
#   ./validate-signal.sh --project /path/to/project --check-all
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_usage() {
    echo "WAVE Signal Validation"
    echo ""
    echo "Usage:"
    echo "  $0 <filepath>                          # Validate single file (hook mode)"
    echo "  $0 --file <filepath>                   # Validate single file"
    echo "  $0 --project <path> --check-all        # Validate all signals in project"
    echo ""
    echo "Options:"
    echo "  -f, --file <path>       Path to signal file to validate"
    echo "  -p, --project <path>    Path to project"
    echo "  -c, --check-all         Check all signal files in project"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 /path/to/.claude/signal-wave4-gate3-fe-complete.json"
    echo "  $0 --project /path/to/project --check-all"
}

FILEPATH=""
PROJECT_ROOT=""
CHECK_ALL=false

# Handle simple positional argument (for hook usage)
if [[ $# -eq 1 && ! "$1" =~ ^- ]]; then
    FILEPATH="$1"
else
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                FILEPATH="$2"
                shift 2
                ;;
            -p|--project)
                PROJECT_ROOT="$2"
                shift 2
                ;;
            -c|--check-all)
                CHECK_ALL=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                # Assume it's a filepath if it's a path-like argument
                if [[ -f "$1" || "$1" =~ \.json$ ]]; then
                    FILEPATH="$1"
                    shift
                else
                    echo "Unknown option: $1"
                    show_usage
                    exit 1
                fi
                ;;
        esac
    done
fi

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# VALID AND FORBIDDEN PATTERNS
# ─────────────────────────────────────────────────────────────────────────────
VALID_PATTERNS=(
    "^signal-wave[0-9]+-gate0-approved\.json$"
    "^signal-wave[0-9]+-gate1-planned\.json$"
    "^signal-wave[0-9]+-gate3-fe-complete\.json$"
    "^signal-wave[0-9]+-gate3-be-complete\.json$"
    "^signal-wave[0-9]+-gate4-approved\.json$"
    "^signal-wave[0-9]+-gate4-rejected\.json$"
    "^signal-wave[0-9]+-gate4\.5-fixed\.json$"
    "^signal-wave[0-9]+-gate4\.5-retry\.json$"
    "^signal-wave[0-9]+-gate7-merge-approved\.json$"
    "^signal-wave[0-9]+-ESCALATION\.json$"
)

FORBIDDEN_PATTERNS=(
    "^signal-wave[0-9]+-gate2-.*\.json$"
    "^signal-wave[0-9]+-done\.json$"
    "^signal-wave[0-9]+-finished\.json$"
    "^signal-wave[0-9]+-complete\.json$"
)

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION FUNCTION
# ─────────────────────────────────────────────────────────────────────────────
validate_signal_file() {
    local filepath="$1"
    local filename
    filename=$(basename "$filepath")

    # Skip non-signal files
    if [[ ! "$filename" =~ ^signal-.*\.json$ ]]; then
        return 0
    fi

    # Check forbidden patterns first
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        if [[ "$filename" =~ $pattern ]]; then
            echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
            echo -e "${RED}  SIGNAL BLOCKED - FORBIDDEN NAMING PATTERN${NC}"
            echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
            echo -e "${RED}[BLOCKED]${NC} Filename: $filename"
            echo -e "${YELLOW}NOTE: Gate 2 is FORBIDDEN - use Gate 3 for development complete signals.${NC}"
            return 1
        fi
    done

    # Check valid patterns
    for pattern in "${VALID_PATTERNS[@]}"; do
        if [[ "$filename" =~ $pattern ]]; then
            echo -e "${GREEN}[VALID]${NC} Signal name accepted: $filename"
            return 0
        fi
    done

    # No valid pattern matched
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  SIGNAL BLOCKED - INVALID NAMING CONVENTION${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}[BLOCKED]${NC} Filename: $filename"
    echo -e "${YELLOW}Valid patterns:${NC}"
    echo "  Gate 0:   signal-wave{N}-gate0-approved.json"
    echo "  Gate 1:   signal-wave{N}-gate1-planned.json"
    echo "  Gate 3:   signal-wave{N}-gate3-fe-complete.json"
    echo "  Gate 3:   signal-wave{N}-gate3-be-complete.json"
    echo "  Gate 4:   signal-wave{N}-gate4-approved.json"
    echo "  Gate 4:   signal-wave{N}-gate4-rejected.json"
    echo "  Gate 4.5: signal-wave{N}-gate4.5-fixed.json"
    echo "  Gate 4.5: signal-wave{N}-gate4.5-retry.json"
    echo "  Gate 7:   signal-wave{N}-gate7-merge-approved.json"
    return 1
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

# Mode: Check all signals in project
if [[ "$CHECK_ALL" == true ]]; then
    if [[ -z "$PROJECT_ROOT" ]]; then
        echo "Error: --project is required with --check-all"
        show_usage
        exit 1
    fi

    if [[ ! -d "$PROJECT_ROOT" ]]; then
        echo "Error: Project directory not found: $PROJECT_ROOT"
        exit 1
    fi

    SIGNAL_DIR="${PROJECT_ROOT}/.claude"
    if [[ ! -d "$SIGNAL_DIR" ]]; then
        echo -e "${YELLOW}[INFO]${NC} No .claude directory found in project"
        exit 0
    fi

    echo -e "${YELLOW}[CHECK-ALL]${NC} Validating all signals in: $SIGNAL_DIR"

    errors=0
    count=0
    for signal_file in "$SIGNAL_DIR"/signal-*.json; do
        if [[ -f "$signal_file" ]]; then
            ((count++))
            if ! validate_signal_file "$signal_file"; then
                ((errors++))
            fi
        fi
    done

    echo ""
    echo -e "${YELLOW}[SUMMARY]${NC} Checked $count signal files, $errors invalid"

    if [[ $errors -gt 0 ]]; then
        exit 1
    fi
    exit 0
fi

# Mode: Validate single file
if [[ -z "$FILEPATH" ]]; then
    echo "Error: No file specified"
    show_usage
    exit 1
fi

validate_signal_file "$FILEPATH"
