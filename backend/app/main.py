from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
import time
import logging
from contextlib import asynccontextmanager
from typing import Callable

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.api import api_router

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理 - 增强版本"""
    logger.info("Starting Multi-Agent Learning System...")
    try:
        # 启动时初始化数据库
        await init_db()
        logger.info("Database initialized successfully")
        print("🚀 多Agent学习系统启动成功")
        
        # 启动健康检查任务
        import asyncio
        from app.core.database import db_manager
        
        async def health_check_task():
            """定期健康检查任务"""
            while True:
                try:
                    await asyncio.sleep(300)  # 每5分钟检查一次
                    # 简单的数据库连接测试
                    await db_manager.execute_one("SELECT 1")
                    logger.debug("Health check passed")
                except Exception as e:
                    logger.error(f"Health check failed: {e}")
                    # 尝试重新连接数据库
                    try:
                        await db_manager.close_connection()
                        await db_manager.get_connection()
                        logger.info("Database reconnection successful")
                    except Exception as reconnect_error:
                        logger.error(f"Database reconnection failed: {reconnect_error}")
        
        # 启动健康检查任务
        health_task = asyncio.create_task(health_check_task())
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    logger.info(f"Application started successfully on {settings.SERVER_HOST}:{settings.SERVER_PORT}")
    yield
    
    # 关闭时的清理工作
    logger.info("Shutting down Multi-Agent Learning System...")
    try:
        # 取消健康检查任务
        if 'health_task' in locals():
            health_task.cancel()
        
        # 关闭数据库连接
        from app.core.database import db_manager
        await db_manager.close_connection()
        logger.info("Database connection closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")
    
    print("👋 多Agent学习系统关闭")


# 创建FastAPI应用
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="基于栈帧式分支Agent架构的创新AI学习平台",
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs" if settings.DEBUG else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.DEBUG else None,
)

# 请求处理时间中间件
@app.middleware("http")
async def add_process_time_header(request: Request, call_next: Callable):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # 记录请求日志
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.4f}s"
    )
    return response

# 请求大小限制中间件
@app.middleware("http")
async def limit_upload_size(request: Request, call_next: Callable):
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length:
            content_length = int(content_length)
            max_size = 10 * 1024 * 1024  # 10MB
            if content_length > max_size:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request entity too large"}
                )
    
    response = await call_next(request)
    return response

# CORS中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Process-Time",
    ],
    expose_headers=["X-Process-Time"],
)

# 信任的主机中间件（生产环境安全）
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.yourdomain.com"]
    )

# 注册API路由
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    """根路径 - 系统信息"""
    return {
        "message": "🌿 多Agent学习系统API",
        "version": settings.VERSION,
        "description": "基于栈帧式分支Agent架构的创新AI学习平台",
        "docs": f"{settings.API_V1_STR}/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "multi-agent-learning-system",
        "version": settings.VERSION,
        "timestamp": time.time()
    }


@app.get("/info")
async def system_info():
    """系统信息端点"""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "debug": settings.DEBUG,
        "environment": "development" if settings.DEBUG else "production",
        "api_prefix": settings.API_V1_STR,
        "features": {
            "stack_frame_agents": True,
            "context_inheritance": True,
            "branch_creation": True,
            "openai_integration": True
        }
    }


# 全局异常处理
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "请求参数验证失败",
            "errors": exc.errors(),
            "body": exc.body
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP error on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "内部服务器错误"}
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )