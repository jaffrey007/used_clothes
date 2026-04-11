from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, DateTime, SmallInteger, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Recycler(Base):
    __tablename__ = "recyclers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    id_card: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    area: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    status: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    rating: Mapped[Decimal] = mapped_column(
        Numeric(2, 1), nullable=False, default=Decimal("5.0")
    )
    order_count: Mapped[int] = mapped_column(nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    orders: Mapped[List["Order"]] = relationship("Order", back_populates="recycler")  # type: ignore[name-defined]
