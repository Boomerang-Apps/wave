#!/bin/bash
# Wave V2 Hooks: Configuration Loader
# Auto-detects project settings or reads from .claude/config.json

# Default directories (can be overridden by config.json)
export SIGNALS_DIR="${SIGNALS_DIR:-.claude/signals}"
export STORIES_DIR="${STORIES_DIR:-stories}"
export TESTS_DIR="${TESTS_DIR:-}"
export SRC_DIR="${SRC_DIR:-}"

# Load project config if exists
CONFIG_FILE=".claude/config.json"
if [ -f "$CONFIG_FILE" ]; then
    # Extract values using grep/sed (portable, no jq required)
    if grep -q '"storiesDir"' "$CONFIG_FILE"; then
        STORIES_DIR=$(grep -oE '"storiesDir":\s*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    fi
    if grep -q '"signalsDir"' "$CONFIG_FILE"; then
        SIGNALS_DIR=$(grep -oE '"signalsDir":\s*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    fi
    if grep -q '"srcDir"' "$CONFIG_FILE"; then
        SRC_DIR=$(grep -oE '"srcDir":\s*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    fi
    if grep -q '"testsDir"' "$CONFIG_FILE"; then
        TESTS_DIR=$(grep -oE '"testsDir":\s*"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
    fi
fi

# Auto-detect project type if not configured
detect_project_type() {
    if [ -f "package.json" ]; then
        echo "nodejs"
    elif [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
        echo "python"
    elif [ -f "go.mod" ]; then
        echo "go"
    elif [ -f "Cargo.toml" ]; then
        echo "rust"
    elif [ -f "pom.xml" ] || [ -f "build.gradle" ]; then
        echo "java"
    else
        echo "unknown"
    fi
}

# Auto-detect source directory
detect_src_dir() {
    local project_type=$(detect_project_type)

    if [ -n "$SRC_DIR" ]; then
        echo "$SRC_DIR"
        return
    fi

    case "$project_type" in
        nodejs)
            if [ -d "src" ]; then echo "src"
            elif [ -d "lib" ]; then echo "lib"
            elif [ -d "app" ]; then echo "app"
            else echo "."
            fi
            ;;
        python)
            if [ -d "src" ]; then echo "src"
            elif [ -d "lib" ]; then echo "lib"
            else echo "."
            fi
            ;;
        go)
            if [ -d "cmd" ]; then echo "cmd"
            elif [ -d "pkg" ]; then echo "pkg"
            else echo "."
            fi
            ;;
        rust)
            echo "src"
            ;;
        java)
            echo "src/main/java"
            ;;
        *)
            echo "."
            ;;
    esac
}

# Auto-detect tests directory
detect_tests_dir() {
    local project_type=$(detect_project_type)

    if [ -n "$TESTS_DIR" ]; then
        echo "$TESTS_DIR"
        return
    fi

    case "$project_type" in
        nodejs)
            if [ -d "__tests__" ]; then echo "__tests__"
            elif [ -d "tests" ]; then echo "tests"
            elif [ -d "test" ]; then echo "test"
            else echo "src"  # colocated tests
            fi
            ;;
        python)
            if [ -d "tests" ]; then echo "tests"
            elif [ -d "test" ]; then echo "test"
            else echo "."
            fi
            ;;
        go)
            echo "."  # Go tests are colocated
            ;;
        rust)
            if [ -d "tests" ]; then echo "tests"
            else echo "src"
            fi
            ;;
        java)
            echo "src/test/java"
            ;;
        *)
            if [ -d "tests" ]; then echo "tests"
            elif [ -d "test" ]; then echo "test"
            else echo "."
            fi
            ;;
    esac
}

# Auto-detect test file pattern
detect_test_pattern() {
    local project_type=$(detect_project_type)

    case "$project_type" in
        nodejs)
            echo "*.test.{ts,tsx,js,jsx}|*.spec.{ts,tsx,js,jsx}"
            ;;
        python)
            echo "test_*.py|*_test.py"
            ;;
        go)
            echo "*_test.go"
            ;;
        rust)
            echo "*_test.rs"
            ;;
        java)
            echo "*Test.java|*Tests.java"
            ;;
        *)
            echo "*.test.*|*.spec.*|test_*"
            ;;
    esac
}

# Auto-detect source file pattern
detect_source_pattern() {
    local project_type=$(detect_project_type)

    case "$project_type" in
        nodejs)
            echo "*.ts|*.tsx|*.js|*.jsx"
            ;;
        python)
            echo "*.py"
            ;;
        go)
            echo "*.go"
            ;;
        rust)
            echo "*.rs"
            ;;
        java)
            echo "*.java"
            ;;
        *)
            echo "*"
            ;;
    esac
}

# Export detected values
export PROJECT_TYPE=$(detect_project_type)
export SRC_DIR=$(detect_src_dir)
export TESTS_DIR=$(detect_tests_dir)
export TEST_PATTERN=$(detect_test_pattern)
export SOURCE_PATTERN=$(detect_source_pattern)

# Ensure signals directory exists
mkdir -p "$SIGNALS_DIR"
