from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.user import User
from app.models.order import Order, OrderCategory
from app.models.address import Address
from app.schemas.order import OrderCreate, OrderOut, OrderCancel
from app.schemas.common import Resp, PageResp
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/orders", tags=["orders"])

STATUS_LABELS = {0: "待接单", 1: "已接单", 2: "回收中", 3: "已完成", 4: "已取消"}


def _gen_order_no() -> str:
    import random
    now = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"MX{now}{random.randint(100, 999)}"


def _load_orders(db: Session, user_id: int, status: Optional[int], page: int, page_size: int):
    q = (
        db.query(Order)
        .options(joinedload(Order.categories))
        .filter(Order.user_id == user_id)
    )
    if status is not None:
        q = q.filter(Order.status == status)
    total = q.count()
    items = q.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return total, items


@router.get("", response_model=PageResp[OrderOut])
def list_orders(
    status: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total, items = _load_orders(db, current_user.id, status, page, page_size)
    return PageResp(
        data=[OrderOut.model_validate(o) for o in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=Resp[OrderOut])
def create_order(
    body: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = db.query(Address).filter(
        Address.id == body.address_id, Address.user_id == current_user.id
    ).first()
    if not addr:
        raise HTTPException(404, "地址不存在")

    order = Order(
        order_no=_gen_order_no(),
        user_id=current_user.id,
        address_id=addr.id,
        addr_contact=addr.contact_name,
        addr_phone=addr.phone,
        addr_full=f"{addr.province}{addr.city}{addr.district}{addr.detail}",
        scheduled_time=body.scheduled_time,
        estimated_weight=body.estimated_weight,
        notes=body.notes,
    )
    db.add(order)
    db.flush()
    for cat in body.categories:
        db.add(OrderCategory(order_id=order.id, category=cat.category, qty=cat.qty))
    db.commit()
    db.refresh(order)
    return Resp.ok(OrderOut.model_validate(order))


@router.get("/{order_id}", response_model=Resp[OrderOut])
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .options(joinedload(Order.categories))
        .filter(Order.id == order_id, Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(404, "订单不存在")
    return Resp.ok(OrderOut.model_validate(order))


@router.put("/{order_id}/cancel", response_model=Resp[OrderOut])
def cancel_order(
    order_id: int,
    body: OrderCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(
        Order.id == order_id, Order.user_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(404, "订单不存在")
    if order.status not in (0, 1):
        raise HTTPException(400, "当前状态无法取消")
    order.status = 4
    order.cancel_reason = body.cancel_reason
    db.commit()
    db.refresh(order)
    return Resp.ok(OrderOut.model_validate(order))
