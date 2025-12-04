"""Dependency Injection Container for Database Manager Service"""
from dependency_injector import containers, providers
from infrastructure.services.project_service import ProjectService
from infrastructure.config.settings import Settings


class Container(containers.DeclarativeContainer):
    config = providers.Configuration()
    settings = providers.Singleton(Settings)
    
    project_service = providers.Singleton(ProjectService, settings=settings)

