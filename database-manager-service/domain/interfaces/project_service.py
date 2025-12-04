"""Project service interface"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
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
    
    # Comments management
    @abstractmethod
    async def create_comment(
        self,
        project_id: str,
        comment_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Create a new comment"""
        pass
    
    @abstractmethod
    async def get_comments(
        self,
        project_id: str,
        element_id: Optional[str] = None
    ) -> Result[List[Dict[str, Any]], str]:
        """Get comments for a project or element"""
        pass
    
    @abstractmethod
    async def update_comment(
        self,
        project_id: str,
        comment_id: str,
        comment_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Update a comment"""
        pass
    
    @abstractmethod
    async def delete_comment(
        self,
        project_id: str,
        comment_id: str
    ) -> Result[bool, str]:
        """Delete a comment"""
        pass

