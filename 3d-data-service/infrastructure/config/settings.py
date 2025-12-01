"""Application settings"""
from ifc_common import BaseMicroserviceSettings


class Settings(BaseMicroserviceSettings):
    database_url: str = "postgresql://ifc_user:ifc_password@localhost:5432/ifc_construction_db"
    api_host: str = "0.0.0.0"
    api_port: int = 5004
    api_prefix: str = "/api/visualization"
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

