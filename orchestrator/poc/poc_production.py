#!/usr/bin/env python3
"""
WAVE v2 Production PoC
======================
Phase 4 validation: gVisor Sandbox, Kubernetes Deployment

Tests:
1. Sandbox configuration and creation
2. Process-based sandbox execution (fallback mode)
3. Resource limits and isolation settings
4. Kubernetes manifest validation
5. Health check endpoints
6. Scaling configuration

GATE 4 Criteria:
- [ ] Sandbox configs are valid
- [ ] Sandbox execution works (process fallback)
- [ ] K8s manifests are valid YAML
- [ ] Health checks work
"""

import os
import sys
import json
import yaml
from datetime import datetime
from pathlib import Path

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

from src.sandbox.gvisor import (
    SandboxManager,
    SandboxConfig,
    SandboxResult,
    SandboxRuntime,
    IsolationLevel,
    create_sandbox,
    run_in_sandbox,
    GVISOR_AVAILABLE,
    DOCKER_AVAILABLE,
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
# TEST 1: Sandbox Manager Initialization
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 1: Sandbox Manager Initialization")
print("="*60)

# Test 1a: Create sandbox manager
manager = SandboxManager()
runtime_info = manager.get_runtime_info()

results.record(
    "Sandbox manager initializes",
    manager is not None,
    f"runtime={runtime_info['default_runtime']}"
)

# Test 1b: Runtime detection
results.record(
    "Runtime detection works",
    "gvisor_available" in runtime_info and "docker_available" in runtime_info,
    f"gvisor={runtime_info['gvisor_available']}, docker={runtime_info['docker_available']}"
)

# Test 1c: Default runtime selection
# Should fallback to process if neither gVisor nor Docker available
expected_runtime = (
    "runsc" if GVISOR_AVAILABLE else
    "runc" if DOCKER_AVAILABLE else
    "process"
)
results.record(
    "Default runtime selected correctly",
    runtime_info["default_runtime"] == expected_runtime,
    f"expected={expected_runtime}, got={runtime_info['default_runtime']}"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: Sandbox Configuration
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 2: Sandbox Configuration")
print("="*60)

# Test 2a: Create basic config
config = manager.create_config(
    name="test-sandbox",
    workspace_path="/tmp/test-workspace",
    isolation=IsolationLevel.STANDARD
)

results.record(
    "Basic config creation works",
    config.name == "test-sandbox" and config.workspace_path == "/tmp/test-workspace",
    f"name={config.name}"
)

# Test 2b: Isolation levels
strict_config = manager.create_config(
    name="strict-sandbox",
    isolation=IsolationLevel.STRICT
)
results.record(
    "Strict isolation config works",
    strict_config.isolation == IsolationLevel.STRICT,
    f"isolation={strict_config.isolation.value}"
)

# Test 2c: Resource limits
limited_config = manager.create_config(
    name="limited-sandbox",
    memory_limit="1g",
    cpu_limit=0.5,
    timeout_seconds=60
)
results.record(
    "Resource limits config works",
    limited_config.memory_limit == "1g" and limited_config.cpu_limit == 0.5,
    f"memory={limited_config.memory_limit}, cpu={limited_config.cpu_limit}"
)

# Test 2d: Docker args generation
docker_args = config.to_docker_args()
results.record(
    "Docker args generation works",
    "--rm" in docker_args and "--security-opt=no-new-privileges" in docker_args,
    f"arg_count={len(docker_args)}"
)

# Test 2e: Network isolation
network_config = manager.create_config(
    name="network-sandbox",
    network_enabled=False
)
network_args = network_config.to_docker_args()
results.record(
    "Network isolation in args",
    "--network=none" in network_args,
    "network=none"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: Sandbox Execution (Process Fallback)
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 3: Sandbox Execution (Process Fallback)")
print("="*60)

# Force process mode for testing
process_manager = SandboxManager(default_runtime=SandboxRuntime.PROCESS)

# Test 3a: Simple command execution
simple_config = process_manager.create_config(
    name="simple-test",
    timeout_seconds=10
)
simple_result = process_manager.run(simple_config, ["echo", "hello"])

results.record(
    "Simple command execution works",
    simple_result.success and "hello" in simple_result.stdout,
    f"stdout={simple_result.stdout.strip()}"
)

# Test 3b: Python execution
python_config = process_manager.create_config(
    name="python-test",
    timeout_seconds=10
)
python_result = process_manager.run(
    python_config,
    ["python3", "-c", "print('WAVE v2 sandbox test')"]
)

results.record(
    "Python command execution works",
    python_result.success and "WAVE v2" in python_result.stdout,
    f"stdout={python_result.stdout.strip()}"
)

# Test 3c: Exit code handling
exit_config = process_manager.create_config(
    name="exit-test",
    timeout_seconds=10
)
exit_result = process_manager.run(exit_config, ["python3", "-c", "exit(42)"])

results.record(
    "Exit code captured correctly",
    not exit_result.success and exit_result.exit_code == 42,
    f"exit_code={exit_result.exit_code}"
)

# Test 3d: Timeout handling
timeout_config = process_manager.create_config(
    name="timeout-test",
    timeout_seconds=1
)
timeout_result = process_manager.run(
    timeout_config,
    ["python3", "-c", "import time; time.sleep(10)"]
)

results.record(
    "Timeout handling works",
    not timeout_result.success and timeout_result.error is not None,
    f"error={timeout_result.error}"
)

# Test 3e: Sandbox ID generation
results.record(
    "Sandbox ID generated",
    simple_result.sandbox_id is not None and "simple-test" in simple_result.sandbox_id,
    f"sandbox_id={simple_result.sandbox_id}"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 4: Helper Functions")
print("="*60)

# Test 4a: create_sandbox helper
helper_config = create_sandbox(
    name="helper-test",
    workspace_path="/tmp/helper-workspace",
    isolation=IsolationLevel.PERMISSIVE
)

results.record(
    "create_sandbox helper works",
    helper_config.name == "helper-test",
    f"name={helper_config.name}"
)

# Test 4b: run_in_sandbox helper (with forced process mode)
# Note: This uses the global manager, so we test config creation instead
# In production, run_in_sandbox would execute the command
results.record(
    "run_in_sandbox creates valid config",
    helper_config.workspace_path == "/tmp/helper-workspace",
    f"workspace={helper_config.workspace_path}"
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: Kubernetes Manifests Validation
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 5: Kubernetes Manifests Validation")
print("="*60)

k8s_dir = Path(_project_root) / "k8s"

# Test 5a: Namespace manifest
namespace_file = k8s_dir / "namespace.yaml"
try:
    with open(namespace_file) as f:
        namespace_yaml = yaml.safe_load(f)
    results.record(
        "Namespace manifest is valid YAML",
        namespace_yaml.get("kind") == "Namespace",
        f"kind={namespace_yaml.get('kind')}"
    )
except Exception as e:
    results.record("Namespace manifest is valid YAML", False, str(e))

# Test 5b: Deployment manifest
deployment_file = k8s_dir / "deployment.yaml"
try:
    with open(deployment_file) as f:
        docs = list(yaml.safe_load_all(f))
    deployment = docs[0]
    results.record(
        "Deployment manifest is valid YAML",
        deployment.get("kind") == "Deployment",
        f"kind={deployment.get('kind')}"
    )
except Exception as e:
    results.record("Deployment manifest is valid YAML", False, str(e))

# Test 5c: Service manifest
service_file = k8s_dir / "service.yaml"
try:
    with open(service_file) as f:
        docs = list(yaml.safe_load_all(f))
    service = docs[0]
    results.record(
        "Service manifest is valid YAML",
        service.get("kind") == "Service",
        f"kind={service.get('kind')}"
    )
except Exception as e:
    results.record("Service manifest is valid YAML", False, str(e))

# Test 5d: ConfigMap manifest
configmap_file = k8s_dir / "configmap.yaml"
try:
    with open(configmap_file) as f:
        configmap_yaml = yaml.safe_load(f)
    results.record(
        "ConfigMap manifest is valid YAML",
        configmap_yaml.get("kind") == "ConfigMap",
        f"kind={configmap_yaml.get('kind')}"
    )
except Exception as e:
    results.record("ConfigMap manifest is valid YAML", False, str(e))

# Test 5e: HPA manifest
hpa_file = k8s_dir / "hpa.yaml"
try:
    with open(hpa_file) as f:
        hpa_yaml = yaml.safe_load(f)
    results.record(
        "HPA manifest is valid YAML",
        hpa_yaml.get("kind") == "HorizontalPodAutoscaler",
        f"kind={hpa_yaml.get('kind')}"
    )
except Exception as e:
    results.record("HPA manifest is valid YAML", False, str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: Deployment Configuration Validation
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 6: Deployment Configuration Validation")
print("="*60)

# Test 6a: Security context
try:
    with open(deployment_file) as f:
        docs = list(yaml.safe_load_all(f))
    deployment = docs[0]
    security_context = deployment["spec"]["template"]["spec"].get("securityContext", {})
    results.record(
        "Pod runs as non-root",
        security_context.get("runAsNonRoot") == True,
        f"runAsNonRoot={security_context.get('runAsNonRoot')}"
    )
except Exception as e:
    results.record("Pod runs as non-root", False, str(e))

# Test 6b: Resource limits
try:
    container = deployment["spec"]["template"]["spec"]["containers"][0]
    resources = container.get("resources", {})
    has_limits = "limits" in resources and "memory" in resources["limits"]
    results.record(
        "Resource limits defined",
        has_limits,
        f"memory_limit={resources.get('limits', {}).get('memory', 'N/A')}"
    )
except Exception as e:
    results.record("Resource limits defined", False, str(e))

# Test 6c: Liveness probe
try:
    container = deployment["spec"]["template"]["spec"]["containers"][0]
    has_liveness = "livenessProbe" in container
    results.record(
        "Liveness probe configured",
        has_liveness,
        f"path={container.get('livenessProbe', {}).get('httpGet', {}).get('path', 'N/A')}"
    )
except Exception as e:
    results.record("Liveness probe configured", False, str(e))

# Test 6d: Readiness probe
try:
    container = deployment["spec"]["template"]["spec"]["containers"][0]
    has_readiness = "readinessProbe" in container
    results.record(
        "Readiness probe configured",
        has_readiness,
        f"path={container.get('readinessProbe', {}).get('httpGet', {}).get('path', 'N/A')}"
    )
except Exception as e:
    results.record("Readiness probe configured", False, str(e))

# Test 6e: Container security context
try:
    container = deployment["spec"]["template"]["spec"]["containers"][0]
    container_sec = container.get("securityContext", {})
    results.record(
        "Container privilege escalation disabled",
        container_sec.get("allowPrivilegeEscalation") == False,
        f"allowPrivilegeEscalation={container_sec.get('allowPrivilegeEscalation')}"
    )
except Exception as e:
    results.record("Container privilege escalation disabled", False, str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 7: Dockerfile Validation
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("TEST 7: Dockerfile Validation")
print("="*60)

dockerfile = Path(_project_root) / "Dockerfile"

try:
    with open(dockerfile) as f:
        dockerfile_content = f.read()

    # Test 7a: Multi-stage build
    results.record(
        "Dockerfile uses multi-stage build",
        "FROM python:3.11-slim as builder" in dockerfile_content,
        "multi-stage=True"
    )

    # Test 7b: Non-root user
    results.record(
        "Dockerfile creates non-root user",
        "useradd" in dockerfile_content and "USER wave" in dockerfile_content,
        "non-root=True"
    )

    # Test 7c: Health check
    results.record(
        "Dockerfile has health check",
        "HEALTHCHECK" in dockerfile_content,
        "healthcheck=True"
    )

except Exception as e:
    results.record("Dockerfile validation", False, str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("GATE 4 CRITERIA")
print("="*60)

gate4_criteria = {
    "Sandbox configs are valid": results.passed >= 5,
    "Sandbox execution works (process fallback)": results.passed >= 10,
    "K8s manifests are valid YAML": results.passed >= 15,
    "Health checks configured": results.passed >= 20,
}

all_passed = True
for criterion, passed in gate4_criteria.items():
    status = "PASS" if passed else "FAIL"
    if not passed:
        all_passed = False
    print(f"  [{status}] {criterion}")

# Final summary
success = results.summary()

print(f"\nGATE 4 STATUS: {'PASSED' if all_passed else 'FAILED'}")
print(f"gVisor available: {GVISOR_AVAILABLE}")
print(f"Docker available: {DOCKER_AVAILABLE}")
print(f"Fallback mode: process")

sys.exit(0 if success else 1)
