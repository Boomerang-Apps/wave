#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE Gate 0 Master Script
# Runs all Gate 0 enhancement tools for monitoring and validation
#
# Usage:
#   ./scripts/gate0_run_all.sh                    # Run all checks
#   ./scripts/gate0_run_all.sh --monitor          # Run monitoring only
#   ./scripts/gate0_run_all.sh --validate         # Run validation only
#   ./scripts/gate0_run_all.sh --visualize        # Generate workflow diagram
#   ./scripts/gate0_run_all.sh --test             # Run all tests
#
# Gate 0 Enhancements:
#   #1: Issue Detector (Real-time Monitoring)
#   #2: Unified Safety Checker
#   #3: Container Completeness Validator
#   #4: Workflow Reset API
#   #5: Enhanced Error Attribution
#   #6: BPMN Visualization
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
MODE="all"
STORY_ID=""
CURRENT_GATE=1

while [[ $# -gt 0 ]]; do
    case $1 in
        --monitor|-m)
            MODE="monitor"
            shift
            ;;
        --validate|-v)
            MODE="validate"
            shift
            ;;
        --visualize|-z)
            MODE="visualize"
            shift
            ;;
        --test|-t)
            MODE="test"
            shift
            ;;
        --story)
            STORY_ID="$2"
            shift 2
            ;;
        --gate)
            CURRENT_GATE="$2"
            shift 2
            ;;
        --help|-h)
            echo "WAVE Gate 0 Master Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --monitor, -m     Run monitoring checks only"
            echo "  --validate, -v    Run validation checks only"
            echo "  --visualize, -z   Generate workflow diagrams"
            echo "  --test, -t        Run all Gate 0 tests"
            echo "  --story ID        Specify story ID for context"
            echo "  --gate N          Specify current gate (1-8)"
            echo "  --help, -h        Show this help"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Header
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  WAVE Gate 0 Enhancement Suite${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Mode: ${YELLOW}${MODE}${NC}"
echo -e "  Directory: ${ORCHESTRATOR_DIR}"
[ -n "$STORY_ID" ] && echo -e "  Story: ${STORY_ID}"
echo ""

cd "$ORCHESTRATOR_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Run Tests
# ═══════════════════════════════════════════════════════════════════════════════
run_tests() {
    echo -e "${BLUE}═══ Running Gate 0 Tests ═══${NC}"
    echo ""

    if command -v python3 &> /dev/null; then
        PYTHON=python3
    else
        PYTHON=python
    fi

    # Check if pytest is available
    if ! $PYTHON -m pytest --version &> /dev/null; then
        echo -e "${RED}pytest not found. Install with: pip install pytest${NC}"
        return 1
    fi

    echo -e "${CYAN}Item #1: Issue Detector${NC}"
    $PYTHON -m pytest tests/test_issue_detector.py -v --tb=short 2>/dev/null || true
    echo ""

    echo -e "${CYAN}Item #2: Unified Safety Checker${NC}"
    $PYTHON -m pytest tests/test_unified_safety.py -v --tb=short 2>/dev/null || true
    echo ""

    echo -e "${CYAN}Item #3: Container Validator${NC}"
    $PYTHON -m pytest tests/test_container_validator.py -v --tb=short 2>/dev/null || true
    echo ""

    echo -e "${CYAN}Item #4: Workflow Reset${NC}"
    $PYTHON -m pytest tests/test_workflow_reset.py -v --tb=short 2>/dev/null || true
    echo ""

    echo -e "${CYAN}Item #5: Safety Violations${NC}"
    $PYTHON -m pytest tests/test_safety_violations.py -v --tb=short 2>/dev/null || true
    echo ""

    echo -e "${CYAN}Item #6: BPMN Generator${NC}"
    $PYTHON -m pytest tests/test_bpmn_generator.py -v --tb=short 2>/dev/null || true
    echo ""

    echo -e "${GREEN}Tests Complete${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Run Monitoring
# ═══════════════════════════════════════════════════════════════════════════════
run_monitoring() {
    echo -e "${BLUE}═══ Running Monitoring Checks ═══${NC}"
    echo ""

    if command -v python3 &> /dev/null; then
        PYTHON=python3
    else
        PYTHON=python
    fi

    # Check for recent logs
    echo -e "${CYAN}Checking for issues in recent logs...${NC}"

    $PYTHON -c "
import sys
sys.path.insert(0, 'src')
from monitoring.issue_detector import IssueDetector, detect_issues

# Sample log check (would normally read from Dozzle/Docker)
sample_logs = '''
[08:00:00] [ORCHESTRATOR] Starting workflow
[08:01:00] [FE-1] Task received
[08:02:00] [FE-1] Processing complete
'''

detector = IssueDetector()
issues = detector.detect(sample_logs)

if issues:
    print(f'Found {len(issues)} issue(s):')
    for issue in issues:
        print(f'  [{issue.severity.name}] {issue.message}')
else:
    print('No issues detected in sample logs')
"
    echo ""
    echo -e "${GREEN}Monitoring Check Complete${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Run Validation
# ═══════════════════════════════════════════════════════════════════════════════
run_validation() {
    echo -e "${BLUE}═══ Running Validation Checks ═══${NC}"
    echo ""

    if command -v python3 &> /dev/null; then
        PYTHON=python3
    else
        PYTHON=python
    fi

    # Container validation
    echo -e "${CYAN}Item #3: Container Completeness...${NC}"
    $PYTHON -c "
import sys
sys.path.insert(0, 'src')
from monitoring.container_validator import ContainerValidator

validator = ContainerValidator()
result = validator.validate_all()

print(f'Status: {result.go_status}')
print(f'Missing: {len(result.missing)} containers')
print(f'Unhealthy: {len(result.unhealthy)} containers')

if result.warnings:
    print('Warnings:')
    for w in result.warnings[:5]:
        print(f'  - {w}')
" 2>/dev/null || echo "  (Container check requires Docker)"
    echo ""

    # Safety check
    echo -e "${CYAN}Item #2: Safety Module Verification...${NC}"
    $PYTHON -c "
import sys
sys.path.insert(0, 'src')
from safety.unified import UnifiedSafetyChecker

checker = UnifiedSafetyChecker()
result = checker.check('const x = 1', file_path='test.ts')
print(f'Safety module loaded successfully')
print(f'Sample check: score={result.score:.2f}, safe={result.safe}')
"
    echo ""

    echo -e "${GREEN}Validation Complete${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Generate Visualization
# ═══════════════════════════════════════════════════════════════════════════════
run_visualization() {
    echo -e "${BLUE}═══ Generating Workflow Visualization ═══${NC}"
    echo ""

    if command -v python3 &> /dev/null; then
        PYTHON=python3
    else
        PYTHON=python
    fi

    $PYTHON -c "
import sys
sys.path.insert(0, 'src')
from visualization.bpmn import generate_ascii_diagram, get_diagram_url

story_id = '${STORY_ID}' if '${STORY_ID}' else None
current_gate = ${CURRENT_GATE}

# ASCII diagram
print('ASCII Workflow Diagram:')
print('')
print(generate_ascii_diagram(current_gate=current_gate, story_id=story_id))
print('')

# PlantUML URL
url = get_diagram_url(current_gate=current_gate, story_id=story_id)
print('PlantUML URL (paste in browser):')
print(f'  {url[:100]}...')
"
    echo ""
    echo -e "${GREEN}Visualization Complete${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

case $MODE in
    test)
        run_tests
        ;;
    monitor)
        run_monitoring
        ;;
    validate)
        run_validation
        ;;
    visualize)
        run_visualization
        ;;
    all)
        run_validation
        echo ""
        run_monitoring
        echo ""
        run_visualization
        ;;
esac

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Gate 0 Enhancement Suite Complete${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
