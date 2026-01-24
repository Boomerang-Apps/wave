# WAVE v2 Prompts Module
# Ported from WAVE v1 CLAUDE.md and agent configurations

from .developer import (
    DEVELOPER_SYSTEM_PROMPT,
    DEVELOPER_TASK_PROMPT,
    DEVELOPER_REVIEW_PROMPT,
)

from .qa import (
    QA_SYSTEM_PROMPT,
    QA_VALIDATION_PROMPT,
    QA_TEST_PROMPT,
)

from .planner import (
    PLANNER_SYSTEM_PROMPT,
    PLANNER_FEASIBILITY_PROMPT,
    PLANNER_DECOMPOSITION_PROMPT,
)

from .cto import (
    CTO_SYSTEM_PROMPT,
    CTO_MERGE_APPROVAL_PROMPT,
    CTO_ESCALATION_PROMPT,
)

from .templates import (
    format_prompt,
    PromptTemplate,
)

__all__ = [
    # Developer
    "DEVELOPER_SYSTEM_PROMPT",
    "DEVELOPER_TASK_PROMPT",
    "DEVELOPER_REVIEW_PROMPT",
    # QA
    "QA_SYSTEM_PROMPT",
    "QA_VALIDATION_PROMPT",
    "QA_TEST_PROMPT",
    # Planner
    "PLANNER_SYSTEM_PROMPT",
    "PLANNER_FEASIBILITY_PROMPT",
    "PLANNER_DECOMPOSITION_PROMPT",
    # CTO
    "CTO_SYSTEM_PROMPT",
    "CTO_MERGE_APPROVAL_PROMPT",
    "CTO_ESCALATION_PROMPT",
    # Templates
    "format_prompt",
    "PromptTemplate",
]
