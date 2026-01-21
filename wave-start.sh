#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE START - One Command Launch
# ═══════════════════════════════════════════════════════════════════════════════
# Launches the complete WAVE multi-agent system with Docker.
#
# Usage:
#   ./wave-start.sh --project /path/to/project --wave 3
#   ./wave-start.sh --project /path/to/project --wave 3 --fe-only
#   ./wave-start.sh --project /path/to/project --wave 3 --with-qa
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# USAGE
# ─────────────────────────────────────────────────────────────────────────────
show_usage() {
    cat << 'EOF'
WAVE START - One Command Launch

Usage: wave-start.sh [options]

Required:
  -p, --project <path>    Path to project directory
  -w, --wave <number>     Wave number to execute

Options:
  --fe-only               Only launch FE-DEV agent (no BE-DEV)
  --be-only               Only launch BE-DEV agent (no FE-DEV)
  --with-qa               Also launch QA agent
  --no-dozzle             Don't start Dozzle log viewer
  --build                 Force rebuild Docker images
  --stop                  Stop all WAVE containers
  --status                Show status of WAVE containers

Examples:
  # Start wave 3 with FE agent only
  ./wave-start.sh -p /path/to/project -w 3 --fe-only

  # Start wave 2 with both FE and BE agents
  ./wave-start.sh -p /path/to/project -w 2

  # Stop all containers
  ./wave-start.sh --stop

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────
log_info() { echo -e "${BLUE}[WAVE]${NC} $1"; }
log_success() { echo -e "${GREEN}[WAVE]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WAVE]${NC} $1"; }
log_error() { echo -e "${RED}[WAVE]${NC} $1"; }

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENT PARSING
# ─────────────────────────────────────────────────────────────────────────────
PROJECT_PATH=""
WAVE_NUMBER=""
FE_ONLY=false
BE_ONLY=false
WITH_QA=false
NO_DOZZLE=false
FORCE_BUILD=false
STOP_ONLY=false
STATUS_ONLY=false

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
        --fe-only)
            FE_ONLY=true
            shift
            ;;
        --be-only)
            BE_ONLY=true
            shift
            ;;
        --with-qa)
            WITH_QA=true
            shift
            ;;
        --no-dozzle)
            NO_DOZZLE=true
            shift
            ;;
        --build)
            FORCE_BUILD=true
            shift
            ;;
        --stop)
            STOP_ONLY=true
            shift
            ;;
        --status)
            STATUS_ONLY=true
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
# STOP COMMAND
# ─────────────────────────────────────────────────────────────────────────────
if [ "$STOP_ONLY" = "true" ]; then
    log_info "Stopping all WAVE containers..."
    cd "$SCRIPT_DIR"
    docker compose down
    log_success "All WAVE containers stopped"
    exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# STATUS COMMAND
# ─────────────────────────────────────────────────────────────────────────────
if [ "$STATUS_ONLY" = "true" ]; then
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} WAVE CONTAINER STATUS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    docker ps --filter "name=wave-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# VALIDATION
# ─────────────────────────────────────────────────────────────────────────────
if [ -z "$PROJECT_PATH" ]; then
    log_error "--project is required"
    show_usage
    exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
    log_error "Project directory not found: $PROJECT_PATH"
    exit 1
fi

PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"

if [ -z "$WAVE_NUMBER" ]; then
    log_error "--wave is required"
    show_usage
    exit 1
fi

# Check for ANTHROPIC_API_KEY
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    log_error "ANTHROPIC_API_KEY environment variable not set"
    log_info "Export it: export ANTHROPIC_API_KEY=your-key"
    exit 1
fi

# Check Docker is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# SETUP PROJECT
# ─────────────────────────────────────────────────────────────────────────────
log_info "Setting up project for Wave $WAVE_NUMBER..."

# Create .claude directory if needed
mkdir -p "$PROJECT_PATH/.claude/prompts"
mkdir -p "$PROJECT_PATH/.claude/locks"

# Create agent prompts if they don't exist
create_agent_prompt() {
    local agent=$1
    local prompt_file="$PROJECT_PATH/.claude/prompts/${agent}-wave${WAVE_NUMBER}.txt"

    if [ ! -f "$prompt_file" ]; then
        log_info "Creating prompt for $agent..."

        cat > "$prompt_file" << PROMPT
You are ${agent^^}, a development agent for the WAVE framework.

## MISSION: Wave $WAVE_NUMBER

### CRITICAL: Read Safety Rules First
Read $PROJECT_PATH/CLAUDE.md for safety rules before proceeding.

### Your Stories
Read and implement stories from: $PROJECT_PATH/stories/wave$WAVE_NUMBER/

### Working Directory
Your code is at: $PROJECT_PATH/code

### Tasks
1. Read each story's acceptance criteria
2. Implement the required features
3. Ensure all tests pass
4. Create the Gate 3 signal file when complete

### Gate 3 Signal
When ALL acceptance criteria are met, create:
$PROJECT_PATH/.claude/signal-wave${WAVE_NUMBER}-gate3-${agent}-complete.json

### Constraints
- Only modify files listed in stories
- Never touch files in files.forbidden
- Run tests before completing

BEGIN MISSION.
PROMPT
    fi
}

# Create prompts for agents we'll use
if [ "$BE_ONLY" != "true" ]; then
    create_agent_prompt "fe-dev"
fi

if [ "$FE_ONLY" != "true" ]; then
    create_agent_prompt "be-dev"
fi

if [ "$WITH_QA" = "true" ]; then
    create_agent_prompt "qa"
fi

# ─────────────────────────────────────────────────────────────────────────────
# RUN PHASE VALIDATORS
# ─────────────────────────────────────────────────────────────────────────────
log_info "Running pre-flight validation..."

# Phase 0 - Stories
if ! "$SCRIPT_DIR/core/scripts/building-blocks/phase0-validator.sh" \
    --project "$PROJECT_PATH" --wave "$WAVE_NUMBER" >/dev/null 2>&1; then
    log_error "Phase 0 (Stories) validation failed"
    log_info "Run: $SCRIPT_DIR/core/scripts/building-blocks/phase0-validator.sh -p $PROJECT_PATH -w $WAVE_NUMBER"
    exit 1
fi
log_success "Phase 0 (Stories) - OK"

# Phase 2 - Smoke Test
if ! "$SCRIPT_DIR/core/scripts/building-blocks/phase2-validator.sh" \
    --project "$PROJECT_PATH" --wave "$WAVE_NUMBER" >/dev/null 2>&1; then
    log_warn "Phase 2 (Smoke Test) not passed - running now..."
    "$SCRIPT_DIR/core/scripts/building-blocks/phase2-validator.sh" \
        --project "$PROJECT_PATH" --wave "$WAVE_NUMBER"
fi
log_success "Phase 2 (Smoke Test) - OK"

# ─────────────────────────────────────────────────────────────────────────────
# BUILD DOCKER IMAGES
# ─────────────────────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"

if [ "$FORCE_BUILD" = "true" ]; then
    log_info "Building Docker images..."
    docker compose build
else
    # Build only if image doesn't exist
    if ! docker image inspect wave-merge-watcher >/dev/null 2>&1; then
        log_info "Building Docker images (first time)..."
        docker compose build
    fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# LAUNCH CONTAINERS
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN} WAVE LAUNCH - Wave $WAVE_NUMBER${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

export PROJECT_PATH
export WAVE_NUMBER
export ANTHROPIC_API_KEY

# Start Dozzle first (unless disabled)
if [ "$NO_DOZZLE" != "true" ]; then
    log_info "Starting Dozzle log viewer..."
    docker compose up -d dozzle
    log_success "Dozzle running at http://localhost:8080"
fi

# Start merge-watcher
log_info "Starting merge-watcher..."
docker compose up -d merge-watcher
log_success "Merge-watcher started"

# Small delay to let merge-watcher initialize
sleep 2

# Start agents based on flags
PROFILES=""

if [ "$FE_ONLY" = "true" ]; then
    log_info "Starting FE-DEV agent..."
    docker compose --profile agents up -d fe-dev
    log_success "FE-DEV agent started"
elif [ "$BE_ONLY" = "true" ]; then
    log_info "Starting BE-DEV agent..."
    docker compose --profile agents up -d be-dev
    log_success "BE-DEV agent started"
else
    log_info "Starting FE-DEV and BE-DEV agents..."
    docker compose --profile agents up -d fe-dev be-dev
    log_success "Both agents started"
fi

if [ "$WITH_QA" = "true" ]; then
    log_info "Starting QA agent..."
    docker compose --profile qa up -d qa
    log_success "QA agent started"
fi

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}${BOLD}  WAVE SYSTEM LAUNCHED${NC}"
echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
echo ""
echo -e "  ${BLUE}Project:${NC}      $PROJECT_PATH"
echo -e "  ${BLUE}Wave:${NC}         $WAVE_NUMBER"
echo -e "  ${BLUE}Dozzle:${NC}       http://localhost:8080"
echo ""
echo -e "  ${YELLOW}Commands:${NC}"
echo -e "    View logs:    docker compose logs -f"
echo -e "    Stop all:     ./wave-start.sh --stop"
echo -e "    Status:       ./wave-start.sh --status"
echo ""
echo -e "${CYAN}───────────────────────────────────────────────────────────────${NC}"
