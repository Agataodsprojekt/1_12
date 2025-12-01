"""Rule loader interface for business rules"""
from abc import ABC, abstractmethod
from typing import Dict, Any
from decimal import Decimal


class IRuleLoader(ABC):
    """Interface for loading business rules"""
    
    @abstractmethod
    def load_rules(self) -> Dict[str, Any]:
        """Load all business rules from source (JSON, database, etc.)"""
        pass
    
    @abstractmethod
    def get_material_prices(self) -> Dict[str, Dict[str, Any]]:
        """Get material price list"""
        pass
    
    @abstractmethod
    def get_labor_rates(self) -> Dict[str, Dict[str, Any]]:
        """Get labor rates"""
        pass
    
    @abstractmethod
    def get_connection_costs(self) -> Dict[str, Dict[str, Any]]:
        """Get connection/joint costs"""
        pass
    
    @abstractmethod
    def get_waste_factors(self) -> Dict[str, Decimal]:
        """Get waste factors by material/type"""
        pass
    
    @abstractmethod
    def get_calculation_rules(self) -> Dict[str, Any]:
        """Get calculation rules (which provider to use, formulas, etc.)"""
        pass

