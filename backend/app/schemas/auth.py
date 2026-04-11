from typing import Optional
from pydantic import BaseModel


class WxLoginReq(BaseModel):
    code: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None


class AdminLoginReq(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
