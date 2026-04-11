from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.admin import Admin
from app.models.user import User
from app.models.order import Order, OrderCategory
from app.models.recycler import Recycler
from app.models.points import PointsRecord
from app.schemas.user import UserOut
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.schemas.recycler import RecyclerOut, RecyclerCreate, RecyclerUpdate
from app.schemas.common import Resp, PageResp
from app.utils.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ─── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=Resp[dict])
def dashboard(
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    today = datetime.now().date()
    week_ago = today - timedelta(days=6)

    total_orders = db.query(func.count(Order.id)).scalar()
    today_orders = db.query(func.count(Order.id)).filter(
        func.date(Order.created_at) == today
    ).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_weight = db.query(func.coalesce(func.sum(Order.actual_weight), 0)).filter(
        Order.status == 3
    ).scalar()

    # 7-day order trend
    trend_rows = (
        db.query(func.date(Order.created_at).label("day"), func.count(Order.id).label("cnt"))
        .filter(func.date(Order.created_at) >= week_ago)
        .group_by(func.date(Order.created_at))
        .all()
    )
    trend = {str(r.day): r.cnt for r in trend_rows}
    trend_days = []
    for i in range(7):
        d = str(week_ago + timedelta(days=i))
        trend_days.append({"date": d, "count": trend.get(d, 0)})

    # Category breakdown
    cat_rows = (
        db.query(OrderCategory.category, func.sum(OrderCategory.qty).label("total"))
        .group_by(OrderCategory.category)
        .all()
    )
    categories = [{"name": r.category, "value": int(r.total)} for r in cat_rows]

    # Status distribution
    status_rows = (
        db.query(Order.status, func.count(Order.id).label("cnt"))
        .group_by(Order.status)
        .all()
    )
    status_dist = {r.status: r.cnt for r in status_rows}

    return Resp.ok({
        "total_orders": total_orders,
        "today_orders": today_orders,
        "total_users": total_users,
        "total_weight": float(total_weight),
        "trend": trend_days,
        "categories": categories,
        "status_dist": status_dist,
    })


# ─── Orders ────────────────────────────────────────────────────────────────────

@router.get("/orders", response_model=PageResp[OrderOut])
def admin_list_orders(
    status: Optional[int] = Query(None),
    keyword: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    q = db.query(Order).options(joinedload(Order.categories))
    if status is not None:
        q = q.filter(Order.status == status)
    if keyword:
        q = q.filter(Order.order_no.contains(keyword))
    total = q.count()
    items = q.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PageResp(
        data=[OrderOut.model_validate(o) for o in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.put("/orders/{order_id}", response_model=Resp[OrderOut])
def admin_update_order(
    order_id: int,
    body: OrderStatusUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    order = db.query(Order).options(joinedload(Order.categories)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "订单不存在")

    order.status = body.status
    if body.recycler_id is not None:
        order.recycler_id = body.recycler_id
    if body.actual_weight is not None:
        order.actual_weight = body.actual_weight
        order.final_amount = body.actual_weight * order.unit_price
        # update recycler stats and user recycled kg
        if body.status == 3:
            user = db.get(User, order.user_id)
            if user:
                user.total_recycled_kg = float(user.total_recycled_kg) + float(body.actual_weight)
                pts = int(float(body.actual_weight) * 10)
                user.points += pts
                db.add(PointsRecord(
                    user_id=user.id,
                    order_id=order.id,
                    change_type="earn",
                    amount=pts,
                    balance_after=user.points,
                    note=f"订单{order.order_no}完成奖励",
                ))
            if order.recycler_id:
                recycler = db.get(Recycler, order.recycler_id)
                if recycler:
                    recycler.order_count += 1
    if body.cancel_reason:
        order.cancel_reason = body.cancel_reason

    db.commit()
    db.refresh(order)
    return Resp.ok(OrderOut.model_validate(order))


# ─── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=PageResp[UserOut])
def admin_list_users(
    keyword: Optional[str] = Query(None),
    status: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    q = db.query(User)
    if status is not None:
        q = q.filter(User.status == status)
    if keyword:
        q = q.filter(User.nickname.contains(keyword) | User.phone.contains(keyword))
    total = q.count()
    items = q.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PageResp(
        data=[UserOut.model_validate(u) for u in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.put("/users/{user_id}/status", response_model=Resp[UserOut])
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    user.status = 0 if user.status == 1 else 1
    db.commit()
    db.refresh(user)
    return Resp.ok(UserOut.model_validate(user))


# ─── Recyclers ─────────────────────────────────────────────────────────────────

@router.get("/recyclers", response_model=PageResp[RecyclerOut])
def admin_list_recyclers(
    keyword: Optional[str] = Query(None),
    status: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    q = db.query(Recycler)
    if status is not None:
        q = q.filter(Recycler.status == status)
    if keyword:
        q = q.filter(Recycler.name.contains(keyword) | Recycler.phone.contains(keyword))
    total = q.count()
    items = q.order_by(Recycler.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PageResp(
        data=[RecyclerOut.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/recyclers", response_model=Resp[RecyclerOut])
def create_recycler(
    body: RecyclerCreate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    r = Recycler(**body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return Resp.ok(RecyclerOut.model_validate(r))


@router.put("/recyclers/{recycler_id}", response_model=Resp[RecyclerOut])
def update_recycler(
    recycler_id: int,
    body: RecyclerUpdate,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    r = db.get(Recycler, recycler_id)
    if not r:
        raise HTTPException(404, "回收员不存在")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return Resp.ok(RecyclerOut.model_validate(r))


@router.delete("/recyclers/{recycler_id}", response_model=Resp[None])
def delete_recycler(
    recycler_id: int,
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    r = db.get(Recycler, recycler_id)
    if not r:
        raise HTTPException(404, "回收员不存在")
    db.delete(r)
    db.commit()
    return Resp.ok(msg="删除成功")


# ─── Statistics ────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=Resp[dict])
def stats(
    start: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: Admin = Depends(get_current_admin),
):
    q = db.query(Order)
    if start:
        q = q.filter(Order.created_at >= start)
    if end:
        q = q.filter(Order.created_at <= f"{end} 23:59:59")

    # Monthly order count
    monthly = (
        q.with_entities(
            func.date_format(Order.created_at, "%Y-%m").label("month"),
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.actual_weight), 0).label("weight"),
        )
        .group_by(func.date_format(Order.created_at, "%Y-%m"))
        .all()
    )

    # Category stats
    cat_q = db.query(
        OrderCategory.category,
        func.sum(OrderCategory.qty).label("qty"),
    ).join(Order, Order.id == OrderCategory.order_id)
    if start:
        cat_q = cat_q.filter(Order.created_at >= start)
    if end:
        cat_q = cat_q.filter(Order.created_at <= f"{end} 23:59:59")
    categories = cat_q.group_by(OrderCategory.category).all()

    return Resp.ok({
        "monthly": [
            {"month": r.month, "orders": r.orders, "weight": float(r.weight)}
            for r in monthly
        ],
        "categories": [{"name": r.category, "qty": int(r.qty)} for r in categories],
    })
