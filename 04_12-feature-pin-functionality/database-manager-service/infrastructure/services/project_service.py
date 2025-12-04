"""Project service implementation"""
from typing import Dict, Any, List, Optional
from domain.interfaces.project_service import IProjectService
from ifc_common import Result
from infrastructure.config.settings import Settings
import uuid
from datetime import datetime


class ProjectService(IProjectService):
    """Project service implementation"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        # TODO: Initialize database connection
        # In-memory storage (TODO: Replace with database)
        self._projects: Dict[str, Dict[str, Any]] = {}
        self._comments: Dict[str, List[Dict[str, Any]]] = {}
    
    async def create_project(
        self,
        project_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Create new project"""
        try:
            project_id = str(uuid.uuid4())
            project = {
                "project_id": project_id,
                **project_data,
                "created_at": datetime.now().isoformat()
            }
            self._projects[project_id] = project
            return Result.success(project)
        except Exception as e:
            return Result.failure(f"Error creating project: {str(e)}")
    
    async def get_project(
        self,
        project_id: str
    ) -> Result[Dict[str, Any], str]:
        """Get project by ID"""
        try:
            if project_id not in self._projects:
                return Result.failure(f"Project {project_id} not found")
            return Result.success(self._projects[project_id])
        except Exception as e:
            return Result.failure(f"Error getting project: {str(e)}")
    
    # Comments management
    async def create_comment(
        self,
        project_id: str,
        comment_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Create a new comment"""
        try:
            comment_id = str(uuid.uuid4())
            comment = {
                "id": comment_id,
                "project_id": project_id,
                **comment_data,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            if project_id not in self._comments:
                self._comments[project_id] = []
            
            self._comments[project_id].append(comment)
            return Result.success(comment)
        except Exception as e:
            return Result.failure(f"Error creating comment: {str(e)}")
    
    async def get_comments(
        self,
        project_id: str,
        element_id: Optional[str] = None
    ) -> Result[List[Dict[str, Any]], str]:
        """Get comments for a project or element"""
        try:
            comments = self._comments.get(project_id, [])
            
            if element_id:
                comments = [
                    c for c in comments
                    if c.get("element_id") == element_id
                ]
            
            return Result.success(comments)
        except Exception as e:
            return Result.failure(f"Error getting comments: {str(e)}")
    
    async def update_comment(
        self,
        project_id: str,
        comment_id: str,
        comment_data: Dict[str, Any]
    ) -> Result[Dict[str, Any], str]:
        """Update a comment"""
        try:
            if project_id not in self._comments:
                return Result.failure(f"No comments found for project {project_id}")
            
            for comment in self._comments[project_id]:
                if comment["id"] == comment_id:
                    comment.update(comment_data)
                    comment["updated_at"] = datetime.now().isoformat()
                    return Result.success(comment)
            
            return Result.failure(f"Comment {comment_id} not found")
        except Exception as e:
            return Result.failure(f"Error updating comment: {str(e)}")
    
    async def delete_comment(
        self,
        project_id: str,
        comment_id: str
    ) -> Result[bool, str]:
        """Delete a comment"""
        try:
            if project_id not in self._comments:
                return Result.failure(f"No comments found for project {project_id}")
            
            self._comments[project_id] = [
                c for c in self._comments[project_id]
                if c["id"] != comment_id
            ]
            return Result.success(True)
        except Exception as e:
            return Result.failure(f"Error deleting comment: {str(e)}")

