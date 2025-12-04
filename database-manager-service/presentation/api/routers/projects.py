"""Projects router"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, Optional
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


class CommentCreateRequest(BaseModel):
    """Request model for comment creation"""
    text: str
    element_id: Optional[str] = None
    element_name: Optional[str] = None
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


# Comments endpoints
@router.post("/{project_id}/comments")
async def create_comment(
    project_id: str,
    request: CommentCreateRequest,
    container: Container = Depends(get_container)
):
    """Create a new comment"""
    project_service = container.project_service()
    
    comment_data = {
        "text": request.text,
        "element_id": request.element_id,
        "element_name": request.element_name,
        **request.metadata
    }
    
    result = await project_service.create_comment(project_id, comment_data)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.get("/{project_id}/comments")
async def get_comments(
    project_id: str,
    element_id: Optional[str] = Query(None),
    container: Container = Depends(get_container)
):
    """Get comments for a project or element"""
    project_service = container.project_service()
    
    result = await project_service.get_comments(project_id, element_id)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return {"comments": result.value}


@router.get("/{project_id}/comments/{element_id}")
async def get_element_comments(
    project_id: str,
    element_id: str,
    container: Container = Depends(get_container)
):
    """Get comments for a specific element"""
    project_service = container.project_service()
    
    result = await project_service.get_comments(project_id, element_id)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return {"comments": result.value}


@router.put("/{project_id}/comments/{comment_id}")
async def update_comment(
    project_id: str,
    comment_id: str,
    comment_data: Dict[str, Any],
    container: Container = Depends(get_container)
):
    """Update a comment"""
    project_service = container.project_service()
    
    result = await project_service.update_comment(project_id, comment_id, comment_data)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return result.value


@router.delete("/{project_id}/comments/{comment_id}")
async def delete_comment(
    project_id: str,
    comment_id: str,
    container: Container = Depends(get_container)
):
    """Delete a comment"""
    project_service = container.project_service()
    
    result = await project_service.delete_comment(project_id, comment_id)
    
    if result.is_failure:
        raise HTTPException(status_code=404, detail=result.error)
    
    return {"success": True}


@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "service": "database-manager-service"}

