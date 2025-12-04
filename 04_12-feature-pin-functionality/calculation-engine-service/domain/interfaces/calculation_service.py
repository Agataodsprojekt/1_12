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
    
    # Measurements
    @abstractmethod
    async def calculate_dimension(
        self,
        point1: Dict[str, float],
        point2: Dict[str, float],
        project_id: str
    ) -> Result[Dict[str, Any], str]:
        """Calculate dimension between two points"""
        pass
    
    @abstractmethod
    async def calculate_volume(
        self,
        points: List[Dict[str, float]],
        project_id: str
    ) -> Result[Dict[str, Any], str]:
        """Calculate volume from points"""
        pass
    
    @abstractmethod
    async def get_measurements(
        self,
        project_id: str
    ) -> Result[List[Dict[str, Any]], str]:
        """Get all measurements for a project"""
        pass

