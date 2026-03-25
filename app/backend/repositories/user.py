"""
User repository for database operations.
"""

from typing import Optional

from sqlalchemy import select

from models.auth import User
from repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model operations."""

    def __init__(self, db):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID."""
        return await self.get(user_id)

    async def update_last_login(self, user_id: str) -> Optional[User]:
        """Update user's last login timestamp."""
        from datetime import datetime

        from sqlalchemy import func

        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            user.last_login = datetime.utcnow()
            await self.db.flush()
            await self.db.refresh(user)
        
        return user

    async def get_admin_users(self) -> list[User]:
        """Get all admin users."""
        result = await self.db.execute(select(User).where(User.role == "admin"))
        return list(result.scalars().all())
