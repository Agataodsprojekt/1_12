"""3D Visualization router"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
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


class ViewCreateRequest(BaseModel):
    """Request model for view creation"""
    project_id: str
    name: str
    type: str  # 'storey' | 'elevation' | 'section'
    data: Dict[str, Any] = {}


class PinCreateRequest(BaseModel):
    """Request model for pin creation"""
    project_id: str
    element_id: str
    color: str


class SelectionCreateRequest(BaseModel):
    """Request model for selection creation"""
    project_id: str
    name: str
    element_ids: List[str]
    metadata: Dict[str, Any] = {}


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


# Views endpoints
@router.post("/views")
async def create_view(
    request: ViewCreateRequest,
    container: Container = Depends(get_container)
):
    """Create a new view"""
    visualization_service = container.visualization_service()
    
    view_data = {
        "name": request.name,
        "type": request.type,
        **request.data
    }
    
    result = await visualization_service.create_view(
        project_id=request.project_id,
        view_data=view_data
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.get("/views/{project_id}")
async def get_views(
    project_id: str,
    container: Container = Depends(get_container)
):
    """Get all views for a project"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.get_views(project_id)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return {"views": result.value}


@router.put("/views/{view_id}")
async def update_view(
    view_id: str,
    view_data: Dict[str, Any],
    container: Container = Depends(get_container)
):
    """Update a view"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.update_view(view_id, view_data)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return result.value


@router.delete("/views/{view_id}")
async def delete_view(
    view_id: str,
    container: Container = Depends(get_container)
):
    """Delete a view"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.delete_view(view_id)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return {"success": True}


# Pins endpoints
@router.post("/pins")
async def create_pin(
    request: PinCreateRequest,
    container: Container = Depends(get_container)
):
    """Pin an element with a color"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.create_pin(
        project_id=request.project_id,
        element_id=request.element_id,
        color=request.color
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.delete("/pins/{project_id}/{element_id}")
async def delete_pin(
    project_id: str,
    element_id: str,
    container: Container = Depends(get_container)
):
    """Unpin an element"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.delete_pin(project_id, element_id)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return {"success": True}


@router.get("/pins/{project_id}")
async def get_pins(
    project_id: str,
    container: Container = Depends(get_container)
):
    """Get all pins for a project"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.get_pins(project_id)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return {"pins": result.value}


@router.put("/pins/{project_id}/{element_id}")
async def update_pin(
    project_id: str,
    element_id: str,
    color: str,
    container: Container = Depends(get_container)
):
    """Update pin color"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.update_pin(
        project_id=project_id,
        element_id=element_id,
        color=color
    )
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return result.value


# Selections endpoints
@router.post("/selections")
async def create_selection(
    request: SelectionCreateRequest,
    container: Container = Depends(get_container)
):
    """Create a new selection"""
    visualization_service = container.visualization_service()
    
    selection_data = {
        "name": request.name,
        "element_ids": request.element_ids,
        **request.metadata
    }
    
    result = await visualization_service.create_selection(
        project_id=request.project_id,
        selection_data=selection_data
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.get("/selections/{project_id}")
async def get_selections(
    project_id: str,
    container: Container = Depends(get_container)
):
    """Get all selections for a project"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.get_selections(project_id)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return {"selections": result.value}


@router.post("/selections/{selection_id}/isolate")
async def isolate_selection(
    selection_id: str,
    container: Container = Depends(get_container)
):
    """Isolate elements in a selection"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.isolate_selection(selection_id)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return {"success": True}


@router.post("/selections/{selection_id}/show")
async def show_selection(
    selection_id: str,
    container: Container = Depends(get_container)
):
    """Show elements in a selection"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.show_selection(selection_id)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return {"success": True}


@router.post("/selections/{selection_id}/hide")
async def hide_selection(
    selection_id: str,
    container: Container = Depends(get_container)
):
    """Hide elements in a selection"""
    visualization_service = container.visualization_service()
    
    result = await visualization_service.hide_selection(selection_id)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return {"success": True}


@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "service": "3d-data-service"}

