"""
Test A.2: Dependencies Validation
TDD - Tests written BEFORE implementation

Acceptance Criteria:
1. All required packages can be imported
2. LangGraph is available
3. FastAPI is available
4. Pydantic v2 is available
5. Redis client is available
"""

import pytest


class TestCoreDependencies:
    """Test A.2: Verify all dependencies are installed"""

    def test_langgraph_import(self):
        """LangGraph should be importable"""
        from langgraph.graph import StateGraph, END
        assert StateGraph is not None
        assert END is not None

    def test_langchain_anthropic_import(self):
        """LangChain Anthropic should be importable"""
        from langchain_anthropic import ChatAnthropic
        assert ChatAnthropic is not None

    def test_fastapi_import(self):
        """FastAPI should be importable"""
        from fastapi import FastAPI, HTTPException
        assert FastAPI is not None
        assert HTTPException is not None

    def test_pydantic_import(self):
        """Pydantic v2 should be importable"""
        from pydantic import BaseModel, Field
        import pydantic
        assert BaseModel is not None
        assert pydantic.VERSION.startswith("2"), f"Expected Pydantic v2, got {pydantic.VERSION}"

    def test_redis_import(self):
        """Redis client should be importable"""
        import redis
        assert redis is not None

    def test_uvicorn_import(self):
        """Uvicorn should be importable"""
        import uvicorn
        assert uvicorn is not None

    def test_httpx_import(self):
        """HTTPX should be importable"""
        import httpx
        assert httpx is not None

    def test_dotenv_import(self):
        """python-dotenv should be importable"""
        from dotenv import load_dotenv
        assert load_dotenv is not None


class TestOptionalDependencies:
    """Test optional dependencies (may skip if not needed yet)"""

    @pytest.mark.skip(reason="pygit2 requires system libgit2 - install in Phase B")
    def test_pygit2_import(self):
        """pygit2 should be importable"""
        import pygit2
        assert pygit2 is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
