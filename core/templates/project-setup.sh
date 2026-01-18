#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE PROJECT SETUP
# ═══════════════════════════════════════════════════════════════════════════════
#
# Initialize a project for WAVE autonomous orchestration
#
# USAGE:
#   ./project-setup.sh /path/to/my-project [--project-name MyProject]
#
# WHAT IT DOES:
#   1. Creates .claude/ directory structure
#   2. Creates worktrees/ directory structure
#   3. Generates CLAUDE.md from template
#   4. Generates docker-compose.yml from template
#   5. Generates .env from template
#   6. Sets up Git worktrees (if git repo exists)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAVE_ROOT="$(dirname $(dirname "$SCRIPT_DIR"))"
TEMPLATES_DIR="$WAVE_ROOT/core/templates"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%H:%M:%S')] $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    echo "WAVE Project Setup"
    echo ""
    echo "Usage: $0 <project-path> [options]"
    echo ""
    echo "Options:"
    echo "  --project-name <name>    Project name (default: directory name)"
    echo "  --package-manager <pm>   Package manager: pnpm, npm, yarn (default: pnpm)"
    echo "  --wave-budget <amount>   Budget per wave in USD (default: 2.00)"
    echo "  --story-budget <amount>  Budget per story in USD (default: 0.50)"
    echo "  --skip-worktrees        Skip Git worktree setup"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 /path/to/my-project --project-name MyApp --package-manager npm"
}

PROJECT_PATH=""
PROJECT_NAME=""
PACKAGE_MANAGER="pnpm"
WAVE_BUDGET="2.00"
STORY_BUDGET="0.50"
SKIP_WORKTREES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --project-name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        --package-manager)
            PACKAGE_MANAGER="$2"
            shift 2
            ;;
        --wave-budget)
            WAVE_BUDGET="$2"
            shift 2
            ;;
        --story-budget)
            STORY_BUDGET="$2"
            shift 2
            ;;
        --skip-worktrees)
            SKIP_WORKTREES=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            if [ -z "$PROJECT_PATH" ]; then
                PROJECT_PATH="$1"
            fi
            shift
            ;;
    esac
done

if [ -z "$PROJECT_PATH" ]; then
    echo "Error: project path is required"
    show_usage
    exit 1
fi

# Resolve absolute path
PROJECT_PATH="$(cd "$PROJECT_PATH" 2>/dev/null && pwd)" || {
    echo "Error: Project directory not found: $PROJECT_PATH"
    exit 1
}

# Default project name from directory
if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME="$(basename "$PROJECT_PATH")"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SETUP FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

create_directories() {
    log "${CYAN}Creating directory structure...${NC}"

    mkdir -p "$PROJECT_PATH/.claude/archive"
    mkdir -p "$PROJECT_PATH/.claude/black-box"
    mkdir -p "$PROJECT_PATH/worktrees"
    mkdir -p "$PROJECT_PATH/stories"

    # Create .gitkeep files
    touch "$PROJECT_PATH/.claude/.gitkeep"
    touch "$PROJECT_PATH/.claude/archive/.gitkeep"
    touch "$PROJECT_PATH/.claude/black-box/.gitkeep"
    touch "$PROJECT_PATH/worktrees/.gitkeep"
    touch "$PROJECT_PATH/stories/.gitkeep"

    log "${GREEN}Directories created${NC}"
}

generate_claude_md() {
    log "${CYAN}Generating CLAUDE.md...${NC}"

    local timestamp=$(date -Iseconds)

    sed -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
        -e "s/{{PACKAGE_MANAGER}}/$PACKAGE_MANAGER/g" \
        -e "s/{{WAVE_BUDGET}}/$WAVE_BUDGET/g" \
        -e "s/{{STORY_BUDGET}}/$STORY_BUDGET/g" \
        -e "s/{{TIMESTAMP}}/$timestamp/g" \
        "$TEMPLATES_DIR/CLAUDE.md.template" > "$PROJECT_PATH/CLAUDE.md"

    log "${GREEN}CLAUDE.md generated${NC}"
}

generate_docker_compose() {
    log "${CYAN}Generating docker-compose.yml...${NC}"

    # Convert project name to lowercase, replace spaces with hyphens
    local container_prefix=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

    sed -e "s/{{PROJECT_NAME}}/$container_prefix/g" \
        -e "s/{{PACKAGE_MANAGER}}/$PACKAGE_MANAGER/g" \
        "$TEMPLATES_DIR/docker-compose.template.yml" > "$PROJECT_PATH/docker-compose.yml"

    log "${GREEN}docker-compose.yml generated${NC}"
}

generate_env() {
    log "${CYAN}Generating .env.example...${NC}"

    sed -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
        -e "s/{{WAVE_BUDGET}}/$WAVE_BUDGET/g" \
        -e "s/{{STORY_BUDGET}}/$STORY_BUDGET/g" \
        "$TEMPLATES_DIR/.env.template" > "$PROJECT_PATH/.env.example"

    # Copy to .env if it doesn't exist
    if [ ! -f "$PROJECT_PATH/.env" ]; then
        cp "$PROJECT_PATH/.env.example" "$PROJECT_PATH/.env"
        log "${YELLOW}Created .env - please add your ANTHROPIC_API_KEY${NC}"
    fi

    log "${GREEN}.env.example generated${NC}"
}

setup_worktrees() {
    if [ "$SKIP_WORKTREES" = true ]; then
        log "${YELLOW}Skipping worktree setup (--skip-worktrees)${NC}"
        return 0
    fi

    if [ ! -d "$PROJECT_PATH/.git" ]; then
        log "${YELLOW}Not a git repository - skipping worktree setup${NC}"
        log "${YELLOW}Run 'git init' first if you want worktree isolation${NC}"
        return 0
    fi

    log "${CYAN}Setting up Git worktrees...${NC}"

    cd "$PROJECT_PATH"

    # Get current branch
    local main_branch=$(git rev-parse --abbrev-ref HEAD)

    for worktree in fe-dev be-dev qa dev-fix; do
        local worktree_path="$PROJECT_PATH/worktrees/$worktree"
        local branch_name="feature/$worktree"

        # Check if worktree already exists
        if [ -d "$worktree_path" ]; then
            log "  Worktree already exists: $worktree"
            continue
        fi

        # Create branch if it doesn't exist
        if ! git show-ref --verify --quiet "refs/heads/$branch_name"; then
            git branch "$branch_name" 2>/dev/null || true
        fi

        # Create worktree
        git worktree add "$worktree_path" "$branch_name" 2>/dev/null || {
            log "${YELLOW}  Could not create worktree: $worktree${NC}"
            continue
        }

        log "  Created worktree: $worktree -> $branch_name"
    done

    log "${GREEN}Worktrees configured${NC}"
}

create_sample_story() {
    log "${CYAN}Creating sample story template...${NC}"

    cat > "$PROJECT_PATH/stories/STORY-TEMPLATE.json" << 'EOF'
{
    "id": "STORY-001",
    "title": "Example Story Title",
    "domain": "feature",
    "type": "frontend",
    "wave": 1,
    "agent": "fe-dev",
    "priority": "medium",

    "objective": {
        "as_a": "user",
        "i_want": "to see a new feature",
        "so_that": "I can accomplish my goal"
    },

    "acceptance_criteria": [
        "Feature is accessible at /path",
        "Feature validates input correctly",
        "Feature shows success/error states",
        "Tests cover main functionality"
    ],

    "files": {
        "create": ["src/app/feature/page.tsx"],
        "modify": [],
        "forbidden": ["src/app/api/*"]
    },

    "safety": {
        "stop_conditions": ["Never expose user data"],
        "required_tests": ["Feature renders", "Validation works"],
        "min_coverage": 80
    },

    "thresholds": {
        "max_tokens": 50000,
        "max_cost_usd": 0.50,
        "max_duration_minutes": 30
    }
}
EOF

    log "${GREEN}Sample story template created: stories/STORY-TEMPLATE.json${NC}"
}

print_summary() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  WAVE PROJECT SETUP COMPLETE"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Project: $PROJECT_NAME"
    echo "  Path: $PROJECT_PATH"
    echo ""
    echo "  Created files:"
    echo "    - CLAUDE.md (agent safety instructions)"
    echo "    - docker-compose.yml (agent containers)"
    echo "    - .env.example (environment template)"
    echo "    - .claude/ (signal directory)"
    echo "    - worktrees/ (Git worktree isolation)"
    echo "    - stories/ (AI story definitions)"
    echo ""
    echo "  Next steps:"
    echo "    1. Add your ANTHROPIC_API_KEY to .env"
    echo "    2. Create stories in stories/ directory"
    echo "    3. Run: docker compose up"
    echo "    4. Or run: wave-orchestrator.sh --project $PROJECT_PATH"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

main() {
    echo "════════════════════════════════════════════════════════════════"
    echo "  WAVE PROJECT SETUP"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "  Project: $PROJECT_NAME"
    echo "  Path: $PROJECT_PATH"
    echo "  Package Manager: $PACKAGE_MANAGER"
    echo "  Wave Budget: \$$WAVE_BUDGET"
    echo ""

    create_directories
    generate_claude_md
    generate_docker_compose
    generate_env
    setup_worktrees
    create_sample_story
    print_summary
}

main "$@"
