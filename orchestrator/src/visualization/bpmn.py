"""
WAVE BPMN/PlantUML Visualization Generator

Generates workflow diagrams showing the 8-gate process.
Part of Gate 0 Research Item #6: BPMN Visualization Tools.

Usage:
    from src.visualization.bpmn import generate_workflow_diagram, get_diagram_url

    # Get PlantUML source
    source = generate_workflow_diagram(current_gate=3, story_id="WAVE1-FE-002")

    # Get rendered diagram URL
    url = get_diagram_url(current_gate=3)

    # Get ASCII fallback
    ascii_diagram = generate_ascii_diagram(current_gate=3)
"""

import zlib
import base64
from typing import Optional, Literal


# Gate names (1-indexed to match Gate enum)
GATE_NAMES = {
    1: "Story Assigned",
    2: "Dev Started",
    3: "Dev Complete",
    4: "QA Started",
    5: "QA Passed",
    6: "Merge Ready",
    7: "Merged",
    8: "Deployed",
}


def get_gate_status(gate: int, current_gate: int) -> str:
    """
    Get the status of a gate relative to current progress.

    Args:
        gate: Gate number to check (1-8)
        current_gate: Current gate number

    Returns:
        Status string: "complete", "active", or "pending"
    """
    if gate < current_gate:
        return "complete"
    elif gate == current_gate:
        return "active"
    else:
        return "pending"


def generate_workflow_diagram(
    current_gate: int = 1,
    story_id: Optional[str] = None,
    show_retry_loop: bool = True
) -> str:
    """
    Generate PlantUML source for WAVE workflow diagram.

    Args:
        current_gate: Current gate number (1-8)
        story_id: Optional story ID for title
        show_retry_loop: Whether to show QA retry loop

    Returns:
        PlantUML diagram source
    """
    title = f"WAVE Workflow"
    if story_id:
        title = f"WAVE Workflow: {story_id}"

    # Build diagram source
    lines = [
        f"@startuml {title}",
        "",
        "' Style definitions",
        "!define ACTIVE #90EE90",
        "!define COMPLETE #228B22",
        "!define PENDING #D3D3D3",
        "",
        "skinparam state {",
        "    BackgroundColor<<active>> ACTIVE",
        "    BackgroundColor<<complete>> COMPLETE",
        "    BackgroundColor<<pending>> PENDING",
        "    FontColor<<complete>> white",
        "}",
        "",
        f"title {title}",
        "",
        "[*] --> Gate1",
        "",
    ]

    # Add gate states with status
    for gate_num in range(1, 9):
        name = GATE_NAMES[gate_num]
        status = get_gate_status(gate_num, current_gate)
        state_id = f"Gate{gate_num}"

        lines.append(f'state "Gate {gate_num}: {name}" as {state_id} <<{status}>>')

    lines.append("")

    # Add transitions
    transitions = [
        ("Gate1", "Gate2", ""),
        ("Gate2", "Gate3", ""),
        ("Gate3", "Gate4", ""),
        ("Gate4", "Gate5", "pass"),
        ("Gate5", "Gate6", ""),
        ("Gate6", "Gate7", ""),
        ("Gate7", "Gate8", ""),
        ("Gate8", "[*]", ""),
    ]

    for from_state, to_state, label in transitions:
        if label:
            lines.append(f"{from_state} --> {to_state} : {label}")
        else:
            lines.append(f"{from_state} --> {to_state}")

    # Add retry loop if enabled
    if show_retry_loop:
        lines.append("")
        lines.append("' Retry loop for QA failures")
        lines.append("Gate4 --> Gate3 : fail (retry)")

    lines.append("")
    lines.append("@enduml")

    return "\n".join(lines)


def encode_plantuml(source: str) -> str:
    """
    Encode PlantUML source for URL.

    Uses PlantUML's custom encoding (deflate + modified base64).

    Args:
        source: PlantUML source code

    Returns:
        Encoded string for URL
    """
    # Compress using zlib
    compressed = zlib.compress(source.encode('utf-8'), 9)

    # PlantUML uses a custom base64 alphabet
    # Standard: A-Za-z0-9+/
    # PlantUML: 0-9A-Za-z-_
    plantuml_alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
    standard_alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

    # Encode to standard base64
    b64 = base64.b64encode(compressed).decode('ascii')

    # Translate to PlantUML alphabet
    translation = str.maketrans(standard_alphabet, plantuml_alphabet)
    encoded = b64.translate(translation)

    # Remove padding
    return encoded.rstrip('=')


def get_diagram_url(
    current_gate: int = 1,
    story_id: Optional[str] = None,
    format: Literal["svg", "png", "txt"] = "svg",
    server: str = "http://www.plantuml.com/plantuml"
) -> str:
    """
    Generate URL for rendered PlantUML diagram.

    Args:
        current_gate: Current gate number
        story_id: Optional story ID
        format: Output format (svg, png, txt)
        server: PlantUML server URL

    Returns:
        URL to rendered diagram
    """
    source = generate_workflow_diagram(
        current_gate=current_gate,
        story_id=story_id
    )
    encoded = encode_plantuml(source)
    return f"{server}/{format}/{encoded}"


def generate_ascii_diagram(
    current_gate: int = 1,
    story_id: Optional[str] = None
) -> str:
    """
    Generate ASCII fallback diagram.

    Useful for terminal/log output where images aren't supported.

    Args:
        current_gate: Current gate number
        story_id: Optional story ID

    Returns:
        ASCII art diagram
    """
    title = "WAVE Workflow Progress"
    if story_id:
        title = f"WAVE: {story_id}"

    lines = [
        f"{'=' * 60}",
        f"  {title}",
        f"{'=' * 60}",
        "",
    ]

    for gate_num in range(1, 9):
        name = GATE_NAMES[gate_num]
        status = get_gate_status(gate_num, current_gate)

        if status == "complete":
            marker = "[x]"
            indicator = "DONE"
        elif status == "active":
            marker = "[>]"
            indicator = "CURRENT"
        else:
            marker = "[ ]"
            indicator = ""

        line = f"  {marker} Gate {gate_num}: {name}"
        if indicator:
            line = f"{line:<40} {indicator}"
        lines.append(line)

        # Add arrow between gates (except after last)
        if gate_num < 8:
            lines.append("       |")
            lines.append("       v")

    lines.append("")
    lines.append(f"{'=' * 60}")
    lines.append(f"  Progress: {current_gate}/8 gates")
    lines.append(f"{'=' * 60}")

    return "\n".join(lines)


__all__ = [
    "generate_workflow_diagram",
    "generate_ascii_diagram",
    "get_diagram_url",
    "encode_plantuml",
    "get_gate_status",
    "GATE_NAMES",
]
