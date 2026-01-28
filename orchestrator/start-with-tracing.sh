#!/bin/bash
cd /Volumes/SSD-01/Projects/WAVE/orchestrator

# LangSmith/LangChain tracing
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY="${LANGCHAIN_API_KEY:-your_langchain_api_key}"
export LANGCHAIN_PROJECT=wave-orchestrator

# Anthropic API
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-your_anthropic_api_key}"

# Activate venv and run
source venv/bin/activate 2>/dev/null
python main.py
