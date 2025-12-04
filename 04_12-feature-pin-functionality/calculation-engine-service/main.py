"""Calculation Engine Service - Main entry point"""
from fastapi import FastAPI
from application.container import Container
from presentation.api.routers import calculations
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Calculation Engine Service", version="1.0.0")
container = Container()
# Note: from_env() is optional - Settings will load from environment automatically via pydantic-settings

# Include routers
app.include_router(calculations.router)

@app.get("/")
async def root():
    return {"message": "Calculation Engine Service", "version": "1.0.0", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    settings = container.settings()
    uvicorn.run("main:app", host=settings.api_host, port=settings.api_port, reload=True)

