from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class PointsRecordOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    order_id: Optional[int] = None
    change_type: str
    amount: int
    balance_after: int
    note: Optional[str] = None
    created_at: datetime


class PointsSummary(BaseModel):
    balance: int
    total_earned: int
    records: List[PointsRecordOut]
