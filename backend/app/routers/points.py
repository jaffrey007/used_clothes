from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.points import PointsRecord
from app.schemas.points import PointsRecordOut, PointsSummary
from app.schemas.common import Resp
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/points", tags=["points"])


@router.get("", response_model=Resp[PointsSummary])
def get_points(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(PointsRecord)
        .filter(PointsRecord.user_id == current_user.id)
        .order_by(PointsRecord.created_at.desc())
        .limit(50)
        .all()
    )
    total_earned = sum(r.amount for r in records if r.amount > 0)
    return Resp.ok(
        PointsSummary(
            balance=current_user.points,
            total_earned=total_earned,
            records=[PointsRecordOut.model_validate(r) for r in records],
        )
    )
