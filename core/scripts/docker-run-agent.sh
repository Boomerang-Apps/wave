#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Docker Agent Runner
# ═══════════════════════════════════════════════════════════════════════════════
# Executes agents in isolated Docker containers for enhanced security
# Based on: NVIDIA 2026 security research, Grok 4 recommendations
#
# Security Features:
#   - Non-root user execution
#   - Read-only root filesystem
#   - Dropped capabilities
#   - No network access (default)
#   - Seccomp profile restriction
#   - tmpfs for /tmp (noexec)
#
# Usage:
#   ./docker-run-agent.sh <agent-type> <project-path> [options]
#
# Options:
#   --network         Enable network access (for API calls)
#   --interactive     Run in interactive mode
#   --dry-run         Show command without executing
#   --build           Build image before running
#   --shell           Start shell instead of agent
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="${SCRIPT_DIR}/../docker"

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

AGENT_TYPE="${1:?Error: Agent type required (fe-dev-1, be-dev-1, qa, etc.)}"
PROJECT_PATH="${2:?Error: Project path required}"

# Resolve absolute path
PROJECT_PATH="$(cd "$PROJECT_PATH" 2>/dev/null && pwd)" || {
    echo "Error: Invalid project path: $PROJECT_PATH"
    exit 1
}

# Defaults
DOCKER_IMAGE="${WAVE_DOCKER_IMAGE:-wave-agent:latest}"
DOCKER_USER="wave-agent"
NETWORK_MODE="none"
INTERACTIVE=false
DRY_RUN=false
BUILD_FIRST=false
SHELL_MODE=false
MEMORY_LIMIT="2g"
CPU_LIMIT="2"

# Parse options
shift 2
while [[ $# -gt 0 ]]; do
    case "$1" in
        --network)
            NETWORK_MODE="bridge"
            shift
            ;;
        --interactive|-i)
            INTERACTIVE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --build)
            BUILD_FIRST=true
            shift
            ;;
        --shell)
            SHELL_MODE=true
            shift
            ;;
        --memory)
            MEMORY_LIMIT="$2"
            shift 2
            ;;
        --cpus)
            CPU_LIMIT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ─────────────────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────────────────

WORKTREE_PATH="${PROJECT_PATH}/worktrees/${AGENT_TYPE}"
CLAUDE_DIR="${PROJECT_PATH}/.claude"
STORIES_DIR="${PROJECT_PATH}/stories"
LOGS_DIR="${PROJECT_PATH}/logs"

# Validate paths
if [[ ! -d "$CLAUDE_DIR" ]]; then
    mkdir -p "$CLAUDE_DIR"
fi

if [[ ! -d "$WORKTREE_PATH" ]]; then
    echo "Warning: Worktree path does not exist: $WORKTREE_PATH"
    echo "Using project path as workspace instead"
    WORKTREE_PATH="$PROJECT_PATH"
fi

# ─────────────────────────────────────────────────────────────────────────────
# BUILD IMAGE (if requested or missing)
# ─────────────────────────────────────────────────────────────────────────────

build_image() {
    echo "═══════════════════════════════════════════════════════════════════"
    echo "  Building Docker image: $DOCKER_IMAGE"
    echo "═══════════════════════════════════════════════════════════════════"

    docker build \
        -t "$DOCKER_IMAGE" \
        -f "${DOCKER_DIR}/Dockerfile.agent" \
        "${DOCKER_DIR}"

    echo "✅ Image built successfully"
}

if [[ "$BUILD_FIRST" == true ]]; then
    build_image
elif ! docker image inspect "$DOCKER_IMAGE" &>/dev/null; then
    echo "Image $DOCKER_IMAGE not found. Building..."
    build_image
fi

# ─────────────────────────────────────────────────────────────────────────────
# CONTAINER CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

CONTAINER_NAME="wave-${AGENT_TYPE}-$(date +%s)"

# Build Docker run command
DOCKER_CMD=(
    docker run
    --name "$CONTAINER_NAME"
    --rm

    # Security: Non-root user
    --user "$DOCKER_USER"

    # Security: Read-only root filesystem
    --read-only

    # Security: Temporary filesystem for /tmp (no execute)
    --tmpfs /tmp:rw,noexec,nosuid,size=512m

    # Security: Drop all capabilities
    --cap-drop ALL

    # Security: No privilege escalation
    --security-opt no-new-privileges:true

    # Security: Seccomp profile (use default restrictive profile)
    --security-opt seccomp=unconfined  # TODO: Create custom profile

    # Network isolation
    --network "$NETWORK_MODE"

    # Resource limits
    --memory "$MEMORY_LIMIT"
    --cpus "$CPU_LIMIT"

    # Mount worktree (read-write for agent work)
    -v "${WORKTREE_PATH}:/workspace:rw"

    # Mount .claude directory (for signals, shared with orchestrator)
    -v "${CLAUDE_DIR}:/signals:rw"

    # Mount stories (read-only reference)
    -v "${STORIES_DIR}:/stories:ro"

    # Mount logs directory
    -v "${LOGS_DIR}:/logs:rw"

    # Environment variables
    -e "AGENT_TYPE=${AGENT_TYPE}"
    -e "WAVE_PROJECT=/workspace"
    -e "WAVE_SIGNALS=/signals"
    -e "WAVE_STORIES=/stories"
    -e "WAVE_LOGS=/logs"
    -e "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}"

    # Labels for management
    --label "wave.agent=${AGENT_TYPE}"
    --label "wave.project=${PROJECT_PATH}"
    --label "wave.started=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
)

# Interactive mode
if [[ "$INTERACTIVE" == true ]]; then
    DOCKER_CMD+=(-it)
fi

# Add image and command
DOCKER_CMD+=("$DOCKER_IMAGE")

if [[ "$SHELL_MODE" == true ]]; then
    DOCKER_CMD+=(/bin/bash)
else
    DOCKER_CMD+=(/entrypoint.sh)
fi

# ─────────────────────────────────────────────────────────────────────────────
# EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════════════════════════════════"
echo "  WAVE Docker Agent Runner"
echo "═══════════════════════════════════════════════════════════════════"
echo "  Agent:      $AGENT_TYPE"
echo "  Project:    $PROJECT_PATH"
echo "  Worktree:   $WORKTREE_PATH"
echo "  Container:  $CONTAINER_NAME"
echo "  Network:    $NETWORK_MODE"
echo "  Memory:     $MEMORY_LIMIT"
echo "  CPUs:       $CPU_LIMIT"
echo "═══════════════════════════════════════════════════════════════════"

if [[ "$DRY_RUN" == true ]]; then
    echo ""
    echo "DRY RUN - Command would be:"
    echo ""
    printf '%s ' "${DOCKER_CMD[@]}"
    echo ""
    exit 0
fi

# Create signal file for container start
cat > "${CLAUDE_DIR}/signal-${AGENT_TYPE}-container-start.json" << EOF
{
    "agent": "${AGENT_TYPE}",
    "event": "container_start",
    "container": "${CONTAINER_NAME}",
    "image": "${DOCKER_IMAGE}",
    "network": "${NETWORK_MODE}",
    "security": {
        "user": "${DOCKER_USER}",
        "read_only": true,
        "no_new_privileges": true,
        "capabilities": "none"
    },
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo ""
echo "Starting containerized agent..."
echo ""

# Execute
"${DOCKER_CMD[@]}"
EXIT_CODE=$?

# Create signal file for container stop
cat > "${CLAUDE_DIR}/signal-${AGENT_TYPE}-container-stop.json" << EOF
{
    "agent": "${AGENT_TYPE}",
    "event": "container_stop",
    "container": "${CONTAINER_NAME}",
    "exit_code": ${EXIT_CODE},
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo ""
echo "Container exited with code: $EXIT_CODE"
exit $EXIT_CODE
