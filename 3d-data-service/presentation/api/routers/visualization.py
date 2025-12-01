"""3D Visualization router"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
from pydantic import BaseModel
from application.container import Container
from ifc_common import Result

# Singleton container instance
_container = None

def get_container() -> Container:
    """Get or create container instance"""
    global _container
    if _container is None:
        _container = Container()
        # Note: from_env() is optional - Settings will load from environment automatically
    return _container

router = APIRouter(prefix="/api/visualization", tags=["Visualization"])


class VisualizationRequest(BaseModel):
    """Request model for visualization"""
    elements: List[Dict[str, Any]]
    options: Dict[str, Any] = {}


@router.post("/scene")
async def generate_scene(
    request: VisualizationRequest,
    container: Container = Depends(get_container)
):
    """Generate 3D scene data for Three.js"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.generate_scene_data(
        elements=request.elements
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "service": "3d-data-service"}

