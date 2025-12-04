"""Application settings"""
from ifc_common import BaseMicroserviceSettings


class Settings(BaseMicroserviceSettings):
    """Application settings"""
    
    # Database
    database_url: str = "postgresql://ifc_user:ifc_password@localhost:5432/ifc_construction_db"
    
    # Service
    api_host: str = "0.0.0.0"
    api_port: int = 5001
    api_prefix: str = "/api/ifc"
    
    # IFC Parsing
    upload_dir: str = "./uploads"
    max_file_size: int = 100 * 1024 * 1024  # 100 MB
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

