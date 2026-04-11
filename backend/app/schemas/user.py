from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    openid: str
    nickname: str
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    points: int
    total_recycled_kg: Decimal
    status: int
    created_at: datetime


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None


class AddressOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    contact_name: str
    phone: str
    province: str
    city: str
    district: str
    detail: str
    is_default: int
    created_at: datetime


class AddressCreate(BaseModel):
    contact_name: str
    phone: str
    province: str
    city: str
    district: str = ""
    detail: str
    is_default: int = 0


class AddressUpdate(BaseModel):
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    detail: Optional[str] = None
    is_default: Optional[int] = None
