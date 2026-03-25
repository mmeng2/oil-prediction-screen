"""
API v1 package exports.
"""

from api.v1.aihub import router as aihub_router
from api.v1.auth import router as auth_router
from api.v1.health import router as health_router
from api.v1.settings import router as settings_router
from api.v1.user import router as user_router

__all__ = [
    "aihub_router",
    "auth_router",
    "health_router",
    "settings_router",
    "user_router",
]
