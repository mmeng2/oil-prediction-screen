"""
Auth API v1 routes.
"""

import logging

from api.deps import get_current_user
from fastapi import APIRouter, Depends
from models.auth import User
from schemas.auth import UserResponse
from schemas.common import APIResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=APIResponse[UserResponse])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    user_response = UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        last_login=current_user.last_login,
    )
    return APIResponse.success(data=user_response)
