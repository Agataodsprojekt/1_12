"""3D Visualization service interface"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from ifc_common import Result


class IVisualizationService(ABC):
    """Interface for 3D visualization service"""
    
    @abstractmethod
    async def generate_scene_data(
        self,
        elements: List[Dict[str, Any]]
    ) -> Result[Dict[str, Any], str]:
        """Generate 3D scene data for Three.js"""
        pass
    
    # Views management
    @abstractmethod
    async def create_view(
        self,
        project_id: str,
        view_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Create a new view (storey, elevation, section)"""
        pass
    
    @abstractmethod
    async def get_views(
        self,
        project_id: str
    ) -> Result[List[Dict[str, Any]], str]:
        """Get all views for a project"""
        pass
    
    @abstractmethod
    async def update_view(
        self,
        view_id: str,
        view_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Update a view"""
        pass
    
    @abstractmethod
    async def delete_view(
        self,
        view_id: str
    ) -> Result[bool, str]:
        """Delete a view"""
        pass
    
    # Pins management
    @abstractmethod
    async def create_pin(
        self,
        project_id: str,
        element_id: str,
        color: str
    ) -> Result[Dict[str, Any], str]:
        """Pin an element with a color"""
        pass
    
    @abstractmethod
    async def delete_pin(
        self,
        project_id: str,
        element_id: str
    ) -> Result[bool, str]:
        """Unpin an element"""
        pass
    
    @abstractmethod
    async def get_pins(
        self,
        project_id: str
    ) -> Result[List[Dict[str, Any]], str]:
        """Get all pins for a project"""
        pass
    
    @abstractmethod
    async def update_pin(
        self,
        project_id: str,
        element_id: str,
        color: str
    ) -> Result[Dict[str, Any], str]:
        """Update pin color"""
        pass
    
    # Selections management
    @abstractmethod
    async def create_selection(
        self,
        project_id: str,
        selection_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Create a new selection"""
        pass
    
    @abstractmethod
    async def get_selections(
        self,
        project_id: str
    ) -> Result[List[Dict[str, Any]], str]:
        """Get all selections for a project"""
        pass
    
    @abstractmethod
    async def isolate_selection(
        self,
        selection_id: str
    ) -> Result[bool, str]:
        """Isolate elements in a selection"""
        pass
    
    @abstractmethod
    async def show_selection(
        self,
        selection_id: str
    ) -> Result[bool, str]:
        """Show elements in a selection"""
        pass
    
    @abstractmethod
    async def hide_selection(
        self,
        selection_id: str
    ) -> Result[bool, str]:
        """Hide elements in a selection"""
        pass

