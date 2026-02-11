#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE CLEANUP SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════
# Cleans up stopped containers before a fresh launch
# Usage: ./wave-cleanup.sh [--force]
#   --force: Skip confirmation prompt
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

FORCE="${1:-}"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN} WAVE CLEANUP${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Count containers
RUNNING=$(docker ps --format '{{.Names}}' | grep -c "^wave-" || echo 0)
STOPPED=$(docker ps -a --filter "status=exited" --format '{{.Names}}' | grep -c "^wave-" || echo 0)

echo -e "  ${GREEN}Running:${NC} $RUNNING wave containers"
echo -e "  ${YELLOW}Stopped:${NC} $STOPPED wave containers"
echo ""

if [ "$STOPPED" -eq 0 ]; then
    echo -e "${GREEN}✓ No stopped containers to clean up${NC}"
    echo ""
    exit 0
fi

echo "Stopped containers to remove:"
docker ps -a --filter "status=exited" --format '  - {{.Names}} ({{.Status}})' | grep "wave-"
echo ""

# Confirm unless --force
if [ "$FORCE" != "--force" ]; then
    echo -e "${YELLOW}Remove these $STOPPED stopped containers? [y/N]${NC}"
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
fi

# Remove stopped wave containers
echo ""
echo "Removing stopped containers..."
REMOVED=$(docker rm $(docker ps -a -q --filter "name=wave-" --filter "status=exited") 2>/dev/null | wc -l | tr -d ' ')
echo -e "${GREEN}✓ Removed $REMOVED containers${NC}"

# Optional: Remove dangling images
echo ""
echo "Checking for dangling images..."
DANGLING=$(docker images -f "dangling=true" -q | wc -l | tr -d ' ')
if [ "$DANGLING" -gt 0 ]; then
    echo -e "${YELLOW}Found $DANGLING dangling images${NC}"
    if [ "$FORCE" == "--force" ]; then
        docker image prune -f >/dev/null 2>&1
        echo -e "${GREEN}✓ Removed dangling images${NC}"
    else
        echo "  Run 'docker image prune' to remove them"
    fi
else
    echo -e "${GREEN}✓ No dangling images${NC}"
fi

# Clean up Docker logs (optional - requires sudo on some systems)
echo ""
echo "Checking Docker log sizes..."
LOG_DIR="/var/lib/docker/containers"
if [ -d "$LOG_DIR" ] && [ "$FORCE" == "--force" ]; then
    # This requires elevated permissions
    echo -e "${YELLOW}Note: Log truncation requires elevated permissions${NC}"
    echo "  To manually truncate logs, run:"
    echo "  sudo sh -c 'truncate -s 0 /var/lib/docker/containers/*/*-json.log'"
else
    # Show log sizes for wave containers
    for container in $(docker ps -a --format '{{.ID}}' --filter "name=wave-"); do
        LOG_FILE=$(docker inspect --format='{{.LogPath}}' "$container" 2>/dev/null)
        if [ -f "$LOG_FILE" ]; then
            SIZE=$(ls -lh "$LOG_FILE" 2>/dev/null | awk '{print $5}')
            NAME=$(docker inspect --format='{{.Name}}' "$container" | tr -d '/')
            echo "  $NAME: $SIZE"
        fi
    done 2>/dev/null || echo "  Could not read log sizes"
fi

# Restart Dozzle to clear its cache (optional)
if [ "$FORCE" == "--force" ]; then
    echo ""
    echo "Restarting Dozzle to clear cache..."
    docker restart wave-dozzle >/dev/null 2>&1 && echo -e "${GREEN}✓ Dozzle restarted${NC}" || echo -e "${YELLOW}⚠ Dozzle restart skipped${NC}"
fi

# Summary
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Current status:"
docker ps --format '  - {{.Names}}: {{.Status}}' | grep "wave-" || echo "  No running wave containers"
echo ""
