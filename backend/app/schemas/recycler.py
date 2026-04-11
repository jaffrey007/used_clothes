from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class RecyclerOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    phone: str
    id_card: Optional[str] = None
    area: str
    status: int
    rating: Decimal
    order_count: int
    created_at: datetime


class RecyclerCreate(BaseModel):
    name: str
    phone: str
    id_card: Optional[str] = None
    area: str = ""
    status: int = 1


class RecyclerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    id_card: Optional[str] = None
    area: Optional[str] = None
    status: Optional[int] = None
    rating: Optional[Decimal] = None
