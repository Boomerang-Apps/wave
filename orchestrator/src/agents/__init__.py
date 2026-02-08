"""
WAVE Domain Agents

Each agent is a long-running worker that:
- Polls its domain queue (Redis)
- Processes tasks with Claude
- Reports results back to orchestrator
- Logs with domain prefix (visible in Dozzle)
- Publishes signals via Redis Streams (P2-003)
"""

from .pm_agent import PMAgent
from .cto_agent import CTOAgent
from .fe_agent import FEAgent
from .be_agent import BEAgent
from .qa_agent import QAAgent
from .signal_publisher import SignalPublisherMixin

__all__ = [
    "PMAgent",
    "CTOAgent",
    "FEAgent",
    "BEAgent",
    "QAAgent",
    "SignalPublisherMixin",
]
