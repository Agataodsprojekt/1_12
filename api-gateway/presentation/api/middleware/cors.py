"""CORS middleware"""
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from infrastructure.config.settings import Settings


def setup_cors(app: FastAPI, settings: Settings):
    """Setup CORS middleware"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

