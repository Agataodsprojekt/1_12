"""IFC parser router"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
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


@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "service": "ifc-parser-service"}
