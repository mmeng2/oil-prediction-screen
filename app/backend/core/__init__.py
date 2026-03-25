"""
Core package for configuration and shared utilities.
"""

from core.config import settings
from core.exceptions import (
    AIServiceError,
    AuthenticationError,
    AuthorizationError,
    BusinessException,
    ConfigurationError,
    DatabaseError,
    NotFoundError,
    ValidationError,
)

__all__ = [
    "settings",
    "BusinessException",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ValidationError",
    "AIServiceError",
    "ConfigurationError",
    "DatabaseError",
]
