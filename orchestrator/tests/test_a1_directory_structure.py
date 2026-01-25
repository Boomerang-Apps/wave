"""
Test A.1: Directory Structure Validation
TDD - Tests written BEFORE implementation

Acceptance Criteria:
1. /orchestrator directory exists
2. Core files exist: main.py, graph.py, state.py
3. Subdirectories exist: nodes/, tools/, checkpointer/, tests/
4. Node files exist: cto.py, pm.py, dev.py, qa.py, supervisor.py
5. Tool files exist: git_tools.py, constitutional_scorer.py, file_tools.py
6. All __init__.py files exist for packages
"""

import os
import pytest

BASE_DIR = "/Volumes/SSD-01/Projects/WAVE/orchestrator"


class TestDirectoryStructure:
    """Test A.1: Verify orchestrator directory structure"""

    def test_base_directory_exists(self):
        """Base orchestrator directory should exist"""
        assert os.path.isdir(BASE_DIR), f"Directory {BASE_DIR} does not exist"

    def test_core_files_exist(self):
        """Core Python files should exist"""
        core_files = ["main.py", "graph.py", "state.py", "__init__.py"]
        for filename in core_files:
            filepath = os.path.join(BASE_DIR, filename)
            assert os.path.isfile(filepath), f"Core file {filename} does not exist"

    def test_nodes_directory_exists(self):
        """nodes/ subdirectory should exist"""
        nodes_dir = os.path.join(BASE_DIR, "nodes")
        assert os.path.isdir(nodes_dir), "nodes/ directory does not exist"

    def test_node_files_exist(self):
        """All agent node files should exist"""
        node_files = ["__init__.py", "cto.py", "pm.py", "dev.py", "qa.py", "supervisor.py"]
        nodes_dir = os.path.join(BASE_DIR, "nodes")
        for filename in node_files:
            filepath = os.path.join(nodes_dir, filename)
            assert os.path.isfile(filepath), f"Node file {filename} does not exist"

    def test_tools_directory_exists(self):
        """tools/ subdirectory should exist"""
        tools_dir = os.path.join(BASE_DIR, "tools")
        assert os.path.isdir(tools_dir), "tools/ directory does not exist"

    def test_tool_files_exist(self):
        """All tool files should exist"""
        tool_files = ["__init__.py", "git_tools.py", "constitutional_scorer.py", "file_tools.py"]
        tools_dir = os.path.join(BASE_DIR, "tools")
        for filename in tool_files:
            filepath = os.path.join(tools_dir, filename)
            assert os.path.isfile(filepath), f"Tool file {filename} does not exist"

    def test_checkpointer_directory_exists(self):
        """checkpointer/ subdirectory should exist"""
        checkpointer_dir = os.path.join(BASE_DIR, "checkpointer")
        assert os.path.isdir(checkpointer_dir), "checkpointer/ directory does not exist"

    def test_checkpointer_files_exist(self):
        """Checkpointer files should exist"""
        checkpointer_files = ["__init__.py", "supabase.py"]
        checkpointer_dir = os.path.join(BASE_DIR, "checkpointer")
        for filename in checkpointer_files:
            filepath = os.path.join(checkpointer_dir, filename)
            assert os.path.isfile(filepath), f"Checkpointer file {filename} does not exist"

    def test_tests_directory_exists(self):
        """tests/ subdirectory should exist"""
        tests_dir = os.path.join(BASE_DIR, "tests")
        assert os.path.isdir(tests_dir), "tests/ directory does not exist"

    def test_config_files_exist(self):
        """Configuration files should exist"""
        config_files = ["requirements.txt", ".env.example", "pytest.ini"]
        for filename in config_files:
            filepath = os.path.join(BASE_DIR, filename)
            assert os.path.isfile(filepath), f"Config file {filename} does not exist"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
