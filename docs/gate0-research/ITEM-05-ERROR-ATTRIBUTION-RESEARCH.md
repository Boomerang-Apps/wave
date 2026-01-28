# Gate 0 Research Report: Item #5 - Enhanced Error Attribution

## Overview

**Item:** Enhanced Error Attribution
**Proposed by:** Grok
**Researcher:** Claude Opus 4.5
**Date:** 2026-01-28
**Status:** Research Complete - **VALIDATED**

---

## 1. Current State Analysis

### Current Violation Format

From `agent_worker.py`:
```python
violations.append(f"CRITICAL: Found dangerous pattern '{pattern}'")
```

Output:
```
CRITICAL: Found dangerous pattern 'api_key ='
```

### What's Missing

| Field | Current | Needed |
|-------|---------|--------|
| Severity | Yes (CRITICAL/WARN) | Yes |
| Pattern | Yes | Yes |
| File path | NO | YES |
| Line number | NO | YES |
| Context | NO | YES |
| Principle ID | NO | YES |

### Problem

When a safety violation occurs, developers cannot easily locate the issue:
1. No file path - which file triggered it?
2. No line number - where in the file?
3. No context - what's around the violation?
4. No principle ID - which WAVE principle was violated?

---

## 2. Evidence from Logs

From WAVE1-FE-002 safety block:
```
[08:11:50] [FE-1] SAFETY BLOCK: Score 0.70 below threshold
[08:11:50] [FE-1]   - CRITICAL: Found dangerous pattern 'api_key ='
```

**What we needed:**
```
[08:11:50] [FE-1] SAFETY BLOCK: Score 0.70 below threshold
[08:11:50] [FE-1]   - CRITICAL [P002] Found dangerous pattern 'api_key ='
[08:11:50] [FE-1]     File: app/api/transform/route.ts
[08:11:50] [FE-1]     Line: 42
[08:11:50] [FE-1]     Context: const api_key = process.env.OPENAI_KEY
```

---

## 3. Recommendation: SafetyViolation Dataclass

### Design

```python
@dataclass
class SafetyViolation:
    """Enhanced safety violation with full attribution."""
    principle_id: str          # P001, P002, etc.
    severity: str              # critical, warning, info
    message: str               # Human-readable description
    pattern: str               # Regex pattern that matched
    file_path: Optional[str]   # File where violation occurred
    line_number: Optional[int] # Line number in file
    column: Optional[int]      # Column position
    context: Optional[str]     # Surrounding code snippet
    matched_text: str          # Actual text that matched

    def to_log_string(self) -> str:
        """Format for logging."""
        lines = [f"[{self.principle_id}] {self.severity.upper()}: {self.message}"]
        if self.file_path:
            lines.append(f"  File: {self.file_path}")
        if self.line_number:
            lines.append(f"  Line: {self.line_number}")
        if self.context:
            lines.append(f"  Context: {self.context[:80]}...")
        return "\n".join(lines)
```

---

## 4. Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Enhanced Safety Checker                     │
├─────────────────────────────────────────────────────────────┤
│  1. Accept content + file_path                              │
│  2. For each pattern match:                                 │
│     a. Find line number (content.count('\n'))               │
│     b. Extract context (line + surrounding)                 │
│     c. Create SafetyViolation with full attribution         │
│  3. Return list of SafetyViolation objects                  │
│  4. Log with full attribution                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. TDD Implementation Plan

### Tests to Write FIRST

```python
class TestSafetyViolation:

    def test_violation_has_file_path(self):
        """Violation should include file path."""
        from src.safety.violations import SafetyViolation

        v = SafetyViolation(
            principle_id="P001",
            severity="critical",
            message="Found rm -rf",
            pattern=r"rm\s+-rf",
            file_path="scripts/deploy.sh",
            line_number=42,
            matched_text="rm -rf /tmp"
        )
        assert v.file_path == "scripts/deploy.sh"

    def test_violation_has_line_number(self):
        """Violation should include line number."""
        # ... test code ...

    def test_score_returns_violations_with_attribution(self):
        """Score method should return attributed violations."""
        from src.agent_worker import ConstitutionalSafety

        safety = ConstitutionalSafety()
        content = '''
        line 1
        line 2
        rm -rf /
        line 4
        '''
        score, violations = safety.score(content, file_path="test.sh")

        assert len(violations) > 0
        assert violations[0].line_number == 4
        assert violations[0].file_path == "test.sh"
```

---

## 6. Files to Create/Modify

### Create

| File | Purpose |
|------|---------|
| `src/safety/violations.py` | SafetyViolation dataclass |
| `tests/test_safety_violations.py` | TDD tests |

### Modify

| File | Change |
|------|--------|
| `src/agent_worker.py` | Update `score()` to return SafetyViolation objects |
| `src/safety/constitutional.py` | Use SafetyViolation in pattern matching |

---

## 7. Line Number Detection

```python
def find_line_number(content: str, match_start: int) -> int:
    """
    Find line number from match position.

    Args:
        content: Full text content
        match_start: Character position of match

    Returns:
        Line number (1-indexed)
    """
    return content[:match_start].count('\n') + 1


def extract_context(content: str, line_number: int, context_lines: int = 2) -> str:
    """
    Extract context around a line.

    Args:
        content: Full text content
        line_number: Target line (1-indexed)
        context_lines: Lines before/after to include

    Returns:
        Context snippet
    """
    lines = content.split('\n')
    start = max(0, line_number - context_lines - 1)
    end = min(len(lines), line_number + context_lines)
    return '\n'.join(lines[start:end])
```

---

## 8. Backward Compatibility

### Current API
```python
score, violations = safety.score(content)
# violations = ["CRITICAL: Found dangerous pattern 'rm -rf'"]
```

### New API (backward compatible)
```python
score, violations = safety.score(content, file_path="test.sh")
# violations = [SafetyViolation(...)]

# Backward compat: str(violation) returns old format
str(violations[0])  # "CRITICAL: Found dangerous pattern 'rm -rf'"
```

---

## 9. Conclusion

| Aspect | Finding |
|--------|---------|
| Grok's Recommendation | **VALIDATED** |
| Current Gap | No file/line attribution in safety violations |
| Impact | HIGH - Debugging safety blocks is difficult |
| Effort | LOW - 30 minutes |
| Risk | LOW - Backward compatible |

**Implementation Ready:** Yes, proceed with TDD.

---

## 10. Benefits

1. **Faster debugging**: Know exactly where the violation occurred
2. **Better context**: See surrounding code
3. **Clear principle**: Know which WAVE principle was violated
4. **Actionable**: Can jump directly to the issue location
5. **Audit trail**: Better logging for compliance
