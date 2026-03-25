"""
Base repository with common CRUD operations.
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Base repository with common database operations."""

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        """
        Initialize repository.

        Args:
            model: SQLAlchemy model class
            db: Async database session
        """
        self.model = model
        self.db = db

    async def get(self, id: Any) -> Optional[ModelType]:
        """Get a single record by ID."""
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_by_field(self, field: str, value: Any) -> Optional[ModelType]:
        """Get a single record by field."""
        result = await self.db.execute(select(self.model).where(getattr(self.model, field) == value))
        return result.scalar_one_or_none()

    async def list(
        self, skip: int = 0, limit: int = 100, order_by: Optional[str] = None, **filters
    ) -> List[ModelType]:
        """List records with pagination and filters."""
        query = select(self.model)

        for field, value in filters.items():
            if value is not None:
                query = query.where(getattr(self.model, field) == value)

        if order_by:
            query = query.order_by(getattr(self.model, order_by))

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, **filters) -> int:
        """Count records with optional filters."""
        from sqlalchemy import func

        query = select(func.count(self.model.id))
        for field, value in filters.items():
            if value is not None:
                query = query.where(getattr(self.model, field) == value)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, attributes: Dict[str, Any]) -> ModelType:
        """Create a new record."""
        obj = self.model(**attributes)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, id: Any, attributes: Dict[str, Any]) -> Optional[ModelType]:
        """Update a record by ID."""
        obj = await self.get(id)
        if not obj:
            return None

        for field, value in attributes.items():
            if hasattr(obj, field):
                setattr(obj, field, value)

        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, id: Any) -> bool:
        """Delete a record by ID."""
        obj = await self.get(id)
        if not obj:
            return False

        await self.db.delete(obj)
        await self.db.flush()
        return True

    async def exists(self, id: Any) -> bool:
        """Check if a record exists."""
        obj = await self.get(id)
        return obj is not None
