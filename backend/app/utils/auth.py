from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效或过期的 token",
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    from app.models.user import User

    if credentials is None:
        raise HTTPException(status_code=401, detail="未提供认证信息")
    payload = decode_token(credentials.credentials)
    user_id: Optional[int] = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="token 无效")
    user = db.get(User, user_id)
    if user is None or user.status == 0:
        raise HTTPException(status_code=401, detail="用户不存在或已被禁用")
    return user


def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    from app.models.admin import Admin

    if credentials is None:
        raise HTTPException(status_code=401, detail="未提供认证信息")
    payload = decode_token(credentials.credentials)
    admin_id: Optional[int] = payload.get("admin_id")
    if admin_id is None:
        raise HTTPException(status_code=401, detail="token 无效")
    admin = db.get(Admin, admin_id)
    if admin is None:
        raise HTTPException(status_code=401, detail="管理员不存在")
    return admin
