from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API Keys
    GROQ_API_KEY: str
    
    # CRM Backend
    CRM_API_URL: str = "http://crm-backend:8080"
    BACKEND_URL: str = "http://crm-backend:8080"  # Alias for agent use
    CRM_API_USERNAME: str = "admin@crm.com"
    CRM_API_PASSWORD: str = "admin123"
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://localhost:5175,http://localhost:3000"
    
    # Database
    DATABASE_URL: str = "postgresql://crm_user:crm_pass@postgres:5432/crm_db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/1"

    # Report persistence and delivery
    REPORT_DEFINITIONS_PATH: str = "./data/report_definitions.json"
    FORECAST_SUBMISSIONS_PATH: str = "./data/forecast_submissions.json"
    AI_AUDIT_FALLBACK_PATH: str = "./data/ai_audit_events.jsonl"
    AI_INSIGHT_STATE_PATH: str = "./data/ai_insight_states.json"
    CONVERSATION_FALLBACK_PATH: str = "./data/conversations.jsonl"
    REPORT_SCHEDULER_INTERVAL_SECONDS: int = 60
    AI_RAG_SCHEDULER_ENABLED: bool = False
    AI_RAG_SCHEDULER_AUTH_MODE: str = "jwt"  # jwt or service_account
    AI_RAG_SCHEDULER_ACCESS_TOKEN: Optional[str] = None
    AI_RAG_SCHEDULER_TOKEN_EXPIRES_AT: Optional[str] = None
    AI_RAG_SCHEDULER_TOKEN_ROTATION_WARNING_DAYS: int = 7
    AI_RAG_SERVICE_ACCOUNT_EMAIL: Optional[str] = None
    AI_RAG_SERVICE_ACCOUNT_PASSWORD: Optional[str] = None
    AI_RAG_SERVICE_ACCOUNT_WORKSPACE: Optional[str] = None
    AI_RAG_SERVICE_ACCOUNT_REFRESH_BUFFER_SECONDS: int = 300
    AI_RAG_SCHEDULER_INTERVAL_SECONDS: int = 3600
    AI_RAG_SCHEDULER_DOMAINS: str = "documents,emails,cases,tasks"
    AI_RAG_SCHEDULER_LIMIT: int = 100
    AI_APPROVAL_STORE_PATH: str = "./data/ai_action_approvals.json"
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_STARTTLS: bool = True
    
    # Model Configuration
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    CHAT_MODEL: str = "llama-3.3-70b-versatile"
    TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 2048
    AI_INPUT_TOKEN_COST_PER_1M: float = 0.0
    AI_OUTPUT_TOKEN_COST_PER_1M: float = 0.0
    AI_FAILURE_RATE_ALERT_THRESHOLD: float = 20.0
    AI_FALLBACK_RATE_ALERT_THRESHOLD: float = 20.0
    AI_LATENCY_P95_ALERT_MS: float = 15000.0
    AI_PROVIDER_ERROR_ALERT_THRESHOLD: int = 1
    
    # RAG Configuration
    EMBEDDING_DIMENSIONS: int = 384
    SIMILARITY_THRESHOLD: float = 0.7
    TOP_K_RESULTS: int = 5
    RAG_CHUNK_MAX_CHARS: int = 1800
    RAG_CHUNK_OVERLAP_CHARS: int = 180
    RAG_RECENCY_WEIGHT: float = 0.03
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
