from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, List

T = TypeVar("T")


class Resp(BaseModel, Generic[T]):
    code: int = 0
    msg: str = "ok"
    data: Optional[T] = None

    @classmethod
    def ok(cls, data: Optional[T] = None, msg: str = "ok") -> "Resp[T]":
        return cls(code=0, msg=msg, data=data)

    @classmethod
    def fail(cls, msg: str = "error", code: int = -1) -> "Resp[None]":
        return cls(code=code, msg=msg, data=None)


class PageResp(BaseModel, Generic[T]):
    code: int = 0
    msg: str = "ok"
    data: List[T] = []
    total: int = 0
    page: int = 1
    page_size: int = 20
