"""Orchestration service implementation"""
import httpx
from typing import Any, Dict, List
from domain.interfaces.orchestration_service import IOrchestrationService
from ifc_common import Result
from infrastructure.config.settings import Settings


class OrchestrationService(IOrchestrationService):
    """Orchestration service - routes requests to microservices"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.service_urls = {
            "ifc-parser": settings.ifc_parser_url,
            "calculation-engine": settings.calculation_engine_url,
            "cost-calculator": settings.cost_calculator_url,
            "3d-data": settings.data_3d_url,
            "db-manager": settings.db_manager_url,
        }
    
    async def route_request(
        self,
        service_name: str,
        endpoint: str,
        method: str,
        data: Dict[str, Any] = None
    ) -> Result[Dict[str, Any], str]:
        """Route request to appropriate microservice"""
        if service_name not in self.service_urls:
            return Result.failure(f"Unknown service: {service_name}")
        
        base_url = self.service_urls[service_name]
        url = f"{base_url}{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if method.upper() == "GET":
                    response = await client.get(url, params=data)
                elif method.upper() == "POST":
                    response = await client.post(url, json=data)
                elif method.upper() == "PUT":
                    response = await client.put(url, json=data)
                elif method.upper() == "DELETE":
                    response = await client.delete(url)
                else:
                    return Result.failure(f"Unsupported method: {method}")
                
                response.raise_for_status()
                return Result.success(response.json())
        
        except httpx.HTTPError as e:
            return Result.failure(f"HTTP error: {str(e)}")
        except Exception as e:
            return Result.failure(f"Error routing request: {str(e)}")
    
    async def aggregate_responses(
        self,
        requests: List[Dict[str, Any]]
    ) -> Result[Dict[str, Any], str]:
        """Aggregate responses from multiple microservices"""
        results = {}
        errors = []
        
        for request in requests:
            result = await self.route_request(
                service_name=request["service"],
                endpoint=request["endpoint"],
                method=request.get("method", "GET"),
                data=request.get("data")
            )
            
            if result.is_success:
                results[request["service"]] = result.value
            else:
                errors.append(f"{request['service']}: {result.error}")
        
        if errors:
            return Result.failure(f"Some requests failed: {', '.join(errors)}")
        
        return Result.success(results)

