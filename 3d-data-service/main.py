"""3D Data Service - Main entry point"""
from fastapi import FastAPI
from application.container import Container
from presentation.api.routers import visualization
import logging

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="3D Data Service", version="1.0.0")
container = Container()
# Note: from_env() is optional - Settings will load from environment automatically via pydantic-settings

# Include routers
app.include_router(visualization.router)

@app.get("/")
async def root():
    return {"message": "3D Data Service", "version": "1.0.0", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    settings = container.settings()
    uvicorn.run("main:app", host=settings.api_host, port=settings.api_port, reload=True)

