"""Gateway router - routes requests to microservices"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from application.container import Container

# Singleton container instance
_container = None

def get_container() -> Container:
    """Get or create container instance"""
    global _container
    if _container is None:
        _container = Container()
        # Note: from_env() is optional - Settings will load from environment automatically
    return _container

router = APIRouter(prefix="/api", tags=["API Gateway"])


class RouteRequest(BaseModel):
    """Request model for routing"""
    service: str
    endpoint: str
    method: str = "GET"
    data: Optional[Dict[str, Any]] = None


class AggregateRequest(BaseModel):
    """Request model for aggregating multiple service calls"""
    requests: List[RouteRequest]


# ========== Direct Service Endpoints (easier to use) ==========

# IFC Parser Service
@router.post("/ifc/parse")
async def parse_ifc(
    file: UploadFile = File(...),
    calculate_costs: bool = True,  # Automatyczne obliczanie kosztów
    price_list_id: Optional[str] = None,  # Opcjonalny cennik
    container: Container = Depends(get_container)
):
    """Parse IFC file and optionally calculate costs
    
    Args:
        file: IFC file to parse
        calculate_costs: If True, automatically calculate costs after parsing
        price_list_id: Optional price list ID for cost calculation
    """
    import httpx
    settings = container.settings()
    
    # Read file content
    content = await file.read()
    files = {"file": (file.filename, content, file.content_type)}
    
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            # 1. Parse IFC file
            parse_response = await client.post(
                f"{settings.ifc_parser_url}/api/ifc/parse",
                files=files
            )
            parse_response.raise_for_status()
            parse_data = parse_response.json()
            
            # IFC parser service returns {"elements": [...]}, extract the array
            elements = parse_data.get("elements", []) if isinstance(parse_data, dict) else (parse_data if isinstance(parse_data, list) else [])
            
            # 2. Calculate costs if requested
            costs = None
            if calculate_costs and elements:
                try:
                    cost_response = await client.post(
                        f"{settings.cost_calculator_url}/api/costs/calculate",
                        json={
                            "elements": elements,
                            "price_list_id": price_list_id
                        },
                        timeout=120.0
                    )
                    if cost_response.status_code == 200:
                        costs = cost_response.json()
                    else:
                        # Don't fail if cost calculation fails, just log
                        print(f"Cost calculation failed: {cost_response.status_code}")
                except Exception as e:
                    # Don't fail parsing if cost calculation fails
                    print(f"Cost calculation error (non-fatal): {str(e)}")
            
            return {
                "elements": elements,
                "costs": costs,
                "element_count": len(elements) if isinstance(elements, list) else 0,
                "costs_calculated": costs is not None
            }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error parsing IFC file: {str(e)}")


@router.get("/ifc/elements")
async def get_elements(
    container: Container = Depends(get_container)
):
    """Get parsed elements"""
    orchestration = container.orchestration_service()
    result = await orchestration.route_request(
        service_name="ifc-parser",
        endpoint="/api/ifc/elements",
        method="GET"
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


# Calculation Engine Service
class StaticCalculationRequest(BaseModel):
    """Request for static calculation"""
    elements: List[Dict[str, Any]]
    loads: Dict[str, Any] = {}


@router.post("/calculations/static")
async def calculate_static(
    request: StaticCalculationRequest,
    container: Container = Depends(get_container)
):
    """Perform static analysis calculation"""
    orchestration = container.orchestration_service()
    result = await orchestration.route_request(
        service_name="calculation-engine",
        endpoint="/api/calculations/static",
        method="POST",
        data={"elements": request.elements, "loads": request.loads}
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.post("/calculations/strength")
async def calculate_strength(
    request: StaticCalculationRequest,
    container: Container = Depends(get_container)
):
    """Perform strength analysis"""
    orchestration = container.orchestration_service()
    result = await orchestration.route_request(
        service_name="calculation-engine",
        endpoint="/api/calculations/strength",
        method="POST",
        data={"elements": request.elements}
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


# Cost Calculator Service
class CostCalculationRequest(BaseModel):
    """Request for cost calculation"""
    elements: List[Dict[str, Any]]
    price_list_id: Optional[str] = None


@router.post("/costs/calculate")
async def calculate_costs(
    request: CostCalculationRequest,
    container: Container = Depends(get_container)
):
    """Calculate costs for elements"""
    orchestration = container.orchestration_service()
    result = await orchestration.route_request(
        service_name="cost-calculator",
        endpoint="/api/costs/calculate",
        method="POST",
        data={"elements": request.elements, "price_list_id": request.price_list_id}
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


# 3D Data Service
class VisualizationRequest(BaseModel):
    """Request for 3D visualization"""
    elements: List[Dict[str, Any]]
    options: Dict[str, Any] = {}


@router.post("/visualization/scene")
async def generate_scene(
    request: VisualizationRequest,
    container: Container = Depends(get_container)
):
    """Generate 3D scene data for Three.js"""
    orchestration = container.orchestration_service()
    result = await orchestration.route_request(
        service_name="3d-data",
        endpoint="/api/visualization/scene",
        method="POST",
        data={"elements": request.elements, "options": request.options}
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


# Database Manager Service
@router.post("/projects")
async def create_project(
    project_data: Dict[str, Any],
    container: Container = Depends(get_container)
):
    """Create new project"""
    orchestration = container.orchestration_service()
    result = await orchestration.route_request(
        service_name="db-manager",
        endpoint="/api/projects",
        method="POST",
        data=project_data
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    container: Container = Depends(get_container)
):
    """Get project by ID"""
    orchestration = container.orchestration_service()
    result = await orchestration.route_request(
        service_name="db-manager",
        endpoint=f"/api/projects/{project_id}",
        method="GET"
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


# ========== Generic Routing (for advanced use) ==========
@router.post("/gateway/route")
async def route_to_service(
    request: RouteRequest,
    container: Container = Depends(get_container)
):
    """Route request to microservice - generic endpoint"""
    orchestration = container.orchestration_service()
    
    result = await orchestration.route_request(
        service_name=request.service,
        endpoint=request.endpoint,
        method=request.method,
        data=request.data
    )
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


@router.post("/gateway/aggregate")
async def aggregate_requests(
    request: AggregateRequest,
    container: Container = Depends(get_container)
):
    """Aggregate multiple service requests"""
    orchestration = container.orchestration_service()
    
    requests_list = [
        {
            "service": req.service,
            "endpoint": req.endpoint,
            "method": req.method,
            "data": req.data
        }
        for req in request.requests
    ]
    
    result = await orchestration.aggregate_responses(requests_list)
    
    if result.is_failure:
        raise HTTPException(status_code=500, detail=result.error)
    
    return result.value


# ========== Automatic Proxy for New Endpoints ==========
# Proxy all requests to microservices based on path prefix

@router.api_route("/visualization/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_visualization(
    path: str,
    request: Request,
    container: Container = Depends(get_container)
):
    """Proxy requests to 3D Data Service"""
    import httpx
    import json
    settings = container.settings()
    
    method = request.method
    params = dict(request.query_params)
    
    # Get body for POST/PUT/PATCH
    body = None
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body_bytes = await request.body()
            if body_bytes:
                body = json.loads(body_bytes)
        except:
            body = None
    
    url = f"{settings.data_3d_url}/api/visualization/{path}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(url, params=params)
            elif method == "POST":
                response = await client.post(url, json=body, params=params)
            elif method == "PUT":
                response = await client.put(url, json=body, params=params)
            elif method == "DELETE":
                response = await client.delete(url, params=params)
            elif method == "PATCH":
                response = await client.patch(url, json=body, params=params)
            else:
                raise HTTPException(status_code=405, detail=f"Method {method} not allowed")
            
            # For DELETE, 404 is acceptable (idempotent delete)
            if method == "DELETE" and response.status_code == 404:
                return {"success": True, "message": "View not found (already deleted or never existed)"}
            
            response.raise_for_status()
            
            # Handle empty response for DELETE
            if method == "DELETE" and response.status_code == 200:
                try:
                    return response.json()
                except:
                    return {"success": True}
            
            return response.json()
    except httpx.HTTPStatusError as e:
        # For DELETE, 404 is acceptable
        if method == "DELETE" and e.response.status_code == 404:
            return {"success": True, "message": "View not found (already deleted or never existed)"}
        raise HTTPException(status_code=e.response.status_code, detail=f"Error proxying to 3D Data Service: {str(e)}")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error proxying to 3D Data Service: {str(e)}")


@router.api_route("/projects/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_projects(
    path: str,
    request: Request,
    container: Container = Depends(get_container)
):
    """Proxy requests to Database Manager Service"""
    import httpx
    import json
    settings = container.settings()
    
    method = request.method
    params = dict(request.query_params)
    
    # Get body for POST/PUT/PATCH
    body = None
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body_bytes = await request.body()
            if body_bytes:
                body = json.loads(body_bytes)
        except:
            body = None
    
    url = f"{settings.db_manager_url}/api/projects/{path}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(url, params=params)
            elif method == "POST":
                response = await client.post(url, json=body, params=params)
            elif method == "PUT":
                response = await client.put(url, json=body, params=params)
            elif method == "DELETE":
                response = await client.delete(url, params=params)
            elif method == "PATCH":
                response = await client.patch(url, json=body, params=params)
            else:
                raise HTTPException(status_code=405, detail=f"Method {method} not allowed")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error proxying to Database Manager Service: {str(e)}")


@router.api_route("/calculations/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_calculations(
    path: str,
    request: Request,
    container: Container = Depends(get_container)
):
    """Proxy requests to Calculation Engine Service"""
    import httpx
    import json
    settings = container.settings()
    
    method = request.method
    params = dict(request.query_params)
    
    # Get body for POST/PUT/PATCH
    body = None
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body_bytes = await request.body()
            if body_bytes:
                body = json.loads(body_bytes)
        except:
            body = None
    
    url = f"{settings.calculation_engine_url}/api/calculations/{path}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(url, params=params)
            elif method == "POST":
                response = await client.post(url, json=body, params=params)
            elif method == "PUT":
                response = await client.put(url, json=body, params=params)
            elif method == "DELETE":
                response = await client.delete(url, params=params)
            elif method == "PATCH":
                response = await client.patch(url, json=body, params=params)
            else:
                raise HTTPException(status_code=405, detail=f"Method {method} not allowed")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error proxying to Calculation Engine Service: {str(e)}")


@router.api_route("/ifc/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_ifc(
    path: str,
    request: Request,
    container: Container = Depends(get_container)
):
    """Proxy requests to IFC Parser Service (for search/filter endpoints)"""
    import httpx
    import json
    settings = container.settings()
    
    method = request.method
    params = dict(request.query_params)
    
    # Get body for POST/PUT/PATCH
    body = None
    if method in ["POST", "PUT", "PATCH"]:
        try:
            body_bytes = await request.body()
            if body_bytes:
                body = json.loads(body_bytes)
        except:
            body = None
    
    url = f"{settings.ifc_parser_url}/api/ifc/{path}"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(url, params=params)
            elif method == "POST":
                response = await client.post(url, json=body, params=params)
            elif method == "PUT":
                response = await client.put(url, json=body, params=params)
            elif method == "DELETE":
                response = await client.delete(url, params=params)
            elif method == "PATCH":
                response = await client.patch(url, json=body, params=params)
            else:
                raise HTTPException(status_code=405, detail=f"Method {method} not allowed")
            
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Error proxying to IFC Parser Service: {str(e)}")

