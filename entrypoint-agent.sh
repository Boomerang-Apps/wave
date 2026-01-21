#!/bin/bash
# WAVE Agent Entrypoint
# Reads prompt from file and runs Claude CLI

set -e

ROLE="${WAVE_ROLE:-agent}"
WAVE="${WAVE_NUMBER:-1}"
PROMPT_FILE="/project/.claude/prompts/${ROLE}-wave${WAVE}.txt"

echo "═══════════════════════════════════════════════════════════════"
echo " WAVE AGENT: ${ROLE^^} - Wave ${WAVE}"
echo "═══════════════════════════════════════════════════════════════"

# Check if prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "ERROR: Prompt file not found: $PROMPT_FILE"
    exit 1
fi

echo "Reading prompt from: $PROMPT_FILE"
echo ""

# Run Claude with the prompt
exec claude -p "$(cat "$PROMPT_FILE")" \
    --dangerously-skip-permissions \
    --verbose
