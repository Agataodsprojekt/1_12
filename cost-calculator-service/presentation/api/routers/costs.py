"""Cost calculation router"""
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

router = APIRouter(prefix="/api/costs", tags=["Costs"])


class CostCalculationRequest(BaseModel):
    """Request model for cost calculation"""
    elements: List[Dict[str, Any]]
    price_list_id: str = "default"


@router.post("/calculate")
async def calculate_costs(
    request: CostCalculationRequest,
    container: Container = Depends(get_container)
):
    """Calculate costs for elements"""
    cost_service = container.cost_service()
    
    result = await cost_service.calculate_costs(
        elements=request.elements
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.get("/health")
async def health_check():
    """Health check"""
    return {"status": "healthy", "service": "cost-calculator-service"}

