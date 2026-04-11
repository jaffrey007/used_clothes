from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, DateTime, SmallInteger, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    openid: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    nickname: Mapped[str] = mapped_column(String(64), nullable=False, default="用户")
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    points: Mapped[int] = mapped_column(nullable=False, default=0)
    total_recycled_kg: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=Decimal("0.00")
    )
    status: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    addresses: Mapped[List["Address"]] = relationship(  # type: ignore[name-defined]
        "Address", back_populates="user", cascade="all, delete-orphan"
    )
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="user")  # type: ignore[name-defined]
    points_records: Mapped[List["PointsRecord"]] = relationship(  # type: ignore[name-defined]
        "PointsRecord", back_populates="user"
    )
