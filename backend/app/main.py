import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, users, orders, points, admin

app = FastAPI(
    title="慢夏闲置衣服回收平台 API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(points.router)
app.include_router(admin.router)

# 静态文件（用户上传的头像 / 订单凭证图片）
_static_dir = os.path.join(os.path.dirname(__file__), '..', 'static')
os.makedirs(os.path.join(_static_dir, 'avatars'), exist_ok=True)
os.makedirs(os.path.join(_static_dir, 'proof'), exist_ok=True)
app.mount("/static", StaticFiles(directory=_static_dir), name="static")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "慢夏回收平台"}
