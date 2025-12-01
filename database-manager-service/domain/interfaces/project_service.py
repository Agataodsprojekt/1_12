"""Project service interface"""
from abc import ABC, abstractmethod
from typing import Dict, Any
from ifc_common import Result


class IProjectService(ABC):
    """Interface for project service"""
    
    @abstractmethod
    async def create_project(
        self,
        project_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Create new project"""
        pass
    
    @abstractmethod
    async def get_project(
        self,
        project_id: str
    ) -> Result[Dict[str, Any], str]:
        """Get project by ID"""
        pass

