"""
回收员小程序端 API
- 手机号登录（管理员后台已录入手机号即可登录）
- 查看分配给自己的订单
- 上传取件凭证图片
"""
import os
import uuid
import json
from typing import Optional
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel

from app.database import get_db
from app.models.recycler import Recycler
from app.models.order import Order
from app.utils.auth import create_access_token, decode_token
from app.schemas.common import Resp, PageResp
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/recycler", tags=["recycler-portal"])

bearer_scheme = HTTPBearer(auto_error=False)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'proof')
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Auth ──────────────────────────────────────────────────────────────────────


def get_current_recycler(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Recycler:
    if credentials is None:
        raise HTTPException(401, "未提供认证信息")
    payload = decode_token(credentials.credentials)
    recycler_id: Optional[int] = payload.get("recycler_id")
    if recycler_id is None:
        raise HTTPException(401, "token 无效")
    r = db.get(Recycler, recycler_id)
    if r is None or r.status == 0:
        raise HTTPException(401, "回收员账号不存在或已禁用")
    return r


def _make_recycler_token(recycler: Recycler) -> dict:
    token = create_access_token(
        {"recycler_id": recycler.id},
        expires_delta=timedelta(days=30),
    )
    return {
        "token": token,
        "recycler": {
            "id": recycler.id,
            "name": recycler.name,
            "phone": recycler.phone,
            "area": recycler.area,
            "rating": float(recycler.rating),
            "order_count": recycler.order_count,
        },
    }


@router.post("/auth-by-user", response_model=Resp[dict])
def auth_by_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    用已登录用户的 token 换取回收员 token。
    后端用该用户绑定的手机号在 recyclers 表中查找匹配记录。
    """
    from app.utils.auth import decode_token
    from app.models.user import User

    if credentials is None:
        raise HTTPException(401, "请先完成微信登录")
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(401, "token 无效")

    user = db.get(User, user_id)
    if not user or not user.phone:
        raise HTTPException(404, "未绑定手机号，请在个人资料中填写手机号后再试")

    recycler = db.query(Recycler).filter(Recycler.phone == user.phone).first()
    if not recycler:
        raise HTTPException(404, "该微信账号未注册为回收员，请联系管理员")
    if recycler.status == 0:
        raise HTTPException(403, "回收员账号已被禁用，请联系管理员")

    return Resp.ok(_make_recycler_token(recycler))


# ── 我的信息 ───────────────────────────────────────────────────────────────────

@router.get("/me", response_model=Resp[dict])
def recycler_me(r: Recycler = Depends(get_current_recycler)):
    return Resp.ok({
        "id": r.id,
        "name": r.name,
        "phone": r.phone,
        "area": r.area,
        "rating": float(r.rating),
        "order_count": r.order_count,
        "status": r.status,
    })


# ── 订单列表 ──────────────────────────────────────────────────────────────────

@router.get("/orders", response_model=Resp[list])
def recycler_orders(
    status: Optional[int] = None,
    r: Recycler = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """获取分配给当前回收员的订单（默认只返回进行中：已接单/回收中）"""
    q = db.query(Order).options(joinedload(Order.categories)).filter(
        Order.recycler_id == r.id
    )
    if status is not None:
        q = q.filter(Order.status == status)
    else:
        # 进行中：含"待接单(0)"——管理员可能只指派了人但未改状态
        q = q.filter(Order.status.in_([0, 1, 2]))
    orders = q.order_by(Order.scheduled_time.asc()).all()

    STATUS_LABELS = {0: '待接单', 1: '已接单', 2: '回收中', 3: '已完成', 4: '已取消'}
    result = []
    for o in orders:
        proof = []
        try:
            proof = json.loads(o.proof_images or '[]')
        except Exception:
            pass
        result.append({
            "id": o.id,
            "order_no": o.order_no,
            "addr_contact": o.addr_contact,
            "addr_phone": o.addr_phone,
            "addr_full": o.addr_full,
            "scheduled_time": o.scheduled_time.strftime('%m月%d日 %H:%M'),
            "estimated_weight": o.estimated_weight,
            "actual_weight": float(o.actual_weight) if o.actual_weight else None,
            "status": o.status,
            "status_label": STATUS_LABELS.get(o.status, '未知'),
            "notes": o.notes,
            "proof_images": proof,
            "categories": [{"category": c.category, "qty": c.qty} for c in o.categories],
        })
    return Resp.ok(result)


# ── 确认接单 ─────────────────────────────────────────────────────────────────

@router.post("/orders/{order_id}/accept", response_model=Resp[dict])
def recycler_accept(
    order_id: int,
    r: Recycler = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """回收员确认接单，状态从 0(待接单) → 1(已接单)"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.recycler_id == r.id,
        Order.status == 0,
    ).first()
    if not order:
        raise HTTPException(404, "订单不存在或已接单")
    order.status = 1
    db.commit()
    return Resp.ok({"msg": "接单成功"})


# ── 上传凭证图片 ───────────────────────────────────────────────────────────────

@router.post("/orders/{order_id}/proof", response_model=Resp[dict])
async def upload_proof(
    order_id: int,
    file: UploadFile = File(...),
    r: Recycler = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """回收员上传取件凭证图片（只能操作分配给自己的订单）"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.recycler_id == r.id,
    ).first()
    if not order:
        raise HTTPException(404, "订单不存在或无权操作")

    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"r{r.id}_{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(await file.read())

    url = f"/static/proof/{filename}"
    imgs = []
    try:
        imgs = json.loads(order.proof_images or '[]')
    except Exception:
        pass
    imgs.append(url)
    order.proof_images = json.dumps(imgs)

    # 上传凭证后自动推进状态：待接单/已接单 → 回收中
    if order.status in (0, 1):
        order.status = 2

    db.commit()
    return Resp.ok({"url": url, "all": imgs})


# ── 确认完成（回收员自报实际重量） ─────────────────────────────────────────────

class CompleteBody(BaseModel):
    actual_weight: float


@router.post("/orders/{order_id}/complete", response_model=Resp[dict])
def recycler_complete(
    order_id: int,
    body: CompleteBody,
    r: Recycler = Depends(get_current_recycler),
    db: Session = Depends(get_db),
):
    """
    回收员填报实际重量并标记已完成：
    - 需已上传至少一张凭证图片
    - 自动计算结算金额、给用户积分、更新回收员累计单量
    """
    from app.models.user import User
    from app.models.points import PointsRecord

    order = db.query(Order).filter(
        Order.id == order_id,
        Order.recycler_id == r.id,
        Order.status.in_([0, 1, 2]),
    ).first()
    if not order:
        raise HTTPException(404, "订单不存在或已完成")

    # 必须先上传凭证才能完成
    proof = []
    try:
        proof = json.loads(order.proof_images or '[]')
    except Exception:
        pass
    if not proof:
        raise HTTPException(400, "请先上传取件凭证图片再标记完成")

    # 填写重量、结算金额
    order.actual_weight = body.actual_weight
    order.final_amount = round(float(body.actual_weight) * float(order.unit_price), 2)
    order.status = 3  # 已完成

    # 给用户积分（每 kg 得 10 分）
    user = db.get(User, order.user_id)
    if user:
        user.total_recycled_kg = float(user.total_recycled_kg or 0) + float(body.actual_weight)
        pts = int(float(body.actual_weight) * 10)
        user.points = (user.points or 0) + pts
        db.add(PointsRecord(
            user_id=user.id,
            order_id=order.id,
            change_type="earn",
            amount=pts,
            balance_after=user.points,
            note=f"订单{order.order_no}回收完成奖励",
        ))

    # 更新回收员累计单量
    r.order_count = (r.order_count or 0) + 1

    db.commit()
    return Resp.ok({
        "msg": "订单已完成",
        "actual_weight": float(body.actual_weight),
        "final_amount": float(order.final_amount),
        "points_earned": int(float(body.actual_weight) * 10),
    })
