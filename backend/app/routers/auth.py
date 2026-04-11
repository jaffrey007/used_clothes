import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.admin import Admin
from app.schemas.auth import WxLoginReq, AdminLoginReq, TokenOut
from app.schemas.common import Resp
from app.utils.auth import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Resp[TokenOut])
def wx_login(body: WxLoginReq, db: Session = Depends(get_db)):
    """
    模拟微信登录。
    生产中需调用微信服务端接口将 code 换取真实 openid。
    此处直接用 code 作为 openid 的一部分（演示用）。
    """
    openid = f"wx_{body.code}"
    user = db.query(User).filter(User.openid == openid).first()
    if not user:
        user = User(
            openid=openid,
            nickname=body.nickname or "新用户",
            avatar_url=body.avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"user_id": user.id})
    return Resp.ok(TokenOut(access_token=token))


@router.post("/admin/login", response_model=Resp[TokenOut])
def admin_login(body: AdminLoginReq, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == body.username).first()
    if not admin or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = create_access_token({"admin_id": admin.id, "role": admin.role})
    return Resp.ok(TokenOut(access_token=token))
