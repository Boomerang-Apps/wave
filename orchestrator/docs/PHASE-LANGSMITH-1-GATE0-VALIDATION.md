# Phase LangSmith-1: Configuration - Gate 0 Validation

**Date:** 2026-01-25
**Status:** IN PROGRESS
**Phase:** LangSmith Tracing Integration - Configuration

---

## 1. Research Summary

### 1.1 LangSmith Overview

LangSmith is LangChain's observability platform for tracing LLM applications. It provides:
- Trace logging for all LLM calls with nested run trees
- Debugging and monitoring dashboards
- Performance analytics and latency tracking
- Cost tracking per run/project
- Zero added latency (async trace collection)

### 1.2 LangGraph Integration

LangSmith integrates seamlessly with LangGraph:
- Automatic tracing for LangChain modules within LangGraph
- `@traceable` decorator for custom functions
- `wrap_openai()` for external SDK calls
- Thread ID support for session management

### 1.3 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LANGSMITH_TRACING` | Yes | Enable/disable tracing (`true`/`false`) |
| `LANGSMITH_API_KEY` | Yes | API key from smith.langchain.com |
| `LANGSMITH_ENDPOINT` | No | API endpoint (default: `https://api.smith.langchain.com`) |
| `LANGSMITH_PROJECT` | No | Project name (default: `default`) |
| `LANGSMITH_SAMPLE_RATE` | No | Sampling rate 0.0-1.0 (default: 1.0) |

### 1.4 Key Components

```python
# Enable tracing
import os
os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_API_KEY"] = "<your-api-key>"

# Traceable decorator
from langsmith import traceable

@traceable(run_type="chain", name="my_function")
def my_function():
    pass

# Wrap OpenAI client
from langsmith.wrappers import wrap_openai
wrapped_client = wrap_openai(openai.Client())
```

---

## 2. Gap Analysis

### 2.1 Current State (WAVE v2 Orchestrator)

| Component | Status | Notes |
|-----------|--------|-------|
| LangGraph StateGraph | ✅ Exists | `src/graph.py` |
| Agent Nodes | ✅ Exists | `nodes/*.py` |
| Multi-LLM Client | ✅ Exists | `src/multi_llm.py` |
| Configuration | ✅ Exists | `config.py` |
| Tracing | ❌ Missing | No LangSmith integration |

### 2.2 Required Implementation

| Component | Priority | Description |
|-----------|----------|-------------|
| `src/tracing/__init__.py` | High | Module exports |
| `src/tracing/config.py` | High | Configuration management |
| `src/tracing/manager.py` | Medium | TracingManager class (Phase 2) |
| Environment validation | High | Validate required env vars |

---

## 3. Implementation Plan

### 3.1 Phase 1 Scope (Configuration)

1. **TracingConfig dataclass** - Configuration model
2. **Environment validation** - Check required variables
3. **Enable/disable toggle** - Runtime control
4. **Project/endpoint configuration** - Customization
5. **Sample rate control** - Production optimization

### 3.2 File Structure

```
orchestrator/
├── src/
│   └── tracing/
│       ├── __init__.py      # Module exports
│       └── config.py        # Configuration management
└── tests/
    └── test_langsmith_config.py  # TDD tests (10 tests)
```

### 3.3 Configuration Model

```python
@dataclass
class TracingConfig:
    enabled: bool = True
    api_key: Optional[str] = None
    endpoint: str = "https://api.smith.langchain.com"
    project: str = "wave-orchestrator"
    sample_rate: float = 1.0

    @classmethod
    def from_env(cls) -> "TracingConfig":
        """Load configuration from environment variables."""

    def validate(self) -> Tuple[bool, List[str]]:
        """Validate configuration, return (valid, errors)."""

    def apply(self) -> None:
        """Apply configuration to environment."""
```

---

## 4. TDD Test Plan

### 4.1 Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Config Creation | 3 | TracingConfig instantiation |
| Environment Loading | 3 | from_env() method |
| Validation | 3 | validate() method |
| Application | 2 | apply() method |
| **Total** | **11** | |

### 4.2 Test Cases

```python
# Config Creation
test_tracing_config_exists()
test_tracing_config_has_required_fields()
test_tracing_config_default_values()

# Environment Loading
test_from_env_loads_api_key()
test_from_env_loads_project()
test_from_env_handles_missing_vars()

# Validation
test_validate_returns_valid_with_api_key()
test_validate_returns_invalid_without_api_key()
test_validate_checks_sample_rate_bounds()

# Application
test_apply_sets_environment_variables()
test_apply_disabled_does_not_set_vars()
```

---

## 5. Dependencies

### 5.1 Python Packages

```
langsmith>=0.1.0
python-dotenv>=1.0.0  # Already in requirements
```

### 5.2 Environment Requirements

- LangSmith account (smith.langchain.com)
- API key generation
- Project creation (optional)

---

## 6. Success Criteria

### 6.1 Gate 0 Checklist

- [x] Research LangSmith SDK documentation
- [x] Document environment variables
- [x] Define configuration model
- [x] Create test plan (11 tests)
- [ ] Write TDD tests (must FAIL initially)
- [ ] Implement configuration module
- [ ] All tests pass
- [ ] Full test suite passes (500+ tests)

### 6.2 Acceptance Criteria

1. `TracingConfig` dataclass exists with all fields
2. `from_env()` loads configuration from environment
3. `validate()` returns errors for invalid config
4. `apply()` sets environment variables correctly
5. Disabled tracing does not affect system
6. All 11 new tests pass
7. All 500 existing tests still pass

---

## 7. References

- [LangSmith Documentation](https://docs.langchain.com/langsmith/)
- [Trace with LangGraph](https://docs.langchain.com/langsmith/trace-with-langgraph)
- [LangSmith Python SDK](https://pypi.org/project/langsmith/)
- [Environment Variables](https://docs.langchain.com/langsmith/env-var)
- [LangSmith SDK GitHub](https://github.com/langchain-ai/langsmith-sdk)

---

**Next Step:** Write TDD tests (all must FAIL before implementation)
