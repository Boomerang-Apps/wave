#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# WAVE MERGE CONFLICT HANDLER LIBRARY (GAP-005)
# ═══════════════════════════════════════════════════════════════════════════════
# Detects merge conflicts and creates ESCALATION signals instead of auto-resolving
# Source this file in other scripts: source lib/merge-conflict-handler.sh
#
# Based on:
# - Git Merge Documentation
# - WAVE ESCALATION Signal Schema (.claudecode/signals/SCHEMAS.md)
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# DETECT MERGE CONFLICTS
# ─────────────────────────────────────────────────────────────────────────────
# Returns 0 if conflicts exist, 1 if no conflicts
# Usage: if detect_merge_conflicts; then echo "Has conflicts"; fi

detect_merge_conflicts() {
    # Check for unmerged files (conflict markers)
    local unmerged_count
    unmerged_count=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l | tr -d ' ')

    if [ "$unmerged_count" -gt 0 ]; then
        return 0  # Has conflicts
    fi
    return 1  # No conflicts
}

# ─────────────────────────────────────────────────────────────────────────────
# GET CONFLICTING FILES
# ─────────────────────────────────────────────────────────────────────────────
# Outputs newline-separated list of files with conflicts
# Usage: files=$(get_conflicting_files)

get_conflicting_files() {
    git diff --name-only --diff-filter=U 2>/dev/null
}

# ─────────────────────────────────────────────────────────────────────────────
# CHECK IF MERGE WOULD CONFLICT
# ─────────────────────────────────────────────────────────────────────────────
# Performs a dry-run merge to check for conflicts without committing
# Returns 0 if merge would have conflicts, 1 if clean
# Usage: if check_merge_would_conflict "branch-name"; then echo "Will conflict"; fi

check_merge_would_conflict() {
    local branch="$1"

    if [ -z "$branch" ]; then
        echo "[ERROR] Branch name required"
        return 2
    fi

    # Try merge with --no-commit to detect conflicts
    local merge_result
    git merge --no-commit --no-ff "$branch" 2>/dev/null
    merge_result=$?

    # Abort the merge attempt
    git merge --abort 2>/dev/null || true

    if [ "$merge_result" -ne 0 ]; then
        return 0  # Would conflict
    fi
    return 1  # Would be clean
}

# ─────────────────────────────────────────────────────────────────────────────
# CREATE MERGE ESCALATION SIGNAL
# ─────────────────────────────────────────────────────────────────────────────
# Creates an ESCALATION signal file for merge conflicts
# Usage: create_merge_escalation_signal "$WAVE" "$CLAUDE_DIR" "$source_branch" "$target_branch" "$files"

create_merge_escalation_signal() {
    local wave="$1"
    local claude_dir="$2"
    local source_branch="$3"
    local target_branch="$4"
    local conflicting_files="$5"

    if [ -z "$wave" ] || [ -z "$claude_dir" ]; then
        echo "[ERROR] Wave and claude_dir required"
        return 1
    fi

    local signal_file="${claude_dir}/signal-wave${wave}-ESCALATION.json"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Convert newline-separated files to JSON array
    local files_json="[]"
    if [ -n "$conflicting_files" ]; then
        files_json=$(echo "$conflicting_files" | jq -R -s 'split("\n") | map(select(length > 0))')
    fi

    # Create ESCALATION signal following schema
    cat > "$signal_file" <<EOF
{
    "wave": $wave,
    "type": "ESCALATION",
    "reason": "merge_conflict",
    "source_branch": "$source_branch",
    "target_branch": "$target_branch",
    "conflicting_files": $files_json,
    "requires": "HUMAN_INTERVENTION",
    "suggested_actions": [
        "Review conflicting files manually",
        "Resolve conflicts using git mergetool or editor",
        "Run: git status to see conflict details",
        "After resolving: git add <files> && git commit",
        "Then re-run the merge-watcher"
    ],
    "timestamp": "$timestamp"
}
EOF

    if [ -f "$signal_file" ]; then
        echo "[ESCALATION] Merge conflict signal created: $signal_file"
        return 0
    else
        echo "[ERROR] Failed to create escalation signal"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# ABORT MERGE AND ESCALATE
# ─────────────────────────────────────────────────────────────────────────────
# Aborts the current merge and creates an escalation signal
# Usage: abort_merge_and_escalate "$WAVE" "$CLAUDE_DIR" "$source_branch" "$target_branch"

abort_merge_and_escalate() {
    local wave="$1"
    local claude_dir="$2"
    local source_branch="$3"
    local target_branch="$4"

    # Get conflicting files before aborting
    local conflicting_files
    conflicting_files=$(get_conflicting_files)

    # Abort the merge
    git merge --abort 2>/dev/null || git reset --hard HEAD 2>/dev/null || true

    # Create escalation signal
    create_merge_escalation_signal "$wave" "$claude_dir" "$source_branch" "$target_branch" "$conflicting_files"

    return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# SAFE MERGE WITH CONFLICT DETECTION
# ─────────────────────────────────────────────────────────────────────────────
# Attempts merge and escalates on conflict instead of auto-resolving
# Returns: 0 = success, 1 = escalated (conflicts), 2 = error
# Usage: safe_merge_with_escalation "$branch" "$wave" "$claude_dir" "$merge_message"

safe_merge_with_escalation() {
    local branch="$1"
    local wave="$2"
    local claude_dir="$3"
    local merge_message="${4:-Merge $branch}"

    if [ -z "$branch" ]; then
        echo "[ERROR] Branch name required for merge"
        return 2
    fi

    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

    # Attempt the merge
    if ! git merge --no-edit -m "$merge_message" "$branch" 2>/dev/null; then
        # Merge failed - check if it's a conflict
        if detect_merge_conflicts; then
            echo "[CONFLICT] Merge conflicts detected - escalating for human review"
            abort_merge_and_escalate "$wave" "$claude_dir" "$branch" "$current_branch"
            return 1
        else
            # Some other merge error
            echo "[ERROR] Merge failed for non-conflict reason"
            git merge --abort 2>/dev/null || true
            return 2
        fi
    fi

    echo "[SUCCESS] Merge completed cleanly"
    return 0
}

# Export functions if being tested
export -f detect_merge_conflicts 2>/dev/null || true
export -f get_conflicting_files 2>/dev/null || true
export -f check_merge_would_conflict 2>/dev/null || true
export -f create_merge_escalation_signal 2>/dev/null || true
export -f abort_merge_and_escalate 2>/dev/null || true
export -f safe_merge_with_escalation 2>/dev/null || true
