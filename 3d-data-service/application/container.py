"""Dependency Injection Container for 3D Data Service"""
from dependency_injector import containers, providers
from infrastructure.services.visualization_service import VisualizationService
from infrastructure.config.settings import Settings


class Container(containers.DeclarativeContainer):
    config = providers.Configuration()
    settings = providers.Singleton(Settings)
    
    visualization_service = providers.Singleton(
        VisualizationService,
        settings=settings
    )

