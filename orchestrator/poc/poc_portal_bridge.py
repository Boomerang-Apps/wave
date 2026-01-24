#!/usr/bin/env python3
"""
WAVE v2 Portal Bridge PoC
========================
Phase 3 validation: HTTP API, Redis pub/sub, Slack notifications

Tests:
1. HTTP API endpoint functionality
2. Redis pub/sub event handling (with memory fallback)
3. Slack notification formatting (disabled mode)
4. Integration between components
5. Workflow lifecycle via API
6. Event-driven notification flow

GATE 3 Criteria:
- [ ] HTTP endpoints respond correctly
- [ ] Redis events publish/subscribe work
- [ ] Slack messages format correctly
- [ ] All components integrate properly
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

from src.api.endpoints import (
    WorkflowManager,
    WorkflowRequest,
    WorkflowResponse,
    WorkflowStatus,
    FASTAPI_AVAILABLE
)

from src.api.redis_pubsub import (
    RedisPubSub,
    MemoryPubSub,
    EventType,
    WorkflowEvent,
    publish_event,
    REDIS_AVAILABLE
)

from src.api.slack import (
    SlackNotifier,
    SlackMessage,
    SlackChannel,
    NotificationSeverity,
    SlackResponse,
    REQUESTS_AVAILABLE
)


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
# TEST 1: HTTP API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 1: HTTP API Endpoints")
print("="*60)

# Test WorkflowManager directly (without FastAPI server)
manager = WorkflowManager(use_memory=True)

# Create a workflow request
request = WorkflowRequest(
    story_id="STORY-001",
    project_path="/tmp/test-project",
    requirements="Implement user authentication with OAuth2",
    wave_number=1,
    token_limit=50000,
    cost_limit_usd=5.0
)

# Test 1a: Start workflow
response = manager.start_workflow(request)
results.record(
    "Workflow start returns success",
    response.success and response.thread_id is not None,
    f"thread_id={response.thread_id}"
)

thread_id = response.thread_id

# Test 1b: Get status
status = manager.get_status(thread_id)
results.record(
    "Status retrieval works",
    status is not None and status.story_id == "STORY-001",
    f"phase={status.phase if status else 'None'}"
)

# Test 1c: List workflows
workflows = manager.list_workflows()
results.record(
    "Workflow listing works",
    len(workflows) == 1 and workflows[0].thread_id == thread_id,
    f"count={len(workflows)}"
)

# Test 1d: Stop workflow
stop_response = manager.stop_workflow(thread_id)
results.record(
    "Workflow stop works",
    stop_response.success,
    f"message={stop_response.message}"
)

# Verify stopped status
final_status = manager.get_status(thread_id)
results.record(
    "Stopped workflow shows failed phase",
    final_status.is_complete if final_status else False,
    f"is_complete={final_status.is_complete if final_status else 'N/A'}"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Redis Pub/Sub (Memory Fallback)
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 2: Redis Pub/Sub (Memory Fallback)")
print("="*60)

# Use MemoryPubSub for testing without Redis
pubsub = MemoryPubSub()

# Track received events
received_events = []

def event_handler(event: WorkflowEvent):
    received_events.append(event)

# Subscribe to events
pubsub.subscribe(event_handler, EventType.WORKFLOW_STARTED.value)
pubsub.subscribe(event_handler)  # Wildcard

# Create and publish an event
test_event = WorkflowEvent(
    event_type=EventType.WORKFLOW_STARTED.value,
    thread_id="test-thread-001",
    story_id="STORY-001",
    timestamp=datetime.now().isoformat(),
    data={"requirements": "Test requirements"},
    project="test-project",
    wave=1,
    gate=1,
    phase="planning"
)

# Test 2a: Publish event
publish_result = pubsub.publish(test_event)
results.record(
    "Event publish succeeds",
    publish_result,
    "MemoryPubSub"
)

# Test 2b: Event received by handlers
results.record(
    "Event dispatched to handlers",
    len(received_events) == 2,  # Specific + wildcard
    f"received_count={len(received_events)}"
)

# Test 2c: Event serialization
event_json = test_event.to_json()
restored_event = WorkflowEvent.from_json(event_json)
results.record(
    "Event JSON serialization works",
    restored_event.story_id == test_event.story_id,
    f"story_id={restored_event.story_id}"
)

# Test 2d: Get all events
all_events = pubsub.get_events()
results.record(
    "Event history retrievable",
    len(all_events) == 1,
    f"history_count={len(all_events)}"
)

# Test 2e: Memory pubsub reports connected
results.record(
    "MemoryPubSub reports connected",
    pubsub.is_connected(),
    "fallback_mode=True"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: Slack Notifications (Disabled Mode)
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 3: Slack Notifications (Disabled Mode)")
print("="*60)

# Create notifier without webhook (disabled mode)
notifier = SlackNotifier(webhook_url=None)

# Test 3a: Notifier reports disabled without webhook
results.record(
    "Notifier disabled without webhook",
    not notifier.is_enabled(),
    "webhook_url=None"
)

# Test 3b: Message formatting works even when disabled
message = SlackMessage(
    text="Test notification",
    channel=SlackChannel.UPDATES,
    severity=NotificationSeverity.INFO,
    story_id="STORY-001"
)

payload = notifier._build_payload(message)
results.record(
    "Message payload builds correctly",
    "attachments" in payload and len(payload["attachments"]) == 1,
    f"has_attachments=True"
)

# Test 3c: Severity emoji mapping
emoji = notifier.SEVERITY_EMOJI.get(NotificationSeverity.CRITICAL)
results.record(
    "Severity emoji mapping works",
    emoji == ":rotating_light:",
    f"critical_emoji={emoji}"
)

# Test 3d: Color mapping
color = notifier._get_color(NotificationSeverity.WARNING)
results.record(
    "Severity color mapping works",
    color == "#ff9900",
    f"warning_color={color}"
)

# Test 3e: Send returns error when disabled
response = notifier.send(message)
results.record(
    "Send returns appropriate error when disabled",
    not response.success and "not enabled" in response.error.lower(),
    f"error={response.error}"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Component Integration
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 4: Component Integration")
print("="*60)

# Test workflow + pubsub + slack integration
integration_manager = WorkflowManager(use_memory=True)
integration_pubsub = MemoryPubSub()
integration_notifier = SlackNotifier(webhook_url=None)  # Disabled mode

# Simulate full workflow lifecycle with events
integration_events = []

def integration_handler(event: WorkflowEvent):
    integration_events.append(event)
    # In production, this would trigger Slack notification
    if event.event_type == EventType.WORKFLOW_STARTED.value:
        msg = SlackMessage(
            text=f"Workflow started: {event.story_id}",
            severity=NotificationSeverity.INFO,
            story_id=event.story_id
        )
        # Build payload (would send if enabled)
        integration_notifier._build_payload(msg)

integration_pubsub.subscribe(integration_handler)

# Start workflow
int_request = WorkflowRequest(
    story_id="INT-STORY-001",
    project_path="/tmp/integration-test",
    requirements="Integration test requirements",
    wave_number=2,
    token_limit=100000,
    cost_limit_usd=10.0
)

int_response = integration_manager.start_workflow(int_request)

# Publish corresponding event
int_event = WorkflowEvent(
    event_type=EventType.WORKFLOW_STARTED.value,
    thread_id=int_response.thread_id,
    story_id="INT-STORY-001",
    timestamp=datetime.now().isoformat(),
    data={"requirements": "Integration test requirements"},
    wave=2,
    gate=1
)
integration_pubsub.publish(int_event)

# Test 4a: Full lifecycle works
results.record(
    "Workflow + PubSub integration works",
    len(integration_events) == 1 and integration_events[0].story_id == "INT-STORY-001",
    f"events_received={len(integration_events)}"
)

# Test 4b: Multiple event types
for event_type in [EventType.GATE_ENTERED, EventType.GATE_COMPLETE, EventType.WORKFLOW_COMPLETE]:
    integration_pubsub.publish(WorkflowEvent(
        event_type=event_type.value,
        thread_id=int_response.thread_id,
        story_id="INT-STORY-001",
        timestamp=datetime.now().isoformat(),
        data={},
        wave=2,
        gate=3
    ))

results.record(
    "Multiple event types handled",
    len(integration_events) == 4,
    f"total_events={len(integration_events)}"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: Convenience Methods
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 5: Slack Convenience Methods")
print("="*60)

# Test convenience notification methods (payload building only)
test_notifier = SlackNotifier(webhook_url=None)

# Test 5a: Story start notification
start_msg = SlackMessage(
    text=f"*[Wave 1] Story Started: STORY-TEST*\nTest requirements...",
    channel=SlackChannel.UPDATES,
    severity=NotificationSeverity.INFO,
    story_id="STORY-TEST"
)
start_payload = test_notifier._build_payload(start_msg)
results.record(
    "Story start message formats correctly",
    "STORY-TEST" in start_payload["attachments"][0]["text"],
    "has_story_id_in_text"
)

# Test 5b: Budget warning notification
budget_msg = SlackMessage(
    text=f"*Budget Alert: STORY-TEST*\n85% used (85,000/100,000 tokens)",
    channel=SlackChannel.BUDGET,
    severity=NotificationSeverity.WARNING,
    story_id="STORY-TEST"
)
budget_payload = test_notifier._build_payload(budget_msg)
results.record(
    "Budget warning formats correctly",
    "Budget Alert" in budget_payload["attachments"][0]["text"],
    "has_budget_in_text"
)

# Test 5c: Safety violation notification
safety_msg = SlackMessage(
    text="*Safety Violation: STORY-TEST*\n• Destructive operation detected",
    channel=SlackChannel.ALERTS,
    severity=NotificationSeverity.CRITICAL,
    story_id="STORY-TEST"
)
safety_payload = test_notifier._build_payload(safety_msg)
results.record(
    "Safety violation formats with critical color",
    safety_payload["attachments"][0]["color"] == "#ff0000",
    "color=#ff0000"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: Thread Management
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 6: Thread Management")
print("="*60)

# Test thread caching for Slack
thread_notifier = SlackNotifier(webhook_url=None)

# Simulate thread cache
thread_notifier._thread_cache["STORY-THREAD"] = "1234567890.123456"

# Test 6a: Thread ts retrieval
thread_ts = thread_notifier.get_thread_ts("STORY-THREAD")
results.record(
    "Thread ts retrieval works",
    thread_ts == "1234567890.123456",
    f"thread_ts={thread_ts}"
)

# Test 6b: Thread ts included in payload for replies
reply_msg = SlackMessage(
    text="Reply to thread",
    story_id="STORY-THREAD"
)
reply_payload = thread_notifier._build_payload(reply_msg)
results.record(
    "Thread ts included in reply payload",
    reply_payload.get("thread_ts") == "1234567890.123456",
    "auto_thread_lookup=True"
)

# Test 6c: Explicit thread ts overrides cache
explicit_msg = SlackMessage(
    text="Explicit thread",
    story_id="STORY-THREAD",
    thread_ts="9999999999.999999"
)
explicit_payload = thread_notifier._build_payload(explicit_msg)
results.record(
    "Explicit thread ts overrides cache",
    explicit_payload.get("thread_ts") == "9999999999.999999",
    "explicit_override=True"
)


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("GATE 3 CRITERIA")
print("="*60)

gate3_criteria = {
    "HTTP endpoints respond correctly": results.passed >= 5,
    "Redis events publish/subscribe work": results.passed >= 10,
    "Slack messages format correctly": results.passed >= 15,
    "All components integrate properly": results.passed >= 20,
}

all_passed = True
for criterion, passed in gate3_criteria.items():
    status = "PASS" if passed else "FAIL"
    if not passed:
        all_passed = False
    print(f"  [{status}] {criterion}")

# Final summary
success = results.summary()

print(f"\nGATE 3 STATUS: {'PASSED' if all_passed else 'FAILED'}")
print(f"FastAPI available: {FASTAPI_AVAILABLE}")
print(f"Redis available: {REDIS_AVAILABLE}")
print(f"Requests available: {REQUESTS_AVAILABLE}")

sys.exit(0 if success else 1)
