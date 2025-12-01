"""IFC Parser service interface"""
from abc import ABC, abstractmethod
from typing import List
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

