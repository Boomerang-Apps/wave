#!/opt/homebrew/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE STATUS DASHBOARD SERVER
# ═══════════════════════════════════════════════════════════════════════════════
# Serves the status dashboard on a local HTTP server with auto-refresh.
#
# USAGE:
#   ./serve-dashboard.sh --project <path> --wave <N> [--port <port>]
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Defaults
PORT=8080
REFRESH_INTERVAL=30

show_usage() {
    cat << 'EOF'
WAVE Status Dashboard Server

Serves the status dashboard on a local HTTP server with auto-refresh.

Usage: serve-dashboard.sh [options]

Required:
  -p, --project <path>     Path to project directory
  -w, --wave <number>      Wave number to monitor

Optional:
  --port <port>            HTTP port (default: 8080)
  --refresh <seconds>      Auto-refresh interval (default: 30)
  --once                   Generate HTML once and exit (no server)

Examples:
  # Start server on default port
  ./serve-dashboard.sh -p /path/to/project -w 3

  # Use custom port
  ./serve-dashboard.sh -p /path/to/project -w 3 --port 3000

  # Generate HTML only (no server)
  ./serve-dashboard.sh -p /path/to/project -w 3 --once

EOF
}

# Parse arguments
PROJECT_PATH=""
WAVE_NUMBER=""
ONCE_MODE=false

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
        --port)
            PORT="$2"
            shift 2
            ;;
        --refresh)
            REFRESH_INTERVAL="$2"
            shift 2
            ;;
        --once)
            ONCE_MODE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 2
            ;;
    esac
done

if [ -z "$PROJECT_PATH" ] || [ -z "$WAVE_NUMBER" ]; then
    echo "Error: --project and --wave are required"
    show_usage
    exit 2
fi

PROJECT_PATH="$(cd "$PROJECT_PATH" && pwd)"
DASHBOARD_DIR="$PROJECT_PATH/.claude"
HTML_FILE="$DASHBOARD_DIR/dashboard.html"

mkdir -p "$DASHBOARD_DIR"

# Generate HTML with auto-refresh meta tag
generate_html() {
    local temp_file
    temp_file=$(mktemp)

    # Generate base HTML
    "$SCRIPT_DIR/status-dashboard.sh" --project "$PROJECT_PATH" --wave "$WAVE_NUMBER" --format html > "$temp_file" 2>/dev/null || true

    # Inject auto-refresh meta tag
    sed "s|</head>|<meta http-equiv=\"refresh\" content=\"$REFRESH_INTERVAL\"></head>|" "$temp_file" > "$HTML_FILE"

    rm -f "$temp_file"
}

# Generate initial HTML
echo -e "${CYAN}Generating dashboard...${NC}"
generate_html

if [ "$ONCE_MODE" = "true" ]; then
    echo -e "${GREEN}Dashboard generated: $HTML_FILE${NC}"
    exit 0
fi

# Check for Python (for simple HTTP server)
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 required for HTTP server"
    echo "Dashboard generated at: $HTML_FILE"
    echo "Open manually or install python3"
    exit 1
fi

echo ""
echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║           WAVE STATUS DASHBOARD SERVER                        ║${NC}"
echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Project:  ${BOLD}$(basename "$PROJECT_PATH")${NC}"
echo -e "  Wave:     ${BOLD}$WAVE_NUMBER${NC}"
echo -e "  URL:      ${GREEN}${BOLD}http://localhost:$PORT/dashboard.html${NC}"
echo -e "  Refresh:  Every ${REFRESH_INTERVAL}s"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop"
echo ""

# Start background refresh loop
(
    while true; do
        sleep "$REFRESH_INTERVAL"
        generate_html 2>/dev/null
    done
) &
REFRESH_PID=$!

# Cleanup on exit
trap "kill $REFRESH_PID 2>/dev/null; echo ''; echo 'Server stopped.'" EXIT

# Start HTTP server
cd "$DASHBOARD_DIR"
python3 -m http.server "$PORT" 2>/dev/null
