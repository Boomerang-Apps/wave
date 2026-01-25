"""
WAVE Orchestrator Configuration
Pydantic Settings for environment-based configuration
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Optional


class Settings(BaseSettings):
    """
    Orchestrator configuration loaded from environment variables.

    Environment variables take precedence over defaults.
    Copy .env.example to .env and customize.
    """

    # ===========================================
    # Server Configuration
    # ===========================================
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=True, description="Debug mode")

    # ===========================================
    # Anthropic API
    # ===========================================
    anthropic_api_key: Optional[str] = Field(
        default=None,
        description="Anthropic API key"
    )

    # ===========================================
    # Redis Configuration
    # ===========================================
    redis_url: str = Field(
        default="redis://localhost:6379",
        description="Redis connection URL"
    )

    # ===========================================
    # Supabase Configuration
    # ===========================================
    supabase_url: Optional[str] = Field(
        default=None,
        description="Supabase project URL"
    )
    supabase_key: Optional[str] = Field(
        default=None,
        description="Supabase service role key"
    )

    # ===========================================
    # Safety Thresholds
    # ===========================================
    constitutional_block_threshold: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Score below which actions are blocked"
    )
    constitutional_escalate_threshold: float = Field(
        default=0.85,
        ge=0.0,
        le=1.0,
        description="Score below which actions need human review"
    )

    # ===========================================
    # Budget Limits
    # ===========================================
    default_token_limit: int = Field(
        default=100000,
        gt=0,
        description="Default token limit per run"
    )
    default_cost_limit_usd: float = Field(
        default=10.0,
        gt=0,
        description="Default cost limit in USD per run"
    )

    # ===========================================
    # Portal Integration
    # ===========================================
    portal_url: str = Field(
        default="http://localhost:5173",
        description="Portal frontend URL"
    )
    portal_api_url: str = Field(
        default="http://localhost:3000",
        description="Portal API URL"
    )

    # ===========================================
    # Validators
    # ===========================================
    @field_validator('constitutional_escalate_threshold')
    @classmethod
    def escalate_must_be_higher_than_block(cls, v, info):
        """Escalate threshold must be >= block threshold"""
        block = info.data.get('constitutional_block_threshold', 0.7)
        if v < block:
            raise ValueError(
                f'escalate_threshold ({v}) must be >= block_threshold ({block})'
            )
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,  # Allow PORT or port
    )


# Global settings instance
settings = Settings()
