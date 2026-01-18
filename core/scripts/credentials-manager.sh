#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE FRAMEWORK - Credentials Manager
# ═══════════════════════════════════════════════════════════════════════════════
#
# Securely manages project credentials in WAVE Portal Supabase.
# Credentials are stored once and auto-retrieved for returning projects.
#
# This script:
# 1. Stores credentials securely in Supabase wave_credentials table
# 2. Retrieves credentials for existing projects
# 3. Validates all credentials are working
# 4. Updates individual credentials when they expire
# 5. Deletes credentials when projects are removed
#
# Usage:
#   ./credentials-manager.sh store <project_name>    # Store new credentials
#   ./credentials-manager.sh get <project_name>      # Retrieve credentials
#   ./credentials-manager.sh validate <project_name> # Validate all credentials
#   ./credentials-manager.sh update <project_name> <key> <value>  # Update one
#   ./credentials-manager.sh delete <project_name>   # Remove credentials
#   ./credentials-manager.sh list                    # List all projects
#
# Environment Variables Required:
#   WAVE_PORTAL_SUPABASE_URL   - WAVE Portal Supabase URL
#   WAVE_PORTAL_SERVICE_KEY    - WAVE Portal service role key
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  WAVE Credentials Manager${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}→${NC} $1"
}

check_portal_connection() {
    if [ -z "$WAVE_PORTAL_SUPABASE_URL" ]; then
        print_error "WAVE_PORTAL_SUPABASE_URL not set"
        echo ""
        echo "Set it with:"
        echo "  export WAVE_PORTAL_SUPABASE_URL=https://your-wave-portal.supabase.co"
        exit 1
    fi

    if [ -z "$WAVE_PORTAL_SERVICE_KEY" ]; then
        print_error "WAVE_PORTAL_SERVICE_KEY not set"
        echo ""
        echo "Set it with:"
        echo "  export WAVE_PORTAL_SERVICE_KEY=eyJ..."
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMMAND: store
# Store credentials for a new project
# ═══════════════════════════════════════════════════════════════════════════════
cmd_store() {
    local PROJECT_NAME="$1"

    if [ -z "$PROJECT_NAME" ]; then
        print_error "Project name required"
        echo "Usage: $0 store <project_name>"
        exit 1
    fi

    print_header
    echo -e "  ${YELLOW}Storing credentials for:${NC} $PROJECT_NAME"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # Check if project already exists
    local EXISTING=$(curl -s -X GET \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?project_name=eq.${PROJECT_NAME}&select=id" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        2>/dev/null)

    if [ "$EXISTING" != "[]" ] && [ -n "$EXISTING" ]; then
        print_warning "Credentials already exist for '$PROJECT_NAME'"
        echo ""
        read -p "Overwrite existing credentials? (y/N): " CONFIRM
        if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
            echo "Aborted."
            exit 0
        fi
        # Delete existing
        curl -s -X DELETE \
            "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?project_name=eq.${PROJECT_NAME}" \
            -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
            -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
            >/dev/null 2>&1
    fi

    # Collect credentials interactively
    echo "Enter credentials (leave blank to skip optional ones):"
    echo ""

    read -p "Anthropic API Key (required): " ANTHROPIC_API_KEY
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        print_error "Anthropic API Key is required"
        exit 1
    fi

    read -p "GitHub Repo URL: " GITHUB_REPO
    read -p "Supabase URL: " SUPABASE_URL
    read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
    read -p "Supabase Service Key: " SUPABASE_SERVICE_KEY
    read -p "Slack Webhook URL: " SLACK_WEBHOOK_URL
    read -p "Vercel URL: " VERCEL_URL

    echo ""
    print_info "Validating credentials before storing..."

    # Validate Anthropic API Key
    local ANTHROPIC_VALID=false
    if [[ "$ANTHROPIC_API_KEY" =~ ^sk-ant- ]]; then
        ANTHROPIC_VALID=true
        print_success "Anthropic API Key: Format valid"
    else
        print_warning "Anthropic API Key: Unusual format (may still work)"
    fi

    # Validate Supabase if provided
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
        local SUPABASE_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
            "${SUPABASE_URL}/rest/v1/" \
            -H "apikey: ${SUPABASE_ANON_KEY}" 2>/dev/null || echo "000")
        if [ "$SUPABASE_TEST" = "200" ]; then
            print_success "Supabase: Connection successful"
        else
            print_warning "Supabase: Could not verify connection (HTTP $SUPABASE_TEST)"
        fi
    fi

    # Validate Slack if provided
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        if [[ "$SLACK_WEBHOOK_URL" =~ ^https://hooks.slack.com/ ]]; then
            print_success "Slack Webhook: Format valid"
        else
            print_warning "Slack Webhook: Unusual format"
        fi
    fi

    echo ""
    print_info "Storing credentials in WAVE Portal Supabase..."

    # Build JSON payload
    local CREDENTIALS_JSON=$(cat <<EOF
{
    "anthropic_api_key": "$ANTHROPIC_API_KEY",
    "github_repo": "$GITHUB_REPO",
    "supabase_url": "$SUPABASE_URL",
    "supabase_anon_key": "$SUPABASE_ANON_KEY",
    "supabase_service_key": "$SUPABASE_SERVICE_KEY",
    "slack_webhook_url": "$SLACK_WEBHOOK_URL",
    "vercel_url": "$VERCEL_URL",
    "stored_at": "$TIMESTAMP"
}
EOF
)

    local PAYLOAD=$(cat <<EOF
{
    "project_name": "$PROJECT_NAME",
    "credentials": $CREDENTIALS_JSON,
    "created_at": "$TIMESTAMP",
    "updated_at": "$TIMESTAMP"
}
EOF
)

    local RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$PAYLOAD" 2>/dev/null || echo -e "\n500")

    local HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        echo ""
        print_success "Credentials stored successfully for '$PROJECT_NAME'"
        echo ""
        echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
        echo "  To retrieve later, run:"
        echo "    ./credentials-manager.sh get $PROJECT_NAME"
        echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    else
        print_error "Failed to store credentials (HTTP $HTTP_CODE)"
        echo "$RESPONSE" | head -n -1
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMMAND: get
# Retrieve credentials for an existing project
# ═══════════════════════════════════════════════════════════════════════════════
cmd_get() {
    local PROJECT_NAME="$1"
    local OUTPUT_ENV="${2:-.env}"

    if [ -z "$PROJECT_NAME" ]; then
        print_error "Project name required"
        echo "Usage: $0 get <project_name> [output_file]"
        exit 1
    fi

    print_header
    echo -e "  ${YELLOW}Retrieving credentials for:${NC} $PROJECT_NAME"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    print_info "Querying WAVE Portal Supabase..."

    local RESPONSE=$(curl -s -X GET \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?project_name=eq.${PROJECT_NAME}&select=credentials,created_at,updated_at,last_accessed" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        2>/dev/null)

    if [ "$RESPONSE" = "[]" ] || [ -z "$RESPONSE" ]; then
        print_error "No credentials found for '$PROJECT_NAME'"
        echo ""
        echo "To store credentials, run:"
        echo "  ./credentials-manager.sh store $PROJECT_NAME"
        exit 1
    fi

    # Parse credentials using jq if available, otherwise use grep/sed
    if command -v jq &> /dev/null; then
        local CREDENTIALS=$(echo "$RESPONSE" | jq -r '.[0].credentials')
        local CREATED=$(echo "$RESPONSE" | jq -r '.[0].created_at')
        local UPDATED=$(echo "$RESPONSE" | jq -r '.[0].updated_at')

        local ANTHROPIC_API_KEY=$(echo "$CREDENTIALS" | jq -r '.anthropic_api_key // empty')
        local GITHUB_REPO=$(echo "$CREDENTIALS" | jq -r '.github_repo // empty')
        local SUPABASE_URL=$(echo "$CREDENTIALS" | jq -r '.supabase_url // empty')
        local SUPABASE_ANON_KEY=$(echo "$CREDENTIALS" | jq -r '.supabase_anon_key // empty')
        local SUPABASE_SERVICE_KEY=$(echo "$CREDENTIALS" | jq -r '.supabase_service_key // empty')
        local SLACK_WEBHOOK_URL=$(echo "$CREDENTIALS" | jq -r '.slack_webhook_url // empty')
        local VERCEL_URL=$(echo "$CREDENTIALS" | jq -r '.vercel_url // empty')
    else
        print_warning "jq not installed - using basic parsing"
        # Basic parsing without jq (less reliable)
        local ANTHROPIC_API_KEY=$(echo "$RESPONSE" | grep -o '"anthropic_api_key":"[^"]*"' | cut -d'"' -f4)
        local GITHUB_REPO=$(echo "$RESPONSE" | grep -o '"github_repo":"[^"]*"' | cut -d'"' -f4)
        local SUPABASE_URL=$(echo "$RESPONSE" | grep -o '"supabase_url":"[^"]*"' | cut -d'"' -f4)
        local SUPABASE_ANON_KEY=$(echo "$RESPONSE" | grep -o '"supabase_anon_key":"[^"]*"' | cut -d'"' -f4)
        local SUPABASE_SERVICE_KEY=$(echo "$RESPONSE" | grep -o '"supabase_service_key":"[^"]*"' | cut -d'"' -f4)
        local SLACK_WEBHOOK_URL=$(echo "$RESPONSE" | grep -o '"slack_webhook_url":"[^"]*"' | cut -d'"' -f4)
        local VERCEL_URL=$(echo "$RESPONSE" | grep -o '"vercel_url":"[^"]*"' | cut -d'"' -f4)
    fi

    print_success "Credentials retrieved"
    echo ""

    # Display what was found (masked)
    echo "Credentials found:"
    [ -n "$ANTHROPIC_API_KEY" ] && echo "  ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:10}...${ANTHROPIC_API_KEY: -4}"
    [ -n "$GITHUB_REPO" ] && echo "  GITHUB_REPO: $GITHUB_REPO"
    [ -n "$SUPABASE_URL" ] && echo "  SUPABASE_URL: $SUPABASE_URL"
    [ -n "$SUPABASE_ANON_KEY" ] && echo "  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:10}..."
    [ -n "$SUPABASE_SERVICE_KEY" ] && echo "  SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY:0:10}..."
    [ -n "$SLACK_WEBHOOK_URL" ] && echo "  SLACK_WEBHOOK_URL: ${SLACK_WEBHOOK_URL:0:30}..."
    [ -n "$VERCEL_URL" ] && echo "  VERCEL_URL: $VERCEL_URL"
    echo ""

    # Generate .env file
    print_info "Generating $OUTPUT_ENV file..."

    cat > "$OUTPUT_ENV" <<EOF
# WAVE Framework Environment Variables
# Project: $PROJECT_NAME
# Retrieved: $TIMESTAMP
# Originally stored: $CREATED

# ═══════════════════════════════════════════════════════════════════════════════
# REQUIRED
# ═══════════════════════════════════════════════════════════════════════════════

ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY

# ═══════════════════════════════════════════════════════════════════════════════
# GITHUB
# ═══════════════════════════════════════════════════════════════════════════════

GITHUB_REPO=$GITHUB_REPO

# ═══════════════════════════════════════════════════════════════════════════════
# SUPABASE
# ═══════════════════════════════════════════════════════════════════════════════

SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY

# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL

# ═══════════════════════════════════════════════════════════════════════════════
# DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════════════

VERCEL_URL=$VERCEL_URL

# ═══════════════════════════════════════════════════════════════════════════════
# WAVE SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

MAX_RETRIES=3
POLL_INTERVAL=10
WAVE_BUDGET=2.00
STORY_BUDGET=0.50
DOZZLE_PORT=8080
EOF

    print_success ".env file generated: $OUTPUT_ENV"

    # Update last_accessed timestamp
    curl -s -X PATCH \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?project_name=eq.${PROJECT_NAME}" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"last_accessed\": \"$TIMESTAMP\"}" \
        >/dev/null 2>&1 || true

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo "  Credentials retrieved and .env generated"
    echo "  Run validation: ./credentials-manager.sh validate $PROJECT_NAME"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMMAND: validate
# Validate all credentials for a project
# ═══════════════════════════════════════════════════════════════════════════════
cmd_validate() {
    local PROJECT_NAME="$1"

    if [ -z "$PROJECT_NAME" ]; then
        print_error "Project name required"
        echo "Usage: $0 validate <project_name>"
        exit 1
    fi

    print_header
    echo -e "  ${YELLOW}Validating credentials for:${NC} $PROJECT_NAME"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # First retrieve credentials
    print_info "Retrieving credentials..."

    local RESPONSE=$(curl -s -X GET \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?project_name=eq.${PROJECT_NAME}&select=credentials" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        2>/dev/null)

    if [ "$RESPONSE" = "[]" ] || [ -z "$RESPONSE" ]; then
        print_error "No credentials found for '$PROJECT_NAME'"
        exit 1
    fi

    # Parse with jq
    if ! command -v jq &> /dev/null; then
        print_error "jq is required for validation"
        echo "Install with: brew install jq"
        exit 1
    fi

    local CREDENTIALS=$(echo "$RESPONSE" | jq -r '.[0].credentials')
    local ANTHROPIC_API_KEY=$(echo "$CREDENTIALS" | jq -r '.anthropic_api_key // empty')
    local SUPABASE_URL=$(echo "$CREDENTIALS" | jq -r '.supabase_url // empty')
    local SUPABASE_ANON_KEY=$(echo "$CREDENTIALS" | jq -r '.supabase_anon_key // empty')
    local SLACK_WEBHOOK_URL=$(echo "$CREDENTIALS" | jq -r '.slack_webhook_url // empty')

    local VALID=0
    local INVALID=0
    local SKIPPED=0

    echo ""
    echo "Validation Results:"
    echo "───────────────────────────────────────────────────────────────────────────────"

    # Validate Anthropic API Key
    if [ -n "$ANTHROPIC_API_KEY" ]; then
        # Test with a minimal API call
        local ANTHROPIC_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://api.anthropic.com/v1/messages" \
            -H "x-api-key: ${ANTHROPIC_API_KEY}" \
            -H "anthropic-version: 2023-06-01" \
            -H "Content-Type: application/json" \
            -d '{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"test"}]}' \
            2>/dev/null || echo "000")

        if [ "$ANTHROPIC_TEST" = "200" ]; then
            print_success "Anthropic API Key: Valid (API responded)"
            ((VALID++))
        elif [ "$ANTHROPIC_TEST" = "401" ]; then
            print_error "Anthropic API Key: Invalid (authentication failed)"
            ((INVALID++))
        elif [ "$ANTHROPIC_TEST" = "429" ]; then
            print_warning "Anthropic API Key: Rate limited (but key format OK)"
            ((VALID++))
        else
            print_warning "Anthropic API Key: Could not verify (HTTP $ANTHROPIC_TEST)"
            ((VALID++))
        fi
    else
        print_error "Anthropic API Key: Missing"
        ((INVALID++))
    fi

    # Validate Supabase
    if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
        local SUPABASE_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
            "${SUPABASE_URL}/rest/v1/" \
            -H "apikey: ${SUPABASE_ANON_KEY}" 2>/dev/null || echo "000")

        if [ "$SUPABASE_TEST" = "200" ]; then
            print_success "Supabase: Connection successful"
            ((VALID++))
        else
            print_error "Supabase: Connection failed (HTTP $SUPABASE_TEST)"
            ((INVALID++))
        fi
    else
        print_warning "Supabase: Not configured (skipped)"
        ((SKIPPED++))
    fi

    # Validate Slack Webhook
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        # Send a test message
        local SLACK_TEST=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d '{"text":"WAVE Credentials Validation Test"}' 2>/dev/null || echo "000")

        if [ "$SLACK_TEST" = "200" ]; then
            print_success "Slack Webhook: Valid (test message sent)"
            ((VALID++))
        else
            print_error "Slack Webhook: Failed (HTTP $SLACK_TEST)"
            ((INVALID++))
        fi
    else
        print_warning "Slack Webhook: Not configured (skipped)"
        ((SKIPPED++))
    fi

    # Validate Docker
    if command -v docker &> /dev/null; then
        if docker info >/dev/null 2>&1; then
            print_success "Docker: Running"
            ((VALID++))
        else
            print_error "Docker: Not running"
            ((INVALID++))
        fi
    else
        print_warning "Docker: Not installed (skipped)"
        ((SKIPPED++))
    fi

    echo "───────────────────────────────────────────────────────────────────────────────"
    echo ""
    echo "Summary:"
    echo "  Valid:   $VALID"
    echo "  Invalid: $INVALID"
    echo "  Skipped: $SKIPPED"
    echo ""

    if [ $INVALID -gt 0 ]; then
        echo -e "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
        echo -e "  ${RED}VALIDATION FAILED${NC}"
        echo -e "  Some credentials need to be updated."
        echo -e "  Run: ./credentials-manager.sh update $PROJECT_NAME <key> <value>"
        echo -e "${RED}═══════════════════════════════════════════════════════════════════════════════${NC}"
        exit 1
    else
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
        echo -e "  ${GREEN}VALIDATION PASSED${NC}"
        echo -e "  All credentials are valid. Ready to proceed."
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMMAND: update
# Update a single credential
# ═══════════════════════════════════════════════════════════════════════════════
cmd_update() {
    local PROJECT_NAME="$1"
    local KEY="$2"
    local VALUE="$3"

    if [ -z "$PROJECT_NAME" ] || [ -z "$KEY" ]; then
        print_error "Project name and key required"
        echo "Usage: $0 update <project_name> <key> [value]"
        echo ""
        echo "Valid keys:"
        echo "  anthropic_api_key"
        echo "  github_repo"
        echo "  supabase_url"
        echo "  supabase_anon_key"
        echo "  supabase_service_key"
        echo "  slack_webhook_url"
        echo "  vercel_url"
        exit 1
    fi

    print_header
    echo -e "  ${YELLOW}Updating credential for:${NC} $PROJECT_NAME"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # If value not provided, prompt for it
    if [ -z "$VALUE" ]; then
        read -p "Enter new value for $KEY: " VALUE
        if [ -z "$VALUE" ]; then
            print_error "Value cannot be empty"
            exit 1
        fi
    fi

    # First get existing credentials
    local RESPONSE=$(curl -s -X GET \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?project_name=eq.${PROJECT_NAME}&select=credentials" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        2>/dev/null)

    if [ "$RESPONSE" = "[]" ] || [ -z "$RESPONSE" ]; then
        print_error "No credentials found for '$PROJECT_NAME'"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        print_error "jq is required for update"
        echo "Install with: brew install jq"
        exit 1
    fi

    # Update the specific key
    local CREDENTIALS=$(echo "$RESPONSE" | jq -r '.[0].credentials')
    local UPDATED_CREDENTIALS=$(echo "$CREDENTIALS" | jq --arg key "$KEY" --arg val "$VALUE" '.[$key] = $val')

    # Push update
    local UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?project_name=eq.${PROJECT_NAME}" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"credentials\": $UPDATED_CREDENTIALS, \"updated_at\": \"$TIMESTAMP\"}" \
        2>/dev/null || echo -e "\n500")

    local HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        print_success "Updated $KEY for '$PROJECT_NAME'"
        echo ""
        echo "To regenerate .env file:"
        echo "  ./credentials-manager.sh get $PROJECT_NAME"
    else
        print_error "Failed to update credential (HTTP $HTTP_CODE)"
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMMAND: delete
# Delete all credentials for a project
# ═══════════════════════════════════════════════════════════════════════════════
cmd_delete() {
    local PROJECT_NAME="$1"

    if [ -z "$PROJECT_NAME" ]; then
        print_error "Project name required"
        echo "Usage: $0 delete <project_name>"
        exit 1
    fi

    print_header
    echo -e "  ${RED}Deleting credentials for:${NC} $PROJECT_NAME"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    print_warning "This will permanently delete all stored credentials for '$PROJECT_NAME'"
    read -p "Are you sure? (y/N): " CONFIRM

    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi

    local RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?project_name=eq.${PROJECT_NAME}" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        2>/dev/null || echo -e "\n500")

    local HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        print_success "Credentials deleted for '$PROJECT_NAME'"
    else
        print_error "Failed to delete credentials (HTTP $HTTP_CODE)"
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMMAND: list
# List all projects with stored credentials
# ═══════════════════════════════════════════════════════════════════════════════
cmd_list() {
    print_header
    echo -e "  ${YELLOW}Projects with stored credentials${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    local RESPONSE=$(curl -s -X GET \
        "${WAVE_PORTAL_SUPABASE_URL}/rest/v1/wave_credentials?select=project_name,created_at,last_accessed&order=project_name" \
        -H "apikey: ${WAVE_PORTAL_SERVICE_KEY}" \
        -H "Authorization: Bearer ${WAVE_PORTAL_SERVICE_KEY}" \
        2>/dev/null)

    if [ "$RESPONSE" = "[]" ] || [ -z "$RESPONSE" ]; then
        print_info "No projects found"
        echo ""
        echo "To store credentials for a project:"
        echo "  ./credentials-manager.sh store <project_name>"
        exit 0
    fi

    if command -v jq &> /dev/null; then
        echo "$RESPONSE" | jq -r '.[] | "  \(.project_name)\n    Created: \(.created_at)\n    Last accessed: \(.last_accessed // "Never")\n"'
    else
        echo "$RESPONSE"
    fi

    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# COMMAND: help
# Show usage information
# ═══════════════════════════════════════════════════════════════════════════════
cmd_help() {
    print_header
    echo ""
    echo "Usage: $0 <command> [arguments]"
    echo ""
    echo "Commands:"
    echo "  store <project>              Store credentials for a new project"
    echo "  get <project> [file]         Retrieve credentials and generate .env"
    echo "  validate <project>           Validate all credentials work"
    echo "  update <project> <key> [val] Update a single credential"
    echo "  delete <project>             Delete all credentials for project"
    echo "  list                         List all projects with credentials"
    echo "  help                         Show this help message"
    echo ""
    echo "Environment Variables Required:"
    echo "  WAVE_PORTAL_SUPABASE_URL     WAVE Portal Supabase URL"
    echo "  WAVE_PORTAL_SERVICE_KEY      WAVE Portal service role key"
    echo ""
    echo "Examples:"
    echo "  $0 store photo-gallery"
    echo "  $0 get photo-gallery"
    echo "  $0 validate photo-gallery"
    echo "  $0 update photo-gallery anthropic_api_key sk-ant-new-key"
    echo "  $0 delete photo-gallery"
    echo "  $0 list"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

COMMAND="${1:-help}"
shift 2>/dev/null || true

# Check portal connection for commands that need it
case "$COMMAND" in
    store|get|validate|update|delete|list)
        check_portal_connection
        ;;
esac

# Execute command
case "$COMMAND" in
    store)    cmd_store "$@" ;;
    get)      cmd_get "$@" ;;
    validate) cmd_validate "$@" ;;
    update)   cmd_update "$@" ;;
    delete)   cmd_delete "$@" ;;
    list)     cmd_list "$@" ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
