"""Cost calculation service interface"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from ifc_common import Result


class ICostService(ABC):
    """Interface for cost calculation service"""
    
    @abstractmethod
    async def calculate_costs(
        self,
        elements: List[Dict[str, Any]]
    ) -> Result[Dict[str, Any], str]:
        """Calculate costs for elements"""
        pass

