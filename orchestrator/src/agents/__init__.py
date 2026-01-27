"""
WAVE Domain Agents

Each agent is a long-running worker that:
- Polls its domain queue (Redis)
- Processes tasks with Claude
- Reports results back to orchestrator
- Logs with domain prefix (visible in Dozzle)
"""

from .pm_agent import PMAgent
from .cto_agent import CTOAgent
from .fe_agent import FEAgent
from .be_agent import BEAgent
from .qa_agent import QAAgent

__all__ = [
    "PMAgent",
    "CTOAgent",
    "FEAgent",
    "BEAgent",
    "QAAgent"
]
