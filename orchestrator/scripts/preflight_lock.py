#!/usr/bin/env python3
"""
WAVE v2 Pre-Flight Lock System
==============================

This script validates ALL pre-flight requirements before allowing
agent dispatch. It creates a LOCK file that proves validation passed.

Usage:
    python scripts/preflight_lock.py --validate
    python scripts/preflight_lock.py --lock
    python scripts/preflight_lock.py --check

The lock file contains a hash of all validated components.
Any code change invalidates the lock, requiring re-validation.
"""

import os
import sys
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

LOCK_FILE = PROJECT_ROOT / ".claude" / "PREFLIGHT.lock"
VALIDATION_REPORT = PROJECT_ROOT / ".claude" / "preflight-report.json"

# Critical files that must exist and be valid
CRITICAL_FILES = {
    "safety": [
        "src/safety/__init__.py",
        "src/safety/constitutional.py",
        "src/safety/emergency_stop.py",
        "src/safety/budget.py",
    ],
    "agents": [
        "src/agents/pm_agent.py",
        "src/agents/cto_agent.py",
        "src/agents/fe_agent.py",
        "src/agents/be_agent.py",
        "src/agents/qa_agent.py",
    ],
    "domains": [
        "src/domains/domain_router.py",
    ],
    "infrastructure": [
        "src/multi_llm.py",
        "src/task_queue.py",  # Redis task queue
    ],
    "gates": [
        "src/gates/gate_system.py",
    ],
}

# Required safety principles (DO-178C probes)
REQUIRED_PRINCIPLES = ["P001", "P002", "P003", "P004", "P005", "P006"]

# Required domain isolation
REQUIRED_DOMAINS = ["auth", "payments", "profile", "api", "ui", "data"]


# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION CHECKS
# ═══════════════════════════════════════════════════════════════════════════════

class PreFlightValidator:
    """Validates all pre-flight requirements."""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.passed: List[str] = []
        self.file_hashes: Dict[str, str] = {}

    def validate_all(self) -> bool:
        """Run all validation checks."""
        print("=" * 60)
        print("WAVE v2 Pre-Flight Validation")
        print("=" * 60)
        print()

        checks = [
            ("Critical Files", self.check_critical_files),
            ("Safety Module", self.check_safety_module),
            ("Emergency Stop", self.check_emergency_stop),
            ("Constitutional AI (DO-178C)", self.check_constitutional_ai),
            ("Budget Enforcement", self.check_budget_enforcement),
            ("Domain Isolation", self.check_domain_isolation),
            ("Agent Framework", self.check_agents),
            ("Multi-LLM Routing", self.check_multi_llm),
            ("Gate System", self.check_gate_system),
            ("Test Coverage", self.check_tests),
        ]

        for name, check_fn in checks:
            print(f"[CHECK] {name}...", end=" ")
            try:
                if check_fn():
                    print("✓ PASS")
                    self.passed.append(name)
                else:
                    print("✗ FAIL")
            except Exception as e:
                print(f"✗ ERROR: {e}")
                self.errors.append(f"{name}: {e}")

        print()
        print("=" * 60)
        print(f"Results: {len(self.passed)} passed, {len(self.errors)} errors, {len(self.warnings)} warnings")
        print("=" * 60)

        return len(self.errors) == 0

    def check_critical_files(self) -> bool:
        """Verify all critical files exist."""
        all_exist = True
        for category, files in CRITICAL_FILES.items():
            for file_path in files:
                full_path = PROJECT_ROOT / file_path
                if not full_path.exists():
                    self.errors.append(f"Missing critical file: {file_path}")
                    all_exist = False
                else:
                    # Compute hash for lock file
                    content = full_path.read_bytes()
                    self.file_hashes[file_path] = hashlib.sha256(content).hexdigest()
        return all_exist

    def _file_contains(self, file_path: str, patterns: list) -> bool:
        """Check if file contains all required patterns (grep-based, no imports needed)."""
        full_path = PROJECT_ROOT / file_path
        if not full_path.exists():
            return False
        content = full_path.read_text()
        return all(p in content for p in patterns)

    def check_safety_module(self) -> bool:
        """Verify safety module exports all required components."""
        init_file = "src/safety/__init__.py"
        required = ["ConstitutionalChecker", "SafetyPrinciple", "EmergencyStop", "BudgetTracker", "WAVE_PRINCIPLES"]
        if not self._file_contains(init_file, required):
            self.errors.append(f"Safety module missing exports in {init_file}")
            return False
        return True

    def check_emergency_stop(self) -> bool:
        """Verify emergency stop mechanism exists with required methods."""
        file_path = "src/safety/emergency_stop.py"
        required = ["class EmergencyStop", "def check(", "def trigger(", "def clear(", "def status(", "EMERGENCY_STOP_FILE"]
        if not self._file_contains(file_path, required):
            self.errors.append(f"Emergency stop missing required methods in {file_path}")
            return False
        return True

    def check_constitutional_ai(self) -> bool:
        """Verify Constitutional AI (DO-178C probes) are defined."""
        file_path = "src/safety/constitutional.py"
        # Check all 6 principles exist
        required = ["WAVE_PRINCIPLES", "SafetyPrinciple"]
        for pid in REQUIRED_PRINCIPLES:
            required.append(f'id="{pid}"')

        if not self._file_contains(file_path, required):
            self.errors.append(f"Constitutional AI missing principles in {file_path}")
            return False
        return True

    def check_budget_enforcement(self) -> bool:
        """Verify budget enforcement is configured."""
        file_path = "src/safety/budget.py"
        required = ["class BudgetTracker", "check_budget"]
        if not self._file_contains(file_path, required):
            self.errors.append(f"Budget enforcement missing methods in {file_path}")
            return False
        return True

    def check_domain_isolation(self) -> bool:
        """Verify business domain isolation."""
        file_path = "src/domains/domain_router.py"
        required = ["SUPPORTED_DOMAINS"]
        # Check all required domains
        for domain in REQUIRED_DOMAINS:
            required.append(f'"{domain}"')

        if not self._file_contains(file_path, required):
            self.errors.append(f"Domain isolation missing domains in {file_path}")
            return False
        return True

    def check_agents(self) -> bool:
        """Verify all domain agents exist with ChatAnthropic."""
        agent_files = [
            ("src/agents/pm_agent.py", ["ChatAnthropic"]),
            ("src/agents/cto_agent.py", ["ChatAnthropic"]),
            ("src/agents/fe_agent.py", ["ChatAnthropic"]),
            ("src/agents/be_agent.py", ["ChatAnthropic"]),
            ("src/agents/qa_agent.py", ["ChatAnthropic"]),
        ]
        for file_path, required in agent_files:
            if not self._file_contains(file_path, required):
                self.errors.append(f"Agent missing ChatAnthropic in {file_path}")
                return False
        return True

    def check_multi_llm(self) -> bool:
        """Verify multi-LLM routing is configured."""
        file_path = "src/multi_llm.py"
        required = ["MultiLLMOrchestrator", "ChatAnthropic"]
        if not self._file_contains(file_path, required):
            self.errors.append(f"Multi-LLM missing orchestrator in {file_path}")
            return False
        return True

    def check_gate_system(self) -> bool:
        """Verify gate system is configured."""
        file_path = "src/gates/gate_system.py"
        required = ["class Gate"]
        if not self._file_contains(file_path, required):
            self.errors.append(f"Gate system missing in {file_path}")
            return False
        return True

    def check_tests(self) -> bool:
        """Verify test files exist for critical components."""
        test_files = [
            "tests/test_emergency_stop.py",
            "tests/test_constitutional.py",
        ]

        missing_tests = []
        for test_file in test_files:
            if not (PROJECT_ROOT / test_file).exists():
                missing_tests.append(test_file)

        if missing_tests:
            self.warnings.append(f"Missing test files: {missing_tests}")
            # Tests are a warning, not a blocker

        return True

    def generate_report(self) -> Dict:
        """Generate validation report."""
        return {
            "timestamp": datetime.now().isoformat(),
            "version": "1.3.0",
            "passed": self.passed,
            "errors": self.errors,
            "warnings": self.warnings,
            "file_hashes": self.file_hashes,
            "valid": len(self.errors) == 0,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# LOCK MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

def create_lock(report: Dict) -> None:
    """Create lock file with validation proof."""
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Create lock content with hash of all validated files
    lock_content = {
        "created_at": datetime.now().isoformat(),
        "version": report["version"],
        "file_hashes": report["file_hashes"],
        "validation_hash": hashlib.sha256(
            json.dumps(report["file_hashes"], sort_keys=True).encode()
        ).hexdigest(),
    }

    LOCK_FILE.write_text(json.dumps(lock_content, indent=2))
    print(f"\n✓ Lock file created: {LOCK_FILE}")


def check_lock() -> Tuple[bool, Optional[str]]:
    """Check if current code matches lock file."""
    if not LOCK_FILE.exists():
        return False, "No lock file exists. Run --validate first."

    lock_data = json.loads(LOCK_FILE.read_text())

    # Recompute hashes of all files
    current_hashes = {}
    for file_path in lock_data["file_hashes"]:
        full_path = PROJECT_ROOT / file_path
        if not full_path.exists():
            return False, f"File missing: {file_path}"
        current_hashes[file_path] = hashlib.sha256(
            full_path.read_bytes()
        ).hexdigest()

    # Compare hashes
    for file_path, expected_hash in lock_data["file_hashes"].items():
        if current_hashes.get(file_path) != expected_hash:
            return False, f"File changed since lock: {file_path}"

    return True, None


def require_lock():
    """Decorator/check to require valid lock before execution."""
    valid, reason = check_lock()
    if not valid:
        print(f"✗ Pre-flight lock invalid: {reason}")
        print("  Run: python scripts/preflight_lock.py --validate --lock")
        sys.exit(1)
    return True


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def audit_checklist_vs_code() -> Dict[str, bool]:
    """
    Audit checklist terms against codebase implementations.
    Prevents future terminology mismatches.
    """
    import subprocess

    mappings = {
        "DO-178C probes": ["WAVE_PRINCIPLES", "SafetyPrinciple", "constitutional"],
        "autonomous flag": ["ChatAnthropic", "langchain_anthropic"],
        "emergency stop": ["EmergencyStop", "EMERGENCY_STOP_FILE"],
        "budget enforcement": ["BudgetTracker", "check_budget"],
        "domain isolation": ["DomainRouter", "SUPPORTED_DOMAINS"],
        "constitutional AI": ["ConstitutionalChecker", "SafetyViolation"],
    }

    results = {}
    for term, patterns in mappings.items():
        found = False
        for pattern in patterns:
            try:
                result = subprocess.run(
                    ["grep", "-r", pattern, str(PROJECT_ROOT / "src")],
                    capture_output=True, text=True
                )
                if result.returncode == 0 and result.stdout.strip():
                    found = True
                    break
            except Exception:
                pass
        results[term] = found

    return results


def main():
    parser = argparse.ArgumentParser(description="WAVE v2 Pre-Flight Lock System")
    parser.add_argument("--validate", action="store_true", help="Run all validations")
    parser.add_argument("--lock", action="store_true", help="Create lock file after validation")
    parser.add_argument("--check", action="store_true", help="Check if lock is still valid")
    parser.add_argument("--report", action="store_true", help="Generate detailed report")
    parser.add_argument("--audit", action="store_true", help="Audit checklist terms vs codebase")

    args = parser.parse_args()

    if args.audit:
        print("=" * 60)
        print("Checklist Term → Codebase Audit")
        print("=" * 60)
        results = audit_checklist_vs_code()
        all_found = True
        for term, found in results.items():
            status = "✓ FOUND" if found else "✗ MISSING"
            print(f"  {term:25} {status}")
            if not found:
                all_found = False
        print("=" * 60)
        sys.exit(0 if all_found else 1)

    if args.check:
        valid, reason = check_lock()
        if valid:
            print("✓ Pre-flight lock is valid. Safe to dispatch agents.")
            sys.exit(0)
        else:
            print(f"✗ Lock invalid: {reason}")
            sys.exit(1)

    if args.validate:
        validator = PreFlightValidator()
        passed = validator.validate_all()
        report = validator.generate_report()

        # Save report
        VALIDATION_REPORT.parent.mkdir(parents=True, exist_ok=True)
        VALIDATION_REPORT.write_text(json.dumps(report, indent=2))
        print(f"\nReport saved: {VALIDATION_REPORT}")

        if args.report:
            print("\n" + json.dumps(report, indent=2))

        if passed and args.lock:
            create_lock(report)
            print("\n✓ System is LOCKED and ready for agent dispatch.")
        elif not passed:
            print("\n✗ Validation failed. Fix errors before locking.")
            sys.exit(1)

        sys.exit(0 if passed else 1)

    # Default: show help
    parser.print_help()


if __name__ == "__main__":
    main()
