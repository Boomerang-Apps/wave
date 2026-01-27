#!/bin/bash
# WAVE Agent Image Builder
# Builds versioned, immutable Docker images for domain-specific agents
#
# Usage:
#   ./scripts/build-agents.sh [wave_number] [--push]
#
# Examples:
#   ./scripts/build-agents.sh 1          # Build wave 1 agents
#   ./scripts/build-agents.sh 2 --push   # Build wave 2 and push to registry

set -e

# Configuration
WAVE_NUMBER=${1:-1}
PUSH_TO_REGISTRY=${2:-""}
REGISTRY=${DOCKER_REGISTRY:-""}  # Set via env for private registry

# Versioning
WAVE_VERSION="v2-wave${WAVE_NUMBER}"
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  WAVE Agent Image Builder                                  ║${NC}"
echo -e "${BLUE}║  Wave: ${WAVE_NUMBER} | Version: ${WAVE_VERSION} | Git: ${GIT_HASH}          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

cd "$(dirname "$0")/.."

# Step 1: Build base image
echo -e "\n${YELLOW}[1/4] Building base image...${NC}"
docker build \
    -f docker/agents/Dockerfile.base \
    --build-arg WAVE_VERSION="${WAVE_VERSION}" \
    --build-arg GIT_HASH="${GIT_HASH}" \
    --build-arg BUILD_DATE="${BUILD_DATE}" \
    -t wave-agent-base:${WAVE_VERSION} \
    -t wave-agent-base:${GIT_HASH} \
    -t wave-agent-base:latest \
    .
echo -e "${GREEN}✓ Base image built: wave-agent-base:${WAVE_VERSION}${NC}"

# Step 2: Build FE agent
echo -e "\n${YELLOW}[2/4] Building FE agent...${NC}"
docker build \
    -f docker/agents/Dockerfile.fe \
    --build-arg BASE_IMAGE=wave-agent-base:${WAVE_VERSION} \
    --build-arg WAVE_NUMBER="${WAVE_NUMBER}" \
    -t wave-agent-fe:${WAVE_VERSION} \
    -t wave-agent-fe:${GIT_HASH} \
    .
echo -e "${GREEN}✓ FE agent built: wave-agent-fe:${WAVE_VERSION}${NC}"

# Step 3: Build BE agent
echo -e "\n${YELLOW}[3/4] Building BE agent...${NC}"
docker build \
    -f docker/agents/Dockerfile.be \
    --build-arg BASE_IMAGE=wave-agent-base:${WAVE_VERSION} \
    --build-arg WAVE_NUMBER="${WAVE_NUMBER}" \
    -t wave-agent-be:${WAVE_VERSION} \
    -t wave-agent-be:${GIT_HASH} \
    .
echo -e "${GREEN}✓ BE agent built: wave-agent-be:${WAVE_VERSION}${NC}"

# Step 4: Build QA agent
echo -e "\n${YELLOW}[4/4] Building QA agent...${NC}"
docker build \
    -f docker/agents/Dockerfile.qa \
    --build-arg BASE_IMAGE=wave-agent-base:${WAVE_VERSION} \
    --build-arg WAVE_NUMBER="${WAVE_NUMBER}" \
    -t wave-agent-qa:${WAVE_VERSION} \
    -t wave-agent-qa:${GIT_HASH} \
    .
echo -e "${GREEN}✓ QA agent built: wave-agent-qa:${WAVE_VERSION}${NC}"

# Optional: Push to registry
if [ "${PUSH_TO_REGISTRY}" == "--push" ] && [ -n "${REGISTRY}" ]; then
    echo -e "\n${YELLOW}Pushing images to registry: ${REGISTRY}...${NC}"
    for agent in base fe be qa; do
        docker tag wave-agent-${agent}:${WAVE_VERSION} ${REGISTRY}/wave-agent-${agent}:${WAVE_VERSION}
        docker push ${REGISTRY}/wave-agent-${agent}:${WAVE_VERSION}
        echo -e "${GREEN}✓ Pushed: ${REGISTRY}/wave-agent-${agent}:${WAVE_VERSION}${NC}"
    done
fi

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Build Complete                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "
${GREEN}Images built:${NC}
  • wave-agent-base:${WAVE_VERSION}
  • wave-agent-fe:${WAVE_VERSION}
  • wave-agent-be:${WAVE_VERSION}
  • wave-agent-qa:${WAVE_VERSION}

${GREEN}Git hash tags:${NC}
  • wave-agent-*:${GIT_HASH}

${YELLOW}To run agents:${NC}
  docker-compose -f docker/docker-compose.agents.yml up

${YELLOW}To verify:${NC}
  docker run --rm wave-agent-fe:${WAVE_VERSION}
"
