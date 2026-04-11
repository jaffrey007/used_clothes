import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.address import Address
from app.schemas.user import UserOut, UserUpdate, AddressOut, AddressCreate, AddressUpdate
from app.schemas.common import Resp
from app.utils.auth import get_current_user

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'static', 'avatars')
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=Resp[UserOut])
def get_me(current_user: User = Depends(get_current_user)):
    return Resp.ok(UserOut.model_validate(current_user))


@router.put("/me", response_model=Resp[UserOut])
def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return Resp.ok(UserOut.model_validate(current_user))


# ---------- Avatar upload ----------

@router.post("/avatar", response_model=Resp[dict])
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(await file.read())
    url = f"/static/avatars/{filename}"
    current_user.avatar_url = url
    db.commit()
    return Resp.ok({"url": url})


# ---------- Addresses ----------

@router.get("/addresses", response_model=Resp[list[AddressOut]])
def list_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addrs = db.query(Address).filter(Address.user_id == current_user.id).all()
    return Resp.ok([AddressOut.model_validate(a) for a in addrs])


@router.post("/addresses", response_model=Resp[AddressOut])
def create_address(
    body: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.is_default:
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": 0})
    addr = Address(user_id=current_user.id, **body.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return Resp.ok(AddressOut.model_validate(addr))


@router.put("/addresses/{addr_id}", response_model=Resp[AddressOut])
def update_address(
    addr_id: int,
    body: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = db.query(Address).filter(
        Address.id == addr_id, Address.user_id == current_user.id
    ).first()
    if not addr:
        raise HTTPException(404, "地址不存在")
    if body.is_default:
        db.query(Address).filter(Address.user_id == current_user.id).update({"is_default": 0})
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(addr, field, value)
    db.commit()
    db.refresh(addr)
    return Resp.ok(AddressOut.model_validate(addr))


@router.delete("/addresses/{addr_id}", response_model=Resp[None])
def delete_address(
    addr_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    addr = db.query(Address).filter(
        Address.id == addr_id, Address.user_id == current_user.id
    ).first()
    if not addr:
        raise HTTPException(404, "地址不存在")
    db.delete(addr)
    db.commit()
    return Resp.ok(msg="删除成功")
