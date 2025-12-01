"""Base settings for microservices"""
from pydantic_settings import BaseSettings
from typing import Optional


class BaseMicroserviceSettings(BaseSettings):
    """Base settings class for all microservices"""
    
    # Database
    database_url: str = "postgresql://ifc_user:ifc_password@localhost:5432/ifc_construction_db"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api"
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

