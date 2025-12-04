"""API Gateway - Main entry point"""
from fastapi import FastAPI
from application.container import Container
from presentation.api.routers import health, gateway
from presentation.api.middleware.cors import setup_cors
from infrastructure.config.settings import Settings
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="IFC Construction Calculator - API Gateway",
    description="API Gateway for IFC Construction Calculator microservices",
    version="1.0.0"
)

# Initialize container
container = Container()
# Note: from_env() is optional - Settings will load from environment automatically via pydantic-settings

# Setup CORS
settings = container.settings()
setup_cors(app, settings)

# Include routers
app.include_router(health.router)
app.include_router(gateway.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "IFC Construction Calculator API Gateway",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )

