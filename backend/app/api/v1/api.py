from fastapi import APIRouter

from app.api.v1.endpoints import agents, chat, sessions

# 创建API路由器
api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(
    sessions.router, 
    prefix="/sessions", 
    tags=["sessions"]
)

api_router.include_router(
    agents.router, 
    prefix="/agents", 
    tags=["agents"]
)

api_router.include_router(
    chat.router, 
    prefix="/chat", 
    tags=["chat"]
)