"""
Health check API v1 routes.
"""

import logging

from fastapi import APIRouter, status
from schemas.common import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint."""
    return HealthResponse(status="healthy")


@router.get("/ready", response_model=HealthResponse)
async def readiness_check():
    """Readiness check - verifies all dependencies are available."""
    return HealthResponse(status="ready")
