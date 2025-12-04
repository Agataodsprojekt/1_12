"""Visualization service implementation"""
from typing import Dict, Any, List
from domain.interfaces.visualization_service import IVisualizationService
from ifc_common import Result
from infrastructure.config.settings import Settings
import uuid
from datetime import datetime


class VisualizationService(IVisualizationService):
    """Visualization service implementation"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        # In-memory storage (TODO: Replace with database)
        self._views: Dict[str, Dict[str, Any]] = {}
        self._pins: Dict[str, List[Dict[str, Any]]] = {}
        self._selections: Dict[str, List[Dict[str, Any]]] = {}
    
    async def generate_scene_data(
        self,
        elements: List[Dict[str, Any]]
    ) -> Result[Dict[str, Any], str]:
        """Generate 3D scene data for Three.js"""
        try:
            # TODO: Implement geometry generation for Three.js
            return Result.success({
                "vertices": [],
                "faces": [],
                "colors": []
            })
        except Exception as e:
            return Result.failure(f"Visualization error: {str(e)}")
    
    # Views management
    async def create_view(
        self,
        project_id: str,
        view_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Create a new view"""
        try:
            view_id = str(uuid.uuid4())
            view = {
                "id": view_id,
                "project_id": project_id,
                **view_data,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            self._views[view_id] = view
            return Result.success(view)
        except Exception as e:
            return Result.failure(f"Error creating view: {str(e)}")
    
    async def get_views(
        self,
        project_id: str
    ) -> Result[List[Dict[str, Any]], str]:
        """Get all views for a project"""
        try:
            views = [
                view for view in self._views.values()
                if view.get("project_id") == project_id
            ]
            return Result.success(views)
        except Exception as e:
            return Result.failure(f"Error getting views: {str(e)}")
    
    async def update_view(
        self,
        view_id: str,
        view_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Update a view"""
        try:
            if view_id not in self._views:
                return Result.failure(f"View {view_id} not found")
            
            self._views[view_id].update(view_data)
            self._views[view_id]["updated_at"] = datetime.now().isoformat()
            return Result.success(self._views[view_id])
        except Exception as e:
            return Result.failure(f"Error updating view: {str(e)}")
    
    async def delete_view(
        self,
        view_id: str
    ) -> Result[bool, str]:
        """Delete a view"""
        try:
            # Find view by ID (views are stored by view_id as key)
            if view_id not in self._views:
                # View might not exist if it was created only locally in frontend
                # This is OK - return success anyway (idempotent delete)
                return Result.success(True)
            
            del self._views[view_id]
            return Result.success(True)
        except Exception as e:
            return Result.failure(f"Error deleting view: {str(e)}")
    
    # Pins management
    async def create_pin(
        self,
        project_id: str,
        element_id: str,
        color: str
    ) -> Result[Dict[str, Any], str]:
        """Pin an element with a color"""
        try:
            if project_id not in self._pins:
                self._pins[project_id] = []
            
            pin = {
                "element_id": element_id,
                "color": color,
                "project_id": project_id,
                "created_at": datetime.now().isoformat()
            }
            self._pins[project_id].append(pin)
            return Result.success(pin)
        except Exception as e:
            return Result.failure(f"Error creating pin: {str(e)}")
    
    async def delete_pin(
        self,
        project_id: str,
        element_id: str
    ) -> Result[bool, str]:
        """Unpin an element"""
        try:
            if project_id not in self._pins:
                return Result.failure(f"No pins found for project {project_id}")
            
            self._pins[project_id] = [
                p for p in self._pins[project_id]
                if p["element_id"] != element_id
            ]
            return Result.success(True)
        except Exception as e:
            return Result.failure(f"Error deleting pin: {str(e)}")
    
    async def get_pins(
        self,
        project_id: str
    ) -> Result[List[Dict[str, Any]], str]:
        """Get all pins for a project"""
        try:
            pins = self._pins.get(project_id, [])
            return Result.success(pins)
        except Exception as e:
            return Result.failure(f"Error getting pins: {str(e)}")
    
    async def update_pin(
        self,
        project_id: str,
        element_id: str,
        color: str
    ) -> Result[Dict[str, Any], str]:
        """Update pin color"""
        try:
            if project_id not in self._pins:
                return Result.failure(f"No pins found for project {project_id}")
            
            for pin in self._pins[project_id]:
                if pin["element_id"] == element_id:
                    pin["color"] = color
                    return Result.success(pin)
            
            return Result.failure(f"Pin for element {element_id} not found")
        except Exception as e:
            return Result.failure(f"Error updating pin: {str(e)}")
    
    # Selections management
    async def create_selection(
        self,
        project_id: str,
        selection_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Create a new selection"""
        try:
            selection_id = str(uuid.uuid4())
            selection = {
                "id": selection_id,
                "project_id": project_id,
                **selection_data,
                "created_at": datetime.now().isoformat()
            }
            
            if project_id not in self._selections:
                self._selections[project_id] = []
            
            self._selections[project_id].append(selection)
            return Result.success(selection)
        except Exception as e:
            return Result.failure(f"Error creating selection: {str(e)}")
    
    async def get_selections(
        self,
        project_id: str
    ) -> Result[List[Dict[str, Any]], str]:
        """Get all selections for a project"""
        try:
            selections = self._selections.get(project_id, [])
            return Result.success(selections)
        except Exception as e:
            return Result.failure(f"Error getting selections: {str(e)}")
    
    async def isolate_selection(
        self,
        selection_id: str
    ) -> Result[bool, str]:
        """Isolate elements in a selection"""
        try:
            # Find selection in all projects
            for project_selections in self._selections.values():
                for selection in project_selections:
                    if selection["id"] == selection_id:
                        selection["isolated"] = True
                        return Result.success(True)
            
            return Result.failure(f"Selection {selection_id} not found")
        except Exception as e:
            return Result.failure(f"Error isolating selection: {str(e)}")
    
    async def show_selection(
        self,
        selection_id: str
    ) -> Result[bool, str]:
        """Show elements in a selection"""
        try:
            for project_selections in self._selections.values():
                for selection in project_selections:
                    if selection["id"] == selection_id:
                        selection["visible"] = True
                        return Result.success(True)
            
            return Result.failure(f"Selection {selection_id} not found")
        except Exception as e:
            return Result.failure(f"Error showing selection: {str(e)}")
    
    async def hide_selection(
        self,
        selection_id: str
    ) -> Result[bool, str]:
        """Hide elements in a selection"""
        try:
            for project_selections in self._selections.values():
                for selection in project_selections:
                    if selection["id"] == selection_id:
                        selection["visible"] = False
                        return Result.success(True)
            
            return Result.failure(f"Selection {selection_id} not found")
        except Exception as e:
            return Result.failure(f"Error hiding selection: {str(e)}")

