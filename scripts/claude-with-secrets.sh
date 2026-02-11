#!/bin/bash
# Launch Claude Code with Doppler secrets
# WAVE Team - Secrets Management

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║       WAVE Claude Code Launcher                       ║"
echo "║       With Doppler Secrets Management                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Doppler is installed
if ! command -v doppler &> /dev/null; then
    echo -e "${RED}❌ Doppler CLI not installed. Run: brew install dopplerhq/cli/doppler${NC}"
    exit 1
fi

# Check Doppler is authenticated
if ! doppler me &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Doppler. Running login...${NC}"
    doppler login
fi

echo -e "${GREEN}✅ Doppler authenticated${NC}"

# Verify wave project exists
if ! doppler secrets --project wave --config dev &> /dev/null; then
    echo -e "${RED}❌ WAVE project not found in Doppler.${NC}"
    echo -e "${YELLOW}Run: doppler projects create wave${NC}"
    exit 1
fi

echo -e "${GREEN}✅ WAVE project found with $(doppler secrets --project wave --config dev --json | jq 'length') secrets${NC}"

# Launch Claude with Doppler environment
echo -e "${BLUE}Launching Claude Code with secrets from Doppler...${NC}"
echo ""

# Run Claude with Doppler injecting all secrets as environment variables
exec doppler run --project wave --config dev -- claude "$@"
