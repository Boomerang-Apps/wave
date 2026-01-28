#!/bin/bash
# WAVE v2 Orchestrator - Footprint Smoke Test
# Phase 1: Simple test to verify end-to-end automation

echo "=========================================="
echo "WAVE v2 Orchestrator - Footprint Smoke Test"
echo "=========================================="
echo ""

# Check orchestrator health
echo "1. Checking orchestrator health..."
HEALTH=$(curl -s http://localhost:8000/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✓ Orchestrator is healthy"
    echo "   $HEALTH"
else
    echo "   ✗ Orchestrator not running!"
    echo "   Start it with: cd /Volumes/SSD-01/Projects/WAVE/orchestrator && python main.py"
    exit 1
fi
echo ""

# Run simple test
echo "2. Starting v2 run on Footprint..."
echo ""
RESPONSE=$(curl -s -X POST http://localhost:8000/runs \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Add a simple carbon calculator component to the Footprint app. The component should have an input for travel distance in km and display calculated CO2 emissions using 0.21 kg CO2 per km for car travel.",
    "repo_path": "/Volumes/SSD-01/Projects/Footprint",
    "branch": "main",
    "cost_limit_usd": 10.0
  }')

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract run_id
RUN_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('run_id', 'N/A'))" 2>/dev/null)
echo "Run ID: $RUN_ID"
echo ""

echo "=========================================="
echo "Smoke test complete!"
echo ""
echo "Next steps:"
echo "  - Check LangSmith: https://smith.langchain.com"
echo "  - Check Slack for alerts"
echo "  - Verify changes in Footprint worktrees"
echo "=========================================="
