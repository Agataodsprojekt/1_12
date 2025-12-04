"""Dependency Injection Container for Calculation Engine Service"""
from dependency_injector import containers, providers
from infrastructure.services.calculation_service import CalculationService
from infrastructure.config.settings import Settings


class Container(containers.DeclarativeContainer):
    """Dependency Injection Container"""
    
    config = providers.Configuration()
    settings = providers.Singleton(Settings)
    
    calculation_service = providers.Singleton(
        CalculationService,
        settings=settings
    )

