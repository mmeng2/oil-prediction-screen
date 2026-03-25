"""
Common schemas for API responses.
"""

from typing import Any, Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Unified API response format."""

    code: int = Field(default=0, description="Response code. 0 means success.")
    message: str = Field(default="success", description="Response message.")
    data: Optional[T] = Field(default=None, description="Response data.")

    @classmethod
    def success(cls, data: Optional[T] = None, message: str = "success") -> "APIResponse[T]":
        """Create a success response."""
        return cls(code=0, message=message, data=data)

    @classmethod
    def error(cls, code: int = 1, message: str = "error", data: Optional[T] = None) -> "APIResponse[T]":
        """Create an error response."""
        return cls(code=code, message=message, data=data)


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response format."""

    items: list[T] = Field(..., description="List of items.")
    total: int = Field(..., description="Total number of items.")
    page: int = Field(default=1, description="Current page number.")
    page_size: int = Field(default=10, description="Number of items per page.")
    total_pages: int = Field(..., description="Total number of pages.")

    @classmethod
    def from_items(
        cls, items: list[T], total: int, page: int = 1, page_size: int = 10
    ) -> "PaginatedResponse[T]":
        """Create a paginated response from items."""
        total_pages = (total + page_size - 1) // page_size
        return cls(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(..., description="Health status.")
    version: Optional[str] = Field(default=None, description="Application version.")
    database: Optional[str] = Field(default=None, description="Database status.")
