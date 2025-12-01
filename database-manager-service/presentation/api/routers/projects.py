"""Projects router"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
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

router = APIRouter(prefix="/api/projects", tags=["Projects"])


class ProjectCreateRequest(BaseModel):
    """Request model for project creation"""
    name: str
    description: str = ""
    metadata: Dict[str, Any] = {}


@router.post("/")
async def create_project(
    request: ProjectCreateRequest,
    container: Container = Depends(get_container)
):
    """Create new project"""
    project_service = container.project_service()
    
    project_data = {
        "name": request.name,
        "description": request.description,
        **request.metadata
    }
    
    result = await project_service.create_project(project_data)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    container: Container = Depends(get_container)
):
    """Get project by ID"""
    project_service = container.project_service()
    
    result = await project_service.get_project(project_id)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return result.value


@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "service": "database-manager-service"}

