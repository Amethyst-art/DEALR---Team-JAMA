"""SQLAlchemy 2.0 declarative base for all ORM models."""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass


class Base(DeclarativeBase):
    """Base class for all DEALR ORM models.

    Uses SQLAlchemy 2.0 mapped_column style throughout.
    """
