"""Cost provider interfaces - Strategy pattern for different cost types"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from decimal import Decimal

from domain.entities.cost_breakdown import CostItem, ElementCostBreakdown


class ICostProvider(ABC):
    """Base interface for cost calculation providers"""
    
    @abstractmethod
    def can_calculate(self, element: Dict[str, Any]) -> bool:
        """Check if this provider can calculate costs for given element"""
        pass
    
    @abstractmethod
    def calculate(self, element: Dict[str, Any], rules: Dict[str, Any]) -> List[CostItem]:
        """Calculate cost items for element"""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get name of this provider (e.g., 'material', 'labor', 'connection')"""
        pass


class IMaterialCostProvider(ICostProvider):
    """Provider for material costs"""
    pass


class ILaborCostProvider(ICostProvider):
    """Provider for labor/work costs"""
    pass


class IConnectionCostProvider(ICostProvider):
    """Provider for connection/joint costs (welds, bolts, etc.)"""
    pass


class ISurfaceTreatmentCostProvider(ICostProvider):
    """Provider for surface treatment costs (painting, coating, etc.)"""
    pass


class IWasteFactorProvider(ABC):
    """Provider for waste factors based on material/element type"""
    
    @abstractmethod
    def get_waste_factor(self, element: Dict[str, Any], rules: Dict[str, Any]) -> Decimal:
        """Get waste factor for element (e.g., 0.05 for 5%)"""
        pass

