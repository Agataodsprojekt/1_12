"""Orchestration service interface"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List
from ifc_common import Result


class IOrchestrationService(ABC):
    """Interface for orchestration service"""
    
    @abstractmethod
    async def route_request(
        self, 
        service_name: str, 
        endpoint: str, 
        method: str,
        data: Dict[str, Any] = None
    ) -> Result[Dict[str, Any], str]:
        """Route request to appropriate microservice"""
        pass
    
    @abstractmethod
    async def aggregate_responses(
        self,
        requests: List[Dict[str, Any]]
    ) -> Result[Dict[str, Any], str]:
        """Aggregate responses from multiple microservices"""
        pass

