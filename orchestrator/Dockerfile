# WAVE Orchestrator Docker Image
# Multi-stage build for smaller final image

# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /build/wheels -r requirements.txt

# Stage 2: Production image
FROM python:3.11-slim

# Create non-root user
RUN groupadd -r wave && useradd -r -g wave wave

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /build/wheels /wheels

# Install Python packages
RUN pip install --no-cache-dir /wheels/* \
    && rm -rf /wheels

# Copy application code
COPY src/ /app/src/
COPY poc/ /app/poc/

# Set ownership
RUN chown -R wave:wave /app

# Switch to non-root user
USER wave

# Environment
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Expose ports
EXPOSE 8000 8001

# Default command
CMD ["python", "-m", "uvicorn", "src.api.endpoints:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
