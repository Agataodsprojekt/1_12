"""IFC Parser service interface"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from domain.entities.ifc_element import IfcElement
from ifc_common import Result


class IIfcParserService(ABC):
    """Interface for IFC parser service"""
    
    @abstractmethod
    async def parse_file(self, file_path: str) -> Result[List[IfcElement], str]:
        """Parse IFC file"""
        pass
    
    @abstractmethod
    async def validate_file(self, file_path: str) -> Result[bool, str]:
        """Validate IFC file"""
        pass
    
    # Search and filter
    @abstractmethod
    async def search_elements(
        self,
        query: str,
        elements: List[IfcElement]
    ) -> Result[List[Dict[str, Any]], str]:
        """Search elements by query string"""
        pass
    
    @abstractmethod
    async def get_element(
        self,
        element_id: str,
        elements: List[IfcElement]
    ) -> Result[Dict[str, Any], str]:
        """Get element details by ID"""
        pass
    
    @abstractmethod
    async def filter_elements(
        self,
        filters: Dict[str, Any],
        elements: List[IfcElement]
    ) -> Result[List[Dict[str, Any]], str]:
        """Filter elements by criteria"""
        pass

