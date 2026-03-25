"""
User API v1 routes.
"""

import logging

from api.deps import get_admin_user
from fastapi import APIRouter, Depends, HTTPException
from models.auth import User
from repositories.user import UserRepository
from schemas.common import APIResponse, PaginatedResponse
from schemas.auth import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=APIResponse[PaginatedResponse[UserResponse]])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_admin_user),
    user_repo: UserRepository = Depends(),
):
    """List all users (admin only)."""
    try:
        users = await user_repo.list(skip=skip, limit=limit)
        total = await user_repo.count()

        user_responses = [
            UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                last_login=user.last_login,
            )
            for user in users
        ]

        paginated = PaginatedResponse.from_items(
            items=user_responses,
            total=total,
            page=(skip // limit) + 1,
            page_size=limit,
        )

        return APIResponse.success(data=paginated)
    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")


@router.get("/{user_id}", response_model=APIResponse[UserResponse])
async def get_user(
    user_id: str,
    current_user: User = Depends(get_admin_user),
    user_repo: UserRepository = Depends(),
):
    """Get user by ID (admin only)."""
    try:
        user = await user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_response = UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            last_login=user.last_login,
        )

        return APIResponse.success(data=user_response)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")
