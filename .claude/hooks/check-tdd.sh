#!/bin/bash
# Wave V2 Hook: TDD Enforcement (Project-Agnostic)
# Warns if implementing code without tests

set -e

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

FILE="$1"
ACTION="$2"  # "pre" or "post"

# Skip if file doesn't match source pattern
is_source_file() {
    local file="$1"
    case "$PROJECT_TYPE" in
        nodejs)
            echo "$file" | grep -qE "\.(ts|tsx|js|jsx)$" && return 0 ;;
        python)
            echo "$file" | grep -qE "\.py$" && return 0 ;;
        go)
            echo "$file" | grep -qE "\.go$" && return 0 ;;
        rust)
            echo "$file" | grep -qE "\.rs$" && return 0 ;;
        java)
            echo "$file" | grep -qE "\.java$" && return 0 ;;
        *)
            return 0 ;;
    esac
    return 1
}

# Check if file is a test file
is_test_file() {
    local file="$1"
    case "$PROJECT_TYPE" in
        nodejs)
            echo "$file" | grep -qE "\.(test|spec)\.(ts|tsx|js|jsx)$" && return 0 ;;
        python)
            echo "$file" | grep -qE "(^test_|_test\.py$)" && return 0 ;;
        go)
            echo "$file" | grep -qE "_test\.go$" && return 0 ;;
        rust)
            echo "$file" | grep -qE "_test\.rs$" && return 0 ;;
        java)
            echo "$file" | grep -qE "(Test|Tests)\.java$" && return 0 ;;
        *)
            echo "$file" | grep -qE "(test|spec)" && return 0 ;;
    esac
    return 1
}

# Get corresponding test file path
get_test_path() {
    local file="$1"
    local dir=$(dirname "$file")
    local basename=$(basename "$file")

    case "$PROJECT_TYPE" in
        nodejs)
            local name="${basename%.*}"
            local ext="${basename##*.}"
            echo "$dir/__tests__/${name}.test.${ext}"
            ;;
        python)
            echo "$dir/test_${basename}"
            ;;
        go)
            echo "${file%.go}_test.go"
            ;;
        rust)
            echo "${file%.rs}_test.rs"
            ;;
        java)
            local name="${basename%.java}"
            echo "$dir/${name}Test.java"
            ;;
        *)
            echo "$dir/${basename%.}_test.*"
            ;;
    esac
}

# Skip if not a source file or is a test file
if ! is_source_file "$FILE" || is_test_file "$FILE"; then
    exit 0
fi

# Get expected test path
TEST_PATH=$(get_test_path "$FILE")

# Check multiple possible test locations
TEST_EXISTS=false
DIR=$(dirname "$FILE")
BASENAME=$(basename "$FILE")

case "$PROJECT_TYPE" in
    nodejs)
        NAME="${BASENAME%.*}"
        EXT="${BASENAME##*.}"
        POSSIBLE_TESTS=(
            "$DIR/__tests__/${NAME}.test.${EXT}"
            "$DIR/__tests__/${NAME}.spec.${EXT}"
            "$DIR/${NAME}.test.${EXT}"
            "$DIR/${NAME}.spec.${EXT}"
        )
        ;;
    python)
        POSSIBLE_TESTS=(
            "$DIR/test_${BASENAME}"
            "${FILE%/*}/tests/test_${BASENAME}"
            "tests/${FILE#*/}"
        )
        ;;
    *)
        POSSIBLE_TESTS=("$TEST_PATH")
        ;;
esac

for TEST in "${POSSIBLE_TESTS[@]}"; do
    if [ -f "$TEST" ]; then
        TEST_EXISTS=true
        break
    fi
done

if [ "$TEST_EXISTS" = false ]; then
    echo ""
    echo "=============================================="
    echo "  TDD WARNING: No Test File Found"
    echo "=============================================="
    echo ""
    echo "  Project: $PROJECT_TYPE"
    echo "  Source:  $FILE"
    echo ""
    echo "  Expected test in one of:"
    for path in "${POSSIBLE_TESTS[@]}"; do
        echo "    - $path"
    done
    echo ""
    echo "  Wave V2 TDD Protocol:"
    echo "    1. RED:   Write failing test first"
    echo "    2. GREEN: Write minimum code to pass"
    echo "    3. REFACTOR: Clean up"
    echo ""
    echo "  Run: /tdd story {STORY-ID}"
    echo ""
    echo "=============================================="
    # Warning only, don't block
fi

exit 0
