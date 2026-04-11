from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class CategoryItem(BaseModel):
    category: str
    qty: int = 1


class CategoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    category: str
    qty: int


class OrderCreate(BaseModel):
    address_id: int
    scheduled_time: datetime
    estimated_weight: int = 0
    categories: List[CategoryItem] = []
    notes: Optional[str] = None


class OrderOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    order_no: str
    user_id: int
    recycler_id: Optional[int] = None
    address_id: Optional[int] = None
    addr_contact: Optional[str] = None
    addr_phone: Optional[str] = None
    addr_full: Optional[str] = None
    scheduled_time: datetime
    estimated_weight: int
    actual_weight: Optional[Decimal] = None
    unit_price: Decimal
    final_amount: Optional[Decimal] = None
    status: int
    notes: Optional[str] = None
    cancel_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    categories: List[CategoryOut] = []


class OrderCancel(BaseModel):
    cancel_reason: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: int
    actual_weight: Optional[Decimal] = None
    recycler_id: Optional[int] = None
    cancel_reason: Optional[str] = None
