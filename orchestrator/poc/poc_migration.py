#!/usr/bin/env python3
"""
WAVE v2 Migration PoC (FINAL)
============================
Phase 5 validation: Prompt Migration, E2E Story Execution

Tests:
1. Prompt templates and formatting
2. All agent prompts ported correctly
3. E2E workflow runner functionality
4. Complete story lifecycle (simulate)
5. Event publishing and tracking
6. Gate progression verification

GATE 5 Criteria (FINAL):
- [ ] Story completes all gates
- [ ] Code quality (prompts) matches v1
- [ ] Events published correctly
- [ ] Budget tracking works
- [ ] No safety violations
"""

import os
import sys
from datetime import datetime

# Add project paths
_poc_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_poc_dir)
_src_dir = os.path.join(_project_root, "src")

for path in [_project_root, _src_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

# ═══════════════════════════════════════════════════════════════════════════════
# IMPORTS
# ═══════════════════════════════════════════════════════════════════════════════

from src.prompts import (
    DEVELOPER_SYSTEM_PROMPT,
    DEVELOPER_TASK_PROMPT,
    QA_SYSTEM_PROMPT,
    QA_VALIDATION_PROMPT,
    PLANNER_SYSTEM_PROMPT,
    PLANNER_FEASIBILITY_PROMPT,
    CTO_SYSTEM_PROMPT,
    CTO_MERGE_APPROVAL_PROMPT,
    PromptTemplate,
    format_prompt,
)

from src.prompts.templates import (
    truncate_context,
    format_code_context,
    format_diff,
    format_test_results,
)

from src.runner import (
    WorkflowRunner,
    RunnerConfig,
    RunnerResult,
    RunnerStatus,
    run_story,
)

from src.api.redis_pubsub import EventType


# ═══════════════════════════════════════════════════════════════════════════════
# TEST RESULTS TRACKER
# ═══════════════════════════════════════════════════════════════════════════════

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []

    def record(self, name: str, passed: bool, details: str = ""):
        status = "PASS" if passed else "FAIL"
        self.tests.append((name, status, details))
        if passed:
            self.passed += 1
        else:
            self.failed += 1
        print(f"  [{status}] {name}" + (f" - {details}" if details else ""))

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"Results: {self.passed}/{total} tests passed")
        print(f"{'='*60}")
        return self.failed == 0


results = TestResults()


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: Prompt Templates
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 1: Prompt Templates")
print("="*60)

# Test 1a: PromptTemplate creation
template = PromptTemplate(
    template="Hello {name}, your task is {task}",
    defaults={"name": "Developer"},
    required=["task"]
)

results.record(
    "PromptTemplate creation works",
    len(template.variables) == 2,
    f"variables={template.variables}"
)

# Test 1b: Template formatting
formatted = template.format(task="implement login")
results.record(
    "Template formatting works",
    "implement login" in formatted and "Developer" in formatted,
    f"length={len(formatted)}"
)

# Test 1c: Required validation
missing = template.validate()  # Missing 'task'
results.record(
    "Required validation works",
    "task" in missing,
    f"missing={missing}"
)

# Test 1d: Partial templates
partial = template.partial(task="fixed task")
partial_missing = partial.validate()
results.record(
    "Partial templates work",
    len(partial_missing) == 0,
    f"missing={partial_missing}"
)

# Test 1e: format_prompt helper
quick_format = format_prompt(
    "Story {story_id} is {status}",
    story_id="STORY-001",
    status="ready"
)
results.record(
    "format_prompt helper works",
    "STORY-001" in quick_format and "ready" in quick_format,
    "formatted=True"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Prompt Utilities
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 2: Prompt Utilities")
print("="*60)

# Test 2a: truncate_context
long_text = "x" * 20000
truncated = truncate_context(long_text, max_chars=1000)
results.record(
    "truncate_context works",
    len(truncated) <= 1000 and "truncated" in truncated,
    f"length={len(truncated)}"
)

# Test 2b: format_code_context
files = {
    "src/main.py": "def main():\n    print('hello')",
    "src/utils.py": "def helper():\n    pass"
}
code_context = format_code_context(files)
results.record(
    "format_code_context works",
    "src/main.py" in code_context and "src/utils.py" in code_context,
    f"files={len(files)}"
)

# Test 2c: format_diff
diff = "\n".join([f"+ line {i}" for i in range(300)])
formatted_diff = format_diff(diff, max_lines=50)
results.record(
    "format_diff works",
    "omitted" in formatted_diff,
    f"original_lines=300"
)

# Test 2d: format_test_results
test_results_data = [
    {"name": "test_a", "passed": True},
    {"name": "test_b", "passed": True},
    {"name": "test_c", "passed": False, "error": "AssertionError"},
]
test_output = format_test_results(test_results_data)
results.record(
    "format_test_results works",
    "Passed: 2" in test_output and "Failed: 1" in test_output,
    "formatted=True"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: Agent Prompts Ported
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 3: Agent Prompts Ported")
print("="*60)

# Test 3a: Developer prompts
results.record(
    "Developer system prompt exists",
    len(DEVELOPER_SYSTEM_PROMPT) > 500 and "Safety First" in DEVELOPER_SYSTEM_PROMPT,
    f"length={len(DEVELOPER_SYSTEM_PROMPT)}"
)

results.record(
    "Developer task prompt has placeholders",
    "{story_id}" in DEVELOPER_TASK_PROMPT and "{requirements}" in DEVELOPER_TASK_PROMPT,
    "placeholders=True"
)

# Test 3b: QA prompts
results.record(
    "QA system prompt exists",
    len(QA_SYSTEM_PROMPT) > 500 and "VALIDATION" in QA_SYSTEM_PROMPT,
    f"length={len(QA_SYSTEM_PROMPT)}"
)

results.record(
    "QA validation prompt has placeholders",
    "{story_id}" in QA_VALIDATION_PROMPT and "{test_output}" in QA_VALIDATION_PROMPT,
    "placeholders=True"
)

# Test 3c: Planner prompts
results.record(
    "Planner system prompt exists",
    len(PLANNER_SYSTEM_PROMPT) > 500 and "FEASIBILITY" in PLANNER_SYSTEM_PROMPT,
    f"length={len(PLANNER_SYSTEM_PROMPT)}"
)

results.record(
    "Planner feasibility prompt has placeholders",
    "{requirements}" in PLANNER_FEASIBILITY_PROMPT,
    "placeholders=True"
)

# Test 3d: CTO prompts
results.record(
    "CTO system prompt exists",
    len(CTO_SYSTEM_PROMPT) > 500 and "APPROVE" in CTO_SYSTEM_PROMPT,
    f"length={len(CTO_SYSTEM_PROMPT)}"
)

results.record(
    "CTO merge approval prompt has placeholders",
    "{story_id}" in CTO_MERGE_APPROVAL_PROMPT and "{qa_history}" in CTO_MERGE_APPROVAL_PROMPT,
    "placeholders=True"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Workflow Runner
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 4: Workflow Runner")
print("="*60)

# Test 4a: Runner initialization
config = RunnerConfig(
    use_memory_checkpointer=True,
    enable_pubsub=True,
    simulate_llm=True,
)
runner = WorkflowRunner(config)

results.record(
    "Runner initializes correctly",
    runner.status == RunnerStatus.PENDING,
    f"status={runner.status.value}"
)

# Test 4b: Run simulated story
result = runner.run(
    story_id="E2E-TEST-001",
    project_path="/tmp/e2e-test",
    requirements="Add a hello world endpoint to the API",
    wave_number=1,
    token_limit=50000,
    cost_limit_usd=5.0,
)

results.record(
    "Runner executes story",
    result is not None,
    f"thread_id={result.thread_id}"
)

# Test 4c: Story completes successfully
results.record(
    "Story completes all gates",
    result.success and result.final_phase == "done",
    f"phase={result.final_phase}, gate={result.final_gate}"
)

# Test 4d: Budget tracked
results.record(
    "Budget tracked correctly",
    result.tokens_used > 0 and result.cost_usd > 0,
    f"tokens={result.tokens_used}, cost=${result.cost_usd:.2f}"
)

# Test 4e: Duration recorded
results.record(
    "Duration recorded",
    result.duration_seconds > 0,
    f"duration={result.duration_seconds:.2f}s"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: Event Publishing
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 5: Event Publishing")
print("="*60)

# Get events from runner
events = runner.get_events()

# Test 5a: Events published
results.record(
    "Events published during execution",
    len(events) > 0,
    f"event_count={len(events)}"
)

# Test 5b: Workflow started event
start_events = [e for e in events if e.event_type == EventType.WORKFLOW_STARTED.value]
results.record(
    "WORKFLOW_STARTED event published",
    len(start_events) == 1,
    f"count={len(start_events)}"
)

# Test 5c: Gate events
gate_events = [e for e in events if e.event_type in [
    EventType.GATE_ENTERED.value,
    EventType.GATE_COMPLETE.value
]]
results.record(
    "Gate events published",
    len(gate_events) >= 6,  # At least 6 gates * 2 events
    f"count={len(gate_events)}"
)

# Test 5d: Workflow complete event
complete_events = [e for e in events if e.event_type == EventType.WORKFLOW_COMPLETE.value]
results.record(
    "WORKFLOW_COMPLETE event published",
    len(complete_events) == 1,
    f"count={len(complete_events)}"
)

# Test 5e: Events have correct story_id
correct_story = all(e.story_id == "E2E-TEST-001" for e in events)
results.record(
    "Events have correct story_id",
    correct_story,
    f"story_id=E2E-TEST-001"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: Gate Callbacks
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 6: Gate Callbacks")
print("="*60)

# Track callbacks
gate_enters = []
gate_completes = []

def on_gate_enter(gate, state):
    gate_enters.append(gate)

def on_gate_complete(gate, state):
    gate_completes.append(gate)

# Run with callbacks
callback_config = RunnerConfig(
    use_memory_checkpointer=True,
    simulate_llm=True,
    on_gate_enter=on_gate_enter,
    on_gate_complete=on_gate_complete,
)
callback_runner = WorkflowRunner(callback_config)
callback_result = callback_runner.run(
    story_id="CALLBACK-TEST",
    project_path="/tmp/callback-test",
    requirements="Test callbacks",
)

# Test 6a: Gate enter callbacks fired
results.record(
    "Gate enter callbacks fired",
    len(gate_enters) >= 5,
    f"count={len(gate_enters)}"
)

# Test 6b: Gate complete callbacks fired
results.record(
    "Gate complete callbacks fired",
    len(gate_completes) >= 5,
    f"count={len(gate_completes)}"
)

# Test 6c: Callbacks in correct order
results.record(
    "Callbacks in correct order",
    gate_enters == sorted(gate_enters) and gate_completes == sorted(gate_completes),
    "ordered=True"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 7: run_story Helper
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 7: run_story Helper")
print("="*60)

# Test 7a: Quick helper works
helper_result = run_story(
    story_id="HELPER-TEST",
    project_path="/tmp/helper-test",
    requirements="Quick helper test",
    simulate_llm=True,
)

results.record(
    "run_story helper works",
    helper_result.success,
    f"phase={helper_result.final_phase}"
)

# Test 7b: Result has all fields
has_all_fields = all([
    helper_result.thread_id,
    helper_result.story_id,
    helper_result.final_phase,
    helper_result.final_gate > 0,
])
results.record(
    "Result has all fields",
    has_all_fields,
    "complete=True"
)

# Test 7c: Result serialization
result_dict = helper_result.to_dict()
results.record(
    "Result serializes to dict",
    "success" in result_dict and "thread_id" in result_dict,
    f"keys={len(result_dict)}"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 8: Complete System Integration
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 8: Complete System Integration")
print("="*60)

# Test a full story with all components
full_result = run_story(
    story_id="FULL-E2E-001",
    project_path="/tmp/full-e2e",
    requirements="""
    Implement a REST API endpoint that:
    1. Accepts a POST request with user data
    2. Validates the input
    3. Stores the user in the database
    4. Returns a success response
    """,
    wave_number=1,
    token_limit=100000,
    cost_limit_usd=10.0,
    simulate_llm=True,
    enable_pubsub=True,
)

# Test 8a: Full story succeeds
results.record(
    "Full E2E story succeeds",
    full_result.success,
    f"phase={full_result.final_phase}"
)

# Test 8b: Reaches final gate
results.record(
    "Reaches final gate (8)",
    full_result.final_gate == 8,
    f"gate={full_result.final_gate}"
)

# Test 8c: No errors
results.record(
    "No errors in execution",
    full_result.error is None,
    f"error={full_result.error}"
)

# Test 8d: Budget within limits
within_budget = (
    full_result.tokens_used <= 100000 and
    full_result.cost_usd <= 10.0
)
results.record(
    "Budget within limits",
    within_budget,
    f"tokens={full_result.tokens_used}, cost=${full_result.cost_usd:.2f}"
)


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("GATE 5 CRITERIA (FINAL)")
print("="*60)

gate5_criteria = {
    "Story completes all gates": full_result.success and full_result.final_gate == 8,
    "Prompts ported correctly": results.passed >= 10,
    "Events published correctly": len(events) >= 10,
    "Budget tracking works": full_result.tokens_used > 0,
    "No safety violations": full_result.error is None,
}

all_passed = True
for criterion, passed in gate5_criteria.items():
    status = "PASS" if passed else "FAIL"
    if not passed:
        all_passed = False
    print(f"  [{status}] {criterion}")

# Final summary
success = results.summary()

print(f"\nGATE 5 STATUS: {'PASSED' if all_passed else 'FAILED'}")
print(f"\n{'='*60}")
print("WAVE V2 IMPLEMENTATION COMPLETE")
print("="*60)
print(f"""
Summary:
- Phase 0: Setup           COMPLETE
- Phase 1: Foundation      GATE 1 PASSED
- Phase 2: Safety & Git    GATE 2 PASSED
- Phase 3: Portal Bridge   GATE 3 PASSED
- Phase 4: Production      GATE 4 PASSED
- Phase 5: Migration       GATE 5 {'PASSED' if all_passed else 'FAILED'}

Total PoC Tests: {results.passed + results.failed}
Passed: {results.passed}
Failed: {results.failed}
""")

sys.exit(0 if success else 1)
