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
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Database
    DATABASE_URL: str = "postgresql://crm_user:crm_pass@postgres:5432/crm_db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/1"

    # Report persistence and delivery
    REPORT_DEFINITIONS_PATH: str = "./data/report_definitions.json"
    FORECAST_SUBMISSIONS_PATH: str = "./data/forecast_submissions.json"
    REPORT_SCHEDULER_INTERVAL_SECONDS: int = 60
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
    
    # RAG Configuration
    EMBEDDING_DIMENSIONS: int = 384
    SIMILARITY_THRESHOLD: float = 0.7
    TOP_K_RESULTS: int = 5
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
