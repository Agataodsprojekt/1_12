"""Dependency Injection Container for API Gateway"""
from dependency_injector import containers, providers
from infrastructure.services.orchestration_service import OrchestrationService
from infrastructure.config.settings import Settings


class Container(containers.DeclarativeContainer):
    """Dependency Injection Container"""
    
    # Configuration
    config = providers.Configuration()
    
    # Settings
    settings = providers.Singleton(Settings)
    
    # Infrastructure services
    orchestration_service = providers.Singleton(
        OrchestrationService,
        settings=settings
    )

