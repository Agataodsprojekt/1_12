"""IFC Parser Service - Main entry point"""
from fastapi import FastAPI
from application.container import Container
from presentation.api.routers import ifc
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
    title="IFC Parser Service",
    description="Service for parsing IFC files",
    version="1.0.0"
)

# Initialize container
container = Container()
# Note: from_env() is optional - Settings will load from environment automatically via pydantic-settings

# Include routers
app.include_router(ifc.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "IFC Parser Service",
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    settings = container.settings()
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )

