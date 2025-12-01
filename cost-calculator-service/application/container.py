"""Dependency Injection Container for Cost Calculator Service"""
from dependency_injector import containers, providers
from infrastructure.services.cost_service import CostService
from infrastructure.config.settings import Settings
from infrastructure.config.rules_loader import JsonRuleLoader


class Container(containers.DeclarativeContainer):
    config = providers.Configuration()
    settings = providers.Singleton(Settings)
    
    # Rule Loader
    rule_loader = providers.Singleton(
        JsonRuleLoader
    )
    
    cost_service = providers.Factory(
        CostService,
        settings=settings,
        rule_loader=rule_loader
    )

