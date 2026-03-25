"""
API dependencies for dependency injection.
"""

from typing import AsyncGenerator

from core.exceptions import AuthenticationError, AuthorizationError
from dependencies.auth import get_current_user as auth_get_current_user
from dependencies.database import DbSession
from fastapi import Depends, Request
from models.auth import User
from repositories.user import UserRepository
from sqlalchemy.ext.asyncio import AsyncSession


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    yield DbSession


async def get_user_repository(db: DbSession) -> UserRepository:
    """Get user repository."""
    return UserRepository(db)


async def get_current_user(
    request: Request,
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    """Get current authenticated user."""
    try:
        return await auth_get_current_user(request, user_repo)
    except Exception as e:
        raise AuthenticationError(f"Authentication failed: {str(e)}")


async def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current admin user."""
    if current_user.role != "admin":
        raise AuthorizationError("Admin access required")
    return current_user
