# WAVE v2 API Module
#
# Phase 11 Enhancement: Portal Integration

from .endpoints import (
    create_app,
    WorkflowRequest,
    WorkflowResponse,
    WorkflowStatus,
)

from .redis_pubsub import (
    RedisPubSub,
    publish_event,
    subscribe_events,
)

from .slack import (
    SlackNotifier,
    send_notification,
    SlackChannel,
)

# Phase 11: Portal Integration
from .portal_models import (
    PortalWorkflowRequest,
    DomainProgressEvent,
    DomainStatus,
    validate_portal_request,
)

from .portal_endpoints import (
    start_with_dependencies,
    get_domain_status,
    get_run_status,
    create_portal_response,
)

from .domain_events import (
    DomainEventPublisher,
)

__all__ = [
    # Endpoints
    "create_app",
    "WorkflowRequest",
    "WorkflowResponse",
    "WorkflowStatus",
    # Redis
    "RedisPubSub",
    "publish_event",
    "subscribe_events",
    # Slack
    "SlackNotifier",
    "send_notification",
    "SlackChannel",
    # Phase 11: Portal Integration
    "PortalWorkflowRequest",
    "DomainProgressEvent",
    "DomainStatus",
    "validate_portal_request",
    "start_with_dependencies",
    "get_domain_status",
    "get_run_status",
    "create_portal_response",
    "DomainEventPublisher",
]
