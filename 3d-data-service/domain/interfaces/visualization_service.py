"""3D Visualization service interface"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List
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

