"""IFC parser router"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List, Dict, Any
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

router = APIRouter(prefix="/api/ifc", tags=["IFC"])


class SearchRequest(BaseModel):
    """Request model for element search"""
    query: str
    elements: List[Dict[str, Any]] = []


class FilterRequest(BaseModel):
    """Request model for element filtering"""
    filters: Dict[str, Any]
    elements: List[Dict[str, Any]] = []


@router.post("/parse")
async def parse_ifc_file(
    file: UploadFile = File(...),
    container: Container = Depends(get_container)
):
    """Parse IFC file"""
    import tempfile
    import os
    
    parser_service = container.ifc_parser_service()
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".ifc") as tmp_file:
        content = await file.read()
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    try:
        # Parse file
        result = await parser_service.parse_file(tmp_path)
        
        if result.is_failure:
            raise HTTPException(status_code=400, detail=result.error)
        
        # Convert domain entities to dictionaries for JSON response
        elements = result.value
        elements_dict = []
        
        for element in elements:
            element_dict = {
                "global_id": element.global_id,
                "type_name": element.type_name,
                "name": element.name,
                "properties": element.properties,
                "placement_matrix": element.placement_matrix if element.placement_matrix else None
            }
            
            # Extract position from placement_matrix for easier access
            if element.placement_matrix and len(element.placement_matrix) >= 12:
                element_dict["position"] = [
                    element.placement_matrix[3],
                    element.placement_matrix[7],
                    element.placement_matrix[11]
                ]
            else:
                element_dict["position"] = [0.0, 0.0, 0.0]
            
            elements_dict.append(element_dict)
        
        return {"elements": elements_dict}
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.get("/elements")
async def get_elements():
    """Get parsed elements"""
    return {
        "elements": [],
        "message": "No elements parsed yet. Upload an IFC file first."
    }


# Search and filter endpoints
@router.post("/search")
async def search_elements(
    request: SearchRequest,
    container: Container = Depends(get_container)
):
    """Search elements by query string"""
    from domain.entities.ifc_element import IfcElement
    
    parser_service = container.ifc_parser_service()
    
    # Convert dicts to IfcElement objects
    element_objects = []
    for elem_dict in request.elements:
        element = IfcElement(
            global_id=elem_dict.get("global_id", ""),
            type_name=elem_dict.get("type_name", ""),
            name=elem_dict.get("name", ""),
            properties=elem_dict.get("properties", {}),
            placement_matrix=elem_dict.get("placement_matrix")
        )
        element_objects.append(element)
    
    result = await parser_service.search_elements(request.query, element_objects)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return {"elements": result.value}


@router.get("/elements/{element_id}")
async def get_element(
    element_id: str,
    container: Container = Depends(get_container)
):
    """Get element details by ID"""
    # Note: This endpoint requires elements to be provided via POST body
    # For now, return a placeholder
    return {
        "message": "Use POST /api/ifc/search or /api/ifc/filter with element_id in query",
        "element_id": element_id
    }


@router.post("/filter")
async def filter_elements(
    request: FilterRequest,
    container: Container = Depends(get_container)
):
    """Filter elements by criteria"""
    from domain.entities.ifc_element import IfcElement
    
    parser_service = container.ifc_parser_service()
    
    # Convert dicts to IfcElement objects
    element_objects = []
    for elem_dict in request.elements:
        element = IfcElement(
            global_id=elem_dict.get("global_id", ""),
            type_name=elem_dict.get("type_name", ""),
            name=elem_dict.get("name", ""),
            properties=elem_dict.get("properties", {}),
            placement_matrix=elem_dict.get("placement_matrix")
        )
        element_objects.append(element)
    
    result = await parser_service.filter_elements(request.filters, element_objects)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return {"elements": result.value}


@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "service": "ifc-parser-service"}
