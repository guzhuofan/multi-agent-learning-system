import os
from datetime import datetime
from typing import List, Optional
from pydantic import validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 基础配置
    APP_NAME: str = "多Agent学习系统"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    # 服务器配置
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    PROJECT_NAME: str = "多Agent学习系统API"
    API_V1_STR: str = "/api/v1"
    
    # 数据库配置
    DATABASE_URL: str = "sqlite:///./multi_agent_learning.db"
    
    # Deepseek配置
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_MAX_TOKENS: int = 2000
    DEEPSEEK_TEMPERATURE: float = 0.7
    
    # 保持OpenAI配置以便向后兼容
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    OPENAI_MAX_TOKENS: int = 2000
    OPENAI_TEMPERATURE: float = 0.7
    
    # CORS配置
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    
    # Agent配置
    MAX_BRANCH_DEPTH: int = 5
    MAX_CONTEXT_MESSAGES: int = 10
    CONTEXT_SUMMARY_LENGTH: int = 500
    
    # 安全配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    @validator("DEEPSEEK_API_KEY")
    def validate_deepseek_key(cls, v):
        if not v:
            # 从环境变量获取
            v = os.getenv("DEEPSEEK_API_KEY")
            if not v:
                print("⚠️  警告: 未设置 DEEPSEEK_API_KEY，AI功能将不可用")
        return v
    
    @validator("OPENAI_API_KEY")
    def validate_openai_key(cls, v):
        if not v:
            # 从环境变量获取
            v = os.getenv("OPENAI_API_KEY")
        return v
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    def get_current_timestamp(self) -> str:
        """获取当前时间戳"""
        return datetime.now().isoformat()
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 创建全局设置实例
settings = Settings()

# 数据库配置
DATABASE_CONFIG = {
    "url": settings.DATABASE_URL,
    "echo": settings.DEBUG,  # 在调试模式下显示SQL语句
}

# Deepseek配置
DEEPSEEK_CONFIG = {
    "api_key": settings.DEEPSEEK_API_KEY,
    "base_url": settings.DEEPSEEK_BASE_URL,
    "model": settings.DEEPSEEK_MODEL,
    "max_tokens": settings.DEEPSEEK_MAX_TOKENS,
    "temperature": settings.DEEPSEEK_TEMPERATURE,
}

# OpenAI配置（向后兼容）
OPENAI_CONFIG = {
    "api_key": settings.OPENAI_API_KEY,
    "model": settings.OPENAI_MODEL,
    "max_tokens": settings.OPENAI_MAX_TOKENS,
    "temperature": settings.OPENAI_TEMPERATURE,
}

# Agent系统配置
AGENT_CONFIG = {
    "max_branch_depth": settings.MAX_BRANCH_DEPTH,
    "max_context_messages": settings.MAX_CONTEXT_MESSAGES,
    "context_summary_length": settings.CONTEXT_SUMMARY_LENGTH,
}