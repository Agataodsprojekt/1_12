#!/usr/bin/env python3
"""Quick test script to verify all services are running"""
import httpx
import asyncio
from typing import Dict, Any


SERVICES = {
    "API Gateway": "http://localhost:8000",
    "IFC Parser": "http://localhost:5001",
    "Calculation Engine": "http://localhost:5002",
    "Cost Calculator": "http://localhost:5003",
    "3D Data": "http://localhost:5004",
    "Database Manager": "http://localhost:5005",
}


async def test_service(name: str, url: str) -> Dict[str, Any]:
    """Test if service is running"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{url}/")
            return {
                "name": name,
                "status": "✅ OK" if response.status_code == 200 else f"⚠️ {response.status_code}",
                "url": url,
                "response": response.json() if response.status_code == 200 else None
            }
    except Exception as e:
        return {
            "name": name,
            "status": f"❌ ERROR: {str(e)}",
            "url": url,
            "response": None
        }


async def test_api_gateway_endpoints():
    """Test API Gateway endpoints"""
    gateway_url = "http://localhost:8000"
    
    tests = [
        ("GET /", {}),
        ("GET /health/", {}),
        ("POST /api/costs/calculate", {
            "elements": [{"global_id": "test-001", "type_name": "IfcBeam"}]
        }),
    ]
    
    print("\n🔍 Testing API Gateway endpoints:")
    print("-" * 60)
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for endpoint, data in tests:
            try:
                if data:
                    response = await client.post(f"{gateway_url}{endpoint}", json=data)
                else:
                    response = await client.get(f"{gateway_url}{endpoint}")
                
                status = "✅" if response.status_code < 400 else "❌"
                print(f"{status} {endpoint}: {response.status_code}")
                
                if response.status_code >= 400:
                    print(f"   Error: {response.text[:100]}")
            except Exception as e:
                print(f"❌ {endpoint}: ERROR - {str(e)}")


async def main():
    """Run all tests"""
    print("🧪 Testing IFC Construction Calculator Services\n")
    print("=" * 60)
    
    # Test all services
    print("\n📡 Checking if all services are running:")
    print("-" * 60)
    
    results = await asyncio.gather(*[
        test_service(name, url) for name, url in SERVICES.items()
    ])
    
    for result in results:
        print(f"{result['status']} {result['name']:20} - {result['url']}")
        if result['response']:
            print(f"   Response: {result['response'].get('message', 'OK')}")
    
    # Test API Gateway endpoints
    await test_api_gateway_endpoints()
    
    print("\n" + "=" * 60)
    print("✅ Testing complete!")
    print("\n💡 Tip: Use Swagger docs at http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(main())

