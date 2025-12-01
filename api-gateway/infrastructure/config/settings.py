"""Application settings"""
from typing import List
from ifc_common import BaseMicroserviceSettings


class Settings(BaseMicroserviceSettings):
    """Application settings"""
    
    # Database
    database_url: str = "postgresql://ifc_user:ifc_password@localhost:5432/ifc_construction_db"
    
    # Microservices URLs (Docker internal network)
    ifc_parser_url: str = "http://ifc-parser-service:5001"
    calculation_engine_url: str = "http://calculation-engine-service:5002"
    cost_calculator_url: str = "http://cost-calculator-service:5003"
    data_3d_url: str = "http://3d-data-service:5004"
    db_manager_url: str = "http://database-manager-service:5005"
    
    # API Gateway
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api"
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000"]
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

