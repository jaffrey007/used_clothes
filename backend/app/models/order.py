from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, DateTime, SmallInteger, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_no: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    recycler_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("recyclers.id", ondelete="SET NULL"), nullable=True
    )
    address_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("addresses.id", ondelete="SET NULL"), nullable=True
    )
    addr_contact: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    addr_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    addr_full: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    estimated_weight: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    actual_weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.80")
    )
    final_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 2), nullable=True)
    status: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    notes: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    cancel_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    proof_images: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True, comment="JSON数组")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="orders")  # type: ignore[name-defined]
    recycler: Mapped[Optional["Recycler"]] = relationship("Recycler", back_populates="orders")  # type: ignore[name-defined]
    categories: Mapped[List["OrderCategory"]] = relationship(
        "OrderCategory", back_populates="order", cascade="all, delete-orphan"
    )


class OrderCategory(Base):
    __tablename__ = "order_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    category: Mapped[str] = mapped_column(String(16), nullable=False)
    qty: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    order: Mapped["Order"] = relationship("Order", back_populates="categories")
