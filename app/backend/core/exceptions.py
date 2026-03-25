"""
Custom exceptions for the application.
"""

from typing import Any, Optional


class BusinessException(Exception):
    """Base exception for business logic errors."""

    def __init__(self, code: int = 1, message: str = "Business error", data: Optional[Any] = None):
        self.code = code
        self.message = message
        self.data = data
        super().__init__(self.message)


class AuthenticationError(BusinessException):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed", data: Optional[Any] = None):
        super().__init__(code=401, message=message, data=data)


class AuthorizationError(BusinessException):
    """Raised when user lacks required permissions."""

    def __init__(self, message: str = "Access denied", data: Optional[Any] = None):
        super().__init__(code=403, message=message, data=data)


class NotFoundError(BusinessException):
    """Raised when a resource is not found."""

    def __init__(self, message: str = "Resource not found", data: Optional[Any] = None):
        super().__init__(code=404, message=message, data=data)


class ValidationError(BusinessException):
    """Raised when input validation fails."""

    def __init__(self, message: str = "Validation error", data: Optional[Any] = None):
        super().__init__(code=422, message=message, data=data)


class AIServiceError(BusinessException):
    """Raised when AI service call fails."""

    def __init__(self, message: str = "AI service error", data: Optional[Any] = None):
        super().__init__(code=503, message=message, data=data)


class ConfigurationError(BusinessException):
    """Raised when configuration is invalid."""

    def __init__(self, message: str = "Configuration error", data: Optional[Any] = None):
        super().__init__(code=500, message=message, data=data)


class DatabaseError(BusinessException):
    """Raised when database operation fails."""

    def __init__(self, message: str = "Database error", data: Optional[Any] = None):
        super().__init__(code=500, message=message, data=data)
