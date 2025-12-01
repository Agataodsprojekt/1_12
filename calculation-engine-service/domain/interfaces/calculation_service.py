"""Calculation service interface"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from ifc_common import Result


class ICalculationService(ABC):
    """Interface for calculation service"""
    
    @abstractmethod
    async def calculate_static_analysis(
        self,
        elements: List[Dict[str, Any]]
    ) -> Result[Dict[str, Any], str]:
        """Perform static analysis calculation"""
        pass
    
    @abstractmethod
    async def calculate_strength_analysis(
        self,
        elements: List[Dict[str, Any]]
    ) -> Result[Dict[str, Any], str]:
        """Perform strength analysis calculation"""
        pass

