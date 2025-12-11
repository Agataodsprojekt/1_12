"""Calculation router"""
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

router = APIRouter(prefix="/api/calculations", tags=["Calculations"])


class CalculationRequest(BaseModel):
    """Request model for calculations"""
    elements: List[Dict[str, Any]]
    loads: Dict[str, Any] = {}
    constraints: Dict[str, Any] = {}


class DimensionRequest(BaseModel):
    """Request model for dimension calculation"""
    point1: Dict[str, float]
    point2: Dict[str, float]
    project_id: str


class VolumeRequest(BaseModel):
    """Request model for volume calculation"""
    points: List[Dict[str, float]]
    project_id: str


@router.post("/static")
async def calculate_static(
    request: CalculationRequest,
    container: Container = Depends(get_container)
):
    """Perform static analysis calculation"""
    calculation_service = container.calculation_service()
    
    result = await calculation_service.calculate_static_analysis(
        elements=request.elements
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.post("/strength")
async def calculate_strength(
    request: CalculationRequest,
    container: Container = Depends(get_container)
):
    """Perform strength analysis calculation"""
    calculation_service = container.calculation_service()
    
    result = await calculation_service.calculate_strength_analysis(
        elements=request.elements
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


# Measurements endpoints
@router.post("/dimensions")
async def calculate_dimension(
    request: DimensionRequest,
    container: Container = Depends(get_container)
):
    """Calculate dimension between two points"""
    calculation_service = container.calculation_service()
    
    result = await calculation_service.calculate_dimension(
        point1=request.point1,
        point2=request.point2,
        project_id=request.project_id
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.post("/volume")
async def calculate_volume(
    request: VolumeRequest,
    container: Container = Depends(get_container)
):
    """Calculate volume from points"""
    calculation_service = container.calculation_service()
    
    result = await calculation_service.calculate_volume(
        points=request.points,
        project_id=request.project_id
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.get("/measurements/{project_id}")
async def get_measurements(
    project_id: str,
    container: Container = Depends(get_container)
):
    """Get all measurements for a project"""
    calculation_service = container.calculation_service()
    
    result = await calculation_service.get_measurements(project_id)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return {"measurements": result.value}


@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "service": "calculation-engine-service"}

