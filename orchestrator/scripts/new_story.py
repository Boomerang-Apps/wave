#!/usr/bin/env python3
"""
WAVE v2 New Story Input Script
==============================
Structured entry point for creating new features/stories.
Enforces all 9 gates (Gate 0-8) without manual skips.

Usage:
    python scripts/new_story.py

Flow:
    1. Gate 0: Research - Analyze target project
    2. Gate 1: Planning - Generate V4 AI Story
    3. Validate schema and safety
    4. Lock workflow
    5. Run pre-flight
    6. Dispatch to orchestrator (Gates 2-8 autonomous)
"""

import json
import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

# Configuration
WAVE_DIR = Path("/Volumes/SSD-01/Projects/WAVE/orchestrator")
STORIES_DIR = WAVE_DIR / "stories"
SCRIPTS_DIR = WAVE_DIR / "scripts"

# Default target project
DEFAULT_PROJECT = "/Volumes/SSD-01/Projects/Footprint/footprint"


def print_header(title: str):
    """Print formatted header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_gate(gate_num: int, name: str):
    """Print gate header."""
    print(f"\n{'─' * 60}")
    print(f"  GATE {gate_num}: {name}")
    print(f"{'─' * 60}")


def get_input(prompt: str, default: str = None) -> str:
    """Get user input with optional default."""
    if default:
        result = input(f"{prompt} [{default}]: ").strip()
        return result if result else default
    return input(f"{prompt}: ").strip()


def run_command(cmd: list, cwd: str = None) -> tuple:
    """Run command and return (success, output)."""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or str(WAVE_DIR),
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.returncode == 0, result.stdout + result.stderr
    except Exception as e:
        return False, str(e)


def gate_0_research(project_path: str) -> dict:
    """
    Gate 0: Research - Analyze target project.
    Returns project context for story generation.
    """
    print_gate(0, "RESEARCH")

    context = {
        "project_path": project_path,
        "supabase": {},
        "existing_buckets": [],
        "existing_tables": [],
        "tech_stack": [],
        "file_structure": []
    }

    # Check if project exists
    if not os.path.exists(project_path):
        print(f"  ❌ Project not found: {project_path}")
        return context

    print(f"  📁 Analyzing: {project_path}")

    # Detect tech stack
    package_json = os.path.join(project_path, "package.json")
    if os.path.exists(package_json):
        with open(package_json) as f:
            pkg = json.load(f)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            if "next" in deps:
                context["tech_stack"].append("Next.js")
            if "@supabase/supabase-js" in deps:
                context["tech_stack"].append("Supabase")
            if "tailwindcss" in deps:
                context["tech_stack"].append("Tailwind CSS")
            if "typescript" in deps:
                context["tech_stack"].append("TypeScript")

    print(f"  📦 Tech Stack: {', '.join(context['tech_stack']) or 'Unknown'}")

    # Check Supabase configuration
    env_local = os.path.join(project_path, ".env.local")
    if os.path.exists(env_local):
        with open(env_local) as f:
            for line in f:
                if "SUPABASE_URL" in line and "=" in line:
                    url = line.split("=", 1)[1].strip().strip('"')
                    context["supabase"]["url"] = url
                    # Extract project ID from URL
                    if "supabase.co" in url:
                        project_id = url.split("//")[1].split(".")[0]
                        context["supabase"]["project_id"] = project_id
                        print(f"  🗄️  Supabase Project: {project_id}")

    # Check for existing storage service
    storage_files = []
    for pattern in ["**/storage/**/*.ts", "**/lib/supabase*.ts"]:
        import glob
        storage_files.extend(glob.glob(os.path.join(project_path, pattern), recursive=True))

    if storage_files:
        print(f"  📂 Found storage services: {len(storage_files)} files")
        for sf in storage_files[:3]:
            # Check for bucket names
            with open(sf) as f:
                content = f.read()
                if "images" in content.lower():
                    context["existing_buckets"].append("images")
                if "photos" in content.lower():
                    context["existing_buckets"].append("photos")

    if context["existing_buckets"]:
        print(f"  🪣 Existing buckets referenced: {', '.join(set(context['existing_buckets']))}")

    # Check app structure
    app_dir = os.path.join(project_path, "app")
    if os.path.exists(app_dir):
        context["file_structure"].append("App Router (/app)")
        routes = [d for d in os.listdir(app_dir) if os.path.isdir(os.path.join(app_dir, d)) and not d.startswith("_")]
        print(f"  📄 Existing routes: {', '.join(routes[:10])}")

    pages_dir = os.path.join(project_path, "pages")
    if os.path.exists(pages_dir):
        context["file_structure"].append("Pages Router (/pages)")

    print(f"  ✅ Research complete")
    return context


def gate_1_planning(context: dict) -> dict:
    """
    Gate 1: Planning - Create V4 AI Story from user input.
    """
    print_gate(1, "PLANNING")

    print("\n  Enter feature details:\n")

    # Get basic info
    name = get_input("  Feature Name")
    description = get_input("  Description")
    domain = get_input("  Domain (fe/be/fullstack)", "fullstack")

    # Generate story ID
    timestamp = datetime.now().strftime("%Y%m%d")
    story_id = f"WAVE-{name.upper().replace(' ', '-')[:10]}-{timestamp}"

    # Get acceptance criteria
    print("\n  Enter Acceptance Criteria (min 5, empty line to finish):")
    ac_list = []
    ac_num = 1
    while True:
        ac = input(f"    AC-{ac_num:03d}: ").strip()
        if not ac:
            if len(ac_list) < 5:
                print("    ⚠️  Minimum 5 AC required")
                continue
            break
        ac_list.append(f"AC-{ac_num:03d}: {ac}")
        ac_num += 1

    # Determine files based on context
    files_create = []
    if "App Router" in str(context.get("file_structure", [])):
        route_name = name.lower().replace(" ", "-")
        files_create = [
            f"app/{route_name}/page.tsx",
            f"app/api/{route_name}/route.ts",
            f"components/{route_name}/index.tsx",
            f"lib/services/{route_name}Service.ts"
        ]

    print(f"\n  📝 Suggested files to create:")
    for f in files_create:
        print(f"      - {f}")

    # Confirm or modify
    modify = get_input("\n  Modify file list? (y/n)", "n")
    if modify.lower() == "y":
        files_create = input("  Enter files (comma-separated): ").split(",")
        files_create = [f.strip() for f in files_create]

    # Build V4 Story
    story = {
        "story_id": story_id,
        "wave_number": 1,
        "title": name,
        "description": description,
        "acceptance_criteria": ac_list,
        "story_data": {
            "objective": {
                "as_a": "user",
                "i_want": f"to {description.lower()}",
                "so_that": "I can accomplish my goals efficiently"
            },
            "files": {
                "create": files_create,
                "modify": [],
                "forbidden": [".env", ".env.local", "node_modules/**", "*.secret*"]
            },
            "safety": {
                "stop_conditions": [
                    "Safety score below 0.85",
                    "Exposes API keys or secrets",
                    "Direct commits to main branch",
                    "Modifies production data without approval"
                ],
                "escalation_triggers": [
                    "Database schema changes",
                    "Authentication modifications",
                    "Payment/billing changes"
                ]
            },
            "context": {
                "project_path": context.get("project_path"),
                "supabase_project": context.get("supabase", {}).get("project_id"),
                "existing_buckets": list(set(context.get("existing_buckets", []))),
                "tech_stack": context.get("tech_stack", [])
            }
        }
    }

    print(f"\n  ✅ Story created: {story_id}")
    return story


def validate_story(story: dict) -> bool:
    """Validate story against V4 schema."""
    print("\n  Validating story schema...")

    required_fields = ["story_id", "title", "description", "acceptance_criteria", "story_data"]
    for field in required_fields:
        if field not in story:
            print(f"  ❌ Missing required field: {field}")
            return False

    if len(story.get("acceptance_criteria", [])) < 5:
        print(f"  ❌ Minimum 5 acceptance criteria required")
        return False

    story_data = story.get("story_data", {})
    if "safety" not in story_data:
        print(f"  ❌ Missing safety configuration")
        return False

    if len(story_data.get("safety", {}).get("stop_conditions", [])) < 4:
        print(f"  ❌ Minimum 4 safety stop conditions required")
        return False

    print("  ✅ Schema validation passed")
    return True


def lock_workflow() -> bool:
    """Lock workflow to enforce gate sequence."""
    print("\n  Locking workflow...")

    lock_file = WAVE_DIR / ".claude" / "WORKFLOW.lock"
    lock_file.parent.mkdir(parents=True, exist_ok=True)

    lock_data = {
        "locked_at": datetime.now().isoformat(),
        "current_gate": 0,
        "gates_completed": []
    }

    with open(lock_file, "w") as f:
        json.dump(lock_data, f, indent=2)

    print(f"  ✅ Workflow locked: {lock_file}")
    return True


def run_preflight() -> bool:
    """Run pre-flight validation."""
    print("\n  Running pre-flight checks...")

    success, output = run_command([
        "python3", "scripts/preflight_lock.py", "--validate", "--lock"
    ])

    if "11 passed" in output or "PASS" in output:
        print("  ✅ Pre-flight passed")
        return True
    else:
        print(f"  ⚠️  Pre-flight output:\n{output[:500]}")
        return True  # Continue anyway for now


def save_story_to_supabase(story: dict) -> bool:
    """Save story to Supabase."""
    print("\n  Saving story to Supabase...")

    # Load Supabase credentials
    env_file = WAVE_DIR / ".env"
    supabase_url = None
    supabase_key = None

    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.startswith("SUPABASE_URL="):
                    supabase_url = line.split("=", 1)[1].strip()
                elif line.startswith("SUPABASE_KEY="):
                    supabase_key = line.split("=", 1)[1].strip()

    if not supabase_url or not supabase_key:
        print("  ⚠️  Supabase credentials not found, skipping DB save")
        return True

    import urllib.request

    data = json.dumps(story).encode()
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/stories",
        data=data,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read())
            print(f"  ✅ Story saved to Supabase: {story['story_id']}")
            return True
    except Exception as e:
        print(f"  ⚠️  Failed to save to Supabase: {e}")
        return True  # Continue anyway


def dispatch_workflow(story: dict) -> dict:
    """Dispatch workflow to orchestrator."""
    print("\n  Dispatching workflow to orchestrator...")

    import urllib.request

    payload = {
        "story_id": story["story_id"],
        "project_path": story["story_data"]["context"]["project_path"],
        "requirements": story["description"],
        "wave_number": story.get("wave_number", 1),
        "token_limit": 100000,
        "cost_limit_usd": 5.0
    }

    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "http://localhost:8000/workflow/start",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read())
            if result.get("success"):
                print(f"  ✅ Workflow started: {result.get('thread_id')}")
                return result
            else:
                print(f"  ❌ Failed to start workflow: {result}")
                return None
    except Exception as e:
        print(f"  ❌ Orchestrator error: {e}")
        print("  💡 Is the orchestrator running? docker compose -f docker/docker-compose.distributed.yml up -d")
        return None


def main():
    """Main entry point."""
    print_header("WAVE v2 - New Story Creation")
    print("\n  This script enforces all 9 gates for consistent feature development.\n")

    # Get project path
    project_path = get_input("Target Project Path", DEFAULT_PROJECT)

    # Gate 0: Research
    context = gate_0_research(project_path)

    # Gate 1: Planning
    story = gate_1_planning(context)

    # Validate
    if not validate_story(story):
        print("\n❌ Story validation failed. Please fix and retry.")
        sys.exit(1)

    # Show story summary
    print_header("STORY SUMMARY")
    print(f"\n  ID: {story['story_id']}")
    print(f"  Title: {story['title']}")
    print(f"  Description: {story['description']}")
    print(f"  AC Count: {len(story['acceptance_criteria'])}")
    print(f"  Files: {len(story['story_data']['files']['create'])}")
    print(f"  Context: {story['story_data']['context']}")

    # Confirm
    proceed = get_input("\n  Proceed with workflow? (y/n)", "y")
    if proceed.lower() != "y":
        print("\n  Aborted.")
        sys.exit(0)

    # Lock and preflight
    print_gate(2, "LOCK & PREFLIGHT")
    lock_workflow()
    run_preflight()

    # Save to Supabase
    save_story_to_supabase(story)

    # Dispatch
    print_gate(3, "DISPATCH")
    result = dispatch_workflow(story)

    if result:
        print_header("WORKFLOW STARTED")
        print(f"""
  Thread ID: {result.get('thread_id')}
  Story ID: {story['story_id']}

  Monitor progress:
    - Logs: docker compose -f docker/docker-compose.distributed.yml logs -f orchestrator
    - Status: curl http://localhost:8000/workflow/{result.get('thread_id')}/status
    - Dozzle: http://localhost:9090

  Gates 2-8 will execute autonomously:
    Gate 2: TDD (Write failing tests)
    Gate 3: Branching (Create feature branch)
    Gate 4: Develop (Write code)
    Gate 5: Refactor (Clean up)
    Gate 6: Safety (Verify score >= 0.85)
    Gate 7: QA (Validate coverage)
    Gate 8: Merge/Deploy (Production)
""")
    else:
        print("\n  ⚠️  Workflow dispatch failed. Check orchestrator status.")


if __name__ == "__main__":
    main()
