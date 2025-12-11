"""Dependency Injection Container for IFC Parser Service"""
from dependency_injector import containers, providers
from infrastructure.services.ifc_parser_service import IfcParserService
from infrastructure.config.settings import Settings


class Container(containers.DeclarativeContainer):
    """Dependency Injection Container"""
    
    # Configuration
    config = providers.Configuration()
    
    # Settings
    settings = providers.Singleton(Settings)
    
    # Infrastructure services
    ifc_parser_service = providers.Singleton(
        IfcParserService,
        settings=settings
    )

