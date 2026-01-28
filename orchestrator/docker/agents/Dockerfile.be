# WAVE Backend Agent Image
# Specialized agent for Supabase/API/Database code generation
# Version: v2-footprint

ARG BASE_IMAGE=wave-agent-base:latest
FROM ${BASE_IMAGE}

# Build args
ARG WAVE_NUMBER=1
ARG DOMAIN=be

# Labels
LABEL domain="backend"
LABEL wave="${WAVE_NUMBER}"
LABEL description="WAVE BE Agent - Supabase/API/Database code generation"

USER root

# Install additional BE-specific tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Supabase CLI for BE operations
RUN pip install --no-cache-dir supabase>=2.0.0

# Copy stories directory
COPY stories/ /app/stories/

# Copy prompts
COPY src/prompts/ /app/src/prompts/

# Set domain environment
ENV WAVE_DOMAIN=be
ENV WAVE_NUMBER=${WAVE_NUMBER}

# Switch back to non-root
USER wave
WORKDIR /app

# Agent entrypoint
CMD ["python", "-c", "from nodes.dev import dev_node; print('BE Agent ready')"]
